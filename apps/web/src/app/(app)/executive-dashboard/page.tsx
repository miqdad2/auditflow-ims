'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Activity, Clock,
  Building2, Loader2,
  AlertCircle, Lock, Target,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, ApiError } from '@/lib/api';
import { useSocket } from '@/lib/socket-provider';
import { useRealtimeInvalidation } from '@/lib/use-realtime-invalidation';
import { useRouter } from 'next/navigation';

// ─── Types (unchanged from Units 65–65.3) ────────────────────────────────────

interface ExecutiveSummary {
  complianceHealth: number | null;
  activeWorkspaces: number;
  criticalIssues: number;
  overdueActions: number;
  pendingDecisionsCount: number;
  expiringFiles: number;
  tasksAwaitingReview: number;
  completionRate: number | null;
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
  evidenceReadiness: number | null;
  docApprovalRate: number | null;
  ncrResolutionRate: number | null;
}

interface DeptPerformance {
  departmentId: string;
  departmentName: string;
  completionRate: number | null;
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

// ─── Realtime events (unchanged) ─────────────────────────────────────────────
const EXEC_EVENTS = [
  'task.created', 'task.updated', 'task.deleted',
  'document.updated',
  'issue.created', 'issue.updated',
  'file.updated',
  'workspace.updated',
  'notification.created',
] as const;

// ─── Design system helpers ────────────────────────────────────────────────────

type KpiStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';

function kpiStyle(status: KpiStatus): { accent: string; iconBg: string; iconColor: string } {
  switch (status) {
    case 'success': return { accent: 'var(--state-success)', iconBg: 'var(--state-success-soft)', iconColor: 'var(--state-success)' };
    case 'warning': return { accent: 'var(--state-warning)', iconBg: 'var(--state-warning-soft)', iconColor: 'var(--state-warning)' };
    case 'error':   return { accent: 'var(--state-error)',   iconBg: 'var(--state-error-soft)',   iconColor: 'var(--state-error)'   };
    case 'info':    return { accent: 'var(--accent-primary)', iconBg: 'var(--accent-soft)',        iconColor: 'var(--accent-primary)' };
    default:        return { accent: 'var(--border-strong)', iconBg: 'var(--bg-muted)',            iconColor: 'var(--text-muted)'    };
  }
}

export function metricStatus(v: number | null, good = 80, warn = 60): KpiStatus {
  if (v === null) return 'neutral';
  if (v >= good)  return 'success';
  if (v >= warn)  return 'warning';
  return 'error';
}

function healthColor(health: string): { color: string; bg: string } {
  switch (health) {
    case 'ON_TRACK':  return { color: 'var(--state-success)', bg: 'var(--state-success-soft)' };
    case 'ATTENTION': return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' };
    case 'AT_RISK':   return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' };
    case 'CRITICAL':  return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)'   };
    default:          return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)'            };
  }
}

export function fmtMetric(v: number | null, suffix = ''): string {
  return v === null ? 'N/A' : `${v}${suffix}`;
}

export function formatAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

export function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first ?? fullName;
}

export function getGreeting(hour: number, firstName: string): string {
  if (hour >= 5  && hour < 12) return `Good morning, ${firstName}.`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}.`;
  if (hour >= 17 && hour < 21) return `Good evening, ${firstName}.`;
  return `Welcome back, ${firstName}.`;
}

function healthRowBg(health: string): string {
  switch (health) {
    case 'CRITICAL':  return 'color-mix(in srgb, var(--state-error) 5%, transparent)';
    case 'AT_RISK':   return 'color-mix(in srgb, var(--state-warning) 4%, transparent)';
    case 'ATTENTION': return 'color-mix(in srgb, var(--state-warning) 3%, transparent)';
    default:          return '';
  }
}

// ─── Executive Summary strip builder ─────────────────────────────────────────

interface SummaryItem { label: string; value: string; color: string }

export function buildExecSummary(data: {
  summary: ExecutiveSummary;
  attentionItems: Pick<AttentionItem, 'title' | 'severity'>[];
  organizationHealth: Pick<OrgHealthRow, 'health' | 'workspaceName'>[];
  trends: Pick<Trends, 'weeklyTrend'>;
  pendingDecisions: unknown[];
}): SummaryItem[] {
  const { summary, attentionItems, organizationHealth, trends, pendingDecisions } = data;
  const items: SummaryItem[] = [];

  // Overall Status — derived from real KPI data
  let status = 'On Track';
  let statusColor = 'var(--state-success)';
  if (summary.criticalIssues > 0 || (summary.complianceHealth !== null && summary.complianceHealth < 60)) {
    status = 'At Risk'; statusColor = 'var(--state-error)';
  } else if (
    summary.overdueActions > 0 ||
    attentionItems.length > 0 ||
    (summary.complianceHealth !== null && summary.complianceHealth < 80)
  ) {
    status = 'Attention Required'; statusColor = 'var(--state-warning)';
  } else if (summary.complianceHealth === null && summary.activeWorkspaces > 0) {
    status = 'Awaiting Data'; statusColor = 'var(--text-muted)';
  }
  items.push({ label: 'Overall Status', value: status, color: statusColor });

  // Highest Risk Workspace — only shown when CRITICAL or AT_RISK workspace exists
  const critWs = organizationHealth.find((r) => r.health === 'CRITICAL');
  const riskWs = critWs ?? organizationHealth.find((r) => r.health === 'AT_RISK');
  if (riskWs) {
    items.push({
      label: 'Highest Risk',
      value: riskWs.workspaceName,
      color: critWs ? 'var(--state-error)' : 'var(--state-warning)',
    });
  }

  // Most Urgent — first attention item, else pending decisions count
  const urgent = attentionItems[0];
  if (urgent) {
    const truncated = urgent.title.length > 42 ? `${urgent.title.slice(0, 42)}…` : urgent.title;
    items.push({
      label: 'Most Urgent',
      value: truncated,
      color: urgent.severity === 'CRITICAL' ? 'var(--state-error)' : 'var(--state-warning)',
    });
  } else if (pendingDecisions.length > 0) {
    const n = pendingDecisions.length;
    items.push({
      label: 'Most Urgent',
      value: `${n} decision${n > 1 ? 's' : ''} awaiting review`,
      color: 'var(--state-warning)',
    });
  }

  // Current Trend — only when comparison data is available
  if (trends.weeklyTrend !== null) {
    const t = trends.weeklyTrend;
    items.push({
      label: 'Current Trend',
      value: t > 0 ? `Improving (+${t}%)` : t < 0 ? `Declining (${t}%)` : 'Stable',
      color: t > 0 ? 'var(--state-success)' : t < 0 ? 'var(--state-error)' : 'var(--text-secondary)',
    });
  }

  return items;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, subtext, status, icon: Icon, trend, reducedMotion,
}: {
  label: string;
  value: string | number | null;
  subtext?: string;
  status: KpiStatus;
  icon: React.ElementType;
  trend?: number | null;
  reducedMotion: boolean;
}) {
  const isNull = value === null;
  const s = kpiStyle(isNull ? 'neutral' : status);

  return (
    <div
      className={`rounded-xl border shadow-sm p-4 flex flex-col gap-3 overflow-hidden ${reducedMotion ? '' : 'hover:shadow-md'}`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        borderLeft: `3px solid ${s.accent}`,
        transition: reducedMotion ? 'none' : 'box-shadow 0.15s ease',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[10px] font-bold uppercase tracking-widest leading-snug"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: s.iconBg }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: s.iconColor }} />
        </div>
      </div>
      <div>
        <div
          className="text-[28px] font-bold leading-none tracking-tight"
          style={{ color: isNull ? 'var(--text-disabled)' : s.accent }}
        >
          {isNull ? 'N/A' : value}
        </div>
        {isNull ? (
          <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
            No measurable data
          </p>
        ) : (
          <div className="mt-1.5 flex items-center gap-2">
            {subtext && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtext}</span>
            )}
            {trend !== null && trend !== undefined && (
              <span
                className="flex items-center gap-0.5 text-[11px] font-semibold"
                style={{ color: trend >= 0 ? 'var(--state-success)' : 'var(--state-error)' }}
              >
                {trend >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compact empty state ──────────────────────────────────────────────────────

function CompactEmpty({
  icon: Icon, message,
}: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6">
      <Icon className="h-5 w-5" style={{ color: 'var(--text-disabled)' }} />
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, count, countColor }: {
  title: string;
  subtitle?: string;
  count?: number;
  countColor?: string;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 px-5 py-3.5"
      style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}
    >
      <div>
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {count !== undefined && (
        <span
          className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: countColor ? `${countColor}20` : 'var(--bg-muted)', color: countColor ?? 'var(--text-muted)' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { connected } = useSocket();

  const [data, setData]               = useState<ExecutiveData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [highlighted, setHighlighted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [greetingText, setGreetingText] = useState('');

  const fetchingRef    = useRef(false);
  const isInitialLoad  = useRef(true);
  const reducedMotionRef = useRef(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedMotionRef.current = rm;
    setReducedMotion(rm);
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!user?.fullName) return;
    const fn = getFirstName(user.fullName);
    const h = parseInt(
      new Date().toLocaleTimeString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kuwait' }),
      10,
    );
    setGreetingText(getGreeting(isNaN(h) ? 9 : h, fn));
  }, [user?.fullName]);

  const isExecutive = user?.dashboardExperience === 'EXECUTIVE';

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.mustChangePassword) { router.replace('/change-password'); return; }
  }, [user, isLoading, router]);

  const fetchData = useCallback(async () => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const result = await apiGet<ExecutiveData>('/dashboard/executive', token);
      setData(result);
      setLastUpdated(
        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuwait' }),
      );
      setError(null);
      if (!isInitialLoad.current && !reducedMotionRef.current) {
        setHighlighted(true);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlighted(false), 1500);
      }
      isInitialLoad.current = false;
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

  useRealtimeInvalidation({ events: EXEC_EVENTS, onInvalidate: fetchData, debounceMs: 1000 });

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || (!data && loading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  // ─── Access denied ───────────────────────────────────────────────────────────
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

  // ─── Error ───────────────────────────────────────────────────────────────────
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

  const { summary, organizationHealth, trends, departmentPerformance, significantActivity } = data;
  const hasNoWorkspaceAccess = summary.activeWorkspaces === 0 && organizationHealth.length === 0;
  const canManageUsers = user?.permissions?.includes('users.manage') ?? false;

  // KPI statuses (Compliance Health and Pending Decisions removed per Unit 66.2)
  const critStatus: KpiStatus   = summary.criticalIssues > 0 ? 'error'   : 'success';
  const overdueStatus: KpiStatus = summary.overdueActions > 0 ? 'warning' : 'success';
  const expiryStatus: KpiStatus  = summary.expiringFiles > 0 ? 'error'   : 'success';
  const rateStatus      = metricStatus(summary.completionRate, 70, 40);

  return (
    <div className="flex flex-col gap-5 pb-12">

      {/* ── Premium Header Card ────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <div className="px-6 py-5" style={{ borderLeft: '4px solid var(--sidebar-bg)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  RECAFCO AuditFlow IMS
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: connected ? 'var(--state-success-soft)' : 'var(--state-error-soft)',
                    color: connected ? 'var(--state-success)' : 'var(--state-error)',
                  }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${connected && !reducedMotion ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: connected ? 'var(--state-success)' : 'var(--state-error)' }}
                  />
                  {connected ? 'Live' : 'Reconnecting'}
                </span>
              </div>
              {greetingText && (
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--sidebar-bg)' }}>
                  {greetingText}
                </p>
              )}
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Executive Operations &amp; Compliance Overview
              </h1>
              {!hasNoWorkspaceAccess && (
                <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)', maxWidth: '70ch' }}>
                  Here is the latest view of organizational performance, operational health, and key compliance metrics across all active workspaces.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {lastUpdated && (
                <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                  Updated {lastUpdated}
                </span>
              )}
              <button
                onClick={() => void fetchData()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── No-workspace premium empty state ──────────────────────────────────── */}
      {hasNoWorkspaceAccess && (
        <div
          className="rounded-xl border shadow-sm p-10 flex flex-col items-center gap-4 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }}>
            <Building2 className="h-7 w-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              No management workspaces assigned
            </p>
            <p className="mt-1.5 text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
              This executive account does not currently have access to any operational workspaces.
              Assign approved workspaces to display organizational performance, compliance metrics,
              and operational priorities.
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

      {!hasNoWorkspaceAccess && (
        <>
          {/* ── KPI Grid — brief ring highlight on realtime update ─────────────── */}
          <div
            style={{
              borderRadius: '14px',
              boxShadow: highlighted ? '0 0 0 3px var(--accent-soft)' : '0 0 0 0 transparent',
              transition: reducedMotion ? 'none' : 'box-shadow 0.7s ease',
            }}
          >
            {/* Primary KPIs — 4 operational metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Active Workspaces"
                value={summary.activeWorkspaces}
                icon={Building2} status="info"
                subtext="Currently running"
                reducedMotion={reducedMotion}
              />
              <KpiCard
                label="Critical Issues"
                value={summary.criticalIssues}
                icon={AlertTriangle} status={critStatus}
                subtext={summary.criticalIssues === 0 ? 'No open NCR/CAPA' : 'Open NCR/CAPA records'}
                reducedMotion={reducedMotion}
              />
              <KpiCard
                label="Overdue Actions"
                value={summary.overdueActions}
                icon={Clock} status={overdueStatus}
                subtext={summary.overdueActions === 0 ? 'All tasks on schedule' : 'Tasks and actions past due'}
                reducedMotion={reducedMotion}
              />
              <KpiCard
                label="Expiring Files"
                value={summary.expiringFiles}
                icon={AlertCircle} status={expiryStatus}
                subtext={summary.expiringFiles === 0 ? 'No files expiring soon' : 'Expired or expiring in 30 days'}
                reducedMotion={reducedMotion}
              />
            </div>

            {/* Secondary performance strip — Awaiting Review | Completion Rate | Completed This Week */}
            <div
              className="rounded-xl border overflow-hidden mt-1"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-default)' }}
            >
              <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"
                style={{ '--tw-divide-opacity': '1', borderColor: 'var(--border-default)' } as React.CSSProperties}>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Awaiting Review
                    </p>
                    <p className="mt-1 text-xl font-bold"
                      style={{ color: summary.tasksAwaitingReview > 0 ? 'var(--state-warning)' : 'var(--text-secondary)' }}>
                      {summary.tasksAwaitingReview}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {summary.tasksAwaitingReview === 0 ? 'None pending' : 'Tasks pending approval'}
                    </p>
                  </div>
                  <Activity className="h-5 w-5 shrink-0"
                    style={{ color: summary.tasksAwaitingReview > 0 ? 'var(--state-warning)' : 'var(--text-disabled)' }} />
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Completion Rate
                    </p>
                    <p className="mt-1 text-xl font-bold"
                      style={{ color: summary.completionRate === null ? 'var(--text-disabled)' : kpiStyle(rateStatus).accent }}>
                      {summary.completionRate !== null ? `${summary.completionRate}%` : 'N/A'}
                    </p>
                    {trends.weeklyTrend !== null && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold mt-0.5"
                        style={{ color: trends.weeklyTrend >= 0 ? 'var(--state-success)' : 'var(--state-error)' }}>
                        {trends.weeklyTrend >= 0
                          ? <TrendingUp className="h-3 w-3" />
                          : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(trends.weeklyTrend)}% vs last week
                      </span>
                    )}
                  </div>
                  <Target className="h-5 w-5 shrink-0"
                    style={{ color: summary.completionRate === null ? 'var(--text-disabled)' : kpiStyle(rateStatus).accent }} />
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Completed This Week
                    </p>
                    <p className="mt-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {trends.completedThisWeek}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {trends.completedLastWeek} completed last week
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--text-disabled)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Organization Health ────────────────────────────────────────────── */}
          <div className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <SectionHeader
              title="Organization Health"
              subtitle="Health status is calculated from overdue actions, critical issues, completion progress, and compliance exposure."
            />
            {organizationHealth.length === 0 ? (
              <CompactEmpty icon={Building2} message="No active workspaces." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                      {['Workspace', 'Department', 'Health', 'Progress', 'Open Tasks', 'Overdue', 'Critical Issues', 'Total Issues'].map((h) => (
                        <th key={h}
                          className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {organizationHealth.map((row) => {
                      const hc = healthColor(row.health);
                      return (
                        <tr key={row.workspaceId}
                          className="transition-colors"
                          style={{
                            borderBottom: '1px solid var(--border-default)',
                            backgroundColor: healthRowBg(row.health) || undefined,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-subtle)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = healthRowBg(row.health); }}
                        >
                          <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                            <Link href={`/workspaces/${row.workspaceId}`} className="hover:underline underline-offset-2">
                              {row.workspaceName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {row.department ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                              style={{ backgroundColor: hc.bg, color: hc.color }}>
                              {row.healthLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-24 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                                <div className="h-full rounded-full"
                                  style={{
                                    width: `${row.progress}%`,
                                    backgroundColor: hc.color,
                                    transition: reducedMotion ? 'none' : 'width 0.6s ease',
                                  }} />
                              </div>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                {row.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {row.openTasks}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold"
                            style={{ color: row.overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>
                            {row.overdueTasks}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold"
                            style={{ color: row.criticalIssues > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>
                            {row.criticalIssues}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                            {row.totalIssues}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Compliance & Risk + Department Performance ─────────────────────── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Compliance & Risk Summary */}
            <div className="rounded-xl border shadow-sm overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
              <SectionHeader title="Compliance &amp; Risk Summary" />
              <div className="flex flex-col gap-5 p-5">
                {[
                  { label: 'Evidence Readiness',     value: trends.evidenceReadiness,  desc: 'Checklist items approved vs total' },
                  { label: 'Document Approval Rate', value: trends.docApprovalRate,    desc: 'Approved documents vs total' },
                  { label: 'NCR Resolution Rate',    value: trends.ncrResolutionRate,  desc: 'Verified and closed NCR vs total' },
                ].map(({ label, value, desc }) => {
                  const st = metricStatus(value);
                  const s  = kpiStyle(st);
                  return (
                    <div key={label}>
                      <div className="mb-2 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                        </div>
                        <span className="text-lg font-bold shrink-0"
                          style={{ color: value === null ? 'var(--text-disabled)' : s.accent }}>
                          {fmtMetric(value, '%')}
                        </span>
                      </div>
                      {value !== null ? (
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${value}%`,
                              backgroundColor: s.accent,
                              transition: reducedMotion ? 'none' : 'width 0.6s ease',
                            }} />
                        </div>
                      ) : (
                        <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                          No measurable data available.
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Weekly task completion */}
                <div className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Task Completion — This Week
                    </span>
                    <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {trends.completedThisWeek}
                    </span>
                  </div>
                  {trends.weeklyTrend !== null ? (
                    <div className="mt-1 flex items-center gap-1 text-xs font-medium"
                      style={{ color: trends.weeklyTrend >= 0 ? 'var(--state-success)' : 'var(--state-error)' }}>
                      {trends.weeklyTrend >= 0
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(trends.weeklyTrend)}% vs previous week ({trends.completedLastWeek} completions)
                    </div>
                  ) : (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>No comparison data yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Department Performance */}
            <div className="rounded-xl border shadow-sm overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
              <SectionHeader title="Department Performance" />
              {departmentPerformance.length === 0 ? (
                <CompactEmpty
                  icon={Building2}
                  message="Department performance will appear after workspaces are linked to departments."
                />
              ) : (
                <div className="divide-y">
                  {departmentPerformance.map((d) => {
                    const st = metricStatus(d.completionRate, 80, 60);
                    const s  = kpiStyle(st);
                    return (
                      <div key={d.departmentId} className="px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        style={{ borderBottomColor: 'var(--border-default)' }}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {d.departmentName}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.overdueCount > 0 && (
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                                {d.overdueCount} overdue
                              </span>
                            )}
                            <span className="text-base font-bold"
                              style={{ color: d.completionRate === null ? 'var(--text-disabled)' : s.accent }}>
                              {fmtMetric(d.completionRate, '%')}
                            </span>
                          </div>
                        </div>
                        {d.completionRate !== null ? (
                          <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${d.completionRate}%`,
                                backgroundColor: s.accent,
                                transition: reducedMotion ? 'none' : 'width 0.6s ease',
                              }} />
                          </div>
                        ) : (
                          <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>No measurable data</p>
                        )}
                        {d.issueCount > 0 && (
                          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {d.issueCount} issue{d.issueCount > 1 ? 's' : ''} open
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Significant Activity ────────────────────────────────────── */}
          <div className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <SectionHeader
              title="Recent Significant Activity"
              subtitle="Approvals, rejections, closures, and important state changes"
            />
            {significantActivity.length === 0 ? (
              <CompactEmpty icon={Activity} message="No significant activity recorded yet." />
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
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {a.actor}
                        </span>
                        <span className="text-xs rounded px-1.5 py-0.5 font-medium"
                          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                          {formatAction(a.action)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.entityType}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(a.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </>
      )}

    </div>
  );
}
