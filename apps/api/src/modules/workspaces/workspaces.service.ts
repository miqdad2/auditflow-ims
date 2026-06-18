import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { SetHomePageDto } from './dto/set-home-page.dto';
import { PinItemDto } from './dto/pin-item.dto';
import { extractUserRoles } from '../../common/permissions.guard';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private realtime: RealtimeService,
  ) {}

  async assertWorkspaceAccess(
    workspaceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ): Promise<void> {
    if (actorRoles.some((r) => ELEVATED_ROLES.includes(r))) return;

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId: actorId }, select: { id: true } } },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Explicit workspace member always has access
    if (ws.members.length > 0) return;

    // DEPARTMENT visibility: allow DEPARTMENT_MANAGER and DEPARTMENT_USER if their dept matches
    if (ws.visibility === 'DEPARTMENT' && actorDeptId && ws.departmentId === actorDeptId) {
      const isDeptRole = actorRoles.includes('DEPARTMENT_MANAGER') || actorRoles.includes('DEPARTMENT_USER');
      if (isDeptRole) return;
    }

    // ORGANIZATION visibility: only elevated roles (handled above) + explicit members (handled above)
    // PRIVATE visibility: only explicit members (handled above)
    // STAFF and AUDITOR_VIEWER must be explicit members — no implicit access
    throw new ForbiddenException('You do not have access to this workspace');
  }

  /**
   * Returns a Prisma WHERE fragment that restricts a query to workspaces
   * the actor can access, for use in related-entity list endpoints.
   * Entities must have a nullable `workspaceId` field + `workspace` relation.
   * Usage: { AND: [existingWhere, svc.buildWorkspaceVisibilityWhere(...)] }
   *
   * Access rules (non-elevated):
   *  - Always: explicit WorkspaceMember
   *  - DEPARTMENT_MANAGER / DEPARTMENT_USER: also DEPARTMENT workspaces where dept matches
   *  - STAFF / AUDITOR_VIEWER / others: member-only — no implicit access
   */
  async getWorkspaceMemberRole(userId: string, workspaceId: string): Promise<string | null> {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { roleInWorkspace: true },
    });
    return m?.roleInWorkspace ?? null;
  }

  /**
   * Returns true when the actor can collaborate (create/edit) inside the workspace.
   * Elevated roles always pass. Department roles pass for DEPARTMENT workspaces with
   * a dept match. Explicit workspace members with MEMBER/MANAGER/OWNER pass.
   * VIEWER members and non-members get false.
   */
  async canCollaborateInWorkspace(
    userId: string,
    workspaceId: string,
    roles: string[],
    deptId: string | null,
  ): Promise<boolean> {
    if (roles.some((r) => ELEVATED_ROLES.includes(r))) return true;

    const memberRole = await this.getWorkspaceMemberRole(userId, workspaceId);
    if (memberRole && ['MEMBER', 'MANAGER', 'OWNER'].includes(memberRole)) return true;

    const isDeptRole = roles.includes('DEPARTMENT_MANAGER') || roles.includes('DEPARTMENT_USER');
    if (isDeptRole && deptId) {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { visibility: true, departmentId: true },
      });
      if (ws?.visibility === 'DEPARTMENT' && ws.departmentId === deptId) return true;
    }

    return false;
  }

  buildWorkspaceVisibilityWhere(
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ): Record<string, unknown> {
    if (actorRoles.some((r) => ELEVATED_ROLES.includes(r))) return {};

    const isDeptRole = actorRoles.includes('DEPARTMENT_MANAGER') || actorRoles.includes('DEPARTMENT_USER');

    const memberCondition = { workspace: { members: { some: { userId: actorId } } } };

    if (isDeptRole && actorDeptId) {
      return {
        OR: [
          { workspaceId: null },
          memberCondition,
          { workspace: { visibility: 'DEPARTMENT', departmentId: actorDeptId } },
        ],
      };
    }

    // STAFF, AUDITOR_VIEWER, others: only member workspaces (or no workspace assigned)
    return {
      OR: [
        { workspaceId: null },
        memberCondition,
      ],
    };
  }

  async findAll(actorId: string, actorRoles: string[], actorDeptId: string | null) {
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const isDeptRole = actorRoles.includes('DEPARTMENT_MANAGER') || actorRoles.includes('DEPARTMENT_USER');

    const where = isElevated
      ? {}
      : isDeptRole && actorDeptId
        ? {
            OR: [
              { visibility: 'DEPARTMENT' as const, departmentId: actorDeptId },
              { members: { some: { userId: actorId } } },
            ],
          }
        : {
            // STAFF, AUDITOR_VIEWER, others: only workspaces where they are explicit members
            members: { some: { userId: actorId } },
          };

    const workspaces = await this.prisma.workspace.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
        _count: { select: { taskLists: true, tasks: true, members: true } },
      },
    });

    return this.withWorkspaceSummaries(workspaces);
  }

  async findOne(id: string, actorId: string, actorRoles: string[], actorDeptId: string | null) {
    await this.assertWorkspaceAccess(id, actorId, actorRoles, actorDeptId);
    const [ws, myMembership] = await Promise.all([
      this.prisma.workspace.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, fullName: true } },
          department: { select: { id: true, name: true } },
          _count: { select: { members: true } },
          taskLists: {
            orderBy: { sortOrder: 'asc' },
            include: {
              department: { select: { id: true, name: true } },
              _count: { select: { tasks: true } },
            },
          },
        },
      }),
      this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: actorId } },
        select: { roleInWorkspace: true },
      }),
    ]);
    if (!ws) throw new NotFoundException('Workspace not found');
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const [summary] = await this.withWorkspaceSummaries([ws]);
    return {
      ...summary,
      myRole: myMembership?.roleInWorkspace ?? null,
      myAccess: isElevated ? 'elevated' : (myMembership?.roleInWorkspace ?? null),
    };
  }

  async getOverview(
    workspaceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    const now = new Date();

    const [
      checklistItems,
      evidence,
      openTasks,
      overdueTasks,
      completedTasks,
      documents,
      ncrOpen,
      ncrOverdue,
      ncrClosed,
      memberCount,
    ] = await Promise.all([
      this.prisma.auditChecklistItem.findMany({
        where: { checklist: { workspaceId } },
        select: { status: true },
      }),
      this.prisma.checklistEvidence.findMany({
        where: { checklistItem: { checklist: { workspaceId } } },
        select: { status: true },
      }),
      this.prisma.task.count({
        where: { workspaceId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.task.count({
        where: { workspaceId, dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.task.count({ where: { workspaceId, status: 'COMPLETED' } }),
      this.prisma.document.findMany({ where: { workspaceId }, select: { status: true } }),
      this.prisma.ncrCapa.count({ where: { workspaceId, status: { notIn: ['VERIFIED', 'CLOSED'] } } }),
      this.prisma.ncrCapa.count({
        where: {
          workspaceId,
          OR: [
            { status: 'OVERDUE' },
            { dueDate: { lt: now }, status: { notIn: ['VERIFIED', 'CLOSED'] } },
          ],
        },
      }),
      this.prisma.ncrCapa.count({ where: { workspaceId, status: 'CLOSED' } }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
    ]);

    const totalChecklist = checklistItems.length;
    const approvedChecklist  = checklistItems.filter((i) => i.status === 'APPROVED').length;
    const submittedChecklist = checklistItems.filter((i) => i.status === 'SUBMITTED').length;
    const rejectedChecklist  = checklistItems.filter((i) => i.status === 'REJECTED').length;
    const missingChecklist   = checklistItems.filter((i) => i.status === 'MISSING').length;

    const totalDocs       = documents.length;
    const approvedDocs    = documents.filter((d) => d.status === 'APPROVED').length;
    const underReviewDocs = documents.filter((d) => d.status === 'UNDER_REVIEW').length;
    const rejectedDocs    = documents.filter((d) => d.status === 'REJECTED').length;

    const totalEvidence    = evidence.length;
    const pendingEvidence  = evidence.filter((e) => e.status === 'SUBMITTED').length;
    const approvedEvidence = evidence.filter((e) => e.status === 'APPROVED').length;
    const rejectedEvidence = evidence.filter((e) => e.status === 'REJECTED').length;

    const [recentActivity, homePage, pinnedItemsRaw, myOpenTasks, myOverdueTasks, memberPreviewRaw] = await Promise.all([
      this.getWorkspaceAuditLogs(workspaceId, 10),
      this.prisma.page.findFirst({ where: { workspaceId, isHome: true }, select: { id: true, title: true } }),
      this.prisma.workspacePinnedItem.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.task.count({
        where: { workspaceId, assigneeId: actorId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.task.count({
        where: { workspaceId, assigneeId: actorId, dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        take: 5,
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, fullName: true } } },
      }),
    ]);

    // Resolve page titles for pinned items
    const pinnedPageIds = pinnedItemsRaw.filter((i) => i.entityType === 'PAGE').map((i) => i.entityId);
    const pinnedPages = pinnedPageIds.length > 0
      ? await this.prisma.page.findMany({ where: { id: { in: pinnedPageIds } }, select: { id: true, title: true } })
      : [];
    const pinnedPageMap = new Map(pinnedPages.map((p) => [p.id, p.title]));
    // Filter orphaned pins (pages that were deleted after being pinned)
    const pinnedItems = pinnedItemsRaw
      .filter((item) => item.entityType !== 'PAGE' || pinnedPageMap.has(item.entityId))
      .map((item) => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        title: item.entityType === 'PAGE' ? (pinnedPageMap.get(item.entityId) ?? '') : item.entityId,
      }));

    return {
      readiness: {
        total: totalChecklist,
        approved: approvedChecklist,
        submitted: submittedChecklist,
        rejected: rejectedChecklist,
        missing: missingChecklist,
        percent: totalChecklist > 0 ? Math.round((approvedChecklist / totalChecklist) * 100) : 0,
      },
      work: { open: openTasks, overdue: overdueTasks, completed: completedTasks },
      documents: { total: totalDocs, approved: approvedDocs, underReview: underReviewDocs, rejected: rejectedDocs },
      evidence: { total: totalEvidence, pending: pendingEvidence, approved: approvedEvidence, rejected: rejectedEvidence },
      ncrCapa: { open: ncrOpen, overdue: ncrOverdue, closed: ncrClosed },
      members: memberCount,
      myWork: { openTasks: myOpenTasks, overdueTasks: myOverdueTasks },
      memberPreview: memberPreviewRaw.map((m) => ({
        id: m.id,
        roleInWorkspace: m.roleInWorkspace,
        user: { id: m.user.id, fullName: m.user.fullName },
      })),
      recentActivity,
      homePage: homePage ?? null,
      pinnedItems,
    };
  }

  async getActivity(
    workspaceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    return this.getWorkspaceAuditLogs(workspaceId, 50);
  }

  // ─── Home Page ──────────────────────────────────────────────────────────────

  async setHomePage(
    workspaceId: string,
    dto: SetHomePageDto,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    await this.assertCanManageWorkspace(workspaceId, actorId, actorRoles);

    // Validate the target page BEFORE making any changes
    if (dto.pageId) {
      const page = await this.prisma.page.findUnique({
        where: { id: dto.pageId },
        select: { id: true, workspaceId: true },
      });
      if (!page) throw new NotFoundException('Page not found');
      if (page.workspaceId !== workspaceId) {
        throw new ForbiddenException('Page does not belong to this workspace');
      }
    }

    // Atomic clear + set so the workspace never briefly has no home page during the swap
    await this.prisma.$transaction([
      this.prisma.page.updateMany({ where: { workspaceId, isHome: true }, data: { isHome: false } }),
      ...(dto.pageId
        ? [this.prisma.page.update({ where: { id: dto.pageId }, data: { isHome: true } })]
        : []),
    ]);

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'PROJECT',
      entityId: workspaceId,
      newValue: { homePageId: dto.pageId ?? null },
    });

    this.realtime.emitToWorkspace(workspaceId, 'page.home.updated', { workspaceId, pageId: dto.pageId ?? null });

    return { success: true, pageId: dto.pageId ?? null };
  }

  // ─── Pinned Items ────────────────────────────────────────────────────────────

  async getPinnedItems(
    workspaceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    const items = await this.prisma.workspacePinnedItem.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    // Resolve page titles for PAGE pinned items
    const pageIds = items.filter((i) => i.entityType === 'PAGE').map((i) => i.entityId);
    const pages = pageIds.length > 0
      ? await this.prisma.page.findMany({ where: { id: { in: pageIds } }, select: { id: true, title: true } })
      : [];
    const pageMap = new Map(pages.map((p) => [p.id, p.title]));

    // Filter out orphaned pins (e.g. pages that were deleted after being pinned)
    return items
      .filter((item) => item.entityType !== 'PAGE' || pageMap.has(item.entityId))
      .map((item) => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        title: item.entityType === 'PAGE' ? (pageMap.get(item.entityId) ?? '') : item.entityId,
        pinnedById: item.pinnedById,
        createdAt: item.createdAt,
      }));
  }

  async pinItem(
    workspaceId: string,
    dto: PinItemDto,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    await this.assertCanManageWorkspace(workspaceId, actorId, actorRoles);

    if (dto.entityType === 'PAGE') {
      const page = await this.prisma.page.findUnique({
        where: { id: dto.entityId },
        select: { id: true, workspaceId: true },
      });
      if (!page) throw new NotFoundException('Page not found');
      if (page.workspaceId !== workspaceId) {
        throw new ForbiddenException('Page does not belong to this workspace');
      }
    }

    const item = await this.prisma.workspacePinnedItem.upsert({
      where: { workspaceId_entityType_entityId: { workspaceId, entityType: dto.entityType, entityId: dto.entityId } },
      create: { workspaceId, entityType: dto.entityType, entityId: dto.entityId, pinnedById: actorId },
      update: {},
    });

    this.realtime.emitToWorkspace(workspaceId, 'pinned.updated', { workspaceId, action: 'pinned', entityType: dto.entityType, entityId: dto.entityId });

    return item;
  }

  async unpinItem(
    workspaceId: string,
    entityId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    await this.assertCanManageWorkspace(workspaceId, actorId, actorRoles);

    await this.prisma.workspacePinnedItem.deleteMany({
      where: { workspaceId, entityId },
    });

    this.realtime.emitToWorkspace(workspaceId, 'pinned.updated', { workspaceId, action: 'unpinned', entityId });

    return { success: true };
  }

  private async assertCanManageWorkspace(workspaceId: string, actorId: string, actorRoles: string[]): Promise<void> {
    if (actorRoles.some((r) => ELEVATED_ROLES.includes(r))) return;

    const [ws, member] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } }),
      this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: actorId } },
        select: { roleInWorkspace: true },
      }),
    ]);

    if (ws?.ownerId === actorId) return;
    if (member && ['OWNER', 'MANAGER'].includes(member.roleInWorkspace)) return;
    throw new ForbiddenException('Workspace MANAGER role is required for this action');
  }

  private async getWorkspaceAuditLogs(workspaceId: string, take: number) {
    const [taskIds, pageIds, docIds, ncrIds, workspace] = await Promise.all([
      this.prisma.task.findMany({ where: { workspaceId }, select: { id: true, title: true } }),
      this.prisma.page.findMany({ where: { workspaceId }, select: { id: true, title: true } }),
      this.prisma.document.findMany({ where: { workspaceId }, select: { id: true, title: true } }),
      this.prisma.ncrCapa.findMany({ where: { workspaceId }, select: { id: true, title: true } }),
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } }),
    ]);

    // Build entity title map for quick lookup
    const titleMap = new Map<string, string>();
    taskIds.forEach((t) => titleMap.set(t.id, t.title));
    pageIds.forEach((p) => titleMap.set(p.id, p.title));
    docIds.forEach((d) => titleMap.set(d.id, d.title));
    ncrIds.forEach((n) => titleMap.set(n.id, n.title));
    if (workspace) titleMap.set(workspace.id, workspace.name);

    const orConditions: Array<Record<string, unknown>> = [
      { entityType: 'PROJECT', entityId: workspaceId },
    ];
    if (taskIds.length > 0) orConditions.push({ entityType: 'TASK', entityId: { in: taskIds.map((t) => t.id) } });
    if (pageIds.length > 0) orConditions.push({ entityType: 'PAGE', entityId: { in: pageIds.map((p) => p.id) } });
    if (docIds.length > 0) orConditions.push({ entityType: 'DOCUMENT', entityId: { in: docIds.map((d) => d.id) } });
    if (ncrIds.length > 0) orConditions.push({ entityType: 'NCR_CAPA', entityId: { in: ncrIds.map((n) => n.id) } });

    const logs = await this.prisma.auditLog.findMany({
      where: { OR: orConditions },
      orderBy: { createdAt: 'desc' },
      take,
      include: { actor: { select: { id: true, fullName: true } } },
    });

    return logs.map((log) => ({
      ...log,
      entityTitle: log.entityId ? (titleMap.get(log.entityId) ?? null) : null,
    }));
  }

  async create(dto: CreateWorkspaceDto, actorId: string) {
    const ws = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        ownerId: actorId,
        visibility: dto.visibility ?? 'PRIVATE',
        departmentId: dto.departmentId ?? null,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
        _count: { select: { taskLists: true, tasks: true, members: true } },
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'PROJECT',
      entityId: ws.id,
      newValue: { name: ws.name },
    });

    const [summary] = await this.withWorkspaceSummaries([ws]);
    return summary;
  }

  async update(id: string, dto: UpdateWorkspaceDto, actorId: string) {
    const existing = await this.prisma.workspace.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Workspace not found');

    const updated = await this.prisma.workspace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
        _count: { select: { taskLists: true, tasks: true, members: true } },
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'PROJECT',
      entityId: id,
      previousValue: { name: existing.name, status: existing.status, visibility: existing.visibility },
      newValue: { name: updated.name, status: updated.status, visibility: updated.visibility },
    });

    const [summary] = await this.withWorkspaceSummaries([updated]);
    return summary;
  }

  private async withWorkspaceSummaries<T extends { id: string }>(workspaces: T[]) {
    const workspaceIds = workspaces.map((ws) => ws.id);
    if (workspaceIds.length === 0) return [];

    const now = new Date();
    const [
      completedTasks,
      openTasks,
      overdueTasks,
      approvedDocuments,
      documentsUnderReview,
      openNcrCapas,
      overdueNcrCapas,
      checklistItems,
    ] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: 'COMPLETED' },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        _count: { id: true },
      }),
      this.prisma.document.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: 'APPROVED' },
        _count: { id: true },
      }),
      this.prisma.document.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: 'UNDER_REVIEW' },
        _count: { id: true },
      }),
      this.prisma.ncrCapa.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: { notIn: ['VERIFIED', 'CLOSED'] } },
        _count: { id: true },
      }),
      this.prisma.ncrCapa.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          OR: [
            { status: 'OVERDUE' },
            { dueDate: { lt: now }, status: { notIn: ['VERIFIED', 'CLOSED'] } },
          ],
        },
        _count: { id: true },
      }),
      this.prisma.auditChecklistItem.findMany({
        where: { checklist: { workspaceId: { in: workspaceIds } } },
        select: { status: true, checklist: { select: { workspaceId: true } } },
      }),
    ]);

    const countMap = (rows: Array<{ workspaceId: string | null; _count: { id: number } }>) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row.workspaceId) map.set(row.workspaceId, row._count.id);
      }
      return map;
    };

    const completedTaskMap = countMap(completedTasks);
    const openTaskMap = countMap(openTasks);
    const overdueTaskMap = countMap(overdueTasks);
    const approvedDocumentMap = countMap(approvedDocuments);
    const documentsUnderReviewMap = countMap(documentsUnderReview);
    const openNcrCapaMap = countMap(openNcrCapas);
    const overdueNcrCapaMap = countMap(overdueNcrCapas);
    const checklistMap = new Map<string, {
      total: number;
      approved: number;
      submitted: number;
      rejected: number;
      missing: number;
    }>();

    for (const item of checklistItems) {
      const workspaceId = item.checklist.workspaceId;
      if (!workspaceId) continue;
      const summary = checklistMap.get(workspaceId) ?? {
        total: 0,
        approved: 0,
        submitted: 0,
        rejected: 0,
        missing: 0,
      };
      summary.total += 1;
      if (item.status === 'APPROVED') summary.approved += 1;
      if (item.status === 'SUBMITTED') summary.submitted += 1;
      if (item.status === 'REJECTED') summary.rejected += 1;
      if (item.status === 'MISSING') summary.missing += 1;
      checklistMap.set(workspaceId, summary);
    }

    return workspaces.map((workspace) => {
      const checklist = checklistMap.get(workspace.id) ?? {
        total: 0,
        approved: 0,
        submitted: 0,
        rejected: 0,
        missing: 0,
      };
      const readinessPercent = checklist.total > 0
        ? Math.round((checklist.approved / checklist.total) * 100)
        : 0;

      return {
        ...workspace,
        summary: {
          readinessPercent,
          tasks: {
            completed: completedTaskMap.get(workspace.id) ?? 0,
            open: openTaskMap.get(workspace.id) ?? 0,
            overdue: overdueTaskMap.get(workspace.id) ?? 0,
          },
          documents: {
            approved: approvedDocumentMap.get(workspace.id) ?? 0,
            underReview: documentsUnderReviewMap.get(workspace.id) ?? 0,
          },
          checklist,
          ncrCapa: {
            open: openNcrCapaMap.get(workspace.id) ?? 0,
            overdue: overdueNcrCapaMap.get(workspace.id) ?? 0,
          },
        },
      };
    });
  }

  async delete(id: string, actorId: string, actorRoles: string[]) {
    const existing = await this.prisma.workspace.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Workspace not found');

    const ADMIN_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];
    if (!actorRoles.some((r) => ADMIN_ROLES.includes(r))) {
      throw new ForbiddenException('Only SUPER_ADMIN or IT_ADMIN can delete workspaces');
    }

    // Null out optional workspace references on models without cascade
    await this.prisma.$transaction([
      this.prisma.document.updateMany({ where: { workspaceId: id }, data: { workspaceId: null } }),
      this.prisma.auditChecklist.updateMany({ where: { workspaceId: id }, data: { workspaceId: null } }),
      this.prisma.ncrCapa.updateMany({ where: { workspaceId: id }, data: { workspaceId: null } }),
      this.prisma.workspace.delete({ where: { id } }),
    ]);

    await this.auditLog.log({
      actorId,
      action: 'DELETED',
      entityType: 'PROJECT',
      entityId: id,
      previousValue: { name: existing.name, status: existing.status },
    });

    return { success: true };
  }

  // ─── Workspace Members ──────────────────────────────────────────────────────

  async getMembers(workspaceId: string) {
    await this.ensureWorkspaceExists(workspaceId);
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true,
            department: { select: { id: true, name: true } },
            userRoles: { include: { role: { select: { name: true, displayName: true } } } },
          },
        },
      },
    });
  }

  async addMember(
    workspaceId: string,
    dto: AddWorkspaceMemberDto,
    actor: Record<string, unknown>,
  ) {
    const ws = await this.ensureWorkspaceExists(workspaceId);
    await this.assertCanManageMembers(ws, actor);

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('User is already a member of this workspace');

    const member = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: dto.userId,
        roleInWorkspace: dto.roleInWorkspace ?? 'MEMBER',
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    void this.auditLog.log({
      actorId: actor.id as string,
      action: 'MEMBER_ADDED',
      entityType: 'PROJECT',
      entityId: workspaceId,
      newValue: { userId: dto.userId, roleInWorkspace: member.roleInWorkspace },
    });

    this.realtime.emitToWorkspace(workspaceId, 'workspace.member.added', {
      workspaceId, userId: dto.userId, memberId: member.id,
    });

    return member;
  }

  async updateMember(
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto,
    actor: Record<string, unknown>,
  ) {
    const ws = await this.ensureWorkspaceExists(workspaceId);
    await this.assertCanManageMembers(ws, actor);

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Workspace member not found');

    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { roleInWorkspace: dto.roleInWorkspace },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    void this.auditLog.log({
      actorId: actor.id as string,
      action: 'MEMBER_UPDATED',
      entityType: 'PROJECT',
      entityId: workspaceId,
      previousValue: { roleInWorkspace: member.roleInWorkspace },
      newValue: { roleInWorkspace: dto.roleInWorkspace },
    });

    return updated;
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    actor: Record<string, unknown>,
  ) {
    const ws = await this.ensureWorkspaceExists(workspaceId);
    await this.assertCanManageMembers(ws, actor);

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Workspace member not found');

    await this.prisma.workspaceMember.delete({ where: { id: memberId } });

    void this.auditLog.log({
      actorId: actor.id as string,
      action: 'MEMBER_REMOVED',
      entityType: 'PROJECT',
      entityId: workspaceId,
      previousValue: { userId: member.userId },
    });

    this.realtime.emitToWorkspace(workspaceId, 'workspace.member.removed', {
      workspaceId, memberId, userId: member.userId,
    });
    this.realtime.emitToUser(member.userId, 'workspace.access.removed', { workspaceId });

    return { success: true };
  }

  private async ensureWorkspaceExists(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  private async assertCanManageMembers(
    ws: { id: string; ownerId: string },
    actor: Record<string, unknown>,
  ) {
    const actorId = actor.id as string;
    const actorRoles = extractUserRoles(actor);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (isElevated) return;
    if (ws.ownerId === actorId) return;
    const memberRole = await this.getWorkspaceMemberRole(actorId, ws.id);
    if (memberRole && ['MANAGER', 'OWNER'].includes(memberRole)) return;
    throw new ForbiddenException('Workspace MANAGER, OWNER, or elevated role required to manage members');
  }
}
