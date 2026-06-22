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

export interface WorkspaceOpMetrics {
  openTasks: number;
  inProgressTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  waitingReviewTasks: number;
  returnedTasks: number;
  documentsUnderReview: number;
  openIssues: number;
  overdueIssues: number;
  issuesWaitingVerification: number;
  expiredFiles: number;
  expiringFiles: number;
  operationalMembers: number;
}

export interface WorkspaceOwner {
  id: string;
  fullName: string;
}

export interface TaskListDept {
  id: string;
  name: string;
}

export interface TaskListSummary {
  id: string;
  workspaceId: string;
  departmentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  department: TaskListDept | null;
  _count: { tasks: number };
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  visibility: string;
  ownerId: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  owner: WorkspaceOwner;
  createdAt: string;
  updatedAt: string;
  _count: { taskLists: number; tasks: number; members: number };
  operationalStatus: WorkspaceOperationalStatus;
  operationalStatusLabel: string;
  operationalReasons: WorkspaceStatusReason[];
  metrics: WorkspaceOpMetrics;
  summary: {
    readinessPercent: number;
    tasks: {
      completed: number;
      open: number;
      overdue: number;
    };
    documents: {
      approved: number;
      underReview: number;
    };
    checklist: {
      total: number;
      approved: number;
      submitted: number;
      rejected: number;
      missing: number;
    };
    ncrCapa: {
      open: number;
      overdue: number;
    };
  };
}

export interface WorkspaceDetail extends Omit<WorkspaceSummary, '_count'> {
  taskLists: TaskListSummary[];
  _count?: { members?: number };
  /** The calling user's role in this workspace, or null if not a member */
  myRole: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER' | null;
  /** 'elevated' for ISO_MANAGER/QHSE_USER/admins, otherwise same as myRole */
  myAccess: string | null;
}

export interface WorkspacePinnedItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
}

export interface WorkspaceOverviewData {
  readiness: {
    total: number;
    approved: number;
    submitted: number;
    rejected: number;
    missing: number;
    percent: number;
  };
  work: { open: number; overdue: number; completed: number };
  documents: { total: number; approved: number; underReview: number; rejected: number };
  evidence: { total: number; pending: number; approved: number; rejected: number };
  ncrCapa: { open: number; overdue: number; closed: number };
  members: number;
  myWork: { openTasks: number; overdueTasks: number };
  memberPreview: Array<{ id: string; roleInWorkspace: string; user: { id: string; fullName: string } }>;
  recentActivity: WorkspaceActivityEntry[];
  homePage: { id: string; title: string } | null;
  pinnedItems: WorkspacePinnedItem[];
}

export interface WorkspaceActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityTitle: string | null;
  actorId: string | null;
  actor: { id: string; fullName: string } | null;
  newValue: Record<string, unknown> | null;
  previousValue: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskUser {
  id: string;
  fullName: string;
  email?: string;
}

export interface TaskSummary {
  id: string;
  workspaceId: string;
  taskListId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  isReference: boolean;
  assigneeId: string | null;
  assignee: TaskUser | null;
  createdById: string;
  createdBy: TaskUser;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  taskList: { id: string; name: string };
  _count: { subtasks: number; comments: number };
  recurrenceInterval: string;
  recurrenceEndDate: string | null;
  recurrenceSeriesId: string | null;
  recurrenceParentId: string | null;
}

export interface TaskDetail extends TaskSummary {
  subtasks: TaskSummary[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string };
}

export interface ActivityEventMetadata {
  previousStatus?: string;
  newStatus?: string;
  reason?: string | null;
  source?: string;
  isOverride?: boolean;
  spawnedBySystem?: boolean;
  sourceTaskId?: string;
  nextDueDate?: string;
}

export interface ActivityEvent {
  id: string;
  entityType: string;
  entityId: string;
  actorId: string;
  action: string;
  summary: string;
  metadata?: ActivityEventMetadata | null;
  createdAt: string;
  actor: { id: string; fullName: string };
}

export interface LinkedRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  targetTitle: string;
  createdById: string;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
}
