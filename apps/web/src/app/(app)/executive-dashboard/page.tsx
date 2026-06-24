'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Activity, Clock, FileText,
  Users, Shield, ChevronRight, Building2, Loader2,
  AlertCircle, Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, ApiError } from '@/lib/api';
import { useSocket } from '@/lib/socket-provider';
import { useRealtimeInvalidation } from '@/lib/use-realtime-invalidation';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutiveSummary {
  complianceHealth: number | null;  // null = N/A (no measurable data)
  activeWorkspaces: number;
  criticalIssues: number;
  overdueActions: number;
  pendingDecisionsCount: number;
  expiringFiles: number;
  tasksAwaitingReview: number;
  completionRate: number | null;    // null = N/A (no tasks)
}

interface AttentionItem {
  id: string;
  type: string;
  title: string;
  workspace: string | null;
  department: string | null;
  responsible: string | null;
  severity: string;
  overdueAge: string | null;
  action: string;
}

interface OrgHealthRow {
  workspaceId: string;
  workspaceName: string;
  department: string | null;
  health: string;
  healthLabel: string;
  progress: number;
  openTasks: number;
  overdueTasks: number;
  criticalIssues: number;
  totalIssues: number;
}

interface PendingDecision {
  type: string;
  id: string;
  title: string;
  department: string | null;
  workspace: string | null;
  requester: string;
  submittedAt: string;
  priority: string;
}

interface Trends {
  completedThisWeek: number;
  completedLastWeek: number;
  weeklyTrend: number | null;
  evidenceReadiness: number | null;   // null = N/A
  docApprovalRate: number | null;     // null = N/A
  ncrResolutionRate: number | null;   // null = N/A
}

interface DeptPerformance {
  departmentId: string;
  departmentName: string;
  completionRate: number | null;  // null = N/A
  overdueCount: number;
  issueCount: number;
}

interface SignificantActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  timestamp: string;
}

interface ExecutiveData {
  summary: ExecutiveSummary;
  attentionItems: AttentionItem[];
  organizationHealth: OrgHealthRow[];
  pendingDecisions: PendingDecision[];
  trends: Trends;
  departmentPerformance: DeptPerformance[];
  significantActivity: SignificantActivity[];
  generatedAt: string;
}

// No elevated-role check — access is controlled by dashboardExperience === EXECUTIVE.

// ─── Helper: health color ─────────────────────────────────────────────────────
function healthColor(health: string): { color: string; bg: string } {
  switch (health) {
    case 'ON_TRACK':  return { color: 'var(--state-success)',  bg: 'var(--state-success-soft)' };
    case 'ATTENTION': return { color: 'var(--state-warning)',  bg: 'var(--state-warning-soft)' };
    case 'AT_RISK':   return { color: '#d97706',               bg: '#fef3c7' };
    case 'CRITICAL':  return { color: 'var(--state-error)',    bg: 'var(--state-error-soft)' };
    default:          return { color: 'var(--text-muted)',     bg: 'var(--bg-muted)' };
  }
}

function severityColor(sev: string): { color: string; bg: string } {
  switch (sev) {
    case 'CRITICAL': return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' };
    case 'HIGH':     return { color: '#d97706',              bg: '#fef3c7' };
    default:         return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)' };
  }
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Realtime events ──────────────────────────────────────────────────────────
const EXEC_EVENTS = [
  'task.created', 'task.updated', 'task.deleted',
  'document.updated',
  'issue.created', 'issue.updated',
  'file.updated',
  'workspace.updated',
  'notification.created',
] as const;

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtMetric(v: number | null, suffix = ''): string {
  return v === null ? 'N/A' : `${v}${suffix}`;
}

function metricColor(v: number | null, good = 80, warn = 60): string {
  if (v === null) return 'var(--text-muted)';
  if (v >= good)  return 'var(--state-success)';
  if (v >= warn)  return '#d97706';
  return 'var(--state-error)';
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, subtext, color, icon: Icon, trend,
}: {
  label: string;
  value: string | number | null;
  subtext?: string;
  color?: string;
  icon: React.ElementType;
  trend?: number | null;
}) {
  const displayValue = value === null ? 'N/A' : value;
  const displayColor = value === null ? 'var(--text-disabled)' : (color ?? 'var(--text-primary)');
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon className="h-4 w-4" style={{ color: displayColor }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: displayColor }}>
          {displayValue}
        </div>
        {value === null ? (
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-disabled)' }}>No measurable data</p>
        ) : (subtext || (trend !== null && trend !== undefined)) ? (
          <div className="mt-1 flex items-center gap-2">
            {subtext && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtext}</span>}
            {trend !== null && trend !== undefined && (
              <span className="flex items-center gap-0.5 text-xs font-medium"
                style={{ color: trend >= 0 ? 'var(--state-success)' : 'var(--state-error)' }}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}% vs last week
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { connected } = useSocket();

  const [data, setData]         = useState<ExecutiveData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const fetchingRef = useRef(false);

  // ─── Access guard — dashboardExperience only, no role requirement ────────
  const isExecutive = user?.dashboardExperience === 'EXECUTIVE';

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.mustChangePassword) { router.replace('/change-password'); return; }
  }, [user, isLoading, router]);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading((prev) => prev);
    try {
      const result = await apiGet<ExecutiveData>('/dashboard/executive', token);
      setData(result);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuwait' }));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        setError('access_denied');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load executive summary');
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ─── Realtime invalidation ────────────────────────────────────────────────
  useRealtimeInvalidation({
    events: EXEC_EVENTS,
    onInvalidate: fetchData,
    debounceMs: 1000,
  });

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || (!data && loading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  // ─── Access denied — Standard users navigating here directly ────────────
  if (error === 'access_denied' || (!isLoading && user && !isExecutive)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Lock className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Access Denied</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Executive Dashboard is not enabled for this account.
        </p>
        <Link href="/dashboard"
          className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary)' }}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error && error !== 'access_denied') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button onClick={() => void fetchData()}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary)' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, attentionItems, organizationHealth, pendingDecisions, trends, departmentPerformance, significantActivity } = data;

  // ─── Zero-workspace state ─────────────────────────────────────────────────
  // When no accessible workspaces: render only the premium empty state.
  // Do NOT render KPI cards or sections — they would show misleading zeros.
  const hasNoWorkspaceAccess = summary.activeWorkspaces === 0 && organizationHealth.length === 0;
  const canManageUsers = user?.permissions?.includes('users.manage') ?? false;

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Executive Operations &amp; Compliance Overview
          </h1>
          {!hasNoWorkspaceAccess && (
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Real-time visibility into organizational performance, compliance risks, pending decisions, and operational priorities.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: connected ? 'var(--state-success)' : 'var(--state-error)' }}>
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? 'Live' : 'Reconnecting…'}
          </div>
          {lastUpdated && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {lastUpdated}</span>
          )}
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-60"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── No-workspace premium empty state ────────────────────────────────── */}
      {hasNoWorkspaceAccess && (
        <div className="rounded-xl border p-10 flex flex-col items-center gap-4 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--bg-muted)' }}>
            <Building2 className="h-7 w-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              No management workspaces assigned
            </p>
            <p className="mt-1.5 text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
              This executive account does not currently have access to any operational workspaces.
              Assign approved workspaces to display organizational performance, compliance risks,
              pending decisions, and key priorities.
            </p>
          </div>
          {canManageUsers ? (
            <Link href="/users"
              className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}>
              Manage Users &amp; Workspace Access
            </Link>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>
              Contact the system administrator to request workspace visibility.
            </p>
          )}
        </div>
      )}

      {/* ── KPI Cards (hidden when no workspace access) ─────────────────────── */}
      {!hasNoWorkspaceAccess && (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Compliance Health"
          value={summary.complianceHealth !== null ? `${summary.complianceHealth}%` : null}
          icon={Shield}
          color={metricColor(summary.complianceHealth)}
          subtext={summary.complianceHealth !== null ? 'Evidence + Docs + NCR' : undefined}
        />
        <KpiCard
          label="Active Workspaces"
          value={summary.activeWorkspaces}
          icon={Building2}
          subtext="Currently running"
        />
        <KpiCard
          label="Critical Issues"
          value={summary.criticalIssues}
          icon={AlertTriangle}
          color={summary.criticalIssues > 0 ? 'var(--state-error)' : 'var(--state-success)'}
          subtext="Open + Overdue NCR/CAPA"
        />
        <KpiCard
          label="Overdue Actions"
          value={summary.overdueActions}
          icon={Clock}
          color={summary.overdueActions > 0 ? '#d97706' : 'var(--state-success)'}
          subtext="Tasks + Issues"
        />
        <KpiCard
          label="Pending Decisions"
          value={summary.pendingDecisionsCount}
          icon={FileText}
          color={summary.pendingDecisionsCount > 0 ? '#d97706' : 'var(--text-muted)'}
          subtext="Documents awaiting review"
        />
        <KpiCard
          label="Expiring Files"
          value={summary.expiringFiles}
          icon={AlertCircle}
          color={summary.expiringFiles > 0 ? 'var(--state-error)' : 'var(--state-success)'}
          subtext="Expired or expiring in 30d"
        />
        <KpiCard
          label="Awaiting Review"
          value={summary.tasksAwaitingReview}
          icon={Activity}
          color={summary.tasksAwaitingReview > 0 ? '#d97706' : 'var(--text-muted)'}
          subtext="Tasks in WAITING_REVIEW"
        />
        <KpiCard
          label="Completion Rate"
          value={summary.completionRate !== null ? `${summary.completionRate}%` : null}
          icon={TrendingUp}
          color={summary.completionRate !== null ? metricColor(summary.completionRate, 70, 40) : undefined}
          trend={trends.weeklyTrend}
        />
      </div>
      )}

      {/* ── Attention + Decisions (hidden when no workspace access) ────────── */}
      {!hasNoWorkspaceAccess && <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Requires Executive Attention */}
        <div className="rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Requires Executive Attention
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: attentionItems.length > 0 ? 'var(--state-error-soft)' : 'var(--state-success-soft)', color: attentionItems.length > 0 ? 'var(--state-error)' : 'var(--state-success)' }}>
              {attentionItems.length}
            </span>
          </div>
          <div className="divide-y" style={{ '--divide-color': 'var(--border-subtle)' } as React.CSSProperties}>
            {attentionItems.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--state-success)' }}>
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">No items require attention.</span>
              </div>
            ) : (
              attentionItems.slice(0, 8).map((item) => {
                const sev = severityColor(item.severity);
                const typeHref = item.type === 'TASK'
                  ? '/tasks'
                  : item.type === 'DOCUMENT'
                  ? '/documents'
                  : '/ncr-capa';
                return (
                  <div key={`${item.type}-${item.id}`} className="px-5 py-3"
                    style={{ borderBottomColor: 'var(--border-subtle)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: sev.bg, color: sev.color }}>{item.severity}</span>
                          <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {item.workspace && <span>{item.workspace}</span>}
                          {item.responsible && <span>{item.responsible}</span>}
                          {item.overdueAge && <span style={{ color: 'var(--state-error)' }}>{item.overdueAge}</span>}
                        </div>
                      </div>
                      <Link href={typeHref}
                        className="shrink-0 flex items-center gap-1 text-xs font-medium"
                        style={{ color: 'var(--accent-primary)' }}>
                        Open <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Decisions Awaiting You */}
        <div className="rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Decisions Awaiting You</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: pendingDecisions.length > 0 ? 'var(--state-warning-soft)' : 'var(--state-success-soft)', color: pendingDecisions.length > 0 ? 'var(--state-warning)' : 'var(--state-success)' }}>
              {pendingDecisions.length}
            </span>
          </div>
          <div className="divide-y">
            {pendingDecisions.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--state-success)' }}>
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">No executive decisions currently pending.</span>
              </div>
            ) : (
              pendingDecisions.slice(0, 8).map((d) => (
                <div key={d.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{d.title}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {d.department && <span>{d.department}</span>}
                        <span>By {d.requester}</span>
                        <span>{fmtDate(d.submittedAt)}</span>
                      </div>
                    </div>
                    <Link href={`/documents/${d.id}`}
                      className="shrink-0 flex items-center gap-1 text-xs font-medium"
                      style={{ color: 'var(--accent-primary)' }}>
                      Review <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>}

      {/* ── Organization Health ─────────────────────────────────────────────── */}
      {!hasNoWorkspaceAccess && <div className="rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Organization Health</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Health status is calculated from overdue actions, critical issues, completion progress, and compliance exposure.
          </p>
        </div>
        {organizationHealth.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No active workspaces.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Workspace', 'Department', 'Health', 'Progress', 'Open Tasks', 'Overdue', 'Critical Issues', 'Total Issues'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizationHealth.map((row) => {
                  const hc = healthColor(row.health);
                  return (
                    <tr key={row.workspaceId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                        <Link href={`/workspaces/${row.workspaceId}`} className="hover:underline">{row.workspaceName}</Link>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{row.department ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: hc.bg, color: hc.color }}>{row.healthLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <div className="h-full rounded-full" style={{ width: `${row.progress}%`, backgroundColor: hc.color }} />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{row.openTasks}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: row.overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>
                        {row.overdueTasks}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: row.criticalIssues > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>
                        {row.criticalIssues}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{row.totalIssues}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* ── Trends + Department Performance ─────────────────────────────────── */}
      {!hasNoWorkspaceAccess && <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Compliance & Risk Summary */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Compliance &amp; Risk Summary</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Evidence Readiness', value: trends.evidenceReadiness, desc: 'Checklist items approved / total' },
              { label: 'Document Approval Rate', value: trends.docApprovalRate, desc: 'Approved docs / total docs' },
              { label: 'NCR Resolution Rate', value: trends.ncrResolutionRate, desc: 'Verified + Closed / total NCR' },
            ].map(({ label, value, desc }) => {
              const color = value === null ? 'var(--text-disabled)' : value >= 80 ? 'var(--state-success)' : value >= 60 ? '#d97706' : 'var(--state-error)';
              return (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>{fmtMetric(value, '%')}</span>
                  </div>
                  {value !== null ? (
                    <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${value}%`, backgroundColor: color }} />
                    </div>
                  ) : (
                    <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>No measurable data available.</p>
                  )}
                </div>
              );
            })}
            {/* Weekly task completion trend */}
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Task Completion — This Week</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{trends.completedThisWeek}</span>
              </div>
              {trends.weeklyTrend !== null ? (
                <div className="mt-1 flex items-center gap-1 text-xs"
                  style={{ color: trends.weeklyTrend >= 0 ? 'var(--state-success)' : 'var(--state-error)' }}>
                  {trends.weeklyTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trends.weeklyTrend)}% vs previous week ({trends.completedLastWeek} completions)
                </div>
              ) : (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>No comparison data yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Department Performance */}
        <div className="rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Department Performance</h2>
          </div>
          {departmentPerformance.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No department data available. Assign workspaces to departments to see performance.
            </div>
          ) : (
            <div className="divide-y">
              {departmentPerformance.map((d) => {
                const color = metricColor(d.completionRate, 80, 60);
                return (
                  <div key={d.departmentId} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.departmentName}</span>
                          <span className="text-sm font-bold" style={{ color }}>{fmtMetric(d.completionRate, '%')}</span>
                        </div>
                        {d.completionRate !== null ? (
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${d.completionRate}%`, backgroundColor: color }} />
                          </div>
                        ) : (
                          <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>No measurable data</p>
                        )}
                        <div className="mt-1 flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{d.overdueCount} overdue</span>
                          <span>{d.issueCount} issues</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>}

      {/* ── Recent Significant Activity ──────────────────────────────────────── */}
      {!hasNoWorkspaceAccess && <div className="rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Significant Activity</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Approvals, rejections, closures, and important state changes
          </p>
        </div>
        {significantActivity.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No significant activity recorded yet.</div>
        ) : (
          <div className="divide-y">
            {significantActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <Activity className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {a.actor}
                    </span>
                    <span className="text-xs rounded px-1.5 py-0.5"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                      {a.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.entityType}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(a.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>}

    </div>
  );
}
