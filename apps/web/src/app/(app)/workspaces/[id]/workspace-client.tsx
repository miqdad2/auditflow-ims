'use client';

import { useState, useEffect, useCallback, useMemo, useRef, use } from 'react';
import {
  Plus, Loader2, ArrowLeft, ListTodo, CheckSquare, FileText, Users,
  Trash2, X, MoreHorizontal, Copy, ClipboardCopy, Move, Eye,
  Activity, LayoutDashboard, ChevronDown, ChevronUp, ChevronsUp, ChevronsDown,
  Search, Lock, Globe, Building2,
  AlertTriangle, AlertCircle, CheckCircle2, Clock, FileCheck, RefreshCw,
  ShieldAlert, Wifi, WifiOff, UserCircle, TrendingUp, Pencil, Settings,
  MessageSquare, GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPostAuth, apiPatchAuth, apiDeleteAuth, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWorkspaceSocket, useSocket } from '@/lib/socket-provider';
import { useToast } from '@/lib/toast-provider';
import { StatusBadge, PriorityBadge, WorkspaceOpStatusBadge } from '@/components/status-badge';
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
type TaskFilter = 'all' | 'mine' | 'overdue' | 'unassigned' | 'waiting_review' | 'returned' | 'reference' | 'completed' | 'pending_approval';

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
  DOCUMENT: 'Document', NCR_CAPA: 'Issue', FILE_ATTACHMENT: 'File',
};

function EntityIcon({ type }: { type: string }) {
  const cls = 'h-3.5 w-3.5 flex-shrink-0';
  if (type === 'PROJECT') return <Building2 className={cls} />;
  if (type === 'TASK') return <CheckSquare className={cls} />;
  if (type === 'PAGE') return <FileText className={cls} />;
  if (type === 'DOCUMENT') return <FileCheck className={cls} />;
  if (type === 'NCR_CAPA') return <AlertTriangle className={cls} />;
  if (type === 'FILE_ATTACHMENT') return <FileText className={cls} />;
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

/** Format a UTC ISO string for Kuwait time (UTC+3, no DST) for tooltip display. */
function formatKuwaitTooltip(iso: string | null | undefined): string {
  if (!iso) return 'Not available';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Asia/Kuwait',
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
}

/** Kuwait date: "23 Jun 2026" */
function formatKuwaitDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kuwait',
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

/** Kuwait time: "12:42 PM" */
function formatKuwaitTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kuwait',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
}

type TaskSort = 'manual' | 'newest-created' | 'oldest-created' | 'recently-updated' | 'oldest-updated';

export interface WorkspaceClientProps { params: Promise<{ id: string }>; }

export default function WorkspaceDetailClient({ params }: WorkspaceClientProps) {
  const { id: workspaceId } = use(params);
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL-driven task open: ?task=:taskId&fileId=:attachmentId
  const urlTaskId  = searchParams.get('task');
  const urlFileId  = searchParams.get('fileId');
  // URL-driven Issues & Actions tab: ?ncr=:id (from notification deep-link)
  const urlNcrId   = searchParams.get('ncr');

  // Core
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Tasks
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [tasks, setTasks]           = useState<TaskSummary[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError]     = useState('');
  // Default filter: My Tasks for non-elevated/non-manager users (Part 25); managers/elevated default to All
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all'); // adjusted after auth loads
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSort, setTaskSort]     = useState<TaskSort>('manual');
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

  // Department assignment modal (for DEPARTMENT_NOT_ASSIGNED setup reason)
  const [showAssignDeptModal, setShowAssignDeptModal]     = useState(false);
  const [availableDepts, setAvailableDepts]               = useState<{id: string; name: string; code: string}[]>([]);
  const [selectedDeptId, setSelectedDeptId]               = useState('');
  const [assignDeptLoading, setAssignDeptLoading]         = useState(false);
  const [assignDeptError, setAssignDeptError]             = useState('');

  // Overview
  const [overview, setOverview]           = useState<WorkspaceOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewStale, setOverviewStale] = useState(false);

  // Activity
  const [activity, setActivity]           = useState<WorkspaceActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError]     = useState('');
  const [activityStale, setActivityStale]     = useState(false);
  const [activitySearch, setActivitySearch]         = useState('');
  const [activityEntityFilter, setActivityEntityFilter] = useState('');

  // Member search / filter
  const [memberSearch, setMemberSearch]         = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('');

  // Task-list rename
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameValue, setRenameValue]       = useState('');

  // Task-list context menu
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);

  // Delete confirmation modals (task + task list) — require typing "DELETE"
  const [deleteTaskModalId, setDeleteTaskModalId]       = useState<string | null>(null);
  const [deleteTaskConfirmText, setDeleteTaskConfirmText] = useState('');
  const [deleteTaskLoading, setDeleteTaskLoading]       = useState(false);
  const [deleteListModalId, setDeleteListModalId]       = useState<string | null>(null);
  const [deleteListConfirmText, setDeleteListConfirmText] = useState('');
  const [deleteListLoading, setDeleteListLoading]       = useState(false);

  // Quick Add dropdown
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddRef = useRef<HTMLDivElement | null>(null);

  // Workspace settings dropdown
  const [showWsSettings, setShowWsSettings] = useState(false);
  const wsSettingsRef = useRef<HTMLDivElement | null>(null);

  // Tab refresh keys and stale indicators
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [docsStale, setDocsStale]           = useState(false);
  const [ncrRefreshKey, setNcrRefreshKey]   = useState(0);
  const [ncrStale, setNcrStale]             = useState(false);

  // Debounced workspace refresh — keeps workspace.metrics and header chips fresh
  const wsRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline assignee dropdown (lazy-loaded eligible users, one fetch per workspace)
  interface EligibleUser { id: string; fullName: string; email: string; department: { id: string; name: string } | null; roleInWorkspace: string; }
  const [eligibleUsers, setEligibleUsers]       = useState<EligibleUser[]>([]);
  const [eligibleUsersLoading, setEligibleUsersLoading] = useState(false);
  const [eligibleUsersError, setEligibleUsersError]     = useState('');
  const [openAssigneeDropdownId, setOpenAssigneeDropdownId] = useState<string | null>(null);
  const [assigneeUpdating, setAssigneeUpdating] = useState<Set<string>>(new Set());
  const [assigneeSearch, setAssigneeSearch]     = useState('');
  const assigneeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Local task list order (overrides workspace.taskLists for display after reorder)
  const [localListOrder, setLocalListOrder] = useState<string[] | null>(null);
  const [listReorderSaving, setListReorderSaving] = useState(false);
  // Task reorder
  const [taskReorderSaving, setTaskReorderSaving] = useState(false);
  // Drag-and-drop state
  const [dragTaskId, setDragTaskId]       = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Permissions — incorporate workspace-member role
  const myWsRole         = workspace?.myRole ?? null;
  const myWsAccess       = workspace?.myAccess ?? null;
  const isElevatedAccess = myWsAccess === 'elevated';
  const canCollaborate   = isElevatedAccess || ['OWNER', 'MANAGER', 'MEMBER'].includes(myWsRole ?? '');
  const canManageWs      = isElevatedAccess || ['OWNER', 'MANAGER'].includes(myWsRole ?? '');

  const isSuperAdmin     = (user?.roles as string[] | undefined)?.includes('SUPER_ADMIN') ?? false;
  const canManage        = (user?.permissions?.includes('project.create') ?? false) || canCollaborate;
  const canManageMembers = (user?.permissions?.includes('project.update') ?? false) || canManageWs;
  // Permanent deletion is SUPER_ADMIN only — backend enforces this; frontend mirrors for UX
  const canDeleteTask    = isSuperAdmin;
  // Inline assignee control: Super User/Admin or workspace Manager/Owner
  const canAssignTasks   = canManageWs || isElevatedAccess;

  // Fine-grained action permissions — used to show/hide UI controls accurately (Part 15-17, 19)
  // canCreateOfficialTask: elevated/manager path — task goes live immediately with full options
  const canCreateOfficialTask = (user?.permissions?.includes('tasks.create') ?? false) || isElevatedAccess || canManageWs;
  // canCreatePendingTask: workspace MEMBER path — task is created PENDING and goes live after approval
  const canCreatePendingTask  = myWsRole === 'MEMBER' && !isElevatedAccess;
  // canAddTask: combined gate for the Add Task button (both paths lead to same modal)
  const canAddTask             = canCreateOfficialTask || canCreatePendingTask;
  const canCreateTask          = canCreateOfficialTask; // retained for reference-items / task-list features
  const canCreateTaskList  = (user?.permissions?.includes('project.create') ?? false) || isElevatedAccess || canManageWs;
  const canUploadDocument  = (user?.permissions?.includes('documents.create') ?? false) || isElevatedAccess;
  const canCreateIssue     = (user?.permissions?.includes('ncr.create') ?? false) || isElevatedAccess;

  const { showToast } = useToast();
  const { connected, reconnecting } = useSocket();
  const [lastOverviewRefresh, setLastOverviewRefresh] = useState<Date | null>(null);
  const nowRef = useRef(new Date());
  // Highlighted file from expiry alert deep-link
  const [highlightedFileId, setHighlightedFileId] = useState<string | null>(urlFileId);
  // Whether we've already applied the URL task / NCR deep-link (to run only once)
  const urlTaskAppliedRef = useRef(false);
  const urlNcrAppliedRef  = useRef(false);

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

  useEffect(() => {
    if (!openListMenuId) return;
    const h = (e: MouseEvent) => {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target as Node)) setOpenListMenuId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openListMenuId]);

  useEffect(() => {
    if (!showWsSettings) return;
    const h = (e: MouseEvent) => {
      if (wsSettingsRef.current && !wsSettingsRef.current.contains(e.target as Node)) setShowWsSettings(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showWsSettings]);

  useEffect(() => {
    if (!openAssigneeDropdownId) return;
    const h = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setOpenAssigneeDropdownId(null);
        setAssigneeSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openAssigneeDropdownId]);

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
    setTasksError('');
    try {
      // Include workspaceId so the backend applies workspace-access checks (not the global STAFF filter).
      // Policy Option A: workspace members can see all tasks in the list; personal "My Tasks" filter
      // applied client-side as the default view.
      const data = await apiGet<TaskSummary[]>(
        `/tasks?workspaceId=${workspaceId}&taskListId=${selectedListId}`,
        token,
      );
      setTasks(data);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to load tasks.');
    }
    finally { setTasksLoading(false); }
  }, [token, workspaceId, selectedListId]);

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
    setActivityError('');
    setActivityStale(false);
    try {
      const data = await apiGet<WorkspaceActivityEntry[]>(`/workspaces/${workspaceId}/activity`, token);
      setActivity(data);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load activity.');
    }
    finally { setActivityLoading(false); }
  }, [token, workspaceId]);

  // Debounced workspace refresh — prevents N+1 on rapid events (spec Parts 10-12)
  const debouncedRefreshWorkspace = useCallback(() => {
    if (wsRefreshDebounceRef.current) clearTimeout(wsRefreshDebounceRef.current);
    wsRefreshDebounceRef.current = setTimeout(() => {
      void loadWorkspace();
      wsRefreshDebounceRef.current = null;
    }, 350);
  }, [loadWorkspace]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => { if (selectedListId) void loadTasks(); }, [loadTasks, selectedListId]);

  // Set default task filter based on role: Members default to "My Tasks"; elevated/managers default to "All".
  // Only set on initial workspace load (once workspace.myRole is known) and not when a URL deep-link overrides.
  useEffect(() => {
    if (!workspace) return;
    if (urlTaskId) return; // deep-link: keep 'all' so the specific task list is visible
    const defaultFilter = (!isElevatedAccess && myWsRole === 'MEMBER') ? 'mine' : 'all';
    setTaskFilter(defaultFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, isElevatedAccess, myWsRole]);

  // Auto-open task from URL deep-link (?task=:id&fileId=:id)
  useEffect(() => {
    if (!urlTaskId || !token || !workspace || urlTaskAppliedRef.current) return;
    urlTaskAppliedRef.current = true;
    setActiveTab('tasks');
    setSelectedTaskId(urlTaskId);
    if (urlFileId) setHighlightedFileId(urlFileId);
    // Resolve task's list so the left sidebar highlights correctly
    apiGet<{ taskListId: string }>(`/tasks/${urlTaskId}`, token)
      .then((task) => { if (task?.taskListId) setSelectedListId(task.taskListId); })
      .catch(() => {}); // graceful — task detail still opens even if list select fails
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, urlTaskId, token]);
  // Auto-switch to Issues tab from URL deep-link (?ncr=:id)
  useEffect(() => {
    if (!urlNcrId || !workspace || urlNcrAppliedRef.current) return;
    urlNcrAppliedRef.current = true;
    setActiveTab('ncr');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, urlNcrId]);

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

  // Reorder is only available when the full unfiltered manual-order list is visible
  const isReorderEnabled = canCollaborate && taskFilter === 'all' && !taskSearch.trim() && taskSort === 'manual';

  // ── Filtered tasks ────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    const now = nowRef.current;
    let list = tasks;
    if (taskFilter === 'mine')           list = list.filter((t) => t.assigneeId === user?.id);
    if (taskFilter === 'overdue')        list = list.filter((t) => !t.isReference && t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    if (taskFilter === 'unassigned')     list = list.filter((t) => !t.assigneeId);
    if (taskFilter === 'completed')      list = list.filter((t) => t.status === 'COMPLETED');
    if (taskFilter === 'waiting_review') list = list.filter((t) => t.status === 'WAITING_REVIEW');
    if (taskFilter === 'returned')       list = list.filter((t) => t.status === 'REJECTED');
    if (taskFilter === 'reference')        list = list.filter((t) => t.isReference === true);
    if (taskFilter === 'pending_approval') list = list.filter((t) => t.approvalStatus === 'PENDING');
    if (taskSearch.trim()) list = list.filter((t) => t.title.toLowerCase().includes(taskSearch.toLowerCase()));
    // Apply sort — manual = preserve sortOrder from backend
    if (taskSort === 'newest-created')   return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (taskSort === 'oldest-created')   return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (taskSort === 'recently-updated') return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (taskSort === 'oldest-updated')   return [...list].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    return list;
  }, [tasks, taskFilter, taskSearch, taskSort, user?.id]);

  function filterCount(f: TaskFilter) {
    const now = nowRef.current;
    if (f === 'mine')           return tasks.filter((t) => t.assigneeId === user?.id).length;
    if (f === 'overdue')        return tasks.filter((t) => !t.isReference && t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
    if (f === 'unassigned')     return tasks.filter((t) => !t.assigneeId).length;
    if (f === 'completed')      return tasks.filter((t) => t.status === 'COMPLETED').length;
    if (f === 'waiting_review') return tasks.filter((t) => t.status === 'WAITING_REVIEW').length;
    if (f === 'returned')       return tasks.filter((t) => t.status === 'REJECTED').length;
    if (f === 'reference')        return tasks.filter((t) => t.isReference === true).length;
    if (f === 'pending_approval') return tasks.filter((t) => t.approvalStatus === 'PENDING').length;
    return tasks.length;
  }

  // ── Socket handlers ───────────────────────────────────────────────────────────

  const socketHandlers = useMemo(() => ({
    'task.created': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId) {
        void loadTasks();
        setOverviewStale(true);
        setActivityStale(true); // new task may be relevant to current user
        debouncedRefreshWorkspace(); // refresh workspace.metrics for header + Task Summary
      }
    },
    'task.updated': (data: Record<string, unknown>) => {
      if (data.workspaceId !== workspaceId) return;
      const tid = data.id as string | undefined;
      const incomingUpdatedAt = data.updatedAt as string | undefined;
      const newStatus = data.newStatus as string | undefined;
      const completedAt = data.completedAt as string | null | undefined;
      // Apply status + timestamp directly to local state (stale-safe, avoids full refetch lag)
      if (tid && incomingUpdatedAt) {
        setTasks((prev) => prev.map((t) => {
          if (t.id !== tid) return t;
          if (t.updatedAt && incomingUpdatedAt <= t.updatedAt) return t; // stale-event protection
          return {
            ...t,
            updatedAt: incomingUpdatedAt,
            ...(newStatus ? { status: newStatus } : {}),
            ...(completedAt !== undefined ? { completedAt } : {}),
          };
        }));
      }
      void loadTasks(); // full refetch for other field changes
      setOverviewStale(true);
      setActivityStale(true); // task update may appear in activity feed
      debouncedRefreshWorkspace(); // keep header chips + Task Summary current
      if (tid && tid === selectedTaskId) setTaskUpdateKeys((p) => ({ ...p, [tid]: (p[tid] ?? 0) + 1 }));
    },
    'task.deleted': (data: Record<string, unknown>) => {
      if (data.workspaceId !== workspaceId) return;
      const tid = data.id as string | undefined;
      if (tid) setTasks((prev) => prev.filter((t) => t.id !== tid));
      if (tid === selectedTaskId) { setSelectedTaskId(null); showToast('This task was deleted by another user.'); }
      setOverviewStale(true);
      debouncedRefreshWorkspace();
    },
    'workspace.member.added': () => {
      void loadMembers();
      setOverviewStale(true);
      setActivityStale(true); // membership event may be relevant to current user
      debouncedRefreshWorkspace(); // operationalMembers chip needs refresh
      showToast('Workspace member added by another user');
    },
    'workspace.member.removed': () => {
      void loadMembers();
      setOverviewStale(true);
      setActivityStale(true);
      debouncedRefreshWorkspace();
      showToast('Workspace member removed by another user');
    },
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
    'attachment.created': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId || !data.workspaceId) {
        setOverviewStale(true);
        setActivityStale(true); // file upload on assigned task appears in activity
        debouncedRefreshWorkspace(); // expiry data may change workspace status
        showToast('Attachment added by another user');
      }
    },
    'attachment.updated': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId || !data.workspaceId) {
        setOverviewStale(true);
        setActivityStale(true);
        debouncedRefreshWorkspace(); // renewal may remove CRITICAL status
      }
    },
    'attachment.deleted': () => showToast('Attachment removed by another user'),
    'document.created': () => { setOverviewStale(true); setDocsRefreshKey((k) => k + 1); setDocsStale(true); debouncedRefreshWorkspace(); showToast('A new document was uploaded by another user'); },
    'document.updated': () => { setOverviewStale(true); setDocsRefreshKey((k) => k + 1); setDocsStale(true); debouncedRefreshWorkspace(); },
    'evidence.updated': () => { setOverviewStale(true); },
    'ncr.created': () => { setOverviewStale(true); setNcrRefreshKey((k) => k + 1); setNcrStale(true); debouncedRefreshWorkspace(); showToast('A new issue was raised by another user'); },
    'ncr.updated': () => { setOverviewStale(true); setNcrRefreshKey((k) => k + 1); setNcrStale(true); debouncedRefreshWorkspace(); },
    'task.moved': (data: Record<string, unknown>) => {
      if (data.workspaceId === workspaceId) { void loadTasks(); setOverviewStale(true); debouncedRefreshWorkspace(); }
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
    // Reorder events: reload workspace to get updated sort orders, then reset local override
    'task_list.reordered': () => {
      setLocalListOrder(null); // clear local override so fresh workspace data takes effect
      void loadWorkspace();
    },
    'task.reordered': (data: Record<string, unknown>) => {
      // If the reordered list is the currently selected one, reload tasks
      if ((data.taskListId as string | undefined) === selectedListId) {
        void loadTasks();
      }
    },
  }), [workspaceId, selectedTaskId, selectedListId, loadTasks, loadMembers, loadWorkspace, debouncedRefreshWorkspace, showToast, router]);

  useWorkspaceSocket(workspaceId, socketHandlers, () => {
    // On socket reconnect: if on overview tab, refresh immediately; otherwise mark stale
    if (activeTab === 'overview') void loadOverview();
    else setOverviewStale(true);
  });

  // ── Actions ───────────────────────────────────────────────────────────────────

  async function handleDuplicate(taskId: string) {
    if (!token) return;
    setOpenMenuId(null);
    try {
      const copy = await apiPostAuth<TaskSummary>(`/tasks/${taskId}/duplicate`, {}, token);
      setTasks((prev) => [...prev, copy]);
      showToast('Task duplicated');
    } catch { showToast('Failed to duplicate task'); }
  }

  function handleDeleteTask(taskId: string) {
    setOpenMenuId(null);
    setDeleteTaskModalId(taskId);
    setDeleteTaskConfirmText('');
  }

  async function handleConfirmDeleteTask() {
    if (!token || !deleteTaskModalId || deleteTaskConfirmText !== 'DELETE') return;
    setDeleteTaskLoading(true);
    try {
      await apiDeleteAuth(`/tasks/${deleteTaskModalId}`, token);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTaskModalId));
      if (selectedTaskId === deleteTaskModalId) setSelectedTaskId(null);
      showToast('Task permanently deleted');
      setDeleteTaskModalId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeleteTaskLoading(false);
    }
  }

  function handleDeleteTaskList(listId: string) {
    setOpenListMenuId(null);
    setDeleteListModalId(listId);
    setDeleteListConfirmText('');
  }

  async function handleConfirmDeleteTaskList() {
    if (!token || !deleteListModalId || deleteListConfirmText !== 'DELETE') return;
    setDeleteListLoading(true);
    try {
      await apiDeleteAuth(`/task-lists/${deleteListModalId}`, token);
      setWorkspace((prev) => prev ? {
        ...prev,
        taskLists: prev.taskLists.filter((l) => l.id !== deleteListModalId),
      } : prev);
      if (selectedListId === deleteListModalId) setSelectedListId(null);
      showToast('Task list permanently deleted');
      setDeleteListModalId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete task list');
    } finally {
      setDeleteListLoading(false);
    }
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

  async function loadEligibleUsers() {
    if (!token || eligibleUsers.length > 0 || eligibleUsersLoading) return;
    setEligibleUsersLoading(true);
    setEligibleUsersError('');
    try {
      const data = await apiGet<Array<{ id: string; fullName: string; email: string; department: { id: string; name: string } | null; roleInWorkspace: string }>>(`/workspaces/${workspaceId}/members/eligible`, token);
      setEligibleUsers(data);
    } catch {
      setEligibleUsersError('Unable to load eligible users. Retry.');
    } finally {
      setEligibleUsersLoading(false);
    }
  }

  async function handleInlineAssign(taskId: string, newAssigneeId: string | null) {
    if (!token || assigneeUpdating.has(taskId)) return;
    // Confirm unassign for in-progress/waiting-review tasks
    if (newAssigneeId === null) {
      const t = tasks.find((t) => t.id === taskId);
      if (t && ['IN_PROGRESS', 'WAITING_REVIEW'].includes(t.status)) {
        if (!confirm('Unassign this task?\n\nThe task will remain open and appear in the Unassigned queue.')) return;
      }
    }
    setAssigneeUpdating((prev) => new Set([...prev, taskId]));
    setOpenAssigneeDropdownId(null);
    setAssigneeSearch('');
    try {
      const updated = await apiPatchAuth<TaskSummary>(`/tasks/${taskId}`, { assigneeId: newAssigneeId }, token);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      debouncedRefreshWorkspace();
      if (newAssigneeId === null) {
        showToast('Task unassigned.');
      } else {
        const eu = eligibleUsers.find((u) => u.id === newAssigneeId);
        showToast(`Task assigned to ${eu?.fullName ?? 'user'}.`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showToast('This task was updated by another user. Refresh before assigning.');
      } else {
        showToast(err instanceof Error ? err.message : 'The task could not be assigned. No changes were saved.');
      }
    } finally {
      setAssigneeUpdating((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
    }
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
    if (!token) return;

    // Check active-task impact before prompting
    let impactMsg = 'Remove this member from the workspace?\n\nThis will revoke their access to all tasks, documents, and issues in this workspace.';
    let taskHandling: 'leave-unassigned' | undefined;
    try {
      const impact = await apiGet<{ activeTaskCount: number; userFullName: string }>(
        `/workspaces/${workspaceId}/members/${memberId}/impact`, token);
      if (impact.activeTaskCount > 0) {
        const decision = confirm(
          `Remove ${impact.userFullName} from the workspace?\n\n` +
          `⚠ Warning: This member has ${impact.activeTaskCount} active assigned task(s).\n\n` +
          `These tasks will be left unassigned if you proceed.\n\n` +
          `Click OK to remove and leave tasks unassigned.\nClick Cancel to keep this member.`
        );
        if (!decision) return;
        taskHandling = 'leave-unassigned';
      } else {
        if (!confirm(impactMsg)) return;
      }
    } catch {
      if (!confirm(impactMsg)) return;
    }

    try {
      const url = taskHandling
        ? `/workspaces/${workspaceId}/members/${memberId}?taskHandling=${taskHandling}`
        : `/workspaces/${workspaceId}/members/${memberId}`;
      const result = await apiDeleteAuth<{ success: boolean; activeTasksUnassigned: number }>(url, token);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast(result.activeTasksUnassigned > 0
        ? `Member removed — ${result.activeTasksUnassigned} task(s) left unassigned`
        : 'Member removed');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to remove member'); }
  }

  async function handleAssignDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedDeptId) return;
    setAssignDeptLoading(true);
    setAssignDeptError('');
    try {
      const updated = await apiPatchAuth<WorkspaceDetail>(`/workspaces/${workspaceId}`, { departmentId: selectedDeptId }, token);
      setWorkspace((prev) => prev ? { ...prev, departmentId: updated.departmentId, department: updated.department, operationalStatus: updated.operationalStatus, operationalStatusLabel: updated.operationalStatusLabel, operationalReasons: updated.operationalReasons, metrics: updated.metrics } : null);
      setShowAssignDeptModal(false);
      showToast('Department assigned successfully');
      // Refresh overview and workspace summary
      void loadOverview();
      debouncedRefreshWorkspace();
    } catch (err) {
      setAssignDeptError(err instanceof Error ? err.message : 'Failed to assign department.');
    } finally {
      setAssignDeptLoading(false);
    }
  }

  async function handleRenameList() {
    if (!token || !renamingListId || !renameValue.trim()) return;
    const trimmedName = renameValue.trim();
    try {
      const updated = await apiPatchAuth<TaskListSummary>(`/task-lists/${renamingListId}`, { name: trimmedName }, token);
      setWorkspace((prev) => prev ? {
        ...prev,
        taskLists: prev.taskLists.map((tl) => tl.id === renamingListId ? { ...tl, name: updated.name } : tl),
      } : null);
      setRenamingListId(null);
      setRenameValue('');
      showToast('Task list renamed');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to rename task list');
    }
  }

  // ── Reorder helpers ──────────────────────────────────────────────────────

  // Get the currently displayed task list order (local override or workspace order)
  const displayedTaskLists = workspace
    ? (localListOrder
        ? localListOrder.map((id) => workspace.taskLists.find((tl) => tl.id === id)!).filter(Boolean)
        : workspace.taskLists)
    : [];

  async function moveListUp(listId: string) {
    if (!token || !workspace) return;
    const order = displayedTaskLists.map((tl) => tl.id);
    const idx = order.indexOf(listId);
    if (idx <= 0) return;
    const newOrder = [...order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setLocalListOrder(newOrder);
    setListReorderSaving(true);
    try {
      await apiPatchAuth(`/workspaces/${workspaceId}/task-lists/reorder`, { orderedIds: newOrder }, token);
    } catch { setLocalListOrder(null); showToast('Failed to save list order'); }
    finally { setListReorderSaving(false); }
  }

  async function moveListDown(listId: string) {
    if (!token || !workspace) return;
    const order = displayedTaskLists.map((tl) => tl.id);
    const idx = order.indexOf(listId);
    if (idx < 0 || idx >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setLocalListOrder(newOrder);
    setListReorderSaving(true);
    try {
      await apiPatchAuth(`/workspaces/${workspaceId}/task-lists/reorder`, { orderedIds: newOrder }, token);
    } catch { setLocalListOrder(null); showToast('Failed to save list order'); }
    finally { setListReorderSaving(false); }
  }

  // ── Shared reorder function — all four actions + drag share this ─────────────

  async function performReorder(newTasks: typeof tasks) {
    if (!token || !selectedListId) return;
    const previousTasks = tasks;
    setTasks(newTasks);
    setTaskReorderSaving(true);
    try {
      await apiPatchAuth(
        `/task-lists/${selectedListId}/tasks/reorder`,
        { orderedIds: newTasks.map((t) => t.id) },
        token,
      );
    } catch {
      setTasks(previousTasks); // instant rollback
      showToast('Task order could not be saved. The previous order has been restored.');
    } finally {
      setTaskReorderSaving(false);
    }
  }

  function moveTaskToTop(taskId: string) {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx <= 0) return;
    const newTasks = [...tasks];
    newTasks.splice(idx, 1);
    newTasks.unshift(tasks[idx]);
    void performReorder(newTasks);
  }

  function moveTaskUp(taskId: string) {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx <= 0) return;
    const newTasks = [...tasks];
    [newTasks[idx - 1], newTasks[idx]] = [newTasks[idx], newTasks[idx - 1]];
    void performReorder(newTasks);
  }

  function moveTaskDown(taskId: string) {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0 || idx >= tasks.length - 1) return;
    const newTasks = [...tasks];
    [newTasks[idx], newTasks[idx + 1]] = [newTasks[idx + 1], newTasks[idx]];
    void performReorder(newTasks);
  }

  function moveTaskToBottom(taskId: string) {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0 || idx === tasks.length - 1) return;
    const newTasks = [...tasks];
    newTasks.splice(idx, 1);
    newTasks.push(tasks[idx]);
    void performReorder(newTasks);
  }

  // ── Drag-and-drop handlers ────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDrop(dropIndex: number) {
    if (dragTaskId === null) return;
    const fromIdx = tasks.findIndex((t) => t.id === dragTaskId);
    setDragTaskId(null);
    setDragOverIndex(null);
    if (fromIdx < 0 || fromIdx === dropIndex) return;
    const newTasks = [...tasks];
    const [removed] = newTasks.splice(fromIdx, 1);
    newTasks.splice(dropIndex, 0, removed);
    void performReorder(newTasks);
  }

  function handleDragEnd() {
    setDragTaskId(null);
    setDragOverIndex(null);
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
            {workspace.operationalStatus && (
              <WorkspaceOpStatusBadge status={workspace.operationalStatus} size="xs" />
            )}
            <VisibilityBadge visibility={workspace.visibility} />
            {/* Workspace access level badge */}
            {isElevatedAccess ? (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-default"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                title="Your system role grants elevated access to all workspaces without requiring explicit membership. Actions you take are still audited.">
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

          {/* Stats + Quick Add (spec Part 9 — no duplicate setup chips) */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden items-center gap-1.5 md:flex">
              {/* Open tasks */}
              <button type="button"
                onClick={() => { setActiveTab('tasks'); setTaskFilter('all'); }}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {workspace.metrics?.openTasks ?? workspace.summary.tasks.open}
                </span>
                {' '}Open Tasks
              </button>
              {/* Unassigned — amber, shown only to managers/elevated who can act on it */}
              {canManageWs && (workspace.metrics?.unassignedTasks ?? 0) > 0 && (
                <button type="button"
                  onClick={() => { setActiveTab('tasks'); setTaskFilter('unassigned'); }}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)30' }}>
                  <span className="font-semibold">{workspace.metrics!.unassignedTasks}</span>
                  {' '}Unassigned
                </button>
              )}
              {/* Overdue — red, shown when > 0 */}
              {(workspace.metrics?.overdueTasks ?? workspace.summary.tasks.overdue) > 0 && (
                <button type="button"
                  onClick={() => { setActiveTab('tasks'); setTaskFilter('overdue'); }}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)30' }}>
                  <span className="font-semibold">
                    {workspace.metrics?.overdueTasks ?? workspace.summary.tasks.overdue}
                  </span>
                  {' '}Overdue
                </button>
              )}
              {/* Files requiring attention — shown when > 0 */}
              {((workspace.metrics?.expiredFiles ?? 0) + (workspace.metrics?.expiringFiles ?? 0)) > 0 && (
                <button type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)30' }}>
                  <span className="font-semibold">
                    {(workspace.metrics?.expiredFiles ?? 0) + (workspace.metrics?.expiringFiles ?? 0)}
                  </span>
                  {' '}Files
                </button>
              )}
              {/* Open issues — shown when > 0 */}
              {workspace.summary.ncrCapa.open > 0 && (
                <button type="button"
                  onClick={() => setActiveTab('ncr')}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)30' }}>
                  <span className="font-semibold">{workspace.summary.ncrCapa.open}</span>
                  {' '}Open Issue{workspace.summary.ncrCapa.open !== 1 ? 's' : ''}
                </button>
              )}
              {/* Operational members — for managers only */}
              {canManageWs && (
                <button type="button"
                  onClick={() => setActiveTab('members')}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                  <Users className="inline h-3 w-3 mr-1" />
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {workspace.metrics?.operationalMembers ?? memberCount}
                  </span>
                  {' '}Member{(workspace.metrics?.operationalMembers ?? memberCount) !== 1 ? 's' : ''}
                </button>
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
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '205px' }}>
                  {([
                    ...(canAddTask && selectedListId ? [{ label: 'Add Task', Icon: CheckSquare, act: () => { setActiveTab('tasks'); setShowCreateTask(true); setShowQuickAdd(false); } }] : []),
                    ...(canCreateTask && selectedListId ? [{ label: 'Add Reference Item', Icon: FileText, act: () => { setActiveTab('tasks'); setShowCreateTask(true); setShowQuickAdd(false); } }] : []),
                    ...(canCreateTaskList ? [{ label: 'Add Task List', Icon: ListTodo, act: () => { setActiveTab('tasks'); setShowCreateList(true); setShowQuickAdd(false); } }] : []),
                    ...(canUploadDocument ? [{ label: 'Upload Document', Icon: FileCheck, act: () => { setActiveTab('documents'); setShowQuickAdd(false); } }] : []),
                    ...(canCreateIssue ? [{ label: 'Raise Issue', Icon: AlertTriangle, act: () => { setActiveTab('ncr'); setShowQuickAdd(false); } }] : []),
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

            {/* Workspace settings three-dot */}
            <div className="relative" ref={wsSettingsRef}>
              <button type="button" onClick={() => setShowWsSettings((v) => !v)}
                className="flex items-center justify-center rounded-lg border p-1.5 transition-colors"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}
                title="Workspace settings"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                <Settings className="h-4 w-4" />
              </button>
              {showWsSettings && (
                <div className="absolute right-0 top-full z-30 mt-1 overflow-hidden rounded-xl shadow-lg"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '190px' }}>
                  {([
                    { label: 'Copy Workspace Link', Icon: Copy, act: () => { void navigator.clipboard.writeText(window.location.href); showToast('Link copied'); setShowWsSettings(false); } },
                    ...(canManageWs ? [{ label: 'Manage Members', Icon: Users, act: () => { setActiveTab('members'); setShowWsSettings(false); } }] : []),
                    ...(canManageWs && memberCount === 0 ? [{ label: 'Add First Member', Icon: Users, act: () => { setActiveTab('members'); setShowAddMember(true); setShowWsSettings(false); } }] : []),
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
          { key: 'tasks',     label: 'Tasks',     Icon: ListTodo,        stale: false,         onOpen: () => {},                    show: true },
          { key: 'documents', label: 'Documents', Icon: FileCheck,       stale: docsStale,     onOpen: () => setDocsStale(false),   show: true },
          { key: 'ncr',       label: 'Issues & Actions', Icon: AlertTriangle, stale: ncrStale, onOpen: () => setNcrStale(false), show: true },
          { key: 'members',   label: 'Members',   Icon: Users,           stale: false,         onOpen: () => {},                    show: isElevatedAccess || !!myWsRole },
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
                {/* ── Personal My Work summary for Members (Part 13) ── */}
                {!canManageWs && (
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Work in This Workspace</p>
                      <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('mine'); }}
                        className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                        View My Tasks →
                      </button>
                    </div>
                    {overview.myWork.openTasks === 0 && overview.myWork.overdueTasks === 0 ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--state-success)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          No open tasks assigned to you in this workspace.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-xl font-semibold" style={{ color: 'var(--accent-primary)' }}>{overview.myWork.openTasks}</span>
                          <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>Open Task{overview.myWork.openTasks !== 1 ? 's' : ''}</span>
                        </div>
                        {overview.myWork.overdueTasks > 0 && (
                          <div>
                            <span className="text-xl font-semibold" style={{ color: 'var(--state-error)' }}>{overview.myWork.overdueTasks}</span>
                            <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>Overdue</span>
                          </div>
                        )}
                      </div>
                    )}
                    {overview.myWork.openTasks > 0 && (
                      <button type="button" onClick={() => { setActiveTab('tasks'); setTaskFilter('mine'); }}
                        className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                        Open My Tasks
                      </button>
                    )}
                  </div>
                )}

                {/* ── Workspace Status (consolidated panel, spec Part 4-5) — managers/elevated only ─── */}
                {canManageWs && (() => {
                  const opStatus  = workspace.operationalStatus;
                  const opReasons = workspace.operationalReasons ?? [];

                  const SETUP_CODES = new Set([
                    'DEPARTMENT_NOT_ASSIGNED', 'DEPARTMENT_INACTIVE', 'NO_OPERATIONAL_MEMBERS',
                  ]);
                  type ReasonAction = { label: string; tab?: WorkspaceTab; modal?: 'assign-dept' };
                  const ACTION_FOR_CODE: Record<string, ReasonAction> = {
                    DEPARTMENT_NOT_ASSIGNED:     { label: 'Assign Department', modal: 'assign-dept' },
                    DEPARTMENT_INACTIVE:         { label: 'Manage Dept',       tab: 'members' },
                    NO_OPERATIONAL_MEMBERS:      { label: 'Add Members',       tab: 'members' },
                    OVERDUE_HIGH_TASKS:          { label: 'Review',            tab: 'tasks' },
                    OVERDUE_TASKS:               { label: 'Review',            tab: 'tasks' },
                    UNASSIGNED_TASKS:            { label: 'Review',            tab: 'tasks' },
                    WAITING_REVIEW:              { label: 'Review',            tab: 'tasks' },
                    RETURNED_TASKS:              { label: 'Review',            tab: 'tasks' },
                    DOCS_UNDER_REVIEW:           { label: 'Review',            tab: 'documents' },
                    EXPIRED_FILES:               { label: 'Review',            tab: 'tasks' },
                    EXPIRING_FILES:              { label: 'Review',            tab: 'tasks' },
                    OVERDUE_ISSUES:              { label: 'Review',            tab: 'ncr' },
                    OPEN_ISSUES:                 { label: 'Review',            tab: 'ncr' },
                    ISSUES_WAITING_VERIFICATION: { label: 'Review',            tab: 'ncr' },
                    TASKS_IN_PROGRESS:           { label: 'View',              tab: 'tasks' },
                  };

                  function handleReasonAction(act: ReasonAction) {
                    if (act.modal === 'assign-dept') {
                      setSelectedDeptId('');
                      setAssignDeptError('');
                      const currentDeptId = workspace?.departmentId;
                      if (token)
                        apiGet<{id:string;name:string;code:string}[]>('/departments', token)
                          .then((d) => setAvailableDepts(d.filter((x) => x.id !== currentDeptId)))
                          .catch(() => {});
                      setShowAssignDeptModal(true);
                    } else if (act.tab) {
                      setActiveTab(act.tab);
                    }
                  }

                  const setupReasons    = opReasons.filter((r) => SETUP_CODES.has(r.code));
                  const businessReasons = opReasons.filter((r) => !SETUP_CODES.has(r.code));

                  const borderColor =
                    opStatus === 'CRITICAL'                                          ? 'var(--state-error)'   :
                    opStatus === 'NEEDS_ATTENTION' || opStatus === 'SETUP_REQUIRED'  ? 'var(--state-warning)' :
                    opStatus === 'IN_PROGRESS'                                       ? 'var(--accent-primary)':
                    opStatus === 'HEALTHY'                                           ? 'var(--state-success)' :
                    'var(--border-default)';

                  return (
                    <div className="rounded-xl border p-4"
                      style={{ borderColor, backgroundColor: 'var(--bg-surface)' }}>
                      {/* Panel header */}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Workspace Status
                        </p>
                        {opStatus && <WorkspaceOpStatusBadge status={opStatus} size="xs" />}
                      </div>

                      {/* INACTIVE */}
                      {opStatus === 'INACTIVE' && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          This workspace is archived. Reactivate it to resume work.
                        </p>
                      )}

                      {/* HEALTHY */}
                      {opStatus === 'HEALTHY' && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--state-success)' }} />
                          <span className="text-sm" style={{ color: 'var(--state-success)' }}>
                            No operational issues. Workspace is healthy.
                          </span>
                        </div>
                      )}

                      {/* IN_PROGRESS */}
                      {opStatus === 'IN_PROGRESS' && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                          <span className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                            Tasks are actively in progress. No blocking issues.
                          </span>
                        </div>
                      )}

                      {/* SETUP_REQUIRED / CRITICAL / NEEDS_ATTENTION — show reasons */}
                      {opStatus !== 'INACTIVE' && opStatus !== 'HEALTHY' && opStatus !== 'IN_PROGRESS' && (
                        <>
                          {/* Section A: Setup reasons */}
                          {setupReasons.length > 0 && (
                            <div className={businessReasons.length > 0 ? 'mb-3' : ''}>
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
                                style={{ color: 'var(--state-warning)' }}>Setup</p>
                              <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                                {setupReasons.map((r) => {
                                  const act = ACTION_FOR_CODE[r.code];
                                  return (
                                    <div key={r.code} className="flex items-center justify-between py-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full shrink-0"
                                          style={{ backgroundColor: 'var(--state-warning)' }} />
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
                                      </div>
                                      {act && canManageWs && (
                                        <button type="button" onClick={() => handleReasonAction(act)}
                                          className="shrink-0 text-xs font-medium"
                                          style={{ color: 'var(--accent-primary)' }}>
                                          {act.label} →
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section B: Business reasons */}
                          {businessReasons.length > 0 && (
                            <div>
                              {setupReasons.length > 0 && (
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
                                  style={{ color: 'var(--state-error)' }}>Business Attention</p>
                              )}
                              <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                                {businessReasons.map((r) => {
                                  const act = ACTION_FOR_CODE[r.code];
                                  const dotColor = r.severity === 'ERROR' ? 'var(--state-error)' : 'var(--state-warning)';
                                  return (
                                    <div key={r.code} className="flex items-center justify-between py-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full shrink-0"
                                          style={{ backgroundColor: dotColor }} />
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
                                      </div>
                                      {act?.tab && (
                                        <button type="button" onClick={() => handleReasonAction(act)}
                                          className="shrink-0 text-xs font-medium"
                                          style={{ color: 'var(--accent-primary)' }}>
                                          {act.label} →
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* No business items note (only when setup reasons present and business empty) */}
                          {setupReasons.length > 0 && businessReasons.length === 0 && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              No urgent business items.
                            </p>
                          )}

                          {/* Fallback: neither setup nor business (shouldn't happen for these statuses) */}
                          {setupReasons.length === 0 && businessReasons.length === 0 && (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              No details available.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ── My Work (for managers/elevated — Members see their panel at top) ─── */}
                {canManageWs && overview.myWork && (overview.myWork.openTasks > 0 || overview.myWork.overdueTasks > 0) && (
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
                <div className="grid grid-cols-2 gap-4">
                  {/* Tasks — upgraded (spec Parts 6-7) */}
                  <SummaryCard title="Task Summary" accent="var(--accent-primary)">
                    {overview.work.open === 0 && overview.work.completed === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No tasks yet. Create tasks to track work.</div>
                    ) : (
                      <>
                        <KpiRow label="Open"
                          value={workspace.metrics?.openTasks ?? overview.work.open} />
                        <KpiRow label="In Progress"
                          value={workspace.metrics?.inProgressTasks ?? 0}
                          color={(workspace.metrics?.inProgressTasks ?? 0) > 0 ? 'var(--accent-primary)' : undefined} />
                        <KpiRow label="Unassigned"
                          value={workspace.metrics?.unassignedTasks ?? 0}
                          color={(workspace.metrics?.unassignedTasks ?? 0) > 0 ? 'var(--state-warning)' : undefined} />
                        <KpiRow label="Overdue"
                          value={workspace.metrics?.overdueTasks ?? overview.work.overdue}
                          color={(workspace.metrics?.overdueTasks ?? overview.work.overdue) > 0 ? 'var(--state-error)' : undefined} />
                        {(workspace.metrics?.waitingReviewTasks ?? 0) > 0 && (
                          <KpiRow label="Waiting Review"
                            value={workspace.metrics!.waitingReviewTasks}
                            color="var(--state-warning)" />
                        )}
                        {(workspace.metrics?.returnedTasks ?? 0) > 0 && (
                          <KpiRow label="Returned"
                            value={workspace.metrics!.returnedTasks}
                            color="var(--state-error)" />
                        )}
                        <KpiRow label="Completed"
                          value={overview.work.completed}
                          color="var(--state-success)" />
                      </>
                    )}
                    {/* Dynamic button — personal context for Members, workspace control for Managers */}
                    {(() => {
                      const m = workspace.metrics;
                      let label = canManageWs ? 'View Tasks' : 'View My Tasks';
                      let onClickFn: () => void = () => { setActiveTab('tasks'); if (!canManageWs) setTaskFilter('mine'); };
                      if (canManageWs && m) {
                        // Managers see workspace-wide priority action
                        if (m.overdueTasks > 0)            { label = 'Review Overdue Tasks';    onClickFn = () => { setActiveTab('tasks'); setTaskFilter('overdue'); }; }
                        else if (m.returnedTasks > 0)      { label = 'Review Returned Tasks';   onClickFn = () => { setActiveTab('tasks'); setTaskFilter('returned'); }; }
                        else if (m.waitingReviewTasks > 0) { label = 'Review Waiting Review';   onClickFn = () => { setActiveTab('tasks'); setTaskFilter('waiting_review'); }; }
                        else if (m.unassignedTasks > 0)    { label = 'Review Unassigned';       onClickFn = () => { setActiveTab('tasks'); setTaskFilter('unassigned'); }; }
                        else if (m.inProgressTasks > 0)    { label = 'View In-Progress Tasks';  onClickFn = () => setActiveTab('tasks'); }
                        else if (m.openTasks > 0)          { label = 'View Tasks';              onClickFn = () => setActiveTab('tasks'); }
                      }
                      return (
                        <button type="button" onClick={onClickFn}
                          className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-colors"
                          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                          {label} →
                        </button>
                      );
                    })()}
                  </SummaryCard>

                  {/* Documents (spec Part 8) */}
                  <SummaryCard title="Documents" accent="var(--accent-primary)">
                    {overview.documents.total === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No documents uploaded yet. Upload controlled documents to track status.</div>
                    ) : (
                      <>
                        <KpiRow label="Total"          value={overview.documents.total} />
                        <KpiRow label="✓ Approved"     value={overview.documents.approved}   color="var(--state-success)" />
                        <KpiRow label="⟳ Under Review" value={overview.documents.underReview} color={overview.documents.underReview > 0 ? 'var(--state-warning)' : undefined} />
                        {overview.documents.rejected > 0 && (
                          <KpiRow label="✗ Requiring Attention" value={overview.documents.rejected} color="var(--state-error)" />
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

                  {/* Issues & Actions (spec Part 8 — added Waiting Verification) */}
                  <SummaryCard title="Issues & Actions" accent="var(--state-error)">
                    {overview.ncrCapa.open === 0 && overview.ncrCapa.closed === 0 ? (
                      <div className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No issues raised yet.</div>
                    ) : (
                      <>
                        <KpiRow label="Open"    value={overview.ncrCapa.open}    color={overview.ncrCapa.open > 0 ? 'var(--state-error)' : undefined} />
                        <KpiRow label="Overdue" value={overview.ncrCapa.overdue} color={overview.ncrCapa.overdue > 0 ? 'var(--state-error)' : undefined} />
                        {(workspace.metrics?.issuesWaitingVerification ?? 0) > 0 && (
                          <KpiRow label="⟳ Waiting Verification"
                            value={workspace.metrics!.issuesWaitingVerification}
                            color="var(--state-warning)" />
                        )}
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

                  {/* Team (spec Part 8 — shows Operational Members) */}
                  <SummaryCard title="Team" accent="var(--text-muted)">
                    <div className="mb-2 flex items-end gap-2">
                      <span className="text-3xl font-bold" style={{ color: overview.members === 0 ? 'var(--state-warning)' : 'var(--text-primary)' }}>{overview.members}</span>
                      <span className="pb-1 text-xs" style={{ color: 'var(--text-muted)' }}>members</span>
                    </div>
                    {/* Operational members breakdown */}
                    {(workspace.metrics?.operationalMembers ?? 0) < overview.members && (
                      <div className="mb-2">
                        <KpiRow label="Operational"
                          value={workspace.metrics?.operationalMembers ?? 0}
                          color={(workspace.metrics?.operationalMembers ?? 0) > 0 ? 'var(--state-success)' : 'var(--state-warning)'} />
                        <KpiRow label="View-only" value={overview.members - (workspace.metrics?.operationalMembers ?? 0)} />
                      </div>
                    )}
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
                      { label: 'Members',   Icon: Users,         act: () => setActiveTab('members'),   show: isElevatedAccess || !!myWsRole },
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
                    {/* Action Center deep-link — SUPER_ADMIN / SUPER_USER only */}
                    {(user?.roles ?? []).some((r) => ['SUPER_ADMIN', 'SUPER_USER'].includes(r)) && (
                      <Link
                        href={`/action-center?workspaceId=${workspaceId}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors"
                        style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                        <ShieldAlert className="h-4 w-4" />Action Center
                      </Link>
                    )}
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
                  Add users who need operational access to tasks, documents, and issues in this workspace. Users with elevated system roles can view workspaces without being listed here.
                </p>
                {workspace.visibility === 'PRIVATE' && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isElevatedAccess
                      ? 'Private workspace — listed members and authorized global business controllers can access this workspace and its content.'
                      : 'Private workspace — access is limited to listed members of this workspace.'}
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

            {/* Search + filter toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search members…" value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-36 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }} />
                {memberSearch && (
                  <button type="button" onClick={() => setMemberSearch('')} style={{ color: 'var(--text-muted)' }}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <select value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="rounded-lg border px-2.5 py-1.5 text-sm outline-none cursor-pointer"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                <option value="">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="MANAGER">Manager</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              {(memberSearch || memberRoleFilter) && (
                <button type="button" onClick={() => { setMemberSearch(''); setMemberRoleFilter(''); }}
                  className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                  Clear
                </button>
              )}
            </div>

            {/* Role legend */}
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 rounded-lg border px-4 py-2.5"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
              {([
                { role: 'Viewer', desc: 'Read-only access' },
                { role: 'Member', desc: 'Collaborate on tasks, documents, and issues' },
                { role: 'Manager', desc: 'Manage workspace work and members' },
                { role: 'Owner', desc: 'Full workspace control' },
              ] as const).map(({ role, desc }) => (
                <div key={role} className="flex items-center gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{role}:</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</span>
                </div>
              ))}
            </div>

            {(() => {
              const filteredMembers = members.filter((m) => {
                if (memberRoleFilter && m.roleInWorkspace !== memberRoleFilter) return false;
                if (memberSearch) {
                  const q = memberSearch.toLowerCase();
                  if (!m.user.fullName.toLowerCase().includes(q) && !m.user.email.toLowerCase().includes(q)) return false;
                }
                return true;
              });

              return membersLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Users className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No operational members assigned</p>
                  <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                    Add at least one Member or Manager to make this workspace operational.
                    {workspace.visibility === 'PRIVATE' ? ' Private workspaces are inaccessible to staff until a member is added.' : ''}
                  </p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Search className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No members match the current filter.</p>
                </div>
              ) : (
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                      {([...['Member', 'Department', 'System Access', 'Workspace Role'], ...(canManageMembers ? [''] : [])]).map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => (
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
                        {canManageMembers && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button type="button" title="Copy email" onClick={() => { void navigator.clipboard.writeText(m.user.email); showToast('Email copied'); }}
                                className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              {m.roleInWorkspace !== 'OWNER' && (
                                <button type="button" title="Remove member" onClick={() => void handleRemoveMember(m.id)}
                                  className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}

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
            {/* Tab header — role-specific title and description (Part 8) */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {canManageWs ? 'Workspace Activity' : 'My Relevant Activity'}
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {canManageWs
                    ? 'All recorded business changes and actions in this workspace.'
                    : 'Activity related to your assigned work, comments, files, issues, and workspace access.'}
                </p>
              </div>
              <button type="button" onClick={() => void loadActivity()}
                disabled={activityLoading}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                <RefreshCw className={`h-3.5 w-3.5 ${activityLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>

            {/* Stale banner */}
            {activityStale && !activityLoading && (
              <div className="mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5"
                style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                <span className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                  {canManageWs ? 'Workspace activity has been updated.' : 'New relevant activity may be available.'}
                </span>
                <button type="button" onClick={() => void loadActivity()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  <RefreshCw className="h-3.5 w-3.5" />Refresh
                </button>
              </div>
            )}

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search by actor or item…" value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="w-40 bg-transparent text-xs outline-none"
                  style={{ color: 'var(--text-primary)' }} />
                {activitySearch && (
                  <button type="button" onClick={() => setActivitySearch('')} style={{ color: 'var(--text-muted)' }}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {/* Role-specific entity filter options (Part 9) */}
              <select value={activityEntityFilter} onChange={(e) => setActivityEntityFilter(e.target.value)}
                className="rounded-lg border px-2.5 py-1.5 text-xs outline-none cursor-pointer"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                {canManageWs ? (
                  <>
                    <option value="">All Types</option>
                    <option value="TASK">Tasks</option>
                    <option value="DOCUMENT">Documents</option>
                    <option value="FILE_ATTACHMENT">Files</option>
                    <option value="NCR_CAPA">Issues</option>
                    <option value="PROJECT">Workspace & Members</option>
                  </>
                ) : (
                  <>
                    <option value="">All Relevant</option>
                    <option value="TASK">My Tasks</option>
                    <option value="NCR_CAPA">Issues</option>
                    <option value="DOCUMENT">Documents</option>
                    <option value="PROJECT">Access Changes</option>
                  </>
                )}
              </select>
              {(activitySearch || activityEntityFilter) && (
                <button type="button" onClick={() => { setActivitySearch(''); setActivityEntityFilter(''); }}
                  className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                  Clear filters
                </button>
              )}
            </div>

            {activityLoading && activity.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
              </div>
            ) : activityError ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <AlertCircle className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
                <p className="text-sm" style={{ color: 'var(--state-error)' }}>We couldn&apos;t load your activity.</p>
                <button type="button" onClick={() => void loadActivity()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Activity className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {canManageWs ? 'No workspace activity recorded yet.' : 'No relevant activity yet.'}
                </p>
                <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  {canManageWs
                    ? 'All recorded business changes and actions will appear here.'
                    : 'Assignments, comments, files, mentions, and access changes related to you will appear here.'}
                </p>
              </div>
            ) : (() => {
              const searchLower = activitySearch.toLowerCase();
              const filtered = activity.filter((e) => {
                if (activityEntityFilter && e.entityType !== activityEntityFilter) return false;
                if (activitySearch && !(
                  (e.actor?.fullName ?? '').toLowerCase().includes(searchLower) ||
                  (e.entityTitle ?? '').toLowerCase().includes(searchLower)
                )) return false;
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <Search className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No matching activity</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filter.</p>
                  </div>
                );
              }

              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const yesterdayStart = new Date(todayStart.getTime() - 86400000);

              const groups: Array<{ label: string; entries: typeof filtered }> = [
                { label: 'Today',     entries: filtered.filter((e) => new Date(e.createdAt) >= todayStart) },
                { label: 'Yesterday', entries: filtered.filter((e) => new Date(e.createdAt) >= yesterdayStart && new Date(e.createdAt) < todayStart) },
                { label: 'Earlier',   entries: filtered.filter((e) => new Date(e.createdAt) < yesterdayStart) },
              ].filter((g) => g.entries.length > 0);

              return (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        {group.label}
                      </p>
                      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                        {group.entries.map((entry, i) => {
                          const isClickable = entry.entityId && ['TASK', 'DOCUMENT', 'FILE_ATTACHMENT', 'NCR_CAPA'].includes(entry.entityType);
                          function handleActivityClick() {
                            if (!entry.entityId) return;
                            if (entry.entityType === 'TASK') { setActiveTab('tasks'); setSelectedTaskId(entry.entityId); }
                            else if (entry.entityType === 'DOCUMENT' || entry.entityType === 'FILE_ATTACHMENT') setActiveTab('documents');
                            else if (entry.entityType === 'NCR_CAPA') setActiveTab('ncr');
                          }
                          return (
                            <div key={entry.id}
                              className={`flex items-start gap-3 px-4 py-3${isClickable ? ' cursor-pointer' : ''}`}
                              style={{ borderBottom: i < group.entries.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                              onClick={isClickable ? handleActivityClick : undefined}
                              onMouseEnter={isClickable ? (e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)') : undefined}
                              onMouseLeave={isClickable ? (e) => (e.currentTarget.style.backgroundColor = '') : undefined}>
                              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                <EntityIcon type={entry.entityType} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                                  <span className="font-medium">{entry.actor?.fullName ?? 'System'}</span>
                                  {' '}<span style={{ color: 'var(--text-muted)' }}>{(ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ')).toLowerCase()}</span>
                                  {' '}<span style={{ color: 'var(--text-muted)' }}>{(ENTITY_LABELS[entry.entityType] ?? entry.entityType).toLowerCase()}</span>
                                  {entry.entityTitle ? <span className="font-medium"> &ldquo;{entry.entityTitle}&rdquo;</span> : null}
                                </p>
                                <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                                  {new Date(entry.createdAt).toLocaleString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                  })}
                                  {' · '}{relativeTime(entry.createdAt)}
                                  {isClickable && <span style={{ color: 'var(--accent-primary)' }}> · View →</span>}
                                </p>
                              </div>
                              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                {ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
              {canCreateTaskList && (
                <button type="button" onClick={() => setShowCreateList(true)} title="New Task List"
                  className="rounded p-0.5 transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
              {displayedTaskLists.length === 0 && (
                <p className="px-2 py-4 text-xs" style={{ color: 'var(--text-disabled)' }}>No lists yet</p>
              )}
              {displayedTaskLists.map((tl, idx) => (
                <div key={tl.id} className="group relative flex items-center">
                  {renamingListId === tl.id ? (
                    /* Inline rename input */
                    <div className="flex flex-1 items-center gap-1 px-1 py-1">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRenameList();
                          if (e.key === 'Escape') { setRenamingListId(null); setRenameValue(''); }
                        }}
                        className="flex-1 rounded border px-2 py-1 text-xs outline-none min-w-0"
                        style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                      />
                      <button type="button" onClick={() => void handleRenameList()} title="Save"
                        className="rounded p-0.5 flex-shrink-0" style={{ color: 'var(--state-success)' }}>
                        <CheckSquare className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => { setRenamingListId(null); setRenameValue(''); }} title="Cancel"
                        className="rounded p-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => setSelectedListId(tl.id)}
                        className="flex flex-1 min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
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
                      {/* Three-dot context menu — managers/owners only */}
                      {canManageWs && (
                        <div className="relative flex-shrink-0" ref={openListMenuId === tl.id ? listMenuRef : null}>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenListMenuId((p) => p === tl.id ? null : tl.id); }}
                            className="rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-muted)' }} title="List actions">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {openListMenuId === tl.id && (
                            <div className="absolute left-0 top-full z-20 mt-1 overflow-hidden rounded-xl shadow-lg"
                              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '150px' }}>
                              <button type="button"
                                onClick={() => { setRenamingListId(tl.id); setRenameValue(tl.name); setOpenListMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                style={{ color: 'var(--text-primary)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                <Pencil className="h-3 w-3 flex-shrink-0" />Rename
                              </button>
                              {displayedTaskLists.length > 1 && idx > 0 && (
                                <button type="button" disabled={listReorderSaving}
                                  onClick={() => { setOpenListMenuId(null); void moveListUp(tl.id); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left disabled:opacity-40"
                                  style={{ color: 'var(--text-primary)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                  <ChevronUp className="h-3 w-3 flex-shrink-0" />Move Up
                                </button>
                              )}
                              {displayedTaskLists.length > 1 && idx < displayedTaskLists.length - 1 && (
                                <button type="button" disabled={listReorderSaving}
                                  onClick={() => { setOpenListMenuId(null); void moveListDown(tl.id); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left disabled:opacity-40"
                                  style={{ color: 'var(--text-primary)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                  <ChevronDown className="h-3 w-3 flex-shrink-0" />Move Down
                                </button>
                              )}
                              {isSuperAdmin && (
                                <>
                                  <div style={{ borderTop: '1px solid var(--border-default)', margin: '2px 0' }} />
                                  <button type="button"
                                    onClick={() => handleDeleteTaskList(tl.id)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                    style={{ color: 'var(--state-error)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--state-error-soft)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                    <Trash2 className="h-3 w-3 flex-shrink-0" />Delete List
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {listReorderSaving && (
                <p className="px-3 py-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Saving order…</p>
              )}
            </nav>
          </aside>

          {/* Main task content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {!selectedListId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2">
                <ListTodo className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {displayedTaskLists.length === 0 ? 'Create a task list to get started' : 'Select a task list'}
                </p>
                {canManage && displayedTaskLists.length === 0 && (
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
                  {canAddTask && (
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
                    { key: 'all',             label: 'All',              show: true },
                    { key: 'mine',            label: 'My Tasks',         show: true },
                    { key: 'pending_approval',label: 'Pending Approval', show: canManageWs },
                    { key: 'unassigned',      label: 'Unassigned',       show: true },
                    { key: 'overdue',         label: 'Overdue',          show: true },
                    { key: 'waiting_review',  label: 'In Review',        show: true },
                    { key: 'returned',        label: 'Returned',         show: true },
                    { key: 'reference',       label: 'Reference Only',   show: true },
                    { key: 'completed',       label: 'Completed',        show: true },
                  ] as Array<{ key: TaskFilter; label: string; show: boolean }>).filter((f) => f.show).map((f) => {
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
                  <div className="ml-auto flex items-center gap-2">
                    {/* Sort dropdown */}
                    <select
                      value={taskSort}
                      onChange={(e) => setTaskSort(e.target.value as TaskSort)}
                      className="rounded-lg border px-2 py-1 text-[11px] outline-none cursor-pointer"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                      title="Sort tasks"
                    >
                      <option value="manual">Manual order</option>
                      <option value="newest-created">Newest first</option>
                      <option value="oldest-created">Oldest first</option>
                      <option value="recently-updated">Recently updated</option>
                      <option value="oldest-updated">Least recently updated</option>
                    </select>
                    {/* Search */}
                    <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1"
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
                </div>

                {/* Reorder saving indicator */}
                {taskReorderSaving && (
                  <div className="flex items-center gap-1.5 border-b px-4 py-1.5"
                    style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                    <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Saving order…</span>
                  </div>
                )}

                {/* Reorder hint — shown to collaborators when not in manual-all mode */}
                {canCollaborate && !isReorderEnabled && tasks.length > 1 && (
                  <div className="flex items-center gap-2 border-b px-4 py-1.5"
                    style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                    <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                      Manual ordering is available in <strong>All tasks</strong> with <strong>Manual order</strong> selected and no active search or filter.
                    </span>
                  </div>
                )}

                {/* Task table */}
                <div className="flex-1 overflow-y-auto">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  ) : tasksError ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16">
                      <AlertCircle className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
                      <p className="text-sm" style={{ color: 'var(--state-error)' }}>{tasksError}</p>
                      <button type="button" onClick={() => void loadTasks()}
                        className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
                        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                        <RefreshCw className="h-4 w-4" /> Retry
                      </button>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16">
                      <CheckSquare className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {taskSearch
                          ? 'No tasks match your search.'
                          : taskFilter === 'mine'
                            ? 'No tasks are assigned to you in this list.'
                            : taskFilter !== 'all'
                              ? 'No tasks match the current filter.'
                              : 'No tasks have been added to this list.'}
                      </p>
                      {!taskSearch && taskFilter === 'all' && canAddTask && (
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
                          {isReorderEnabled && (
                            <th className="w-7 px-2 py-2.5" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                          )}
                          {[
                            { label: 'Title',    cls: '' },
                            { label: 'Status',   cls: '' },
                            { label: 'Priority', cls: '' },
                            { label: 'Assignee', cls: '' },
                            { label: 'Due Date', cls: '' },
                            { label: 'Created',  cls: ' hidden lg:table-cell' },
                            { label: 'Updated',  cls: '' },
                            { label: '',         cls: '' },
                          ].map(({ label, cls }) => (
                            <th key={label}
                              className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide${cls}`}
                              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((task, taskIdx) => (
                          <tr key={task.id}
                            className="group cursor-pointer transition-colors"
                            draggable={isReorderEnabled}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              opacity: dragTaskId === task.id ? 0.4 : 1,
                              outline: dragOverIndex === taskIdx && dragTaskId !== task.id ? '2px solid var(--accent-primary)' : 'none',
                              outlineOffset: '-1px',
                            }}
                            onClick={(e) => { if (dragTaskId) return; setSelectedTaskId(task.id); void e; }}
                            onMouseEnter={(e) => { if (!dragTaskId) e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            onDragStart={isReorderEnabled ? (e) => handleDragStart(e, task.id) : undefined}
                            onDragOver={isReorderEnabled ? (e) => handleDragOver(e, taskIdx) : undefined}
                            onDrop={isReorderEnabled ? () => handleDrop(taskIdx) : undefined}
                            onDragEnd={isReorderEnabled ? handleDragEnd : undefined}>
                            {isReorderEnabled && (
                              <td className="w-7 px-2 py-3 text-center"
                                draggable={false}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}>
                                <span className="cursor-grab select-none text-[14px] leading-none"
                                  style={{ color: 'var(--text-disabled)' }}
                                  title="Drag to reorder">
                                  ⠿
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)', maxWidth: '260px' }}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="line-clamp-1">{task.title}</span>
                                {task.isReference && (
                                  <span className="shrink-0 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                    style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', lineHeight: 1.4 }}>
                                    Ref
                                  </span>
                                )}
                                {task.approvalStatus === 'PENDING' && (
                                  <span className="shrink-0 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                    title="Pending approval"
                                    style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)', lineHeight: 1.4 }}>
                                    Pending Approval
                                  </span>
                                )}
                                {task.approvalStatus === 'RETURNED' && (
                                  <span className="shrink-0 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                    title="Returned for correction"
                                    style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)', lineHeight: 1.4 }}>
                                    Returned
                                  </span>
                                )}
                                {task.approvalStatus === 'REJECTED' && (
                                  <span className="shrink-0 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                    title="Task request rejected"
                                    style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)', lineHeight: 1.4 }}>
                                    Rejected
                                  </span>
                                )}
                                {task.recurrenceInterval && task.recurrenceInterval !== 'NONE' && (
                                  <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-disabled)' }} title={`Recurring: ${task.recurrenceInterval}`}>↻</span>
                                )}
                                {/* Compact count indicators — only when > 0 (Part 16) */}
                                {(task._count.comments > 0 || task._count.subtasks > 0) && (
                                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                                    {task._count.comments > 0 && (
                                      <span className="inline-flex items-center gap-0.5" title={`${task._count.comments} comment${task._count.comments !== 1 ? 's' : ''}`}>
                                        <MessageSquare className="h-2.5 w-2.5" />{task._count.comments}
                                      </span>
                                    )}
                                    {task._count.subtasks > 0 && (
                                      <span className="inline-flex items-center gap-0.5" title={`${task._count.subtasks} subtask${task._count.subtasks !== 1 ? 's' : ''}`}>
                                        <GitBranch className="h-2.5 w-2.5" />{task._count.subtasks}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={task.status} size="xs" /></td>
                            <td className="px-4 py-3">
                              {task.isReference
                                ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Reference</span>
                                : <PriorityBadge priority={task.priority} />
                              }
                            </td>

                            {/* ── Assignee cell — interactive for canAssignTasks, read-only otherwise ── */}
                            <td className="px-4 py-3 text-xs" onClick={(e) => e.stopPropagation()}>
                              {canAssignTasks && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' ? (
                                <div className="relative" ref={openAssigneeDropdownId === task.id ? assigneeDropdownRef : null}>
                                  {/* Loading spinner while updating */}
                                  {assigneeUpdating.has(task.id) ? (
                                    <div className="flex items-center gap-1.5">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                                    </div>
                                  ) : task.approvalStatus === 'PENDING' ? (
                                    /* Pending-approval: assignee locked until approved */
                                    <div className="flex cursor-not-allowed items-center gap-1.5 opacity-50"
                                      title="Assignment can be changed after task approval.">
                                      {task.assignee ? (
                                        <>
                                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                            style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                            {task.assignee.fullName.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="truncate" style={{ maxWidth: '80px', color: 'var(--text-secondary)' }}>{task.assignee.fullName}</span>
                                        </>
                                      ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                                    </div>
                                  ) : (
                                    /* Interactive dropdown trigger */
                                    <button type="button"
                                      onClick={() => {
                                        if (openAssigneeDropdownId === task.id) {
                                          setOpenAssigneeDropdownId(null);
                                          setAssigneeSearch('');
                                        } else {
                                          setOpenAssigneeDropdownId(task.id);
                                          setAssigneeSearch('');
                                          void loadEligibleUsers();
                                        }
                                      }}
                                      className="flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 transition-colors hover:bg-[var(--bg-muted)] focus:outline-none"
                                      style={{ color: task.assignee ? 'var(--text-secondary)' : 'var(--accent-primary)' }}
                                      aria-haspopup="listbox"
                                      aria-expanded={openAssigneeDropdownId === task.id}
                                      aria-label={task.assignee ? `Assigned to ${task.assignee.fullName} — click to change` : 'Unassigned — click to assign'}>
                                      {task.assignee ? (
                                        <>
                                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                            style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                            {task.assignee.fullName.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="truncate" style={{ maxWidth: '80px' }}>{task.assignee.fullName}</span>
                                          <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-40" />
                                        </>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                                          <Plus className="h-3 w-3" />Assign
                                        </span>
                                      )}
                                    </button>
                                  )}

                                  {/* Assignee dropdown */}
                                  {openAssigneeDropdownId === task.id && (
                                    <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl shadow-lg"
                                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                                      role="listbox" aria-label="Select assignee">
                                      {/* Search */}
                                      <div className="border-b px-3 py-2" style={{ borderColor: 'var(--border-default)' }}>
                                        <div className="flex items-center gap-1.5 rounded-lg border px-2 py-1"
                                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                                          <Search className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                          <input type="text" placeholder="Search eligible users…" value={assigneeSearch}
                                            onChange={(e) => setAssigneeSearch(e.target.value)}
                                            className="flex-1 bg-transparent text-xs outline-none"
                                            style={{ color: 'var(--text-primary)' }}
                                            autoFocus
                                            aria-label="Search eligible users" />
                                        </div>
                                      </div>
                                      {/* User list */}
                                      <div className="max-h-48 overflow-y-auto py-1">
                                        {eligibleUsersLoading ? (
                                          <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                                          </div>
                                        ) : eligibleUsersError ? (
                                          <div className="px-3 py-2 text-xs" style={{ color: 'var(--state-error)' }}>
                                            {eligibleUsersError}
                                            <button type="button" onClick={() => { setEligibleUsersError(''); void loadEligibleUsers(); }}
                                              className="ml-2 underline" style={{ color: 'var(--accent-primary)' }}>Retry</button>
                                          </div>
                                        ) : (() => {
                                          const filtered = eligibleUsers.filter((u) =>
                                            !assigneeSearch.trim() ||
                                            u.fullName.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                                            u.email.toLowerCase().includes(assigneeSearch.toLowerCase()));
                                          if (filtered.length === 0) {
                                            return <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No eligible users found.</div>;
                                          }
                                          return filtered.map((u) => (
                                            <button key={u.id} type="button"
                                              onClick={() => void handleInlineAssign(task.id, u.id)}
                                              disabled={u.id === task.assigneeId}
                                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left disabled:cursor-default"
                                              style={{ color: 'var(--text-primary)', opacity: u.id === task.assigneeId ? 0.6 : 1 }}
                                              onMouseEnter={(e) => { if (u.id !== task.assigneeId) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
                                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                              role="option" aria-selected={u.id === task.assigneeId}>
                                              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                                style={{ backgroundColor: u.id === task.assigneeId ? 'var(--accent-primary)' : 'var(--sidebar-bg)' }}>
                                                {u.fullName.charAt(0).toUpperCase()}
                                              </div>
                                              <span className="flex-1 truncate">{u.fullName || u.email || 'Unknown user'}</span>
                                              {u.id === task.assigneeId && <span className="text-[10px]" style={{ color: 'var(--accent-primary)' }}>✓</span>}
                                            </button>
                                          ));
                                        })()}
                                      </div>
                                      {/* Unassign */}
                                      {task.assigneeId && (
                                        <div className="border-t py-1" style={{ borderColor: 'var(--border-default)' }}>
                                          <button type="button"
                                            onClick={() => void handleInlineAssign(task.id, null)}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left"
                                            style={{ color: 'var(--state-warning)' }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--state-warning-soft)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                            <UserCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                            Unassign
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Read-only: Member, Viewer, or completed/cancelled task */
                                task.assignee ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                      style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                                      {task.assignee.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate" style={{ maxWidth: '90px', color: 'var(--text-secondary)' }}>{task.assignee.fullName}</span>
                                  </div>
                                ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs">
                              {(() => {
                                // Reference items: due date is a review date, not an overdue trigger
                                const isOverdue = !task.isReference && task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
                                return (
                                  <span className="inline-flex items-center gap-1"
                                    style={{ color: isOverdue ? 'var(--state-error)' : task.dueDate ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
                                    {isOverdue && <Clock className="h-3 w-3 flex-shrink-0" />}
                                    {formatDate(task.dueDate)}
                                  </span>
                                );
                              })()}
                            </td>
                            {/* Created — Kuwait date with tooltip */}
                            <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                              {task.createdAt ? (
                                <span title={formatKuwaitTooltip(task.createdAt)} className="cursor-help">
                                  {formatKuwaitDate(task.createdAt)}
                                </span>
                              ) : '—'}
                            </td>
                            {/* Updated — exact Kuwait date + time; relative time as tooltip */}
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {task.updatedAt ? (
                                <div className="flex flex-col gap-0" title={relativeTime(task.updatedAt)}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{formatKuwaitDate(task.updatedAt)}</span>
                                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatKuwaitTime(task.updatedAt)}</span>
                                </div>
                              ) : '—'}
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
                                    {(() => {
                                      const taskIdx2 = tasks.findIndex((t) => t.id === task.id);
                                      const isFirst  = taskIdx2 === 0;
                                      const isLast   = taskIdx2 === tasks.length - 1;
                                      return [
                                        { icon: Eye,          label: 'Open task',    action: () => { setSelectedTaskId(task.id); setOpenMenuId(null); }, del: false },
                                        { icon: ClipboardCopy,label: 'Copy link',    action: () => copyTaskLink(task.id), del: false },
                                        { icon: Copy,         label: 'Duplicate',    action: () => void handleDuplicate(task.id), del: false },
                                        // Fallback reorder actions — all four, enabled only in manual-all mode
                                        ...(isReorderEnabled && !isFirst  ? [{ icon: ChevronsUp,  label: 'Move to top',    action: () => { setOpenMenuId(null); moveTaskToTop(task.id); },    del: false }] : []),
                                        ...(isReorderEnabled && !isFirst  ? [{ icon: ChevronUp,   label: 'Move up',         action: () => { setOpenMenuId(null); moveTaskUp(task.id); },        del: false }] : []),
                                        ...(isReorderEnabled && !isLast   ? [{ icon: ChevronDown, label: 'Move down',        action: () => { setOpenMenuId(null); moveTaskDown(task.id); },      del: false }] : []),
                                        ...(isReorderEnabled && !isLast   ? [{ icon: ChevronsDown,label: 'Move to bottom',  action: () => { setOpenMenuId(null); moveTaskToBottom(task.id); }, del: false }] : []),
                                        ...(otherLists.length > 0 ? [{ icon: Move, label: 'Move to list…', action: () => { setMoveTaskId(task.id); setMoveTargetListId(otherLists[0]?.id ?? ''); setOpenMenuId(null); }, del: false }] : []),
                                        ...(canDeleteTask ? [{ icon: Trash2, label: 'Delete task', action: () => void handleDeleteTask(task.id), del: true }] : []),
                                      ];
                                    })().map(({ icon: Icon, label, action, del }) => (
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
            if (task.approvalStatus === 'PENDING') {
              showToast('Task created and submitted for approval.');
            }
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
          onClose={() => { setSelectedTaskId(null); setHighlightedFileId(null); }}
          onUpdated={(updated) => { setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))); }}
          onDeleted={() => { setTasks((prev) => prev.filter((t) => t.id !== selectedTaskId)); setSelectedTaskId(null); }}
          externalUpdateKey={taskUpdateKeys[selectedTaskId] ?? 0}
          linkedRecordsUpdateKey={linkedRecordsUpdateKeys[selectedTaskId] ?? 0}
          highlightFileId={highlightedFileId ?? undefined} />
      )}

      {/* ── Delete Task Confirmation Modal ───────────────────────────────────── */}
      {deleteTaskModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--state-error)' }}>Permanently Delete Task</h3>
              <button type="button" onClick={() => setDeleteTaskModalId(null)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              This action is <strong>irreversible</strong>. The task and its comments will be permanently removed.
              Tasks with subtasks, file attachments, or linked records cannot be deleted.
            </p>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteTaskConfirmText}
              onChange={(e) => setDeleteTaskConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mb-4 w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTaskModalId(null)}
                className="rounded-lg border px-4 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button type="button"
                disabled={deleteTaskConfirmText !== 'DELETE' || deleteTaskLoading}
                onClick={() => void handleConfirmDeleteTask()}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--state-error)' }}>
                {deleteTaskLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Task List Confirmation Modal ───────────────────────────────── */}
      {deleteListModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--state-error)' }}>Permanently Delete Task List</h3>
              <button type="button" onClick={() => setDeleteListModalId(null)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              This action is <strong>irreversible</strong>. The task list will be permanently removed.
              Task lists that still contain tasks cannot be deleted — move or delete all tasks first.
            </p>
            <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteListConfirmText}
              onChange={(e) => setDeleteListConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mb-4 w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteListModalId(null)}
                className="rounded-lg border px-4 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button type="button"
                disabled={deleteListConfirmText !== 'DELETE' || deleteListLoading}
                onClick={() => void handleConfirmDeleteTaskList()}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--state-error)' }}>
                {deleteListLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Department Modal ───────────────────────────────────────────── */}
      {showAssignDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Assign Department</h3>
              <button type="button" onClick={() => setShowAssignDeptModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Assigning a department links this workspace to a specific department for reporting, filtering, and operational status tracking.
              This does not automatically add department members to the workspace.
            </p>
            <form onSubmit={(e) => void handleAssignDepartment(e)} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Department *</label>
                <select required value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                  <option value="">Select a department…</option>
                  {availableDepts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              {assignDeptError && (
                <p className="text-xs" style={{ color: 'var(--state-error)' }}>{assignDeptError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAssignDeptModal(false)}
                  className="rounded-lg border px-4 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" disabled={assignDeptLoading || !selectedDeptId}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  {assignDeptLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Assign Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
