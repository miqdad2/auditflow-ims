'use client';

import {
  useState, useEffect, useCallback, useRef,
  type ElementType, type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  CheckCircle2, AlertTriangle, Clock, FileText,
  RefreshCw, ChevronRight,
  Bell, Activity, ListChecks,
  PlusCircle, Upload,
  Wifi, WifiOff, Building2, Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, ApiError } from '@/lib/api';
import { useSocket } from '@/lib/socket-provider';
import type { DashboardOverview } from '@/features/dashboard/types';

// ─── Role helpers ──────────────────────────────────────────────────────────────

const ELEVATED = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
const DEPT_MGR  = ['DEPARTMENT_MANAGER'];
const DEPT_USER = ['DEPARTMENT_USER'];

function hasAny(roles: string[], list: string[]): boolean {
  return roles.some((r) => list.includes(r));
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, urgent, href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: ElementType;
  urgent?: boolean;
  href?: string;
}) {
  const hasUrgentValue = urgent && Number(value) > 0;

  const card = (
    <div
      className="flex min-h-32 flex-col justify-between rounded-xl p-4 transition-shadow hover:shadow-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: hasUrgentValue
          ? '1px solid var(--state-error)'
          : '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: hasUrgentValue ? 'var(--state-error-soft)' : 'var(--bg-muted)',
            color: hasUrgentValue ? 'var(--state-error)' : 'var(--text-muted)',
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-semibold leading-none"
          style={{ color: hasUrgentValue ? 'var(--state-error)' : 'var(--text-primary)' }}
        >
          {value}
        </p>
        {sub && <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}

function SectionCard({ title, icon: Icon, children, href, linkLabel }: {
  title: string; icon: ElementType; children: ReactNode; href?: string; linkLabel?: string;
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
        {href && (
          <Link href={href} className="text-xs flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
            {linkLabel ?? 'View all'} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EmptyState({ message, actionLabel, href, icon: Icon = PlusCircle }: {
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

// Attention item row in "What needs your attention"
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
      <span className="text-sm font-semibold" style={{ color: urgent ? 'var(--state-error)' : 'var(--state-warning)' }}>
        {count} <ChevronRight className="inline h-3 w-3" />
      </span>
    </Link>
  );
}

// ─── Events that can trigger a stale indicator ────────────────────────────────
const STALE_EVENTS = [
  'task.created', 'task.updated', 'task.deleted', 'task.moved',
  'comment.created',
  'attachment.created', 'attachment.deleted',
  'document.created', 'document.updated',
  'evidence.updated',
  'ncr.created', 'ncr.updated',
  'workspace.member.added', 'workspace.member.removed',
  'linked_record.created', 'linked_record.deleted',
] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { socket, connected, joinWorkspace } = useSocket();

  const [data, setData]             = useState<DashboardOverview | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [localUnread, setLocalUnread] = useState<number | null>(null); // overrides data.notificationSummary.unread when set

  // Track initial load and reconnect detection
  const initialLoadDoneRef  = useRef(false);
  const prevConnectedRef    = useRef(false);
  const joinedRoomsRef      = useRef<string[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setHasUpdates(false);
    try {
      const json = await apiGet<DashboardOverview>('/dashboard/overview', token);
      setData(json);
      setLastRefresh(new Date());
      setLocalUnread(null); // reset — data has fresh count
      initialLoadDoneRef.current = true;
    } catch (err) {
      setError(friendlyApiError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => { void load(); }, [load]);

  // Join accessible workspace rooms when data arrives
  useEffect(() => {
    if (!data?.accessibleWorkspaceIds?.length) return;
    joinedRoomsRef.current = data.accessibleWorkspaceIds;
    data.accessibleWorkspaceIds.forEach((id) => joinWorkspace(id));
  }, [data?.accessibleWorkspaceIds, joinWorkspace]);

  // Reconnect: refresh dashboard when socket reconnects after being disconnected
  useEffect(() => {
    if (connected && !prevConnectedRef.current && initialLoadDoneRef.current) {
      void load();
    }
    prevConnectedRef.current = connected;
  }, [connected, load]);

  // Socket event listeners for stale detection
  useEffect(() => {
    if (!socket) return;

    const handleStale = () => setHasUpdates(true);
    const handleNotification = () => {
      setLocalUnread((c) => (c ?? 0) + 1);
      setHasUpdates(true);
    };
    const handleAccessRemoved = () => {
      // Refresh when removed from a workspace
      void load();
    };

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
  const roles       = user?.roles ?? [];
  const isElevated  = hasAny(roles, ELEVATED);
  const isDeptMgr   = hasAny(roles, DEPT_MGR);
  const isDeptUser  = hasAny(roles, DEPT_USER);
  const isRestricted = !isElevated && !isDeptMgr && !isDeptUser; // STAFF, AUDITOR_VIEWER
  const canReview   = isElevated || isDeptMgr;

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)' }}>
        <AlertTriangle className="mx-auto mb-2 h-6 w-6" style={{ color: 'var(--state-error)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--state-error)' }}>{error}</p>
        <button
          onClick={() => void load()}
          className="mt-3 text-xs underline"
          style={{ color: 'var(--state-error)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const {
    taskSummary, documentSummary, ncrCapaSummary,
    overdueSummary, recentActivity, myAssignments, pendingReviews,
    notificationSummary, myWorkspacesCount,
  } = data;

  const unreadCount = localUnread ?? notificationSummary.unread;

  // ─── "What needs your attention" items ──────────────────────────────────────
  const attentionItems: { label: string; count: number; href: string; urgent: boolean }[] = [];
  if (overdueSummary.overdueTasks > 0)
    attentionItems.push({ label: 'Overdue tasks', count: overdueSummary.overdueTasks, href: '/tasks', urgent: true });
  if (ncrCapaSummary.open + ncrCapaSummary.overdue > 0)
    attentionItems.push({ label: 'Open / overdue issues', count: ncrCapaSummary.open + ncrCapaSummary.overdue, href: '/ncr-capa', urgent: ncrCapaSummary.overdue > 0 });
  if (canReview && pendingReviews.length > 0)
    attentionItems.push({ label: 'Pending document reviews', count: pendingReviews.length, href: '/documents', urgent: false });
  if (documentSummary.expiringSoon > 0)
    attentionItems.push({ label: 'Documents expiring within 30 days', count: documentSummary.expiringSoon, href: '/documents', urgent: false });

  // ─── No-workspace empty state for restricted users ───────────────────────────
  const showNoWorkspace = isRestricted && myWorkspacesCount === 0;

  return (
    <div className="flex flex-col gap-5">

      {/* ── New updates available banner ── */}
      {hasUpdates && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)30' }}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              New updates available — data may have changed.
            </span>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
            disabled={loading}
          >
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh dashboard
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
            {isElevated ? 'Audit readiness overview' : 'My dashboard'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Welcome back, {user?.fullName ?? 'User'}.
            {user?.department && <span> · {user.department.name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Live / disconnected indicator */}
          {connected ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--state-success)' }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--state-success)' }} />
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <WifiOff className="h-3 w-3" />
              Offline
            </div>
          )}

          {lastRefresh && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Refresh dashboard"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── No workspace state for staff ── */}
      {showNoWorkspace && (
        <div
          className="flex flex-col items-center justify-center rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
          >
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            No workspace access yet
          </h3>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            You are not added to any workspace yet. Please contact your administrator or manager to be added as a workspace member.
          </p>
          <Link
            href="/notifications"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
          >
            <Bell className="h-4 w-4" />
            Check notifications
          </Link>
        </div>
      )}

      {/* ── Main dashboard content ── */}
      {!showNoWorkspace && (
        <>
          {/* ── What needs your attention ── */}
          {attentionItems.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
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
          )}

          {/* ── KPI cards row ── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            {isRestricted ? (
              // Restricted users: simpler KPI set
              <>
                <KpiCard
                  label="My Workspaces"
                  value={myWorkspacesCount}
                  sub="accessible"
                  icon={Building2}
                  href="/workspaces"
                />
                <KpiCard
                  label="My Tasks"
                  value={taskSummary.myAssigned}
                  sub={taskSummary.overdue > 0 ? `${taskSummary.overdue} overdue` : 'No overdue'}
                  icon={ListChecks}
                  urgent={taskSummary.overdue > 0}
                  href="/tasks"
                />
                <KpiCard
                  label="Overdue Tasks"
                  value={overdueSummary.overdueTasks}
                  sub="need action"
                  icon={Clock}
                  urgent
                  href="/tasks"
                />
                <KpiCard
                  label="Docs Under Review"
                  value={documentSummary.underReview}
                  sub="pending approval"
                  icon={FileText}
                  href="/documents"
                />
                <KpiCard
                  label="Open Issues"
                  value={ncrCapaSummary.open + ncrCapaSummary.inProgress}
                  sub={ncrCapaSummary.overdue > 0 ? `${ncrCapaSummary.overdue} overdue` : 'No overdue'}
                  icon={AlertTriangle}
                  urgent={ncrCapaSummary.overdue > 0}
                  href="/ncr-capa"
                />
                <KpiCard
                  label="Notifications"
                  value={unreadCount}
                  sub="unread"
                  icon={Bell}
                  href="/notifications"
                />
              </>
            ) : (
              // Full KPI set for elevated / dept roles
              <>
                <KpiCard
                  label="Open Issues"
                  value={ncrCapaSummary.open + ncrCapaSummary.inProgress + ncrCapaSummary.overdue}
                  sub={ncrCapaSummary.overdue > 0 ? `${ncrCapaSummary.overdue} overdue` : 'No overdue'}
                  icon={AlertTriangle}
                  urgent
                  href="/ncr-capa"
                />
                <KpiCard
                  label="Overdue Items"
                  value={overdueSummary.total}
                  sub={`${overdueSummary.overdueTasks} tasks · ${overdueSummary.overdueNcrCapa} issues`}
                  icon={Clock}
                  urgent
                />
                <KpiCard
                  label="My Tasks"
                  value={taskSummary.myAssigned}
                  sub={taskSummary.overdue > 0 ? `${taskSummary.overdue} overdue` : 'No overdue'}
                  icon={ListChecks}
                  urgent={taskSummary.overdue > 0}
                  href="/tasks"
                />
                <KpiCard
                  label="Docs Under Review"
                  value={documentSummary.underReview}
                  sub={documentSummary.expiringSoon > 0 ? `${documentSummary.expiringSoon} expiring soon` : undefined}
                  icon={FileText}
                  href="/documents"
                />
                <KpiCard
                  label="Approved Docs"
                  value={documentSummary.approved}
                  sub={`of ${documentSummary.total} total`}
                  icon={CheckCircle2}
                  href="/documents"
                />
                <KpiCard
                  label="Notifications"
                  value={unreadCount}
                  sub="unread"
                  icon={Bell}
                  href="/notifications"
                />
              </>
            )}
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            {/* ── Left column (2/3) ── */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* My Assigned Tasks */}
              <SectionCard title="My Assigned Tasks" icon={ListChecks} href="/tasks" linkLabel="All tasks">
                {myAssignments.length === 0 ? (
                  <EmptyState
                    message="No open tasks assigned to you."
                    actionLabel="View all tasks"
                    href="/tasks"
                    icon={ListChecks}
                  />
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                    {myAssignments.map((t) => {
                      const overdue = isOverdue(t.dueDate, t.status);
                      const sc      = statusColor(t.status);
                      return (
                        <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}
                            >
                              {t.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {t.workspace?.name ?? '—'} · {t.taskList?.name ?? '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ color: priorityColor(t.priority), backgroundColor: 'var(--bg-muted)' }}
                            >
                              {t.priority}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ color: sc.color, backgroundColor: sc.bg }}
                            >
                              {t.status.replace(/_/g, ' ')}
                            </span>
                            {t.dueDate && (
                              <span
                                className="text-xs"
                                style={{ color: overdue ? 'var(--state-error)' : 'var(--text-muted)' }}
                              >
                                {overdue ? '⚠ ' : ''}{new Date(t.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Recent Activity */}
              <SectionCard title="Recent Activity" icon={Activity}>
                {recentActivity.length === 0 ? (
                  <EmptyState
                    message="No activity recorded yet."
                    actionLabel="Open workspaces"
                    href="/workspaces"
                    icon={Activity}
                  />
                ) : (
                  <div className="px-5 py-3 space-y-3">
                    {(recentActivity as Array<{ id: string; summary: string; entityType: string; createdAt: string; actor: { fullName: string } }>).map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
                        >
                          {a.actor.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium">{a.actor.fullName}</span>
                            {' '}{a.summary}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {a.entityType} · {timeAgo(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* ── Right column (1/3) ── */}
            <div className="flex flex-col gap-5">

              {/* Pending Reviews — managers/elevated only */}
              {canReview && pendingReviews.length > 0 && (
                <SectionCard title="Pending Reviews" icon={Clock} href="/documents" linkLabel="Documents">
                  <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                    {pendingReviews.map((r) => (
                      <div key={`${r.type}-${r.id}`} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-0.5 text-xs px-1.5 py-0.5 rounded shrink-0"
                            style={{
                              color: r.type === 'DOCUMENT' ? 'var(--accent-primary)' : 'var(--state-warning)',
                              backgroundColor: r.type === 'DOCUMENT' ? 'var(--accent-soft)' : 'var(--state-warning-soft)',
                            }}
                          >
                            {r.type === 'DOCUMENT' ? 'DOC' : 'EVD'}
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
                </SectionCard>
              )}

              {/* Issues & Actions Summary */}
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
                      { label: 'Rejected',    value: ncrCapaSummary.rejected,   color: 'var(--state-error)' },
                      { label: 'Overdue',     value: ncrCapaSummary.overdue,    color: 'var(--state-error)' },
                    ].filter((s) => s.value > 0).map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.round((s.value / ncrCapaSummary.total) * 100)}%`, backgroundColor: s.color }}
                            />
                          </div>
                          <span className="font-semibold w-5 text-right" style={{ color: s.color }}>{s.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Document Summary */}
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
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.round((s.value / documentSummary.total) * 100)}%`, backgroundColor: s.color }}
                            />
                          </div>
                          <span className="font-semibold w-5 text-right" style={{ color: s.color }}>{s.value}</span>
                        </div>
                      </div>
                    ))}
                    {documentSummary.expiringSoon > 0 && (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)' }}>
                        ⚠ {documentSummary.expiringSoon} document{documentSummary.expiringSoon > 1 ? 's' : ''} expiring within 30 days
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Notifications */}
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
                          <p className="text-xs font-medium truncate" style={{ color: n.readAt ? 'var(--text-muted)' : 'var(--text-primary)' }}>
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
