// Part 1 — Confirmed task statuses (from architecture.md + schema + dashboard.service.ts):
// TODO | IN_PROGRESS | WAITING_REVIEW | COMPLETED | REJECTED | CANCELLED
// WAITING_REVIEW is a real status. Tasks in WAITING_REVIEW are still included
// in overdue/unassigned detection (only COMPLETED/CANCELLED are excluded).

// Part 1 — Confirmed NcrCapa/Issue statuses (from ncr-capa.service.ts):
// OPEN | IN_PROGRESS | WAITING_EVIDENCE | SUBMITTED | VERIFIED | CLOSED | REJECTED | OVERDUE

export type DetectionRule =
  | 'OVERDUE_TASK'
  | 'UNASSIGNED_TASK'
  | 'DOCUMENT_UNDER_REVIEW'
  | 'EXPIRED_FILE'
  | 'EXPIRING_FILE'
  | 'OPEN_ISSUE'
  | 'OVERDUE_ISSUE'
  | 'ISSUE_WAITING_VERIFICATION'
  | 'WORKSPACE_WITHOUT_MEMBERS';

export const ALL_RULES: DetectionRule[] = [
  'OVERDUE_TASK',
  'UNASSIGNED_TASK',
  'DOCUMENT_UNDER_REVIEW',
  'EXPIRED_FILE',
  'EXPIRING_FILE',
  'OPEN_ISSUE',
  'OVERDUE_ISSUE',
  'ISSUE_WAITING_VERIFICATION',
  'WORKSPACE_WITHOUT_MEMBERS',
];

export const RULE_LABELS: Record<DetectionRule, string> = {
  OVERDUE_TASK:               'Overdue Task',
  UNASSIGNED_TASK:            'Unassigned Task',
  DOCUMENT_UNDER_REVIEW:      'Doc Under Review',
  EXPIRED_FILE:               'Expired File',
  EXPIRING_FILE:              'File Expiring',
  OPEN_ISSUE:                 'Open Issue',
  OVERDUE_ISSUE:              'Overdue Issue',
  ISSUE_WAITING_VERIFICATION: 'Awaiting Verification',
  WORKSPACE_WITHOUT_MEMBERS:  'No Members',
};

export type RuleColor = 'error' | 'warning' | 'info' | 'muted';

export const RULE_COLOR: Record<DetectionRule, RuleColor> = {
  OVERDUE_TASK:               'error',
  UNASSIGNED_TASK:            'warning',
  DOCUMENT_UNDER_REVIEW:      'info',
  EXPIRED_FILE:               'error',
  EXPIRING_FILE:              'warning',
  OPEN_ISSUE:                 'error',
  OVERDUE_ISSUE:              'error',
  ISSUE_WAITING_VERIFICATION: 'info',
  WORKSPACE_WITHOUT_MEMBERS:  'warning',
};

export type EntityType = 'TASK' | 'DOCUMENT' | 'FILE_ATTACHMENT' | 'ISSUE' | 'WORKSPACE';

export interface ActionItem {
  id: string;                         // stable compound key: `${ruleKey}:${entityId}`
  ruleKey: DetectionRule;
  entityType: EntityType;
  entityId: string;
  title: string;
  workspaceName: string | null;
  workspaceId: string | null;
  department: string | null;
  responsibleUser: string | null;
  responsibleUserId: string | null;
  reason: string;                     // Part 6: explanation — human-readable why
  detectedAt: string;                 // Part 6: generatedAt timestamp
  detectionField: string;
  detectionValue: string;
  label: 'SYSTEM_DETECTED';
  dueDate: string | null;
  expiryDate: string | null;
  updatedAt: string | null;
  // Part 6: structured detection evidence for "Why this needs attention"
  sourceFacts: Record<string, unknown>;
  // Part 10: lower-priority rules that also matched this entity (shown as secondary badges)
  secondaryRules?: DetectionRule[];
  // Part 2: for ISSUE entities, the valid next status transitions (read-only, informational)
  validTransitions?: string[];
}

export interface ActionPreview {
  detectedAt: string;
  dryRun: true;
  totalItems: number;
  counts: Record<DetectionRule, number>;
  rules: Array<{ key: DetectionRule; description: string; count: number }>;
  items: ActionItem[];
}

// Local review state — maintained in component state, not persisted to server.
// The audit log entry (via POST /business-actions/log-action) is the persistence.
export type ItemStatus =
  | 'SYSTEM_DETECTED'
  | 'NEEDS_REVIEW'
  | 'NOT_APPLICABLE';

export const STATUS_LABEL: Record<ItemStatus, string> = {
  SYSTEM_DETECTED: 'System Detected',
  NEEDS_REVIEW:    'Noted',
  NOT_APPLICABLE:  'N/A',
};

// Part 2: human-readable labels for NcrCapa status values
export const ISSUE_STATUS_LABELS: Record<string, string> = {
  OPEN:             'Open',
  IN_PROGRESS:      'In Progress',
  WAITING_EVIDENCE: 'Waiting Evidence',
  SUBMITTED:        'Submitted',
  VERIFIED:         'Verified',
  CLOSED:           'Closed',
  REJECTED:         'Rejected',
  OVERDUE:          'Overdue',
};
