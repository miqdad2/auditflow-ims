'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ChecklistSummary } from './types';

interface Props {
  departments: { id: string; name: string }[];
  workspaces:  { id: string; name: string }[];
  onClose:   () => void;
  onCreated: (checklist: ChecklistSummary) => void;
}

export function CreateChecklistModal({ departments, workspaces, onClose, onCreated }: Props) {
  const { token } = useAuth();

  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [isoStandard,  setIsoStandard]  = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [workspaceId,  setWorkspaceId]  = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setSaving(true); setError('');
    try {
      const created = await apiPostAuth<ChecklistSummary>('/checklists', {
        name:         name.trim(),
        description:  description.trim() || undefined,
        isoStandard:  isoStandard.trim() || undefined,
        departmentId: departmentId || undefined,
        workspaceId:  workspaceId  || undefined,
      }, token);
      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create checklist');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none';
  const inputSt  = { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' };
  const labelCls = 'block text-xs font-medium mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-xl shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Create Audit Checklist</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
              {error}
            </div>
          )}

          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} required
              className={inputCls} style={inputSt} placeholder="e.g. ISO 9001:2015 Internal Audit Checklist"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>ISO Standard</label>
            <input
              value={isoStandard} onChange={(e) => setIsoStandard(e.target.value)}
              className={inputCls} style={inputSt} placeholder="e.g. ISO 9001:2015"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} className={inputCls} style={inputSt} placeholder="Optional description…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls} style={inputSt}>
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Workspace</label>
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={inputCls} style={inputSt}>
                <option value="">— None —</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
              {saving ? 'Creating…' : 'Create Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
