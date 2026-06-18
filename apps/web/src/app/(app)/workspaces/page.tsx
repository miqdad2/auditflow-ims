'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Loader2,
  FolderOpen,
  ListTodo,
  CheckSquare,
  MoreHorizontal,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Search,
  LayoutGrid,
  List,
  Clock,
  FileSearch,
  AlertCircle,
  ShieldCheck,
  ClipboardCheck,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { apiGet, apiPatchAuth, apiDeleteAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/status-badge';
import { CreateWorkspaceModal } from '@/features/workspaces/create-workspace-modal';
import { EditWorkspaceModal } from '@/features/workspaces/edit-workspace-modal';
import { EditWorkspaceAccessModal } from '@/features/workspaces/edit-workspace-access-modal';
import type { WorkspaceSummary } from '@/features/workspaces/types';
import Link from 'next/link';

export default function WorkspacesPage() {
  const { token, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkspaceSummary | null>(null);
  const [accessTarget, setAccessTarget] = useState<WorkspaceSummary | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [sortMode, setSortMode] = useState<'RECENT' | 'NAME' | 'READINESS' | 'ATTENTION'>('RECENT');
  const [viewMode, setViewMode] = useState<'CARD' | 'TABLE'>('CARD');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const canCreate = user?.permissions?.includes('project.create') ?? false;
  const canUpdate = user?.permissions?.includes('project.update') ?? false;
  const canDelete = user?.roles?.some((r) => ['SUPER_ADMIN', 'IT_ADMIN'].includes(r)) ?? false;

  const [deleteTarget, setDeleteTarget] = useState<WorkspaceSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGet<WorkspaceSummary[]>('/workspaces', token);
      setWorkspaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    if (openMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getInitials(name: string | undefined) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  }

  function getAttentionCount(ws: WorkspaceSummary) {
    return ws.summary.tasks.overdue
      + ws.summary.documents.underReview
      + ws.summary.checklist.submitted
      + ws.summary.checklist.rejected
      + ws.summary.ncrCapa.open
      + ws.summary.ncrCapa.overdue;
  }

  function readinessColor(percent: number) {
    if (percent >= 80) return 'var(--state-success)';
    if (percent >= 50) return 'var(--state-warning)';
    return 'var(--state-error)';
  }

  const filteredWorkspaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...workspaces]
      .filter((ws) => {
        const matchesStatus = statusFilter === 'ALL' || ws.status === statusFilter;
        const matchesQuery = !normalized
          || ws.name.toLowerCase().includes(normalized)
          || (ws.description ?? '').toLowerCase().includes(normalized)
          || ws.owner.fullName.toLowerCase().includes(normalized);
        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (sortMode === 'NAME') return a.name.localeCompare(b.name);
        if (sortMode === 'READINESS') return b.summary.readinessPercent - a.summary.readinessPercent;
        if (sortMode === 'ATTENTION') return getAttentionCount(b) - getAttentionCount(a);
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [query, sortMode, statusFilter, workspaces]);

  const pageSummary = useMemo(() => {
    const total = workspaces.length;
    const active = workspaces.filter((ws) => ws.status === 'ACTIVE').length;
    const attention = workspaces.reduce((sum, ws) => sum + getAttentionCount(ws), 0);
    const checklistStarted = workspaces.filter((ws) => ws.summary.checklist.total > 0);
    const readiness = checklistStarted.length > 0
      ? Math.round(checklistStarted.reduce((sum, ws) => sum + ws.summary.readinessPercent, 0) / checklistStarted.length)
      : null;
    const overdue = workspaces.reduce((sum, ws) => sum + ws.summary.tasks.overdue, 0);
    const pendingReview = workspaces.reduce((sum, ws) => (
      sum + ws.summary.documents.underReview + ws.summary.checklist.submitted
    ), 0);
    const openNcrCapa = workspaces.reduce((sum, ws) => sum + ws.summary.ncrCapa.open + ws.summary.ncrCapa.overdue, 0);
    return { total, active, attention, readiness, checklistStarted: checklistStarted.length, overdue, pendingReview, openNcrCapa };
  }, [workspaces]);

  const attentionLabel = pageSummary.attention === 0
    ? 'No open issues'
    : pageSummary.overdue > 0
      ? 'Overdue items'
      : pageSummary.openNcrCapa > 0
        ? 'Open Issues'
        : pageSummary.pendingReview > 0
          ? 'Pending review'
          : 'Needs review';

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

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Workspace Readiness</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Audit readiness projects and department task lists
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        )}
      </div>

      <div
        className="grid gap-3 rounded-xl px-4 py-3 sm:grid-cols-2 xl:grid-cols-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <SummaryItem label="Total workspaces" value={pageSummary.total} icon={FolderOpen} />
        <SummaryItem label="Active" value={pageSummary.active} icon={ShieldCheck} color="var(--state-success)" />
        <SummaryItem
          label={pageSummary.readiness === null ? 'Checklist not started' : `${pageSummary.checklistStarted} checklist workspace${pageSummary.checklistStarted !== 1 ? 's' : ''}`}
          value={pageSummary.readiness === null ? '--' : `${pageSummary.readiness}%`}
          icon={ClipboardCheck}
          color={pageSummary.readiness === null ? 'var(--text-muted)' : readinessColor(pageSummary.readiness)}
        />
        <SummaryItem label={attentionLabel} value={pageSummary.attention} icon={AlertCircle} color={pageSummary.attention > 0 ? 'var(--state-error)' : 'var(--state-success)'} />
      </div>

      <div
        className="flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="flex min-h-10 flex-1 items-center gap-2 rounded-lg px-3"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <option value="RECENT">Recent activity</option>
            <option value="ATTENTION">Needs attention</option>
            <option value="READINESS">Readiness</option>
            <option value="NAME">Name</option>
          </select>

          <div
            className="flex h-10 items-center rounded-lg p-1"
            style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}
          >
            <button
              type="button"
              aria-label="Card view"
              onClick={() => setViewMode('CARD')}
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                backgroundColor: viewMode === 'CARD' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'CARD' ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              onClick={() => setViewMode('TABLE')}
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                backgroundColor: viewMode === 'TABLE' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'TABLE' ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : workspaces.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          {canCreate ? (
            <>
              <FolderOpen className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No workspaces yet</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
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
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl py-14"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <Search className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No matching workspaces</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Adjust the search or filter values.</p>
        </div>
      ) : viewMode === 'TABLE' ? (
        <div
          className="overflow-x-auto rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div
            className="grid min-w-[980px] grid-cols-[1.6fr_110px_120px_150px_130px_130px_150px] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-normal"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}
          >
            <span>Workspace</span>
            <span>Status</span>
            <span>Readiness</span>
            <span>Tasks</span>
            <span>Documents</span>
            <span>Issues</span>
            <span>Owner</span>
          </div>
          {filteredWorkspaces.map((ws) => (
            <div
              key={ws.id}
              className="grid min-w-[980px] grid-cols-[1.6fr_110px_120px_150px_130px_130px_150px] items-center gap-3 px-4 py-3 text-sm"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Link href={`/workspaces/${ws.id}`} className="min-w-0 font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                <span className="truncate">{ws.name}</span>
              </Link>
              <StatusBadge status={ws.status} size="xs" />
              <ReadinessMeter percent={ws.summary.readinessPercent} total={ws.summary.checklist.total} />
              <span style={{ color: ws.summary.tasks.overdue > 0 ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                {ws.summary.tasks.open} open, {ws.summary.tasks.overdue} overdue
              </span>
              <span style={{ color: ws.summary.documents.underReview > 0 ? 'var(--state-warning)' : 'var(--text-secondary)' }}>
                {ws.summary.documents.underReview} review
              </span>
              <span style={{ color: ws.summary.ncrCapa.open > 0 ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                {ws.summary.ncrCapa.open} open
              </span>
              <span className="truncate" style={{ color: 'var(--text-muted)' }}>{ws.owner.fullName}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.map((ws) => (
            <div
              key={ws.id}
              className="group relative flex flex-col gap-4 rounded-xl p-5 transition-shadow hover:shadow-md"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              {/* Card header row */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/workspaces/${ws.id}`}
                  className="flex-1 text-sm font-semibold leading-snug hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {ws.name}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={ws.status} size="xs" />

                  {/* Admin kebab menu */}
                  {canUpdate && (
                    <div className="relative" ref={openMenu === ws.id ? menuRef : undefined}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenu((prev) => (prev === ws.id ? null : ws.id));
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        disabled={statusLoading === ws.id}
                      >
                        {statusLoading === ws.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <MoreHorizontal className="h-4 w-4" />}
                      </button>

                      {openMenu === ws.id && (
                        <div
                          className="absolute right-0 top-8 z-50 w-44 rounded-xl py-1 shadow-xl"
                          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                        >
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setEditTarget(ws); }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenMenu(null); setAccessTarget(ws); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Users className="h-4 w-4" />
                              Edit Access
                            </button>
                          )}

                          {ws.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void handleStatusChange(ws, 'ARCHIVED'); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--state-warning)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void handleStatusChange(ws, 'ACTIVE'); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--state-success)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reactivate
                            </button>
                          )}

                          {canDelete && (
                            <>
                              <div className="my-1 mx-2" style={{ height: 1, backgroundColor: 'var(--border-default)' }} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenu(null);
                                  setDeleteTarget(ws);
                                  setDeleteConfirmName('');
                                  setDeleteError('');
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                                style={{ color: 'var(--state-error)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
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

              <ReadinessMeter percent={ws.summary.readinessPercent} total={ws.summary.checklist.total} />

              {getAttentionCount(ws) === 0 ? (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>No open issues</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {ws.summary.tasks.overdue > 0 && (
                    <MetricLine icon={Clock} label="Overdue" value={ws.summary.tasks.overdue} urgent />
                  )}
                  {ws.summary.documents.underReview > 0 && (
                    <MetricLine icon={FileSearch} label="Doc review" value={ws.summary.documents.underReview} warning />
                  )}
                  {ws.summary.checklist.submitted > 0 && (
                    <MetricLine icon={ClipboardCheck} label="Evidence" value={ws.summary.checklist.submitted} warning />
                  )}
                  {ws.summary.checklist.rejected > 0 && (
                    <MetricLine icon={AlertCircle} label="Rejected" value={ws.summary.checklist.rejected} urgent />
                  )}
                  {ws.summary.ncrCapa.open > 0 && (
                    <MetricLine icon={AlertCircle} label="NCR/CAPA" value={ws.summary.ncrCapa.open} urgent />
                  )}
                </div>
              )}

              <div className="mt-auto flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <ListTodo className="h-3.5 w-3.5" />
                  <span>{ws._count.taskLists} list{ws._count.taskLists !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>{ws._count.tasks} task{ws._count.tasks !== 1 ? 's' : ''}</span>
                </div>
                {(ws._count.members ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Users className="h-3.5 w-3.5" />
                    <span>{ws._count.members} member{ws._count.members !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--sidebar-bg)' }}
                  >
                    {getInitials(ws.owner.fullName)}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ws.owner.fullName}</span>
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{formatDate(ws.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={(ws) => {
            setWorkspaces((prev) => [ws, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {editTarget && (
        <EditWorkspaceModal
          workspace={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
            setEditTarget(null);
          }}
        />
      )}

      {accessTarget && (
        <EditWorkspaceAccessModal
          workspace={accessTarget}
          onClose={() => setAccessTarget(null)}
          onUpdated={(updated) => {
            setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
            setAccessTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--state-error-soft)' }}>
              <Trash2 className="h-5 w-5" style={{ color: 'var(--state-error)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Workspace</h2>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> and all its task lists, tasks, and pages. Documents, checklists, and NCR/CAPAs linked to this workspace will be unlinked but not deleted.
            </p>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Type <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget.name}
              className="mt-2 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--state-error)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              autoFocus
            />
            {deleteError && (
              <p className="mt-2 text-sm" style={{ color: 'var(--state-error)' }}>{deleteError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); setDeleteError(''); }}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmName !== deleteTarget.name || deleteLoading}
                onClick={() => void handleDelete()}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--state-error)' }}
              >
                {deleteLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete Workspace</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  icon: Icon,
  color = 'var(--text-primary)',
}: {
  label: string;
  value: number | string;
  icon: typeof FolderOpen;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'var(--bg-muted)', color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight" style={{ color }}>{value}</p>
        <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

function ReadinessMeter({ percent, total }: { percent: number; total: number }) {
  const color = percent >= 80 ? 'var(--state-success)' : percent >= 50 ? 'var(--state-warning)' : 'var(--state-error)';
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Readiness</span>
        <span className="text-xs font-semibold" style={{ color: total > 0 ? color : 'var(--text-muted)' }}>
          {total > 0 ? `${percent}%` : 'Checklist not started'}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${total > 0 ? percent : 0}%`, backgroundColor: total > 0 ? color : 'var(--border-strong)' }}
        />
      </div>
    </div>
  );
}

function MetricLine({
  icon: Icon,
  label,
  value,
  urgent = false,
  warning = false,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  urgent?: boolean;
  warning?: boolean;
}) {
  const color = urgent ? 'var(--state-error)' : warning ? 'var(--state-warning)' : 'var(--text-muted)';
  return (
    <div className="flex min-w-0 items-center gap-1.5" style={{ color }}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      <span className="ml-auto font-semibold">{value}</span>
    </div>
  );
}
