import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLinkedRecordDto } from './dto/create-linked-record.dto';

@Injectable()
export class LinkedRecordsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private workspaces: WorkspacesService,
    private auditLog: AuditLogService,
  ) {}

  async create(dto: CreateLinkedRecordDto, actorId: string, actorRoles: string[], actorDeptId: string | null) {
    // Verify the source entity exists and actor has access
    const workspaceId = await this.resolveWorkspaceId(dto.sourceType, dto.sourceId, actorId, actorRoles, actorDeptId);

    // Verify target entity is in the same workspace (prevents cross-workspace linking via direct API)
    if (workspaceId && dto.targetType !== dto.sourceType && dto.targetId !== dto.sourceId) {
      const targetWsId = await this.resolveWorkspaceId(dto.targetType, dto.targetId, actorId, actorRoles, actorDeptId).catch(() => null);
      if (targetWsId && targetWsId !== workspaceId) {
        throw new ForbiddenException('Cannot link entities from different workspaces');
      }
    }

    const existing = await this.prisma.linkedRecord.findUnique({
      where: {
        sourceType_sourceId_targetType_targetId: {
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });
    if (existing) throw new ConflictException('This link already exists');

    const record = await this.prisma.linkedRecord.create({
      data: {
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        createdById: actorId,
      },
    });

    void this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: dto.sourceType,
      entityId: dto.sourceId,
      newValue: { linkedTo: dto.targetType, linkedId: dto.targetId },
    });

    if (workspaceId) {
      this.realtime.emitToWorkspace(workspaceId, 'linked_record.created', {
        id: record.id, sourceType: dto.sourceType, sourceId: dto.sourceId,
      });
    }

    return record;
  }

  async findForSource(
    sourceType: string,
    sourceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.resolveWorkspaceId(sourceType, sourceId, actorId, actorRoles, actorDeptId);

    const records = await this.prisma.linkedRecord.findMany({
      where: { sourceType, sourceId },
      orderBy: { createdAt: 'asc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    // Resolve target titles and filter out orphaned links (target entity deleted).
    const resolved = await Promise.all(
      records.map(async (r) => {
        const targetTitle = await this.resolveTitle(r.targetType, r.targetId);
        return targetTitle !== null ? { ...r, targetTitle } : null;
      }),
    );
    return resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  async delete(id: string, actorId: string, actorRoles: string[], actorDeptId: string | null) {
    const record = await this.prisma.linkedRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Linked record not found');

    if (record.createdById !== actorId) {
      const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
      if (!actorRoles.some((r) => ELEVATED_ROLES.includes(r))) {
        throw new ForbiddenException('Only the creator or an elevated role can remove this link');
      }
    }

    const workspaceId = await this.resolveWorkspaceId(record.sourceType, record.sourceId, actorId, actorRoles, actorDeptId).catch(() => null);

    await this.prisma.linkedRecord.delete({ where: { id } });

    void this.auditLog.log({
      actorId,
      action: 'DELETED',
      entityType: record.sourceType,
      entityId: record.sourceId,
      previousValue: { linkedTo: record.targetType, linkedId: record.targetId },
    });

    if (workspaceId) {
      this.realtime.emitToWorkspace(workspaceId, 'linked_record.deleted', { id, sourceType: record.sourceType, sourceId: record.sourceId });
    }

    return { success: true };
  }

  async search(
    workspaceId: string,
    targetType: string,
    q: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ): Promise<{ id: string; title: string }[]> {
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    const LIMIT = 20;
    const search = q?.trim() ?? '';
    const containsFilter = search ? { contains: search, mode: 'insensitive' as const } : undefined;

    if (targetType === 'TASK') {
      const rows = await this.prisma.task.findMany({
        where: { workspaceId, ...(containsFilter && { title: containsFilter }) },
        select: { id: true, title: true },
        take: LIMIT,
        orderBy: { title: 'asc' },
      });
      return rows;
    }

    if (targetType === 'PAGE') {
      const rows = await this.prisma.page.findMany({
        where: { workspaceId, ...(containsFilter && { title: containsFilter }) },
        select: { id: true, title: true },
        take: LIMIT,
        orderBy: { title: 'asc' },
      });
      return rows;
    }

    if (targetType === 'DOCUMENT') {
      const rows = await this.prisma.document.findMany({
        where: { workspaceId, ...(containsFilter && { title: containsFilter }) },
        select: { id: true, title: true },
        take: LIMIT,
        orderBy: { title: 'asc' },
      });
      return rows;
    }

    if (targetType === 'NCR_CAPA') {
      const rows = await this.prisma.ncrCapa.findMany({
        where: {
          workspaceId,
          ...(containsFilter && {
            OR: [{ title: containsFilter }, { ncrNumber: containsFilter }],
          }),
        },
        select: { id: true, title: true, ncrNumber: true },
        take: LIMIT,
        orderBy: { title: 'asc' },
      });
      return rows.map((r) => ({ id: r.id, title: r.ncrNumber ? `${r.ncrNumber}: ${r.title}` : r.title }));
    }

    if (targetType === 'CHECKLIST_ITEM') {
      const rows = await this.prisma.auditChecklistItem.findMany({
        where: { checklist: { workspaceId }, ...(containsFilter && { title: containsFilter }) },
        select: { id: true, title: true },
        take: LIMIT,
        orderBy: { title: 'asc' },
      });
      return rows;
    }

    return [];
  }

  private async resolveWorkspaceId(
    entityType: string,
    entityId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ): Promise<string | null> {
    if (entityType === 'TASK') {
      const task = await this.prisma.task.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      if (!task) throw new NotFoundException('Task not found');
      await this.workspaces.assertWorkspaceAccess(task.workspaceId, actorId, actorRoles, actorDeptId);
      return task.workspaceId;
    }
    if (entityType === 'PAGE') {
      const page = await this.prisma.page.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      if (!page) throw new NotFoundException('Page not found');
      await this.workspaces.assertWorkspaceAccess(page.workspaceId, actorId, actorRoles, actorDeptId);
      return page.workspaceId;
    }
    if (entityType === 'DOCUMENT') {
      const doc = await this.prisma.document.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      if (!doc) throw new NotFoundException('Document not found');
      if (doc.workspaceId) await this.workspaces.assertWorkspaceAccess(doc.workspaceId, actorId, actorRoles, actorDeptId);
      return doc.workspaceId ?? null;
    }
    if (entityType === 'NCR_CAPA') {
      const ncr = await this.prisma.ncrCapa.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      if (!ncr) throw new NotFoundException('NCR/CAPA not found');
      if (ncr.workspaceId) await this.workspaces.assertWorkspaceAccess(ncr.workspaceId, actorId, actorRoles, actorDeptId);
      return ncr.workspaceId ?? null;
    }
    if (entityType === 'CHECKLIST_ITEM') {
      const item = await this.prisma.auditChecklistItem.findUnique({
        where: { id: entityId },
        select: { id: true, checklist: { select: { workspaceId: true } } },
      });
      if (!item) throw new NotFoundException('Checklist item not found');
      const wsId = item.checklist.workspaceId;
      if (wsId) await this.workspaces.assertWorkspaceAccess(wsId, actorId, actorRoles, actorDeptId);
      return wsId ?? null;
    }
    if (entityType === 'CHECKLIST_EVIDENCE') {
      const ev = await this.prisma.checklistEvidence.findUnique({
        where: { id: entityId },
        select: { checklistItem: { select: { checklist: { select: { workspaceId: true } } } } },
      });
      if (!ev) throw new NotFoundException('Evidence not found');
      const wsId = ev.checklistItem.checklist.workspaceId;
      if (wsId) await this.workspaces.assertWorkspaceAccess(wsId, actorId, actorRoles, actorDeptId);
      return wsId ?? null;
    }
    return null;
  }

  // Returns null when the target entity no longer exists — callers use this to filter orphaned links.
  private async resolveTitle(entityType: string, entityId: string): Promise<string | null> {
    try {
      if (entityType === 'TASK') {
        const r = await this.prisma.task.findUnique({ where: { id: entityId }, select: { title: true } });
        return r?.title ?? null;
      }
      if (entityType === 'PAGE') {
        const r = await this.prisma.page.findUnique({ where: { id: entityId }, select: { title: true } });
        return r?.title ?? null;
      }
      if (entityType === 'DOCUMENT') {
        const r = await this.prisma.document.findUnique({ where: { id: entityId }, select: { title: true } });
        return r?.title ?? null;
      }
      if (entityType === 'NCR_CAPA') {
        const r = await this.prisma.ncrCapa.findUnique({ where: { id: entityId }, select: { title: true, ncrNumber: true } });
        return r ? `${r.ncrNumber ?? 'NCR'}: ${r.title}` : null;
      }
      if (entityType === 'CHECKLIST_ITEM') {
        const r = await this.prisma.auditChecklistItem.findUnique({ where: { id: entityId }, select: { title: true } });
        return r?.title ?? null;
      }
    } catch { /* ignore */ }
    return null;
  }
}
