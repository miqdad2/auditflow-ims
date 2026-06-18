interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'xs';
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  // Task statuses
  TODO:           { bg: 'var(--bg-muted)',         color: 'var(--text-muted)',     label: 'To Do' },
  IN_PROGRESS:    { bg: 'var(--accent-soft)',       color: 'var(--accent-primary)', label: 'In Progress' },
  WAITING_REVIEW: { bg: 'var(--state-warning-soft)',color: 'var(--state-warning)',  label: 'In Review' },
  COMPLETED:      { bg: 'var(--state-success-soft)',color: 'var(--state-success)',  label: 'Completed' },
  REJECTED:       { bg: 'var(--state-error-soft)',  color: 'var(--state-error)',    label: 'Rejected' },
  CANCELLED:      { bg: 'var(--bg-muted)',          color: 'var(--text-disabled)',  label: 'Cancelled' },
  // Workspace statuses
  ACTIVE:         { bg: 'var(--state-success-soft)',color: 'var(--state-success)',  label: 'Active' },
  ARCHIVED:       { bg: 'var(--bg-muted)',          color: 'var(--text-disabled)',  label: 'Archived' },
  // Document statuses
  DRAFT:          { bg: 'var(--bg-muted)',          color: 'var(--text-muted)',     label: 'Draft' },
  UNDER_REVIEW:   { bg: 'var(--state-warning-soft)',color: 'var(--state-warning)',  label: 'Under Review' },
  APPROVED:       { bg: 'var(--state-success-soft)',color: 'var(--state-success)',  label: 'Approved' },
};

const PRIORITY_STYLES: Record<string, { color: string; label: string }> = {
  LOW:      { color: 'var(--text-muted)',    label: 'Low' },
  MEDIUM:   { color: 'var(--state-info)',    label: 'Medium' },
  HIGH:     { color: 'var(--state-warning)', label: 'High' },
  CRITICAL: { color: 'var(--state-error)',   label: 'Critical' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? { bg: 'var(--bg-muted)', color: 'var(--text-muted)', label: status };
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? { color: 'var(--text-muted)', label: priority };
  return (
    <span className="text-xs font-medium" style={{ color: style.color }}>
      {style.label}
    </span>
  );
}
