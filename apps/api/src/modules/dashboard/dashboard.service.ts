import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'] as const;

type AccessTier = 'ELEVATED' | 'DEPT_MANAGER' | 'DEPT_USER' | 'AUDITOR' | 'STAFF';

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
    const taskWhere     = this.buildTaskWhere(tier, actorId, actorDeptId);
    const docWhere      = this.buildDocWhere(tier, actorId, actorDeptId);
    const ncrWhere      = this.buildNcrWhere(tier, actorId, actorDeptId);
    const checklistWhere = this.buildChecklistWhere(tier, actorId, actorDeptId);

    const overdueTaskWhere = {
      ...taskWhere,
      parentTaskId: null as null | undefined,
      dueDate: { lt: now },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    // My personal task assignments, workspace-access-scoped
    const myAssignmentWhere = {
      assigneeId: actorId,
      parentTaskId: null as null | undefined,
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

    // ─── Pending reviews ──────────────────────────────────────────────────────
    const pendingReviews = [
      ...(pendingDocReviews as Array<{ id: string; title: string; updatedAt: Date; department: { name: string } | null; createdBy: { fullName: string } }>).map((d) => ({
        type:        'DOCUMENT' as const,
        id:          d.id,
        title:       d.title,
        submittedAt: d.updatedAt.toISOString(),
        submittedBy: d.createdBy.fullName,
        department:  d.department?.name ?? null,
      })),
      ...(pendingEvidenceReviews as Array<{ id: string; createdAt: Date; submittedBy: { fullName: string }; checklistItem: { title: string; department: { name: string } | null } }>).map((e) => ({
        type:        'EVIDENCE' as const,
        id:          e.id,
        title:       e.checklistItem.title,
        submittedAt: e.createdAt.toISOString(),
        submittedBy: e.submittedBy.fullName,
        department:  e.checklistItem.department?.name ?? null,
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
      // Fields for frontend socket room joining and workspace awareness
      accessibleWorkspaceIds: (accessibleWorkspaces as Array<{ id: string }>).map((w) => w.id),
      myWorkspacesCount:      accessibleWorkspaces.length,
      lastUpdated:            now.toISOString(),
    };
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
}
