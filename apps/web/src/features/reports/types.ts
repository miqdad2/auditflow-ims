export type WorkspaceOperationalStatus =
  | 'INACTIVE'
  | 'SETUP_REQUIRED'
  | 'CRITICAL'
  | 'NEEDS_ATTENTION'
  | 'IN_PROGRESS'
  | 'HEALTHY';

export interface WorkspaceStatusReason {
  code: string;
  label: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  count: number;
}

export interface ReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
  departmentId: string | null;
  workspaceId: string | null;
}

export interface ReportSummary {
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
  summary: ReportSummary;
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

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'custom';

export interface ReportDepartment {
  id: string;
  name: string;
  code: string;
}

export interface ReportWorkspace {
  id: string;
  name: string;
}

// Priority colours
export const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'var(--state-error)',
  HIGH:     'var(--state-error)',
  MEDIUM:   'var(--state-warning)',
  LOW:      'var(--text-muted)',
};

// Status colours for issues
export const ISSUE_STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  OPEN:        { color: 'var(--state-error)',   bg: 'var(--state-error-soft)',   label: 'Open' },
  IN_PROGRESS: { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)', label: 'In Progress' },
  OVERDUE:     { color: 'var(--state-error)',   bg: 'var(--state-error-soft)',   label: 'Overdue' },
  SUBMITTED:   { color: 'var(--accent-primary)', bg: 'var(--accent-soft)',       label: 'Submitted' },
  VERIFIED:    { color: 'var(--state-success)', bg: 'var(--state-success-soft)', label: 'Verified' },
  CLOSED:      { color: 'var(--text-muted)',    bg: 'var(--bg-muted)',           label: 'Closed' },
};

export const STATUS_CONFIG: Record<WorkspaceOperationalStatus, { label: string; color: string; bg: string }> = {
  HEALTHY:        { label: 'Healthy',        color: 'var(--state-success)', bg: 'var(--state-success-soft)' },
  IN_PROGRESS:    { label: 'In Progress',    color: 'var(--accent-primary)', bg: 'var(--accent-soft)' },
  NEEDS_ATTENTION:{ label: 'Needs Attention', color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
  CRITICAL:       { label: 'Critical',       color: 'var(--state-error)',   bg: 'var(--state-error-soft)' },
  SETUP_REQUIRED: { label: 'Setup Required', color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
  INACTIVE:       { label: 'Inactive',       color: 'var(--text-muted)',    bg: 'var(--bg-muted)' },
};

export function getDateRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'week': {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      return { from: fmt(mon), to: today };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: today };
    }
    case 'quarter': {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { from: fmt(qStart), to: today };
    }
    default: return { from: fmt(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)), to: today };
  }
}

export function daysBetween(from: string, to: string): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export function overdueByDays(dueDate: string): number {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
}
