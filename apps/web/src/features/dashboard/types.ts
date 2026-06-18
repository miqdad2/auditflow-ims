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
  type: 'DOCUMENT' | 'EVIDENCE';
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
  /** Workspace IDs the user has access to — used for socket room joining */
  accessibleWorkspaceIds: string[];
  /** Number of workspaces accessible to this user */
  myWorkspacesCount: number;
  /** ISO timestamp of when this response was generated */
  lastUpdated: string;
}
