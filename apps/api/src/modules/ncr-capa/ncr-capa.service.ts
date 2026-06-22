import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateNcrCapaDto } from './dto/create-ncr-capa.dto';
import { UpdateNcrCapaDto } from './dto/update-ncr-capa.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';

// Roles that can always act as verifiers/closers regardless of assignment
const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'] as const;

// Valid status transitions: key = current status, value = allowed next statuses
const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN:             ['IN_PROGRESS', 'OVERDUE'],
  IN_PROGRESS:      ['WAITING_EVIDENCE', 'OVERDUE'],
  WAITING_EVIDENCE: ['SUBMITTED'],
  SUBMITTED:        ['VERIFIED', 'REJECTED'],
  VERIFIED:         ['CLOSED'],
  REJECTED:         ['IN_PROGRESS'],
  OVERDUE:          ['IN_PROGRESS', 'CLOSED'],
  CLOSED:           [],
};

const NCR_SELECT = {
  id: true,
  ncrNumber: true,
  title: true,
  description: true,
  type: true,
  severity: true,
  status: true,
  isoClause: true,
  workspaceId: true,
  departmentId: true,
  checklistItemId: true,
  rootCause: true,
  correctiveAction: true,
  preventiveAction: true,
  dueDate: true,
  verifiedAt: true,
  closedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  raisedBy:   { select: { id: true, fullName: true } },
  assignedTo: { select: { id: true, fullName: true } },
  verifiedBy: { select: { id: true, fullName: true } },
  closedBy:   { select: { id: true, fullName: true } },
  workspace:  { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

@Injectable()
export class NcrCapaService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private realtime: RealtimeService,
    private workspaces: WorkspacesService,
  ) {}

  private emitNcrUpdated(id: string, workspaceId: string | null, action: string) {
    if (workspaceId) {
      this.realtime.emitToWorkspace(workspaceId, 'ncr.updated', { id, action });
    }
  }

  async findAll(
    query: { status?: string; severity?: string; departmentId?: string; workspaceId?: string; search?: string; type?: string },
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    const where: Record<string, unknown> = {};
    if (query.status)       where['status']       = query.status;
    if (query.severity)     where['severity']     = query.severity;
    if (query.departmentId) where['departmentId'] = query.departmentId;
    if (query.workspaceId)  where['workspaceId']  = query.workspaceId;
    if (query.type)         where['type']         = query.type;
    if (query.search) {
      where['OR'] = [
        { title:       { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { ncrNumber:   { contains: query.search, mode: 'insensitive' } },
        { isoClause:   { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (actorId && actorRoles) {
      const wsVis = this.workspaces.buildWorkspaceVisibilityWhere(actorId, actorRoles, actorDeptId ?? null);
      if (Object.keys(wsVis).length > 0) {
        const existing = { ...where };
        Object.keys(where).forEach((k) => delete where[k]);
        where['AND'] = [existing, wsVis];
      }
    }

    return this.prisma.ncrCapa.findMany({
      where,
      select: {
        ...NCR_SELECT,
        _count: { select: { comments: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(
    id: string,
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    const record = await this.prisma.ncrCapa.findUnique({
      where: { id },
      select: {
        ...NCR_SELECT,
        checklistItem: { select: { id: true, title: true, isoClause: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');
    if (actorId && actorRoles && record.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(
        record.workspaceId, actorId, actorRoles, actorDeptId ?? null,
      );
    }
    return record;
  }

  async create(
    dto: CreateNcrCapaDto,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    actorPermissions: string[] = [],
  ) {
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const hasCreatePerm = actorPermissions.includes('ncr.create');

    if (dto.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(dto.workspaceId, actorId, actorRoles, actorDeptId);
      if (!isElevated && !hasCreatePerm) {
        const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, dto.workspaceId, actorRoles, actorDeptId);
        if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to raise NCR/CAPA');
      }
    } else if (!isElevated && !hasCreatePerm) {
      throw new ForbiddenException('ncr.create permission required');
    }
    const record = await this.prisma.ncrCapa.create({
      data: {
        title:          dto.title,
        description:    dto.description,
        type:           dto.type ?? 'NCR',
        severity:       dto.severity ?? 'MINOR',
        isoClause:      dto.isoClause,
        workspaceId:    dto.workspaceId,
        departmentId:   dto.departmentId,
        checklistItemId: dto.checklistItemId,
        assignedToId:   dto.assignedToId,
        dueDate:        dto.dueDate ? new Date(dto.dueDate) : undefined,
        ncrNumber:      dto.ncrNumber,
        raisedById:     actorId,
      },
      select: NCR_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'NCR_CAPA',
      entityId: record.id,
      newValue: { title: record.title, type: record.type, severity: record.severity } as Record<string, unknown>,
    });

    // Notify assignee if different from creator
    if (record.assignedTo && record.assignedTo.id !== actorId) {
      void this.notifications.create({
        recipientId: record.assignedTo.id,
        category:    'NCR_ASSIGNED',
        title:       'Issue Assigned to You',
        message:     `You have been assigned to issue: "${record.title}"`,
        entityType:  'NCR_CAPA',
        entityId:    record.id,
        workspaceId: record.workspaceId ?? undefined,
      }).catch(() => {});
    }

    if (record.workspaceId) {
      this.realtime.emitToWorkspace(record.workspaceId, 'ncr.created', {
        id: record.id, title: record.title, workspaceId: record.workspaceId,
      });
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateNcrCapaDto,
    actorId: string,
    actorRoles: string[],
    actorPermissions: string[],
    actorDeptId: string | null = null,
  ) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true, status: true, assignedToId: true, raisedById: true, workspaceId: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    if (record.status === 'CLOSED') {
      throw new ForbiddenException('Cannot update a closed NCR/CAPA record');
    }

    // Permission check: elevated roles or ncr.update holders can update all
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const hasUpdate  = actorPermissions.includes('ncr.update');
    const isAssignee = record.assignedToId === actorId;
    const isRaiser   = record.raisedById   === actorId;

    if (!isElevated) {
      if (hasUpdate) {
        // ncr.update holders may only update if assigned or raised by them
        if (!isAssignee && !isRaiser) {
          throw new ForbiddenException('You can only update NCR/CAPA records assigned to or raised by you');
        }
      } else if (isAssignee || isRaiser) {
        // Workspace MEMBER who raised or is assigned can update their own action fields
        // (no ncr.update needed if they're the raiser/assignee in the workspace)
        if (record.workspaceId) {
          const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, record.workspaceId, actorRoles, actorDeptId);
          if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required');
        } else {
          throw new ForbiddenException('ncr.update permission required');
        }
      } else {
        throw new ForbiddenException('ncr.update permission required');
      }
    }

    const updated = await this.prisma.ncrCapa.update({
      where: { id },
      data: {
        ...(dto.title             !== undefined && { title: dto.title }),
        ...(dto.description       !== undefined && { description: dto.description }),
        ...(dto.severity          !== undefined && { severity: dto.severity }),
        ...(dto.isoClause         !== undefined && { isoClause: dto.isoClause }),
        ...(dto.assignedToId      !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.departmentId      !== undefined && { departmentId: dto.departmentId }),
        ...(dto.rootCause         !== undefined && { rootCause: dto.rootCause }),
        ...(dto.correctiveAction  !== undefined && { correctiveAction: dto.correctiveAction }),
        ...(dto.preventiveAction  !== undefined && { preventiveAction: dto.preventiveAction }),
        ...(dto.dueDate           !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      },
      select: NCR_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'NCR_CAPA',
      entityId: id,
      newValue: { ...dto } as Record<string, unknown>,
    });

    this.emitNcrUpdated(id, updated.workspaceId, 'updated');
    return updated;
  }

  async submit(id: string, actorId: string, actorRoles: string[]) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true, status: true, assignedToId: true, title: true, raisedById: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    // Allow submission from any active (non-terminal) status
    const SUBMITTABLE = ['OPEN', 'IN_PROGRESS', 'WAITING_EVIDENCE', 'REJECTED'];
    if (!SUBMITTABLE.includes(record.status)) {
      throw new BadRequestException(`Cannot submit from status "${record.status}"`);
    }

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated && record.assignedToId !== actorId && record.raisedById !== actorId) {
      throw new ForbiddenException('Only the assignee or the person who raised this NCR/CAPA can submit it');
    }

    const updated = await this.prisma.ncrCapa.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      select: NCR_SELECT,
    });

    void this.auditLog.log({ actorId, action: 'STATUS_CHANGED', entityType: 'NCR_CAPA', entityId: id, previousValue: { status: record.status } as Record<string, unknown>, newValue: { status: 'SUBMITTED' } as Record<string, unknown> });

    this.emitNcrUpdated(id, updated.workspaceId, 'submitted');
    return updated;
  }

  async verify(id: string, actorId: string, actorRoles: string[], actorPermissions: string[]) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true, status: true, assignedToId: true, raisedById: true, title: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    if (record.status !== 'SUBMITTED') {
      throw new BadRequestException(`Can only verify a SUBMITTED record (current: "${record.status}")`);
    }

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated && !actorPermissions.includes('ncr.verify')) {
      throw new ForbiddenException('You do not have permission to verify NCR/CAPA records');
    }

    const updated = await this.prisma.ncrCapa.update({
      where: { id },
      data: { status: 'VERIFIED', verifiedById: actorId, verifiedAt: new Date(), rejectionReason: null },
      select: NCR_SELECT,
    });

    void this.auditLog.log({ actorId, action: 'VERIFIED', entityType: 'NCR_CAPA', entityId: id, previousValue: { status: 'SUBMITTED' } as Record<string, unknown>, newValue: { status: 'VERIFIED' } as Record<string, unknown> });

    this.emitNcrUpdated(id, updated.workspaceId, 'verified');

    // Notify the person who raised it
    if (record.raisedById !== actorId) {
      void this.notifications.create({
        recipientId: record.raisedById,
        category:    'NCR_VERIFIED',
        title:       'Issue Verified',
        message:     `Your issue "${updated.title ?? ''}" has been verified.`,
        entityType:  'NCR_CAPA',
        entityId:    id,
        workspaceId: updated.workspaceId ?? undefined,
      }).catch(() => {});
    }

    return updated;
  }

  async rejectVerification(id: string, dto: RejectVerificationDto, actorId: string, actorRoles: string[], actorPermissions: string[]) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true, status: true, assignedToId: true, raisedById: true, title: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    if (record.status !== 'SUBMITTED') {
      throw new BadRequestException(`Can only reject verification of a SUBMITTED record (current: "${record.status}")`);
    }

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated && !actorPermissions.includes('ncr.verify')) {
      throw new ForbiddenException('You do not have permission to reject NCR/CAPA verification');
    }

    const updated = await this.prisma.ncrCapa.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: dto.rejectionReason },
      select: NCR_SELECT,
    });

    void this.auditLog.log({ actorId, action: 'REJECTED', entityType: 'NCR_CAPA', entityId: id, previousValue: { status: 'SUBMITTED' } as Record<string, unknown>, newValue: { status: 'REJECTED', rejectionReason: dto.rejectionReason } as Record<string, unknown> });

    this.emitNcrUpdated(id, updated.workspaceId, 'rejected');

    const notifyId = record.assignedToId ?? record.raisedById;
    if (notifyId !== actorId) {
      void this.notifications.create({
        recipientId: notifyId,
        category:    'NCR_REJECTED',
        title:       'Issue Rejected',
        message:     `Issue "${updated.title ?? ''}" was rejected: ${dto.rejectionReason}`,
        entityType:  'NCR_CAPA',
        entityId:    id,
        workspaceId: updated.workspaceId ?? undefined,
      }).catch(() => {});
    }

    return updated;
  }

  async close(id: string, actorId: string, actorRoles: string[], actorPermissions: string[]) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true, status: true, title: true, raisedById: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    if (record.status !== 'VERIFIED') {
      throw new BadRequestException(`Can only close a VERIFIED record (current: "${record.status}")`);
    }

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated && !actorPermissions.includes('ncr.close')) {
      throw new ForbiddenException('You do not have permission to close NCR/CAPA records');
    }

    const updated = await this.prisma.ncrCapa.update({
      where: { id },
      data: { status: 'CLOSED', closedById: actorId, closedAt: new Date() },
      select: NCR_SELECT,
    });

    void this.auditLog.log({ actorId, action: 'CLOSED', entityType: 'NCR_CAPA', entityId: id, previousValue: { status: 'VERIFIED' } as Record<string, unknown>, newValue: { status: 'CLOSED' } as Record<string, unknown> });

    this.emitNcrUpdated(id, updated.workspaceId, 'closed');
    return updated;
  }

  async addComment(id: string, dto: AddCommentDto, actorId: string) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    return this.prisma.ncrCapaComment.create({
      data: { ncrCapaId: id, authorId: actorId, body: dto.body },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async getComments(id: string) {
    const record = await this.prisma.ncrCapa.findUnique({ where: { id }, select: { id: true } });
    if (!record) throw new NotFoundException('NCR/CAPA record not found');

    return this.prisma.ncrCapaComment.findMany({
      where: { ncrCapaId: id },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
