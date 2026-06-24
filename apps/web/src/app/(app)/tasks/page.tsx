'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ListChecks, RefreshCw, ChevronRight, Users, Search,
  Clock, AlertTriangle, CheckCircle2, MoreHorizontal,
  Loader2, AlertCircle, X, Lock, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPatchAuth, ApiError } from '@/lib/api';
import {
  TASK_STATUS_TRANSITIONS, TASK_STATUS_DISPLAY_NAMES, STATUS_CONFIRM_CONFIG,
  type StatusTier,
} from '@/lib/task-status';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskUser { id: string; fullName: string; }
interface TaskWorkspace { id: string; name: string; }
interface TaskList { id: string; name: string; }

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  isReference: boolean;
  recurrenceInterval?: string;
  approvalStatus?: string;
  assignee: TaskUser | null;
  assigneeId?: string | null;
  createdBy: TaskUser | null;
  taskList: TaskList | null;
  workspace: TaskWorkspace | null;
  workspaceId?: string;
}

interface EligibleUser { id: string; fullName: string; email: string; }

interface MyTaskSummary {
  open: number; inProgress: number; waitingReview: number;
  returned: number; overdue: number; completed: number; total: number;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
const SUPER_ROLES    = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];

// ─── Kuwait date helpers ──────────────────────────────────────────────────────

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

function fmtKuwaitTooltip(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED', 'COMPLETED', 'CANCELLED'];

function statusStyle(status: string): { color: string; bg: string; label: string } {
  switch (status) {
    case 'TODO':           return { color: 'var(--text-muted)',     bg: 'var(--bg-muted)',           label: 'To Do' };
    case 'IN_PROGRESS':    return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)',         label: 'In Progress' };
    case 'WAITING_REVIEW': return { color: 'var(--state-warning)',  bg: 'var(--state-warning-soft)', label: 'Awaiting Review' };
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

function isOverdue(dueDate: string | null, status: string, approvalStatus?: string): boolean {
  if (!dueDate) return false;
  if (status === 'COMPLETED' || status === 'CANCELLED') return false;
  if (approvalStatus === 'PENDING') return false;
  return new Date(dueDate) < new Date();
}

// ─── View definitions ─────────────────────────────────────────────────────────

type ViewKey =
  | 'all' | 'my' | 'pending-approval' | 'open' | 'unassigned'
  | 'overdue' | 'awaiting-review' | 'returned' | 'reference' | 'completed';

const NORMAL_VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'open',           label: 'Open' },
  { key: 'awaiting-review',label: 'Awaiting Review' },
  { key: 'returned',       label: 'Returned' },
  { key: 'overdue',        label: 'Overdue' },
  { key: 'completed',      label: 'Done' },
  { key: 'all',            label: 'All' },
];

const SUPER_VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'all',            label: 'All Tasks' },
  { key: 'my',             label: 'My Tasks' },
  { key: 'pending-approval',label: 'Pending Approval' },
  { key: 'open',           label: 'Open' },
  { key: 'unassigned',     label: 'Unassigned' },
  { key: 'overdue',        label: 'Overdue' },
  { key: 'awaiting-review',label: 'Awaiting Review' },
  { key: 'returned',       label: 'Returned' },
  { key: 'reference',      label: 'Reference Only' },
  { key: 'completed',      label: 'Completed' },
];

const OPEN_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED']);

// ─── Main component ───────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, token } = useAuth();
  const searchParams    = useSearchParams();

  const roles       = user?.roles ?? [];
  const isElevated  = roles.some((r) => ELEVATED_ROLES.includes(r));
  const isSuperRole = roles.some((r) => SUPER_ROLES.includes(r));
  const isSuperUser = isElevated; // both super and ISO/QHSE get business table
  const base        = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const rawView   = searchParams.get('view') as ViewKey | null;
  const defaultView: ViewKey = isSuperUser ? 'all' : 'open';
  const [view, setView]         = useState<ViewKey>(rawView ?? defaultView);

  const [tasks, setTasks]           = useState<Task[]>([]);
  const [summaryData, setSummaryData] = useState<MyTaskSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filterWsId, setFilterWsId] = useState('');

  // Inline action (status change)
  const [inlineMenu, setInlineMenu]     = useState<string | null>(null);
  const [patchLoading, setPatchLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [statusDialogTask, setStatusDialogTask]       = useState<Task | null>(null);
  const [statusDialogTarget, setStatusDialogTarget]   = useState<string | null>(null);
  const [statusDialogReason, setStatusDialogReason]   = useState('');
  const [statusDialogError, setStatusDialogError]     = useState('');
  const [statusDialogLoading, setStatusDialogLoading] = useState(false);

  // Inline assignee control (super user / elevated)
  const [openAssigneeTaskId, setOpenAssigneeTaskId]   = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch]           = useState('');
  const [assigneeUpdating, setAssigneeUpdating]       = useState<Set<string>>(new Set());
  const [eligibleByWs, setEligibleByWs]               = useState<Record<string, EligibleUser[]>>({});
  const [eligibleLoadingWs, setEligibleLoadingWs]     = useState<Set<string>>(new Set());
  const assigneeDropdownRef = useRef<HTMLDivElement | null>(null);

  const statusTier: StatusTier = isElevated ? 'ELEVATED' : 'MEMBER';

  useEffect(() => { if (rawView) setView(rawView as ViewKey); }, [rawView]);

  const load = useCallback(async () => {
    if (!token || !user?.id) return;
    setLoading(true);
    setError('');
    try {
      if (isSuperUser) {
        const res = await fetch(`${base}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json() as Task[];
        setTasks(data);
        setSummaryData(null);
      } else {
        const data = await apiGet<{ summary: MyTaskSummary; tasks: Task[] }>('/dashboard/my-tasks', token);
        setTasks(data.tasks);
        setSummaryData(data.summary);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [base, token, user?.id, isSuperUser]);

  useEffect(() => { void load(); }, [load]);

  // Close menus on outside click
  useEffect(() => {
    if (!inlineMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setInlineMenu(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [inlineMenu]);

  useEffect(() => {
    if (!openAssigneeTaskId) return;
    const h = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setOpenAssigneeTaskId(null);
        setAssigneeSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openAssigneeTaskId]);

  // Load eligible users per workspace (lazy, cached)
  async function loadEligibleUsers(wsId: string) {
    if (!token || eligibleByWs[wsId] || eligibleLoadingWs.has(wsId)) return;
    setEligibleLoadingWs((prev) => new Set([...prev, wsId]));
    try {
      const data = await apiGet<EligibleUser[]>(`/workspaces/${wsId}/members/eligible`, token);
      setEligibleByWs((prev) => ({ ...prev, [wsId]: data }));
    } catch { /* silently fail */ }
    finally {
      setEligibleLoadingWs((prev) => { const next = new Set(prev); next.delete(wsId); return next; });
    }
  }

  async function handleInlineAssign(taskId: string, newAssigneeId: string | null) {
    if (!token || assigneeUpdating.has(taskId)) return;
    setAssigneeUpdating((prev) => new Set([...prev, taskId]));
    setOpenAssigneeTaskId(null);
    setAssigneeSearch('');
    try {
      await apiPatchAuth<Task>(`/tasks/${taskId}`, { assigneeId: newAssigneeId }, token);
      setTasks((prev) => prev.map((t) => {
        if (t.id !== taskId) return t;
        const eu = newAssigneeId ? eligibleByWs[t.workspace?.id ?? '']?.find((u) => u.id === newAssigneeId) : null;
        return { ...t, assigneeId: newAssigneeId, assignee: eu ? { id: eu.id, fullName: eu.fullName } : null };
      }));
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setError('This task was updated by another user. Refresh before assigning.');
      }
    } finally {
      setAssigneeUpdating((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    }
  }

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

  // ─── Derived workspace list (zero N+1 — from loaded tasks) ─────────────────
  const workspaceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((t) => {
      const wsId   = t.workspace?.id ?? t.workspaceId ?? '';
      const wsName = t.workspace?.name;
      if (wsId && wsName && !seen.has(wsId)) seen.set(wsId, wsName);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // ─── Filtered tasks ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (filterWsId) {
        const wsId = t.workspace?.id ?? t.workspaceId ?? '';
        if (wsId !== filterWsId) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const wsMatch    = (t.workspace?.name ?? '').toLowerCase().includes(q);
        const listMatch  = (t.taskList?.name ?? '').toLowerCase().includes(q);
        const creatorMatch = (t.createdBy?.fullName ?? '').toLowerCase().includes(q);
        if (!titleMatch && !wsMatch && !listMatch && !creatorMatch) return false;
      }
      return true;
    });

    const isPending = (t: Task) => t.approvalStatus === 'PENDING';
    const isApproved = (t: Task) => !t.approvalStatus || t.approvalStatus === 'APPROVED';

    switch (view) {
      case 'my':
        list = list.filter((t) => t.assignee?.id === user?.id);
        break;
      case 'pending-approval':
        list = list.filter(isPending);
        break;
      case 'open':
        list = list.filter((t) => isApproved(t) && OPEN_STATUSES.has(t.status) && !t.isReference);
        break;
      case 'unassigned':
        list = list.filter((t) => isApproved(t) && !t.assignee && OPEN_STATUSES.has(t.status) && !t.isReference);
        break;
      case 'overdue':
        list = list.filter((t) => isApproved(t) && isOverdue(t.dueDate, t.status, t.approvalStatus) && !t.isReference);
        break;
      case 'awaiting-review':
        list = list.filter((t) => t.status === 'WAITING_REVIEW' && isApproved(t));
        break;
      case 'returned':
        list = list.filter((t) => t.status === 'REJECTED' && isApproved(t));
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
      // Pending approval first
      if (a.approvalStatus === 'PENDING' && b.approvalStatus !== 'PENDING') return -1;
      if (b.approvalStatus === 'PENDING' && a.approvalStatus !== 'PENDING') return 1;
      const aOv = isOverdue(a.dueDate, a.status, a.approvalStatus) ? 0 : 1;
      const bOv = isOverdue(b.dueDate, b.status, b.approvalStatus) ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    });
  }, [tasks, view, search, filterWsId, user?.id]);

  // ─── Summary counts ─────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const apvd = tasks.filter((t) => !t.approvalStatus || t.approvalStatus === 'APPROVED');
    const op   = apvd.filter((t) => !t.isReference);
    return {
      pendingApproval: tasks.filter((t) => t.approvalStatus === 'PENDING').length,
      open:           op.filter((t) => OPEN_STATUSES.has(t.status)).length,
      inProgress:     op.filter((t) => t.status === 'IN_PROGRESS').length,
      unassigned:     op.filter((t) => !t.assignee && OPEN_STATUSES.has(t.status)).length,
      overdue:        op.filter((t) => isOverdue(t.dueDate, t.status, t.approvalStatus)).length,
      awaitingReview: op.filter((t) => t.status === 'WAITING_REVIEW').length,
      returned:       op.filter((t) => t.status === 'REJECTED').length,
      completed:      apvd.filter((t) => t.status === 'COMPLETED').length,
      my:             tasks.filter((t) => t.assignee?.id === user?.id).length,
      all:            tasks.length,
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
        <button onClick={() => void load()} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      {isSuperUser ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {([
            { label: 'Open',            key: 'open' as ViewKey,            value: counts.open,           color: 'var(--accent-primary)' },
            { label: 'In Progress',     key: 'open' as ViewKey,            value: counts.inProgress,     color: 'var(--accent-primary)' },
            { label: 'Pending Approval',key: 'pending-approval' as ViewKey,value: counts.pendingApproval,color: counts.pendingApproval > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' },
            { label: 'Unassigned',      key: 'unassigned' as ViewKey,      value: counts.unassigned,     color: counts.unassigned > 0 ? 'var(--state-warning)' : 'var(--text-muted)' },
            { label: 'Overdue',         key: 'overdue' as ViewKey,         value: counts.overdue,        color: counts.overdue > 0 ? 'var(--state-error)' : 'var(--text-muted)' },
            { label: 'Awaiting Review', key: 'awaiting-review' as ViewKey, value: counts.awaitingReview, color: counts.awaitingReview > 0 ? 'var(--state-warning)' : 'var(--text-muted)' },
            { label: 'Returned',        key: 'returned' as ViewKey,        value: counts.returned,       color: counts.returned > 0 ? 'var(--state-error)' : 'var(--text-muted)' },
            { label: 'Completed',       key: 'completed' as ViewKey,       value: counts.completed,      color: 'var(--state-success)' },
          ] as Array<{ label: string; key: ViewKey; value: number; color: string }>).map((s) => (
            <button key={s.label} type="button" onClick={() => setView(s.key)}
              className="rounded-xl px-3 py-2.5 text-left transition-all"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: view === s.key ? `1.5px solid ${s.color}` : '1px solid var(--border-default)',
              }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            { label: 'Open',           value: summaryData?.open },
            { label: 'In Progress',    value: summaryData?.inProgress },
            { label: 'Awaiting Review',value: summaryData?.waitingReview },
            { label: 'Returned',       value: summaryData?.returned },
            { label: 'Overdue',        value: summaryData?.overdue },
            { label: 'Total',          value: summaryData?.total },
          ] as Array<{ label: string; value: number | undefined }>).map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              {loading ? (
                <div className="mt-2 h-6 w-12 animate-pulse rounded" style={{ backgroundColor: 'var(--bg-muted)' }} />
              ) : (
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>
                  {error && s.value === undefined ? '—' : (s.value ?? 0)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex flex-1 min-w-48 items-center gap-2 rounded-lg px-3 h-9"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tasks, workspace, creator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Workspace filter (super user only) */}
        {isSuperUser && workspaceOptions.length > 0 && (
          <select
            value={filterWsId}
            onChange={(e) => setFilterWsId(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm h-9"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            aria-label="Filter by workspace">
            <option value="">All Workspaces</option>
            {workspaceOptions.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        )}

        {/* View filter tabs */}
        <div className="flex flex-wrap gap-1">
          {views.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              className="px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap"
              style={{
                borderColor:       view === key ? 'var(--accent-primary)' : 'var(--border-default)',
                backgroundColor:   view === key ? 'var(--accent-soft)'    : 'var(--bg-surface)',
                color:             view === key ? 'var(--accent-primary)'  : 'var(--text-muted)',
              }}>
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
              {search || filterWsId ? 'No tasks match the selected filters.' : 'No tasks in this view.'}
            </p>
          </div>
        ) : isSuperUser ? (
          /* ── Super User table ── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Task', 'Workspace', 'Task List', 'Status', 'Priority', 'Assignee', 'Due Date', 'Updated', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const overdue  = isOverdue(t.dueDate, t.status, t.approvalStatus);
                  const isPending = t.approvalStatus === 'PENDING';
                  const isLocked  = t.status === 'COMPLETED' || t.status === 'CANCELLED' || isPending;
                  const ss = statusStyle(t.status);
                  const ps = priorityStyle(t.priority);
                  const wsId   = t.workspace?.id   ?? t.workspaceId ?? '';
                  const wsName = t.workspace?.name ?? null;
                  const eligibleUsers = wsId ? (eligibleByWs[wsId] ?? []) : [];
                  const isLoadingWs   = wsId ? eligibleLoadingWs.has(wsId) : false;
                  const filteredEligible = eligibleUsers.filter((u) =>
                    !assigneeSearch || u.fullName.toLowerCase().includes(assigneeSearch.toLowerCase()),
                  );
                  return (
                    <tr key={t.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>

                      {/* Task cell */}
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium"
                            style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}>
                            {overdue && '⚠ '}{t.title}
                          </span>
                          {isPending && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium flex items-center gap-0.5"
                              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                              <Lock className="h-2 w-2" />Pending
                            </span>
                          )}
                          {t.isReference && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>Ref</span>
                          )}
                          {t.recurrenceInterval && t.recurrenceInterval !== 'NONE' && (
                            <span className="shrink-0 text-[9px]" style={{ color: 'var(--text-muted)' }} title="Recurring">↻</span>
                          )}
                        </div>
                        <p className="truncate text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t.createdBy?.fullName ?? 'Unknown user'}
                        </p>
                      </td>

                      {/* Workspace cell */}
                      <td className="px-3 py-2.5 max-w-[150px]">
                        {wsId && wsName ? (
                          <Link href={`/workspaces/${wsId}?task=${t.id}`}
                            className="truncate block hover:underline font-medium"
                            style={{ color: 'var(--accent-primary)' }}
                            title={`Open ${wsName}`}>
                            {wsName}
                          </Link>
                        ) : wsId ? (
                          <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }} title="Workspace unavailable or access denied.">
                            Unavailable
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)' }}>—</span>
                        )}
                      </td>

                      {/* Task List cell */}
                      <td className="px-3 py-2.5 max-w-[120px]">
                        <span className="truncate block" style={{ color: 'var(--text-secondary)' }}>
                          {t.taskList?.name ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ color: ss.color, backgroundColor: ss.bg }}>
                          {ss.label}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span style={{ color: t.isReference ? 'var(--text-muted)' : ps.color }}>
                          {t.isReference ? 'Reference' : ps.label}
                        </span>
                      </td>

                      {/* Assignee — inline dropdown for authorized users */}
                      <td className="px-3 py-2.5 max-w-[130px]" onClick={(e) => e.stopPropagation()}>
                        {isLocked ? (
                          /* Read-only for locked tasks */
                          t.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                {t.assignee.fullName.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{t.assignee.fullName}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)' }}>—</span>
                          )
                        ) : assigneeUpdating.has(t.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <div className="relative">
                            <button type="button"
                              onClick={() => {
                                if (openAssigneeTaskId === t.id) {
                                  setOpenAssigneeTaskId(null);
                                  setAssigneeSearch('');
                                } else {
                                  setOpenAssigneeTaskId(t.id);
                                  setAssigneeSearch('');
                                  if (wsId) void loadEligibleUsers(wsId);
                                }
                              }}
                              className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors"
                              style={{ color: t.assignee ? 'var(--text-secondary)' : 'var(--state-warning)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                              {t.assignee ? (
                                <>
                                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                                    style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                    {t.assignee.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[70px] text-[10px]">{t.assignee.fullName}</span>
                                  <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                                </>
                              ) : (
                                <>
                                  <Users className="h-3 w-3" />
                                  <span className="text-[10px]">+ Assign</span>
                                </>
                              )}
                            </button>

                            {openAssigneeTaskId === t.id && (
                              <div ref={assigneeDropdownRef}
                                className="absolute left-0 top-full z-30 mt-1 w-52 rounded-xl shadow-lg overflow-hidden"
                                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <div className="p-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                                  <input
                                    type="text"
                                    placeholder="Search…"
                                    value={assigneeSearch}
                                    onChange={(e) => setAssigneeSearch(e.target.value)}
                                    autoFocus
                                    className="w-full rounded-lg px-2 py-1 text-xs bg-transparent outline-none"
                                    style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {isLoadingWs ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                  ) : filteredEligible.length === 0 ? (
                                    <p className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No eligible users.</p>
                                  ) : (
                                    filteredEligible.map((u) => {
                                      const isCurrent = t.assignee?.id === u.id;
                                      return (
                                        <button key={u.id} type="button"
                                          onClick={() => void handleInlineAssign(t.id, isCurrent ? null : u.id)}
                                          disabled={isCurrent}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition-colors disabled:opacity-60"
                                          style={{ color: 'var(--text-primary)' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                                            style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                            {u.fullName.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="flex-1 truncate">{u.fullName}</span>
                                          {isCurrent && <span style={{ color: 'var(--accent-primary)' }}>✓</span>}
                                        </button>
                                      );
                                    })
                                  )}
                                  {t.assignee && (
                                    <>
                                      <div className="border-t mx-2" style={{ borderColor: 'var(--border-subtle)' }} />
                                      <button type="button"
                                        onClick={() => void handleInlineAssign(t.id, null)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                        style={{ color: 'var(--state-warning)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                        Unassign
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {t.dueDate ? (
                          <span style={{ color: overdue ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                            {overdue && <Clock className="inline h-3 w-3 mr-0.5" />}
                            {fmtKuwaitDate(t.dueDate)}
                          </span>
                        ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                      </td>

                      {/* Updated — exact Kuwait date+time */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {t.updatedAt ? (
                          <div title={fmtKuwaitTooltip(t.updatedAt)}>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtKuwaitDate(t.updatedAt)}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtKuwaitTime(t.updatedAt)}</div>
                          </div>
                        ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                      </td>

                      {/* Actions menu */}
                      <td className="px-3 py-2.5">
                        <div className="relative flex items-center justify-center"
                          ref={inlineMenu === t.id ? menuRef : null}>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); setInlineMenu(inlineMenu === t.id ? null : t.id); }}
                            disabled={patchLoading === t.id}
                            className="rounded-md p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                            title="Task actions">
                            {patchLoading === t.id
                              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              : <MoreHorizontal className="h-3.5 w-3.5" />}
                          </button>
                          {inlineMenu === t.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setInlineMenu(null)} />
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
                                {!isPending && (TASK_STATUS_TRANSITIONS[statusTier][t.status] ?? []).length > 0 && (
                                  <div style={{ borderTop: wsId ? '1px solid var(--border-subtle)' : undefined }}>
                                    <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
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
            <div className="grid text-xs font-medium px-5 py-2.5"
              style={{
                gridTemplateColumns: '1fr 120px 90px 100px 120px 28px',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}>
              <span>Task</span><span>Status</span><span>Priority</span><span>Due Date</span><span>Workspace</span><span />
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {filtered.map((t) => {
                const overdue = isOverdue(t.dueDate, t.status, t.approvalStatus);
                const ss = statusStyle(t.status);
                const ps = priorityStyle(t.priority);
                const wsId   = t.workspace?.id ?? t.workspaceId ?? '';
                const wsName = t.workspace?.name ?? '—';
                return (
                  <div key={t.id} className="grid items-center px-5 py-3 cursor-pointer"
                    style={{ gridTemplateColumns: '1fr 130px 90px 100px 130px 28px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate"
                          style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}>
                          {overdue && '⚠ '}{t.title}
                        </p>
                        {t.isReference && (
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>Ref</span>
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {wsName}{t.taskList?.name ? ` · ${t.taskList.name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full w-fit" style={{ color: ss.color, backgroundColor: ss.bg }}>{ss.label}</span>
                    <span className="text-xs font-medium" style={{ color: t.isReference ? 'var(--text-muted)' : ps.color }}>
                      {t.isReference ? 'Reference' : ps.label}
                    </span>
                    <span className="text-xs" style={{ color: overdue ? 'var(--state-error)' : 'var(--text-muted)' }}>
                      {t.dueDate ? <>{overdue && <Clock className="inline h-3 w-3 mr-0.5" />}{fmtKuwaitDate(t.dueDate)}</> : '—'}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--accent-primary)' }}>{wsName}</span>
                    {wsId ? (
                      <Link href={`/workspaces/${wsId}?task=${t.id}`} className="flex items-center justify-center" title="Open task">
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

      {/* Count label */}
      {isSuperUser && !loading && filtered.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {tasks.length} total task{tasks.length !== 1 ? 's' : ''}
          {filterWsId && workspaceOptions.find((w) => w.id === filterWsId) ? ` in ${workspaceOptions.find((w) => w.id === filterWsId)!.name}` : ' across all workspaces'}
        </p>
      )}

      {/* Empty state for super user with no tasks at all */}
      {isSuperUser && !loading && tasks.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 py-10 rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--state-success)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No tasks across all workspaces.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create a workspace and add tasks to get started.</p>
          <Link href="/workspaces"
            className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
            Open Workspaces <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
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
            <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{cfg.title}</h3>
                <button type="button" onClick={closeStatusDialog} className="rounded p-1" style={{ color: 'var(--text-muted)' }} aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {cfg.body} <span className="font-medium" style={{ color: 'var(--text-primary)' }}>&ldquo;{statusDialogTask.title}&rdquo;</span>
              </p>
              {cfg.reasonLabel && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{cfg.reasonLabel}</label>
                  <textarea autoFocus rows={3} value={statusDialogReason}
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
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
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
