'use client';

import { useState, useEffect, FormEvent } from 'react';
import { X, Loader2, Globe, Building2, Lock } from 'lucide-react';
import { apiGet, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { WorkspaceSummary } from './types';

interface Department {
  id: string;
  name: string;
}

interface Props {
  workspace: WorkspaceSummary;
  onClose: () => void;
  onUpdated: (ws: WorkspaceSummary) => void;
}

const VISIBILITY_OPTIONS = [
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    icon: Globe,
    description: 'Visible to elevated ISO/Admin roles and explicitly added members. Staff do not automatically get access.',
  },
  {
    value: 'DEPARTMENT',
    label: 'Department',
    icon: Building2,
    description: 'Visible to department managers/users based on department rules and explicitly added members. Staff must be added as members.',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    icon: Lock,
    description: 'Visible only to explicitly added workspace members and elevated ISO/Admin roles.',
  },
] as const;

export function EditWorkspaceAccessModal({ workspace, onClose, onUpdated }: Props) {
  const { token } = useAuth();
  const [visibility, setVisibility] = useState(workspace.visibility ?? 'ORGANIZATION');
  const [departmentId, setDepartmentId] = useState(workspace.departmentId ?? '');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDeptLoading(true);
    apiGet<Department[]>('/departments', token!)
      .then(setDepartments)
      .catch(() => setDepartments([]))
      .finally(() => setDeptLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (visibility === 'DEPARTMENT' && !departmentId) {
      setError('Please select a department.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const updated = await apiPatchAuth<WorkspaceSummary>(
        `/workspaces/${workspace.id}`,
        {
          visibility,
          departmentId: visibility === 'DEPARTMENT' ? departmentId : null,
        },
        token!,
      );
      onUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace access.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Workspace Access</h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{workspace.name}</p>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Visibility</label>
            <div className="flex flex-col gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, description }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors"
                  style={{
                    backgroundColor: visibility === value ? 'var(--accent-primary-soft, rgba(37,99,235,0.08))' : 'var(--bg-muted)',
                    border: `1px solid ${visibility === value ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={visibility === value}
                    onChange={() => { setVisibility(value); if (value !== 'DEPARTMENT') setDepartmentId(''); }}
                    className="mt-0.5 accent-[var(--accent-primary)]"
                  />
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: visibility === value ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {visibility === 'DEPARTMENT' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Department *</label>
              {deptLoading ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading departments…
                </div>
              ) : (
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select a department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
