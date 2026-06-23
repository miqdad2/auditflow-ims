export interface DeptReadiness {
  departmentId: string;
  departmentName: string;
  total: number;
  approved: number;
  submitted: number;
  rejected: number;
  missing: number;
  readinessPercent: number;
}

export interface TaskSummary {
  total: number;
  myAssigned: number;
  overdue: number;
  completed: number;
  waitingReview: number;
  inProgress: number;
  todo: number;
  byStatus: Record<string, number>;
}

export interface DocumentSummary {
  total: number;
  draft: number;
  underReview: number;
  approved: number;
  rejected: number;
  archived: number;
  expiringSoon: number;
  expired: number;
}

export interface EvidenceSummary {
  totalItems: number;
  missing: number;
  submitted: number;
  approved: number;
  rejected: number;
  readinessPercent: number;
}

export interface NcrCapaSummary {
  total: number;
  open: number;
  inProgress: number;
  waitingEvidence: number;
  submitted: number;
  verified: number;
  closed: number;
  rejected: number;
  overdue: number;
}

export interface OverdueSummary {
  overdueTasks: number;
  overdueNcrCapa: number;
  expiredDocuments: number;
  total: number;
}

export interface ActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  createdAt: string;
  actor: { id: string; fullName: string };
}

export interface AssignedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  workspace: { id: string; name: string } | null;
  taskList: { id: string; name: string } | null;
}

export interface PendingReview {
  type: 'DOCUMENT';
  id: string;
  title: string;
  submittedAt: string;
  submittedBy: string | null;
  department: string | null;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  entityType: string | null;
  entityId: string | null;
}

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

export interface DashboardOverview {
  overallAuditReadinessPercent: number;
  checklistReadinessPercent: number;
  departmentReadiness: DeptReadiness[];
  taskSummary: TaskSummary;
  documentSummary: DocumentSummary;
  evidenceSummary: EvidenceSummary;
  ncrCapaSummary: NcrCapaSummary;
  overdueSummary: OverdueSummary;
  recentActivity: ActivityItem[];
  myAssignments: AssignedTask[];
  pendingReviews: PendingReview[];
  notificationSummary: {
    unread: number;
    recent: NotificationItem[];
  };
  /** Task file expiry counts (only populated for elevated/Super User roles) */
  taskFileSummary?: { expiringSoon: number; expired: number };
  /** Workspace socket room IDs */
  accessibleWorkspaceIds: string[];
  myWorkspacesCount: number;
  activeWorkspaceCount?: number;
  /** Workspace status rows for business control center (elevated only) */
  workspaceStatusRows?: WorkspaceStatusRow[];
  lastUpdated: string;
}

/** Expiring task file returned by GET /file-attachments/expiring */
export interface ExpiringTaskFile {
  id: string;
  originalFileName: string;
  displayName: string | null;
  expiryDate: string;
  issueDate: string | null;
  reminderDays: number | null;
  notes: string | null;
  isSuperseded: boolean;
  createdAt: string;
  uploadedBy: { id: string; fullName: string };
  entityId: string;
  task?: { id: string; title: string; assigneeId: string | null; workspaceId: string; workspace: { id: string; name: string } };
  daysUntilExpiry?: number;
}
