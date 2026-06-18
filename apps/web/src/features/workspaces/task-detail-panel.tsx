'use client';

import {
  useState, useEffect, useCallback, useRef, FormEvent,
} from 'react';
import {
  X, MessageSquare, Loader2, Clock, User, Pencil,
  Trash2, Check, AlertCircle, MoreHorizontal,
} from 'lucide-react';
import { apiGet, apiPatchAuth, apiPostAuth, apiDeleteAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge, PriorityBadge } from '@/components/status-badge';
import { FileAttachmentSection } from '@/features/file-attachments/file-attachment-section';
import { useAutosave } from '@/hooks/use-autosave';
import type { TaskDetail, TaskComment, ActivityEvent, TaskSummary, LinkedRecord } from './types';
import { Link2, Link2Off } from 'lucide-react';

const STATUSES  = ['TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

function SaveIndicator({ status }: { status: 'idle'|'saving'|'saved'|'error' }) {
  if (status === 'idle') return null;
  if (status === 'saving') return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
    </span>
  );
  if (status === 'saved') return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--state-success)' }}>
      <Check className="h-3 w-3" /> Saved
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--state-error)' }}>
      <AlertCircle className="h-3 w-3" /> Save failed
    </span>
  );
}

interface UserOption { id: string; fullName: string; }
interface ListOption  { id: string; name: string; }

interface Props {
  taskId: string;
  onClose: () => void;
  onUpdated: (task: TaskSummary) => void;
  onDeleted?: () => void;
  externalUpdateKey?: number;
  linkedRecordsUpdateKey?: number;
}

export function TaskDetailPanel({ taskId, onClose, onUpdated, onDeleted, externalUpdateKey, linkedRecordsUpdateKey }: Props) {
  const { token, user } = useAuth();

  // ── Core data ────────────────────────────────────────────────────────────
  const [task,     setTask]     = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity' | 'linked'>('comments');
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);

  // Add Link modal state
  const [showAddLink, setShowAddLink]           = useState(false);
  const [addLinkType, setAddLinkType]           = useState('TASK');
  const [addLinkSearch, setAddLinkSearch]       = useState('');
  const [addLinkResults, setAddLinkResults]     = useState<{ id: string; title: string }[]>([]);
  const [addLinkSelected, setAddLinkSelected]   = useState<string | null>(null);
  const [addLinkSearching, setAddLinkSearching] = useState(false);
  const [addLinkSubmitting, setAddLinkSubmitting] = useState(false);
  const [addLinkError, setAddLinkError]         = useState('');

  // ── Users + task lists for dropdowns ─────────────────────────────────────
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [listOptions, setListOptions] = useState<ListOption[]>([]);

  // ── Editable fields ───────────────────────────────────────────────────────
  const [draftTitle, setDraftTitle]         = useState('');
  const [editingTitle, setEditingTitle]     = useState(false);
  const [draftDesc, setDraftDesc]           = useState('');
  const [editingDesc, setEditingDesc]       = useState(false);

  // ── Conflict ─────────────────────────────────────────────────────────────
  const [conflict, setConflict] = useState(false);
  const isDirtyRef = useRef(false); // true when user has unsaved local edits

  // ── Comments ─────────────────────────────────────────────────────────────
  const [newComment,      setNewComment]      = useState('');
  const [commentLoading,  setCommentLoading]  = useState(false);
  const [editingCmt,      setEditingCmt]      = useState<string | null>(null);
  const [editCmtBody,     setEditCmtBody]     = useState('');
  const [cmtMenuOpen,     setCmtMenuOpen]     = useState<string | null>(null);

  // ── Permissions ───────────────────────────────────────────────────────────
  const canUpdate  = user?.permissions?.includes('tasks.update')  ?? false;
  const canDelete  = user?.permissions?.includes('tasks.delete')  ?? false;
  const isElevated = (user?.roles as string[] | undefined)?.some((r) => ELEVATED_ROLES.includes(r)) ?? false;
  const canDeleteTask = canDelete || isElevated;
  const isLocked  = task ? ['COMPLETED', 'CANCELLED'].includes(task.status) && !isElevated : false;

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [t, c, a] = await Promise.all([
        apiGet<TaskDetail>(`/tasks/${taskId}`, token),
        apiGet<TaskComment[]>(`/tasks/${taskId}/comments`, token),
        apiGet<ActivityEvent[]>(`/tasks/${taskId}/activity`, token),
      ]);
      setTask(t);
      setComments(c);
      setActivity(a);
      setDraftTitle(t.title);
      setDraftDesc(t.description ?? '');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [taskId, token]);

  useEffect(() => { void load(); }, [load]);

  // Load dropdown options after task loads
  useEffect(() => {
    if (!token || !task) return;
    apiGet<UserOption[]>('/users/search?isActive=true', token).then(setUserOptions).catch(() => {});
    apiGet<{ taskLists: ListOption[] }>(`/workspaces/${task.workspaceId}`, token)
      .then((ws) => setListOptions(ws.taskLists))
      .catch(() => {});
  }, [token, task?.workspaceId]);

  // ── External update (socket) ──────────────────────────────────────────────
  useEffect(() => {
    if (externalUpdateKey === undefined || externalUpdateKey === 0) return;
    if (isDirtyRef.current) {
      setConflict(true);
    } else {
      void load();
    }
  }, [externalUpdateKey, load]);

  // ── Autosave for description ──────────────────────────────────────────────
  const saveDesc = useCallback(async () => {
    if (!task || !token) return;
    const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}`, { description: draftDesc }, token);
    setTask((prev) => prev ? { ...prev, description: draftDesc } : null);
    onUpdated(updated);
    isDirtyRef.current = false;
  }, [task, token, draftDesc, onUpdated]);

  const { status: descSaveStatus, schedule: scheduleDescSave, flush: flushDesc } = useAutosave(saveDesc, 1500);

  // ── Instant field save ────────────────────────────────────────────────────
  async function saveField(patch: Partial<Pick<TaskSummary, 'status' | 'priority' | 'assigneeId' | 'dueDate' | 'taskListId'>>) {
    if (!task || !token) return;
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}`, patch, token);
      setTask((prev) => prev ? { ...prev, ...updated } : null);
      onUpdated(updated);
    } catch { /* ignore */ }
  }

  async function saveTitle() {
    if (!task || !token || !draftTitle.trim()) { setEditingTitle(false); return; }
    if (draftTitle.trim() === task.title) { setEditingTitle(false); return; }
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}`, { title: draftTitle.trim() }, token);
      setTask((prev) => prev ? { ...prev, title: updated.title } : null);
      onUpdated(updated);
      isDirtyRef.current = false;
    } catch { /* ignore */ }
    finally { setEditingTitle(false); }
  }

  // Load linked records when switching to the linked tab
  useEffect(() => {
    if (activeTab !== 'linked' || !token) return;
    setLinkedLoading(true);
    apiGet<LinkedRecord[]>(`/linked-records?sourceType=TASK&sourceId=${taskId}`, token)
      .then(setLinkedRecords)
      .catch(() => {})
      .finally(() => setLinkedLoading(false));
  }, [activeTab, taskId, token]);

  // Reload linked records when remote change arrives (realtime event via parent)
  useEffect(() => {
    if (!linkedRecordsUpdateKey || !token) return;
    apiGet<LinkedRecord[]>(`/linked-records?sourceType=TASK&sourceId=${taskId}`, token)
      .then(setLinkedRecords)
      .catch(() => {});
  }, [linkedRecordsUpdateKey, taskId, token]);

  // ── Add Link handlers ─────────────────────────────────────────────────────
  async function handleSearchForLink() {
    if (!token || !task) return;
    setAddLinkSearching(true);
    setAddLinkResults([]);
    setAddLinkSelected(null);
    setAddLinkError('');
    try {
      const results = await apiGet<{ id: string; title: string }[]>(
        `/linked-records/search?workspaceId=${task.workspaceId}&targetType=${addLinkType}&q=${encodeURIComponent(addLinkSearch)}`,
        token,
      );
      setAddLinkResults(results);
      if (results.length === 0) setAddLinkError('No records found.');
    } catch { setAddLinkError('Search failed. Try again.'); }
    finally { setAddLinkSearching(false); }
  }

  async function handleCreateLink() {
    if (!token || !task || !addLinkSelected) return;
    setAddLinkSubmitting(true);
    setAddLinkError('');
    try {
      await apiPostAuth('/linked-records', {
        sourceType: 'TASK',
        sourceId: task.id,
        targetType: addLinkType,
        targetId: addLinkSelected,
      }, token);
      const records = await apiGet<LinkedRecord[]>(`/linked-records?sourceType=TASK&sourceId=${taskId}`, token);
      setLinkedRecords(records);
      setShowAddLink(false);
      setAddLinkSearch('');
      setAddLinkResults([]);
      setAddLinkSelected(null);
      setAddLinkError('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add link';
      setAddLinkError(msg.toLowerCase().includes('already exists') ? 'This link already exists.' : msg);
    }
    finally { setAddLinkSubmitting(false); }
  }

  async function handleDeleteLink(id: string) {
    if (!token || !confirm('Remove this link?')) return;
    try {
      await apiDeleteAuth(`/linked-records/${id}`, token);
      setLinkedRecords((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  // ── Comments ─────────────────────────────────────────────────────────────
  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!token || !newComment.trim()) return;
    setCommentLoading(true);
    try {
      const c = await apiPostAuth<TaskComment>(`/tasks/${taskId}/comments`, { body: newComment.trim() }, token);
      setComments((prev) => [...prev, c]);
      setNewComment('');
    } catch { /* ignore */ }
    finally { setCommentLoading(false); }
  }

  async function handleEditComment(commentId: string) {
    if (!token || !editCmtBody.trim()) { setEditingCmt(null); return; }
    try {
      const updated = await apiPatchAuth<TaskComment>(`/tasks/${taskId}/comments/${commentId}`, { body: editCmtBody.trim() }, token);
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...updated, updatedAt: updated.updatedAt ?? c.updatedAt } : c));
    } catch { /* ignore */ }
    finally { setEditingCmt(null); }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?') || !token) return;
    try {
      await apiDeleteAuth(`/tasks/${taskId}/comments/${commentId}`, token);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch { /* ignore */ }
    finally { setCmtMenuOpen(null); }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="flex h-full w-[500px] flex-col shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task Details</span>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : !task ? (
          <div className="flex flex-1 items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Task not found</div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Conflict banner */}
              {conflict && (
                <div className="rounded-lg px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--state-warning)' }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--state-warning)' }}>Updated by another user. Your edits are not lost.</span>
                  <button
                    type="button"
                    onClick={() => { setConflict(false); isDirtyRef.current = false; void load(); }}
                    className="text-xs font-medium underline"
                    style={{ color: 'var(--state-warning)' }}
                  >
                    Refresh
                  </button>
                </div>
              )}

              {/* Locked banner */}
              {isLocked && (
                <div className="rounded-lg px-4 py-2 text-xs" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                  This task is {task.status.toLowerCase()}. Editing is restricted.
                </div>
              )}

              {/* Editable title */}
              <div>
                {editingTitle ? (
                  <div className="flex items-start gap-2">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => { setDraftTitle(e.target.value); isDirtyRef.current = true; }}
                      onBlur={() => void saveTitle()}
                      onKeyDown={(e) => { if (e.key === 'Enter') void saveTitle(); if (e.key === 'Escape') { setDraftTitle(task.title); setEditingTitle(false); } }}
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none"
                      style={{ border: '1px solid var(--accent-primary)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-subtle)' }}
                      maxLength={500}
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-2 group">
                    <h3
                      className="flex-1 text-base font-semibold leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {task.title}
                    </h3>
                    {canUpdate && !isLocked && (
                      <button
                        type="button"
                        onClick={() => { setDraftTitle(task.title); setEditingTitle(true); }}
                        className="mt-0.5 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        title="Edit title"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status + Priority row */}
              <div className="flex flex-wrap items-center gap-2">
                {canUpdate && !isLocked ? (
                  <select
                    value={task.status}
                    onChange={(e) => void saveField({ status: e.target.value })}
                    className="rounded-full border-0 py-0.5 pl-2 pr-6 text-xs font-medium outline-none appearance-none"
                    style={{
                      backgroundColor: task.status === 'COMPLETED' ? 'var(--state-success-soft)' :
                                       task.status === 'IN_PROGRESS' ? 'var(--accent-soft)' :
                                       task.status === 'WAITING_REVIEW' ? 'var(--state-warning-soft)' :
                                       task.status === 'REJECTED' ? 'var(--state-error-soft)' : 'var(--bg-muted)',
                      color: task.status === 'COMPLETED' ? 'var(--state-success)' :
                             task.status === 'IN_PROGRESS' ? 'var(--accent-primary)' :
                             task.status === 'WAITING_REVIEW' ? 'var(--state-warning)' :
                             task.status === 'REJECTED' ? 'var(--state-error)' : 'var(--text-muted)',
                    }}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                ) : (
                  <StatusBadge status={task.status} size="xs" />
                )}

                {canUpdate && !isLocked ? (
                  <select
                    value={task.priority}
                    onChange={(e) => void saveField({ priority: e.target.value })}
                    className="rounded-full border-0 py-0.5 pl-2 pr-6 text-xs font-medium outline-none appearance-none"
                    style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <PriorityBadge priority={task.priority} />
                )}
              </div>

              {/* Meta grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {/* Assignee */}
                <div>
                  <dt className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>Assignee</dt>
                  {canUpdate && !isLocked && userOptions.length > 0 ? (
                    <select
                      value={task.assigneeId ?? ''}
                      onChange={(e) => void saveField({ assigneeId: e.target.value || null })}
                      className="w-full rounded-lg border px-2 py-1 text-xs outline-none"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Unassigned</option>
                      {userOptions.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  ) : (
                    <dd className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <User className="h-3.5 w-3.5 flex-shrink-0" />
                      {task.assignee?.fullName ?? <span style={{ color: 'var(--text-disabled)' }}>Unassigned</span>}
                    </dd>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <dt className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>Due Date</dt>
                  {canUpdate && !isLocked ? (
                    <input
                      type="date"
                      value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                      onChange={(e) => void saveField({ dueDate: e.target.value || null })}
                      className="w-full rounded-lg border px-2 py-1 text-xs outline-none"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <dd className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      {task.dueDate ? formatDate(task.dueDate) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </dd>
                  )}
                </div>

                {/* Created by */}
                <div>
                  <dt className="mb-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Created By</dt>
                  <dd style={{ color: 'var(--text-secondary)' }}>{task.createdBy.fullName}</dd>
                </div>

                {/* Task list */}
                <div>
                  <dt className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>Task List</dt>
                  {canUpdate && !isLocked && listOptions.length > 1 ? (
                    <select
                      value={task.taskListId}
                      onChange={(e) => void saveField({ taskListId: e.target.value })}
                      className="w-full rounded-lg border px-2 py-1 text-xs outline-none"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                    >
                      {listOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  ) : (
                    <dd style={{ color: 'var(--text-secondary)' }}>{task.taskList.name}</dd>
                  )}
                </div>
              </dl>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Description</p>
                  <div className="flex items-center gap-2">
                    <SaveIndicator status={descSaveStatus} />
                    {canUpdate && !isLocked && !editingDesc && (
                      <button
                        type="button"
                        onClick={() => setEditingDesc(true)}
                        className="text-xs"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {editingDesc ? (
                  <textarea
                    autoFocus
                    value={draftDesc}
                    onChange={(e) => {
                      setDraftDesc(e.target.value);
                      isDirtyRef.current = true;
                      scheduleDescSave();
                    }}
                    onBlur={() => void flushDesc().then(() => { setEditingDesc(false); isDirtyRef.current = false; })}
                    rows={4}
                    placeholder="Add a description…"
                    className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ border: '1px solid var(--accent-primary)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                  />
                ) : (
                  <div
                    onClick={() => canUpdate && !isLocked && setEditingDesc(true)}
                    className="min-h-[40px] rounded-lg px-3 py-2 text-sm"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      color: task.description ? 'var(--text-secondary)' : 'var(--text-disabled)',
                      cursor: canUpdate && !isLocked ? 'text' : 'default',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {task.description || (canUpdate && !isLocked ? 'Click to add a description…' : '—')}
                  </div>
                )}
              </div>

              {/* Subtasks */}
              {task.subtasks.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Subtasks ({task.subtasks.length})
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {task.subtasks.map((st) => (
                      <li key={st.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-muted)' }}>
                        <StatusBadge status={st.status} size="xs" />
                        <span style={{ color: 'var(--text-primary)' }}>{st.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Files section */}
              <div className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                <FileAttachmentSection
                  entityType="TASK"
                  entityId={task.id}
                  uploadEndpoint={`/tasks/${task.id}/attachments`}
                  listEndpoint={`/tasks/${task.id}/attachments`}
                  canUpload={(canUpdate && !isLocked) ?? false}
                  canDelete={canUpdate || isElevated}
                  compact
                />
              </div>

              {/* Tab bar */}
              <div className="flex gap-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                {([
                  { key: 'comments', label: `Comments (${comments.length})` },
                  { key: 'linked',   label: `Linked (${linkedRecords.length})` },
                  { key: 'activity', label: `Activity (${activity.length})` },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className="pb-2 text-xs font-medium"
                    style={{
                      color: activeTab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                      borderBottom: activeTab === key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Comments tab */}
              {activeTab === 'comments' && (
                <ul className="flex flex-col gap-3">
                  {comments.length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>No comments yet.</p>
                  )}
                  {comments.map((c) => {
                    const isAuthor   = c.authorId === user?.id;
                    const canEditCmt = isAuthor || isElevated;
                    const canDelCmt  = isAuthor || isElevated;
                    const isEditing  = editingCmt === c.id;

                    return (
                      <li key={c.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                              {c.author.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.author.fullName}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{formatDateTime(c.createdAt)}</span>
                            {c.updatedAt !== c.createdAt && (
                              <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>(edited)</span>
                            )}
                          </div>

                          {(canEditCmt || canDelCmt) && !isEditing && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setCmtMenuOpen((prev) => prev === c.id ? null : c.id)}
                                className="rounded p-1"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                              {cmtMenuOpen === c.id && (
                                <div
                                  className="absolute right-0 top-full z-10 mt-1 rounded-xl shadow-lg overflow-hidden"
                                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '120px' }}
                                >
                                  {canEditCmt && (
                                    <button
                                      type="button"
                                      onClick={() => { setEditingCmt(c.id); setEditCmtBody(c.body); setCmtMenuOpen(null); }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                    >
                                      <Pencil className="h-3 w-3" /> Edit
                                    </button>
                                  )}
                                  {canDelCmt && (
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteComment(c.id)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                      style={{ color: 'var(--state-error)' }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--state-error-soft)')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                    >
                                      <Trash2 className="h-3 w-3" /> Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="ml-8 flex flex-col gap-2">
                            <textarea
                              autoFocus
                              value={editCmtBody}
                              onChange={(e) => setEditCmtBody(e.target.value)}
                              rows={2}
                              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                              style={{ border: '1px solid var(--accent-primary)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleEditComment(c.id); }
                                if (e.key === 'Escape') { setEditingCmt(null); }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleEditComment(c.id)}
                                className="rounded-lg px-3 py-1 text-xs font-medium text-white"
                                style={{ backgroundColor: 'var(--accent-primary)' }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCmt(null)}
                                className="rounded-lg px-3 py-1 text-xs"
                                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="ml-8 whitespace-pre-wrap text-sm" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Activity tab */}
              {activeTab === 'activity' && (
                <ul className="flex flex-col gap-2">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                      <div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{a.actor.fullName} </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.summary}</span>
                        <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{formatDateTime(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                  {activity.length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>No activity yet.</p>
                  )}
                </ul>
              )}

              {/* Linked records tab */}
              {activeTab === 'linked' && (
                <div className="flex flex-col gap-3">

                  {/* Add Link button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowAddLink((p) => !p); setAddLinkError(''); setAddLinkResults([]); setAddLinkSelected(null); }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
                    >
                      <Link2 className="h-3 w-3" />
                      {showAddLink ? 'Cancel' : 'Add Link'}
                    </button>
                  </div>

                  {/* Add Link form */}
                  {showAddLink && (
                    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                      <div className="flex gap-2">
                        <select
                          value={addLinkType}
                          onChange={(e) => { setAddLinkType(e.target.value); setAddLinkResults([]); setAddLinkSelected(null); setAddLinkError(''); }}
                          className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                        >
                          {(['TASK', 'PAGE', 'DOCUMENT', 'NCR_CAPA', 'CHECKLIST_ITEM'] as const).map((t) => (
                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={addLinkSearch}
                          onChange={(e) => setAddLinkSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void handleSearchForLink(); }}
                          placeholder="Search records…"
                          className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                        />
                        <button
                          type="button"
                          onClick={() => void handleSearchForLink()}
                          disabled={addLinkSearching}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--accent-primary)' }}
                        >
                          {addLinkSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Find'}
                        </button>
                      </div>

                      {addLinkError && (
                        <p className="text-[11px]" style={{ color: 'var(--state-error)' }}>{addLinkError}</p>
                      )}

                      {addLinkResults.length > 0 && (
                        <ul
                          className="max-h-40 overflow-y-auto flex flex-col gap-0.5 rounded-lg border p-1"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
                        >
                          {addLinkResults.map((r) => (
                            <li key={r.id}>
                              <button
                                type="button"
                                onClick={() => setAddLinkSelected(addLinkSelected === r.id ? null : r.id)}
                                className="w-full rounded px-2 py-1.5 text-left text-xs transition-colors"
                                style={{
                                  backgroundColor: addLinkSelected === r.id ? 'var(--accent-soft)' : '',
                                  color: addLinkSelected === r.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  fontWeight: addLinkSelected === r.id ? '500' : undefined,
                                }}
                                onMouseEnter={(e) => { if (addLinkSelected !== r.id) e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
                                onMouseLeave={(e) => { if (addLinkSelected !== r.id) e.currentTarget.style.backgroundColor = ''; }}
                              >
                                {r.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {addLinkSelected && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void handleCreateLink()}
                            disabled={addLinkSubmitting}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            style={{ backgroundColor: 'var(--accent-primary)' }}
                          >
                            {addLinkSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            {addLinkSubmitting ? 'Linking…' : 'Add Link'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {linkedLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  ) : linkedRecords.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Link2 className="h-7 w-7" style={{ color: 'var(--text-disabled)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No linked items yet.</p>
                      <p className="text-xs text-center" style={{ color: 'var(--text-disabled)' }}>
                        Use "Add Link" to connect this task to related pages, documents, or NCR/CAPA records.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {linkedRecords.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-muted)' }}
                        >
                          <Link2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                              {r.targetTitle}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {r.targetType.replace('_', '/')} · linked by {r.createdBy.fullName}
                            </p>
                          </div>
                          {(r.createdById === user?.id || canUpdate) && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteLink(r.id)}
                              title="Remove link"
                              className="rounded p-0.5 transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                              <Link2Off className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Comment input */}
            <div className="border-t px-5 py-3" style={{ borderColor: 'var(--border-default)' }}>
              <form onSubmit={(e) => void handleAddComment(e)} className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment… Use @username to mention someone"
                  rows={2}
                  className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment(e as unknown as FormEvent); }
                  }}
                />
                <button
                  type="submit"
                  disabled={commentLoading || !newComment.trim()}
                  className="self-end rounded-lg p-2 text-white disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                  aria-label="Send comment"
                >
                  {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
