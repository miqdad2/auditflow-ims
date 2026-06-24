import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  computeWorkspaceOperationalStatus,
  endOfDayKuwait,
  type WorkspaceOperationalStatus,
  type WorkspaceStatusReason,
} from '../workspaces/workspace-status.helper';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'] as const;

type AccessTier = 'ELEVATED' | 'DEPT_MANAGER' | 'DEPT_USER' | 'AUDITOR' | 'STAFF';

export interface WorkspaceStatusRow {
  id: string;
  name: string;
  department: string | null;
  memberCount: number;
  openTasks: number;
  inProgressTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  waitingReviewTasks: number;
  pendingApprovalTasks: number;
  docsUnderReview: number;
  openIssues: number;
  overdueIssues: number;
  issuesWaitingVerification: number;
  expiringFiles: number;
  expiredFiles: number;
  lastActivity: string | null;
  operationalStatus: WorkspaceOperationalStatus;
  operationalStatusLabel: string;
  operationalReasons: WorkspaceStatusReason[];
}

function getAccessTier(roles: string[]): AccessTier {
  if (roles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r))) return 'ELEVATED';
  if (roles.includes('DEPARTMENT_MANAGER')) return 'DEPT_MANAGER';
  if (roles.includes('DEPARTMENT_USER'))    return 'DEPT_USER';
  if (roles.includes('AUDITOR_VIEWER'))     return 'AUDITOR';
  return 'STAFF';
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(actorId: string, actorRoles: string[], actorDeptId: string | null) {
    const tier = getAccessTier(actorRoles);
    const now  = new Date();
    const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ─── Where clauses scoped by access tier ──────────────────────────────────
    // isReference: false — exclude reference-only items from all operational task KPIs
    // approvalStatus: 'APPROVED' — exclude MEMBER pending tasks from all KPIs (Unit 63.1)
    const taskWhere = { ...this.buildTaskWhere(tier, actorId, actorDeptId), isReference: false, approvalStatus: 'APPROVED' };
    const docWhere      = this.buildDocWhere(tier, actorId, actorDeptId);
    const ncrWhere      = this.buildNcrWhere(tier, actorId, actorDeptId);
    const checklistWhere = this.buildChecklistWhere(tier, actorId, actorDeptId);

    const overdueTaskWhere = {
      ...taskWhere,
      parentTaskId:   null as null | undefined,
      isReference:    false,
      approvalStatus: 'APPROVED', // Unit 63.1 — pending tasks not operational
      dueDate: { lt: now },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    // My personal task assignments, workspace-access-scoped
    const myAssignmentWhere = {
      assigneeId:     actorId,
      parentTaskId:   null as null | undefined,
      isReference:    false,
      approvalStatus: 'APPROVED', // Unit 63.1 — pending tasks not in work queue (creator sees them, not other members)
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      ...(tier !== 'ELEVATED' ? this.taskWsVis(tier, actorId, actorDeptId) : {}),
    };

    // ─── Run all queries in parallel ──────────────────────────────────────────
    const [
      taskByStatus,
      myTasksCount,
      overdueTasksCount,
      docByStatus,
      expiringSoon,
      expired,
      checklistByStatus,
      ncrByStatus,
      deptChecklistItems,
      recentActivity,
      myAssignments,
      pendingDocReviews,
      pendingEvidenceReviews,
      unreadCount,
      recentNotifications,
      taskFileExpiringSoon,
      taskFileExpired,
      accessibleWorkspaces,
    ] = await Promise.all([
      // Task counts by status (role-scoped)
      this.prisma.task.groupBy({
        by: ['status'],
        where: { ...taskWhere, parentTaskId: null },
        _count: { id: true },
      }),

      // My assigned tasks total
      this.prisma.task.count({
        where: { assigneeId: actorId, parentTaskId: null },
      }),

      // Overdue tasks (role-scoped)
      this.prisma.task.count({ where: overdueTaskWhere }),

      // Documents by status (role-scoped)
      this.prisma.document.groupBy({
        by: ['status'],
        where: docWhere,
        _count: { id: true },
      }),

      // Approved docs expiring within 30 days
      this.prisma.document.count({
        where: { ...docWhere, status: 'APPROVED', expiryDate: { gte: now, lte: in30 } },
      }),

      // Expired approved docs
      this.prisma.document.count({
        where: { ...docWhere, status: 'APPROVED', expiryDate: { lt: now } },
      }),

      // Checklist items by evidence status (role-scoped)
      this.prisma.auditChecklistItem.groupBy({
        by: ['status'],
        where: checklistWhere,
        _count: { id: true },
      }),

      // NCR/CAPA by status (role-scoped)
      this.prisma.ncrCapa.groupBy({
        by: ['status'],
        where: ncrWhere,
        _count: { id: true },
      }),

      // Department-level checklist items for readiness calculation (elevated and dept roles only)
      tier === 'AUDITOR' || tier === 'STAFF'
        ? Promise.resolve([])
        : this.prisma.auditChecklistItem.findMany({
            where: tier === 'ELEVATED'
              ? { departmentId: { not: null } }
              : actorDeptId
                ? { departmentId: actorDeptId }
                : { id: 'NEVER_MATCHES' },
            select: { departmentId: true, status: true },
          }),

      // Recent activity — show own events for non-elevated users
      this.prisma.activityEvent.findMany({
        where: tier === 'ELEVATED' ? {} : { actorId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          summary: true,
          createdAt: true,
          actor: { select: { id: true, fullName: true } },
        },
      }),

      // My open task assignments (workspace-access-scoped)
      this.prisma.task.findMany({
        where: myAssignmentWhere,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          workspace: { select: { id: true, name: true } },
          taskList:  { select: { id: true, name: true } },
        },
      }),

      // Pending document reviews (UNDER_REVIEW) — managers and elevated only
      tier === 'ELEVATED' || tier === 'DEPT_MANAGER'
        ? this.prisma.document.findMany({
            where: {
              ...(tier === 'DEPT_MANAGER' && actorDeptId ? { departmentId: actorDeptId } : {}),
              status: 'UNDER_REVIEW',
            },
            orderBy: { updatedAt: 'asc' },
            take: 5,
            select: {
              id: true,
              title: true,
              updatedAt: true,
              department: { select: { name: true } },
              createdBy:  { select: { fullName: true } },
            },
          })
        : Promise.resolve([]),

      // Pending evidence reviews (SUBMITTED) — managers and elevated only
      tier === 'ELEVATED' || tier === 'DEPT_MANAGER'
        ? this.prisma.checklistEvidence.findMany({
            where: {
              status: 'SUBMITTED',
              ...(tier === 'DEPT_MANAGER' && actorDeptId
                ? { checklistItem: { departmentId: actorDeptId } }
                : {}),
            },
            orderBy: { createdAt: 'asc' },
            take: 5,
            select: {
              id: true,
              createdAt: true,
              submittedBy: { select: { fullName: true } },
              checklistItem: {
                select: {
                  title: true,
                  department: { select: { name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),

      // Unread notifications for this user only
      this.prisma.notification.count({
        where: { recipientId: actorId, readAt: null },
      }),

      // Recent notifications for this user only
      this.prisma.notification.findMany({
        where: { recipientId: actorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          category: true,
          title: true,
          message: true,
          readAt: true,
          createdAt: true,
          entityType: true,
          entityId: true,
        },
      }),

      // Task file attachments expiring soon (within 30 days, active, not superseded)
      // For elevated users: all; for others: return 0 (section hidden in UI)
      tier === 'ELEVATED'
        ? this.prisma.fileAttachment.count({
            where: { entityType: 'TASK', isSuperseded: false, expiryDate: { gte: now, lte: in30 } },
          }).catch(() => 0)
        : Promise.resolve(0),

      // Task file attachments already expired (not superseded)
      tier === 'ELEVATED'
        ? this.prisma.fileAttachment.count({
            where: { entityType: 'TASK', isSuperseded: false, expiryDate: { lt: now } },
          }).catch(() => 0)
        : Promise.resolve(0),

      // Accessible workspace IDs for frontend socket room joining
      this.prisma.workspace.findMany({
        where: tier === 'ELEVATED'
          ? { status: 'ACTIVE' }
          : (tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && actorDeptId
            ? {
                status: 'ACTIVE',
                OR: [
                  { members: { some: { userId: actorId } } },
                  { visibility: 'DEPARTMENT', departmentId: actorDeptId },
                ],
              }
            : { status: 'ACTIVE', members: { some: { userId: actorId } } },
        select: { id: true },
        take: 100,
      }),
    ]);

    // ─── Shape task summary ────────────────────────────────────────────────────
    const taskStatusMap = Object.fromEntries(
      taskByStatus.map((g) => [g.status, g._count.id]),
    );
    const taskTotal = Object.values(taskStatusMap).reduce((s, v) => s + v, 0);
    const taskSummary = {
      total:         taskTotal,
      myAssigned:    myTasksCount,
      overdue:       overdueTasksCount,
      completed:     taskStatusMap['COMPLETED'] ?? 0,
      waitingReview: taskStatusMap['WAITING_REVIEW'] ?? 0,
      inProgress:    taskStatusMap['IN_PROGRESS'] ?? 0,
      todo:          taskStatusMap['TODO'] ?? 0,
      byStatus:      taskStatusMap,
    };

    // ─── Shape document summary ────────────────────────────────────────────────
    const docStatusMap = Object.fromEntries(
      docByStatus.map((g) => [g.status, g._count.id]),
    );
    const docTotal = Object.values(docStatusMap).reduce((s, v) => s + v, 0);
    const documentSummary = {
      total:       docTotal,
      draft:       docStatusMap['DRAFT'] ?? 0,
      underReview: docStatusMap['UNDER_REVIEW'] ?? 0,
      approved:    docStatusMap['APPROVED'] ?? 0,
      rejected:    docStatusMap['REJECTED'] ?? 0,
      archived:    docStatusMap['ARCHIVED'] ?? 0,
      expiringSoon,
      expired,
    };

    // ─── Shape evidence/checklist summary ─────────────────────────────────────
    const ciStatusMap = Object.fromEntries(
      checklistByStatus.map((g) => [g.status, g._count.id]),
    );
    const ciTotal    = Object.values(ciStatusMap).reduce((s, v) => s + v, 0);
    const ciApproved = ciStatusMap['APPROVED'] ?? 0;
    const evidenceSummary = {
      totalItems:       ciTotal,
      missing:          ciStatusMap['MISSING'] ?? 0,
      submitted:        ciStatusMap['SUBMITTED'] ?? 0,
      approved:         ciApproved,
      rejected:         ciStatusMap['REJECTED'] ?? 0,
      readinessPercent: ciTotal > 0 ? Math.round((ciApproved / ciTotal) * 100) : 0,
    };

    // ─── Shape NCR/CAPA summary ───────────────────────────────────────────────
    const ncrStatusMap = Object.fromEntries(
      ncrByStatus.map((g) => [g.status, g._count.id]),
    );
    const ncrTotal = Object.values(ncrStatusMap).reduce((s, v) => s + v, 0);
    const ncrCapaSummary = {
      total:           ncrTotal,
      open:            ncrStatusMap['OPEN'] ?? 0,
      inProgress:      ncrStatusMap['IN_PROGRESS'] ?? 0,
      waitingEvidence: ncrStatusMap['WAITING_EVIDENCE'] ?? 0,
      submitted:       ncrStatusMap['SUBMITTED'] ?? 0,
      verified:        ncrStatusMap['VERIFIED'] ?? 0,
      closed:          ncrStatusMap['CLOSED'] ?? 0,
      rejected:        ncrStatusMap['REJECTED'] ?? 0,
      overdue:         ncrStatusMap['OVERDUE'] ?? 0,
    };

    // ─── Workspace status rows (elevated only, run after main queries) ────────
    const workspaceStatusRows: WorkspaceStatusRow[] = tier === 'ELEVATED'
      ? await this.getWorkspaceStatusRows(now)
      : [];

    // ─── Shape department readiness ───────────────────────────────────────────
    const deptReadinessMap = new Map<string, {
      id: string; total: number; approved: number; submitted: number; rejected: number; missing: number;
    }>();

    for (const item of (deptChecklistItems as Array<{ departmentId: string | null; status: string }>)) {
      if (!item.departmentId) continue;
      if (!deptReadinessMap.has(item.departmentId)) {
        deptReadinessMap.set(item.departmentId, { id: item.departmentId, total: 0, approved: 0, submitted: 0, rejected: 0, missing: 0 });
      }
      const entry = deptReadinessMap.get(item.departmentId)!;
      entry.total++;
      if (item.status === 'APPROVED')  entry.approved++;
      if (item.status === 'SUBMITTED') entry.submitted++;
      if (item.status === 'REJECTED')  entry.rejected++;
      if (item.status === 'MISSING')   entry.missing++;
    }

    const deptIds = [...deptReadinessMap.keys()];
    const departments = deptIds.length > 0
      ? await this.prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true },
        })
      : [];
    const deptNameMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    const departmentReadiness = [...deptReadinessMap.values()].map((d) => ({
      departmentId:     d.id,
      departmentName:   deptNameMap[d.id] ?? 'Unknown',
      total:            d.total,
      approved:         d.approved,
      submitted:        d.submitted,
      rejected:         d.rejected,
      missing:          d.missing,
      readinessPercent: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0,
    })).sort((a, b) => b.readinessPercent - a.readinessPercent);

    // ─── Overall audit readiness ──────────────────────────────────────────────
    const checklistReadinessPercent = evidenceSummary.readinessPercent;
    const docApprovalRate = documentSummary.total > 0
      ? Math.round((documentSummary.approved / documentSummary.total) * 100)
      : 0;
    const ncrResolutionRate = ncrCapaSummary.total > 0
      ? Math.round(((ncrCapaSummary.verified + ncrCapaSummary.closed) / ncrCapaSummary.total) * 100)
      : 100;
    const overallAuditReadinessPercent = Math.round(
      checklistReadinessPercent * 0.5 +
      docApprovalRate * 0.25 +
      ncrResolutionRate * 0.25,
    );

    // ─── Overdue summary ──────────────────────────────────────────────────────
    const overdueSummary = {
      overdueTasks:     overdueTasksCount,
      overdueNcrCapa:   ncrCapaSummary.overdue,
      expiredDocuments: expired,
      total:            overdueTasksCount + ncrCapaSummary.overdue + expired,
    };

    // ─── Pending reviews (Documents only — Evidence removed from active workflow)
    const pendingReviews = [
      ...(pendingDocReviews as Array<{ id: string; title: string; updatedAt: Date; department: { name: string } | null; createdBy: { fullName: string } }>).map((d) => ({
        type:        'DOCUMENT' as const,
        id:          d.id,
        title:       d.title,
        submittedAt: d.updatedAt.toISOString(),
        submittedBy: d.createdBy.fullName,
        department:  d.department?.name ?? null,
      })),
    ].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).slice(0, 8);

    return {
      overallAuditReadinessPercent,
      checklistReadinessPercent,
      departmentReadiness,
      taskSummary,
      documentSummary,
      evidenceSummary,
      ncrCapaSummary,
      overdueSummary,
      recentActivity,
      myAssignments,
      pendingReviews,
      notificationSummary: {
        unread: unreadCount,
        recent: recentNotifications,
      },
      // Task file expiry summary (elevated/Super User only — others get zeros)
      taskFileSummary: {
        expiringSoon: taskFileExpiringSoon as number,
        expired:      taskFileExpired     as number,
      },
      // Fields for frontend socket room joining and workspace awareness
      accessibleWorkspaceIds: (accessibleWorkspaces as Array<{ id: string }>).map((w) => w.id),
      myWorkspacesCount:      accessibleWorkspaces.length,
      activeWorkspaceCount:   accessibleWorkspaces.length,
      workspaceStatusRows,
      lastUpdated:            now.toISOString(),
    };
  }

  /**
   * Personal task scope for the current user.
   * Returns all tasks assigned to the actor, scoped to accessible workspaces.
   * Requires only project.read permission — used by My Tasks page.
   * Part of Unit 60: shared authoritative task scope for Dashboard + My Tasks + My Workspaces.
   */
  async getMyTasks(actorId: string, actorRoles: string[], actorDeptId: string | null) {
    const tier = getAccessTier(actorRoles);
    const now  = new Date();
    const eod  = endOfDayKuwait(now);
    const wsVis = this.taskWsVis(tier, actorId, actorDeptId);

    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId:     actorId,
        parentTaskId:   null,
        approvalStatus: 'APPROVED', // Unit 63.1: pending tasks excluded from My Tasks queue
        ...wsVis,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200, // safe upper bound; personal task lists are small
      select: {
        id:                 true,
        title:              true,
        status:             true,
        priority:           true,
        dueDate:            true,
        updatedAt:          true,
        createdAt:          true,
        isReference:        true,
        recurrenceInterval: true,
        workspace: { select: { id: true, name: true } },
        taskList:  { select: { id: true, name: true } },
      },
    });

    const ACTIVE = new Set(['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED']);
    const operational = tasks.filter((t) => !t.isReference);
    const active      = operational.filter((t) => ACTIVE.has(t.status));

    const summary = {
      open:          active.length,
      inProgress:    active.filter((t) => t.status === 'IN_PROGRESS').length,
      waitingReview: active.filter((t) => t.status === 'WAITING_REVIEW').length,
      returned:      active.filter((t) => t.status === 'REJECTED').length,
      overdue:       active.filter((t) => t.dueDate !== null && new Date(t.dueDate) < eod).length,
      completed:     tasks.filter((t) => t.status === 'COMPLETED').length,
      total:         tasks.length,
    };

    return { summary, tasks };
  }

  // ─── Workspace visibility helpers (Unit 28 rules — no ORGANIZATION bypass) ──

  // Tasks have non-nullable workspaceId
  private taskWsVis(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const memberCond = { workspace: { members: { some: { userId: actorId } } } };
    if ((tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId) {
      return { OR: [memberCond, { workspace: { visibility: 'DEPARTMENT', departmentId: deptId } }] };
    }
    return memberCond;
  }

  // Documents / NCRs have nullable workspaceId — null means no workspace, always visible
  private nullableWsVis(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const memberCond = { workspace: { members: { some: { userId: actorId } } } };
    const nullCond   = { workspaceId: null };
    if ((tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId) {
      return { OR: [nullCond, memberCond, { workspace: { visibility: 'DEPARTMENT', departmentId: deptId } }] };
    }
    return { OR: [nullCond, memberCond] };
  }

  // AuditChecklistItems go through the checklist relation for workspace access
  private checklistWsVis(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const memberCond = { checklist: { workspace: { members: { some: { userId: actorId } } } } };
    const nullCond   = { checklist: { workspaceId: null } };
    if ((tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId) {
      return { OR: [nullCond, memberCond, { checklist: { workspace: { visibility: 'DEPARTMENT', departmentId: deptId } } }] };
    }
    return { OR: [nullCond, memberCond] };
  }

  // ─── Full where clause builders ───────────────────────────────────────────

  private buildTaskWhere(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const wsVis = this.taskWsVis(tier, actorId, deptId);
    if (tier === 'DEPT_MANAGER' && deptId) {
      return { AND: [{ OR: [{ assigneeId: actorId }, { createdById: actorId }, { taskList: { departmentId: deptId } }] }, wsVis] };
    }
    if (tier === 'DEPT_USER' && deptId) {
      return { AND: [{ OR: [{ assigneeId: actorId }, { taskList: { departmentId: deptId } }] }, wsVis] };
    }
    // STAFF, AUDITOR: only own assigned tasks in accessible workspaces
    return { AND: [{ assigneeId: actorId }, wsVis] };
  }

  private buildDocWhere(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const wsVis = this.nullableWsVis(tier, actorId, deptId);
    if (tier === 'AUDITOR') return { AND: [{ status: 'APPROVED' }, wsVis] };
    if (tier === 'DEPT_MANAGER' && deptId) {
      return { AND: [{ OR: [{ ownerId: actorId }, { createdById: actorId }, { departmentId: deptId }] }, wsVis] };
    }
    if (tier === 'DEPT_USER' && deptId) {
      return { AND: [{ OR: [{ ownerId: actorId }, { createdById: actorId }, { departmentId: deptId, status: 'APPROVED' }] }, wsVis] };
    }
    // STAFF: own docs + approved docs from accessible workspaces
    return { AND: [{ OR: [{ ownerId: actorId }, { createdById: actorId }, { status: 'APPROVED' }] }, wsVis] };
  }

  private buildNcrWhere(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const wsVis = this.nullableWsVis(tier, actorId, deptId);
    if (tier === 'AUDITOR') return wsVis;
    if (tier === 'DEPT_MANAGER' && deptId) {
      return { AND: [{ OR: [{ raisedById: actorId }, { assignedToId: actorId }, { departmentId: deptId }] }, wsVis] };
    }
    if (tier === 'DEPT_USER' && deptId) {
      return { AND: [{ OR: [{ raisedById: actorId }, { assignedToId: actorId }, { departmentId: deptId }] }, wsVis] };
    }
    return { AND: [{ OR: [{ raisedById: actorId }, { assignedToId: actorId }] }, wsVis] };
  }

  private buildChecklistWhere(tier: AccessTier, actorId: string, deptId: string | null): Record<string, unknown> {
    if (tier === 'ELEVATED') return {};
    const wsVis = this.checklistWsVis(tier, actorId, deptId);
    if (tier === 'AUDITOR') return wsVis;
    if ((tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId) {
      return { AND: [{ departmentId: deptId }, wsVis] };
    }
    return wsVis;
  }

  private async getWorkspaceStatusRows(now: Date): Promise<WorkspaceStatusRow[]> {
    const eod = endOfDayKuwait(now);

    // ── Round 1: workspace-level batch queries ────────────────────────────────
    const [workspaces, taskDetailRows, docsUnderReviewRows, ncrDetailRows, deptRows] = await Promise.all([
      this.prisma.workspace.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        take: 50,
        select: {
          id: true,
          name: true,
          status: true,
          departmentId: true,
          updatedAt: true,
          _count: { select: { members: true } },
          department: { select: { name: true } },
        },
      }),
      // Task detail rows for operational status engine (non-reference, parent tasks only)
      this.prisma.task.findMany({
        where: { parentTaskId: null },
        select: {
          id: true,
          workspaceId: true,
          status: true,
          priority: true,
          isReference: true,
          assigneeId: true,
          dueDate: true,
          approvalStatus: true, // Unit 63.1 — needed to exclude PENDING from operational counts
        },
      }).then((rows) => rows.filter((_t) => true)), // workspace filtering done below
      this.prisma.document.groupBy({
        by: ['workspaceId'],
        where: { status: 'UNDER_REVIEW', workspaceId: { not: null } },
        _count: { id: true },
      }),
      this.prisma.ncrCapa.findMany({
        where: { status: { notIn: ['VERIFIED', 'CLOSED'] }, workspaceId: { not: null } },
        select: { workspaceId: true, status: true, dueDate: true },
      }),
      // Department active status
      this.prisma.department.findMany({ select: { id: true, isActive: true } }),
    ]);

    const workspaceIds = new Set(workspaces.map((ws) => ws.id));

    // ── Round 2: file attachments ─────────────────────────────────────────────
    const relevantTaskIds = taskDetailRows
      .filter((t) => t.workspaceId !== null && workspaceIds.has(t.workspaceId))
      .map((t) => t.id);

    const fileAttachmentRows = relevantTaskIds.length > 0
      ? await this.prisma.fileAttachment.findMany({
          where: {
            entityType: 'TASK',
            entityId: { in: relevantTaskIds },
            isSuperseded: false,
            expiryDate: { not: null },
          },
          select: { entityId: true, expiryDate: true, reminderDays: true },
        })
      : [];

    // ── Build lookup maps ─────────────────────────────────────────────────────
    type TaskRow = typeof taskDetailRows[number];
    const taskByWs = new Map<string, TaskRow[]>();
    const taskIdToWs = new Map<string, string>();
    for (const t of taskDetailRows) {
      if (!t.workspaceId || !workspaceIds.has(t.workspaceId)) continue;
      const arr = taskByWs.get(t.workspaceId) ?? [];
      arr.push(t);
      taskByWs.set(t.workspaceId, arr);
      taskIdToWs.set(t.id, t.workspaceId);
    }

    type AttRow = typeof fileAttachmentRows[number];
    const filesByWs = new Map<string, AttRow[]>();
    for (const att of fileAttachmentRows) {
      const wsId = taskIdToWs.get(att.entityId);
      if (!wsId) continue;
      const arr = filesByWs.get(wsId) ?? [];
      arr.push(att);
      filesByWs.set(wsId, arr);
    }

    type NcrRow = typeof ncrDetailRows[number];
    const ncrByWs = new Map<string, NcrRow[]>();
    for (const n of ncrDetailRows) {
      if (!n.workspaceId || !workspaceIds.has(n.workspaceId)) continue;
      const arr = ncrByWs.get(n.workspaceId) ?? [];
      arr.push(n);
      ncrByWs.set(n.workspaceId, arr);
    }

    type DocRow = { workspaceId: string | null; _count: { id: number } };
    const docMap = new Map<string, number>();
    for (const d of docsUnderReviewRows as DocRow[]) {
      if (d.workspaceId) docMap.set(d.workspaceId, d._count.id);
    }

    const deptActiveMap = new Map<string, boolean>();
    for (const d of deptRows) deptActiveMap.set(d.id, d.isActive);

    // ── Per-workspace computation ─────────────────────────────────────────────
    return workspaces.map((ws) => {
      const wsTasks   = taskByWs.get(ws.id) ?? [];
      const wsFiles   = filesByWs.get(ws.id) ?? [];
      const wsNcrs    = ncrByWs.get(ws.id) ?? [];

      // Unit 63.1: only APPROVED tasks enter operational counts
      const pendingApprovalTasks = wsTasks.filter((t) => t.approvalStatus === 'PENDING').length;
      const nonRefTasks   = wsTasks.filter((t) => !t.isReference && t.approvalStatus === 'APPROVED');
      const activeTasks   = nonRefTasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));

      const inProgressTasks        = activeTasks.filter((t) => t.status === 'IN_PROGRESS').length;
      const unassignedTasks        = activeTasks.filter((t) => !t.assigneeId).length;
      const waitingReviewTasks     = activeTasks.filter((t) => t.status === 'WAITING_REVIEW').length;
      const returnedTasks          = activeTasks.filter((t) => t.status === 'REJECTED').length;
      const completedNonRefTasks   = nonRefTasks.filter((t) => t.status === 'COMPLETED').length;
      const overdueCriticalHighTasks = nonRefTasks.filter((t) =>
        !['COMPLETED', 'CANCELLED'].includes(t.status) &&
        t.dueDate !== null && new Date(t.dueDate) < eod &&
        ['CRITICAL', 'HIGH'].includes(t.priority),
      ).length;
      const overdueMediumLowTasks  = nonRefTasks.filter((t) =>
        !['COMPLETED', 'CANCELLED'].includes(t.status) &&
        t.dueDate !== null && new Date(t.dueDate) < eod &&
        ['LOW', 'MEDIUM'].includes(t.priority),
      ).length;

      const expiredFiles  = wsFiles.filter((f) => f.expiryDate !== null && new Date(f.expiryDate) < eod).length;
      const expiringFiles = wsFiles.filter((f) => {
        if (!f.expiryDate) return false;
        const expiry = new Date(f.expiryDate);
        if (expiry < eod) return false;
        const reminderMs = (f.reminderDays ?? 14) * 24 * 60 * 60 * 1000;
        return expiry.getTime() - eod.getTime() <= reminderMs;
      }).length;

      const overdueIssues              = wsNcrs.filter((n) =>
        n.status === 'OVERDUE' || (n.dueDate !== null && new Date(n.dueDate) < eod),
      ).length;
      const openIssues                 = wsNcrs.length;
      const issuesWaitingVerification  = wsNcrs.filter((n) => n.status === 'SUBMITTED').length;
      const docsUnderReview            = docMap.get(ws.id) ?? 0;

      const opResult = computeWorkspaceOperationalStatus({
        lifecycleStatus:            ws.status,
        hasDepartment:              !!ws.departmentId,
        departmentIsActive:         ws.departmentId ? (deptActiveMap.get(ws.departmentId) ?? true) : false,
        operationalMembers:         ws._count.members,
        openTasks:                  activeTasks.length,
        inProgressTasks,
        unassignedTasks,
        overdueCriticalHighTasks,
        overdueMediumLowTasks,
        waitingReviewTasks,
        returnedTasks,
        completedTasks:             completedNonRefTasks,
        documentsUnderReview:       docsUnderReview,
        overdueIssues,
        openIssues,
        issuesWaitingVerification,
        expiredFiles,
        expiringFiles,
        pendingApprovalTasks,
      });

      return {
        id:                        ws.id,
        name:                      ws.name,
        department:                ws.department?.name ?? null,
        memberCount:               ws._count.members,
        openTasks:                 opResult.metrics.openTasks,
        inProgressTasks:           opResult.metrics.inProgressTasks,
        unassignedTasks:           opResult.metrics.unassignedTasks,
        overdueTasks:              opResult.metrics.overdueTasks,
        waitingReviewTasks:        opResult.metrics.waitingReviewTasks,
        pendingApprovalTasks,
        docsUnderReview,
        openIssues:                opResult.metrics.openIssues,
        overdueIssues:             opResult.metrics.overdueIssues,
        issuesWaitingVerification: opResult.metrics.issuesWaitingVerification,
        expiringFiles,
        expiredFiles,
        lastActivity:              ws.updatedAt.toISOString(),
        operationalStatus:         opResult.status,
        operationalStatusLabel:    opResult.label,
        operationalReasons:        opResult.reasons,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Executive Dashboard Summary  (Unit 65)
  // Backend-scoped. Requires ELEVATED tier. No cross-workspace leakage.
  // ─────────────────────────────────────────────────────────────────────────────

  async getExecutiveSummary(actorId: string, actorRoles: string[], actorDeptId: string | null) {
    const now  = new Date();
    const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const eod  = endOfDayKuwait(now);

    const [
      activeWorkspaceCount,
      taskCounts,
      overdueTaskCount,
      docCounts,
      expiredDocCount,
      expiringDocCount,
      ncrCounts,
      checklistCounts,
      pendingDocDecisions,
      attentionTasks,
      attentionFiles,
      workspaces,
      recentSignificantActivity,
    ] = await Promise.all([
      this.prisma.workspace.count({ where: { status: 'ACTIVE' } }),

      this.prisma.task.groupBy({
        by: ['status'],
        where: { parentTaskId: null, isReference: false, approvalStatus: 'APPROVED' },
        _count: { id: true },
      }),

      this.prisma.task.count({
        where: {
          parentTaskId: null, isReference: false, approvalStatus: 'APPROVED',
          dueDate: { lt: eod },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),

      this.prisma.document.groupBy({ by: ['status'], where: {}, _count: { id: true } }),

      this.prisma.document.count({ where: { status: 'APPROVED', expiryDate: { lt: now } } }),
      this.prisma.document.count({ where: { status: 'APPROVED', expiryDate: { gte: now, lte: in30 } } }),

      this.prisma.ncrCapa.groupBy({ by: ['status'], where: {}, _count: { id: true } }),
      this.prisma.auditChecklistItem.groupBy({ by: ['status'], where: {}, _count: { id: true } }),

      // Documents pending review (pending decisions)
      this.prisma.document.findMany({
        where: { status: 'UNDER_REVIEW' },
        orderBy: { updatedAt: 'asc' },
        take: 20,
        select: {
          id: true, title: true, updatedAt: true,
          department: { select: { name: true } },
          createdBy:  { select: { id: true, fullName: true } },
          workspace:  { select: { id: true, name: true } },
        },
      }),

      // Critical/high overdue tasks for attention panel
      this.prisma.task.findMany({
        where: {
          parentTaskId: null, isReference: false, approvalStatus: 'APPROVED',
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: eod },
          priority: { in: ['HIGH', 'CRITICAL'] },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 15,
        select: {
          id: true, title: true, status: true, priority: true, dueDate: true,
          assignee:  { select: { id: true, fullName: true } },
          workspace: { select: { id: true, name: true } },
        },
      }),

      // Expired/expiring controlled documents
      this.prisma.document.findMany({
        where: {
          status: 'APPROVED',
          OR: [{ expiryDate: { lt: now } }, { expiryDate: { gte: now, lte: in30 } }],
        },
        orderBy: { expiryDate: 'asc' },
        take: 10,
        select: {
          id: true, title: true, expiryDate: true,
          department: { select: { name: true } },
          owner:      { select: { id: true, fullName: true } },
          workspace:  { select: { id: true, name: true } },
        },
      }),

      // Workspaces for org health table
      this.prisma.workspace.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        take: 50,
        select: {
          id: true, name: true, departmentId: true,
          department: { select: { name: true } },
        },
      }),

      // Recent significant audit log entries
      this.prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'APPROVED', 'REJECTED', 'ARCHIVED',
              'EVIDENCE_APPROVED', 'EVIDENCE_REJECTED',
              'NCR_VERIFIED', 'NCR_CLOSED',
              'REACTIVATED', 'DEACTIVATED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, action: true, entityType: true, entityId: true, createdAt: true,
          actor: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    // ─── KPI aggregation ──────────────────────────────────────────────────────
    const taskMap = Object.fromEntries(taskCounts.map((g) => [g.status, g._count.id]));
    const docMap  = Object.fromEntries(docCounts.map((g)  => [g.status, g._count.id]));
    const ncrMap  = Object.fromEntries(ncrCounts.map((g)  => [g.status, g._count.id]));
    const ciMap   = Object.fromEntries(checklistCounts.map((g) => [g.status, g._count.id]));

    const totalTasks     = Object.values(taskMap).reduce((s, v) => s + v, 0);
    const completedTasks = taskMap['COMPLETED'] ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const ciTotal    = Object.values(ciMap).reduce((s, v) => s + v, 0);
    const ciApproved = ciMap['APPROVED'] ?? 0;
    const evidenceReadiness = ciTotal > 0 ? Math.round((ciApproved / ciTotal) * 100) : 0;

    const docTotal       = Object.values(docMap).reduce((s, v) => s + v, 0);
    const docApproved    = docMap['APPROVED'] ?? 0;
    const docApprovalRate = docTotal > 0 ? Math.round((docApproved / docTotal) * 100) : 0;

    const ncrTotal  = Object.values(ncrMap).reduce((s, v) => s + v, 0);
    const ncrClosed = (ncrMap['VERIFIED'] ?? 0) + (ncrMap['CLOSED'] ?? 0);
    const ncrResolutionRate = ncrTotal > 0 ? Math.round((ncrClosed / ncrTotal) * 100) : 100;

    const complianceHealth = Math.round(
      evidenceReadiness * 0.40 + docApprovalRate * 0.35 + ncrResolutionRate * 0.25,
    );

    const criticalIssues         = (ncrMap['OPEN'] ?? 0) + (ncrMap['OVERDUE'] ?? 0);
    const overdueActions         = overdueTaskCount + (ncrMap['OVERDUE'] ?? 0);
    const pendingDecisionsCount  = pendingDocDecisions.length;
    const expiringFilesCount     = expiredDocCount + expiringDocCount;
    const waitingReview          = taskMap['WAITING_REVIEW'] ?? 0;

    // ─── Attention items ──────────────────────────────────────────────────────
    type AttentionItem = {
      id: string; type: string; title: string; workspace: string | null;
      department: string | null; responsible: string | null;
      severity: string; overdueAge: string | null; action: string;
    };

    const attentionItems: AttentionItem[] = [];

    for (const t of attentionTasks) {
      const daysOverdue = t.dueDate
        ? Math.floor((now.getTime() - new Date(t.dueDate).getTime()) / 86400000)
        : null;
      attentionItems.push({
        id: t.id, type: 'TASK', title: t.title,
        workspace: t.workspace?.name ?? null, department: null,
        responsible: t.assignee?.fullName ?? null,
        severity: t.priority,
        overdueAge: daysOverdue !== null ? `${daysOverdue}d overdue` : null,
        action: 'Review task',
      });
    }

    for (const f of attentionFiles) {
      const daysUntil = f.expiryDate
        ? Math.floor((new Date(f.expiryDate).getTime() - now.getTime()) / 86400000)
        : null;
      attentionItems.push({
        id: f.id, type: 'DOCUMENT', title: f.title,
        workspace: f.workspace?.name ?? null, department: f.department?.name ?? null,
        responsible: f.owner?.fullName ?? null,
        severity: daysUntil !== null && daysUntil < 0 ? 'CRITICAL' : 'HIGH',
        overdueAge: daysUntil !== null
          ? daysUntil < 0 ? `Expired ${Math.abs(daysUntil)}d ago` : `Expires in ${daysUntil}d`
          : null,
        action: 'Review document',
      });
    }

    // ─── Org health per workspace ─────────────────────────────────────────────
    const wsIds = workspaces.map((w) => w.id);

    const [wsTaskGroups, wsNcrGroups, wsOverdueGroups] = wsIds.length > 0
      ? await Promise.all([
          this.prisma.task.groupBy({
            by: ['workspaceId', 'status'],
            where: { workspaceId: { in: wsIds }, parentTaskId: null, isReference: false, approvalStatus: 'APPROVED' },
            _count: { id: true },
          }),
          this.prisma.ncrCapa.groupBy({
            by: ['workspaceId', 'status'],
            where: { workspaceId: { in: wsIds } },
            _count: { id: true },
          }),
          this.prisma.task.groupBy({
            by: ['workspaceId'],
            where: {
              workspaceId: { in: wsIds }, parentTaskId: null, isReference: false, approvalStatus: 'APPROVED',
              dueDate: { lt: eod }, status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            _count: { id: true },
          }),
        ])
      : [[], [], []];

    const wsTaskMap = new Map<string, Record<string, number>>();
    for (const g of wsTaskGroups as Array<{ workspaceId: string; status: string; _count: { id: number } }>) {
      if (!g.workspaceId) continue;
      const e = wsTaskMap.get(g.workspaceId) ?? {};
      e[g.status] = g._count.id;
      wsTaskMap.set(g.workspaceId, e);
    }

    const wsNcrMap = new Map<string, Record<string, number>>();
    for (const g of wsNcrGroups as Array<{ workspaceId: string | null; status: string; _count: { id: number } }>) {
      if (!g.workspaceId) continue;
      const e = wsNcrMap.get(g.workspaceId) ?? {};
      e[g.status] = g._count.id;
      wsNcrMap.set(g.workspaceId, e);
    }

    const wsOverdueMap = new Map<string, number>();
    for (const g of wsOverdueGroups as Array<{ workspaceId: string; _count: { id: number } }>) {
      if (g.workspaceId) wsOverdueMap.set(g.workspaceId, g._count.id);
    }

    function computeHealth(overdue: number, critNcr: number, total: number, completed: number): string {
      if (critNcr > 5 || overdue > 10) return 'CRITICAL';
      if (critNcr > 2 || overdue > 5)  return 'AT_RISK';
      if (critNcr > 0 || overdue > 0)  return 'ATTENTION';
      const rate = total > 0 ? completed / total : 1;
      return rate >= 0.6 ? 'ON_TRACK' : 'ATTENTION';
    }

    const HEALTH_LABEL: Record<string, string> = {
      ON_TRACK: 'On Track', ATTENTION: 'Attention Required',
      AT_RISK: 'At Risk',   CRITICAL: 'Critical',
    };

    const organizationHealth = workspaces.map((ws) => {
      const tasks    = wsTaskMap.get(ws.id) ?? {};
      const ncrs     = wsNcrMap.get(ws.id)  ?? {};
      const overdue  = wsOverdueMap.get(ws.id) ?? 0;
      const total    = Object.values(tasks).reduce((s, v) => s + v, 0);
      const done     = tasks['COMPLETED'] ?? 0;
      const critNcr  = (ncrs['OPEN'] ?? 0) + (ncrs['OVERDUE'] ?? 0);
      const allNcr   = Object.values(ncrs).reduce((s, v) => s + v, 0);
      const prog     = total > 0 ? Math.round((done / total) * 100) : 0;
      const health   = computeHealth(overdue, critNcr, total, done);
      return {
        workspaceId: ws.id, workspaceName: ws.name, department: ws.department?.name ?? null,
        health, healthLabel: HEALTH_LABEL[health], progress: prog,
        openTasks: total - done, overdueTasks: overdue,
        criticalIssues: critNcr, totalIssues: allNcr,
      };
    });

    // ─── Pending decisions ────────────────────────────────────────────────────
    const pendingDecisions = pendingDocDecisions.map((d) => ({
      type: 'DOCUMENT_REVIEW' as const,
      id: d.id, title: d.title,
      department: d.department?.name ?? null,
      workspace: d.workspace?.name ?? null,
      requester: d.createdBy.fullName,
      submittedAt: d.updatedAt.toISOString(),
      priority: 'MEDIUM',
    }));

    // ─── Department performance ───────────────────────────────────────────────
    const deptPerfMap = new Map<string, {
      deptId: string; deptName: string;
      taskTotal: number; taskCompleted: number; taskOverdue: number; issueCount: number;
    }>();

    for (const ws of workspaces) {
      if (!ws.departmentId || !ws.department?.name) continue;
      const d = deptPerfMap.get(ws.departmentId) ?? {
        deptId: ws.departmentId, deptName: ws.department.name,
        taskTotal: 0, taskCompleted: 0, taskOverdue: 0, issueCount: 0,
      };
      const tasks = wsTaskMap.get(ws.id) ?? {};
      const ncrs  = wsNcrMap.get(ws.id)  ?? {};
      d.taskTotal     += Object.values(tasks).reduce((s, v) => s + v, 0);
      d.taskCompleted += tasks['COMPLETED'] ?? 0;
      d.taskOverdue   += wsOverdueMap.get(ws.id) ?? 0;
      d.issueCount    += Object.values(ncrs).reduce((s, v) => s + v, 0);
      deptPerfMap.set(ws.departmentId, d);
    }

    const departmentPerformance = [...deptPerfMap.values()].map((d) => ({
      departmentId:   d.deptId,
      departmentName: d.deptName,
      completionRate: d.taskTotal > 0 ? Math.round((d.taskCompleted / d.taskTotal) * 100) : 0,
      overdueCount:   d.taskOverdue,
      issueCount:     d.issueCount,
    })).sort((a, b) => b.completionRate - a.completionRate);

    // ─── Significant activity ─────────────────────────────────────────────────
    const significantActivity = recentSignificantActivity.map((log) => ({
      id: log.id, action: log.action, entityType: log.entityType,
      entityId: log.entityId ?? null,
      actor: log.actor?.fullName ?? 'System',
      timestamp: log.createdAt.toISOString(),
    }));

    // ─── Weekly trend (only when baseline exists) ─────────────────────────────
    const sevenDaysAgo    = new Date(now.getTime() - 7  * 86400000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

    const [completedThisWeek, completedLastWeek] = await Promise.all([
      this.prisma.task.count({
        where: {
          parentTaskId: null, isReference: false, approvalStatus: 'APPROVED',
          status: 'COMPLETED', updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.task.count({
        where: {
          parentTaskId: null, isReference: false, approvalStatus: 'APPROVED',
          status: 'COMPLETED', updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
    ]);

    const weeklyTrend = completedLastWeek > 0
      ? Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)
      : null;

    return {
      summary: {
        complianceHealth,
        activeWorkspaces:    activeWorkspaceCount,
        criticalIssues,
        overdueActions,
        pendingDecisionsCount,
        expiringFiles:       expiringFilesCount,
        tasksAwaitingReview: waitingReview,
        completionRate,
      },
      attentionItems:       attentionItems.slice(0, 20),
      organizationHealth,
      pendingDecisions,
      trends: {
        completedThisWeek,
        completedLastWeek,
        weeklyTrend,
        evidenceReadiness,
        docApprovalRate,
        ncrResolutionRate,
      },
      departmentPerformance,
      significantActivity,
      generatedAt: now.toISOString(),
    };
  }
}
