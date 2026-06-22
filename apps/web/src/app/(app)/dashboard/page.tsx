'use client';

import {
  useState, useEffect, useCallback, useRef,
  type ElementType, type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Clock, FileText,
  RefreshCw, ChevronRight,
  Bell, Activity, ListChecks,
  Upload, Wifi, WifiOff, Building2, Zap, CalendarDays, ScanLine,
  CheckCircle2, Users, TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPostAuth, ApiError } from '@/lib/api';
import { useSocket } from '@/lib/socket-provider';
import type { DashboardOverview, ExpiringTaskFile, WorkspaceStatusRow } from '@/features/dashboard/types';
import BusinessActionCenter from '@/features/business-actions/business-action-center';
import type { ActionItem, ActionPreview } from '@/features/business-actions/types';
import { RULE_LABELS, RULE_COLOR } from '@/features/business-actions/types';

// ─── Role helpers ──────────────────────────────────────────────────────────────

const ELEVATED     = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
const SUPER_ROLES  = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];
const DEPT_MGR     = ['DEPARTMENT_MANAGER'];
const DEPT_USER    = ['DEPARTMENT_USER'];

function hasAny(roles: string[], list: string[]): boolean {
  return roles.some((r) => list.includes(r));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'COMPLETED' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

function friendlyApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 403) return 'You do not have permission to view this dashboard.';
    if (err.statusCode === 0)   return 'Server unavailable. Please check your connection and try again.';
    return err.message || 'Dashboard failed to load. Please try again.';
  }
  return 'Dashboard failed to load. Please try again.';
}

function statusColor(status: string): { color: string; bg: string } {
  switch (status) {
    case 'COMPLETED': case 'APPROVED': case 'CLOSED': case 'VERIFIED':
      return { color: 'var(--state-success)', bg: 'var(--state-success-soft)' };
    case 'IN_PROGRESS': case 'UNDER_REVIEW': case 'SUBMITTED':
      return { color: 'var(--state-info)', bg: 'var(--state-info-soft)' };
    case 'WAITING_REVIEW': case 'WAITING_EVIDENCE':
      return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' };
    case 'REJECTED': case 'OVERDUE':
      return { color: 'var(--state-error)', bg: 'var(--state-error-soft)' };
    default:
      return { color: 'var(--text-muted)', bg: 'var(--bg-muted)' };
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'CRITICAL': return 'var(--state-error)';
    case 'HIGH':     return 'var(--state-warning)';
    case 'MEDIUM':   return 'var(--accent-primary)';
    default:         return 'var(--text-muted)';
  }
}

// ─── BAC attention row (compact, for super-user dashboard preview) ─────────────

function BacAttentionRow({ item }: { item: ActionItem }) {
  const colorKey = RULE_COLOR[item.ruleKey] ?? 'muted';
  const colorMap: Record<string, { color: string; bg: string; border: string }> = {
    error:   { color: 'var(--state-error)',    bg: 'var(--state-error-soft)',   border: 'var(--state-error)20' },
    warning: { color: 'var(--state-warning)',  bg: 'var(--state-warning-soft)', border: 'var(--state-warning)20' },
    info:    { color: 'var(--accent-primary)', bg: 'var(--accent-soft)',        border: 'var(--accent-primary)20' },
    muted:   { color: 'var(--text-muted)',     bg: 'var(--bg-muted)',           border: 'var(--border-subtle)' },
  };
  const vars = colorMap[colorKey];

  let link: string | null = null;
  if (item.entityType === 'TASK' && item.workspaceId) link = `/workspaces/${item.workspaceId}?task=${item.entityId}`;
  else if (item.entityType === 'DOCUMENT') link = `/documents/${item.entityId}`;
  else if (item.entityType === 'FILE_ATTACHMENT' && item.workspaceId) link = `/workspaces/${item.workspaceId}`;
  else if (item.entityType === 'ISSUE') link = `/ncr-capa`;
  else if (item.entityType === 'WORKSPACE') link = `/workspaces/${item.entityId}`;

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{ backgroundColor: vars.bg, border: `1px solid ${vars.border}` }}>
      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
        style={{ color: vars.color }}>
        {RULE_LABELS[item.ruleKey]}
      </span>
      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
        {item.title}
      </span>
      {item.workspaceName && (
        <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
          {item.workspaceName}
        </span>
      )}
      {item.reason && (
        <span className="shrink-0 hidden xl:block text-xs max-w-[200px] truncate"
          style={{ color: 'var(--text-secondary)' }}>
          {item.reason}
        </span>
      )}
      {link ? (
        <Link href={link}
          className="shrink-0 text-xs font-medium flex items-center gap-0.5"
          style={{ color: vars.color }}>
          View <ChevronRight className="h-3 w-3" />
        </Link>
      ) : (
        <span className="shrink-0 w-10" />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, urgent, warning, href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: ElementType;
  urgent?: boolean;
  warning?: boolean;
  href?: string;
}) {
  const numVal = Number(value);
  const isUrgent  = urgent  && numVal > 0;
  const isWarning = warning && numVal > 0 && !isUrgent;

  const borderColor = isUrgent  ? 'var(--state-error)'
    : isWarning ? 'var(--state-warning)'
    : 'var(--border-default)';

  const iconBg    = isUrgent  ? 'var(--state-error-soft)'
    : isWarning ? 'var(--state-warning-soft)'
    : 'var(--bg-muted)';

  const iconColor = isUrgent  ? 'var(--state-error)'
    : isWarning ? 'var(--state-warning)'
    : 'var(--text-muted)';

  const numColor  = isUrgent  ? 'var(--state-error)'
    : isWarning ? 'var(--state-warning)'
    : 'var(--text-primary)';

  const card = (
    <div
      className="flex min-h-28 flex-col justify-between rounded-xl p-4 transition-shadow hover:shadow-sm"
      style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-semibold leading-none" style={{ color: numColor }}>{value}</p>
        {sub && <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}

function SectionCard({ title, icon: Icon, children, href, linkLabel, action }: {
  title: string; icon: ElementType; children: ReactNode;
  href?: string; linkLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {href && (
            <Link href={href} className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
              {linkLabel ?? 'View all'} <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EmptyState({ message, actionLabel, href, icon: Icon = ListChecks }: {
  message: string; actionLabel?: string; href?: string; icon?: ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
      {href && actionLabel && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
        >
          {actionLabel} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function AttentionItem({ label, count, href, urgent }: {
  label: string; count: number; href: string; urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors hover:opacity-90"
      style={{
        backgroundColor: urgent ? 'var(--state-error-soft)' : 'var(--state-warning-soft)',
        border: urgent ? '1px solid var(--state-error)20' : '1px solid var(--state-warning)20',
      }}
    >
      <span className="text-sm font-medium" style={{ color: urgent ? 'var(--state-error)' : 'var(--state-warning)' }}>
        {label}
      </span>
      <span className="text-sm font-semibold flex items-center gap-0.5" style={{ color: urgent ? 'var(--state-error)' : 'var(--state-warning)' }}>
        {count} <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function WsStatusBadge({ status, label }: { status: WorkspaceStatusRow['operationalStatus']; label: string }) {
  const colorMap: Record<string, { color: string; bg: string }> = {
    INACTIVE:          { color: 'var(--text-muted)',    bg: 'var(--bg-muted)' },
    SETUP_REQUIRED:    { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
    CRITICAL:          { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' },
    NEEDS_ATTENTION:   { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
    IN_PROGRESS:       { color: 'var(--accent-primary)', bg: 'var(--accent-soft)' },
    HEALTHY:           { color: 'var(--state-success)', bg: 'var(--state-success-soft)' },
  };
  const style = colorMap[status] ?? { color: 'var(--text-muted)', bg: 'var(--bg-muted)' };
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ color: style.color, backgroundColor: style.bg }}>
      {label}
    </span>
  );
}

// ─── Stale events ─────────────────────────────────────────────────────────────
const STALE_EVENTS = [
  'task.created', 'task.updated', 'task.deleted', 'task.moved',
  'comment.created',
  'attachment.created', 'attachment.deleted',
  'document.created', 'document.updated',
  'ncr.created', 'ncr.updated',
  'workspace.member.added', 'workspace.member.removed',
  'workspace.updated',
] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { socket, connected, joinWorkspace } = useSocket();

  const [data, setData]               = useState<DashboardOverview | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [hasUpdates, setHasUpdates]   = useState(false);
  const [localUnread, setLocalUnread] = useState<number | null>(null);

  // BAC preview (super user only)
  const [bacItems, setBacItems]     = useState<ActionItem[]>([]);
  const [bacLoading, setBacLoading] = useState(false);

  // Expiry
  const [expiryChecking, setExpiryChecking]         = useState(false);
  const [expiryCheckResult, setExpiryCheckResult]   = useState<{ scanned: number; expiringSoon: number; expired: number; notificationsCreated: number } | null>(null);
  const [expiryFiles, setExpiryFiles]               = useState<ExpiringTaskFile[]>([]);
  const [expiryFilesLoading, setExpiryFilesLoading] = useState(false);
  const [showExpiryFiles, setShowExpiryFiles]       = useState(false);

  const initialLoadDoneRef = useRef(false);
  const prevConnectedRef   = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setHasUpdates(false);
    try {
      const json = await apiGet<DashboardOverview>('/dashboard/overview', token);
      setData(json);
      setLastRefresh(new Date());
      setLocalUnread(null);
      initialLoadDoneRef.current = true;
    } catch (err) {
      setError(friendlyApiError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function handleRunExpiryCheck() {
    if (!token) return;
    setExpiryChecking(true);
    setExpiryCheckResult(null);
    try {
      const result = await apiPostAuth<{ scanned: number; expiringSoon: number; expired: number; notificationsCreated: number }>(
        '/file-attachments/expiry-check', {}, token,
      );
      setExpiryCheckResult(result);
      void load();
    } catch { /* ignore */ }
    finally { setExpiryChecking(false); }
  }

  async function handleLoadExpiryFiles() {
    if (!token) return;
    setExpiryFilesLoading(true);
    try {
      const files = await apiGet<ExpiringTaskFile[]>('/file-attachments/expiring', token);
      const now = Date.now();
      setExpiryFiles(
        (files as ExpiringTaskFile[]).map((f) => ({
          ...f,
          daysUntilExpiry: f.expiryDate
            ? Math.ceil((new Date(f.expiryDate).getTime() - now) / 86400000)
            : undefined,
        })),
      );
      setShowExpiryFiles(true);
    } catch { /* ignore */ }
    finally { setExpiryFilesLoading(false); }
  }

  useEffect(() => {
    if (!data?.accessibleWorkspaceIds?.length) return;
    data.accessibleWorkspaceIds.forEach((id) => joinWorkspace(id));
  }, [data?.accessibleWorkspaceIds, joinWorkspace]);

  useEffect(() => {
    if (connected && !prevConnectedRef.current && initialLoadDoneRef.current) void load();
    prevConnectedRef.current = connected;
  }, [connected, load]);

  // Load BAC preview items for super-role users
  useEffect(() => {
    if (!token) return;
    const userRoles = user?.roles ?? [];
    if (!userRoles.some((r) => SUPER_ROLES.includes(r))) return;
    setBacLoading(true);
    apiGet<ActionPreview>('/business-actions/preview', token)
      .then((p) => setBacItems(p.items))
      .catch(() => {})
      .finally(() => setBacLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  useEffect(() => {
    if (!socket) return;
    const handleStale       = () => setHasUpdates(true);
    const handleNotification = () => { setLocalUnread((c) => (c ?? 0) + 1); setHasUpdates(true); };
    const handleAccessRemoved = () => void load();
    STALE_EVENTS.forEach((e) => socket.on(e, handleStale));
    socket.on('notification.created', handleNotification);
    socket.on('workspace.access.removed', handleAccessRemoved);
    return () => {
      STALE_EVENTS.forEach((e) => socket.off(e, handleStale));
      socket.off('notification.created', handleNotification);
      socket.off('workspace.access.removed', handleAccessRemoved);
    };
  }, [socket, load]);

  // ─── Role detection ─────────────────────────────────────────────────────────
  const roles        = user?.roles ?? [];
  const isElevated   = hasAny(roles, ELEVATED);
  const isSuperRole  = hasAny(roles, SUPER_ROLES);
  const isDeptMgr    = hasAny(roles, DEPT_MGR);
  const isDeptUser   = hasAny(roles, DEPT_USER);
  const isRestricted = !isElevated && !isDeptMgr && !isDeptUser;
  const canReview    = isElevated || isDeptMgr;
  const canRunExpiry = isSuperRole;

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)' }}>
        <AlertTriangle className="mx-auto mb-2 h-6 w-6" style={{ color: 'var(--state-error)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--state-error)' }}>{error}</p>
        <button onClick={() => void load()} className="mt-3 text-xs underline" style={{ color: 'var(--state-error)' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const {
    taskSummary, documentSummary, ncrCapaSummary,
    overdueSummary, recentActivity, myAssignments, pendingReviews,
    notificationSummary, myWorkspacesCount, taskFileSummary,
    workspaceStatusRows = [],
  } = data;

  const unreadCount  = localUnread ?? notificationSummary.unread;
  const openIssues   = ncrCapaSummary.open + ncrCapaSummary.inProgress + ncrCapaSummary.overdue;
  const hasExpiryIssue = (taskFileSummary?.expired ?? 0) > 0 || (taskFileSummary?.expiringSoon ?? 0) > 0;

  // ─── Attention items — personal for normal users, business-wide for elevated ───
  const attentionItems: { label: string; count: number; href: string; urgent: boolean }[] = [];
  const taskLabel  = isRestricted ? 'My overdue tasks'       : 'Overdue tasks';
  const issueLabel = isRestricted ? 'My open / overdue issues': 'Open / overdue issues';
  if (overdueSummary.overdueTasks > 0)
    attentionItems.push({ label: taskLabel, count: overdueSummary.overdueTasks, href: '/tasks?view=overdue', urgent: true });
  if (ncrCapaSummary.open + ncrCapaSummary.overdue > 0)
    attentionItems.push({ label: issueLabel, count: ncrCapaSummary.open + ncrCapaSummary.overdue, href: '/ncr-capa', urgent: ncrCapaSummary.overdue > 0 });
  if (canReview && pendingReviews.length > 0)
    attentionItems.push({ label: 'Pending document reviews', count: pendingReviews.length, href: '/documents', urgent: false });
  if ((taskFileSummary?.expired ?? 0) > 0)
    attentionItems.push({ label: 'Expired task files', count: taskFileSummary!.expired, href: '#expiry', urgent: true });
  if ((taskFileSummary?.expiringSoon ?? 0) > 0)
    attentionItems.push({ label: 'Task files expiring soon', count: taskFileSummary!.expiringSoon, href: '#expiry', urgent: false });

  const showNoWorkspace = isRestricted && myWorkspacesCount === 0;

  // ─── Header copy (role-based) ────────────────────────────────────────────────
  const headerLabel   = isSuperRole ? 'BUSINESS OPERATIONS OVERVIEW'
    : isElevated      ? 'BUSINESS OPERATIONS OVERVIEW'
    : 'MY DASHBOARD';
  const headerTitle   = isSuperRole ? 'Business Control Center'
    : isElevated      ? 'Business Control Center'
    : 'My Dashboard';
  const headerSubtitle = isSuperRole
    ? 'Monitor workspaces, tasks, documents, expiring files, issues, and recent activity.'
    : isElevated
    ? `Welcome back, ${user?.fullName ?? 'User'}.${user?.department ? ` · ${user.department.name}` : ''}`
    : `Welcome back, ${user?.fullName ?? 'User'}.${user?.department ? ` · ${user.department.name}` : ''}`;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Updates banner ── */}
      {hasUpdates && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)30' }}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              New updates available — data may have changed.
            </span>
          </div>
          <button onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
            disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {headerLabel}
          </p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {headerTitle}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {connected ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--state-success)' }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--state-success)' }} />
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <WifiOff className="h-3 w-3" /> Offline
            </div>
          )}
          {lastRefresh && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
          <button onClick={() => void load()} disabled={loading}
            className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
            title="Refresh dashboard">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── No workspace state for staff ── */}
      {showNoWorkspace && (
        <div className="flex flex-col items-center justify-center rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            No workspace access yet
          </h3>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            You are not added to any workspace yet. Please contact your administrator or manager to be added as a workspace member.
          </p>
          <Link href="/notifications"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
            <Bell className="h-4 w-4" /> Check notifications
          </Link>
        </div>
      )}

      {!showNoWorkspace && (
        <>
          {/* ── Needs Attention ── */}
          {isSuperRole ? (
            /* Super users see live BAC-detected items (up to 5) */
            <div className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: bacItems.length > 0 ? 'var(--state-error-soft)' : 'var(--bg-muted)', color: bacItems.length > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    What needs your attention
                  </h2>
                  {!bacLoading && bacItems.length > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                      {bacItems.length}
                    </span>
                  )}
                </div>
                <Link href="/action-center"
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--accent-primary)' }}>
                  <Zap className="h-3 w-3" />Open Action Center <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {bacLoading ? (
                <div className="flex items-center justify-center py-5">
                  <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : bacItems.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {bacItems.slice(0, 5).map((item) => (
                    <BacAttentionRow key={item.id} item={item} />
                  ))}
                  {bacItems.length > 5 && (
                    <Link href="/action-center"
                      className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)' }}>
                      +{bacItems.length - 5} more items in Action Center <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--state-success)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No urgent items detected by the Business Action Center.
                  </span>
                </div>
              )}
            </div>
          ) : attentionItems.length > 0 ? (
            /* Normal/elevated users see count chips */
            <div className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  What needs your attention
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {attentionItems.map((item) => (
                  <AttentionItem key={item.label} {...item} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--state-success)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isRestricted
                  ? 'No assigned work currently requires your attention.'
                  : 'No urgent business items require attention.'}
              </span>
            </div>
          )}

          {/* ── Task File Expiry banner (no issues) ── */}
          {isElevated && !hasExpiryIssue && (
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Task File Expiry</span>
                  <span className="ml-2 text-xs" style={{ color: 'var(--state-success)' }}>
                    All tracked task files are currently valid.
                  </span>
                </div>
                {expiryCheckResult && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Last check: {expiryCheckResult.scanned} scanned
                  </span>
                )}
              </div>
              {canRunExpiry && (
                <button onClick={() => void handleRunExpiryCheck()} disabled={expiryChecking}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)30' }}>
                  {expiryChecking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Checking…</> : <><ScanLine className="h-3.5 w-3.5" />Run Expiry Check</>}
                </button>
              )}
            </div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {isElevated ? (
              // Business-wide KPIs for elevated / Super User
              <>
                <KpiCard
                  label="Active Workspaces"
                  value={myWorkspacesCount}
                  sub="business workspaces"
                  icon={Building2}
                  href="/workspaces"
                />
                <KpiCard
                  label="Open Tasks"
                  value={taskSummary.total - (taskSummary.completed ?? 0)}
                  sub={`${taskSummary.todo ?? 0} todo · ${taskSummary.inProgress ?? 0} in progress`}
                  icon={ListChecks}
                  href="/tasks?view=open"
                />
                <KpiCard
                  label="Overdue Tasks"
                  value={overdueSummary.overdueTasks}
                  sub={overdueSummary.overdueTasks > 0 ? 'require immediate action' : 'none overdue'}
                  icon={Clock}
                  urgent={overdueSummary.overdueTasks > 0}
                  href="/tasks?view=overdue"
                />
                <KpiCard
                  label="Docs Under Review"
                  value={documentSummary.underReview}
                  sub="awaiting business review"
                  icon={FileText}
                  warning={documentSummary.underReview > 0}
                  href="/documents"
                />
                <KpiCard
                  label="Open Issues"
                  value={openIssues}
                  sub={`${ncrCapaSummary.open} open · ${ncrCapaSummary.overdue} overdue`}
                  icon={AlertTriangle}
                  urgent={ncrCapaSummary.overdue > 0}
                  warning={openIssues > 0 && ncrCapaSummary.overdue === 0}
                  href="/ncr-capa"
                />
                <KpiCard
                  label="Expiring / Expired Files"
                  value={(taskFileSummary?.expiringSoon ?? 0) + (taskFileSummary?.expired ?? 0)}
                  sub={`${taskFileSummary?.expired ?? 0} expired · ${taskFileSummary?.expiringSoon ?? 0} soon`}
                  icon={CalendarDays}
                  urgent={(taskFileSummary?.expired ?? 0) > 0}
                  warning={(taskFileSummary?.expiringSoon ?? 0) > 0 && (taskFileSummary?.expired ?? 0) === 0}
                />
              </>
            ) : (
              // Personal KPIs for dept roles and restricted users
              <>
                <KpiCard
                  label="Accessible Workspaces"
                  value={myWorkspacesCount}
                  sub="assigned to me"
                  icon={Building2}
                  href="/workspaces"
                />
                <KpiCard
                  label="My Open Tasks"
                  value={taskSummary.myAssigned}
                  sub={taskSummary.myAssigned === 0 ? 'none assigned' : `${taskSummary.inProgress ?? 0} in progress`}
                  icon={ListChecks}
                  href="/tasks?view=open"
                />
                <KpiCard
                  label="My Overdue Tasks"
                  value={overdueSummary.overdueTasks}
                  sub={overdueSummary.overdueTasks > 0 ? 'need action now' : 'none overdue'}
                  icon={Clock}
                  urgent={overdueSummary.overdueTasks > 0}
                  href="/tasks?view=overdue"
                />
                {canReview ? (
                  <KpiCard
                    label="Docs Under Review"
                    value={documentSummary.underReview}
                    sub="awaiting your review"
                    icon={FileText}
                    warning={documentSummary.underReview > 0}
                    href="/documents"
                  />
                ) : (
                  <KpiCard
                    label="My Waiting Review"
                    value={taskSummary.waitingReview ?? 0}
                    sub={taskSummary.waitingReview ? 'tasks pending review' : 'none pending'}
                    icon={RefreshCw}
                    warning={(taskSummary.waitingReview ?? 0) > 0}
                    href="/tasks?view=waiting-review"
                  />
                )}
                <KpiCard
                  label="My Open Issues"
                  value={ncrCapaSummary.open + ncrCapaSummary.inProgress}
                  sub={ncrCapaSummary.overdue > 0 ? `${ncrCapaSummary.overdue} overdue` : 'no overdue'}
                  icon={AlertTriangle}
                  urgent={ncrCapaSummary.overdue > 0}
                  href="/ncr-capa"
                />
                <KpiCard
                  label="Unread Notifications"
                  value={unreadCount}
                  sub="unread messages"
                  icon={Bell}
                  warning={unreadCount > 0}
                  href="/notifications"
                />
              </>
            )}
          </div>

          {/* ── Task File Expiry control panel (when issues exist) ── */}
          {isElevated && hasExpiryIssue && (
            <div id="expiry" className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)' }}>
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task File Expiry</h2>
                </div>
                <div className="flex items-center gap-2">
                  {expiryCheckResult && (
                    <span className="text-xs" style={{ color: 'var(--state-success)' }}>
                      ✓ {expiryCheckResult.scanned} scanned · {expiryCheckResult.notificationsCreated} notifications
                    </span>
                  )}
                  {canRunExpiry && (
                    <button onClick={() => void handleRunExpiryCheck()} disabled={expiryChecking}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                      style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)30' }}>
                      {expiryChecking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Checking…</> : <><ScanLine className="h-3.5 w-3.5" />Run Expiry Check</>}
                    </button>
                  )}
                  <button
                    onClick={() => showExpiryFiles ? setShowExpiryFiles(false) : void handleLoadExpiryFiles()}
                    disabled={expiryFilesLoading}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                    {expiryFilesLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                    {showExpiryFiles ? 'Hide Files' : 'View Files Requiring Attention'}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mb-3">
                {(taskFileSummary?.expired ?? 0) > 0 && (
                  <div className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)30' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--state-error)' }}>Expired</p>
                    <p className="text-2xl font-semibold leading-tight" style={{ color: 'var(--state-error)' }}>{taskFileSummary!.expired}</p>
                  </div>
                )}
                {(taskFileSummary?.expiringSoon ?? 0) > 0 && (
                  <div className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)30' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--state-warning)' }}>Expiring Soon</p>
                    <p className="text-2xl font-semibold leading-tight" style={{ color: 'var(--state-warning)' }}>{taskFileSummary!.expiringSoon}</p>
                  </div>
                )}
              </div>
              {showExpiryFiles && expiryFiles.length > 0 && (
                <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-default)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                        {['File', 'Task', 'Workspace', 'Responsible', 'Expiry', 'Status', ''].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expiryFiles.map((f) => {
                        const daysLeft    = f.daysUntilExpiry ?? 0;
                        const isExpired   = daysLeft < 0;
                        const isSoon      = daysLeft >= 0 && daysLeft <= (f.reminderDays ?? 30);
                        const stLabel     = isExpired ? 'Expired' : isSoon ? 'Expiring Soon' : 'Valid';
                        const stColor     = isExpired ? 'var(--state-error)' : isSoon ? 'var(--state-warning)' : 'var(--state-success)';
                        const stBg        = isExpired ? 'var(--state-error-soft)' : isSoon ? 'var(--state-warning-soft)' : 'var(--state-success-soft)';
                        const openTaskUrl = f.task ? `/workspaces/${f.task.workspaceId}?task=${f.task.id}&fileId=${f.id}` : null;
                        const responsible = (f.task as { assignee?: { fullName: string } } | null)?.assignee?.fullName ?? f.uploadedBy.fullName;
                        return (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                            <td className="px-3 py-2 max-w-[140px]">
                              <span className="truncate block font-medium" style={{ color: 'var(--text-primary)' }}>{f.displayName ?? f.originalFileName}</span>
                              <span style={{ color: 'var(--text-muted)' }}>by {f.uploadedBy.fullName}</span>
                            </td>
                            <td className="px-3 py-2 max-w-[140px]">
                              {f.task
                                ? <span className="truncate block" style={{ color: 'var(--text-secondary)' }}>{f.task.title}</span>
                                : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                            </td>
                            <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{f.task?.workspace?.name ?? '—'}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{responsible}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: isExpired ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                              {f.expiryDate ? new Date(f.expiryDate).toLocaleDateString('en-GB') : '—'}
                              {daysLeft >= 0 && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>({daysLeft}d)</span>}
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                                style={{ backgroundColor: stBg, color: stColor }}>{stLabel}</span>
                            </td>
                            <td className="px-3 py-2">
                              {openTaskUrl && (
                                <Link href={openTaskUrl}
                                  className="rounded px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                                  Open Task
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {showExpiryFiles && expiryFiles.length === 0 && !expiryFilesLoading && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No files expiring within the next 90 days.</p>
              )}
            </div>
          )}

          {/* ── Workspace Status table (elevated / Super User only) ── */}
          {isElevated && workspaceStatusRows.length > 0 && (
            <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workspace Status</h2>
                </div>
                <Link href="/workspaces" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                  All workspaces <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                      {['Workspace', 'Dept', 'Open Tasks', 'Overdue', 'Docs Review', 'Open Issues', 'Members', 'Last Updated', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {workspaceStatusRows.map((ws) => (
                      <tr key={ws.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-3 py-2.5 max-w-[180px]">
                          <Link href={`/workspaces/${ws.id}`}
                            className="font-medium truncate block hover:underline"
                            style={{ color: 'var(--accent-primary)' }}>
                            {ws.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>
                          {ws.department ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium" style={{ color: ws.openTasks > 0 ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                          {ws.openTasks || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-disabled)' }}>
                          {ws.overdueTasks || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.docsUnderReview > 0 ? 'var(--state-warning)' : 'var(--text-disabled)' }}>
                          {ws.docsUnderReview || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.openIssues > 0 ? 'var(--state-error)' : 'var(--text-disabled)' }}>
                          {ws.openIssues || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />{ws.memberCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {ws.lastActivity ? timeAgo(ws.lastActivity) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <WsStatusBadge status={ws.operationalStatus} label={ws.operationalStatusLabel} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Business Action Center (Super User / elevated only) ── */}
          {isSuperRole && token && (
            <BusinessActionCenter token={token} />
          )}

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            {/* ── Left column (2/3) ── */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* My Assigned Tasks */}
              <SectionCard title="My Assigned Tasks" icon={ListChecks} href="/tasks" linkLabel="All my tasks">
                {myAssignments.length === 0 ? (
                  <EmptyState
                    message="No open tasks assigned to you."
                    actionLabel="View my tasks"
                    href="/tasks"
                    icon={ListChecks}
                  />
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                    {myAssignments.map((t) => {
                      const overdue  = isOverdue(t.dueDate, t.status);
                      const sc       = statusColor(t.status);
                      const taskLink = t.workspace?.id
                        ? `/workspaces/${t.workspace.id}?task=${t.id}`
                        : '/tasks';
                      return (
                        <Link key={t.id} href={taskLink}
                          className="px-5 py-3 flex items-center gap-3 transition-colors block"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '')}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate"
                              style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}>
                              {overdue && '⚠ '}{t.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {t.workspace?.name ?? '—'} · {t.taskList?.name ?? '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ color: priorityColor(t.priority), backgroundColor: 'var(--bg-muted)' }}>
                              {t.priority}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ color: sc.color, backgroundColor: sc.bg }}>
                              {t.status.replace(/_/g, ' ')}
                            </span>
                            {t.dueDate && (
                              <span className="text-xs"
                                style={{ color: overdue ? 'var(--state-error)' : 'var(--text-muted)' }}>
                                {new Date(t.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Recent Activity — personal for normal users, business-wide for elevated */}
              <SectionCard
                title={isElevated ? 'Recent Business Activity' : 'My Recent Activity'}
                icon={Activity}>
                {recentActivity.length === 0 ? (
                  <EmptyState
                    message="No activity recorded yet."
                    actionLabel="Open workspaces"
                    href="/workspaces"
                    icon={Activity}
                  />
                ) : (
                  <div className="px-5 py-3 space-y-3">
                    {recentActivity.map((a) => {
                      const cleanType = a.entityType
                        .replace('CHECKLIST_ITEM', 'Checklist')
                        .replace('NCR_CAPA', 'Issue')
                        .replace(/_/g, ' ')
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                      return (
                        <div key={a.id} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                            {a.actor.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-medium">{a.actor.fullName}</span>
                              {' '}{a.summary}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {cleanType} · {timeAgo(a.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* ── Right column (1/3) ── */}
            <div className="flex flex-col gap-5">

              {/* Pending Actions — Documents only */}
              {canReview && (
                <SectionCard title="Pending Actions" icon={Clock} href="/documents" linkLabel="Documents">
                  {pendingReviews.length === 0 ? (
                    <EmptyState
                      message="No documents awaiting review."
                      actionLabel="View documents"
                      href="/documents"
                      icon={FileText}
                    />
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                      {pendingReviews.map((r) => (
                        <div key={`${r.type}-${r.id}`} className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 text-xs px-1.5 py-0.5 rounded shrink-0"
                              style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                              DOC
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {r.submittedBy ?? '—'} · {r.department ?? 'General'}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.submittedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Issues & Actions */}
              <SectionCard title="Issues &amp; Actions" icon={AlertTriangle} href="/ncr-capa">
                {ncrCapaSummary.total === 0 ? (
                  <EmptyState
                    message="No issues raised yet."
                    actionLabel="View Issues"
                    href="/ncr-capa"
                    icon={AlertTriangle}
                  />
                ) : (
                  <div className="px-4 py-4 space-y-2">
                    {[
                      { label: 'Open',        value: ncrCapaSummary.open,       color: 'var(--state-error)' },
                      { label: 'In Progress', value: ncrCapaSummary.inProgress, color: 'var(--state-warning)' },
                      { label: 'Submitted',   value: ncrCapaSummary.submitted,  color: 'var(--state-info)' },
                      { label: 'Verified',    value: ncrCapaSummary.verified,   color: 'var(--state-success)' },
                      { label: 'Closed',      value: ncrCapaSummary.closed,     color: 'var(--text-muted)' },
                      { label: 'Overdue',     value: ncrCapaSummary.overdue,    color: 'var(--state-error)' },
                    ].filter((s) => s.value > 0).map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.round((s.value / ncrCapaSummary.total) * 100)}%`, backgroundColor: s.color }} />
                          </div>
                          <span className="font-semibold w-5 text-right" style={{ color: s.color }}>{s.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Document Library */}
              <SectionCard title="Document Library" icon={FileText} href="/documents">
                {documentSummary.total === 0 ? (
                  <EmptyState
                    message="No documents uploaded yet."
                    actionLabel="Open documents"
                    href="/documents"
                    icon={Upload}
                  />
                ) : (
                  <div className="px-4 py-4 space-y-2">
                    {[
                      { label: 'Approved',     value: documentSummary.approved,   color: 'var(--state-success)' },
                      { label: 'Under Review', value: documentSummary.underReview, color: 'var(--state-warning)' },
                      { label: 'Draft',        value: documentSummary.draft,       color: 'var(--text-muted)' },
                      { label: 'Rejected',     value: documentSummary.rejected,    color: 'var(--state-error)' },
                      { label: 'Archived',     value: documentSummary.archived,    color: 'var(--text-muted)' },
                    ].filter((s) => s.value > 0).map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.round((s.value / documentSummary.total) * 100)}%`, backgroundColor: s.color }} />
                          </div>
                          <span className="font-semibold w-5 text-right" style={{ color: s.color }}>{s.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Recent Notifications */}
              <SectionCard title="Recent Notifications" icon={Bell} href="/notifications" linkLabel="All">
                {notificationSummary.recent.length === 0 ? (
                  <EmptyState
                    message="No recent notifications."
                    actionLabel="Open inbox"
                    href="/notifications"
                    icon={Bell}
                  />
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                    {notificationSummary.recent.map((n) => (
                      <div key={n.id} className="px-4 py-2.5 flex items-start gap-2">
                        {!n.readAt && (
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-primary)' }} />
                        )}
                        <div className={`flex-1 min-w-0 ${n.readAt ? 'pl-3.5' : ''}`}>
                          <p className="text-xs font-medium truncate"
                            style={{ color: n.readAt ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {n.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
