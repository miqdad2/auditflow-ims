'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ListChecks, RefreshCw, ChevronRight, Users, Search,
  Clock, AlertTriangle, CheckCircle2, RotateCcw, MoreHorizontal,
  Loader2, AlertCircle, X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import {
  TASK_STATUS_TRANSITIONS, TASK_STATUS_DISPLAY_NAMES, STATUS_CONFIRM_CONFIG,
  type StatusTier,
} from '@/lib/task-status';

// ─── Personal task summary (from GET /dashboard/my-tasks) ────────────────────

interface MyTaskSummary {
  open: number;
  inProgress: number;
  waitingReview: number;
  returned: number;
  overdue: number;
  completed: number;
  total: number;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskUser {
  id: string;
  fullName: string;
}

interface TaskWorkspace {
  id: string;
  name: string;
}

interface TaskList {
  id: string;
  name: string;
  workspace: TaskWorkspace | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  isReference: boolean;
  recurrenceInterval?: string;
  assignee: TaskUser | null;
  createdBy: TaskUser | null;
  taskList: TaskList | null;
  workspaceId?: string;
  workspace?: TaskWorkspace | null;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

const SUPER_ROLES = ['SUPER_ADMIN', 'SUPER_USER'];

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED', 'COMPLETED', 'CANCELLED'];

function statusStyle(status: string): { color: string; bg: string; label: string } {
  switch (status) {
    case 'TODO':           return { color: 'var(--text-muted)',     bg: 'var(--bg-muted)',           label: 'To Do' };
    case 'IN_PROGRESS':    return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)',         label: 'In Progress' };
    case 'WAITING_REVIEW': return { color: 'var(--state-warning)',  bg: 'var(--state-warning-soft)', label: 'Waiting Review' };
    case 'COMPLETED':      return { color: 'var(--state-success)',  bg: 'var(--state-success-soft)', label: 'Completed' };
    case 'REJECTED':       return { color: 'var(--state-error)',    bg: 'var(--state-error-soft)',   label: 'Returned' };
    case 'CANCELLED':      return { color: 'var(--text-disabled)',  bg: 'var(--bg-muted)',            label: 'Cancelled' };
    default:               return { color: 'var(--text-muted)',     bg: 'var(--bg-muted)',            label: status };
  }
}

function priorityStyle(priority: string): { color: string; label: string } {
  switch (priority) {
    case 'CRITICAL': return { color: 'var(--state-error)',    label: 'Critical' };
    case 'HIGH':     return { color: 'var(--state-warning)',  label: 'High' };
    case 'MEDIUM':   return { color: 'var(--accent-primary)', label: 'Medium' };
    default:         return { color: 'var(--text-muted)',     label: 'Low' };
  }
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'COMPLETED' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

// ─── View options ─────────────────────────────────────────────────────────────

type ViewKey = 'open' | 'my' | 'unassigned' | 'overdue' | 'waiting-review' | 'returned' | 'reference' | 'completed' | 'all';

const NORMAL_VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'open',           label: 'Open' },
  { key: 'waiting-review', label: 'Waiting Review' },
  { key: 'returned',       label: 'Returned' },
  { key: 'overdue',        label: 'Overdue' },
  { key: 'completed',      label: 'Done' },
  { key: 'all',            label: 'All' },
];

const SUPER_VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'all',           label: 'All Tasks' },
  { key: 'my',            label: 'My Tasks' },
  { key: 'open',          label: 'Open' },
  { key: 'unassigned',    label: 'Unassigned' },
  { key: 'overdue',       label: 'Overdue' },
  { key: 'waiting-review',label: 'Waiting Review' },
  { key: 'returned',      label: 'Returned' },
  { key: 'reference',     label: 'Reference Only' },
  { key: 'completed',     label: 'Completed' },
];

const OPEN_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED']);

// Tier is computed per-user at runtime; keep ELEVATED as the table-level default
// since super users / ISO managers access this view.

// ─── Main component ───────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();

  const roles = user?.roles ?? [];
  const isSuperUser = roles.some((r) => SUPER_ROLES.includes(r));
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  // Default view: super users start on 'all', normal users on 'open'
  // Support ?view= URL param from dashboard KPI links
  const rawView = searchParams.get('view') as ViewKey | null;
  const defaultView: ViewKey = isSuperUser ? 'all' : 'open';
  const [view, setView] = useState<ViewKey>(rawView ?? defaultView);

  const [tasks, setTasks]           = useState<Task[]>([]);
  const [summaryData, setSummaryData] = useState<MyTaskSummary | null>(null); // server-authoritative personal counts
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');

  // Inline action state (Super User table)
  const [inlineMenu, setInlineMenu]       = useState<string | null>(null);
  const [patchLoading, setPatchLoading]   = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Inline status change dialog (requires reason for REJECTED/CANCELLED/reopen)
  const [statusDialogTask, setStatusDialogTask] = useState<Task | null>(null);
  const [statusDialogTarget, setStatusDialogTarget] = useState<string | null>(null);
  const [statusDialogReason, setStatusDialogReason] = useState('');
  const [statusDialogError, setStatusDialogError] = useState('');
  const [statusDialogLoading, setStatusDialogLoading] = useState(false);

  // Derive role tier for transition map
  const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
  const isElevated = (user?.roles as string[] | undefined)?.some((r) => ELEVATED_ROLES.includes(r)) ?? false;
  const statusTier: StatusTier = isElevated ? 'ELEVATED' : isSuperUser ? 'MANAGER' : 'MEMBER';

  // Update view when URL param changes (e.g., deep-linked from dashboard)
  useEffect(() => {
    if (rawView) setView(rawView);
  }, [rawView]);

  const load = useCallback(async () => {
    if (!token || !user?.id) return;
    setLoading(true);
    setError('');
    try {
      if (isSuperUser) {
        // Super users: use the general tasks endpoint via raw fetch (requires tasks.read)
        const res = await fetch(`${base}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json() as Task[];
        setTasks(data);
        setSummaryData(null); // Super users use computed counts from the tasks array
      } else {
        // Normal users: use /dashboard/my-tasks (requires only project.read — always available)
        // This guarantees the endpoint works regardless of whether tasks.read is in the DB.
        const data = await apiGet<{ summary: MyTaskSummary; tasks: Task[] }>('/dashboard/my-tasks', token);
        setTasks(data.tasks);
        setSummaryData(data.summary);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
      // Do NOT clear summaryData on failure — stale counts are better than false zeros
    } finally {
      setLoading(false);
    }
  }, [base, token, user?.id, isSuperUser]);

  useEffect(() => { void load(); }, [load]);

  // Close inline menu when clicking outside
  useEffect(() => {
    if (!inlineMenu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setInlineMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [inlineMenu]);

  // Open the inline status action menu
  function openInlineStatusMenu(task: Task, targetStatus: string) {
    setInlineMenu(null);
    const cfg = STATUS_CONFIRM_CONFIG[targetStatus];
    if (!cfg) return;
    setStatusDialogTask(task);
    setStatusDialogTarget(targetStatus);
    setStatusDialogReason('');
    setStatusDialogError('');
  }

  function closeStatusDialog() {
    setStatusDialogTask(null);
    setStatusDialogTarget(null);
    setStatusDialogReason('');
    setStatusDialogError('');
    setStatusDialogLoading(false);
  }

  async function confirmInlineStatusChange() {
    if (!token || !statusDialogTask || !statusDialogTarget) return;
    const cfg = STATUS_CONFIRM_CONFIG[statusDialogTarget];
    if (cfg?.reasonRequired && !statusDialogReason.trim()) {
      setStatusDialogError('Please provide a reason before continuing.');
      return;
    }
    setStatusDialogLoading(true);
    setStatusDialogError('');
    setPatchLoading(statusDialogTask.id);
    try {
      const res = await fetch(`${base}/tasks/${statusDialogTask.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus: statusDialogTarget,
          reason: statusDialogReason.trim() || undefined,
          source: 'GLOBAL_TASK_CONTROL',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Failed to change status');
      }
      setTasks((prev) => prev.map((t) => t.id === statusDialogTask!.id ? { ...t, status: statusDialogTarget! } : t));
      closeStatusDialog();
    } catch (err: unknown) {
      setStatusDialogError(err instanceof Error ? err.message : 'Failed to change status.');
    } finally {
      setStatusDialogLoading(false);
      setPatchLoading(null);
    }
  }

  // ─── Filtered tasks ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    switch (view) {
      case 'my':
        list = list.filter((t) => t.assignee?.id === user?.id);
        break;
      case 'open':
        list = list.filter((t) => OPEN_STATUSES.has(t.status) && !t.isReference);
        break;
      case 'unassigned':
        list = list.filter((t) => !t.assignee && !t.isReference);
        break;
      case 'overdue':
        list = list.filter((t) => isOverdue(t.dueDate, t.status) && !t.isReference);
        break;
      case 'waiting-review':
        list = list.filter((t) => t.status === 'WAITING_REVIEW');
        break;
      case 'returned':
        list = list.filter((t) => t.status === 'REJECTED');
        break;
      case 'reference':
        list = list.filter((t) => t.isReference);
        break;
      case 'completed':
        list = list.filter((t) => t.status === 'COMPLETED');
        break;
      // 'all': no additional filter
    }

    return [...list].sort((a, b) => {
      const aOv = isOverdue(a.dueDate, a.status) ? 0 : 1;
      const bOv = isOverdue(b.dueDate, b.status) ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    });
  }, [tasks, view, search, user?.id]);

  // ─── Summary counts ─────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const operational = tasks.filter((t) => !t.isReference);
    return {
      open:         operational.filter((t) => OPEN_STATUSES.has(t.status)).length,
      unassigned:   operational.filter((t) => !t.assignee && OPEN_STATUSES.has(t.status)).length,
      overdue:      operational.filter((t) => isOverdue(t.dueDate, t.status)).length,
      waitingReview:operational.filter((t) => t.status === 'WAITING_REVIEW').length,
      returned:     operational.filter((t) => t.status === 'REJECTED').length,
      completed:    tasks.filter((t) => t.status === 'COMPLETED').length,
      reference:    tasks.filter((t) => t.isReference).length,
      all:          tasks.length,
      my:           tasks.filter((t) => t.assignee?.id === user?.id).length,
    };
  }, [tasks, user?.id]);

  const views = isSuperUser ? SUPER_VIEWS : NORMAL_VIEWS;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isSuperUser ? 'Task Control' : 'My Tasks'}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {isSuperUser
              ? 'Review and manage tasks across all business workspaces.'
              : 'Tasks assigned to you across accessible workspaces.'}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      {isSuperUser ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Open',           value: counts.open,          key: 'open' as ViewKey,          color: 'var(--accent-primary)' },
            { label: 'Unassigned',     value: counts.unassigned,    key: 'unassigned' as ViewKey,    color: counts.unassigned > 0 ? 'var(--state-warning)' : 'var(--text-muted)' },
            { label: 'Overdue',        value: counts.overdue,       key: 'overdue' as ViewKey,       color: counts.overdue > 0 ? 'var(--state-error)' : 'var(--text-muted)' },
            { label: 'Waiting Review', value: counts.waitingReview, key: 'waiting-review' as ViewKey,color: counts.waitingReview > 0 ? 'var(--state-warning)' : 'var(--text-muted)' },
            { label: 'Returned',       value: counts.returned,      key: 'returned' as ViewKey,      color: counts.returned > 0 ? 'var(--state-error)' : 'var(--text-muted)' },
            { label: 'Completed',      value: counts.completed,     key: 'completed' as ViewKey,     color: 'var(--state-success)' },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setView(s.key)}
              className="rounded-xl px-4 py-3 text-left transition-all"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: view === s.key ? `1.5px solid ${s.color}` : '1px solid var(--border-default)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </button>
          ))}
        </div>
      ) : (
        // Normal-user summary: use server-authoritative counts from /dashboard/my-tasks.
        // If loading: show skeleton. If error with no data yet: show "—" to avoid false zeros.
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            { label: 'Open',           value: summaryData?.open,          color: 'var(--accent-primary)' },
            { label: 'In Progress',    value: summaryData?.inProgress,    color: 'var(--accent-primary)' },
            { label: 'Waiting Review', value: summaryData?.waitingReview, color: summaryData?.waitingReview ? 'var(--state-warning)' : 'var(--text-muted)' },
            { label: 'Returned',       value: summaryData?.returned,      color: summaryData?.returned ? 'var(--state-error)' : 'var(--text-muted)' },
            { label: 'Overdue',        value: summaryData?.overdue,       color: summaryData?.overdue ? 'var(--state-error)' : 'var(--text-muted)' },
            { label: 'Total',          value: summaryData?.total,         color: 'var(--text-muted)' },
          ] as Array<{ label: string; value: number | undefined; color: string }>).map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              {loading ? (
                <div className="mt-2 h-6 w-12 animate-pulse rounded"
                  style={{ backgroundColor: 'var(--bg-muted)' }} />
              ) : (
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>
                  {error && s.value === undefined ? '—' : (s.value ?? 0)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-h-10 flex-1 items-center gap-2 rounded-lg px-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {views.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{
                borderColor: view === key ? 'var(--accent-primary)' : 'var(--border-default)',
                backgroundColor: view === key ? 'var(--accent-soft)' : 'var(--bg-surface)',
                color: view === key ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }} />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5" style={{ color: 'var(--state-error)' }} />
            <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
            <button onClick={() => void load()} className="mt-2 text-xs underline" style={{ color: 'var(--state-error)' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <ListChecks className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No tasks match your search.' : 'No tasks in this view.'}
            </p>
          </div>
        ) : isSuperUser ? (
          /* ── Super User table (wider) ── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Task', 'Workspace', 'Task List', 'Status', 'Priority', 'Assignee', 'Due Date', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {filtered.map((t) => {
                  const overdue = isOverdue(t.dueDate, t.status);
                  const ss = statusStyle(t.status);
                  const ps = priorityStyle(t.priority);
                  const wsId = t.taskList?.workspace?.id ?? t.workspaceId ?? '';
                  const wsName = t.taskList?.workspace?.name ?? t.workspace?.name ?? '—';
                  return (
                    <tr key={t.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                      <td className="px-3 py-2.5 max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium" style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}>
                            {overdue && '⚠ '}{t.title}
                          </span>
                          {t.isReference && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                              Ref
                            </span>
                          )}
                          {t.recurrenceInterval && t.recurrenceInterval !== 'NONE' && (
                            <span className="shrink-0 text-[9px]" style={{ color: 'var(--text-muted)' }} title="Recurring">↻</span>
                          )}
                        </div>
                        <p className="truncate text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t.createdBy?.fullName ?? '—'}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 max-w-[160px]">
                        {wsId ? (
                          <Link href={`/workspaces/${wsId}`}
                            className="truncate block hover:underline"
                            style={{ color: 'var(--accent-primary)' }}>
                            {wsName}
                          </Link>
                        ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5 max-w-[140px]">
                        <span className="truncate block" style={{ color: 'var(--text-secondary)' }}>
                          {t.taskList?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ color: ss.color, backgroundColor: ss.bg }}>
                          {ss.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span style={{ color: ps.color }}>{t.isReference ? 'Reference' : ps.label}</span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[120px]">
                        {t.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                              {t.assignee.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{t.assignee.fullName}</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1" style={{ color: 'var(--state-warning)' }}>
                            <Users className="h-3 w-3" />Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {t.dueDate ? (
                          <span style={{ color: overdue ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                            {overdue && <Clock className="inline h-3 w-3 mr-0.5" />}
                            {new Date(t.dueDate).toLocaleDateString('en-GB')}
                          </span>
                        ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {/* Inline action menu */}
                        <div className="relative flex items-center justify-center"
                          ref={inlineMenu === t.id ? menuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setInlineMenu(inlineMenu === t.id ? null : t.id); }}
                            disabled={patchLoading === t.id}
                            className="rounded-md p-1 transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                            title="Task actions">
                            {patchLoading === t.id
                              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              : <MoreHorizontal className="h-3.5 w-3.5" />}
                          </button>
                          {inlineMenu === t.id && (
                            <>
                              {/* Backdrop */}
                              <div className="fixed inset-0 z-20" onClick={() => setInlineMenu(null)} />
                              {/* Popup */}
                              <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl shadow-lg"
                                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                {wsId && (
                                  <Link href={`/workspaces/${wsId}?task=${t.id}`}
                                    className="flex items-center gap-2 px-3 py-2 text-xs"
                                    style={{ color: 'var(--accent-primary)' }}
                                    onClick={() => setInlineMenu(null)}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                    Open in workspace ↗
                                  </Link>
                                )}
                                {(TASK_STATUS_TRANSITIONS[statusTier][t.status] ?? []).length > 0 && (
                                  <div style={{ borderTop: wsId ? '1px solid var(--border-subtle)' : undefined }}>
                                    <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide"
                                      style={{ color: 'var(--text-muted)' }}>
                                      Change Status
                                    </div>
                                    {(TASK_STATUS_TRANSITIONS[statusTier][t.status] ?? []).map((s) => (
                                      <button key={s} type="button"
                                        onClick={() => openInlineStatusMenu(t, s)}
                                        className="flex w-full items-center px-3 py-2 text-xs text-left"
                                        style={{ color: 'var(--text-primary)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                        {TASK_STATUS_DISPLAY_NAMES[s] ?? s}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Normal user table ── */
          <>
            <div
              className="grid text-xs font-medium px-5 py-2.5"
              style={{
                gridTemplateColumns: '1fr 120px 90px 100px 120px 28px',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Due Date</span>
              <span>Workspace</span>
              <span />
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {filtered.map((t) => {
                const overdue = isOverdue(t.dueDate, t.status);
                const ss = statusStyle(t.status);
                const ps = priorityStyle(t.priority);
                // /dashboard/my-tasks includes t.workspace directly; fall back for super-user path
                const wsId   = t.workspace?.id ?? t.workspaceId ?? '';
                const wsName = t.workspace?.name ?? '—';
                return (
                  <div
                    key={t.id}
                    className="grid items-center px-5 py-3 cursor-pointer"
                    style={{ gridTemplateColumns: '1fr 130px 90px 100px 130px 28px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate"
                          style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}>
                          {overdue && '⚠ '}{t.title}
                        </p>
                        {t.isReference && (
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                            Ref
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {wsName}{t.taskList?.name ? ` · ${t.taskList.name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full w-fit"
                      style={{ color: ss.color, backgroundColor: ss.bg }}>
                      {ss.label}
                    </span>
                    <span className="text-xs font-medium" style={{ color: t.isReference ? 'var(--text-muted)' : ps.color }}>
                      {t.isReference ? 'Reference' : ps.label}
                    </span>
                    <span className="text-xs" style={{ color: overdue ? 'var(--state-error)' : 'var(--text-muted)' }}>
                      {t.dueDate ? (
                        <>
                          {overdue && <Clock className="inline h-3 w-3 mr-0.5" />}
                          {new Date(t.dueDate).toLocaleDateString('en-GB')}
                        </>
                      ) : '—'}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--accent-primary)' }}>
                      {wsName}
                    </span>
                    {wsId ? (
                      <Link href={`/workspaces/${wsId}?task=${t.id}`} className="flex items-center justify-center"
                        title="Open task">
                        <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-disabled)' }} />
                      </Link>
                    ) : <span />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Super User: empty state with helpful actions */}
      {isSuperUser && !loading && tasks.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 py-10 rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--state-success)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No tasks in the system yet.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create a workspace and add tasks to get started.</p>
          <Link href="/workspaces"
            className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
            Open Workspaces <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Super User: count label */}
      {isSuperUser && !loading && filtered.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} task{filtered.length !== 1 ? 's' : ''} — {tasks.length} total across all workspaces
        </p>
      )}

      {/* Status change confirmation dialog */}
      {statusDialogTask && statusDialogTarget && (() => {
        const cfg = STATUS_CONFIRM_CONFIG[statusDialogTarget];
        if (!cfg) return null;
        const btnStyle: Record<string, { bg: string }> = {
          primary: { bg: 'var(--accent-primary)' },
          danger:  { bg: 'var(--state-error)' },
          warning: { bg: 'var(--state-warning)' },
        };
        const btn = btnStyle[cfg.confirmStyle] ?? btnStyle.primary;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <div
              className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{cfg.title}</h3>
                <button type="button" onClick={closeStatusDialog} className="rounded p-1" style={{ color: 'var(--text-muted)' }} aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {cfg.body}
                {' '}<span className="font-medium" style={{ color: 'var(--text-primary)' }}>&ldquo;{statusDialogTask.title}&rdquo;</span>
              </p>
              {cfg.reasonLabel && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{cfg.reasonLabel}</label>
                  <textarea
                    autoFocus
                    rows={3}
                    value={statusDialogReason}
                    onChange={(e) => setStatusDialogReason(e.target.value)}
                    placeholder={cfg.reasonPlaceholder}
                    className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                  />
                </div>
              )}
              {statusDialogError && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--state-error-soft)' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--state-error)' }} />
                  <p className="text-xs" style={{ color: 'var(--state-error)' }}>{statusDialogError}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeStatusDialog} disabled={statusDialogLoading}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="button" onClick={() => void confirmInlineStatusChange()}
                  disabled={statusDialogLoading || (cfg.reasonRequired && !statusDialogReason.trim())}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: btn.bg }}>
                  {statusDialogLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {cfg.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
