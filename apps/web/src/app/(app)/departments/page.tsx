'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Loader2, Building2, Search, X, MoreHorizontal,
  ShieldAlert, Users, FolderOpen, RefreshCw, AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { apiGet, apiPostAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-provider';
import { useRealtimeInvalidation } from '@/lib/use-realtime-invalidation';

interface DepartmentCount {
  users: number;
  workspaces: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: DepartmentCount;
}

interface UsageCounts {
  users: number;
  workspaces: number;
  openTasks: number;
}

interface DeptForm {
  name: string;
  code: string;
  description: string;
}

const ALLOWED_ROLES = ['SUPER_ADMIN', 'SUPER_USER'];

type SortKey = 'name-asc' | 'name-desc' | 'code' | 'most-users' | 'most-workspaces' | 'recently-updated';
type StatusFilter = 'all' | 'active' | 'inactive';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name-asc',           label: 'Name A–Z' },
  { value: 'name-desc',          label: 'Name Z–A' },
  { value: 'code',               label: 'Code' },
  { value: 'most-users',         label: 'Most Users' },
  { value: 'most-workspaces',    label: 'Most Workspaces' },
  { value: 'recently-updated',   label: 'Recently Updated' },
];

const inputCls = 'w-full rounded-lg border px-3 py-1.5 text-sm outline-none';
const inputSt  = { borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' };

const DEPT_EVENTS = ['department.updated'] as const;

export default function DepartmentsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey]         = useState<SortKey>('name-asc');

  // Create / Edit modal
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Department | null>(null);
  const [form, setForm]               = useState<DeptForm>({ name: '', code: '', description: '' });
  const [formError, setFormError]     = useState('');
  const [saving, setSaving]           = useState(false);

  // Deactivation confirmation modal
  const [deactivateTarget, setDeactivateTarget] = useState<Department | null>(null);
  const [usageCounts, setUsageCounts]           = useState<UsageCounts | null>(null);
  const [loadingUsage, setLoadingUsage]         = useState(false);
  const [toggling, setToggling]                 = useState(false);

  // Three-dot menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const canManage = user?.permissions?.includes('departments.manage') ?? false;
  const isAllowed = user?.roles?.some((r) => ALLOWED_ROLES.includes(r)) ?? false;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError('');
    try {
      const data = await apiGet<Department[]>('/departments?includeInactive=true', token);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: department.updated → shared hook with dedup + debounce
  useRealtimeInvalidation({
    events: DEPT_EVENTS,
    onInvalidate: load,
    debounceMs: 400,
  });

  useEffect(() => {
    if (!openMenuId) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openMenuId]);

  if (!isAllowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Access Denied</p>
        <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
          Department management requires Super Admin or Super User access. Contact your system administrator if you need access.
        </p>
      </div>
    );
  }

  // Computed stats
  const total         = departments.length;
  const activeCount   = departments.filter((d) => d.isActive).length;
  const inactiveCount = departments.filter((d) => !d.isActive).length;
  // "In Use" = has at least one user OR at least one workspace
  const inUseCount    = departments.filter((d) => (d._count?.users ?? 0) > 0 || (d._count?.workspaces ?? 0) > 0).length;
  const notYetUsedCount = departments.filter((d) => (d._count?.users ?? 0) === 0 && (d._count?.workspaces ?? 0) === 0).length;

  // Filter + sort
  const filtered = departments
    .filter((d) => {
      if (statusFilter === 'active'   && !d.isActive) return false;
      if (statusFilter === 'inactive' &&  d.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'name-asc':          return a.name.localeCompare(b.name);
        case 'name-desc':         return b.name.localeCompare(a.name);
        case 'code':              return a.code.localeCompare(b.code);
        case 'most-users':        return (b._count?.users ?? 0) - (a._count?.users ?? 0);
        case 'most-workspaces':   return (b._count?.workspaces ?? 0) - (a._count?.workspaces ?? 0);
        case 'recently-updated':  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:                  return 0;
      }
    });

  function openCreate() {
    setEditTarget(null);
    setForm({ name: '', code: '', description: '' });
    setFormError('');
    setShowModal(true);
  }

  function openEdit(dept: Department) {
    setEditTarget(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description ?? '' });
    setFormError('');
    setShowModal(true);
    setOpenMenuId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || saving) return;
    const code = form.code.toUpperCase().trim();
    if (code.length < 2 || code.length > 6) {
      setFormError('Code must be between 2 and 6 characters');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editTarget) {
        const updated = await apiPatchAuth<Department>(`/departments/${editTarget.id}`, {
          name: form.name.trim(),
          code,
          description: form.description.trim() || null,
        }, token);
        setDepartments((prev) => prev.map((d) => d.id === editTarget.id
          ? { ...updated, _count: updated._count ?? d._count }
          : d));
        showToast('Department updated');
      } else {
        const created = await apiPostAuth<Department>('/departments', {
          name: form.name.trim(),
          code,
          description: form.description.trim() || null,
        }, token);
        setDepartments((prev) => [...prev, created]);
        showToast('Department created');
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  }

  async function openDeactivate(dept: Department) {
    setDeactivateTarget(dept);
    setUsageCounts(null);
    setOpenMenuId(null);
    if (token) {
      setLoadingUsage(true);
      try {
        const counts = await apiGet<UsageCounts>(`/departments/${dept.id}/usage`, token);
        setUsageCounts(counts);
      } catch { /* non-critical — modal still shown without counts */ }
      finally { setLoadingUsage(false); }
    }
  }

  async function handleDeactivateConfirm() {
    if (!deactivateTarget || !token || toggling) return;
    setToggling(true);
    try {
      const updated = await apiPatchAuth<Department>(`/departments/${deactivateTarget.id}`, { isActive: false }, token);
      setDepartments((prev) => prev.map((d) => d.id === deactivateTarget.id
        ? { ...updated, _count: updated._count ?? d._count }
        : d));
      showToast('Department deactivated');
      setDeactivateTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to deactivate department');
    } finally {
      setToggling(false);
    }
  }

  async function handleReactivate(dept: Department) {
    if (!token) return;
    setOpenMenuId(null);
    try {
      const updated = await apiPatchAuth<Department>(`/departments/${dept.id}`, { isActive: true }, token);
      setDepartments((prev) => prev.map((d) => d.id === dept.id
        ? { ...updated, _count: updated._count ?? d._count }
        : d));
      showToast('Department reactivated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reactivate department');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Page header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Departments</h1>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage company departments used to organise workspaces, documents, task lists, and users.
            </p>
          </div>
          {canManage && (
            <button type="button" onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}>
              <Plus className="h-4 w-4" />New Department
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* Summary cards */}
        {!loading && !fetchError && departments.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([
              { label: 'Total',        value: total,          color: 'var(--text-primary)' },
              { label: 'Active',       value: activeCount,    color: 'var(--state-success)' },
              { label: 'Inactive',     value: inactiveCount,  color: 'var(--state-error)' },
              { label: 'In Use',       value: inUseCount,     color: 'var(--accent-primary)' },
              { label: 'Not Yet Used', value: notYetUsedCount, color: 'var(--text-muted)' },
            ] as const).map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border px-4 py-3"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="mt-0.5 text-xl font-semibold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
            <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="w-48 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }} />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer"
            style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer"
            style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button onClick={() => void load()} title="Refresh"
            className="rounded-lg p-1.5"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {(search || statusFilter !== 'all') && (
            <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
              Clear filters
            </button>
          )}

          {!loading && (
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} of {total} department{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-10 w-10" style={{ color: 'var(--state-error)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Failed to load departments</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fetchError}</p>
            <button onClick={() => void load()} className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
              Try again
            </button>
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No departments yet</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Create a department to start organising workspaces, tasks, and users.
            </p>
            {canManage && (
              <button onClick={openCreate}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white mt-1"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-3.5 w-3.5" />Create First Department
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No departments match your search</p>
            <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                  {['Department', 'Code', 'Users', 'Workspaces', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((dept) => (
                  <tr key={dept.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', opacity: dept.isActive ? 1 : 0.65 }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: dept.isActive ? 'var(--accent-soft)' : 'var(--bg-muted)',
                            color: dept.isActive ? 'var(--accent-primary)' : 'var(--text-disabled)',
                          }}>
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{dept.name}</p>
                          {dept.description && (
                            <p className="truncate max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>{dept.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs"
                        style={{ color: (dept._count?.users ?? 0) > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        <Users className="h-3.5 w-3.5" />
                        {dept._count?.users ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs"
                        style={{ color: (dept._count?.workspaces ?? 0) > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        <FolderOpen className="h-3.5 w-3.5" />
                        {dept._count?.workspaces ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: dept.isActive ? 'var(--state-success-soft)' : 'var(--state-error-soft)',
                          color: dept.isActive ? 'var(--state-success)' : 'var(--state-error)',
                        }}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="relative flex justify-end"
                          ref={openMenuId === dept.id ? menuRef : null}>
                          <button type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === dept.id ? null : dept.id);
                            }}
                            className="rounded-lg p-1 transition-colors"
                            style={{ color: 'var(--text-muted)' }}>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openMenuId === dept.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl py-1 shadow-lg"
                              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                              <button type="button" onClick={() => openEdit(dept)}
                                className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                Edit Department
                              </button>
                              <div className="my-1" style={{ borderTop: '1px solid var(--border-subtle)' }} />
                              {dept.isActive ? (
                                <button type="button" onClick={() => void openDeactivate(dept)}
                                  className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                                  style={{ color: 'var(--state-error)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--state-error-soft)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                  Deactivate
                                </button>
                              ) : (
                                <button type="button" onClick={() => void handleReactivate(dept)}
                                  className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                                  style={{ color: 'var(--state-success)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--state-success-soft)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                  Reactivate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editTarget ? 'Edit Department' : 'New Department'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Department Name <span style={{ color: 'var(--state-error)' }}>*</span>
                </label>
                <input required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Civil Engineering"
                  className={inputCls} style={inputSt} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Code <span style={{ color: 'var(--state-error)' }}>*</span>
                  <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>(2–6 characters, auto-uppercased)</span>
                </label>
                <input required value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. CIV"
                  maxLength={6}
                  className={inputCls} style={inputSt} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Description <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of this department"
                  className={inputCls} style={inputSt} />
              </div>
              {formError && (
                <p className="text-xs" style={{ color: 'var(--state-error)' }}>{formError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg border px-4 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editTarget ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deactivation Confirmation Modal ────────────────────────────────────── */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Deactivate Department
              </h3>
              <button type="button" onClick={() => setDeactivateTarget(null)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong>?
              Existing records will remain linked and unaffected.
              The department will no longer be available for new assignments.
            </p>

            <div className="mb-4 rounded-lg px-4 py-3"
              style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
              <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Current usage</p>
              {loadingUsage ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-3 w-3 animate-spin" />Loading usage data…
                </div>
              ) : usageCounts ? (
                <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span><strong>{usageCounts.users}</strong> active user{usageCounts.users !== 1 ? 's' : ''}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span><strong>{usageCounts.workspaces}</strong> linked workspace{usageCounts.workspaces !== 1 ? 's' : ''}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span><strong>{usageCounts.openTasks}</strong> open task{usageCounts.openTasks !== 1 ? 's' : ''} in linked task lists</span>
                  </li>
                </ul>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Usage data unavailable</p>
              )}
              {usageCounts && (usageCounts.users > 0 || usageCounts.workspaces > 0 || usageCounts.openTasks > 0) && (
                <p className="mt-2 text-xs" style={{ color: 'var(--state-warning)' }}>
                  All existing data remains intact after deactivation.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeactivateTarget(null)}
                className="rounded-lg border px-4 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button type="button" disabled={toggling} onClick={() => void handleDeactivateConfirm()}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--state-error)' }}>
                {toggling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
