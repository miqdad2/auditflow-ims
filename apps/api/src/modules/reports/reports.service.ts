import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  computeWorkspaceOperationalStatus,
  endOfDayKuwait,
  type WorkspaceOperationalStatus,
  type WorkspaceStatusReason,
} from '../workspaces/workspace-status.helper';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'] as const;

type AccessTier = 'ELEVATED' | 'DEPT_MANAGER' | 'DEPT_USER' | 'STAFF';

function getTier(roles: string[]): AccessTier {
  if (roles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r))) return 'ELEVATED';
  if (roles.includes('DEPARTMENT_MANAGER')) return 'DEPT_MANAGER';
  if (roles.includes('DEPARTMENT_USER'))    return 'DEPT_USER';
  return 'STAFF';
}

export interface ReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
  departmentId: string | null;
  workspaceId: string | null;
}

export interface DeptStatus {
  departmentId: string;
  departmentName: string;
  code: string;
  activeWorkspaces: number;
  openTasks: number;
  overdueTasks: number;
  docsUnderReview: number;
  openIssues: number;
  expiringFiles: number;
  expiredFiles: number;
  lastActivity: string | null;
  status: 'healthy' | 'needs_attention' | 'critical';
}

export interface WsStatus {
  id: string;
  name: string;
  department: string | null;
  departmentId: string | null;
  openTasks: number;
  inProgressTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  waitingReviewTasks: number;
  totalDocs: number;
  docsUnderReview: number;
  openIssues: number;
  overdueIssues: number;
  issuesWaitingVerification: number;
  expiringFiles: number;
  expiredFiles: number;
  memberCount: number;
  lastActivity: string | null;
  operationalStatus: WorkspaceOperationalStatus;
  operationalStatusLabel: string;
  operationalReasons: WorkspaceStatusReason[];
}

export interface OverdueTask {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  department: string | null;
  assignee: string | null;
  assigneeId: string | null;
  dueDate: string;
  priority: string;
  status: string;
}

export interface DocAttention {
  id: string;
  type: 'DOCUMENT' | 'TASK_FILE';
  title: string;
  workspaceName: string | null;
  workspaceId: string | null;
  relatedTaskId: string | null;
  relatedTaskWorkspaceId: string | null;
  responsible: string | null;
  status: string;
  expiryDate: string | null;
}

export interface IssueRow {
  id: string;
  ncrNumber: string | null;
  title: string;
  workspaceName: string | null;
  department: string | null;
  priority: string;
  assignee: string | null;
  dueDate: string | null;
  status: string;
}

export interface ReportActivity {
  id: string;
  actorName: string;
  action: string;
  summary: string;
  entityType: string;
  createdAt: string;
}

export interface ReportOverview {
  summary: {
    activeWorkspaces: number;
    openTasks: number;
    overdueTasks: number;
    completedInPeriod: number;
    docsTotal: number;
    docsUnderReview: number;
    openIssues: number;
    overdueIssues: number;
    expiredFiles: number;
    expiringSoonFiles: number;
    status: 'healthy' | 'needs_attention' | 'critical';
  };
  departmentStatus: DeptStatus[];
  workspaceStatus: WsStatus[];
  overdueTasks: OverdueTask[];
  documentsRequiringAttention: DocAttention[];
  issuesSummary: {
    open: number;
    inProgress: number;
    submitted: number;
    verified: number;
    closed: number;
    overdue: number;
    total: number;
  };
  issueRows: IssueRow[];
  recentActivity: ReportActivity[];
  generatedAt: string;
  filtersApplied: ReportFilters;
}

type GroupRow = { workspaceId: string | null; _count: { id: number } };

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
    filters: ReportFilters,
  ): Promise<ReportOverview> {
    const tier  = getTier(actorRoles);
    const now   = new Date();
    const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo   = filters.dateTo   ? new Date(filters.dateTo)   : now;

    const wsWhere       = this.wsWhere(tier, actorId, actorDeptId, filters);
    const taskBaseWhere = this.taskWhere(tier, actorId, actorDeptId, filters);
    const docBaseWhere  = this.docWhere(tier, actorId, actorDeptId, filters);
    const ncrBaseWhere  = this.ncrWhere(tier, actorId, actorDeptId, filters);

    // isReference: false — reference items are excluded from all operational task KPIs
    // approvalStatus: 'APPROVED' — Unit 63.1: PENDING member tasks excluded from reports
    const overdueTaskWhere  = { ...taskBaseWhere, parentTaskId: null as null, isReference: false, approvalStatus: 'APPROVED', dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } };
    const openTaskWhere     = { ...taskBaseWhere, parentTaskId: null as null, isReference: false, approvalStatus: 'APPROVED', status: { notIn: ['COMPLETED', 'CANCELLED'] } };
    const doneInPeriodWhere = { ...taskBaseWhere, parentTaskId: null as null, isReference: false, approvalStatus: 'APPROVED', status: 'COMPLETED', completedAt: { gte: dateFrom, lte: dateTo } };
    const openNcrWhere      = { ...ncrBaseWhere, status: { in: ['OPEN', 'IN_PROGRESS', 'OVERDUE'] } };

    // ── Main parallel batch ──────────────────────────────────────────────────
    const [
      activeWsCount,
      openTasksCount,
      overdueTasksCount,
      completedInPeriod,
      docsByStatus,
      openIssuesCount,
      overdueIssuesCount,
      issuesByStatus,
      expiredDocsCount,
      expiringSoonDocsCount,
      expiredFilesCount,
      expiringSoonFilesCount,
      overdueTaskRows,
      docsUnderReviewList,
      expiredFileList,
      expiringSoonFileList,
      issueRowsRaw,
      activityRaw,
      wsListRaw,
    ] = await Promise.all([
      this.prisma.workspace.count({ where: { ...wsWhere, status: 'ACTIVE' } }),
      this.prisma.task.count({ where: openTaskWhere }),
      this.prisma.task.count({ where: overdueTaskWhere }),
      this.prisma.task.count({ where: doneInPeriodWhere }),
      this.prisma.document.groupBy({ by: ['status'], where: docBaseWhere, _count: { id: true } }),
      this.prisma.ncrCapa.count({ where: { ...ncrBaseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.ncrCapa.count({ where: { ...ncrBaseWhere, status: 'OVERDUE' } }),
      this.prisma.ncrCapa.groupBy({ by: ['status'], where: ncrBaseWhere, _count: { id: true } }),
      this.prisma.document.count({ where: { ...docBaseWhere, status: 'APPROVED', expiryDate: { lt: now } } }),
      this.prisma.document.count({ where: { ...docBaseWhere, status: 'APPROVED', expiryDate: { gte: now, lte: in30 } } }),
      tier === 'ELEVATED'
        ? this.prisma.fileAttachment.count({ where: { entityType: 'TASK', isSuperseded: false, expiryDate: { lt: now } } })
        : Promise.resolve(0),
      tier === 'ELEVATED'
        ? this.prisma.fileAttachment.count({ where: { entityType: 'TASK', isSuperseded: false, expiryDate: { gte: now, lte: in30 } } })
        : Promise.resolve(0),
      // Overdue task rows (detail list, up to 50)
      this.prisma.task.findMany({
        where: overdueTaskWhere,
        orderBy: { dueDate: 'asc' },
        take: 50,
        select: {
          id: true, title: true, workspaceId: true, priority: true, status: true, dueDate: true, assigneeId: true,
          workspace: { select: { id: true, name: true, department: { select: { name: true } } } },
          assignee: { select: { fullName: true } },
        },
      }),
      // Documents under review (attention section, up to 30)
      this.prisma.document.findMany({
        where: { ...docBaseWhere, status: 'UNDER_REVIEW' },
        orderBy: { updatedAt: 'asc' },
        take: 30,
        select: {
          id: true, title: true, workspaceId: true, expiryDate: true,
          workspace: { select: { name: true } },
          owner: { select: { fullName: true } },
        },
      }),
      // Expired task file attachment list (top 20 for attention section)
      tier === 'ELEVATED'
        ? this.prisma.fileAttachment.findMany({
            where: { entityType: 'TASK', isSuperseded: false, expiryDate: { lt: now } },
            take: 20, orderBy: { expiryDate: 'asc' },
            select: { id: true, originalFileName: true, displayName: true, entityId: true, expiryDate: true },
          })
        : Promise.resolve([]),
      // Expiring soon task file attachment list (top 20 for attention section)
      tier === 'ELEVATED'
        ? this.prisma.fileAttachment.findMany({
            where: { entityType: 'TASK', isSuperseded: false, expiryDate: { gte: now, lte: in30 } },
            take: 20, orderBy: { expiryDate: 'asc' },
            select: { id: true, originalFileName: true, displayName: true, entityId: true, expiryDate: true },
          })
        : Promise.resolve([]),
      // Issue rows (open/in_progress/overdue, top 30)
      this.prisma.ncrCapa.findMany({
        where: openNcrWhere,
        orderBy: [{ dueDate: 'asc' }],
        take: 30,
        select: {
          id: true, ncrNumber: true, title: true, severity: true, status: true, dueDate: true,
          workspace: { select: { name: true } },
          department: { select: { name: true } },
          assignedTo: { select: { fullName: true } },
        },
      }),
      // Recent activity in the date range
      this.prisma.activityEvent.findMany({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(tier !== 'ELEVATED' ? { actorId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true, entityType: true, action: true, summary: true, createdAt: true,
          actor: { select: { fullName: true } },
        },
      }),
      // Accessible workspace list for status table
      this.prisma.workspace.findMany({
        where: { ...wsWhere, status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        take: 100,
        select: {
          id: true, name: true, status: true, updatedAt: true, departmentId: true,
          _count: { select: { members: true } },
          department: { select: { name: true } },
        },
      }),
    ]);

    // ── Shape summaries ──────────────────────────────────────────────────────
    const docStatusMap = Object.fromEntries(
      (docsByStatus as Array<{ status: string; _count: { id: number } }>).map((g) => [g.status, g._count.id]),
    );
    const docsTotal           = Object.values(docStatusMap).reduce((s, v) => s + v, 0);
    const docsUnderReviewCount = docStatusMap['UNDER_REVIEW'] ?? 0;

    const issueStatusMap = Object.fromEntries(
      (issuesByStatus as Array<{ status: string; _count: { id: number } }>).map((g) => [g.status, g._count.id]),
    );
    const issuesSummary = {
      open:       issueStatusMap['OPEN']        ?? 0,
      inProgress: issueStatusMap['IN_PROGRESS'] ?? 0,
      submitted:  issueStatusMap['SUBMITTED']   ?? 0,
      verified:   issueStatusMap['VERIFIED']    ?? 0,
      closed:     issueStatusMap['CLOSED']      ?? 0,
      overdue:    issueStatusMap['OVERDUE']     ?? 0,
      total:      Object.values(issueStatusMap).reduce((s, v) => s + v, 0),
    };

    const isCritical  = overdueTasksCount > 0 || overdueIssuesCount > 0 || (expiredFilesCount as number) > 0 || expiredDocsCount > 0;
    const isAttention = docsUnderReviewCount > 0 || openIssuesCount > 0 || (expiringSoonFilesCount as number) > 0 || expiringSoonDocsCount > 0;
    const overallStatus: 'healthy' | 'needs_attention' | 'critical' =
      isCritical ? 'critical' : isAttention ? 'needs_attention' : 'healthy';

    // ── Shape overdue task list ──────────────────────────────────────────────
    const overdueTaskList: OverdueTask[] = (overdueTaskRows as Array<{
      id: string; title: string; workspaceId: string; priority: string; status: string; dueDate: Date | null;
      assigneeId: string | null;
      workspace: { id: string; name: string; department: { name: string } | null } | null;
      assignee: { fullName: string } | null;
    }>).map((t) => ({
      id: t.id,
      title: t.title,
      workspaceId: t.workspaceId,
      workspaceName: t.workspace?.name ?? 'Unknown',
      department: t.workspace?.department?.name ?? null,
      assignee: t.assignee?.fullName ?? null,
      assigneeId: t.assigneeId,
      dueDate: t.dueDate?.toISOString() ?? '',
      priority: t.priority,
      status: t.status,
    }));

    // ── Shape issue row list ─────────────────────────────────────────────────
    const issueRowList: IssueRow[] = (issueRowsRaw as unknown as Array<{
      id: string; ncrNumber: string | null; title: string; severity: string; status: string; dueDate: Date | null;
      workspace: { name: string } | null;
      department: { name: string } | null;
      assignedTo: { fullName: string } | null;
    }>).map((r) => ({
      id: r.id,
      ncrNumber: r.ncrNumber,
      title: r.title,
      workspaceName: r.workspace?.name ?? null,
      department: r.department?.name ?? null,
      priority: r.severity,
      assignee: r.assignedTo?.fullName ?? null,
      dueDate: r.dueDate?.toISOString() ?? null,
      status: r.status,
    }));

    // ── Shape recent activity ────────────────────────────────────────────────
    const EXCLUDED_TYPES = new Set(['CHECKLIST_ITEM', 'EVIDENCE', 'CHECKLIST', 'PAGE']);
    const activityList: ReportActivity[] = (activityRaw as Array<{
      id: string; entityType: string; action: string; summary: string; createdAt: Date;
      actor: { fullName: string };
    }>)
      .filter((a) => !EXCLUDED_TYPES.has(a.entityType))
      .map((a) => ({
        id: a.id,
        actorName: a.actor.fullName,
        action: a.action,
        summary: a.summary,
        entityType: a.entityType,
        createdAt: a.createdAt.toISOString(),
      }));

    // ── Workspace status: second parallel batch ──────────────────────────────
    const wsList = wsListRaw as Array<{
      id: string; name: string; status: string; updatedAt: Date; departmentId: string | null;
      _count: { members: number };
      department: { name: string } | null;
    }>;
    const wsIds = wsList.map((w) => w.id);

    // Per-workspace expiry counts (indexed by workspaceId)
    const wsExpiredMap:      Record<string, number> = {};
    const wsExpiringSoonMap: Record<string, number> = {};
    // Task → workspace map (used for DocAttention action links)
    const taskIdToWsId: Record<string, string> = {};

    let wsStatusRows: WsStatus[] = [];

    if (wsIds.length > 0) {
      const eod = endOfDayKuwait(now);

      // ── Workspace status rows: Round 1 ──────────────────────────────────────
      const [wsDocRev, wsTotalDoc, wsTaskDetail, wsNcrDetail, wsDeptActive, wsExpiredAtt, wsExpiringSoonAtt] = await Promise.all([
        this.prisma.document.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: wsIds }, status: 'UNDER_REVIEW' }, _count: { id: true } }),
        this.prisma.document.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: wsIds } }, _count: { id: true } }),
        // Task detail rows for the operational status engine (non-reference parent tasks, APPROVED only — Unit 63.1)
        this.prisma.task.findMany({
          where: { workspaceId: { in: wsIds }, isReference: false, parentTaskId: null, approvalStatus: 'APPROVED' },
          select: { id: true, workspaceId: true, status: true, priority: true, assigneeId: true, dueDate: true },
        }),
        // NCR detail rows (non-terminal)
        this.prisma.ncrCapa.findMany({
          where: { workspaceId: { in: wsIds }, status: { notIn: ['VERIFIED', 'CLOSED'] } },
          select: { workspaceId: true, status: true, dueDate: true },
        }),
        // Department active status
        (() => {
          const deptIds = [...new Set(wsList.map((w) => w.departmentId).filter(Boolean))] as string[];
          return deptIds.length > 0
            ? this.prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, isActive: true } })
            : Promise.resolve([] as Array<{ id: string; isActive: boolean }>);
        })(),
        // All expired task file attachments (not limited — needed for per-ws counts)
        this.prisma.fileAttachment.findMany({
          where: { entityType: 'TASK', isSuperseded: false, expiryDate: { not: null, lt: eod } },
          select: { entityId: true, expiryDate: true, reminderDays: true },
        }),
        // All expiring-soon task file attachments
        this.prisma.fileAttachment.findMany({
          where: { entityType: 'TASK', isSuperseded: false, expiryDate: { gte: eod } },
          select: { entityId: true, expiryDate: true, reminderDays: true },
        }),
      ]);

      const revMap      = Object.fromEntries((wsDocRev   as GroupRow[]).filter((g) => g.workspaceId).map((g) => [g.workspaceId!, g._count.id]));
      const totalDocMap = Object.fromEntries((wsTotalDoc as GroupRow[]).filter((g) => g.workspaceId).map((g) => [g.workspaceId!, g._count.id]));

      // Build task detail map
      type WsTaskRow = { id: string; workspaceId: string; status: string; priority: string; assigneeId: string | null; dueDate: Date | null };
      const tasksByWs = new Map<string, WsTaskRow[]>();
      for (const t of wsTaskDetail as WsTaskRow[]) {
        if (!t.workspaceId) continue;
        const arr = tasksByWs.get(t.workspaceId) ?? [];
        arr.push(t);
        tasksByWs.set(t.workspaceId, arr);
      }

      // NCR map
      type WsNcrRow = { workspaceId: string | null; status: string; dueDate: Date | null };
      const ncrsByWs = new Map<string, WsNcrRow[]>();
      for (const n of wsNcrDetail as WsNcrRow[]) {
        if (!n.workspaceId) continue;
        const arr = ncrsByWs.get(n.workspaceId) ?? [];
        arr.push(n);
        ncrsByWs.set(n.workspaceId, arr);
      }

      // Department active map
      const deptActiveMap = new Map<string, boolean>();
      for (const d of wsDeptActive) deptActiveMap.set(d.id, d.isActive);

      // Build task → workspace map and expiry maps
      type AttRow = { entityId: string; expiryDate: Date | null; reminderDays: number | null };
      const allFileTaskIds = [...new Set([
        ...(wsExpiredAtt as AttRow[]).map((f) => f.entityId),
        ...(wsExpiringSoonAtt as AttRow[]).map((f) => f.entityId),
        ...(expiredFileList as Array<{ entityId: string }>).map((f) => f.entityId),
        ...(expiringSoonFileList as Array<{ entityId: string }>).map((f) => f.entityId),
      ])];

      if (allFileTaskIds.length > 0) {
        const taskWsRows = await this.prisma.task.findMany({
          where: { id: { in: allFileTaskIds }, workspaceId: { in: wsIds } },
          select: { id: true, workspaceId: true },
        });
        for (const t of taskWsRows as Array<{ id: string; workspaceId: string }>) {
          taskIdToWsId[t.id] = t.workspaceId;
        }
      }

      // Build per-workspace file expiry maps using per-file reminderDays
      type FileWithExpiry = { entityId: string; expiryDate: Date | null; reminderDays: number | null };
      for (const f of wsExpiredAtt as FileWithExpiry[]) {
        const wsId = taskIdToWsId[f.entityId];
        if (wsId) wsExpiredMap[wsId] = (wsExpiredMap[wsId] ?? 0) + 1;
      }
      for (const f of wsExpiringSoonAtt as FileWithExpiry[]) {
        const wsId = taskIdToWsId[f.entityId];
        if (!wsId || !f.expiryDate) continue;
        const reminderMs = (f.reminderDays ?? 14) * 24 * 60 * 60 * 1000;
        if (new Date(f.expiryDate).getTime() - eod.getTime() <= reminderMs) {
          wsExpiringSoonMap[wsId] = (wsExpiringSoonMap[wsId] ?? 0) + 1;
        }
      }

      // Build workspace status rows using central engine
      wsStatusRows = wsList.map((ws) => {
        const wsTasks  = tasksByWs.get(ws.id) ?? [];
        const wsNcrs   = ncrsByWs.get(ws.id) ?? [];

        const activeTasks  = wsTasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));
        const inProgressTasks      = activeTasks.filter((t) => t.status === 'IN_PROGRESS').length;
        const unassignedTasks      = activeTasks.filter((t) => !t.assigneeId).length;
        const waitingReviewTasks   = activeTasks.filter((t) => t.status === 'WAITING_REVIEW').length;
        const returnedTasks        = activeTasks.filter((t) => t.status === 'REJECTED').length;
        const completedNonRefTasks = wsTasks.filter((t) => t.status === 'COMPLETED').length;
        const overdueCriticalHighTasks = wsTasks.filter((t) =>
          !['COMPLETED', 'CANCELLED'].includes(t.status) &&
          t.dueDate !== null && new Date(t.dueDate) < eod &&
          ['CRITICAL', 'HIGH'].includes(t.priority),
        ).length;
        const overdueMediumLowTasks = wsTasks.filter((t) =>
          !['COMPLETED', 'CANCELLED'].includes(t.status) &&
          t.dueDate !== null && new Date(t.dueDate) < eod &&
          ['LOW', 'MEDIUM'].includes(t.priority),
        ).length;

        const overdueIssues             = wsNcrs.filter((n) =>
          n.status === 'OVERDUE' || (n.dueDate !== null && new Date(n.dueDate) < eod),
        ).length;
        const openIssues                = wsNcrs.length;
        const issuesWaitingVerification = wsNcrs.filter((n) => n.status === 'SUBMITTED').length;
        const docsRev   = revMap[ws.id]      ?? 0;
        const totalDocs = totalDocMap[ws.id] ?? 0;
        const expiredFiles  = wsExpiredMap[ws.id]      ?? 0;
        const expiringFiles = wsExpiringSoonMap[ws.id] ?? 0;

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
          documentsUnderReview:       docsRev,
          overdueIssues,
          openIssues,
          issuesWaitingVerification,
          expiredFiles,
          expiringFiles,
          pendingApprovalTasks: 0, // pre-filtered to APPROVED above
        });

        return {
          id: ws.id, name: ws.name, department: ws.department?.name ?? null, departmentId: ws.departmentId,
          openTasks:                  opResult.metrics.openTasks,
          inProgressTasks:            opResult.metrics.inProgressTasks,
          unassignedTasks:            opResult.metrics.unassignedTasks,
          overdueTasks:               opResult.metrics.overdueTasks,
          waitingReviewTasks:         opResult.metrics.waitingReviewTasks,
          totalDocs, docsUnderReview: docsRev,
          openIssues:                 opResult.metrics.openIssues,
          overdueIssues:              opResult.metrics.overdueIssues,
          issuesWaitingVerification:  opResult.metrics.issuesWaitingVerification,
          expiringFiles, expiredFiles,
          memberCount:                ws._count.members,
          lastActivity:               ws.updatedAt.toISOString(),
          operationalStatus:          opResult.status,
          operationalStatusLabel:     opResult.label,
          operationalReasons:         opResult.reasons,
        };
      });
    }

    // ── Documents requiring attention (built after workspace batch so we have taskIdToWsId) ─
    type FileAttRow = { id: string; originalFileName: string; displayName: string | null; entityId: string; expiryDate: Date | null };
    const docsAttention: DocAttention[] = [
      ...(docsUnderReviewList as Array<{
        id: string; title: string; workspaceId: string | null; expiryDate: Date | null;
        workspace: { name: string } | null;
        owner: { fullName: string };
      }>).map((d) => ({
        id: d.id,
        type: 'DOCUMENT' as const,
        title: d.title,
        workspaceName: d.workspace?.name ?? null,
        workspaceId: d.workspaceId,
        relatedTaskId: null,
        relatedTaskWorkspaceId: null,
        responsible: d.owner.fullName,
        status: 'UNDER_REVIEW',
        expiryDate: d.expiryDate?.toISOString() ?? null,
      })),
      ...(expiredFileList as FileAttRow[]).map((f) => ({
        id: f.id,
        type: 'TASK_FILE' as const,
        title: f.displayName ?? f.originalFileName,
        workspaceName: null,
        workspaceId: null,
        relatedTaskId: f.entityId,
        relatedTaskWorkspaceId: taskIdToWsId[f.entityId] ?? null,
        responsible: null,
        status: 'EXPIRED',
        expiryDate: f.expiryDate?.toISOString() ?? null,
      })),
      ...(expiringSoonFileList as FileAttRow[]).map((f) => ({
        id: f.id,
        type: 'TASK_FILE' as const,
        title: f.displayName ?? f.originalFileName,
        workspaceName: null,
        workspaceId: null,
        relatedTaskId: f.entityId,
        relatedTaskWorkspaceId: taskIdToWsId[f.entityId] ?? null,
        responsible: null,
        status: 'EXPIRING_SOON',
        expiryDate: f.expiryDate?.toISOString() ?? null,
      })),
    ].slice(0, 50);

    // ── Department status rows (elevated only) ───────────────────────────────
    let departmentStatusRows: DeptStatus[] = [];
    if (tier === 'ELEVATED') {
      const deptWhere = filters.departmentId ? { id: filters.departmentId, isActive: true } : { isActive: true };
      const depts = await this.prisma.department.findMany({
        where: deptWhere,
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      });
      const deptIds = depts.map((d) => d.id);

      if (deptIds.length > 0) {
        const deptWsFilter = filters.workspaceId
          ? { id: filters.workspaceId, status: 'ACTIVE', departmentId: { in: deptIds } }
          : { status: 'ACTIVE', departmentId: { in: deptIds } };
        const allDeptWs = await this.prisma.workspace.findMany({
          where: deptWsFilter,
          select: { id: true, departmentId: true, updatedAt: true },
        });

        const wsByDept = new Map<string, string[]>();
        for (const ws of allDeptWs) {
          if (!ws.departmentId) continue;
          if (!wsByDept.has(ws.departmentId)) wsByDept.set(ws.departmentId, []);
          wsByDept.get(ws.departmentId)!.push(ws.id);
        }
        const allDeptWsIds = allDeptWs.map((w) => w.id);

        if (allDeptWsIds.length > 0) {
          const [dOpenT, dOvdT, dDocRev, dIssue] = await Promise.all([
            this.prisma.task.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: allDeptWsIds }, isReference: false, approvalStatus: 'APPROVED', status: { notIn: ['COMPLETED', 'CANCELLED'] }, parentTaskId: null }, _count: { id: true } }),
            this.prisma.task.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: allDeptWsIds }, isReference: false, approvalStatus: 'APPROVED', dueDate: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] }, parentTaskId: null }, _count: { id: true } }),
            this.prisma.document.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: allDeptWsIds }, status: 'UNDER_REVIEW' }, _count: { id: true } }),
            this.prisma.ncrCapa.groupBy({ by: ['workspaceId'], where: { workspaceId: { in: allDeptWsIds }, status: { in: ['OPEN', 'IN_PROGRESS', 'OVERDUE'] } }, _count: { id: true } }),
          ]);

          const dOpenMap   = Object.fromEntries((dOpenT  as GroupRow[]).map((g) => [g.workspaceId ?? '', g._count.id]));
          const dOvdMap    = Object.fromEntries((dOvdT   as GroupRow[]).map((g) => [g.workspaceId ?? '', g._count.id]));
          const dDocRevMap = Object.fromEntries((dDocRev as GroupRow[]).filter((g) => g.workspaceId).map((g) => [g.workspaceId!, g._count.id]));
          const dIssueMap  = Object.fromEntries((dIssue  as GroupRow[]).filter((g) => g.workspaceId).map((g) => [g.workspaceId!, g._count.id]));
          const wsUpdMap   = new Map(allDeptWs.map((w) => [w.id, w.updatedAt]));

          departmentStatusRows = depts.map((dept) => {
            const dWsIds = wsByDept.get(dept.id) ?? [];
            let open = 0, ovd = 0, rev = 0, iss = 0;
            // Aggregate real expiry counts from workspace expiry maps
            let dExpired = 0, dExpiringSoon = 0;
            let latest: Date | null = null;

            for (const wid of dWsIds) {
              open += dOpenMap[wid]   ?? 0;
              ovd  += dOvdMap[wid]    ?? 0;
              rev  += dDocRevMap[wid] ?? 0;
              iss  += dIssueMap[wid]  ?? 0;
              // Use workspace expiry maps built in the workspace section
              dExpired      += wsExpiredMap[wid]      ?? 0;
              dExpiringSoon += wsExpiringSoonMap[wid] ?? 0;
              const u = wsUpdMap.get(wid);
              if (u && (!latest || u > latest)) latest = u;
            }

            // Status based only on real calculated data — no placeholder zeros
            const st: DeptStatus['status'] =
              (ovd > 0 || iss > 1 || dExpired > 0) ? 'critical' :
              (iss > 0 || rev > 0 || open > 0 || dExpiringSoon > 0) ? 'needs_attention' : 'healthy';

            return {
              departmentId: dept.id, departmentName: dept.name, code: dept.code,
              activeWorkspaces: dWsIds.length,
              openTasks: open, overdueTasks: ovd, docsUnderReview: rev, openIssues: iss,
              expiringFiles: dExpiringSoon, expiredFiles: dExpired,
              lastActivity: latest?.toISOString() ?? null,
              status: st,
            };
          });
        } else {
          departmentStatusRows = depts.map((dept) => ({
            departmentId: dept.id, departmentName: dept.name, code: dept.code,
            activeWorkspaces: 0, openTasks: 0, overdueTasks: 0, docsUnderReview: 0,
            openIssues: 0, expiringFiles: 0, expiredFiles: 0,
            lastActivity: null, status: 'healthy' as const,
          }));
        }
      }
    }

    return {
      summary: {
        activeWorkspaces: activeWsCount,
        openTasks: openTasksCount,
        overdueTasks: overdueTasksCount,
        completedInPeriod,
        docsTotal,
        docsUnderReview: docsUnderReviewCount,
        openIssues: openIssuesCount,
        overdueIssues: overdueIssuesCount,
        expiredFiles: expiredFilesCount as number,
        expiringSoonFiles: expiringSoonFilesCount as number,
        status: overallStatus,
      },
      departmentStatus: departmentStatusRows,
      workspaceStatus: wsStatusRows,
      overdueTasks: overdueTaskList,
      documentsRequiringAttention: docsAttention,
      issuesSummary,
      issueRows: issueRowList,
      recentActivity: activityList,
      generatedAt: now.toISOString(),
      filtersApplied: filters,
    };
  }

  // ── Where clause builders ─────────────────────────────────────────────────

  private wsWhere(tier: AccessTier, actorId: string, deptId: string | null, f: ReportFilters): Record<string, unknown> {
    const extra: Record<string, unknown> = {};
    if (f.workspaceId)  extra['id'] = f.workspaceId;
    if (f.departmentId) extra['departmentId'] = f.departmentId;
    if (tier === 'ELEVATED') return extra;
    if ((tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId) {
      return { ...extra, OR: [{ members: { some: { userId: actorId } } }, { visibility: 'DEPARTMENT', departmentId: deptId }] };
    }
    return { ...extra, members: { some: { userId: actorId } } };
  }

  private taskWhere(tier: AccessTier, actorId: string, deptId: string | null, f: ReportFilters): Record<string, unknown> {
    const extra: Record<string, unknown> = {};
    if (f.workspaceId)                    extra['workspaceId'] = f.workspaceId;
    if (f.departmentId && !f.workspaceId) extra['workspace'] = { departmentId: f.departmentId };
    if (tier === 'ELEVATED') return extra;
    const memberCond = { workspace: { members: { some: { userId: actorId } } } };
    const accessOr = (tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId
      ? { OR: [memberCond, { workspace: { visibility: 'DEPARTMENT', departmentId: deptId } }] }
      : memberCond;
    if (tier === 'DEPT_MANAGER' && deptId) {
      return { AND: [{ OR: [{ assigneeId: actorId }, { createdById: actorId }, { taskList: { departmentId: deptId } }] }, accessOr, extra] };
    }
    if (tier === 'DEPT_USER' && deptId) {
      return { AND: [{ OR: [{ assigneeId: actorId }, { taskList: { departmentId: deptId } }] }, accessOr, extra] };
    }
    return { AND: [{ assigneeId: actorId }, accessOr, extra] };
  }

  private docWhere(tier: AccessTier, actorId: string, deptId: string | null, f: ReportFilters): Record<string, unknown> {
    const extra: Record<string, unknown> = {};
    if (f.workspaceId)                    extra['workspaceId'] = f.workspaceId;
    if (f.departmentId && !f.workspaceId) extra['departmentId'] = f.departmentId;
    if (tier === 'ELEVATED') return extra;
    const nullCond   = { workspaceId: null };
    const memberCond = { workspace: { members: { some: { userId: actorId } } } };
    const accessOr = (tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId
      ? { OR: [nullCond, memberCond, { workspace: { visibility: 'DEPARTMENT', departmentId: deptId } }] }
      : { OR: [nullCond, memberCond] };
    return { AND: [accessOr, extra] };
  }

  private ncrWhere(tier: AccessTier, actorId: string, deptId: string | null, f: ReportFilters): Record<string, unknown> {
    const extra: Record<string, unknown> = {};
    if (f.workspaceId)                    extra['workspaceId'] = f.workspaceId;
    if (f.departmentId && !f.workspaceId) extra['departmentId'] = f.departmentId;
    if (tier === 'ELEVATED') return extra;
    const nullCond   = { workspaceId: null };
    const memberCond = { workspace: { members: { some: { userId: actorId } } } };
    const accessOr = (tier === 'DEPT_MANAGER' || tier === 'DEPT_USER') && deptId
      ? { OR: [nullCond, memberCond, { workspace: { visibility: 'DEPARTMENT', departmentId: deptId } }] }
      : { OR: [nullCond, memberCond] };
    if (tier === 'DEPT_MANAGER' && deptId) {
      return { AND: [{ OR: [{ raisedById: actorId }, { assignedToId: actorId }, { departmentId: deptId }] }, accessOr, extra] };
    }
    if (tier === 'DEPT_USER' && deptId) {
      return { AND: [{ OR: [{ raisedById: actorId }, { assignedToId: actorId }, { departmentId: deptId }] }, accessOr, extra] };
    }
    return { AND: [{ OR: [{ raisedById: actorId }, { assignedToId: actorId }] }, accessOr, extra] };
  }
}
