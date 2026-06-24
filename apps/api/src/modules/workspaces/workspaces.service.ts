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
import {
  computeWorkspaceOperationalStatus,
  endOfDayKuwait,
  type WorkspaceStatusReason,
} from './workspace-status.helper';

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
    visibilityMode?: string,  // optional: pass from controller to avoid extra DB lookup
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

    // ALL workspace visibility: grants read-level access to all workspaces.
    // Used by Executive users configured with workspaceVisibilityMode = 'ALL'.
    // If not passed by the caller, look it up from DB (one fast PK lookup).
    const resolvedMode = visibilityMode !== undefined
      ? visibilityMode
      : await this.prisma.user.findUnique({
          where: { id: actorId },
          select: { workspaceVisibilityMode: true },
        }).then((u) => (u?.workspaceVisibilityMode as string | null) ?? 'SELECTED');

    if (resolvedMode === 'ALL') return;

    throw new ForbiddenException('Workspace unavailable or access denied.');
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
   * Verify that a user is eligible to receive a task assignment in a workspace.
   *
   * Actor-role elevation (e.g. SUPER_USER) means the ACTOR may manage any task —
   * it does NOT bypass the ASSIGNEE's own workspace-access requirements.
   * These are two separate checks:
   *   • Actor check  → handled by assertWorkspaceAccess / canCollaborateInWorkspace
   *   • Assignee check → handled here, always enforced regardless of actor role
   *
   * Eligibility rules for the assignee:
   *   1. User must exist and be active.
   *   2. User must be an explicit WorkspaceMember with MEMBER | MANAGER | OWNER role.
   *      VIEWER is read-only access and is NOT eligible for task assignment.
   *   3. Narrow exception: if the assignee themselves holds SUPER_ADMIN or SUPER_USER
   *      system-level access, they can be assigned without explicit workspace membership
   *      because they have implicit business-wide visibility.
   *
   * The `actorRoles` parameter is kept for backward compatibility but is intentionally
   * unused here — actor privileges must not influence assignee eligibility.
   */
  async assertCanBeAssigned(
    assigneeId: string,
    workspaceId: string,
    _actorRoles: string[], // actor privilege does not bypass assignee eligibility
  ): Promise<void> {
    const [assignee, membership] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: {
          isActive: true,
          userRoles: { include: { role: { select: { name: true } } } },
        },
      }),
      this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
        select: { roleInWorkspace: true },
      }),
    ]);

    if (!assignee) throw new BadRequestException('Assignee user not found.');
    if (!assignee.isActive) throw new BadRequestException('This user is inactive and cannot be assigned tasks.');

    // Elevated-assignee exception: SUPER_ADMIN or SUPER_USER can be assigned without
    // explicit workspace membership because they have implicit business-wide access.
    const ELEVATED_ASSIGNEE_ROLES = ['SUPER_ADMIN', 'SUPER_USER'];
    const assigneeSystemRoles = (assignee.userRoles as Array<{ role: { name: string } }>).map((ur) => ur.role.name);
    if (assigneeSystemRoles.some((r) => ELEVATED_ASSIGNEE_ROLES.includes(r))) return;

    // All other users: require explicit workspace membership with operational role.
    if (!membership) {
      throw new BadRequestException(
        'This user must be added to the workspace as a Member, Manager, or Owner before the task can be assigned.',
      );
    }

    if (membership.roleInWorkspace === 'VIEWER') {
      throw new BadRequestException(
        'This user has read-only workspace access and cannot be assigned operational tasks.',
      );
    }

    if (!['MEMBER', 'MANAGER', 'OWNER'].includes(membership.roleInWorkspace)) {
      throw new BadRequestException(
        'Only workspace Members, Managers, and Owners can be assigned tasks.',
      );
    }
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

  async findAll(
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
    visibilityMode = 'SELECTED',
  ) {
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const isDeptRole = actorRoles.includes('DEPARTMENT_MANAGER') || actorRoles.includes('DEPARTMENT_USER');

    // ALL visibility: return all workspaces (same as elevated scope for list purposes).
    // Executive users with workspaceVisibilityMode = 'ALL' see every active workspace.
    const where = (isElevated || visibilityMode === 'ALL')
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

    // Tier D: elevated system roles see the full workspace audit history
    if (actorRoles.some((r) => ELEVATED_ROLES.includes(r))) {
      return this.getWorkspaceAuditLogs(workspaceId, 50);
    }

    // Tier C: workspace Manager/Owner see full workspace activity
    const memberRole = await this.getWorkspaceMemberRole(actorId, workspaceId);
    if (memberRole === 'MANAGER' || memberRole === 'OWNER') {
      return this.getWorkspaceAuditLogs(workspaceId, 50);
    }

    // Tier A/B: VIEWER or MEMBER — see only personally relevant activity
    return this.getMemberScopedActivity(workspaceId, actorId, 50);
  }

  /**
   * Role-scoped activity for MEMBER and VIEWER roles (Tiers A/B).
   *
   * Returns audit events that are directly relevant to the current user:
   * 1. Actions the user performed themselves (actorId = currentUser)
   * 2. Events on tasks currently assigned to the current user
   * 3. Workspace membership events that concern the current user
   *
   * Historical limitation: if a task was reassigned away, the user no longer sees
   * historical events on that task because task assignment is a live state lookup.
   * Future events record richer metadata so this limitation shrinks over time.
   */
  private async getMemberScopedActivity(workspaceId: string, actorId: string, take: number) {
    // Step 1: collect task IDs currently assigned to this user in the workspace
    const [assignedTasks, workspace] = await Promise.all([
      this.prisma.task.findMany({
        where: { workspaceId, assigneeId: actorId },
        select: { id: true, title: true },
      }),
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } }),
    ]);

    const assignedTaskIds = assignedTasks.map((t) => t.id);
    const taskTitleMap = new Map(assignedTasks.map((t) => [t.id, t.title]));

    // Step 2: OR conditions for relevant events
    // Build task list for in-operator (Prisma requires at least one item; use sentinel if empty)
    const taskIdList = assignedTaskIds.length > 0 ? assignedTaskIds : ['__NO_ASSIGNED_TASKS__'];

    const orConditions: Record<string, unknown>[] = [
      // Own actions on any workspace entity
      { actorId, entityType: 'PROJECT',        entityId: workspaceId },
      { actorId, entityType: 'DOCUMENT' },
      { actorId, entityType: 'NCR_CAPA' },
      { actorId, entityType: 'FILE_ATTACHMENT' },
      // Own task actions (actor is current user)
      { actorId, entityType: 'TASK' },
      // Any action on tasks assigned to current user (any actor)
      { entityType: 'TASK', entityId: { in: taskIdList } },
    ];

    // Fetch more than `take` to allow post-filtering of PROJECT events
    const rawLogs = await this.prisma.auditLog.findMany({
      where: { OR: orConditions },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take * 3, 200),
      include: { actor: { select: { id: true, fullName: true } } },
    });

    // Step 3: post-filter — restrict PROJECT events to only those relevant to current user
    const filtered = rawLogs.filter((log) => {
      if (log.entityType !== 'PROJECT') return true;
      if (log.actorId === actorId) return true; // their own workspace actions (department assign, etc.)

      // Membership events: only show if they concern the current user
      const nv = log.newValue as Record<string, unknown> | null;
      const pv = log.previousValue as Record<string, unknown> | null;
      if (log.action === 'MEMBER_ADDED' || log.action === 'MEMBER_UPDATED') {
        return nv?.userId === actorId;
      }
      if (log.action === 'MEMBER_REMOVED') {
        return pv?.userId === actorId;
      }

      // Hide all other PROJECT-level workspace admin events (workspace updated, archived, etc.)
      return false;
    });

    // Step 4: build title map for entity lookup
    const titleMap = new Map<string, string>();
    taskTitleMap.forEach((title, id) => titleMap.set(id, title));
    if (workspace) titleMap.set(workspace.id, workspace.name);

    // Resolve titles for documents/NCRs referenced in filtered events
    const docIds = [...new Set(filtered.filter((l) => l.entityType === 'DOCUMENT' && l.entityId).map((l) => l.entityId as string))];
    const ncrIds = [...new Set(filtered.filter((l) => l.entityType === 'NCR_CAPA' && l.entityId).map((l) => l.entityId as string))];
    if (docIds.length > 0) {
      const docs = await this.prisma.document.findMany({ where: { id: { in: docIds } }, select: { id: true, title: true } });
      docs.forEach((d) => titleMap.set(d.id, d.title));
    }
    if (ncrIds.length > 0) {
      const ncrs = await this.prisma.ncrCapa.findMany({ where: { id: { in: ncrIds } }, select: { id: true, title: true } });
      ncrs.forEach((n) => titleMap.set(n.id, n.title));
    }

    return filtered.slice(0, take).map((log) => ({
      ...log,
      entityTitle: log.entityId ? (titleMap.get(log.entityId) ?? null) : null,
    }));
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

  private async withWorkspaceSummaries<T extends {
    id: string;
    status: string;
    departmentId: string | null;
    _count: { members: number };
  }>(workspaces: T[]) {
    const workspaceIds = workspaces.map((ws) => ws.id);
    if (workspaceIds.length === 0) return [];

    const now = new Date();
    const eod = endOfDayKuwait(now);

    // ── Round 1: all workspace-level batch queries in parallel ────────────────
    const [
      completedTasks,
      openTasks,
      overdueTasks,
      approvedDocuments,
      documentsUnderReview,
      openNcrCapas,
      overdueNcrCapas,
      checklistItems,
      // For operational status:
      taskDetailRows,
      ncrDetailRows,
      deptRows,
      // Operational member count: MEMBER | MANAGER | OWNER (excludes VIEWER)
      operationalMemberRows,
    ] = await Promise.all([
      // ── Existing summary queries (APPROVED tasks only — Unit 63.1) ───────────
      this.prisma.task.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: 'COMPLETED', approvalStatus: 'APPROVED' },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['workspaceId'],
        where: { workspaceId: { in: workspaceIds }, status: { notIn: ['COMPLETED', 'CANCELLED'] }, approvalStatus: 'APPROVED' },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          approvalStatus: 'APPROVED',
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
      // ── Task detail rows (for status engine) ──────────────────────────────
      this.prisma.task.findMany({
        where: { workspaceId: { in: workspaceIds }, parentTaskId: null },
        select: {
          id: true,
          workspaceId: true,
          status: true,
          priority: true,
          isReference: true,
          assigneeId: true,
          dueDate: true,
          approvalStatus: true,
        },
      }),
      // ── NCR detail rows (for status engine) ───────────────────────────────
      this.prisma.ncrCapa.findMany({
        where: {
          workspaceId: { in: workspaceIds },
          status: { notIn: ['VERIFIED', 'CLOSED'] },
        },
        select: { workspaceId: true, status: true, dueDate: true },
      }),
      // ── Department active status ───────────────────────────────────────────
      (() => {
        const deptIds = [...new Set(workspaces.map((ws) => ws.departmentId).filter(Boolean))] as string[];
        return deptIds.length > 0
          ? this.prisma.department.findMany({
              where: { id: { in: deptIds } },
              select: { id: true, isActive: true },
            })
          : Promise.resolve([] as Array<{ id: string; isActive: boolean }>);
      })(),
      // ── Operational member count: MEMBER | MANAGER | OWNER (excludes VIEWER)
      this.prisma.workspaceMember.groupBy({
        by: ['workspaceId'],
        where: {
          workspaceId: { in: workspaceIds },
          roleInWorkspace: { not: 'VIEWER' },
          user: { isActive: true },
        },
        _count: { id: true },
      }),
    ]);

    // ── Round 2: file attachments (needs task IDs from round 1) ───────────────
    const allTaskIds = taskDetailRows.map((t) => t.id);
    const fileAttachmentRows = allTaskIds.length > 0
      ? await this.prisma.fileAttachment.findMany({
          where: {
            entityType: 'TASK',
            entityId: { in: allTaskIds },
            isSuperseded: false,
            expiryDate: { not: null },
          },
          select: { entityId: true, expiryDate: true, reminderDays: true },
        })
      : [];

    // ── Build lookup maps ─────────────────────────────────────────────────────

    const countMap = (rows: Array<{ workspaceId: string | null; _count: { id: number } }>) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row.workspaceId) map.set(row.workspaceId, row._count.id);
      }
      return map;
    };

    const completedTaskMap        = countMap(completedTasks);
    const openTaskMap             = countMap(openTasks);
    const overdueTaskMap          = countMap(overdueTasks);
    const approvedDocumentMap     = countMap(approvedDocuments);
    const documentsUnderReviewMap = countMap(documentsUnderReview);
    const openNcrCapaMap          = countMap(openNcrCapas);
    const overdueNcrCapaMap       = countMap(overdueNcrCapas);
    const operationalMemberMap    = countMap(operationalMemberRows);

    // Checklist map
    const checklistMap = new Map<string, {
      total: number; approved: number; submitted: number; rejected: number; missing: number;
    }>();
    for (const item of checklistItems) {
      const workspaceId = item.checklist.workspaceId;
      if (!workspaceId) continue;
      const s = checklistMap.get(workspaceId) ?? { total: 0, approved: 0, submitted: 0, rejected: 0, missing: 0 };
      s.total += 1;
      if (item.status === 'APPROVED')  s.approved += 1;
      if (item.status === 'SUBMITTED') s.submitted += 1;
      if (item.status === 'REJECTED')  s.rejected += 1;
      if (item.status === 'MISSING')   s.missing += 1;
      checklistMap.set(workspaceId, s);
    }

    // Task detail map (workspaceId → tasks)
    type TaskRow = typeof taskDetailRows[number];
    const taskByWs = new Map<string, TaskRow[]>();
    for (const t of taskDetailRows) {
      const arr = taskByWs.get(t.workspaceId) ?? [];
      arr.push(t);
      taskByWs.set(t.workspaceId, arr);
    }

    // File attachment map (taskId → workspace, then group by workspace)
    type AttRow = typeof fileAttachmentRows[number];
    const taskIdToWs = new Map<string, string>();
    for (const t of taskDetailRows) taskIdToWs.set(t.id, t.workspaceId);
    const filesByWs = new Map<string, AttRow[]>();
    for (const att of fileAttachmentRows) {
      const wsId = taskIdToWs.get(att.entityId);
      if (!wsId) continue;
      const arr = filesByWs.get(wsId) ?? [];
      arr.push(att);
      filesByWs.set(wsId, arr);
    }

    // NCR detail map (workspaceId → issues)
    type NcrRow = typeof ncrDetailRows[number];
    const ncrByWs = new Map<string, NcrRow[]>();
    for (const n of ncrDetailRows) {
      if (!n.workspaceId) continue;
      const arr = ncrByWs.get(n.workspaceId) ?? [];
      arr.push(n);
      ncrByWs.set(n.workspaceId, arr);
    }

    // Department active map
    const deptActiveMap = new Map<string, boolean>();
    for (const d of deptRows) deptActiveMap.set(d.id, d.isActive);

    // ── Per-workspace metrics and status computation ───────────────────────────

    return workspaces.map((workspace) => {
      const checklist = checklistMap.get(workspace.id) ?? { total: 0, approved: 0, submitted: 0, rejected: 0, missing: 0 };
      const readinessPercent = checklist.total > 0
        ? Math.round((checklist.approved / checklist.total) * 100) : 0;

      // Task metrics — Unit 63.1: only APPROVED tasks enter operational counts
      const wsTasks = taskByWs.get(workspace.id) ?? [];
      // pendingApprovalTasks is informational only; not included in any operational metric
      const pendingApprovalTasks = wsTasks.filter((t) => t.approvalStatus === 'PENDING').length;
      const nonRefTasks = wsTasks.filter((t) => !t.isReference && t.approvalStatus === 'APPROVED');
      const activeTasks = nonRefTasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));

      const inProgressTasks     = activeTasks.filter((t) => t.status === 'IN_PROGRESS').length;
      const unassignedTasks     = activeTasks.filter((t) => !t.assigneeId).length;
      const waitingReviewTasks  = activeTasks.filter((t) => t.status === 'WAITING_REVIEW').length;
      const returnedTasks       = activeTasks.filter((t) => t.status === 'REJECTED').length;
      const completedNonRefTasks = nonRefTasks.filter((t) => t.status === 'COMPLETED').length;
      const overdueCriticalHighTasks = nonRefTasks.filter((t) =>
        !['COMPLETED', 'CANCELLED'].includes(t.status) &&
        t.dueDate !== null && new Date(t.dueDate) < eod &&
        ['CRITICAL', 'HIGH'].includes(t.priority),
      ).length;
      const overdueMediumLowTasks = nonRefTasks.filter((t) =>
        !['COMPLETED', 'CANCELLED'].includes(t.status) &&
        t.dueDate !== null && new Date(t.dueDate) < eod &&
        ['LOW', 'MEDIUM'].includes(t.priority),
      ).length;

      // File expiry metrics (using per-file reminderDays, defaulting to 14)
      const wsFiles = filesByWs.get(workspace.id) ?? [];
      const expiredFiles = wsFiles.filter((f) => f.expiryDate !== null && new Date(f.expiryDate) < eod).length;
      const expiringFiles = wsFiles.filter((f) => {
        if (!f.expiryDate) return false;
        const expiry = new Date(f.expiryDate);
        if (expiry < eod) return false;
        const reminderMs = (f.reminderDays ?? 14) * 24 * 60 * 60 * 1000;
        return expiry.getTime() - eod.getTime() <= reminderMs;
      }).length;

      // NCR metrics
      const wsNcrs = ncrByWs.get(workspace.id) ?? [];
      const overdueIssues = wsNcrs.filter((n) =>
        n.status === 'OVERDUE' || (n.dueDate !== null && new Date(n.dueDate) < eod),
      ).length;
      const openIssues = wsNcrs.length; // pre-filtered to non-terminal
      const issuesWaitingVerification = wsNcrs.filter((n) => n.status === 'SUBMITTED').length;

      // Operational members: MEMBER | MANAGER | OWNER with active user (excludes VIEWER)
      const operationalMembers = operationalMemberMap.get(workspace.id) ?? 0;

      // Compute operational status
      const opResult = computeWorkspaceOperationalStatus({
        lifecycleStatus:            workspace.status,
        hasDepartment:              !!workspace.departmentId,
        departmentIsActive:         workspace.departmentId ? (deptActiveMap.get(workspace.departmentId) ?? true) : false,
        operationalMembers,
        openTasks:                  activeTasks.length,
        inProgressTasks,
        unassignedTasks,
        overdueCriticalHighTasks,
        overdueMediumLowTasks,
        waitingReviewTasks,
        returnedTasks,
        completedTasks:             completedNonRefTasks,
        documentsUnderReview:       documentsUnderReviewMap.get(workspace.id) ?? 0,
        overdueIssues,
        openIssues,
        issuesWaitingVerification,
        expiredFiles,
        expiringFiles,
        pendingApprovalTasks,
      });

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
        operationalStatus:      opResult.status,
        operationalStatusLabel: opResult.label,
        operationalReasons:     opResult.reasons as WorkspaceStatusReason[],
        metrics:                opResult.metrics,
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

  /**
   * Returns users eligible for task assignment in a workspace.
   * Uses the same eligibility rules as assertCanBeAssigned():
   *   1. Active MEMBER | MANAGER | OWNER workspace members.
   *   2. Active SUPER_ADMIN | SUPER_USER users (elevated-assignee exception),
   *      even if they are not explicit workspace members.
   *
   * This endpoint mirrors assertCanBeAssigned() so the dropdown and backend
   * validation can never drift apart.
   */
  async getEligibleAssignees(workspaceId: string) {
    await this.ensureWorkspaceExists(workspaceId);

    // Group 1: operational workspace members (MEMBER | MANAGER | OWNER, active users)
    const memberRows = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        roleInWorkspace: { not: 'VIEWER' },
        user: { isActive: true },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        roleInWorkspace: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    const result = memberRows.map((m) => ({
      id: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      department: m.user.department,
      roleInWorkspace: m.roleInWorkspace,
    }));

    // Group 2: elevated-assignee exception — active SUPER_ADMIN/SUPER_USER not already listed
    const memberIds = new Set(result.map((r) => r.id));
    const elevatedRows = await this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { notIn: [...memberIds] },
        userRoles: { some: { role: { name: { in: ['SUPER_ADMIN', 'SUPER_USER'] } } } },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    for (const u of elevatedRows) {
      result.push({ ...u, roleInWorkspace: 'ELEVATED' });
    }

    return result;
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

  /** Returns the active-task impact of removing a workspace member (read-only). */
  async getMemberRemovalImpact(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      select: { userId: true, user: { select: { fullName: true } } },
    });
    if (!member) throw new NotFoundException('Workspace member not found');

    const ACTIVE_STATUSES = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED'];
    const activeTasks = await this.prisma.task.findMany({
      where: {
        workspaceId,
        assigneeId: member.userId,
        status: { in: ACTIVE_STATUSES },
        isReference: false,
      },
      select: { id: true, title: true, status: true },
      take: 20,
    });

    return {
      memberId,
      userId: member.userId,
      userFullName: member.user.fullName,
      activeTaskCount: activeTasks.length,
      activeTasks,
    };
  }

  /**
   * Remove a workspace member.
   * If the member has active assigned tasks, `taskHandling` is required.
   * Supported values:
   *   'leave-unassigned'  — remove member and unassign their active tasks
   */
  async removeMember(
    workspaceId: string,
    memberId: string,
    actor: Record<string, unknown>,
    taskHandling?: 'leave-unassigned',
  ) {
    const ws = await this.ensureWorkspaceExists(workspaceId);
    await this.assertCanManageMembers(ws, actor);

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Workspace member not found');

    const ACTIVE_STATUSES = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED'];
    const activeTaskCount = await this.prisma.task.count({
      where: { workspaceId, assigneeId: member.userId, status: { in: ACTIVE_STATUSES }, isReference: false },
    });

    if (activeTaskCount > 0 && !taskHandling) {
      throw new BadRequestException(
        `This member has ${activeTaskCount} active assigned task(s). ` +
        `Provide taskHandling=leave-unassigned to proceed, or reassign tasks first.`,
      );
    }

    if (taskHandling === 'leave-unassigned' && activeTaskCount > 0) {
      await this.prisma.$transaction([
        this.prisma.task.updateMany({
          where: { workspaceId, assigneeId: member.userId, status: { in: ACTIVE_STATUSES } },
          data: { assigneeId: null },
        }),
        this.prisma.workspaceMember.delete({ where: { id: memberId } }),
      ]);
    } else {
      await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    }

    void this.auditLog.log({
      actorId: actor.id as string,
      action: 'MEMBER_REMOVED',
      entityType: 'PROJECT',
      entityId: workspaceId,
      previousValue: { userId: member.userId },
      newValue: {
        taskHandling: taskHandling ?? 'none',
        activeTasksAffected: taskHandling === 'leave-unassigned' ? activeTaskCount : 0,
      },
    });

    this.realtime.emitToWorkspace(workspaceId, 'workspace.member.removed', {
      workspaceId, memberId, userId: member.userId,
    });
    this.realtime.emitToUser(member.userId, 'workspace.access.removed', { workspaceId });

    return { success: true, activeTasksUnassigned: taskHandling === 'leave-unassigned' ? activeTaskCount : 0 };
  }

  /**
   * Read-only data-integrity audit for a workspace.
   * Returns actionable findings without modifying any data.
   * Part 25: Unit 59.2
   */
  async getIntegrity(workspaceId: string, actorRoles: string[]) {
    const ADMIN_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];
    if (!actorRoles.some((r) => ADMIN_ROLES.includes(r))) {
      throw new ForbiddenException('Data integrity audit requires SUPER_ADMIN, IT_ADMIN, or SUPER_USER role');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, departmentId: true, status: true },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    const findings: { severity: 'ERROR' | 'WARNING'; code: string; message: string; detail?: string }[] = [];

    // 1. Workspace department not assigned
    if (!ws.departmentId) {
      findings.push({ severity: 'WARNING', code: 'WS_NO_DEPARTMENT', message: 'Workspace has no department assigned.', detail: `Workspace: ${ws.name}` });
    }

    // 2. Tasks assigned to inactive users
    const tasksWithInactiveAssignee = await this.prisma.task.findMany({
      where: { workspaceId, assigneeId: { not: null }, assignee: { isActive: false } },
      select: { id: true, title: true, assignee: { select: { id: true, fullName: true } } },
    });
    for (const t of tasksWithInactiveAssignee) {
      findings.push({ severity: 'ERROR', code: 'TASK_INACTIVE_ASSIGNEE', message: `Task assigned to inactive user.`, detail: `Task: "${t.title}" — Assignee: ${t.assignee?.fullName ?? '(unknown)'}` });
    }

    // 3. Tasks assigned to users who are not workspace members (and not elevated)
    const tasksWithAssignee = await this.prisma.task.findMany({
      where: { workspaceId, assigneeId: { not: null } },
      select: { id: true, title: true, assigneeId: true, assignee: { select: { id: true, fullName: true } } },
    });
    const memberUserIds = new Set(
      (await this.prisma.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } })).map((m) => m.userId),
    );
    for (const t of tasksWithAssignee) {
      if (t.assigneeId && !memberUserIds.has(t.assigneeId)) {
        findings.push({ severity: 'WARNING', code: 'TASK_ASSIGNEE_NOT_MEMBER', message: `Task assigned to user who is not a workspace member.`, detail: `Task: "${t.title}" — Assignee: ${t.assignee?.fullName ?? t.assigneeId}` });
      }
    }

    // 4. Inactive workspace members with active assigned tasks
    const inactiveMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, user: { isActive: false } },
      select: { userId: true, user: { select: { fullName: true } } },
    });
    for (const m of inactiveMembers) {
      const activeTaskCount = await this.prisma.task.count({
        where: { workspaceId, assigneeId: m.userId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      });
      if (activeTaskCount > 0) {
        findings.push({ severity: 'WARNING', code: 'INACTIVE_MEMBER_ACTIVE_TASKS', message: `Inactive workspace member has active assigned tasks.`, detail: `User: ${m.user.fullName} — ${activeTaskCount} active task(s)` });
      }
    }

    // 5. Duplicate workspace member records (should not exist due to @@unique constraint, but verify)
    const memberCounts = await this.prisma.workspaceMember.groupBy({
      by: ['workspaceId', 'userId'],
      where: { workspaceId },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });
    if (memberCounts.length > 0) {
      findings.push({ severity: 'ERROR', code: 'DUPLICATE_MEMBER', message: `Duplicate workspace member records detected.`, detail: `${memberCounts.length} duplicate(s)` });
    }

    // 6. Workspace member records referencing non-existent users
    const orphanedMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, user: { id: undefined } },
      select: { id: true, userId: true },
    });
    if (orphanedMembers.length > 0) {
      findings.push({ severity: 'ERROR', code: 'ORPHANED_MEMBER', message: `Workspace member references a user that does not exist.`, detail: `Member IDs: ${orphanedMembers.map((m) => m.id).join(', ')}` });
    }

    return {
      workspaceId: ws.id,
      workspaceName: ws.name,
      auditedAt: new Date().toISOString(),
      findingCount: findings.length,
      findings,
    };
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
