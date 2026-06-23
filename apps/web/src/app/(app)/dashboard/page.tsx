'use client';

import {
  useState, useEffect, useCallback, useRef,
  type ElementType,
} from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Clock, FileText,
  RefreshCw, ChevronRight,
  Bell, Activity, ListChecks,
  Wifi, WifiOff, Building2, Zap, CalendarDays,
  CheckCircle2, Users, TrendingUp, LayoutDashboard,
  ShieldAlert, Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, ApiError } from '@/lib/api';
import { useSocket } from '@/lib/socket-provider';
import type {
  DashboardOverview, WorkspaceStatusRow,
} from '@/features/dashboard/types';
import type { ActionItem, ActionPreview, DetectionRule } from '@/features/business-actions/types';
import { RULE_LABELS, RULE_COLOR } from '@/features/business-actions/types';

// ─── Role helpers ──────────────────────────────────────────────────────────────

const ELEVATED     = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
const SUPER_ROLES  = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];

function hasAny(roles: string[], list: string[]): boolean {
  return roles.some((r) => list.includes(r));
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

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

function fmtKuwaitDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kuwait', day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtKuwaitTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'COMPLETED' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

function friendlyApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 403) return 'You do not have permission to view this dashboard.';
    if (err.statusCode === 0)   return 'Server unavailable. Please check your connection.';
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

// ─── Action Center tab routing ─────────────────────────────────────────────────

type ActionTab = 'all' | 'tasks' | 'approvals' | 'documents' | 'issues' | 'expiry';

const TAB_RULES: Record<ActionTab, DetectionRule[]> = {
  all:       [],
  tasks:     ['OVERDUE_TASK', 'UNASSIGNED_TASK'],
  approvals: [],
  documents: ['DOCUMENT_UNDER_REVIEW'],
  issues:    ['OPEN_ISSUE', 'OVERDUE_ISSUE', 'ISSUE_WAITING_VERIFICATION'],
  expiry:    ['EXPIRED_FILE', 'EXPIRING_FILE'],
};

function filterByTab(items: ActionItem[], tab: ActionTab): ActionItem[] {
  if (tab === 'all' || tab === 'approvals') return items;
  const rules = TAB_RULES[tab];
  return items.filter((i) => rules.includes(i.ruleKey));
}

function ruleColorVars(rule: DetectionRule): { color: string; bg: string } {
  const c = RULE_COLOR[rule];
  switch (c) {
    case 'error':   return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' };
    case 'warning': return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' };
    case 'info':    return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)' };
    default:        return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)' };
  }
}

function actionLink(item: ActionItem): string | null {
  if (item.entityType === 'TASK' && item.workspaceId)       return `/workspaces/${item.workspaceId}?task=${item.entityId}`;
  if (item.entityType === 'DOCUMENT')                       return `/documents/${item.entityId}`;
  if (item.entityType === 'FILE_ATTACHMENT' && item.workspaceId) return `/workspaces/${item.workspaceId}`;
  if (item.entityType === 'ISSUE')                          return `/ncr-capa`;
  if (item.entityType === 'WORKSPACE')                      return `/workspaces/${item.entityId}`;
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, urgent, warning, href,
}: {
  label: string; value: number | string; sub?: string;
  icon: ElementType; urgent?: boolean; warning?: boolean; href?: string;
}) {
  const numVal   = Number(value);
  const isUrgent = urgent  && numVal > 0;
  const isWarn   = warning && numVal > 0 && !isUrgent;

  const borderColor = isUrgent ? 'var(--state-error)'   : isWarn ? 'var(--state-warning)'   : 'var(--border-default)';
  const iconBg      = isUrgent ? 'var(--state-error-soft)' : isWarn ? 'var(--state-warning-soft)' : 'var(--bg-muted)';
  const iconColor   = isUrgent ? 'var(--state-error)'   : isWarn ? 'var(--state-warning)'   : 'var(--text-muted)';
  const numColor    = isUrgent ? 'var(--state-error)'   : isWarn ? 'var(--state-warning)'   : 'var(--text-primary)';

  const inner = (
    <div className="flex min-h-24 flex-col justify-between rounded-xl p-4 transition-shadow hover:shadow-sm"
      style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${borderColor}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-semibold leading-none" style={{ color: numColor }}>{value}</p>
        {sub && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

function WsStatusBadge({ status, label }: { status: WorkspaceStatusRow['operationalStatus']; label: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    INACTIVE:        { color: 'var(--text-muted)',    bg: 'var(--bg-muted)' },
    SETUP_REQUIRED:  { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
    CRITICAL:        { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' },
    NEEDS_ATTENTION: { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
    IN_PROGRESS:     { color: 'var(--accent-primary)', bg: 'var(--accent-soft)' },
    HEALTHY:         { color: 'var(--state-success)', bg: 'var(--state-success-soft)' },
  };
  const s = map[status] ?? { color: 'var(--text-muted)', bg: 'var(--bg-muted)' };
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ color: s.color, backgroundColor: s.bg }}>
      {label}
    </span>
  );
}

// ─── Stale events ─────────────────────────────────────────────────────────────

const STALE_EVENTS = [
  'task.created', 'task.updated', 'task.deleted', 'task.moved',
  'comment.created', 'attachment.created', 'attachment.deleted',
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

  // BAC items (one fetch — no separate BusinessActionCenter component on dashboard)
  const [bacItems, setBacItems]     = useState<ActionItem[]>([]);
  const [bacLoading, setBacLoading] = useState(false);
  const [bacError, setBacError]     = useState(false);

  // Unified Action Center tab
  const [actionTab, setActionTab] = useState<ActionTab>('all');

  // Activity / Notifications tab
  const [feedTab, setFeedTab] = useState<'activity' | 'notifications'>('activity');

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

  const loadBac = useCallback(async () => {
    if (!token) return;
    setBacLoading(true);
    setBacError(false);
    try {
      const p = await apiGet<ActionPreview>('/business-actions/preview', token);
      setBacItems(p.items);
    } catch {
      setBacError(true);
    } finally {
      setBacLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const userRoles = user?.roles ?? [];
    if (!userRoles.some((r) => SUPER_ROLES.includes(r))) return;
    void loadBac();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  useEffect(() => {
    if (!data?.accessibleWorkspaceIds?.length) return;
    data.accessibleWorkspaceIds.forEach((id) => joinWorkspace(id));
  }, [data?.accessibleWorkspaceIds, joinWorkspace]);

  useEffect(() => {
    if (connected && !prevConnectedRef.current && initialLoadDoneRef.current) void load();
    prevConnectedRef.current = connected;
  }, [connected, load]);

  useEffect(() => {
    if (!socket) return;
    const handleStale        = () => setHasUpdates(true);
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

  // ─── Role detection ──────────────────────────────────────────────────────────
  const roles       = user?.roles ?? [];
  const isElevated  = hasAny(roles, ELEVATED);
  const isSuperRole = hasAny(roles, SUPER_ROLES);
  const canReview   = isElevated || roles.includes('DEPARTMENT_MANAGER');
  const isRestricted = !isElevated && !roles.includes('DEPARTMENT_MANAGER') && !roles.includes('DEPARTMENT_USER');

  // ─── Loading / Error ─────────────────────────────────────────────────────────
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
  const totalExpiry  = (taskFileSummary?.expired ?? 0) + (taskFileSummary?.expiringSoon ?? 0);
  const showNoWorkspace = isRestricted && myWorkspacesCount === 0;

  // Approval rows from workspace status (for Approvals tab)
  const approvalWorkspaces = workspaceStatusRows.filter((ws) => (ws.pendingApprovalTasks ?? 0) > 0);
  const totalPendingApprovals = approvalWorkspaces.reduce((s, ws) => s + (ws.pendingApprovalTasks ?? 0), 0);

  // Tab counts for the Unified Action Center
  const tabCounts: Record<ActionTab, number> = {
    all:       bacItems.length + totalPendingApprovals,
    tasks:     filterByTab(bacItems, 'tasks').length,
    approvals: totalPendingApprovals,
    documents: filterByTab(bacItems, 'documents').length,
    issues:    filterByTab(bacItems, 'issues').length,
    expiry:    filterByTab(bacItems, 'expiry').length,
  };

  // ─── Attention items for normal users ────────────────────────────────────────
  const attentionItems: { label: string; count: number; href: string; urgent: boolean }[] = [];
  if (overdueSummary.overdueTasks > 0)
    attentionItems.push({ label: isRestricted ? 'My overdue tasks' : 'Overdue tasks', count: overdueSummary.overdueTasks, href: '/tasks?view=overdue', urgent: true });
  if (ncrCapaSummary.open + ncrCapaSummary.overdue > 0)
    attentionItems.push({ label: isRestricted ? 'My open / overdue issues' : 'Open / overdue issues', count: ncrCapaSummary.open + ncrCapaSummary.overdue, href: '/ncr-capa', urgent: ncrCapaSummary.overdue > 0 });
  if (canReview && pendingReviews.length > 0)
    attentionItems.push({ label: 'Pending document reviews', count: pendingReviews.length, href: '/documents', urgent: false });
  if ((taskFileSummary?.expired ?? 0) > 0)
    attentionItems.push({ label: 'Expired task files', count: taskFileSummary!.expired, href: '/action-center', urgent: true });

  // ─── Header ──────────────────────────────────────────────────────────────────
  const headerTitle    = isSuperRole || isElevated ? 'Business Control Center' : 'My Dashboard';
  const headerSubtitle = isSuperRole
    ? 'Monitor workspaces, tasks, documents, issues, and expiring files.'
    : isElevated
    ? `Welcome back, ${user?.fullName ?? 'User'}.${user?.department ? ` · ${user.department.name}` : ''}`
    : `Welcome back, ${user?.fullName ?? 'User'}.${user?.department ? ` · ${user.department.name}` : ''}`;

  // ─── Shared header block ─────────────────────────────────────────────────────
  const pageHeader = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {isSuperRole || isElevated ? 'BUSINESS OPERATIONS OVERVIEW' : 'MY DASHBOARD'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{headerTitle}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{headerSubtitle}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {connected ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--state-success)' }}>
            <Wifi className="h-3 w-3" />Live
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <WifiOff className="h-3 w-3" />Offline
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
  );

  const updatesBanner = hasUpdates && (
    <div className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)30' }}>
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
          New updates available — data may have changed.
        </span>
      </div>
      <button onClick={() => void load()} disabled={loading}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
        style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ELEVATED / SUPER USER DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  if (isElevated) {
    const tabLabel: Record<ActionTab, string> = {
      all:       'All',
      tasks:     'Tasks',
      approvals: 'Approvals',
      documents: 'Documents',
      issues:    'Issues',
      expiry:    'Expiry',
    };

    const visibleBacItems = actionTab === 'approvals' ? [] : filterByTab(bacItems, actionTab);

    // My Work personal stats
    const myOpenTasks     = myAssignments.length;
    const myWaitingReview = myAssignments.filter((t) => t.status === 'WAITING_REVIEW').length;

    return (
      <div className="flex flex-col gap-5">
        {updatesBanner}
        {pageHeader}

        {/* ── 1. Compact KPI Row ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
            label="Awaiting Review"
            value={taskSummary.waitingReview ?? 0}
            sub={taskSummary.waitingReview ? 'tasks submitted for review' : 'none pending'}
            icon={Clock}
            warning={(taskSummary.waitingReview ?? 0) > 0}
            href="/tasks?view=waiting-review"
          />
          <KpiCard
            label="Overdue Tasks"
            value={overdueSummary.overdueTasks}
            sub={overdueSummary.overdueTasks > 0 ? 'require immediate action' : 'none overdue'}
            icon={AlertTriangle}
            urgent={overdueSummary.overdueTasks > 0}
            href="/tasks?view=overdue"
          />
          <KpiCard
            label="Open Issues"
            value={openIssues}
            sub={`${ncrCapaSummary.open} open · ${ncrCapaSummary.overdue} overdue`}
            icon={ShieldAlert}
            urgent={ncrCapaSummary.overdue > 0}
            warning={openIssues > 0 && ncrCapaSummary.overdue === 0}
            href="/ncr-capa"
          />
          <KpiCard
            label="Expiring / Expired Files"
            value={totalExpiry}
            sub={`${taskFileSummary?.expired ?? 0} expired · ${taskFileSummary?.expiringSoon ?? 0} expiring`}
            icon={CalendarDays}
            urgent={(taskFileSummary?.expired ?? 0) > 0}
            warning={(taskFileSummary?.expiringSoon ?? 0) > 0 && (taskFileSummary?.expired ?? 0) === 0}
          />
        </div>

        {/* ── 2. Unified Action Center ── */}
        <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: bacItems.length > 0 || totalPendingApprovals > 0 ? 'var(--state-error-soft)' : 'var(--bg-muted)',
                  color: bacItems.length > 0 || totalPendingApprovals > 0 ? 'var(--state-error)' : 'var(--text-muted)',
                }}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Action Center</h2>
              {!bacLoading && (bacItems.length > 0 || totalPendingApprovals > 0) && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                  {tabCounts.all}
                </span>
              )}
            </div>
            <Link href="/action-center"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}>
              <Zap className="h-3 w-3" /> Full Action Center <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-5 pt-3 pb-0 overflow-x-auto">
            {(['all', 'tasks', 'approvals', 'documents', 'issues', 'expiry'] as ActionTab[]).map((tab) => {
              const count = tabCounts[tab];
              const active = actionTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActionTab(tab)}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {tabLabel[tab]}
                  {count > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                      style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-muted)',
                        color: active ? '#fff' : 'var(--text-muted)',
                      }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-4">
            {bacLoading ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading action items…</span>
              </div>
            ) : bacError ? (
              <div className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ backgroundColor: 'var(--state-error-soft)' }}>
                <span className="text-sm" style={{ color: 'var(--state-error)' }}>Unable to load action items.</span>
                <button onClick={() => void loadBac()}
                  className="text-xs underline" style={{ color: 'var(--state-error)' }}>Retry</button>
              </div>
            ) : (
              <>
                {/* Approvals tab — from workspace pending approval counts */}
                {actionTab === 'approvals' && (
                  approvalWorkspaces.length === 0 ? (
                    <div className="flex items-center gap-2 py-4">
                      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--state-success)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        No task approval requests pending.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {approvalWorkspaces.map((ws) => (
                        <div key={ws.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)20' }}>
                          <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {ws.pendingApprovalTasks} task{ws.pendingApprovalTasks !== 1 ? 's' : ''} pending approval
                            </span>
                            <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ws.name}</span>
                          </div>
                          <Link href={`/workspaces/${ws.id}`}
                            className="shrink-0 text-xs font-medium flex items-center gap-0.5"
                            style={{ color: 'var(--accent-primary)' }}>
                            Review <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* All other tabs — BAC items */}
                {actionTab !== 'approvals' && (
                  visibleBacItems.length === 0 ? (
                    <div className="flex items-center gap-2 py-4">
                      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--state-success)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {actionTab === 'all'
                          ? "You're all caught up. No business actions require attention."
                          : `No ${tabLabel[actionTab].toLowerCase()} actions require attention.`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {visibleBacItems.slice(0, 8).map((item) => {
                        const { color, bg } = ruleColorVars(item.ruleKey);
                        const link = actionLink(item);
                        return (
                          <div key={item.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                            style={{ backgroundColor: bg, border: `1px solid ${color}20` }}>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                              style={{ color }}>
                              {RULE_LABELS[item.ruleKey]}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                                {item.title}
                              </span>
                              {item.reason && (
                                <span className="text-xs truncate block" style={{ color: 'var(--text-secondary)' }}>
                                  {item.reason}
                                </span>
                              )}
                            </div>
                            {item.workspaceName && (
                              <span className="shrink-0 text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                                {item.workspaceName}
                              </span>
                            )}
                            {link ? (
                              <Link href={link}
                                className="shrink-0 text-xs font-medium flex items-center gap-0.5"
                                style={{ color }}>
                                View <ChevronRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="shrink-0 w-10" />
                            )}
                          </div>
                        );
                      })}
                      {visibleBacItems.length > 8 && (
                        <Link href="/action-center"
                          className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium"
                          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)' }}>
                          +{visibleBacItems.length - 8} more in Full Action Center <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

        {/* ── 3. Workspace Health + My Work ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Workspace Health (2/3) */}
          {workspaceStatusRows.length > 0 && (
            <div className="lg:col-span-2 rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workspace Health</h2>
                </div>
                <Link href="/workspaces" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                  All workspaces <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                      {['Workspace', 'Open', 'Awaiting', 'Overdue', 'Issues', 'Expiry', 'Members', 'Last Updated', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceStatusRows.map((ws) => (
                      <tr key={ws.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-3 py-2.5 max-w-[160px]">
                          <Link href={`/workspaces/${ws.id}`}
                            className="font-medium truncate block hover:underline"
                            style={{ color: 'var(--accent-primary)' }}>
                            {ws.name}
                          </Link>
                          {ws.department && (
                            <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{ws.department}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.openTasks > 0 ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                          {ws.openTasks || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.waitingReviewTasks > 0 ? 'var(--state-warning)' : 'var(--text-disabled)' }}>
                          {ws.waitingReviewTasks || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-disabled)' }}>
                          {ws.overdueTasks || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.openIssues > 0 ? 'var(--state-error)' : 'var(--text-disabled)' }}>
                          {ws.openIssues || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium"
                          style={{ color: ws.expiredFiles > 0 ? 'var(--state-error)' : ws.expiringFiles > 0 ? 'var(--state-warning)' : 'var(--text-disabled)' }}>
                          {ws.expiredFiles > 0 ? ws.expiredFiles : ws.expiringFiles > 0 ? ws.expiringFiles : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />{ws.memberCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {ws.lastActivity ? (
                            <div title={timeAgo(ws.lastActivity)}>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {fmtKuwaitDate(ws.lastActivity)}
                              </div>
                              <div className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                                {fmtKuwaitTime(ws.lastActivity)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)' }}>—</span>
                          )}
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

          {/* My Work panel (1/3) */}
          <div className={workspaceStatusRows.length > 0 ? '' : 'lg:col-span-1'}>
            <div className="rounded-xl h-full flex flex-col"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Work</h2>
                </div>
                <Link href="/tasks" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                  View tasks <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Personal stats */}
              <div className="px-5 py-3 border-b grid grid-cols-2 gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                {[
                  { label: 'Assigned to Me', value: myOpenTasks, href: '/tasks', urgent: false },
                  { label: 'Awaiting My Review', value: myWaitingReview, href: '/tasks?view=waiting-review', urgent: myWaitingReview > 0 },
                  { label: 'Pending Approvals', value: totalPendingApprovals, href: '#', urgent: totalPendingApprovals > 0 },
                  { label: 'Overdue (mine)', value: myAssignments.filter((t) => isOverdue(t.dueDate, t.status)).length, href: '/tasks?view=overdue', urgent: true },
                ].map((s) => (
                  <Link key={s.label} href={s.href}
                    className="flex flex-col rounded-lg p-2 transition-colors"
                    style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    <span className="text-xl font-semibold"
                      style={{ color: s.urgent && s.value > 0 ? 'var(--state-error)' : 'var(--text-primary)' }}>
                      {s.value}
                    </span>
                  </Link>
                ))}
              </div>

              {/* My assigned task list */}
              <div className="flex-1 overflow-hidden">
                {myAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                    <CheckCircle2 className="h-6 w-6 mb-2" style={{ color: 'var(--state-success)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No open tasks assigned to you.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {myAssignments.slice(0, 5).map((t) => {
                      const overdue  = isOverdue(t.dueDate, t.status);
                      const sc       = statusColor(t.status);
                      const taskLink = t.workspace?.id ? `/workspaces/${t.workspace.id}?task=${t.id}` : '/tasks';
                      return (
                        <Link key={t.id} href={taskLink}
                          className="px-5 py-2.5 flex items-start gap-2 block transition-colors"
                          style={{ color: 'inherit' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '')}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate"
                              style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}>
                              {overdue && '⚠ '}{t.title}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {t.workspace?.name ?? '—'}
                            </p>
                          </div>
                          <span className="mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ color: sc.color, backgroundColor: sc.bg }}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </Link>
                      );
                    })}
                    {myAssignments.length > 5 && (
                      <div className="px-5 py-2">
                        <Link href="/tasks" className="text-xs" style={{ color: 'var(--accent-primary)' }}>
                          +{myAssignments.length - 5} more tasks
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Activity / Notifications (tabbed) ── */}
        <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-1">
              {(['activity', 'notifications'] as const).map((tab) => {
                const active = feedTab === tab;
                const label  = tab === 'activity' ? 'Business Activity' : 'Notifications';
                const badge  = tab === 'notifications' && unreadCount > 0 ? unreadCount : 0;
                return (
                  <button key={tab} onClick={() => setFeedTab(tab)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-secondary)',
                    }}>
                    {tab === 'activity' ? <Activity className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                    {label}
                    {badge > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                        style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--state-error-soft)',
                          color: active ? '#fff' : 'var(--state-error)',
                        }}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Link
              href={feedTab === 'activity' ? '/workspaces' : '/notifications'}
              className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {feedTab === 'activity' ? (
              recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                  <Activity className="h-6 w-6 mb-2" style={{ color: 'var(--text-disabled)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent business activity.</p>
                </div>
              ) : (
                recentActivity.slice(0, 8).map((a) => {
                  const cleanType = a.entityType
                    .replace('NCR_CAPA', 'Issue').replace(/_/g, ' ')
                    .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                        style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                        {a.actor.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">{a.actor.fullName}</span>
                          {' '}{a.summary}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {cleanType} · {timeAgo(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              notificationSummary.recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                  <Bell className="h-6 w-6 mb-2" style={{ color: 'var(--text-disabled)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent notifications.</p>
                </div>
              ) : (
                notificationSummary.recent.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 px-5 py-3">
                    {!n.readAt && (
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent-primary)' }} />
                    )}
                    <div className={`flex-1 min-w-0 ${n.readAt ? 'pl-3.5' : ''}`}>
                      <p className="text-xs font-medium truncate"
                        style={{ color: n.readAt ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NORMAL USER DASHBOARD (personal, role-scoped)
  // ════════════════════════════════════════════════════════════════════════════

  if (showNoWorkspace) {
    return (
      <div className="flex flex-col gap-5">
        {updatesBanner}
        {pageHeader}
        <div className="flex flex-col items-center justify-center rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No workspace access yet</h3>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            You are not added to any workspace yet. Please contact your administrator or manager.
          </p>
          <Link href="/notifications"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
            <Bell className="h-4 w-4" /> Check notifications
          </Link>
        </div>
      </div>
    );
  }

  // Normal user KPIs
  return (
    <div className="flex flex-col gap-5">
      {updatesBanner}
      {pageHeader}

      {/* Personal KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Accessible Workspaces" value={myWorkspacesCount} sub="assigned to me" icon={Building2} href="/workspaces" />
        <KpiCard label="My Open Tasks" value={taskSummary.myAssigned} sub={taskSummary.myAssigned === 0 ? 'none assigned' : `${taskSummary.inProgress ?? 0} in progress`} icon={ListChecks} href="/tasks?view=open" />
        <KpiCard label="My Overdue Tasks" value={overdueSummary.overdueTasks} sub={overdueSummary.overdueTasks > 0 ? 'need action now' : 'none overdue'} icon={Clock} urgent={overdueSummary.overdueTasks > 0} href="/tasks?view=overdue" />
        {canReview ? (
          <KpiCard label="Docs Under Review" value={documentSummary.underReview} sub="awaiting your review" icon={FileText} warning={documentSummary.underReview > 0} href="/documents" />
        ) : (
          <KpiCard label="My Waiting Review" value={taskSummary.waitingReview ?? 0} sub={taskSummary.waitingReview ? 'tasks pending review' : 'none pending'} icon={RefreshCw} warning={(taskSummary.waitingReview ?? 0) > 0} href="/tasks?view=waiting-review" />
        )}
        <KpiCard label="My Open Issues" value={ncrCapaSummary.open + ncrCapaSummary.inProgress} sub={ncrCapaSummary.overdue > 0 ? `${ncrCapaSummary.overdue} overdue` : 'no overdue'} icon={AlertTriangle} urgent={ncrCapaSummary.overdue > 0} href="/ncr-capa" />
        <KpiCard label="Unread Notifications" value={unreadCount} sub="unread messages" icon={Bell} warning={unreadCount > 0} href="/notifications" />
      </div>

      {/* Attention items */}
      {attentionItems.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--state-error)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>What needs your attention</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.href}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors hover:opacity-90"
                style={{
                  backgroundColor: item.urgent ? 'var(--state-error-soft)' : 'var(--state-warning-soft)',
                  border: item.urgent ? '1px solid var(--state-error)20' : '1px solid var(--state-warning)20',
                }}>
                <span className="text-sm font-medium" style={{ color: item.urgent ? 'var(--state-error)' : 'var(--state-warning)' }}>
                  {item.label}
                </span>
                <span className="text-sm font-semibold flex items-center gap-0.5"
                  style={{ color: item.urgent ? 'var(--state-error)' : 'var(--state-warning)' }}>
                  {item.count} <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* My Assigned Tasks */}
          <div className="rounded-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Assigned Tasks</h2>
              </div>
              <Link href="/tasks" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                All my tasks <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {myAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                <CheckCircle2 className="h-7 w-7 mb-2" style={{ color: 'var(--state-success)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No open tasks assigned to you.</p>
                <Link href="/tasks" className="mt-2 text-xs" style={{ color: 'var(--accent-primary)' }}>View my tasks</Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {myAssignments.map((t) => {
                  const overdue  = isOverdue(t.dueDate, t.status);
                  const sc       = statusColor(t.status);
                  const taskLink = t.workspace?.id ? `/workspaces/${t.workspace.id}?task=${t.id}` : '/tasks';
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
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Recent Activity</h2>
              </div>
            </div>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                <Activity className="h-6 w-6 mb-2" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity recorded yet.</p>
              </div>
            ) : (
              <div className="px-5 py-3 space-y-3">
                {recentActivity.slice(0, 8).map((a) => {
                  const cleanType = a.entityType.replace('NCR_CAPA', 'Issue').replace(/_/g, ' ')
                    .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Pending Actions — document reviews */}
          {canReview && (
            <div className="rounded-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Actions</h2>
                </div>
                <Link href="/documents" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                  Documents <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {pendingReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-6 text-center">
                  <CheckCircle2 className="h-5 w-5 mb-1.5" style={{ color: 'var(--state-success)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No documents awaiting review.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {pendingReviews.map((r) => (
                    <div key={`${r.type}-${r.id}`} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-xs px-1.5 py-0.5 rounded shrink-0"
                          style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>DOC</span>
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
            </div>
          )}

          {/* Issues & Actions — compact summary */}
          <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Issues &amp; Actions</h2>
              </div>
              <Link href="/ncr-capa" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {ncrCapaSummary.total === 0 ? (
              <div className="px-5 py-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--state-success)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No issues raised yet.</span>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-2">
                {[
                  { label: 'Open',        value: ncrCapaSummary.open,       color: 'var(--state-error)' },
                  { label: 'In Progress', value: ncrCapaSummary.inProgress, color: 'var(--state-warning)' },
                  { label: 'Submitted',   value: ncrCapaSummary.submitted,  color: 'var(--state-info)' },
                  { label: 'Verified',    value: ncrCapaSummary.verified,   color: 'var(--state-success)' },
                  { label: 'Overdue',     value: ncrCapaSummary.overdue,    color: 'var(--state-error)' },
                ].filter((s) => s.value > 0).map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="rounded-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Notifications</h2>
              </div>
              <Link href="/notifications" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {notificationSummary.recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-6 text-center">
                <Bell className="h-5 w-5 mb-1.5" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent notifications.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {notificationSummary.recent.slice(0, 5).map((n) => (
                  <div key={n.id} className="px-4 py-2.5 flex items-start gap-2">
                    {!n.readAt && (
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent-primary)' }} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
