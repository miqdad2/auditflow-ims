'use client';

import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
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

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export function CreateTaskModal({ workspaceId, taskListId, parentTaskId, onClose, onCreated }: Props) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Task title is required.'); return; }
    setError(''); setLoading(true);
    try {
      const task = await apiPostAuth<TaskSummary>('/tasks', {
        workspaceId,
        taskListId,
        ...(parentTaskId && { parentTaskId }),
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
      }, token!);
      onCreated(task);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {parentTaskId ? 'New Subtask' : 'New Task'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Title *</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
              rows={3}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select
                value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
              <input
                type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary)' }}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
