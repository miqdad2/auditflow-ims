// ─── Notification display helpers ─────────────────────────────────────────────
// Shared between the toast manager and the notifications page.

export type NotificationCategory = string;

// ─── Category → filter group mapping ─────────────────────────────────────────
export type FilterGroup = 'tasks' | 'documents' | 'issues' | 'expiry' | 'requests' | 'system';

export const CATEGORY_GROUP: Record<string, FilterGroup> = {
  TASK_ASSIGNED:           'tasks',
  TASK_OVERDUE:            'tasks',
  TASK_REJECTED:           'tasks',
  TASK_DUE_SOON:           'tasks',
  MENTION:                 'tasks',
  DOCUMENT_APPROVED:       'documents',
  DOCUMENT_REJECTED:       'documents',
  DOCUMENT_REVIEW_PENDING: 'documents',
  NCR_ASSIGNED:            'issues',
  NCR_VERIFIED:            'issues',
  NCR_REJECTED:            'issues',
  NCR_WAITING_VERIFICATION:'issues',
  EVIDENCE_SUBMITTED:      'issues',
  EVIDENCE_APPROVED:       'issues',
  EVIDENCE_REJECTED:       'issues',
  CHECKLIST_ASSIGNMENT:    'issues',
  FILE_EXPIRING:           'expiry',
  FILE_EXPIRED:            'expiry',
  FILE_RENEWED:            'expiry',
  REQUEST_UPDATE:          'requests',
  MEMBER_ADDED:            'system',
  MEMBER_ROLE_CHANGED:     'system',
  MEMBER_REMOVED:          'system',
  SYSTEM:                  'system',
};

export function getCategoryGroup(category: string): FilterGroup {
  return CATEGORY_GROUP[category] ?? 'system';
}

// ─── Category → human label ───────────────────────────────────────────────────
export const CATEGORY_LABEL: Record<string, string> = {
  TASK_ASSIGNED:           'Task',
  TASK_OVERDUE:            'Overdue',
  TASK_REJECTED:           'Task',
  TASK_DUE_SOON:           'Due Soon',
  MENTION:                 'Mention',
  DOCUMENT_APPROVED:       'Document',
  DOCUMENT_REJECTED:       'Document',
  DOCUMENT_REVIEW_PENDING: 'Review',
  NCR_ASSIGNED:            'Issue',
  NCR_VERIFIED:            'Issue',
  NCR_REJECTED:            'Issue',
  NCR_WAITING_VERIFICATION:'Issue',
  EVIDENCE_SUBMITTED:      'Evidence',
  EVIDENCE_APPROVED:       'Evidence',
  EVIDENCE_REJECTED:       'Evidence',
  CHECKLIST_ASSIGNMENT:    'Checklist',
  FILE_EXPIRING:           'Expiry',
  FILE_EXPIRED:            'Expired',
  FILE_RENEWED:            'Renewed',
  REQUEST_UPDATE:          'Request',
  MEMBER_ADDED:            'Member',
  MEMBER_ROLE_CHANGED:     'Member',
  MEMBER_REMOVED:          'Member',
  SYSTEM:                  'System',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? 'System';
}

// ─── Severity → color tokens ──────────────────────────────────────────────────
export function getSeverityStyle(severity: string): { color: string; bg: string; border: string } {
  switch (severity) {
    case 'CRITICAL':
      return {
        color:  'var(--state-error)',
        bg:     'var(--state-error-soft)',
        border: 'var(--state-error)',
      };
    case 'ERROR':
      return {
        color:  'var(--state-error)',
        bg:     'var(--state-error-soft)',
        border: 'var(--state-error)',
      };
    case 'WARNING':
      return {
        color:  'var(--state-warning)',
        bg:     'var(--state-warning-soft)',
        border: 'var(--state-warning)',
      };
    default: // INFO
      return {
        color:  'var(--accent-primary)',
        bg:     'var(--accent-soft)',
        border: 'var(--accent-primary)',
      };
  }
}

// ─── Category → style (for category badge) ────────────────────────────────────
export function getCategoryStyle(category: string): { color: string; bg: string } {
  const group = getCategoryGroup(category);
  switch (group) {
    case 'tasks':     return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)' };
    case 'documents': return { color: 'var(--state-success)',  bg: 'var(--state-success-soft)' };
    case 'issues':    return { color: 'var(--state-error)',    bg: 'var(--state-error-soft)' };
    case 'expiry':    return { color: 'var(--state-warning)',  bg: 'var(--state-warning-soft)' };
    case 'requests':  return { color: 'var(--state-warning)',  bg: 'var(--state-warning-soft)' };
    default:          return { color: 'var(--text-muted)',     bg: 'var(--bg-muted)' };
  }
}

// ─── Time formatting ──────────────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'Just now';
}

// ─── Critical-severity categories (longer toast duration) ─────────────────────
const CRITICAL_CATEGORIES = new Set([
  'TASK_OVERDUE', 'FILE_EXPIRED', 'NCR_REJECTED', 'EVIDENCE_REJECTED',
]);

export function isCritical(category: string, severity: string): boolean {
  return severity === 'CRITICAL' || severity === 'ERROR' || CRITICAL_CATEGORIES.has(category);
}
