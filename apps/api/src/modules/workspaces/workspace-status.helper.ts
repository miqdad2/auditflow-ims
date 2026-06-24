/**
 * Workspace Operational Status Engine — Unit 59
 * Pure calculation function: no database access, no side effects.
 * Used by WorkspacesService (list / detail) and DashboardService (workspace table).
 *
 * Priority order (highest wins):
 *   INACTIVE > SETUP_REQUIRED > CRITICAL > NEEDS_ATTENTION > IN_PROGRESS > HEALTHY
 *
 * Task status workflow is NOT changed here. Workspace status is read-only derived data.
 * Reference-Only tasks are excluded from all operational conditions.
 */

export type WorkspaceOperationalStatus =
  | 'INACTIVE'
  | 'SETUP_REQUIRED'
  | 'CRITICAL'
  | 'NEEDS_ATTENTION'
  | 'IN_PROGRESS'
  | 'HEALTHY';

export const OPERATIONAL_STATUS_LABELS: Record<WorkspaceOperationalStatus, string> = {
  INACTIVE:         'Inactive',
  SETUP_REQUIRED:   'Setup Required',
  CRITICAL:         'Critical',
  NEEDS_ATTENTION:  'Needs Attention',
  IN_PROGRESS:      'In Progress',
  HEALTHY:          'Healthy',
};

export interface WorkspaceStatusReason {
  code: string;
  label: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  count: number;
}

/** Pre-fetched metrics provided by the service layer */
export interface WorkspaceMetrics {
  /** Lifecycle status of the workspace ('ACTIVE' | 'ARCHIVED') */
  lifecycleStatus: string;
  /** Whether the workspace has a department assigned */
  hasDepartment: boolean;
  /** Whether the assigned department is active (only meaningful when hasDepartment=true) */
  departmentIsActive: boolean;
  /** Count of explicit WorkspaceMember records — global Super User access is NOT counted */
  operationalMembers: number;

  // ── Non-reference task metrics ─────────────────────────────────────────────
  /** All active tasks (TODO + IN_PROGRESS + WAITING_REVIEW + REJECTED) excluding reference items */
  openTasks: number;
  /** Tasks currently IN_PROGRESS, excluding reference items */
  inProgressTasks: number;
  /** Active tasks with no assigneeId, excluding reference items */
  unassignedTasks: number;
  /** Overdue CRITICAL or HIGH priority tasks (non-reference) — triggers Critical status */
  overdueCriticalHighTasks: number;
  /** Overdue LOW or MEDIUM priority tasks (non-reference) — triggers Needs Attention */
  overdueMediumLowTasks: number;
  /** WAITING_REVIEW tasks (non-reference) */
  waitingReviewTasks: number;
  /** REJECTED tasks (non-reference) */
  returnedTasks: number;
  /** COMPLETED tasks (non-reference) */
  completedTasks: number;

  // ── Document metrics ───────────────────────────────────────────────────────
  documentsUnderReview: number;

  // ── Issue metrics ──────────────────────────────────────────────────────────
  /** Issues with status OVERDUE or dueDate past end-of-day Kuwait */
  overdueIssues: number;
  /** All non-VERIFIED, non-CLOSED issues */
  openIssues: number;
  /** Issues with status SUBMITTED (awaiting manager verification) */
  issuesWaitingVerification: number;

  // ── File attachment metrics (active non-superseded task files with expiryDate) ──
  /** Files whose expiryDate < end-of-day Kuwait */
  expiredFiles: number;
  /** Files within their configured reminderDays window */
  expiringFiles: number;

  // ── Approval workflow metrics (Unit 63.1) ──────────────────────────────────
  /** MEMBER-created tasks still awaiting reviewer decision — not included in operational counts */
  pendingApprovalTasks: number;
}

/** Computed result of the operational status engine */
export interface WorkspaceStatusResult {
  status: WorkspaceOperationalStatus;
  label: string;
  reasons: WorkspaceStatusReason[];
  metrics: {
    openTasks: number;
    inProgressTasks: number;
    unassignedTasks: number;
    /** Combined overdue task count (critical/high + medium/low) */
    overdueTasks: number;
    waitingReviewTasks: number;
    returnedTasks: number;
    /** COMPLETED non-reference tasks */
    completedTasks: number;
    /** openTasks + completedTasks — excludes reference and cancelled */
    totalTasks: number;
    documentsUnderReview: number;
    openIssues: number;
    overdueIssues: number;
    issuesWaitingVerification: number;
    expiredFiles: number;
    expiringFiles: number;
    operationalMembers: number;
    /** PENDING approval tasks — informational, not part of operational counts */
    pendingApprovalTasks: number;
  };
}

function p(n: number, singular: string, plural?: string): string {
  const word = n === 1 ? singular : (plural ?? singular + 's');
  return `${n} ${word}`;
}

function isAre(n: number): string { return n === 1 ? 'is' : 'are'; }
function requireRequires(n: number): string { return n === 1 ? 'requires' : 'require'; }

/**
 * Build all business-attention reasons from metrics.
 * Used both for NEEDS_ATTENTION status and to annotate higher-priority statuses
 * (SETUP_REQUIRED, CRITICAL) so factual business issues are never silently discarded.
 */
function buildBusinessAttentionReasons(m: WorkspaceMetrics): WorkspaceStatusReason[] {
  const reasons: WorkspaceStatusReason[] = [];

  if (m.unassignedTasks > 0) {
    reasons.push({
      code: 'UNASSIGNED_TASKS',
      label: `${p(m.unassignedTasks, 'task')} ${isAre(m.unassignedTasks)} unassigned`,
      severity: 'WARNING',
      count: m.unassignedTasks,
    });
  }
  if (m.overdueCriticalHighTasks > 0) {
    reasons.push({
      code: 'OVERDUE_HIGH_TASKS',
      label: `${p(m.overdueCriticalHighTasks, 'high-priority task')} overdue`,
      severity: 'ERROR',
      count: m.overdueCriticalHighTasks,
    });
  }
  if (m.overdueMediumLowTasks > 0) {
    reasons.push({
      code: 'OVERDUE_TASKS',
      label: `${p(m.overdueMediumLowTasks, 'task')} overdue`,
      severity: 'WARNING',
      count: m.overdueMediumLowTasks,
    });
  }
  if (m.waitingReviewTasks > 0) {
    reasons.push({
      code: 'WAITING_REVIEW',
      label: `${p(m.waitingReviewTasks, 'task')} ${isAre(m.waitingReviewTasks)} waiting review`,
      severity: 'WARNING',
      count: m.waitingReviewTasks,
    });
  }
  if (m.returnedTasks > 0) {
    reasons.push({
      code: 'RETURNED_TASKS',
      label: `${p(m.returnedTasks, 'task')} ${requireRequires(m.returnedTasks)} correction`,
      severity: 'WARNING',
      count: m.returnedTasks,
    });
  }
  if (m.expiredFiles > 0) {
    reasons.push({
      code: 'EXPIRED_FILES',
      label: `${p(m.expiredFiles, 'file')} expired`,
      severity: 'ERROR',
      count: m.expiredFiles,
    });
  }
  if (m.expiringFiles > 0) {
    reasons.push({
      code: 'EXPIRING_FILES',
      label: `${p(m.expiringFiles, 'file')} ${isAre(m.expiringFiles)} expiring soon`,
      severity: 'WARNING',
      count: m.expiringFiles,
    });
  }
  if (m.documentsUnderReview > 0) {
    reasons.push({
      code: 'DOCS_UNDER_REVIEW',
      label: `${p(m.documentsUnderReview, 'document')} ${isAre(m.documentsUnderReview)} under review`,
      severity: 'INFO',
      count: m.documentsUnderReview,
    });
  }
  if (m.overdueIssues > 0) {
    reasons.push({
      code: 'OVERDUE_ISSUES',
      label: `${p(m.overdueIssues, 'issue')} overdue`,
      severity: 'ERROR',
      count: m.overdueIssues,
    });
  }
  if (m.issuesWaitingVerification > 0) {
    reasons.push({
      code: 'ISSUES_WAITING_VERIFICATION',
      label: `${p(m.issuesWaitingVerification, 'issue')} ${isAre(m.issuesWaitingVerification)} waiting verification`,
      severity: 'WARNING',
      count: m.issuesWaitingVerification,
    });
  }
  // Open issues not already captured by overdue or waiting-verification
  const otherOpenIssues = m.openIssues - m.overdueIssues - m.issuesWaitingVerification;
  if (otherOpenIssues > 0) {
    reasons.push({
      code: 'OPEN_ISSUES',
      label: `${p(otherOpenIssues, 'open issue')} requiring follow-up`,
      severity: 'WARNING',
      count: otherOpenIssues,
    });
  }

  return reasons;
}

/**
 * Compute workspace operational status from pre-fetched metrics.
 * This function is pure: given the same metrics it always returns the same result.
 *
 * The `reasons` array always contains ALL applicable reasons across every tier
 * so the UI can split them by setup/business codes without losing information.
 * The `status` field is still determined by the priority chain:
 *   INACTIVE > SETUP_REQUIRED > CRITICAL > NEEDS_ATTENTION > IN_PROGRESS > HEALTHY
 */
export function computeWorkspaceOperationalStatus(m: WorkspaceMetrics): WorkspaceStatusResult {
  const overdueTasks = m.overdueCriticalHighTasks + m.overdueMediumLowTasks;

  const metrics = {
    openTasks:                  m.openTasks,
    inProgressTasks:            m.inProgressTasks,
    unassignedTasks:            m.unassignedTasks,
    overdueTasks,
    waitingReviewTasks:         m.waitingReviewTasks,
    returnedTasks:              m.returnedTasks,
    completedTasks:             m.completedTasks,
    totalTasks:                 m.openTasks + m.completedTasks,
    documentsUnderReview:       m.documentsUnderReview,
    openIssues:                 m.openIssues,
    overdueIssues:              m.overdueIssues,
    issuesWaitingVerification:  m.issuesWaitingVerification,
    expiredFiles:               m.expiredFiles,
    expiringFiles:              m.expiringFiles,
    operationalMembers:         m.operationalMembers,
    pendingApprovalTasks:       m.pendingApprovalTasks,
  };

  // ── 1. INACTIVE ────────────────────────────────────────────────────────────
  if (m.lifecycleStatus !== 'ACTIVE') {
    return { status: 'INACTIVE', label: 'Inactive', reasons: [], metrics };
  }

  // ── 2. SETUP_REQUIRED ──────────────────────────────────────────────────────
  const setupReasons: WorkspaceStatusReason[] = [];
  if (!m.hasDepartment) {
    setupReasons.push({
      code: 'DEPARTMENT_NOT_ASSIGNED',
      label: 'Department not assigned',
      severity: 'WARNING',
      count: 1,
    });
  } else if (!m.departmentIsActive) {
    setupReasons.push({
      code: 'DEPARTMENT_INACTIVE',
      label: 'Assigned department is inactive',
      severity: 'WARNING',
      count: 1,
    });
  }
  if (m.operationalMembers === 0) {
    setupReasons.push({
      code: 'NO_OPERATIONAL_MEMBERS',
      label: 'No operational members assigned',
      severity: 'WARNING',
      count: 1,
    });
  }
  if (setupReasons.length > 0) {
    // Always include business-attention reasons alongside setup reasons so the UI
    // can surface factual work items even while setup is incomplete.
    const businessReasons = buildBusinessAttentionReasons(m);
    return {
      status: 'SETUP_REQUIRED',
      label: 'Setup Required',
      reasons: [...setupReasons, ...businessReasons],
      metrics,
    };
  }

  // ── 3. CRITICAL ────────────────────────────────────────────────────────────
  // Business attention reasons are a superset of critical reasons here — if any
  // critical condition exists, buildBusinessAttentionReasons() will include it.
  const businessReasons = buildBusinessAttentionReasons(m);
  const criticalReasons = businessReasons.filter((r) =>
    ['EXPIRED_FILES', 'OVERDUE_ISSUES', 'OVERDUE_HIGH_TASKS'].includes(r.code),
  );
  if (criticalReasons.length > 0) {
    return { status: 'CRITICAL', label: 'Critical', reasons: businessReasons, metrics };
  }

  // ── 4. NEEDS_ATTENTION ─────────────────────────────────────────────────────
  if (businessReasons.length > 0) {
    return { status: 'NEEDS_ATTENTION', label: 'Needs Attention', reasons: businessReasons, metrics };
  }

  // ── 5. IN_PROGRESS ─────────────────────────────────────────────────────────
  if (m.inProgressTasks > 0) {
    return {
      status: 'IN_PROGRESS',
      label: 'In Progress',
      reasons: [{
        code: 'TASKS_IN_PROGRESS',
        label: `${p(m.inProgressTasks, 'task')} ${isAre(m.inProgressTasks)} in progress`,
        severity: 'INFO',
        count: m.inProgressTasks,
      }],
      metrics,
    };
  }

  // ── 6. HEALTHY ────────────────────────────────────────────────────────────
  return { status: 'HEALTHY', label: 'Healthy', reasons: [], metrics };
}

/** Kuwait end-of-day (UTC+3, no DST) — used for overdue and expiry calculations */
export function endOfDayKuwait(d: Date): Date {
  const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;
  const shifted = new Date(d.getTime() + KUWAIT_OFFSET_MS);
  shifted.setUTCHours(23, 59, 59, 999);
  return new Date(shifted.getTime() - KUWAIT_OFFSET_MS);
}
