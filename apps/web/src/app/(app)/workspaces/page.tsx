'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Loader2, FolderOpen, ListTodo, CheckSquare, MoreHorizontal,
  Pencil, Archive, RotateCcw, Trash2, Search, LayoutGrid, List,
  Clock, FileSearch, AlertCircle, ShieldCheck, Users, ShieldAlert,
  RefreshCw, Zap, AlertTriangle,
} from 'lucide-react';
import { apiGet, apiPatchAuth, apiDeleteAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-provider';
import { StatusBadge, WorkspaceOpStatusBadge } from '@/components/status-badge';
import { CreateWorkspaceModal } from '@/features/workspaces/create-workspace-modal';
import { EditWorkspaceModal } from '@/features/workspaces/edit-workspace-modal';
import { EditWorkspaceAccessModal } from '@/features/workspaces/edit-workspace-access-modal';
import type { WorkspaceSummary, WorkspaceDetail } from '@/features/workspaces/types';
import Link from 'next/link';

// Roles that see all workspaces and get the business control view
const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

// Events that should trigger the "New updates available" stale banner
const STALE_EVENTS = [
  'task.created', 'task.updated', 'task.deleted',
  'document.created', 'document.updated',
  'ncr.created', 'ncr.updated',
  'attachment.created',
  'workspace.member.added', 'workspace.member.removed',
] as const;

export default function WorkspacesPage() {
  const { token, user } = useAuth();
  const { socket } = useSocket();

  const [workspaces, setWorkspaces]         = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading]               = useState(true);
  const [hasUpdates, setHasUpdates]         = useState(false);
  const [showCreate, setShowCreate]         = useState(false);
  const [editTarget, setEditTarget]         = useState<WorkspaceSummary | null>(null);
  const [accessTarget, setAccessTarget]     = useState<WorkspaceSummary | null>(null);
  const [openMenu, setOpenMenu]             = useState<string | null>(null);
  const [statusLoading, setStatusLoading]   = useState<string | null>(null);
  const [query, setQuery]                   = useState('');
  const [statusFilter, setStatusFilter]     = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [attentionFilter, setAttentionFilter] = useState<'' | 'OVERDUE' | 'ISSUES' | 'DOCS_REVIEW'>('');
  const [sortMode, setSortMode]             = useState<'RECENT' | 'NAME' | 'ATTENTION' | 'MOST_TASKS'>('RECENT');
  const [viewMode, setViewMode]             = useState<'CARD' | 'TABLE'>('CARD');
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Per-workspace debounce timers for targeted realtime refresh
  const wsRefreshTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const roles    = user?.roles ?? [];
  const isElevated = roles.some((r) => ELEVATED_ROLES.includes(r));
  const canCreate = user?.permissions?.includes('project.create') ?? false;
  const canUpdate = user?.permissions?.includes('project.update') ?? false;
  const canDelete = roles.some((r) => ['SUPER_ADMIN', 'IT_ADMIN'].includes(r));

  const [deleteTarget, setDeleteTarget]         = useState<WorkspaceSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteLoading, setDeleteLoading]       = useState(false);
  const [deleteError, setDeleteError]           = useState('');

  // ── Data load ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setHasUpdates(false);
    try {
      const data = await apiGet<WorkspaceSummary[]>('/workspaces', token);
      setWorkspaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // ── Realtime: per-workspace debounced patch ───────────────────────────────

  function scheduleWorkspaceRefresh(wsId: string) {
    if (wsRefreshTimers.current[wsId]) clearTimeout(wsRefreshTimers.current[wsId]);
    wsRefreshTimers.current[wsId] = setTimeout(async () => {
      const tok = tokenRef.current;
      if (!tok) return;
      try {
        const updated = await apiGet<WorkspaceDetail>(`/workspaces/${wsId}`, tok);
        setWorkspaces((prev) => prev.map((w) => {
          if (w.id !== wsId) return w;
          return {
            ...w,
            operationalStatus:      updated.operationalStatus,
            operationalStatusLabel: updated.operationalStatusLabel,
            operationalReasons:     updated.operationalReasons,
            metrics:                updated.metrics,
            status:                 updated.status,
            name:                   updated.name,
            description:            updated.description,
            updatedAt:              updated.updatedAt,
            summary:                updated.summary,
            department:             updated.department,
            departmentId:           updated.departmentId,
          };
        }));
      } catch { /* workspace deleted or access revoked — ignore */ }
      delete wsRefreshTimers.current[wsId];
    }, 400);
  }

  useEffect(() => {
    if (!socket) return;
    const handler = (data: Record<string, unknown>) => {
      const wsId = (data as { workspaceId?: string }).workspaceId;
      if (wsId) {
        scheduleWorkspaceRefresh(wsId);
      } else {
        setHasUpdates(true);
      }
    };
    STALE_EVENTS.forEach((e) => socket.on(e, handler));
    return () => { STALE_EVENTS.forEach((e) => socket.off(e, handler)); };
  // scheduleWorkspaceRefresh is defined in component scope and stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ── Menu close on outside click ───────────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    if (openMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getInitials(name: string | undefined) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }

  function getAttentionWeight(ws: WorkspaceSummary): number {
    const order: Record<string, number> = {
      CRITICAL: 5, NEEDS_ATTENTION: 4, SETUP_REQUIRED: 3, IN_PROGRESS: 2, HEALTHY: 1, INACTIVE: 0,
    };
    return order[ws.operationalStatus] ?? 0;
  }

  // ── Filtered + sorted workspaces ─────────────────────────────────────────

  const filteredWorkspaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...workspaces]
      .filter((ws) => {
        const matchesStatus    = statusFilter === 'ALL' || ws.status === statusFilter;
        const matchesQuery     = !normalized
          || ws.name.toLowerCase().includes(normalized)
          || (ws.description ?? '').toLowerCase().includes(normalized)
          || ws.owner.fullName.toLowerCase().includes(normalized);
        const matchesAttention =
          attentionFilter === ''          ? true
          : attentionFilter === 'OVERDUE' ? ws.summary.tasks.overdue > 0
          : attentionFilter === 'ISSUES'  ? ws.summary.ncrCapa.open > 0
          : attentionFilter === 'DOCS_REVIEW' ? ws.summary.documents.underReview > 0
          : true;
        return matchesStatus && matchesQuery && matchesAttention;
      })
      .sort((a, b) => {
        if (sortMode === 'NAME')        return a.name.localeCompare(b.name);
        if (sortMode === 'ATTENTION')   return getAttentionWeight(b) - getAttentionWeight(a);
        if (sortMode === 'MOST_TASKS')  return (b.metrics?.openTasks ?? b.summary.tasks.open) - (a.metrics?.openTasks ?? a.summary.tasks.open);
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortMode, statusFilter, attentionFilter, workspaces]);

  // ── Page-level KPI aggregates ────────────────────────────────────────────

  const pageSummary = useMemo(() => {
    const total        = workspaces.length;
    const active       = workspaces.filter((ws) => ws.status === 'ACTIVE').length;
    const openTasks    = workspaces.reduce((s, ws) => s + (ws.metrics?.openTasks ?? ws.summary.tasks.open), 0);
    const overdueTasks = workspaces.reduce((s, ws) => s + (ws.metrics?.overdueTasks ?? ws.summary.tasks.overdue), 0);
    const docsReview   = workspaces.reduce((s, ws) => s + (ws.metrics?.documentsUnderReview ?? ws.summary.documents.underReview), 0);
    const openIssues   = workspaces.reduce((s, ws) => s + (ws.metrics?.openIssues ?? ws.summary.ncrCapa.open), 0);
    const critical     = workspaces.filter((ws) => ws.operationalStatus === 'CRITICAL').length;
    const needsAttention = workspaces.filter((ws) => ws.operationalStatus === 'NEEDS_ATTENTION').length;
    const setupRequired  = workspaces.filter((ws) => ws.operationalStatus === 'SETUP_REQUIRED').length;
    return { total, active, openTasks, overdueTasks, docsReview, openIssues, critical, needsAttention, setupRequired };
  }, [workspaces]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleStatusChange(ws: WorkspaceSummary, newStatus: 'ACTIVE' | 'ARCHIVED') {
    setOpenMenu(null);
    setStatusLoading(ws.id);
    try {
      const updated = await apiPatchAuth<WorkspaceSummary>(`/workspaces/${ws.id}`, { status: newStatus }, token!);
      setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? { ...w, ...updated } : w)));
    } catch (err) {
      console.error('Failed to update workspace status', err);
    } finally {
      setStatusLoading(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await apiDeleteAuth(`/workspaces/${deleteTarget.id}`, token!);
      setWorkspaces((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmName('');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete workspace.');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* ── Stale banner ────────────────────────────────────────────────── */}
      {hasUpdates && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)30' }}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              Workspace data has changed.
            </span>
          </div>
          <button onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isElevated ? 'Business Workspaces' : 'My Workspaces'}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {isElevated
              ? 'Monitor all workspaces, tasks, documents, issues, members, and expiring files.'
              : 'Workspaces assigned to you.'}
          </p>
        </div>
        {canCreate && (
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}>
            <Plus className="h-4 w-4" />New Workspace
          </button>
        )}
      </div>

      {/* ── Business KPI bar ────────────────────────────────────────────── */}
      <div className="grid gap-3 rounded-xl px-4 py-3 sm:grid-cols-2 xl:grid-cols-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <SummaryItem label="Total Workspaces"    value={pageSummary.total}        icon={FolderOpen} />
        <SummaryItem label="Active"              value={pageSummary.active}       icon={ShieldCheck} color="var(--state-success)" />
        <SummaryItem label="Open Tasks"          value={pageSummary.openTasks}    icon={CheckSquare} color={pageSummary.overdueTasks > 0 ? 'var(--state-warning)' : 'var(--text-primary)'}
          sub={pageSummary.overdueTasks > 0 ? `${pageSummary.overdueTasks} overdue` : undefined} />
        <SummaryItem label="Open Issues"         value={pageSummary.openIssues}   icon={AlertCircle} color={pageSummary.openIssues > 0 ? 'var(--state-error)' : 'var(--text-primary)'} />
      </div>

      {/* ── Attention summary bar (elevated only) ───────────────────────── */}
      {isElevated && (pageSummary.critical > 0 || pageSummary.needsAttention > 0 || pageSummary.setupRequired > 0) && (
        <div className="rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--state-warning)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workspaces Requiring Attention</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pageSummary.critical > 0 && (
              <button type="button" onClick={() => { setSortMode('ATTENTION'); }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                <AlertCircle className="h-3 w-3" />
                {pageSummary.critical} Critical
              </button>
            )}
            {pageSummary.needsAttention > 0 && (
              <button type="button" onClick={() => { setSortMode('ATTENTION'); }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)' }}>
                <Clock className="h-3 w-3" />
                {pageSummary.needsAttention} Needs Attention
              </button>
            )}
            {pageSummary.setupRequired > 0 && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)' }}>
                <Users className="h-3 w-3" />
                {pageSummary.setupRequired} workspace{pageSummary.setupRequired !== 1 ? 's' : ''} require setup
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Filters and sort ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex min-h-10 flex-1 items-center gap-2 rounded-lg px-3"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Attention filter chips */}
          {attentionFilter !== '' && (
            <button type="button" onClick={() => setAttentionFilter('')}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)30' }}>
              Clear filter <span>×</span>
            </button>
          )}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select value={attentionFilter} onChange={(e) => setAttentionFilter(e.target.value as typeof attentionFilter)}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <option value="">All workspaces</option>
            <option value="OVERDUE">Has overdue tasks</option>
            <option value="ISSUES">Has open issues</option>
            <option value="DOCS_REVIEW">Has docs under review</option>
          </select>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <option value="RECENT">Recent activity</option>
            <option value="ATTENTION">Needs attention</option>
            <option value="MOST_TASKS">Most open tasks</option>
            <option value="NAME">Name</option>
          </select>
          <div className="flex h-10 items-center rounded-lg p-1"
            style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}>
            <button type="button" aria-label="Card view" onClick={() => setViewMode('CARD')}
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: viewMode === 'CARD' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'CARD' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Table view" onClick={() => setViewMode('TABLE')}
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: viewMode === 'TABLE' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'TABLE' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {canCreate ? (
            <>
              <FolderOpen className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No workspaces yet</p>
              <button type="button" onClick={() => setShowCreate(true)}
                className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-4 w-4" /> Create First Workspace
              </button>
            </>
          ) : (
            <>
              <ShieldAlert className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>You are not added to any workspace yet</p>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-disabled)' }}>
                Please contact your administrator or manager to be added as a workspace member.
              </p>
            </>
          )}
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl py-14"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <Search className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No matching workspaces</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Adjust the search or filter values.</p>
        </div>

      ) : viewMode === 'TABLE' ? (

        /* ── Table view ── */
        <div className="overflow-x-auto rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="grid min-w-[1060px] grid-cols-[1.6fr_160px_150px_140px_130px_150px] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-normal"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
            <span>Workspace</span>
            <span>Health</span>
            <span>Tasks</span>
            <span>Documents</span>
            <span>Issues</span>
            <span>Owner</span>
          </div>
          {filteredWorkspaces.map((ws) => {
            const openTasks   = ws.metrics?.openTasks ?? ws.summary.tasks.open;
            const overdueTasks = ws.metrics?.overdueTasks ?? ws.summary.tasks.overdue;
            const openIssues  = ws.metrics?.openIssues ?? ws.summary.ncrCapa.open;
            return (
              <div key={ws.id}
                className="grid min-w-[1060px] grid-cols-[1.6fr_160px_150px_140px_130px_150px] items-center gap-3 px-4 py-3 text-sm"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                <Link href={`/workspaces/${ws.id}`} className="min-w-0 font-medium hover:underline truncate" style={{ color: 'var(--text-primary)' }}>
                  {ws.name}
                </Link>
                <WorkspaceOpStatusBadge status={ws.operationalStatus} size="xs" />
                <span style={{ color: overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                  {openTasks} open{overdueTasks > 0 && `, ${overdueTasks} overdue`}
                </span>
                <span style={{ color: ws.summary.documents.underReview > 0 ? 'var(--state-warning)' : 'var(--text-secondary)' }}>
                  {ws.summary.documents.underReview > 0 ? `${ws.summary.documents.underReview} under review` : `${ws.summary.documents.approved} approved`}
                </span>
                <span style={{ color: openIssues > 0 ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                  {openIssues} open
                </span>
                <span className="truncate" style={{ color: 'var(--text-muted)' }}>{ws.owner.fullName}</span>
              </div>
            );
          })}
        </div>

      ) : (

        /* ── Card view ── */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.map((ws) => {
            const opReasons          = ws.operationalReasons ?? [];
            const opStatus           = ws.operationalStatus;
            const openTasks          = ws.metrics?.openTasks ?? ws.summary.tasks.open;
            const unassignedTasks    = ws.metrics?.unassignedTasks ?? 0;
            const overdueTasks       = ws.metrics?.overdueTasks ?? ws.summary.tasks.overdue;
            const openIssues         = ws.metrics?.openIssues ?? ws.summary.ncrCapa.open;
            const filesAttention     = (ws.metrics?.expiredFiles ?? 0) + (ws.metrics?.expiringFiles ?? 0);
            const operationalMembers = ws.metrics?.operationalMembers ?? ws._count.members ?? 0;

            // Dynamic primary action (elevated users only — spec Part 3)
            const primaryAction: { label: string; color: string } = (() => {
              switch (opStatus) {
                case 'SETUP_REQUIRED':  return { label: 'Review Setup',          color: 'var(--state-warning)' };
                case 'CRITICAL':        return { label: 'Review Critical Items', color: 'var(--state-error)' };
                case 'NEEDS_ATTENTION': return { label: 'Review Attention',      color: 'var(--state-warning)' };
                case 'IN_PROGRESS':     return { label: 'View Work',             color: 'var(--accent-primary)' };
                case 'INACTIVE':        return { label: 'View Workspace',        color: 'var(--text-muted)' };
                default:                return { label: 'Open Workspace',        color: 'var(--accent-primary)' };
              }
            })();
            const isHealthyOrOpen = opStatus === 'HEALTHY' || opStatus === 'IN_PROGRESS';

            // ── Normal-user (non-elevated) simplified card ───────────────────
            if (!isElevated) {
              return (
                <div key={ws.id}
                  className="group relative flex flex-col gap-3 rounded-xl p-5 transition-shadow hover:shadow-md"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>

                  {/* Header: name + lifecycle */}
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/workspaces/${ws.id}`}
                      className="flex-1 text-sm font-semibold leading-snug hover:underline truncate"
                      style={{ color: 'var(--text-primary)' }}>
                      {ws.name}
                    </Link>
                    <StatusBadge status={ws.status} size="xs" />
                  </div>

                  {ws.description && (
                    <p className="line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ws.description}</p>
                  )}

                  {/* Workspace-scope task counts — clearly labeled as workspace-wide */}
                  <div className="text-xs rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{openTasks}</span>
                        <span style={{ color: 'var(--text-muted)' }}> workspace tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ListTodo className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-muted)' }}>{ws._count.taskLists} list{ws._count.taskLists !== 1 ? 's' : ''}</span>
                      </div>
                      {operationalMembers > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                          <span style={{ color: 'var(--text-muted)' }}>{operationalMembers} member{operationalMembers !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: owner + single Open action */}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                        {getInitials(ws.owner.fullName)}
                      </div>
                      <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{ws.owner.fullName}</span>
                    </div>
                    <Link href={`/workspaces/${ws.id}`}
                      className="rounded px-3 py-1 text-xs font-medium"
                      style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                      Open Workspace →
                    </Link>
                  </div>
                </div>
              );
            }

            // ── Elevated-user full operational card (unchanged from spec Part 2-3) ──
            return (
              <div key={ws.id}
                className="group relative flex flex-col gap-3 rounded-xl p-5 transition-shadow hover:shadow-md"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>

                {/* Card header: name · lifecycle badge · three-dot menu */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/workspaces/${ws.id}`}
                    className="flex-1 text-sm font-semibold leading-snug hover:underline truncate"
                    style={{ color: 'var(--text-primary)' }}>
                    {ws.name}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={ws.status} size="xs" />
                    {canUpdate && (
                      <div className="relative" ref={openMenu === ws.id ? menuRef : undefined}>
                        <button type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenu((p) => (p === ws.id ? null : ws.id)); }}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          disabled={statusLoading === ws.id}>
                          {statusLoading === ws.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <MoreHorizontal className="h-4 w-4" />}
                        </button>
                        {openMenu === ws.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 rounded-xl py-1 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <MenuItem icon={Pencil}  label="Edit"         onClick={() => { setOpenMenu(null); setEditTarget(ws); }} />
                            {canDelete && <MenuItem icon={Users} label="Edit Access" onClick={() => { setOpenMenu(null); setAccessTarget(ws); }} />}
                            {ws.status === 'ACTIVE'
                              ? <MenuItem icon={Archive}   label="Archive"    onClick={() => void handleStatusChange(ws, 'ARCHIVED')} color="var(--state-warning)" />
                              : <MenuItem icon={RotateCcw} label="Reactivate" onClick={() => void handleStatusChange(ws, 'ACTIVE')}   color="var(--state-success)" />}
                            {canDelete && (
                              <>
                                <div className="my-1 mx-2" style={{ height: 1, backgroundColor: 'var(--border-default)' }} />
                                <MenuItem icon={Trash2} label="Delete" color="var(--state-error)"
                                  onClick={() => { setOpenMenu(null); setDeleteTarget(ws); setDeleteConfirmName(''); setDeleteError(''); }} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {ws.description && (
                  <p className="line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ws.description}</p>
                )}

                {/* Operational status badge + max-2 reasons (spec Part 2) */}
                <div className="flex flex-col gap-1.5">
                  <WorkspaceOpStatusBadge status={opStatus} size="xs" />
                  {opReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {opReasons.slice(0, 2).map((r) => (
                        <span key={r.code}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: r.severity === 'ERROR' ? 'var(--state-error-soft)' : r.severity === 'WARNING' ? 'var(--state-warning-soft)' : 'var(--bg-muted)',
                            color: r.severity === 'ERROR' ? 'var(--state-error)' : r.severity === 'WARNING' ? 'var(--state-warning)' : 'var(--text-muted)',
                          }}>
                          {r.label}
                        </span>
                      ))}
                      {opReasons.length > 2 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                          +{opReasons.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Metrics row — no duplicate member warning (spec Part 2) */}
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{openTasks}</span> Open</span>
                    <span>
                      <span className="font-medium" style={{ color: unassignedTasks > 0 ? 'var(--state-warning)' : 'var(--text-primary)' }}>{unassignedTasks}</span>
                      {' '}Unassigned
                    </span>
                    <span>
                      <span className="font-medium" style={{ color: overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-primary)' }}>{overdueTasks}</span>
                      {' '}Overdue
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <div className="flex items-center gap-1">
                      <ListTodo className="h-3 w-3" />
                      <span>{ws._count.taskLists} List{ws._count.taskLists !== 1 ? 's' : ''}</span>
                    </div>
                    {filesAttention > 0 && (
                      <span style={{ color: 'var(--state-error)' }}>
                        {filesAttention} File{filesAttention !== 1 ? 's' : ''} Expiring
                      </span>
                    )}
                    {openIssues > 0 && (
                      <span style={{ color: 'var(--state-warning)' }}>
                        {openIssues} Issue{openIssues !== 1 ? 's' : ''}
                      </span>
                    )}
                    {operationalMembers > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{operationalMembers} Member{operationalMembers !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner + dynamic actions (spec Part 3) */}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                      {getInitials(ws.owner.fullName)}
                    </div>
                    <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{ws.owner.fullName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Primary: status-contextual action */}
                    {!isHealthyOrOpen && (
                      <Link href={`/workspaces/${ws.id}`}
                        className="rounded px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: primaryAction.color }}>
                        {primaryAction.label}
                      </Link>
                    )}
                    {/* Secondary / only action for healthy */}
                    <Link href={`/workspaces/${ws.id}`}
                      className="rounded px-2 py-0.5 text-[10px] font-medium"
                      style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                      {isHealthyOrOpen ? primaryAction.label : 'Open →'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateWorkspaceModal onClose={() => setShowCreate(false)}
          onCreated={(ws) => { setWorkspaces((p) => [ws, ...p]); setShowCreate(false); }} />
      )}
      {editTarget && (
        <EditWorkspaceModal workspace={editTarget} onClose={() => setEditTarget(null)}
          onUpdated={(u) => { setWorkspaces((p) => p.map((w) => (w.id === u.id ? { ...w, ...u } : w))); setEditTarget(null); }} />
      )}
      {accessTarget && (
        <EditWorkspaceAccessModal workspace={accessTarget} onClose={() => setAccessTarget(null)}
          onUpdated={(u) => { setWorkspaces((p) => p.map((w) => (w.id === u.id ? { ...w, ...u } : w))); setAccessTarget(null); }} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--state-error-soft)' }}>
              <Trash2 className="h-5 w-5" style={{ color: 'var(--state-error)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Workspace</h2>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> and all its task lists and tasks. Documents and issues linked to this workspace will be unlinked but not deleted.
            </p>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Type <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> to confirm:
            </p>
            <input type="text" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget.name} autoFocus
              className="mt-2 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--state-error)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            {deleteError && <p className="mt-2 text-sm" style={{ color: 'var(--state-error)' }}>{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); setDeleteError(''); }}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button type="button" disabled={deleteConfirmName !== deleteTarget.name || deleteLoading}
                onClick={() => void handleDelete()}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--state-error)' }}>
                {deleteLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : <><Trash2 className="h-4 w-4" />Delete Workspace</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryItem({
  label, value, icon: Icon, color = 'var(--text-primary)', sub,
}: {
  label: string; value: number | string; icon: typeof FolderOpen; color?: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight" style={{ color }}>{value}</p>
        <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--state-warning)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, color = 'var(--text-primary)',
}: {
  icon: typeof Pencil; label: string; onClick: () => void; color?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
      style={{ color }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}
