'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ChecklistItem } from './types';

interface User { id: string; fullName: string; }
interface Props {
  checklistId: string;
  departments: { id: string; name: string }[];
  users:       User[];
  onClose:   () => void;
  onCreated: (item: ChecklistItem) => void;
}

export function CreateItemModal({ checklistId, departments, users, onClose, onCreated }: Props) {
  const { token } = useAuth();

  const [title,             setTitle]             = useState('');
  const [description,       setDescription]       = useState('');
  const [isoClause,         setIsoClause]         = useState('');
  const [departmentId,      setDepartmentId]      = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [reviewerId,        setReviewerId]        = useState('');
  const [dueDate,           setDueDate]           = useState('');
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setSaving(true); setError('');
    try {
      const created = await apiPostAuth<ChecklistItem>(`/checklists/${checklistId}/items`, {
        title:             title.trim(),
        description:       description.trim() || undefined,
        isoClause:         isoClause.trim() || undefined,
        departmentId:      departmentId      || undefined,
        responsibleUserId: responsibleUserId || undefined,
        reviewerId:        reviewerId        || undefined,
        dueDate:           dueDate           || undefined,
      }, token);
      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
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
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Checklist Item</h2>
          <button onClick={onClose} className="rounded p-1" style={{ color: 'var(--text-muted)' }}>
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
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} style={inputSt} placeholder="Checklist item title…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>ISO Clause</label>
              <input value={isoClause} onChange={(e) => setIsoClause(e.target.value)} className={inputCls} style={inputSt} placeholder="e.g. 6.1.2" />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} style={inputSt} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} style={inputSt} placeholder="Optional details…" />
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
              <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Responsible User</label>
              <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} className={inputCls} style={inputSt}>
                <option value="">— None —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Reviewer</label>
            <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className={inputCls} style={inputSt}>
              <option value="">— None —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim()} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
              {saving ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
