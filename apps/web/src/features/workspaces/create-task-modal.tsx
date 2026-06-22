'use client';

import { useState, FormEvent } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import { apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { TaskSummary } from './types';

interface Props {
  workspaceId: string;
  taskListId: string;
  parentTaskId?: string;
  onClose: () => void;
  onCreated: (task: TaskSummary) => void;
}

// ─── Priority dropdown options ───────────────────────────────────────────────
// "FOR_REFERENCE_ONLY" is a UI-only sentinel — it maps to isReference=true
// and is never stored as a real priority value.

const PRIORITY_OPTIONS = [
  { value: 'FOR_REFERENCE_ONLY', label: 'For Reference Only' },
  { value: 'LOW',      label: 'Low' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'HIGH',     label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

const RECURRENCE_OPTIONS = [
  { value: 'NONE',       label: 'None' },
  { value: 'MONTHLY',    label: 'Every 1 Month' },
  { value: 'QUARTERLY',  label: 'Every 3 Months' },
  { value: 'SEMIANNUAL', label: 'Every 6 Months' },
  { value: 'ANNUAL',     label: 'Every 1 Year' },
] as const;

const inputStyle = {
  backgroundColor: 'var(--bg-muted)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

export function CreateTaskModal({ workspaceId, taskListId, parentTaskId, onClose, onCreated }: Props) {
  const { token } = useAuth();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [priorityKey, setPriorityKey] = useState<string>('MEDIUM');
  const [dueDate,     setDueDate]     = useState('');
  const [recurrence,  setRecurrence]  = useState('NONE');
  const [recEndDate,  setRecEndDate]  = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const isReference  = priorityKey === 'FOR_REFERENCE_ONLY';
  const realPriority = isReference ? 'LOW' : priorityKey;
  const isRecurring  = recurrence !== 'NONE';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Task title is required.'); return; }
    if (isRecurring && !dueDate) {
      setError('A due date is required for recurring tasks.');
      return;
    }
    if (recEndDate && dueDate && new Date(recEndDate) <= new Date(dueDate)) {
      setError('Recurrence end date must be after the first due date.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const task = await apiPostAuth<TaskSummary>('/tasks', {
        workspaceId,
        taskListId,
        ...(parentTaskId && { parentTaskId }),
        title:              title.trim(),
        description:        description.trim() || undefined,
        priority:           realPriority,
        isReference,
        dueDate:            dueDate || undefined,
        recurrenceInterval: recurrence,
        ...(recEndDate && { recurrenceEndDate: recEndDate }),
      }, token!);
      onCreated(task);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {parentTaskId ? 'New Subtask' : 'New Task'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Title *</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…" rows={2}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          </div>

          {/* Row 1: Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select
                value={priorityKey}
                onChange={(e) => setPriorityKey(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {isReference && (
                <div
                  className="flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                  This item is for information or reference only. It will not create overdue or unassigned alerts.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {isReference ? 'Review Date' : 'Due Date'}
                {isRecurring && <span style={{ color: 'var(--state-error)' }}> *</span>}
              </label>
              <input
                type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 2: Repeat + End Repeat */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Repeat</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                style={inputStyle}
              >
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: isRecurring ? 'var(--text-secondary)' : 'var(--text-disabled)' }}
              >
                End Repeat
              </label>
              <input
                type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)}
                disabled={!isRecurring}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ ...inputStyle, opacity: isRecurring ? 1 : 0.4, cursor: isRecurring ? 'auto' : 'not-allowed' }}
              />
            </div>
          </div>

          {isRecurring && (
            <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '-8px' }}>
              A new occurrence is created automatically when this task is completed.
            </p>
          )}

          {error && <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
