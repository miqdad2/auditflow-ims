'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Loader2, Users, CheckCircle2, XCircle,
  MoreHorizontal, RefreshCw, KeyRound, UserCheck, UserX,
  FolderOpen, ExternalLink, Trash2, X, ShieldCheck, Shield, User,
  AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { apiGet, apiPostAuth, apiPatchAuth, apiDeleteAuth } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role { id: string; name: string; displayName: string; }
interface Department { id: string; name: string; code: string; }
interface UserWorkspaceMembership {
  id: string;
  roleInWorkspace: string;
  createdAt: string;
  workspace: { id: string; name: string; status: string; visibility: string; };
}
interface WorkspaceOption { id: string; name: string; status: string; }
interface UserRow {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  department: { id: string; name: string; code: string } | null;
  userRoles: Array<{ role: Role }>;
}

// ─── Access model helpers ────────────────────────────────────────────────────

// Internal role names that map to simplified access levels
const ACCESS_TO_ROLE: Record<string, string> = {
  NORMAL_USER: 'STAFF',
  SUPER_USER:  'SUPER_USER',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

// Display config per access level
const ACCESS_CONFIG: Record<string, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Full technical and business control including Admin Settings.',
    icon: ShieldCheck,
    color: 'var(--state-error)',
    bg: 'var(--state-error-soft)',
  },
  SUPER_USER: {
    label: 'Super User',
    description: 'Full business access across all workspaces. Cannot access technical admin pages.',
    icon: Shield,
    color: 'var(--accent-primary)',
    bg: 'var(--accent-soft)',
  },
  NORMAL_USER: {
    label: 'Normal User',
    description: 'Can work inside assigned workspaces based on workspace role.',
    icon: User,
    color: 'var(--text-muted)',
    bg: 'var(--bg-muted)',
  },
};

// Derive simplified access level from a user's roles
function getAccessLevel(userRoles: Array<{ role: Role }>): string {
  const names = userRoles.map((ur) => ur.role.name);
  if (names.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (names.includes('SUPER_USER'))  return 'SUPER_USER';
  return 'NORMAL_USER';
}

// Workspace role descriptions
const WS_ROLE_DESCRIPTIONS: Record<string, string> = {
  VIEWER:  'Read-only access',
  MEMBER:  'Create/update tasks, upload documents, raise issues',
  MANAGER: 'Manage workspace work and members',
  OWNER:   'Full workspace control',
};

// ─── Staged workspace row type (for create modal) ────────────────────────────

interface StagedWsRow {
  key: string;       // unique local key
  wsId: string;
  wsName: string;
  wsRole: string;
}

// ─── Form defaults ────────────────────────────────────────────────────────────

const BLANK_CREATE = {
  email: '',
  fullName: '',
  username: '',
  departmentId: '',
  systemAccess: 'NORMAL_USER',
  temporaryPassword: '',
};

const BLANK_EDIT = {
  fullName: '',
  departmentId: '',
  systemAccess: 'NORMAL_USER',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers]             = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles]             = useState<Role[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterDept, setFilterDept]   = useState('');
  const [filterAccess, setFilterAccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create modal
  const [showCreate, setShowCreate]     = useState(false);
  const [createForm, setCreateForm]     = useState({ ...BLANK_CREATE });
  const [createError, setCreateError]   = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');
  // Staged workspace assignments (pre-creation)
  const [stagedWs, setStagedWs]         = useState<StagedWsRow[]>([]);
  const [showStagedWsAdd, setShowStagedWsAdd] = useState(false);
  const [stagedWsPickId, setStagedWsPickId]   = useState('');
  const [stagedWsPickRole, setStagedWsPickRole] = useState('MEMBER');
  const [allWorkspaces, setAllWorkspaces]     = useState<WorkspaceOption[]>([]);
  const wsKeyRef = useRef(0);
  const rolesRef = useRef<Role[]>([]); // stable ref so loadData can read roles without depending on them

  // Edit modal
  const [editUser, setEditUser]     = useState<UserRow | null>(null);
  const [editForm, setEditForm]     = useState({ ...BLANK_EDIT });
  const [editError, setEditError]   = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editUserWorkspaces, setEditUserWorkspaces] = useState<UserWorkspaceMembership[]>([]);
  const [editUserWsLoading, setEditUserWsLoading]   = useState(false);
  // Add-to-workspace within edit
  const [showAddWsForm, setShowAddWsForm] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceOption[]>([]);
  const [wsPickId, setWsPickId]       = useState('');
  const [wsPickRole, setWsPickRole]   = useState('MEMBER');
  const [wsPickLoading, setWsPickLoading] = useState(false);
  const [wsPickError, setWsPickError] = useState('');
  const [wsRoleLoading, setWsRoleLoading]   = useState<string | null>(null);
  const [wsRemoveLoading, setWsRemoveLoading] = useState<string | null>(null);

  const [actionMenu, setActionMenu] = useState<string | null>(null);
  // Reset password dialog state
  const [resetTarget, setResetTarget]   = useState<UserRow | null>(null);
  const [resetPw, setResetPw]           = useState('');
  const [showResetPw, setShowResetPw]   = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]     = useState('');

  // ── Permissions ───────────────────────────────────────────────────────────

  const canManage = user?.permissions?.includes('users.manage') ?? false;
  const actorRoles = user?.roles ?? [];
  const actorIsSuperAdmin = actorRoles.includes('SUPER_ADMIN');
  // Plain Super User: has SUPER_USER role but is not Super Admin or IT Admin
  const actorIsSuperUserOnly = actorRoles.includes('SUPER_USER') && !actorIsSuperAdmin && !actorRoles.includes('IT_ADMIN');

  // What system access options can this actor grant?
  const allowedAccessOptions = [
    { value: 'NORMAL_USER', label: 'Normal User' },
    // SUPER_USER actors cannot create or promote to Super User — backend blocks it too
    ...(!actorIsSuperUserOnly ? [{ value: 'SUPER_USER', label: 'Super User' }] : []),
    ...(actorIsSuperAdmin ? [{ value: 'SUPER_ADMIN', label: 'Super Admin' }] : []),
  ];

  // ── Data loading ──────────────────────────────────────────────────────────

  // Load roles + departments once on mount (stable — not part of the filter loop)
  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiGet<Role[]>('/roles', token),
      apiGet<Department[]>('/departments', token),
    ]).then(([rolesData, deptsData]) => {
      rolesRef.current = rolesData;
      setRoles(rolesData);
      setDepartments(deptsData);
    }).catch(() => {});
  }, [token]);

  // loadData only fetches the user list — no roles in deps, preventing the infinite loop
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search', search);
      if (filterDept)   params.set('departmentId', filterDept);
      if (filterStatus) params.set('isActive', filterStatus);

      // Map filterAccess → internal role ID using stable ref (not state)
      if (filterAccess) {
        const internalName = ACCESS_TO_ROLE[filterAccess];
        const matched = rolesRef.current.find((r) => r.name === internalName);
        if (matched) params.set('roleId', matched.id);
      }

      const usersData = await apiGet<UserRow[]>(`/users?${params.toString()}`, token);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, search, filterDept, filterStatus, filterAccess]); // roles deliberately excluded

  useEffect(() => { void loadData(); }, [loadData]);

  // Load workspaces for both create + edit pickers
  const loadWorkspaces = useCallback(async () => {
    if (!token) return;
    const data = await apiGet<WorkspaceOption[]>('/workspaces', token).catch(() => []);
    setAllWorkspaces(data.filter((w) => w.status === 'ACTIVE'));
  }, [token]);

  // ── Create handler ────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (createForm.temporaryPassword.length < 3) {
      setCreateError('Temporary password must be at least 3 characters.');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');
    try {
      const internalRoleName = ACCESS_TO_ROLE[createForm.systemAccess] ?? 'STAFF';
      const targetRole = roles.find((r) => r.name === internalRoleName);

      const createdUser = await apiPostAuth<UserRow>('/users', {
        email:            createForm.email,
        fullName:         createForm.fullName,
        username:         createForm.username || undefined,
        departmentId:     createForm.departmentId || undefined,
        roleIds:          targetRole ? [targetRole.id] : [],
        temporaryPassword: createForm.temporaryPassword,
        isActive:         true,
      }, token);

      // Add staged workspace memberships
      const failed: string[] = [];
      for (const ws of stagedWs) {
        try {
          await apiPostAuth(`/workspaces/${ws.wsId}/members`, {
            userId: createdUser.id, roleInWorkspace: ws.wsRole,
          }, token);
        } catch {
          failed.push(ws.wsName);
        }
      }

      setShowCreate(false);
      setCreateForm({ ...BLANK_CREATE });
      setStagedWs([]);
      setShowStagedWsAdd(false);

      if (stagedWs.length > 0 && failed.length === 0) {
        showToast('User created and workspace access assigned.');
      } else if (stagedWs.length === 0) {
        showToast('User created. No workspace access assigned yet.');
      } else {
        showToast(`User created. Some workspace assignments failed: ${failed.join(', ')}`);
      }

      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Edit handler ──────────────────────────────────────────────────────────

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editUser) return;
    setEditLoading(true);
    setEditError('');
    try {
      const internalRoleName = ACCESS_TO_ROLE[editForm.systemAccess] ?? 'STAFF';
      const targetRole = roles.find((r) => r.name === internalRoleName);

      await apiPatchAuth(`/users/${editUser.id}`, {
        fullName:     editForm.fullName,
        departmentId: editForm.departmentId || undefined,
        roleIds:      targetRole ? [targetRole.id] : [],
      }, token);
      setEditUser(null);
      showToast('User updated');
      await loadData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  }

  // ── Status + password ────────────────────────────────────────────────────

  async function handleToggleStatus(u: UserRow) {
    if (!token) return;
    try {
      await apiPatchAuth(`/users/${u.id}/status`, { isActive: !u.isActive }, token);
      showToast(u.isActive ? 'User deactivated' : 'User reactivated');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status');
    }
    setActionMenu(null);
  }

  function handleResetPassword(u: UserRow) {
    setResetTarget(u);
    setResetPw('');
    setShowResetPw(false);
    setResetError('');
    setActionMenu(null);
  }

  async function submitReset() {
    if (!token || !resetTarget) return;
    if (resetPw.length < 3) {
      setResetError('Temporary password must be at least 3 characters.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await apiPostAuth<{ message: string }>(
        `/users/${resetTarget.id}/reset-password`,
        { temporaryPassword: resetPw },
        token,
      );
      setResetTarget(null);
      showToast('Password has been reset. The user must change it at next login.');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  }

  // ── Edit workspace membership ─────────────────────────────────────────────

  function refreshUserWorkspaces(userId: string) {
    if (!token) return;
    setEditUserWsLoading(true);
    apiGet<UserWorkspaceMembership[]>(`/users/${userId}/workspaces`, token)
      .then(setEditUserWorkspaces)
      .catch(() => setEditUserWorkspaces([]))
      .finally(() => setEditUserWsLoading(false));
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditForm({
      fullName:     u.fullName,
      departmentId: u.department?.id ?? '',
      systemAccess: getAccessLevel(u.userRoles),
    });
    setEditError('');
    setActionMenu(null);
    setEditUserWorkspaces([]);
    setShowAddWsForm(false);
    setWsPickError('');
    refreshUserWorkspaces(u.id);
  }

  function openAddWsForm() {
    setWsPickId('');
    setWsPickRole('MEMBER');
    setWsPickError('');
    setShowAddWsForm(true);
    if (!token) return;
    apiGet<WorkspaceOption[]>('/workspaces', token)
      .then((data) => setAvailableWorkspaces(data.filter((w) => w.status === 'ACTIVE')))
      .catch(() => setAvailableWorkspaces([]));
  }

  async function handleAddToWorkspace() {
    if (!token || !editUser || !wsPickId) return;
    setWsPickLoading(true);
    setWsPickError('');
    try {
      await apiPostAuth(
        `/workspaces/${wsPickId}/members`,
        { userId: editUser.id, roleInWorkspace: wsPickRole },
        token,
      );
      setShowAddWsForm(false);
      setWsPickId('');
      setWsPickRole('MEMBER');
      refreshUserWorkspaces(editUser.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add to workspace';
      setWsPickError(msg.toLowerCase().includes('already') ? 'This user is already a member of that workspace.' : msg);
    } finally {
      setWsPickLoading(false);
    }
  }

  async function handleChangeWsRole(membership: UserWorkspaceMembership, newRole: string) {
    if (!token || !editUser) return;
    setWsRoleLoading(membership.id);
    try {
      await apiPatchAuth(
        `/workspaces/${membership.workspace.id}/members/${membership.id}`,
        { roleInWorkspace: newRole },
        token,
      );
      refreshUserWorkspaces(editUser.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update workspace role');
    } finally {
      setWsRoleLoading(null);
    }
  }

  async function handleRemoveFromWs(membership: UserWorkspaceMembership) {
    if (!token || !editUser) return;
    if (!confirm(`Remove ${editUser.fullName} from "${membership.workspace.name}"?`)) return;
    setWsRemoveLoading(membership.id);
    try {
      await apiDeleteAuth(
        `/workspaces/${membership.workspace.id}/members/${membership.id}`,
        token,
      );
      refreshUserWorkspaces(editUser.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove from workspace');
    } finally {
      setWsRemoveLoading(null);
    }
  }

  // ── Staged workspace helpers (create modal) ───────────────────────────────

  function openStagedWsAdd() {
    setStagedWsPickId('');
    setStagedWsPickRole('MEMBER');
    setShowStagedWsAdd(true);
    void loadWorkspaces();
  }

  function addStagedWsRow() {
    if (!stagedWsPickId) return;
    const ws = allWorkspaces.find((w) => w.id === stagedWsPickId);
    if (!ws) return;
    wsKeyRef.current += 1;
    setStagedWs((prev) => [
      ...prev,
      { key: String(wsKeyRef.current), wsId: stagedWsPickId, wsName: ws.name, wsRole: stagedWsPickRole },
    ]);
    setStagedWsPickId('');
    setStagedWsPickRole('MEMBER');
    setShowStagedWsAdd(false);
  }

  function removeStagedWsRow(key: string) {
    setStagedWs((prev) => prev.filter((r) => r.key !== key));
  }

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!canManage) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <XCircle className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Access Denied</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You do not have permission to manage users.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>User Management</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage users, their system access, and workspace assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadData()}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button type="button"
            onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess(''); setCreateForm({ ...BLANK_CREATE }); setStagedWs([]); setShowStagedWsAdd(false); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}>
            <Plus className="h-4 w-4" /> New User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by name, email, username…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border py-1.5 pl-8 pr-3 text-sm"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)}
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          <option value="">All Access Levels</option>
          <option value="NORMAL_USER">Normal User</option>
          {!actorIsSuperUserOnly && <option value="SUPER_USER">Super User</option>}
          {actorIsSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Users className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No users found</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Name', 'Email', 'Department', 'System Access', 'Status', 'Last Login', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const access = getAccessLevel(u.userRoles);
                const cfg = ACCESS_CONFIG[access];
                const AccessIcon = cfg.icon;
                return (
                  <tr key={u.id} className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: 'var(--accent-primary)' }}>
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.fullName}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {u.department?.name ?? <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        <AccessIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: u.isActive ? 'var(--state-success-soft)' : 'var(--state-error-soft)',
                          color: u.isActive ? 'var(--state-success)' : 'var(--state-error)',
                        }}>
                        {u.isActive ? <><CheckCircle2 className="h-3 w-3" /> Active</> : <><XCircle className="h-3 w-3" /> Inactive</>}
                      </span>
                      {u.mustChangePassword && (
                        <span className="ml-1 text-[10px]" style={{ color: 'var(--state-warning)' }}>pw reset req.</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button type="button" onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                          className="rounded p-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === u.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border shadow-lg"
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                            <button type="button" onClick={() => openEdit(u)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              Edit User
                            </button>
                            <button type="button" onClick={() => void handleResetPassword(u)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <KeyRound className="h-3.5 w-3.5" /> Reset Password
                            </button>
                            <button type="button" onClick={() => void handleToggleStatus(u)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                              style={{ color: u.isActive ? 'var(--state-error)' : 'var(--state-success)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              {u.isActive ? <><UserX className="h-3.5 w-3.5" /> Deactivate</> : <><UserCheck className="h-3.5 w-3.5" /> Reactivate</>}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Click-outside to close action menu */}
      {actionMenu && <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />}

      {/* ── Create User Modal ──────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-xl border shadow-xl p-6 mx-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Create New User</h2>
              <button type="button" onClick={() => setShowCreate(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-4">
              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                  <input required type="text" value={createForm.fullName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Email *</label>
                  <input required type="email" value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Username (optional)</label>
                  <input type="text" value={createForm.username}
                    onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Temporary Password *</label>
                  <input required type="text" value={createForm.temporaryPassword}
                    onChange={(e) => setCreateForm((p) => ({ ...p, temporaryPassword: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Minimum 3 characters. The user must change this password at first login.
                  </p>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Department</label>
                <select value={createForm.departmentId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                  <option value="">No Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* System Access */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Access</label>
                <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  System Access controls whether this user is a normal workspace user, business super user, or full system administrator.
                </p>
                <div className="flex flex-col gap-2">
                  {allowedAccessOptions.map(({ value, label }) => {
                    const cfg = ACCESS_CONFIG[value];
                    const Icon = cfg.icon;
                    const selected = createForm.systemAccess === value;
                    return (
                      <label key={value}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                        style={{
                          borderColor: selected ? 'var(--accent-primary)' : 'var(--border-default)',
                          backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                        }}>
                        <input type="radio" name="systemAccess" value={value} checked={selected}
                          onChange={() => setCreateForm((p) => ({ ...p, systemAccess: value }))}
                          className="mt-0.5 accent-blue-600" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                          </div>
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{cfg.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Access */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Workspace Access</label>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Workspace Access controls which workspaces this user can open.
                      {createForm.systemAccess !== 'NORMAL_USER' && (
                        <span> Super User and Super Admin can access all workspaces automatically.</span>
                      )}
                    </p>
                  </div>
                  {!showStagedWsAdd && (
                    <button type="button" onClick={openStagedWsAdd}
                      className="flex shrink-0 items-center gap-1 text-xs font-medium"
                      style={{ color: 'var(--accent-primary)' }}>
                      <Plus className="h-3 w-3" />
                      {stagedWs.length === 0 ? 'Add workspace' : 'Add another'}
                    </button>
                  )}
                </div>

                {/* Add workspace inline form */}
                {showStagedWsAdd && (
                  <div className="mb-2 rounded-lg border p-3"
                    style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Add Workspace</p>
                      <button type="button" onClick={() => setShowStagedWsAdd(false)} style={{ color: 'var(--text-muted)' }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <select value={stagedWsPickId} onChange={(e) => setStagedWsPickId(e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border px-2 py-1.5 text-xs"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        <option value="">Select workspace…</option>
                        {allWorkspaces
                          .filter((w) => !stagedWs.some((s) => s.wsId === w.id))
                          .map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <select value={stagedWsPickRole} onChange={(e) => setStagedWsPickRole(e.target.value)}
                        className="w-28 shrink-0 rounded-lg border px-2 py-1.5 text-xs"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        <option value="VIEWER">Viewer</option>
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      <button type="button" disabled={!stagedWsPickId} onClick={addStagedWsRow}
                        className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--accent-primary)' }}>
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                    {/* Role description */}
                    {stagedWsPickRole && (
                      <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <strong>Workspace Role:</strong> {WS_ROLE_DESCRIPTIONS[stagedWsPickRole]}
                      </p>
                    )}
                  </div>
                )}

                {/* Staged list */}
                {stagedWs.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {stagedWs.map((row) => (
                      <div key={row.key}
                        className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                        <span className="flex-1 truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{row.wsName}</span>
                        <span className="text-[10px] rounded px-1.5 py-0.5"
                          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                          {row.wsRole.charAt(0) + row.wsRole.slice(1).toLowerCase()}
                        </span>
                        <button type="button" onClick={() => removeStagedWsRow(row.key)} style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* No workspace warning */}
                {stagedWs.length === 0 && createForm.systemAccess === 'NORMAL_USER' && !showStagedWsAdd && (
                  <div className="mt-1 flex items-start gap-2 rounded-lg border px-3 py-2"
                    style={{ borderColor: 'var(--state-warning)', backgroundColor: 'var(--state-warning-soft)' }}>
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--state-warning)' }} />
                    <p className="text-xs" style={{ color: 'var(--state-warning)' }}>
                      This user will not see any workspace until workspace access is assigned.
                    </p>
                  </div>
                )}
              </div>

              {createError && <p className="text-sm" style={{ color: 'var(--state-error)' }}>{createError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-4 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" disabled={createLoading}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {stagedWs.length > 0 ? `Create & Assign ${stagedWs.length} Workspace${stagedWs.length > 1 ? 's' : ''}` : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ────────────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-xl border shadow-xl p-6 mx-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Edit User: {editUser.fullName}</h2>
              <button type="button" onClick={() => setEditUser(null)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleEdit(e)} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                <input required type="text" value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Department</label>
                <select value={editForm.departmentId}
                  onChange={(e) => setEditForm((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                  <option value="">No Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* System Access */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Access</label>
                <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  System Access controls whether this user is a normal workspace user, business super user, or full system administrator.
                </p>
                <div className="flex flex-col gap-2">
                  {allowedAccessOptions.map(({ value, label }) => {
                    const cfg = ACCESS_CONFIG[value];
                    const Icon = cfg.icon;
                    const selected = editForm.systemAccess === value;
                    return (
                      <label key={value}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                        style={{
                          borderColor: selected ? 'var(--accent-primary)' : 'var(--border-default)',
                          backgroundColor: selected ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                        }}>
                        <input type="radio" name="editSystemAccess" value={value} checked={selected}
                          onChange={() => setEditForm((p) => ({ ...p, systemAccess: value }))}
                          className="mt-0.5 accent-blue-600" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                          </div>
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{cfg.description}</p>
                        </div>
                      </label>
                    );
                  })}
                  {/* If user currently has SUPER_ADMIN but actor cannot assign it, show as locked */}
                  {!actorIsSuperAdmin && getAccessLevel(editUser.userRoles) === 'SUPER_ADMIN' && (
                    <div className="flex items-start gap-3 rounded-lg border p-3"
                      style={{ borderColor: 'var(--state-error)', backgroundColor: 'var(--state-error-soft)' }}>
                      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--state-error)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--state-error)' }}>Super Admin (read-only)</p>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--state-error)' }}>
                          Only a Super Admin can change another Super Admin&apos;s access.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {editError && <p className="text-sm" style={{ color: 'var(--state-error)' }}>{editError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditUser(null)}
                  className="rounded-lg border px-4 py-1.5 text-sm"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" disabled={editLoading || (!actorIsSuperAdmin && getAccessLevel(editUser.userRoles) === 'SUPER_ADMIN')}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent-primary)' }}>
                  {editLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>

            {/* Workspace Access section */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Workspace Access</p>
                </div>
                {!showAddWsForm && (
                  <button type="button" onClick={openAddWsForm}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: 'var(--accent-primary)' }}>
                    <Plus className="h-3 w-3" />
                    {editUserWorkspaces.length === 0 ? 'Add to Workspace' : 'Add another'}
                  </button>
                )}
              </div>
              <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                Workspace Access controls which workspaces this user can open.
              </p>

              {/* Add-to-workspace inline form */}
              {showAddWsForm && (
                <div className="mb-3 rounded-lg border p-3"
                  style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'rgba(37,99,235,0.05)' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Add to Workspace</p>
                    <button type="button" onClick={() => setShowAddWsForm(false)} style={{ color: 'var(--text-muted)' }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select value={wsPickId} onChange={(e) => setWsPickId(e.target.value)}
                      className="flex-1 min-w-0 rounded-lg border px-2 py-1.5 text-xs"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                      <option value="">Select workspace…</option>
                      {availableWorkspaces
                        .filter((w) => !editUserWorkspaces.some((m) => m.workspace.id === w.id))
                        .map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <select value={wsPickRole} onChange={(e) => setWsPickRole(e.target.value)}
                      className="w-28 shrink-0 rounded-lg border px-2 py-1.5 text-xs"
                      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                      <option value="VIEWER">Viewer</option>
                      <option value="MEMBER">Member</option>
                      <option value="MANAGER">Manager</option>
                      <option value="OWNER">Owner</option>
                    </select>
                    <button type="button" disabled={!wsPickId || wsPickLoading}
                      onClick={() => void handleAddToWorkspace()}
                      className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent-primary)' }}>
                      {wsPickLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add
                    </button>
                  </div>
                  {wsPickRole && (
                    <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <strong>Workspace Role:</strong> {WS_ROLE_DESCRIPTIONS[wsPickRole]}
                    </p>
                  )}
                  {wsPickError && <p className="mt-1.5 text-xs" style={{ color: 'var(--state-error)' }}>{wsPickError}</p>}
                </div>
              )}

              {/* Membership list */}
              {editUserWsLoading ? (
                <div className="flex items-center gap-2 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : editUserWorkspaces.length === 0 ? (
                <p className="py-1 text-xs" style={{ color: 'var(--text-disabled)' }}>Not a member of any workspace.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {editUserWorkspaces.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                      <span className="flex-1 truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.workspace.name}</span>
                      {m.workspace.status === 'ARCHIVED' && (
                        <span className="shrink-0 rounded px-1 py-0.5 text-[10px]" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-disabled)' }}>Archived</span>
                      )}
                      <select value={m.roleInWorkspace} disabled={wsRoleLoading === m.id}
                        onChange={(e) => void handleChangeWsRole(m, e.target.value)}
                        className="shrink-0 rounded border px-1.5 py-0.5 text-[10px]"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                        title="Change workspace role">
                        <option value="VIEWER">Viewer</option>
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      {wsRoleLoading === m.id && <Loader2 className="h-3 w-3 shrink-0 animate-spin" style={{ color: 'var(--text-muted)' }} />}
                      <Link href={`/workspaces/${m.workspace.id}`} className="shrink-0"
                        title="Go to workspace" onClick={() => setEditUser(null)} style={{ color: 'var(--text-muted)' }}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <button type="button" disabled={wsRemoveLoading === m.id}
                        onClick={() => void handleRemoveFromWs(m)} title="Remove from workspace"
                        className="shrink-0" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        {wsRemoveLoading === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Dialog ──────────────────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-xl border shadow-xl p-6"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
              </div>
              <button type="button" onClick={() => setResetTarget(null)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              Set a temporary password for <strong style={{ color: 'var(--text-primary)' }}>{resetTarget.fullName}</strong>.
              They must change it at next login.
            </p>
            <div className="mb-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Temporary Password *</div>
            <div className="relative mb-1">
              <input
                type={showResetPw ? 'text' : 'password'}
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="e.g. 123"
                className="w-full rounded-lg border px-3 py-2 pr-10 text-sm"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') void submitReset(); }}
              />
              <button type="button" onClick={() => setShowResetPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showResetPw ? 'Hide password' : 'Show password'}>
                {showResetPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mb-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Minimum 3 characters. The user must change this password at next login.
            </p>
            {resetError && (
              <p className="mb-3 text-sm" style={{ color: 'var(--state-error)' }}>{resetError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetTarget(null)}
                className="rounded-lg border px-4 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button type="button" onClick={() => void submitReset()} disabled={resetLoading}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                {resetLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {createSuccess && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg"
          style={{ borderColor: 'var(--state-success)', backgroundColor: 'var(--state-success-soft)', color: 'var(--state-success)' }}>
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">{createSuccess}</span>
        </div>
      )}
    </div>
  );
}
