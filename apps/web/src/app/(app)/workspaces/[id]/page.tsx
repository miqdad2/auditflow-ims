'use client';

import { useState, useEffect, useCallback, useMemo, useRef, use } from 'react';
import {
  Plus, Loader2, ArrowLeft, ListTodo, CheckSquare, FileText, Users,
  Trash2, X, MoreHorizontal, Copy, ClipboardCopy, Move, Eye,
  Activity, LayoutDashboard, ChevronDown, Search, Lock, Globe, Building2,
  AlertTriangle, CheckCircle2, Clock, FileCheck, RefreshCw,
  ShieldAlert, Wifi, WifiOff, UserCircle, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPostAuth, apiPatchAuth, apiDeleteAuth, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWorkspaceSocket, useSocket } from '@/lib/socket-provider';
import { useToast } from '@/lib/toast-provider';
import { StatusBadge, PriorityBadge } from '@/components/status-badge';
import { CreateTaskListModal } from '@/features/workspaces/create-task-list-modal';
import { CreateTaskModal } from '@/features/workspaces/create-task-modal';
import { TaskDetailPanel } from '@/features/workspaces/task-detail-panel';
import { WorkspaceDocumentsTab } from '@/features/workspaces/workspace-documents-tab';
import { WorkspaceNcrTab } from '@/features/workspaces/workspace-ncr-tab';
import type {
  WorkspaceDetail, TaskListSummary, TaskSummary,
  WorkspaceOverviewData, WorkspaceActivityEntry,
} from '@/features/workspaces/types';

type WorkspaceTab = 'overview' | 'tasks' | 'members' | 'activity' | 'documents' | 'ncr';
type TaskFilter = 'all' | 'mine' | 'overdue' | 'unassigned' | 'completed' | 'high_priority';

interface WorkspaceMember {
  id: string;
  roleInWorkspace: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    department: { id: string; name: string } | null;
    userRoles: Array<{ role: { name: string; displayName: string } }>;
  };
}

interface UserOption { id: string; fullName: string; email: string; }

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner', MANAGER: 'Manager', MEMBER: 'Member', VIEWER: 'Viewer',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Created', UPDATED: 'Updated', DELETED: 'Deleted',
  MEMBER_ADDED: 'Added member to', MEMBER_REMOVED: 'Removed member from',
  MEMBER_UPDATED: 'Updated member role in',
  UPLOADED: 'Uploaded file to', DOWNLOADED: 'Downloaded file from',
  APPROVED: 'Approved', REJECTED: 'Rejected', SUBMITTED: 'Submitted',
  VERIFIED: 'Verified', CLOSED: 'Closed',
};

const ENTITY_LABELS: Record<string, string> = {
  PROJECT: 'Workspace', TASK: 'Task', PAGE: 'Page',
  DOCUMENT: 'Document', NCR_CAPA: 'Issue',
};

function EntityIcon({ type }: { type: string }) {
  const cls = 'h-3.5 w-3.5 flex-shrink-0';
  if (type === 'PROJECT') return <Building2 className={cls} />;
  if (type === 'TASK') return <CheckSquare className={cls} />;
  if (type === 'PAGE') return <FileText className={cls} />;
  if (type === 'DOCUMENT') return <FileCheck className={cls} />;
  if (type === 'NCR_CAPA') return <AlertTriangle className={cls} />;
  return <Activity className={cls} />;
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode }> = {
    ORGANIZATION: { label: 'Organization', icon: <Globe className="h-3 w-3" /> },
    DEPARTMENT: { label: 'Department', icon: <Building2 className="h-3 w-3" /> },
    PRIVATE: { label: 'Private', icon: <Lock className="h-3 w-3" /> },
  };
  const entry = map[visibility] ?? { label: visibility, icon: null };
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
      {entry.icon}{entry.label}
    </span>
  );
}

function SummaryCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
      <p className="mb-3 pl-2 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)', borderLeft: `3px solid ${accent ?? 'var(--accent-primary)'}` }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function KpiRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

interface PageProps { params: Promise<{ id: string }>; }

export default function WorkspaceDetailPage({ params }: PageProps) {
  const { id: workspaceId } = use(params);
  const { token, user } = useAuth();
  const router = useRouter();

  // Core
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Tasks
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [tasks, setTasks]           = useState<TaskSummary[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [inlineTitle, setInlineTitle]       = useState('');
  const [addingInline, setAddingInline]     = useState(false);
  const [openMenuId, setOpenMenuId]         = useState<string | null>(null);
  const [moveTaskId, setMoveTaskId]         = useState<string | null>(null);
  const [moveTargetListId, setMoveTargetListId] = useState('');
  const [moveLoading, setMoveLoading]       = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedTaskId, setSelectedTaskId]     = useState<string | null>(null);
  const [taskUpdateKeys, setTaskUpdateKeys]     = useState<Record<string, number>>({});
  const [linkedRecordsUpdateKeys, setLinkedRecordsUpdateKeys] = useState<Record<string, number>>({});
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Members
  const [members, setMembers]           = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers]         = useState<UserOption[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUserId, setAddUserId]       = useState('');
  const [addRoleInWs, setAddRoleInWs]   = useState('MEMBER');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null);

  // Overview
  const [overview, setOverview]           = useState<WorkspaceOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewStale, setOverviewStale] = useState(false);

  // Activity
  const [activity, setActivity]           = useState<WorkspaceActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Quick Add dropdown
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddRef = useRef<HTMLDivElement | null>(null);

  // Tab refresh keys and stale indicators
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [docsStale, setDocsStale]           = useState(false);
  const [ncrRefreshKey, setNcrRefreshKey]   = useState(0);
  const [ncrStale, setNcrStale]             = useState(false);

  // Permissions — incorporate workspace-member role
  const myWsRole         = workspace?.myRole ?? null;
  const myWsAccess       = workspace?.myAccess ?? null;
  const isElevatedAccess = myWsAccess === 'elevated';
  const canCollaborate   = isElevatedAccess || ['OWNER', 'MANAGER', 'MEMBER'].includes(myWsRole ?? '');
  const canManageWs      = isElevatedAccess || ['OWNER', 'MANAGER'].includes(myWsRole ?? '');

  const canManage        = (user?.permissions?.includes('project.create') ?? false) || canCollaborate;
  const canManageMembers = (user?.permissions?.includes('project.update') ?? false) || canManageWs;
  const canDeleteTask    = user?.permissions?.includes('tasks.delete') ?? false;

  const { showToast } = useToast();
  const { connected, reconnecting } = useSocket();
  const [lastOverviewRefresh, setLastOverviewRefresh] = useState<Date | null>(null);
  const nowRef = useRef(new Date());

  // Close menus on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openMenuId]);

  useEffect(() => {
    if (!showQuickAdd) return;
    const h = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setShowQuickAdd(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showQuickAdd]);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const ws = await apiGet<WorkspaceDetail>(`/workspaces/${workspaceId}`, token);
      setWorkspace(ws);
      if (ws.taskLists.length > 0 && !selectedListId) setSelectedListId(ws.taskLists[0].id);
    } catch (err) {
      if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 404)) {
        setAccessDenied(true);
      }
    }
    finally { setLoading(false); }
  }, [token, workspaceId, selectedListId]);

  const loadTasks = useCallback(async () => {
    if (!token || !selectedListId) return;
    setTasksLoading(true);
    try {
      const data = await apiGet<TaskSummary[]>(`/tasks?taskListId=${selectedListId}`, token);
      setTasks(data);
    } catch { /* ignore */ }
    finally { setTasksLoading(false); }
  }, [token, selectedListId]);

  const loadMembers = useCallback(async () => {
    if (!token) return;
    setMembersLoading(true);
    try {
      const data = await apiGet<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, token);
      setMembers(data);
    } catch { /* ignore */ }
    finally { setMembersLoading(false); }
  }, [token, workspaceId]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setOverviewLoading(true);
    setOverviewStale(false);
    try {
      const data = await apiGet<WorkspaceOverviewData>(`/workspaces/${workspaceId}/overview`, token);
      setOverview(data);
      setLastOverviewRefresh(new Date());
    } catch { /* ignore */ }
    finally { setOverviewLoading(false); }
  }, [token, workspaceId]);

  const loadActivity = useCallback(async () => {
    if (!token) return;
    setActivityLoading(true);
    try {
      const data = await apiGet<WorkspaceActivityEntry[]>(`/workspaces/${workspaceId}/activity`, token);
      setActivity(data);
    } catch { /* ignore */ }
    finally { setActivityLoading(false); }
  }, [token, workspaceId]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => { if (selectedListId) void loadTasks(); }, [loadTasks, selectedListId]);
  useEffect(() => { if (activeTab === 'overview') void loadOverview(); }, [activeTab, loadOverview]);
  useEffect(() => { if (activeTab === 'activity') void loadActivity(); }, [activeTab, loadActivity]);
  useEffect(() => {
    if (activeTab === 'members') {
      void loadMembers();
      if (canManageMembers && token)
        apiGet<UserOption[]>('/users/search?isActive=true', token).then(setAllUsers).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Filtered tasks ────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    const now = nowRef.current;
    let list = tasks;
    if (taskFilter === 'mine')          list = list.filter((t) => t.assigneeId === user?.id);
    if (taskFilter === 'overdue')       list = list.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    if (taskFilter === 'unassigned')    list = list.filter((t) => !t.assigneeId);
    if (taskFilter === 'completed')     list = list.filter((t) => t.status === 'COMPLETED');
    if (taskFilter === 'high_priority') list = list.filter((t) => t.priority === 'HIGH' || t.priority === 'CRITICAL');
    if (taskSearch.trim()) list = list.filter((t) => t.title.toLowerCase().includes(taskSearch.toLowerCase()));
    return list;
  }, [tasks, taskFilter, taskSearch, user?.id]);

  function filterCount(f: TaskFilter) {
    const now = nowRef.current;
    if (f === 'mine')          return tasks.filter((t) => t.assigneeId === user?.id).length;
    if (f === 'overdue')       return tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
    if (f === 'unassigned')    return tasks.filter((t) => !t.assigneeId).length;
    if (f === 'completed')     return tasks.filter((t) => t.status === 'COMPLETED').length;
    if (f === 'high_priority') return tasks.filter((t) => t.priority === 'HIGH' || t.priority === 'CRITICAL').length;
    return tasks.length;
  }

  // ── Socket handlers ───────────────────────────────────────────────────────────

  const socketHandlers = useMemo(() => ({
    'task.created': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId) { void loadTasks(); setOverviewStale(true); }
    },
    'task.updated': (data: Record<string, unknown>) => {
      if (data.workspaceId !== workspaceId) return;
      void loadTasks();
      setOverviewStale(true);
      const tid = data.id as string | undefined;
      if (tid && tid === selectedTaskId) setTaskUpdateKeys((p) => ({ ...p, [tid]: (p[tid] ?? 0) + 1 }));
    },
    'task.deleted': (data: Record<string, unknown>) => {
      if (data.workspaceId !== workspaceId) return;
      const tid = data.id as string | undefined;
      if (tid) setTasks((prev) => prev.filter((t) => t.id !== tid));
      if (tid === selectedTaskId) { setSelectedTaskId(null); showToast('This task was deleted by another user.'); }
      setOverviewStale(true);
    },
    'workspace.member.added': () => { void loadMembers(); setOverviewStale(true); showToast('Workspace member added by another user'); },
    'workspace.member.removed': () => { void loadMembers(); setOverviewStale(true); showToast('Workspace member removed by another user'); },
    'workspace.access.removed': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId) { showToast('Your access to this workspace has been removed.'); router.push('/workspaces'); }
    },
    'comment.created': (data: Record<string, unknown>) => {
      const taskId = data.taskId as string | undefined;
      if (taskId && taskId === selectedTaskId) {
        setTaskUpdateKeys((p) => ({ ...p, [taskId]: (p[taskId] ?? 0) + 1 }));
      }
    },
    'comment.updated': () => showToast('Task comment updated by another user'),
    'comment.deleted': () => showToast('Task comment deleted by another user'),
    'attachment.created': () => showToast('Attachment added by another user'),
    'attachment.deleted': () => showToast('Attachment removed by another user'),
    'document.created': () => { setOverviewStale(true); setDocsRefreshKey((k) => k + 1); setDocsStale(true); showToast('A new document was uploaded by another user'); },
    'document.updated': () => { setOverviewStale(true); setDocsRefreshKey((k) => k + 1); setDocsStale(true); },
    'evidence.updated': () => { setOverviewStale(true); },
    'ncr.created': () => { setOverviewStale(true); setNcrRefreshKey((k) => k + 1); setNcrStale(true); showToast('A new issue was raised by another user'); },
    'ncr.updated': () => { setOverviewStale(true); setNcrRefreshKey((k) => k + 1); setNcrStale(true); },
    'task.moved': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId) { void loadTasks(); setOverviewStale(true); }
    },
    'linked_record.created': (data: Record<string, unknown>) => {
      const sourceId = data.sourceId as string | undefined;
      if (sourceId && sourceId === selectedTaskId) {
        setLinkedRecordsUpdateKeys((p) => ({ ...p, [sourceId]: (p[sourceId] ?? 0) + 1 }));
        showToast('Linked records updated by another user');
      }
    },
    'linked_record.deleted': (data: Record<string, unknown>) => {
      const sourceId = data.sourceId as string | undefined;
      if (sourceId && sourceId === selectedTaskId) {
        setLinkedRecordsUpdateKeys((p) => ({ ...p, [sourceId]: (p[sourceId] ?? 0) + 1 }));
        showToast('A linked record was removed by another user');
      }
    },
  }), [workspaceId, selectedTaskId, loadTasks, loadMembers, showToast, router]);

  useWorkspaceSocket(workspaceId, socketHandlers, () => {
    // On socket reconnect: if on overview tab, refresh immediately; otherwise mark stale
    if (activeTab === 'overview') void loadOverview();
    else setOverviewStale(true);
  });

  // ── Actions ───────────────────────────────────────────────────────────────────

  async function handleInlineAddTask() {
    if (!token || !selectedListId || !inlineTitle.trim() || addingInline) return;
    setAddingInline(true);
    try {
      const task = await apiPostAuth<TaskSummary>('/tasks', { title: inlineTitle.trim(), taskListId: selectedListId }, token);
      setTasks((prev) => [...prev, task]);
      setInlineTitle('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create task');
    } finally { setAddingInline(false); }
  }

  async function handleDuplicate(taskId: string) {
    if (!token) return;
    setOpenMenuId(null);
    try {
      const copy = await apiPostAuth<TaskSummary>(`/tasks/${taskId}/duplicate`, {}, token);
      setTasks((prev) => [...prev, copy]);
      showToast('Task duplicated');
    } catch { showToast('Failed to duplicate task'); }
  }

  async function handleDeleteTask(taskId: string) {
    if (!token || !confirm('Delete this task? This cannot be undone.')) return;
    setOpenMenuId(null);
    try {
      await apiDeleteAuth(`/tasks/${taskId}`, token);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      showToast('Task deleted');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to delete task'); }
  }

  async function handleMoveTask() {
    if (!token || !moveTaskId || !moveTargetListId) return;
    setMoveLoading(true);
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${moveTaskId}`, { taskListId: moveTargetListId }, token);
      setTasks((prev) => prev.filter((t) => t.id !== moveTaskId));
      if (selectedTaskId === moveTaskId) setSelectedTaskId(null);
      showToast(`Moved to "${updated.taskList.name}"`);
    } catch { showToast('Failed to move task'); }
    finally { setMoveLoading(false); setMoveTaskId(null); setMoveTargetListId(''); }
  }

  function copyTaskLink(taskId: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/workspaces/${workspaceId}?task=${taskId}`);
    showToast('Link copied to clipboard');
    setOpenMenuId(null);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !addUserId) return;
    setAddMemberLoading(true);
    try {
      await apiPostAuth(`/workspaces/${workspaceId}/members`, { userId: addUserId, roleInWorkspace: addRoleInWs }, token);
      setShowAddMember(false);
      setAddUserId('');
      setAddRoleInWs('MEMBER');
      await loadMembers();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to add member'); }
    finally { setAddMemberLoading(false); }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    if (!token) return;
    setRoleChangeLoading(memberId);
    try {
      await apiPatchAuth(`/workspaces/${workspaceId}/members/${memberId}`, { roleInWorkspace: newRole }, token);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, roleInWorkspace: newRole } : m));
      showToast('Workspace role updated');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to update role'); }
    finally { setRoleChangeLoading(null); }
  }

  async function handleRemoveMember(memberId: string) {
    if (!token || !confirm('Remove this member from the workspace?')) return;
    try {
      await apiDeleteAuth(`/workspaces/${workspaceId}/members/${memberId}`, token);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast('Member removed');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to remove member'); }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const selectedList = workspace?.taskLists.find((tl) => tl.id === selectedListId) ?? null;
  const otherLists   = workspace?.taskLists.filter((tl) => tl.id !== selectedListId) ?? [];
  const memberCount  = workspace?._count?.members ?? overview?.members ?? members.length;

  // ── Loading / not found ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--state-error-soft, #FEE2E2)' }}
        >
          <ShieldAlert className="h-8 w-8" style={{ color: 'var(--state-error, #DC2626)' }} />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {accessDenied ? 'Access Denied' : 'Workspace Not Found'}
          </p>
          <p className="mt-1 text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
            {accessDenied
              ? 'You do not have access to this workspace. Please contact your administrator to be added as a member.'
              : 'This workspace does not exist or has been removed.'}
          </p>
        </div>
        <Link
          href="/workspaces"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Go to My Workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Enhanced header ──────────────────────────────────────────────────── */}
      <div className="border-b px-6 py-3" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between gap-4">
          {/* Breadcrumb + workspace identity */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Link href="/workspaces" className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>/</span>
            <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{workspace.name}</span>
            <StatusBadge status={workspace.status} size="xs" />
            <VisibilityBadge visibility={workspace.visibility} />
            {/* Workspace access level badge */}
            {isElevatedAccess ? (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
                <TrendingUp className="h-2.5 w-2.5" />Elevated Access
              </span>
            ) : myWsRole ? (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                {myWsRole === 'MEMBER' ? 'Member · Can collaborate' : myWsRole === 'VIEWER' ? 'Viewer · Read-only' : myWsRole}
              </span>
            ) : null}
            {/* Live realtime indicator */}
            {reconnecting ? (
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--state-warning)' }}>
                <WifiOff className="h-3 w-3" />Reconnecting…
              </span>
            ) : connected ? (
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--state-success)' }}>
                <Wifi className="h-3 w-3" />Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                <WifiOff className="h-3 w-3" />Offline
              </span>
            )}
            {/* Last updated */}
            {lastOverviewRefresh && activeTab === 'overview' && (
              <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                Updated {relativeTime(lastOverviewRefresh.toISOString())}
              </span>
            )}
            {workspace.department && (
              <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <Building2 className="h-3 w-3" />{workspace.department.name}
              </span>
            )}
          </div>

          {/* Stats + Quick Add */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden items-center gap-4 md:flex">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{workspace.summary.tasks.open}</span> open task{workspace.summary.tasks.open !== 1 ? 's' : ''}
              </span>
              {workspace.summary.tasks.overdue > 0 && (
                <span className="text-xs" style={{ color: 'var(--state-error)' }}>
                  <span className="font-semibold">{workspace.summary.tasks.overdue}</span> overdue
                </span>
              )}
              {memberCount > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{memberCount}</span> members
                </span>
              )}
            </div>

            {/* Quick Add */}
            <div className="relative" ref={quickAddRef}>
              <button type="button" onClick={() => setShowQuickAdd((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-4 w-4" />Quick Add<ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {showQuickAdd && (
                <div className="absolute right-0 top-full z-30 mt-1 overflow-hidden rounded-xl shadow-lg"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '195px' }}>
                  {([
                    ...(canManage && selectedListId ? [{ label: 'Add Task',      Icon: CheckSquare,  act: () => { setActiveTab('tasks'); setShowCreateTask(true); setShowQuickAdd(false); } }] : []),
                    { label: 'Upload Document',    Icon: FileCheck,    act: () => { setActiveTab('documents'); setShowQuickAdd(false); } },
                    { label: 'Raise Issue',         Icon: AlertTriangle,act: () => { setActiveTab('ncr');       setShowQuickAdd(false); } },
                    ...(canManageMembers ? [{ label: 'Add Member', Icon: Users, act: () => { setActiveTab('members'); setShowAddMember(true); setShowQuickAdd(false); } }] : []),
                  ] as Array<{ label: string; Icon: React.ElementType; act: () => void }>).map(({ label, Icon, act }) => (
                    <button key={label} type="button" onClick={act}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 px-6"
        style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        {([
          { key: 'overview',  label: 'Overview',  Icon: LayoutDashboard, stale: overviewStale, onOpen: () => {},                    show: true },
          { key: 'tasks',     label: 'Tasks',     Icon: ListTodo,        stale: false,         onOpen: () => {},                    show: canCollaborate },
          { key: 'documents', label: 'Documents', Icon: FileCheck,       stale: docsStale,     onOpen: () => setDocsStale(false),   show: true },
          { key: 'ncr',       label: 'Issues & Actions', Icon: AlertTriangle, stale: ncrStale, onOpen: () => setNcrStale(false), show: true },
          { key: 'members',   label: 'Members',   Icon: Users,           stale: false,         onOpen: () => {},                    show: canManageWs },
          { key: 'activity',  label: 'Activity',  Icon: Activity,        stale: false,         onOpen: () => {},                    show: true },
        ] as Array<{ key: WorkspaceTab; label: string; Icon: React.ElementType; stale: boolean; onOpen: () => void; show: boolean }>)
        .filter((t) => t.show)
        .map(({ key, label, Icon, stale, onOpen }) => (
          <button key={key} type="button" onClick={() => { setActiveTab(key); onOpen(); }}
            className="flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm -mb-px transition-colors"
            style={{
              borderColor: activeTab === key ? 'var(--accent-primary)' : 'transparent',
              color:       activeTab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight:  activeTab === key ? 600 : 400,
            }}>
            <Icon className="h-4 w-4" />{label}
            {stale && activeTab !== key && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">

            {/* Stale banner */}
            {overviewStale && !overviewLoading && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                <span className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                  Workspace data has changed since last load.
                </span>
                <button type="button" onClick={() => void loadOverview()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  <RefreshCw className="h-3.5 w-3.5" />Refresh
                </button>
              </div>
            )}

            {overviewLoading && !overview ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
              </div>
            ) : overview ? (
              <>
                {/* ── Needs Attention ────────────────────────────────────── */}
                {(() => {
                  const issues: Array<{ label: string; count: number; tab: WorkspaceTab; color: string }> = [
                    ...(overview.work.overdue > 0 ? [{ label: `${overview.work.overdue} overdue task${overview.work.overdue > 1 ? 's' : ''}`, count: overview.work.overdue, tab: 'tasks' as WorkspaceTab, color: 'var(--state-error)' }] : []),
                    ...(overview.documents.underReview > 0 ? [{ label: `${overview.documents.underReview} document${overview.documents.underReview > 1 ? 's' : ''} under review`, count: overview.documents.underReview, tab: 'documents' as WorkspaceTab, color: 'var(--state-warning)' }] : []),
                    ...(overview.documents.rejected > 0 ? [{ label: `${overview.documents.rejected} rejected document${overview.documents.rejected > 1 ? 's' : ''}`, count: overview.documents.rejected, tab: 'documents' as WorkspaceTab, color: 'var(--state-error)' }] : []),
                    ...(overview.ncrCapa.open > 0 ? [{ label: `${overview.ncrCapa.open} open issue${overview.ncrCapa.open > 1 ? 's' : ''}`, count: overview.ncrCapa.open, tab: 'ncr' as WorkspaceTab, color: 'var(--state-error)' }] : []),
                    ...(overview.ncrCapa.overdue > 0 ? [{ label: `${overview.ncrCapa.overdue} overdue issue${overview.ncrCapa.overdue > 1 ? 's' : ''}`, count: overview.ncrCapa.overdue, tab: 'ncr' as WorkspaceTab, color: 'var(--state-error)' }] : []),
                  ];
                  return (
                    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                      <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" style={{ color: issues.length > 0 ? 'var(--state-error)' : 'var(--state-success)' }} />
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Needs Attention</p>
                      </div>
                      {issues.length === 0 ? (
                        <div className="flex items-center gap-2 py-1">
                          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--state-success)' }} />
                          <span className="text-sm" style={{ color: 'var(--state-success)' }}>No urgent issues in this workspace.</span>
                        </div>
                      ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {issues.map((issue, i) => (
                            <div key={i} className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: issue.color }} />
                                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{issue.label}</span>
                              </div>
                              <button type="button" onClick={() => setActiveTab(issue.tab)}
                                className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                                Review →
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── My Work ───────────────────────────────────────────── */}
                {overview.myWork && (overview.myWork.openTasks > 0 || overview.myWork.overdueTasks > 0) && (
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                    <div className="mb-3 flex items-center gap-2">
                      <UserCircle className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Work in This Workspace</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {overview.myWork.openTasks > 0 && (
                        <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('mine'); }}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}>
                          <CheckSquare className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                          <div>
                            <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{overview.myWork.openTasks}</span>
                            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>open task{overview.myWork.openTasks > 1 ? 's' : ''}</span>
                          </div>
                        </button>
                      )}
                      {overview.myWork.overdueTasks > 0 && (
                        <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('overdue'); }}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
                          style={{ borderColor: 'var(--state-error)', backgroundColor: 'var(--state-error-soft)' }}>
                          <Clock className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--state-error)' }} />
                          <div>
                            <span className="block text-sm font-semibold" style={{ color: 'var(--state-error)' }}>{overview.myWork.overdueTasks}</span>
                            <span className="block text-xs" style={{ color: 'var(--state-error)' }}>overdue</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── KPI grid ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Tasks */}
                  <SummaryCard title="Task Summary" accent="var(--accent-primary)">
                    {overview.work.open === 0 && overview.work.completed === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No tasks yet. Create tasks to track work.</div>
                    ) : (
                      <>
                        <KpiRow label="Open"      value={overview.work.open} />
                        <KpiRow label="Overdue"   value={overview.work.overdue} color={overview.work.overdue > 0 ? 'var(--state-error)' : undefined} />
                        <KpiRow label="Completed" value={overview.work.completed} color="var(--state-success)" />
                        {overview.myWork && overview.myWork.openTasks > 0 && (
                          <KpiRow label="Assigned to me" value={overview.myWork.openTasks} color="var(--accent-primary)" />
                        )}
                      </>
                    )}
                    <button type="button" onClick={() => setActiveTab('tasks')}
                      className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                      View Tasks →
                    </button>
                  </SummaryCard>

                  {/* Documents */}
                  <SummaryCard title="Documents" accent="var(--accent-primary)">
                    {overview.documents.total === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No documents uploaded yet. Upload controlled documents to track status.</div>
                    ) : (
                      <>
                        <KpiRow label="Total"        value={overview.documents.total} />
                        <KpiRow label="✓ Approved"   value={overview.documents.approved}   color="var(--state-success)" />
                        <KpiRow label="⟳ Under Review" value={overview.documents.underReview} color={overview.documents.underReview > 0 ? 'var(--state-warning)' : undefined} />
                        {overview.documents.rejected > 0 && (
                          <KpiRow label="✗ Rejected" value={overview.documents.rejected} color="var(--state-error)" />
                        )}
                      </>
                    )}
                    <button type="button" onClick={() => setActiveTab('documents')}
                      className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                      View Documents →
                    </button>
                  </SummaryCard>

                  {/* Issues & Actions */}
                  <SummaryCard title="Issues & Actions" accent="var(--state-error)">
                    {overview.ncrCapa.open === 0 && overview.ncrCapa.closed === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No issues raised yet.</div>
                    ) : (
                      <>
                        <KpiRow label="Open"    value={overview.ncrCapa.open}    color={overview.ncrCapa.open > 0 ? 'var(--state-error)' : undefined} />
                        <KpiRow label="Overdue" value={overview.ncrCapa.overdue} color={overview.ncrCapa.overdue > 0 ? 'var(--state-error)' : undefined} />
                        <KpiRow label="✓ Closed" value={overview.ncrCapa.closed} color="var(--state-success)" />
                      </>
                    )}
                    <button type="button" onClick={() => setActiveTab('ncr')}
                      className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                      View Issues →
                    </button>
                  </SummaryCard>

                  {/* Team (Part 6) */}
                  <SummaryCard title="Team" accent="var(--text-muted)">
                    <div className="mb-3 flex items-end gap-2">
                      <span className="text-3xl font-bold" style={{ color: overview.members === 0 ? 'var(--state-warning)' : 'var(--text-primary)' }}>{overview.members}</span>
                      <span className="pb-1 text-xs" style={{ color: 'var(--text-muted)' }}>members</span>
                    </div>
                    {/* Member preview: up to 5 members */}
                    {overview.memberPreview && overview.memberPreview.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {overview.memberPreview.map((m) => (
                          <div key={m.id} className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: 'var(--accent-primary)' }}>
                              {m.user.fullName.charAt(0).toUpperCase()}
                            </span>
                            <span className="flex-1 truncate text-xs" style={{ color: 'var(--text-primary)' }}>{m.user.fullName}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ROLE_LABELS[m.roleInWorkspace] ?? m.roleInWorkspace}</span>
                          </div>
                        ))}
                        {overview.members > 5 && (
                          <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                            +{overview.members - 5} more
                          </p>
                        )}
                      </div>
                    )}
                    {overview.members === 0 ? (
                      <button type="button" onClick={() => setActiveTab('members')}
                        className="w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)' }}>
                        No members added — Add Members →
                      </button>
                    ) : canManageWs ? (
                      <button type="button" onClick={() => setActiveTab('members')}
                        className="w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                        Manage Members →
                      </button>
                    ) : (
                      <button type="button" onClick={() => setActiveTab('members')}
                        className="w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                        View Team →
                      </button>
                    )}
                  </SummaryCard>
                </div>

                {/* Recent Activity (Part 7) */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
                    <button type="button" onClick={() => setActiveTab('activity')}
                      className="text-xs" style={{ color: 'var(--accent-primary)' }}>
                      View all →
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                    {overview.recentActivity.length === 0 ? (
                      <div className="flex items-center gap-3 px-4 py-6">
                        <Activity className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity yet in this workspace.</p>
                      </div>
                    ) : (
                      overview.recentActivity.map((entry, i) => {
                        const actor = entry.actor?.fullName ?? 'System';
                        const entity = ENTITY_LABELS[entry.entityType] ?? entry.entityType;
                        const titlePart = entry.entityTitle
                          ? ` "${entry.entityTitle.replace(/\[SAMPLE\]\s*/g, '')}"`
                          : '';
                        const verb: Record<string, string> = {
                          CREATE: 'created', CREATED: 'created',
                          UPDATE: 'updated', UPDATED: 'updated',
                          DELETE: 'deleted', DELETED: 'deleted',
                          APPROVE: 'approved', APPROVED: 'approved',
                          REJECT: 'rejected', REJECTED: 'rejected',
                          SUBMITTED: 'submitted evidence for',
                          VERIFIED: 'verified',
                          CLOSED: 'closed',
                          UPLOADED: 'uploaded',
                          DOWNLOADED: 'downloaded',
                          MEMBER_ADDED: 'added a member to',
                          MEMBER_REMOVED: 'removed a member from',
                        };
                        const actionText = verb[entry.action] ?? entry.action.toLowerCase().replace(/_/g, ' ');
                        return (
                          <div key={entry.id} className="flex items-start gap-3 px-4 py-3"
                            style={{ borderBottom: i < overview.recentActivity.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                            <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }}>
                              <EntityIcon type={entry.entityType} />
                            </span>
                            <p className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                              <span className="font-medium">{actor}</span>
                              {' '}<span style={{ color: 'var(--text-muted)' }}>{actionText}</span>
                              {' '}<span style={{ color: 'var(--text-muted)' }}>{entity.toLowerCase()}</span>
                              {titlePart && <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{titlePart}</span>}
                            </p>
                            <span className="flex-shrink-0 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                              {relativeTime(entry.createdAt)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick links */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { label: 'Tasks',     Icon: ListTodo,      act: () => setActiveTab('tasks'),     show: canCollaborate },
                      { label: 'Documents', Icon: FileCheck,     act: () => setActiveTab('documents'), show: true },
                      { label: 'Issues & Actions', Icon: AlertTriangle, act: () => setActiveTab('ncr'), show: true },
                      { label: 'Members',   Icon: Users,         act: () => setActiveTab('members'),   show: canManageWs },
                    ] as Array<{ label: string; Icon: React.ElementType; act: () => void; show: boolean }>)
                    .filter((l) => l.show)
                    .map(({ label, Icon, act }) => (
                      <button key={label} type="button" onClick={act}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                        <Icon className="h-4 w-4" />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : !overviewLoading ? (
              <div className="flex justify-center py-16">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No overview data available.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── MEMBERS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Workspace Members
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({members.length})</span>
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add users here to give them access to this workspace. Staff and auditors must be added explicitly.
                </p>
                {workspace.visibility === 'PRIVATE' && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Private workspace — only listed members can access this workspace and its content.
                  </p>
                )}
                {workspace.visibility === 'DEPARTMENT' && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Department workspace — members of the {workspace.department?.name ?? 'linked department'} and listed members have access.
                  </p>
                )}
              </div>
              {canManageMembers && (
                <button type="button" onClick={() => setShowAddMember(true)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  <Plus className="h-4 w-4" /> Add Member
                </button>
              )}
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12" style={{ color: 'var(--text-muted)' }}>
                <Users className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm">No members yet. Add team members to collaborate.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                      {['Member', 'Department', 'System Role', 'Workspace Role', ''].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: 'var(--accent-primary)' }}>
                              {m.user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.user.fullName}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {m.user.department?.name ?? <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {m.user.userRoles.length === 0
                              ? <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>—</span>
                              : m.user.userRoles.slice(0, 2).map((ur) => (
                                <span key={ur.role.name} className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                                  {ur.role.displayName}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {canManageMembers && m.roleInWorkspace !== 'OWNER' ? (
                            <select
                              value={m.roleInWorkspace}
                              disabled={roleChangeLoading === m.id}
                              onChange={(e) => void handleChangeRole(m.id, e.target.value)}
                              className="rounded-lg border px-2 py-1 text-xs"
                              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                              <option value="VIEWER">Viewer</option>
                              <option value="MEMBER">Member</option>
                              <option value="MANAGER">Manager</option>
                            </select>
                          ) : (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                              {ROLE_LABELS[m.roleInWorkspace] ?? m.roleInWorkspace}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" title="Copy email" onClick={() => { void navigator.clipboard.writeText(m.user.email); showToast('Email copied'); }}
                              className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            {canManageMembers && m.roleInWorkspace !== 'OWNER' && (
                              <button type="button" title="Remove member" onClick={() => void handleRemoveMember(m.id)}
                                className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Member modal */}
            {showAddMember && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <div className="w-full max-w-md rounded-xl border shadow-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Add Workspace Member</h3>
                    <button type="button" onClick={() => setShowAddMember(false)} style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
                  </div>
                  <form onSubmit={(e) => void handleAddMember(e)} className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>User *</label>
                      <select required value={addUserId} onChange={(e) => setAddUserId(e.target.value)}
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                        <option value="">Select a user…</option>
                        {allUsers.filter((u) => !members.some((m) => m.user.id === u.id))
                          .map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Role in Workspace</label>
                      <select value={addRoleInWs} onChange={(e) => setAddRoleInWs(e.target.value)}
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                        <option value="VIEWER">Viewer</option>
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                      </select>
                    </div>
                    {/* Permission preview */}
                    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Access Preview — {ROLE_LABELS[addRoleInWs] ?? addRoleInWs}
                      </p>
                      {addRoleInWs === 'VIEWER' && (
                        <ul className="space-y-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li>• Read-only access to workspace content</li>
                          <li>• Can view tasks, pages, documents, and evidence</li>
                          <li>• Cannot create, edit, upload, or submit anything</li>
                          <li>• Cannot manage members</li>
                        </ul>
                      )}
                      {addRoleInWs === 'MEMBER' && (
                        <ul className="space-y-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li>• Can work on assigned tasks and submit evidence</li>
                          <li>• Can create tasks, comments, and upload files</li>
                          <li>• Cannot approve or reject (controlled by system role)</li>
                          <li>• Cannot manage workspace members</li>
                        </ul>
                      )}
                      {addRoleInWs === 'MANAGER' && (
                        <ul className="space-y-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li>• Can manage workspace work and members</li>
                          <li>• Can organise tasks, pages, and add/remove members</li>
                          <li>• Can pin items and set workspace home page</li>
                          <li>• Cannot delete the workspace</li>
                        </ul>
                      )}
                      {addRoleInWs === 'OWNER' && (
                        <ul className="space-y-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li>• Full workspace control</li>
                          <li>• Can delete the workspace and all its content</li>
                          <li>• Can transfer ownership and manage all members</li>
                        </ul>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={() => setShowAddMember(false)}
                        className="rounded-lg border px-4 py-1.5 text-sm"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                      <button type="submit" disabled={addMemberLoading}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                        style={{ backgroundColor: 'var(--accent-primary)' }}>
                        {addMemberLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Add Member
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="flex flex-1 overflow-hidden">
          <WorkspaceDocumentsTab
            workspaceId={workspaceId}
            workspaceName={workspace.name}
            refreshKey={docsRefreshKey}
            canCollaborate={canCollaborate}
          />
        </div>
      )}

      {/* ── NCR/CAPA TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'ncr' && (
        <div className="flex flex-1 overflow-hidden">
          <WorkspaceNcrTab
            workspaceId={workspaceId}
            workspaceName={workspace.name}
            refreshKey={ncrRefreshKey}
            canCollaborate={canCollaborate}
          />
        </div>
      )}

      {/* ── ACTIVITY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workspace Activity</h2>
              <button type="button" onClick={() => void loadActivity()}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                <RefreshCw className="h-3.5 w-3.5" />Refresh
              </button>
            </div>

            {activityLoading && activity.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Activity className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity recorded yet for this workspace.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                {activity.map((entry, i) => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3"
                    style={{ borderBottom: i < activity.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                      <EntityIcon type={entry.entityType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        <span className="font-medium">{entry.actor?.fullName ?? 'System'}</span>
                        {' '}<span style={{ color: 'var(--text-muted)' }}>{(ACTION_LABELS[entry.action] ?? entry.action).toLowerCase()}</span>
                        {' '}{ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                        {entry.entityTitle ? <span className="font-medium"> &ldquo;{entry.entityTitle}&rdquo;</span> : null}
                      </p>
                      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                        {new Date(entry.createdAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}{relativeTime(entry.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                      {ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TASKS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Task list sidebar */}
          <aside className="flex w-56 flex-shrink-0 flex-col border-r"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Task Lists</span>
              {canManage && (
                <button type="button" onClick={() => setShowCreateList(true)} title="New Task List"
                  className="rounded p-0.5 transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
              {workspace.taskLists.length === 0 && (
                <p className="px-2 py-4 text-xs" style={{ color: 'var(--text-disabled)' }}>No lists yet</p>
              )}
              {workspace.taskLists.map((tl) => (
                <button key={tl.id} type="button" onClick={() => setSelectedListId(tl.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
                  style={{
                    backgroundColor: selectedListId === tl.id ? 'var(--accent-soft)' : 'transparent',
                    color: selectedListId === tl.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: selectedListId === tl.id ? '600' : '400',
                  }}
                  onMouseEnter={(e) => { if (selectedListId !== tl.id) e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
                  onMouseLeave={(e) => { if (selectedListId !== tl.id) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <ListTodo className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{tl.name}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{tl._count.tasks}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main task content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {!selectedListId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2">
                <ListTodo className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {workspace.taskLists.length === 0 ? 'Create a task list to get started' : 'Select a task list'}
                </p>
                {canManage && workspace.taskLists.length === 0 && (
                  <button type="button" onClick={() => setShowCreateList(true)}
                    className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--accent-primary)' }}>
                    <Plus className="h-4 w-4" /> New Task List
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Task list header */}
                <div className="flex items-center justify-between border-b px-6 py-3"
                  style={{ borderColor: 'var(--border-default)' }}>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedList?.name}</h2>
                    {selectedList?.description && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedList.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <button type="button" onClick={() => setShowCreateTask(true)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      style={{ backgroundColor: 'var(--accent-primary)' }}>
                      <Plus className="h-4 w-4" /> Add Task
                    </button>
                  )}
                </div>

                {/* Quick filters + search */}
                <div className="flex items-center gap-2 flex-wrap border-b px-4 py-2"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  {([
                    { key: 'all',          label: 'All' },
                    { key: 'mine',         label: 'My Tasks' },
                    { key: 'overdue',      label: 'Overdue' },
                    { key: 'unassigned',   label: 'Unassigned' },
                    { key: 'completed',    label: 'Completed' },
                    { key: 'high_priority',label: 'High Priority' },
                  ] as const).map((f) => {
                    const count = filterCount(f.key);
                    const active = taskFilter === f.key;
                    return (
                      <button key={f.key} type="button" onClick={() => setTaskFilter(f.key)}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                        style={{ backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-subtle)', color: active ? 'white' : 'var(--text-secondary)' }}>
                        {f.label}
                        {count > 0 && <span className="opacity-70">({count})</span>}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                    <Search className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Search tasks…" value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="w-28 bg-transparent text-[11px] outline-none"
                      style={{ color: 'var(--text-primary)' }} />
                    {taskSearch && (
                      <button type="button" onClick={() => setTaskSearch('')} style={{ color: 'var(--text-muted)' }}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Task table */}
                <div className="flex-1 overflow-y-auto">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16">
                      <CheckSquare className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {taskSearch || taskFilter !== 'all' ? 'No tasks match the current filter.' : 'No tasks in this list'}
                      </p>
                      {!taskSearch && taskFilter === 'all' && canManage && (
                        <button type="button" onClick={() => setShowCreateTask(true)}
                          className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                          style={{ backgroundColor: 'var(--accent-primary)' }}>
                          <Plus className="h-4 w-4" /> Add First Task
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                          {['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Sub', 'Cmts', ''].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((task) => (
                          <tr key={task.id} className="group cursor-pointer transition-colors"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onClick={() => setSelectedTaskId(task.id)}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)', maxWidth: '260px' }}>
                              <span className="line-clamp-1">{task.title}</span>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={task.status} size="xs" /></td>
                            <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {task.assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                    style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                    {task.assignee.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate" style={{ maxWidth: '90px' }}>{task.assignee.fullName}</span>
                                </div>
                              ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs"
                              style={{ color: task.dueDate ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
                              {formatDate(task.dueDate)}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {task._count.subtasks > 0 ? task._count.subtasks : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {task._count.comments > 0 ? task._count.comments : '—'}
                            </td>

                            {/* Three-dot menu */}
                            <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block" ref={openMenuId === task.id ? menuRef : null}>
                                <button type="button"
                                  onClick={() => setOpenMenuId((prev) => prev === task.id ? null : task.id)}
                                  className="rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--text-muted)' }} title="Task actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {openMenuId === task.id && (
                                  <div className="absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl shadow-lg"
                                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '170px' }}>
                                    {[
                                      { icon: Eye,          label: 'Open task',    action: () => { setSelectedTaskId(task.id); setOpenMenuId(null); }, del: false },
                                      { icon: ClipboardCopy,label: 'Copy link',    action: () => copyTaskLink(task.id), del: false },
                                      { icon: Copy,         label: 'Duplicate',    action: () => void handleDuplicate(task.id), del: false },
                                      ...(otherLists.length > 0 ? [{ icon: Move, label: 'Move to list…', action: () => { setMoveTaskId(task.id); setMoveTargetListId(otherLists[0]?.id ?? ''); setOpenMenuId(null); }, del: false }] : []),
                                      ...(canDeleteTask ? [{ icon: Trash2, label: 'Delete task', action: () => void handleDeleteTask(task.id), del: true }] : []),
                                    ].map(({ icon: Icon, label, action, del }) => (
                                      <button key={label} type="button" onClick={action}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                        style={{ color: del ? 'var(--state-error)' : 'var(--text-primary)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = del ? 'var(--state-error-soft)' : 'var(--bg-subtle)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Inline add task */}
                      {canManage && (
                        <tfoot>
                          <tr style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <td colSpan={8} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {addingInline
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                                  : <Plus className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} />}
                                <input type="text" placeholder="Add a task…" value={inlineTitle}
                                  disabled={addingInline}
                                  onChange={(e) => setInlineTitle(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') void handleInlineAddTask(); }}
                                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-disabled)]"
                                  style={{ color: 'var(--text-primary)' }} />
                                {inlineTitle && (
                                  <button type="button" onClick={() => setInlineTitle('')} style={{ color: 'var(--text-muted)' }}>
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {showCreateList && (
        <CreateTaskListModal workspaceId={workspaceId} onClose={() => setShowCreateList(false)}
          onCreated={(tl) => {
            setWorkspace((prev) => prev ? { ...prev, taskLists: [...prev.taskLists, tl] } : null);
            setSelectedListId(tl.id);
            setShowCreateList(false);
          }} />
      )}

      {showCreateTask && selectedListId && (
        <CreateTaskModal workspaceId={workspaceId} taskListId={selectedListId}
          onClose={() => setShowCreateTask(false)}
          onCreated={(task) => {
            setTasks((prev) => [...prev, task]);
            setWorkspace((prev) => {
              if (!prev) return null;
              return { ...prev, taskLists: prev.taskLists.map((tl) => tl.id === selectedListId ? { ...tl, _count: { tasks: tl._count.tasks + 1 } } : tl) };
            });
            setShowCreateTask(false);
          }} />
      )}

      {/* Move task modal */}
      {moveTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Move Task to List</h3>
              <button type="button" onClick={() => setMoveTaskId(null)} style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
            </div>
            <select value={moveTargetListId} onChange={(e) => setMoveTargetListId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm mb-4"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
              {otherLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMoveTaskId(null)}
                className="rounded-lg border px-4 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button type="button" disabled={moveLoading || !moveTargetListId} onClick={() => void handleMoveTask()}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                {moveLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Move
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={(updated) => { setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))); }}
          onDeleted={() => { setTasks((prev) => prev.filter((t) => t.id !== selectedTaskId)); setSelectedTaskId(null); }}
          externalUpdateKey={taskUpdateKeys[selectedTaskId] ?? 0}
          linkedRecordsUpdateKey={linkedRecordsUpdateKeys[selectedTaskId] ?? 0} />
      )}
    </div>
  );
}
