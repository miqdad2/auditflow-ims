'use client';

import {
  useState, useEffect, useCallback, useRef, FormEvent,
} from 'react';
import {
  X, Loader2, Clock, User, Pencil,
  Trash2, Check, AlertCircle, MoreHorizontal, RefreshCw, Info, MessageSquare,
} from 'lucide-react';
import { apiGet, apiPatchAuth, apiPostAuth, apiDeleteAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/status-badge';
import { FileAttachmentSection } from '@/features/file-attachments/file-attachment-section';
import { useAutosave } from '@/hooks/use-autosave';
import type { TaskDetail, TaskComment, ActivityEvent, TaskSummary, LinkedRecord } from './types';
import { Link2, Link2Off } from 'lucide-react';
import {
  TASK_STATUS_TRANSITIONS,
  STATUS_CONFIRM_CONFIG, STATUS_BADGE_COLORS,
  TASK_STATUS_DISPLAY_NAMES, ALL_TASK_STATUSES, SENSITIVE_TARGET_STATUSES,
  MEMBER_STATUS_ACTION_LABELS, STATUS_DISPLAY_LABELS,
  type StatusTier,
} from '@/lib/task-status';
import { TaskBadgeSelect, type BadgeOption } from '@/components/task-badge-select';

const PRIORITY_OPTIONS: BadgeOption[] = [
  { value: 'LOW',      label: 'LOW',      bg: 'var(--bg-muted)',           color: 'var(--text-muted)' },
  { value: 'MEDIUM',   label: 'MEDIUM',   bg: 'var(--accent-soft)',         color: 'var(--accent-primary)' },
  { value: 'HIGH',     label: 'HIGH',     bg: 'var(--state-warning-soft)', color: 'var(--state-warning)' },
  { value: 'CRITICAL', label: 'CRITICAL', bg: 'var(--state-error-soft)',   color: 'var(--state-error)' },
];

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
  /** When set, Files section shows an alert note and scrolls to the matching file */
  highlightFileId?: string;
}

export function TaskDetailPanel({ taskId, onClose, onUpdated, onDeleted, externalUpdateKey, linkedRecordsUpdateKey, highlightFileId }: Props) {
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

  // ── Status select + confirmation dialog ──────────────────────────────────
  // displayStatus drives the select's visible value independently from task.status.
  // On sensitive selections it shows the pending value until modal resolves.
  const [displayStatus,  setDisplayStatus]  = useState('');
  const [pendingStatus,  setPendingStatus]  = useState<string | null>(null);
  const [statusReason,   setStatusReason]   = useState('');
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError,    setStatusError]    = useState('');

  // ── Priority saving state ─────────────────────────────────────────────────
  const [prioritySaving, setPrioritySaving] = useState(false);

  // ── Approval workflow state (Unit 63.1) ──────────────────────────────────
  const [approvalLoading,  setApprovalLoading]  = useState(false);
  const [approvalError,    setApprovalError]    = useState('');
  const [approvalReviewNote, setApprovalReviewNote] = useState('');
  const [approvalAction,   setApprovalAction]   = useState<'return' | 'reject' | null>(null);

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
  // isLocked: non-elevated users cannot edit COMPLETED/CANCELLED task fields (title/description/assignee)
  // Status changes are still possible via the controlled action UI for authorized users.
  const isLocked  = task ? ['COMPLETED', 'CANCELLED'].includes(task.status) && !isElevated : false;
  // Assignee check: the logged-in user is the task assignee
  const isAssignee = !!task && task.assigneeId === user?.id;
  // Upload eligibility: elevated/managers (via tasks.update) OR the task's assignee can upload supporting files.
  // Assignee upload uses project.read permission (already available); no tasks.update required.
  const canUploadTaskFile = (canUpdate || isAssignee) && !isLocked;

  // Determine role tier for transition map
  const wsRole    = (task as { myRole?: string } | null)?.myRole ?? null;
  const isWsOwnerOrManager = wsRole === 'OWNER' || wsRole === 'MANAGER';
  // Assignees without elevated/update permissions use MEMBER tier (limited transitions: TODO→IN_PROGRESS, IN_PROGRESS→WAITING_REVIEW, REJECTED→IN_PROGRESS)
  const statusTier: StatusTier = isElevated || canUpdate ? 'ELEVATED' : isWsOwnerOrManager ? 'MANAGER' : 'MEMBER';

  // Approval workflow (Unit 63.1)
  const isCreator   = !!task && task.createdById === user?.id;
  const isReviewer  = isElevated || isWsOwnerOrManager;
  const approvalStatus = task?.approvalStatus ?? 'APPROVED';

  // Valid next statuses for the current task status + role
  const validNextStatuses: string[] = task
    ? (TASK_STATUS_TRANSITIONS[statusTier][task.status] ?? [])
    : [];

  // Sync displayStatus whenever the server-committed status changes
  useEffect(() => {
    if (task?.status) setDisplayStatus(task.status);
  }, [task?.status]);

  // Options shown in the dropdown:
  // • ELEVATED / canUpdate: full control
  // • Assignee (isAssignee) without canUpdate: limited transitions via MEMBER tier
  // • Viewer / non-assignee without canUpdate: no dropdown (static badge)
  const canChangeStatus = canUpdate || isAssignee;
  const dropdownOptions: string[] = !canChangeStatus ? [] : isElevated
    ? [...ALL_TASK_STATUSES]
    : task
      ? [task.status, ...validNextStatuses.filter((s) => s !== task.status)]
      : [];

  // Convert to BadgeOption[] for TaskBadgeSelect.
  // Unit 62: for MEMBER tier, use action-oriented labels for transition targets
  // ("Mark Work Complete" instead of "AWAITING REVIEW"; "Start Work" instead of "IN PROGRESS").
  // The current status shows its display name; only transition targets get action labels.
  const statusDropdownOptions: BadgeOption[] = dropdownOptions.map((s) => {
    const isCurrent = s === task?.status;
    let label: string;
    if (!isCurrent && statusTier === 'MEMBER' && MEMBER_STATUS_ACTION_LABELS[s]) {
      label = MEMBER_STATUS_ACTION_LABELS[s];
    } else {
      label = TASK_STATUS_DISPLAY_NAMES[s] ?? s;
    }
    return { value: s, label, ...(STATUS_BADGE_COLORS[s] ?? STATUS_BADGE_COLORS.TODO) };
  });

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
    // Load eligible assignees: workspace members with MEMBER|MANAGER|OWNER role only
    // Falls back to empty list (no assignment UI) if the endpoint is unavailable.
    apiGet<UserOption[]>(`/workspaces/${task.workspaceId}/members/eligible`, token)
      .then(setUserOptions)
      .catch(() => {});
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

  // ── Instant field save (non-status fields only) ───────────────────────────
  async function saveField(patch: Partial<Pick<TaskSummary, 'priority' | 'assigneeId' | 'dueDate' | 'taskListId'>> & { stopRecurrence?: boolean }) {
    if (!task || !token) return;
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}`, patch, token);
      setTask((prev) => prev ? { ...prev, ...updated } : null);
      onUpdated(updated);
    } catch { /* ignore */ }
  }

  // ── Priority save with loading state ─────────────────────────────────────
  async function savePriority(priority: string) {
    if (!task || !token) return;
    const prev = task.priority;
    setPrioritySaving(true);
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}`, { priority }, token);
      setTask((p) => p ? { ...p, ...updated } : null);
      onUpdated(updated);
    } catch {
      // revert optimistically if task state already changed
      setTask((p) => p ? { ...p, priority: prev } : null);
    } finally {
      setPrioritySaving(false);
    }
  }

  // ── Status select handlers ────────────────────────────────────────────────

  function closeStatusDialog() {
    // Revert the select to the real committed status on cancel
    if (task?.status) setDisplayStatus(task.status);
    setPendingStatus(null);
    setStatusReason('');
    setStatusError('');
  }

  // Called from the <select> onChange. Decides immediate save vs. modal.
  function handleDropdownChange(newStatus: string) {
    if (!task || newStatus === task.status) return;
    // Show the selection immediately in the dropdown
    setDisplayStatus(newStatus);
    setStatusError('');
    if (SENSITIVE_TARGET_STATUSES.has(newStatus)) {
      // Requires confirmation (and possibly a reason)
      setPendingStatus(newStatus);
      setStatusReason('');
    } else {
      // Routine change — save immediately without modal
      void immediateStatusChange(newStatus);
    }
  }

  async function immediateStatusChange(newStatus: string) {
    if (!task || !token) return;
    setStatusChanging(true);
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}/status`, {
        newStatus,
        source:           'WORKSPACE_TASK_DRAWER',
        expectedUpdatedAt: task.updatedAt,
      }, token);
      setTask((prev) => prev ? { ...prev, ...updated } : null);
      onUpdated(updated);
      void apiGet<ActivityEvent[]>(`/tasks/${taskId}/activity`, token).then(setActivity).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change status.';
      setDisplayStatus(task.status); // revert on failure
      if (msg.toLowerCase().includes('refresh') || msg.toLowerCase().includes('conflict')) {
        setConflict(true);
      }
      setStatusError(msg);
    } finally {
      setStatusChanging(false);
    }
  }

  async function confirmStatusChange() {
    if (!task || !token || !pendingStatus) return;
    const cfg = STATUS_CONFIRM_CONFIG[pendingStatus];
    if (cfg?.reasonRequired && !statusReason.trim()) {
      setStatusError('Please provide a reason before continuing.');
      return;
    }
    setStatusChanging(true);
    setStatusError('');
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${task.id}/status`, {
        newStatus:         pendingStatus,
        reason:            statusReason.trim() || undefined,
        source:            'WORKSPACE_TASK_DRAWER',
        expectedUpdatedAt: task.updatedAt,
      }, token);
      setTask((prev) => prev ? { ...prev, ...updated } : null);
      onUpdated(updated);
      setPendingStatus(null);
      setStatusReason('');
      setStatusError('');
      void apiGet<ActivityEvent[]>(`/tasks/${taskId}/activity`, token).then(setActivity).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change status.';
      setDisplayStatus(task.status); // revert on failure
      if (msg.toLowerCase().includes('refresh') || msg.toLowerCase().includes('conflict')) {
        setConflict(true);
      }
      setStatusError(msg);
    } finally {
      setStatusChanging(false);
    }
  }

  // ── Approval action handlers (Unit 63.1) ─────────────────────────────────

  async function handleApproveTask(andComplete = false) {
    if (!task || !token) return;
    setApprovalLoading(true); setApprovalError('');
    try {
      const endpoint = andComplete ? `/tasks/${task.id}/approval/approve-complete` : `/tasks/${task.id}/approval/approve`;
      const updated = await apiPostAuth<TaskSummary>(endpoint, { reviewNote: approvalReviewNote.trim() || undefined }, token);
      setTask((p) => p ? { ...p, ...updated } : null);
      onUpdated(updated);
      setApprovalReviewNote('');
      void load();
    } catch (err: unknown) {
      setApprovalError(err instanceof Error ? err.message : 'Approval failed.');
    } finally { setApprovalLoading(false); }
  }

  async function handleApprovalWithNote(action: 'return' | 'reject') {
    if (!task || !token || !approvalReviewNote.trim()) {
      setApprovalError('A reason is required.');
      return;
    }
    setApprovalLoading(true); setApprovalError('');
    try {
      const updated = await apiPostAuth<TaskSummary>(`/tasks/${task.id}/approval/${action}`, { reviewNote: approvalReviewNote.trim() }, token);
      setTask((p) => p ? { ...p, ...updated } : null);
      onUpdated(updated);
      setApprovalAction(null);
      setApprovalReviewNote('');
      void load();
    } catch (err: unknown) {
      setApprovalError(err instanceof Error ? err.message : 'Action failed.');
    } finally { setApprovalLoading(false); }
  }

  async function handleResubmitTask() {
    if (!task || !token) return;
    setApprovalLoading(true); setApprovalError('');
    try {
      const updated = await apiPostAuth<TaskSummary>(`/tasks/${task.id}/approval/resubmit`, {}, token);
      setTask((p) => p ? { ...p, ...updated } : null);
      onUpdated(updated);
      void load();
    } catch (err: unknown) {
      setApprovalError(err instanceof Error ? err.message : 'Resubmit failed.');
    } finally { setApprovalLoading(false); }
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
  function formatKuwait(iso: string | null | undefined): string {
    if (!iso) return 'Not available';
    try {
      return new Date(iso).toLocaleString('en-GB', {
        timeZone: 'Asia/Kuwait',
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return iso; }
  }

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="flex h-full w-full max-w-[680px] flex-col shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — shows task context when loaded */}
        <div className="flex items-start justify-between gap-3 border-b px-5 py-3" style={{ borderColor: 'var(--border-default)' }}>
          {task ? (
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <StatusBadge status={task.status} size="xs" />
                {task.isReference ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
                    Reference Only
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: (PRIORITY_OPTIONS.find((p) => p.value === task.priority) ?? PRIORITY_OPTIONS[0]).bg,
                      color:           (PRIORITY_OPTIONS.find((p) => p.value === task.priority) ?? PRIORITY_OPTIONS[0]).color,
                    }}
                  >
                    {task.priority}
                  </span>
                )}
                {task.recurrenceInterval && task.recurrenceInterval !== 'NONE' && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                    <RefreshCw className="h-2.5 w-2.5" />
                    {{'MONTHLY':'Monthly','QUARTERLY':'Quarterly','SEMIANNUAL':'Every 6 mo','ANNUAL':'Annual'}[task.recurrenceInterval] ?? task.recurrenceInterval}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-semibold line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                {task.title}
              </h2>
            </div>
          ) : (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task Details</span>
          )}
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }} aria-label="Close" className="flex-shrink-0 mt-0.5">
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

              {/* ── Approval status banner (Unit 63.1) ──────────────────────── */}
              {approvalStatus === 'PENDING' && isCreator && !isReviewer && (
                <div className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                  style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)' }}>
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>Pending Approval</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      This task is private and awaiting review. You can continue working. It will become official once approved.
                    </p>
                    {task.approvalNote && (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-medium">Your reason:</span> {task.approvalNote}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {approvalStatus === 'RETURNED' && isCreator && (
                <div className="rounded-lg px-3 py-2.5 space-y-2"
                  style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)' }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--state-warning)' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--state-warning)' }}>Returned for Correction</p>
                      {task.approvalReviewNote && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">Reviewer note:</span> {task.approvalReviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleResubmitTask()}
                    disabled={approvalLoading}
                    className="w-full rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--state-warning)', color: '#fff', opacity: approvalLoading ? 0.6 : 1 }}
                  >
                    {approvalLoading ? 'Resubmitting…' : 'Resubmit for Approval'}
                  </button>
                  {approvalError && <p className="text-[11px]" style={{ color: 'var(--state-error)' }}>{approvalError}</p>}
                </div>
              )}

              {approvalStatus === 'REJECTED' && isCreator && (
                <div className="rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)' }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--state-error)' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--state-error)' }}>Request Rejected</p>
                      {task.approvalReviewNote && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">Reason:</span> {task.approvalReviewNote}
                        </p>
                      )}
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        This task request is closed. No further changes can be made.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Reviewer approval action panel (Unit 63.1) ──────────────── */}
              {approvalStatus === 'PENDING' && isReviewer && (
                <div className="rounded-lg px-3 py-3 space-y-3"
                  style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Task Approval Request</p>
                    <div className="space-y-1">
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium">Requested by:</span>{' '}
                        {task.createdBy?.fullName || 'Unknown user'}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium">Created:</span>{' '}
                        {formatDateTime(task.createdAt)}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium">Work status:</span>{' '}
                        {task.status.replace(/_/g, ' ')}
                      </p>
                      {task.approvalNote && (
                        <p className="text-[11px] pt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">Business reason:</span>{' '}
                          {task.approvalNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reviewer note input (for approve-with-note, return, reject) */}
                  <textarea
                    value={approvalReviewNote}
                    onChange={(e) => { setApprovalReviewNote(e.target.value); setApprovalError(''); }}
                    placeholder={approvalAction ? 'Reason required…' : 'Optional reviewer note…'}
                    rows={2} maxLength={2000}
                    className="w-full resize-none rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />

                  {!approvalAction ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApproveTask(false)}
                        disabled={approvalLoading}
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                        style={{ backgroundColor: 'var(--state-success)', minWidth: 80 }}
                      >
                        {approvalLoading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApproveTask(true)}
                        disabled={approvalLoading}
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                        style={{ backgroundColor: 'var(--accent-primary)', minWidth: 80 }}
                      >
                        Approve &amp; Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => { setApprovalAction('return'); setApprovalError(''); }}
                        disabled={approvalLoading}
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)', minWidth: 80 }}
                      >
                        Return
                      </button>
                      <button
                        type="button"
                        onClick={() => { setApprovalAction('reject'); setApprovalError(''); }}
                        disabled={approvalLoading}
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)', minWidth: 80 }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium" style={{ color: approvalAction === 'reject' ? 'var(--state-error)' : 'var(--state-warning)' }}>
                        {approvalAction === 'return' ? 'Return reason (required):' : 'Rejection reason (required):'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApprovalWithNote(approvalAction)}
                          disabled={approvalLoading || !approvalReviewNote.trim()}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                          style={{
                            backgroundColor: approvalAction === 'reject' ? 'var(--state-error)' : 'var(--state-warning)',
                            opacity: (!approvalReviewNote.trim() || approvalLoading) ? 0.5 : 1,
                          }}
                        >
                          {approvalLoading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : approvalAction === 'return' ? 'Confirm Return' : 'Confirm Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setApprovalAction(null); setApprovalError(''); }}
                          className="rounded-lg px-3 py-1.5 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {approvalError && <p className="text-[11px]" style={{ color: 'var(--state-error)' }}>{approvalError}</p>}
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

              {/* Reference helper */}
              {task.isReference && (
                <div className="flex items-start gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)' }}>
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>Reference Only</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--accent-primary)', opacity: 0.85 }}>
                      Informational item — excluded from overdue and unassigned task alerts.
                    </p>
                  </div>
                </div>
              )}

              {/* Status + Priority row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status — polished custom select (or static badge for viewers) */}
                <TaskBadgeSelect
                  value={displayStatus || task.status}
                  options={statusDropdownOptions}
                  onChange={handleDropdownChange}
                  disabled={statusChanging}
                  saving={statusChanging}
                  readOnly={statusDropdownOptions.length === 0}
                  menuWidth={230}
                  ariaLabel="Task status"
                />
                {/* Inline status error shown outside modal path */}
                {statusError && !pendingStatus && (
                  <span className="text-[10px]" style={{ color: 'var(--state-error)' }}>{statusError}</span>
                )}

                {/* Priority — Reference Only badge OR custom priority select */}
                {task.isReference ? (
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color:           'var(--accent-primary)',
                      borderColor:     'var(--border-default)',
                    }}
                  >
                    Reference Only
                  </span>
                ) : (
                  <TaskBadgeSelect
                    value={task.priority}
                    options={PRIORITY_OPTIONS}
                    onChange={(v) => void savePriority(v)}
                    saving={prioritySaving}
                    readOnly={!canUpdate || isLocked}
                    menuWidth={180}
                    ariaLabel="Task priority"
                  />
                )}

                {/* Recurrence badge */}
                {task.recurrenceInterval && task.recurrenceInterval !== 'NONE' && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                  >
                    {{MONTHLY:'Monthly',QUARTERLY:'Quarterly',SEMIANNUAL:'Every 6 mo',ANNUAL:'Annual'}[task.recurrenceInterval] ?? task.recurrenceInterval}
                  </span>
                )}
              </div>

              {/* ── Reviewer Panel (Part 14) — shown when WAITING_REVIEW and user is reviewer ─── */}
              {task.status === 'WAITING_REVIEW' && (canUpdate || isElevated || isWsOwnerOrManager) && (() => {
                // Find the WAITING_REVIEW submission event to get completion note + submitter
                const submissionEvent = [...activity].reverse().find(
                  (a) => a.action === 'STATUS_CHANGED' && a.metadata?.newStatus === 'WAITING_REVIEW',
                );
                const completionNote = submissionEvent?.metadata?.reason as string | null | undefined;
                const submittedAt    = submissionEvent?.createdAt;
                const submittedBy    = submissionEvent?.actor?.fullName ?? task.assignee?.fullName ?? 'Assignee';
                return (
                  <div className="rounded-xl border-2 p-4"
                    style={{ borderColor: 'var(--state-warning)', backgroundColor: 'var(--state-warning-soft)' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0" style={{ color: 'var(--state-warning)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--state-warning)' }}>
                        Work Submitted for Review
                      </p>
                    </div>
                    <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Submitted by:</span> <strong>{submittedBy}</strong></div>
                      {submittedAt && (
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Submitted:</span>{' '}
                          {new Date(submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {completionNote && (
                        <div>
                          <p style={{ color: 'var(--text-muted)' }} className="mb-0.5">Completion note:</p>
                          <p className="italic rounded p-2" style={{ backgroundColor: 'rgba(255,255,255,0.5)', color: 'var(--text-primary)' }}>
                            &ldquo;{completionNote}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button type="button"
                        onClick={() => {
                          setDisplayStatus('COMPLETED');
                          const cfg = STATUS_CONFIRM_CONFIG['COMPLETED'];
                          if (cfg) { setPendingStatus('COMPLETED'); setStatusReason(''); setStatusError(''); }
                        }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--state-success)' }}>
                        ✓ Approve Completion
                      </button>
                      <button type="button"
                        onClick={() => {
                          setDisplayStatus('REJECTED');
                          const cfg = STATUS_CONFIRM_CONFIG['REJECTED'];
                          if (cfg) { setPendingStatus('REJECTED'); setStatusReason(''); setStatusError(''); }
                        }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--state-error)' }}>
                        ✗ Return for Correction
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── Assignee completion context for MEMBER (non-reviewer) ─── */}
              {task.status === 'WAITING_REVIEW' && !canUpdate && !isElevated && !isWsOwnerOrManager && (() => {
                const submissionEvent = [...activity].reverse().find(
                  (a) => a.action === 'STATUS_CHANGED' && a.metadata?.newStatus === 'WAITING_REVIEW',
                );
                const completionNote = submissionEvent?.metadata?.reason as string | null | undefined;
                return (
                  <div className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--state-warning)30', backgroundColor: 'var(--state-warning-soft)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--state-warning)' }}>
                      Work submitted — awaiting review
                    </p>
                    {completionNote && (
                      <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                        &ldquo;{completionNote}&rdquo;
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      A reviewer will approve or return this task.
                    </p>
                  </div>
                );
              })()}

              {/* Meta grid — 3 rows × 2 cols */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {/* Row 1: Assignee | Due Date */}
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
                    <dd className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <User className="h-3.5 w-3.5 flex-shrink-0" />
                      {task.assignee?.fullName ?? <span style={{ color: 'var(--text-disabled)' }}>Unassigned</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {task.isReference ? 'Review Date' : 'Due Date'}
                  </dt>
                  {canUpdate && !isLocked ? (
                    <input
                      type="date"
                      value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                      onChange={(e) => void saveField({ dueDate: e.target.value || null })}
                      className="w-full rounded-lg border px-2 py-1 text-xs outline-none"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <dd className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      {task.dueDate ? formatDate(task.dueDate) : <span style={{ color: 'var(--text-disabled)' }}>Not set</span>}
                    </dd>
                  )}
                </div>

                {/* Row 2: Task List | Created By */}
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
                    <dd className="text-xs" style={{ color: 'var(--text-secondary)' }}>{task.taskList.name}</dd>
                  )}
                </div>
                <div>
                  <dt className="mb-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Created By</dt>
                  <dd className="text-xs" style={{ color: 'var(--text-secondary)' }}>{task.createdBy.fullName}</dd>
                </div>

                {/* Row 3: Created | Task Last Modified */}
                <div>
                  <dt className="mb-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Created</dt>
                  <dd className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatKuwait(task.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="mb-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Task Last Modified</dt>
                  <dd className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatKuwait(task.updatedAt)}
                  </dd>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--text-disabled)' }}>
                    Updates when task fields, status, or assignment change.
                  </p>
                </div>
              </dl>

              {/* Row 4: Last Status Change (derived from activity) */}
              {(() => {
                const lastChange = activity.find(
                  (a) => a.action === 'STATUS_CHANGED' && a.metadata?.newStatus,
                );
                if (!lastChange) return null;
                return (
                  <div className="mt-1 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <dt className="mb-0.5" style={{ color: 'var(--text-muted)' }}>Last Status Change</dt>
                        <dd style={{ color: 'var(--text-secondary)' }}>{formatDateTime(lastChange.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="mb-0.5" style={{ color: 'var(--text-muted)' }}>Changed By</dt>
                        <dd style={{ color: 'var(--text-secondary)' }}>{lastChange.actor.fullName}</dd>
                      </div>
                      {lastChange.metadata?.reason && (
                        <div className="col-span-2">
                          <dt className="mb-0.5" style={{ color: 'var(--text-muted)' }}>Reason</dt>
                          <dd className="italic" style={{ color: 'var(--text-secondary)' }}>&ldquo;{lastChange.metadata.reason}&rdquo;</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                );
              })()}

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
                    {task.description || (canUpdate && !isLocked ? 'Click to add a description…' : 'No description added.')}
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

              {/* Recurrence section */}
              {task.recurrenceInterval && task.recurrenceInterval !== 'NONE' && (
                <div
                  className="rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Recurrence
                      </p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <dt className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Repeat</dt>
                          <dd style={{ color: 'var(--text-secondary)' }}>
                            {{'MONTHLY':'Every 1 Month','QUARTERLY':'Every 3 Months','SEMIANNUAL':'Every 6 Months','ANNUAL':'Every 1 Year'}[task.recurrenceInterval] ?? task.recurrenceInterval}
                          </dd>
                        </div>
                        {task.recurrenceEndDate && (
                          <div>
                            <dt className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ends</dt>
                            <dd style={{ color: 'var(--text-secondary)' }}>
                              {new Date(task.recurrenceEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </dd>
                          </div>
                        )}
                        {task.recurrenceSeriesId && (
                          <div className="col-span-2">
                            <dt className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Note</dt>
                            <dd className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                              Changes apply to this occurrence only.
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    {(canUpdate || isElevated) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Stop future recurrence? No additional occurrences will be created. Existing tasks are unaffected.')) {
                            void saveField({ stopRecurrence: true });
                          }
                        }}
                        className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg border transition-colors"
                        style={{ color: 'var(--state-error)', borderColor: 'var(--state-error)', background: 'none' }}
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Files section */}
              <div className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                {highlightFileId && (
                  <div className="mx-4 mt-3 flex items-center gap-2 rounded-md px-3 py-2"
                    style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)' }}>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--state-warning)' }}>
                      Opened from expiry alert — see the highlighted file below.
                    </span>
                  </div>
                )}
                <FileAttachmentSection
                  entityType="TASK"
                  entityId={task.id}
                  uploadEndpoint={`/tasks/${task.id}/attachments`}
                  listEndpoint={`/tasks/${task.id}/attachments`}
                  canUpload={canUploadTaskFile}
                  canDelete={canUpdate || isElevated}
                  showExpiryTracking
                  compact
                />
              </div>

              {/* Latest Activity — compact strip using existing ActivityEvent data */}
              {activity.length > 0 ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-disabled)' }}>Latest Activity</p>
                  {(() => {
                    const latest = activity[activity.length - 1];
                    const diff   = Date.now() - new Date(latest.createdAt).getTime();
                    const mins   = Math.floor(diff / 60000);
                    const rel    = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : Math.floor(mins / 60) < 24 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                    return (
                      <p className="text-[11px] min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {latest.summary ?? latest.action.toLowerCase().replace(/_/g, ' ')}
                        {latest.actor && ` by ${latest.actor.fullName}`}
                        {' · '}{rel}
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>No recent activity.</p>
              )}

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
                <div className="flex flex-col gap-4">
                  {/* Compact status history section */}
                  {(() => {
                    const statusChanges = activity.filter(
                      (a) => a.action === 'STATUS_CHANGED' && a.metadata?.previousStatus,
                    );
                    if (statusChanges.length === 0) return null;
                    return (
                      <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status History</p>
                        <ul className="flex flex-col gap-2">
                          {statusChanges.slice(0, 5).map((a) => (
                            <li key={a.id} className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge status={a.metadata!.previousStatus!} size="xs" />
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>→</span>
                                <StatusBadge status={a.metadata!.newStatus!} size="xs" />
                                <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>by {a.actor.fullName} · {formatDateTime(a.createdAt)}</span>
                              </div>
                              {a.metadata?.reason && (
                                <p className="text-[10px] italic pl-1" style={{ color: 'var(--text-muted)' }}>
                                  &ldquo;{a.metadata.reason}&rdquo;
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Full activity list */}
                  <ul className="flex flex-col gap-2">
                    {activity.map((a) => (
                      <li key={a.id} className="flex items-start gap-2">
                        <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                        <div>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{a.actor.fullName} </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.summary}</span>
                          {a.metadata?.reason && a.action === 'STATUS_CHANGED' && (
                            <p className="text-[10px] italic mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Reason: &ldquo;{a.metadata.reason}&rdquo;
                            </p>
                          )}
                          <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{formatDateTime(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                    {activity.length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>No activity yet.</p>
                    )}
                  </ul>
                </div>
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

      {/* Status change confirmation dialog */}
      {pendingStatus && (() => {
        const cfg = STATUS_CONFIRM_CONFIG[pendingStatus];
        if (!cfg) return null;
        const btnStyle: Record<string, { bg: string; hover: string }> = {
          primary: { bg: 'var(--accent-primary)',  hover: 'var(--accent-hover)' },
          danger:  { bg: 'var(--state-error)',      hover: '#b91c1c' },
          warning: { bg: 'var(--state-warning)',    hover: '#b45309' },
        };
        const btn = btnStyle[cfg.confirmStyle] ?? btnStyle.primary;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <div
              className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{cfg.title}</h3>
                <button
                  type="button"
                  onClick={closeStatusDialog}
                  className="rounded p-1"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cfg.body}</p>

              {/* Reason / note field */}
              {cfg.reasonLabel && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {cfg.reasonLabel}
                  </label>
                  <textarea
                    autoFocus
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder={cfg.reasonPlaceholder}
                    className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                  />
                </div>
              )}

              {/* Error */}
              {statusError && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--state-error-soft)' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--state-error)' }} />
                  <p className="text-xs" style={{ color: 'var(--state-error)' }}>{statusError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeStatusDialog}
                  disabled={statusChanging}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmStatusChange()}
                  disabled={statusChanging || (cfg.reasonRequired && !statusReason.trim())}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: btn.bg }}
                  onMouseEnter={(e) => { if (!statusChanging) e.currentTarget.style.backgroundColor = btn.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = btn.bg; }}
                >
                  {statusChanging && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {cfg.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
