'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListChecks, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface TaskUser {
  id: string;
  fullName: string;
}

interface TaskWorkspace {
  id: string;
  name: string;
}

interface TaskList {
  id: string;
  name: string;
  workspace: TaskWorkspace | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: TaskUser | null;
  createdBy: TaskUser | null;
  taskList: TaskList | null;
}

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED', 'COMPLETED', 'CANCELLED'];

function statusStyle(status: string): { color: string; bg: string; label: string } {
  switch (status) {
    case 'TODO':           return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)',             label: 'To Do' };
    case 'IN_PROGRESS':    return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)',          label: 'In Progress' };
    case 'WAITING_REVIEW': return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)',    label: 'Waiting Review' };
    case 'COMPLETED':      return { color: 'var(--state-success)', bg: 'var(--state-success-soft)',    label: 'Completed' };
    case 'REJECTED':       return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)',      label: 'Rejected' };
    case 'CANCELLED':      return { color: 'var(--text-disabled)', bg: 'var(--bg-muted)',              label: 'Cancelled' };
    default:               return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)',              label: status };
  }
}

function priorityStyle(priority: string): { color: string; label: string } {
  switch (priority) {
    case 'CRITICAL': return { color: 'var(--state-error)',   label: 'Critical' };
    case 'HIGH':     return { color: 'var(--state-warning)', label: 'High' };
    case 'MEDIUM':   return { color: 'var(--accent-primary)',label: 'Medium' };
    default:         return { color: 'var(--text-muted)',    label: 'Low' };
  }
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'COMPLETED' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

export default function TasksPage() {
  const { user, token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [statusFilter, setStatus] = useState('open');
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load tasks assigned to me
      const url = `${base}/tasks?assigneeId=${user?.id ?? ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json() as Task[];
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [base, token, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const openStatuses = new Set(['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'REJECTED']);

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'open')      return openStatuses.has(t.status);
    if (statusFilter === 'completed') return t.status === 'COMPLETED';
    if (statusFilter === 'overdue')   return isOverdue(t.dueDate, t.status);
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Overdue first, then by status order, then by due date
    const aOv = isOverdue(a.dueDate, a.status) ? 0 : 1;
    const bOv = isOverdue(b.dueDate, b.status) ? 0 : 1;
    if (aOv !== bOv) return aOv - bOv;
    const aIdx = STATUS_ORDER.indexOf(a.status);
    const bIdx = STATUS_ORDER.indexOf(b.status);
    return aIdx - bIdx;
  });

  const counts = {
    open:      tasks.filter(t => openStatuses.has(t.status)).length,
    overdue:   tasks.filter(t => isOverdue(t.dueDate, t.status)).length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    all:       tasks.length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Tasks</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Tasks assigned to you across all workspaces
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Open',      value: counts.open,      color: 'var(--accent-primary)' },
          { label: 'Overdue',   value: counts.overdue,   color: 'var(--state-error)' },
          { label: 'Completed', value: counts.completed, color: 'var(--state-success)' },
          { label: 'Total',     value: counts.all,       color: 'var(--text-muted)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        />
        <div className="flex gap-1">
          {([
            { key: 'open',      label: 'Open' },
            { key: 'overdue',   label: 'Overdue' },
            { key: 'completed', label: 'Done' },
            { key: 'all',       label: 'All' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{
                borderColor: statusFilter === key ? 'var(--accent-primary)' : 'var(--border-default)',
                backgroundColor: statusFilter === key ? 'var(--accent-soft)' : 'var(--bg-surface)',
                color: statusFilter === key ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
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
          <div className="p-6 text-center text-sm" style={{ color: 'var(--state-error)' }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <ListChecks className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {search ? 'No tasks match your search.' : 'No tasks in this view.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table head */}
            <div
              className="grid text-xs font-medium px-5 py-2.5"
              style={{
                gridTemplateColumns: '1fr 120px 90px 100px 120px 28px',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Due Date</span>
              <span>Workspace</span>
              <span />
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {sorted.map((t) => {
                const overdue  = isOverdue(t.dueDate, t.status);
                const ss       = statusStyle(t.status);
                const ps       = priorityStyle(t.priority);
                const wsId     = t.taskList?.workspace?.id ?? '';
                return (
                  <div
                    key={t.id}
                    className="grid items-center px-5 py-3"
                    style={{ gridTemplateColumns: '1fr 120px 90px 100px 120px 28px' }}
                  >
                    <div className="min-w-0 pr-4">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: overdue ? 'var(--state-error)' : 'var(--text-primary)' }}
                      >
                        {overdue && '⚠ '}{t.title}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {t.taskList?.name ?? '—'}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full w-fit"
                      style={{ color: ss.color, backgroundColor: ss.bg }}
                    >
                      {ss.label}
                    </span>
                    <span className="text-xs font-medium" style={{ color: ps.color }}>
                      {ps.label}
                    </span>
                    <span className="text-xs" style={{ color: overdue ? 'var(--state-error)' : 'var(--text-muted)' }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {t.taskList?.workspace?.name ?? '—'}
                    </span>
                    {wsId && (
                      <Link href={`/workspaces/${wsId}`} className="flex items-center justify-center">
                        <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-disabled)' }} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
