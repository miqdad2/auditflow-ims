'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Building2, Pencil, CheckCircle2, XCircle, X, Check,
  ShieldAlert,
} from 'lucide-react';
import { apiGet, apiPostAuth, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-provider';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

const ALLOWED_ROLES = ['SUPER_ADMIN', 'SUPER_USER'];

export default function DepartmentsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  const canManage = user?.permissions?.includes('departments.manage') ?? false;
  const isAllowed = user?.roles?.some((r) => ALLOWED_ROLES.includes(r)) ?? false;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGet<Department[]>(
        `/departments${showInactive ? '?includeInactive=true' : ''}`,
        token,
      );
      setDepartments(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, showInactive]);

  useEffect(() => { void load(); }, [load]);

  if (!isAllowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          You do not have permission to access this area.
        </p>
        <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
          Department management requires Super Admin, IT Admin, or Super User access.
        </p>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      await apiPostAuth('/departments', createForm, token);
      setCreateForm({ name: '', code: '', description: '' });
      setShowCreate(false);
      showToast('Department created');
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create department');
    } finally { setCreating(false); }
  }

  function startEdit(dept: Department) {
    setEditId(dept.id);
    setEditForm({ name: dept.name, code: dept.code, description: dept.description ?? '' });
  }

  async function handleSaveEdit(id: string) {
    if (!token || saving) return;
    setSaving(true);
    try {
      await apiPatchAuth(`/departments/${id}`, editForm, token);
      setEditId(null);
      showToast('Department updated');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update department');
    } finally { setSaving(false); }
  }

  async function handleToggleActive(dept: Department) {
    if (!token || !canManage) return;
    try {
      await apiPatchAuth(`/departments/${dept.id}`, { isActive: !dept.isActive }, token);
      showToast(`Department ${dept.isActive ? 'deactivated' : 'reactivated'}`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update department status');
    }
  }

  const active   = departments.filter((d) => d.isActive);
  const inactive = departments.filter((d) => !d.isActive);

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Page header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Departments</h1>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage company departments used for workspace, document, and task organisation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-blue-600" />
              Show inactive
            </label>
            {canManage && (
              <button type="button" onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-4 w-4" />New Department
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Create form */}
          {showCreate && (
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Department</h3>
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }}
                  style={{ color: 'var(--text-muted)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Name *</label>
                    <input required value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Civil Engineering"
                      className="w-full rounded-lg border px-3 py-1.5 text-sm"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Code *</label>
                    <input required value={createForm.code}
                      onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. CIV"
                      maxLength={20}
                      className="w-full rounded-lg border px-3 py-1.5 text-sm"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <input value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                </div>
                {createError && <p className="text-xs" style={{ color: 'var(--state-error)' }}>{createError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }}
                    className="rounded-lg border px-4 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                  <button type="submit" disabled={creating}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent-primary)' }}>
                    {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>
          ) : (
            <>
              {/* Active departments */}
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Active Departments ({active.length})
                </h2>
                {active.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10"
                    style={{ borderColor: 'var(--border-default)' }}>
                    <Building2 className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active departments. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                    {active.map((dept, i) => (
                      <div key={dept.id}
                        style={{ borderBottom: i < active.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                        {editId === dept.id ? (
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="flex-1 rounded-lg border px-2 py-1 text-sm"
                                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                                placeholder="Name" />
                              <input value={editForm.code}
                                onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                                className="w-20 rounded-lg border px-2 py-1 text-sm"
                                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                                placeholder="Code" />
                              <input value={editForm.description}
                                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                className="flex-1 rounded-lg border px-2 py-1 text-sm"
                                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                                placeholder="Description" />
                              <button type="button" disabled={saving} onClick={() => void handleSaveEdit(dept.id)}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                                style={{ backgroundColor: 'var(--state-success)' }}>
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Save
                              </button>
                              <button type="button" onClick={() => setEditId(null)}
                                className="rounded-lg px-2 py-1 text-xs"
                                style={{ color: 'var(--text-muted)' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3"
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{dept.name}</p>
                              {dept.description && (
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{dept.description}</p>
                              )}
                            </div>
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                              {dept.code}
                            </span>
                            {canManage && (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => startEdit(dept)} title="Edit"
                                  className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => void handleToggleActive(dept)} title="Deactivate"
                                  className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive departments */}
              {showInactive && inactive.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Inactive Departments ({inactive.length})
                  </h2>
                  <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                    {inactive.map((dept, i) => (
                      <div key={dept.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{
                          borderBottom: i < inactive.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                          opacity: 0.6,
                        }}>
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-disabled)' }}>
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{dept.name}</p>
                        </div>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                          {dept.code}
                        </span>
                        <span className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                          Inactive
                        </span>
                        {canManage && (
                          <button type="button" onClick={() => void handleToggleActive(dept)} title="Reactivate"
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: 'var(--state-success-soft)', color: 'var(--state-success)' }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />Reactivate
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
