'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Building2, Users, FolderOpen, ShieldCheck, Info } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  userRoles: Array<{ role: { name: string; displayName: string } }>;
}

interface WorkspaceRow {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'system'>('overview');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [depts, usrs, wss] = await Promise.all([
        apiGet<Department[]>('/departments', token),
        apiGet<UserRow[]>('/users', token),
        apiGet<WorkspaceRow[]>('/workspaces', token),
      ]);
      setDepartments(depts);
      setUsers(usrs);
      setWorkspaces(wss);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const activeUsers = users.filter((u) => u.isActive).length;
  const activeWorkspaces = workspaces.filter((w) => w.status === 'ACTIVE').length;

  const TABS = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'departments' as const, label: 'Departments' },
    { key: 'system' as const, label: 'System Info' },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Admin Settings</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          System configuration and reference data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-muted)', width: 'fit-content' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={users.length} sub={`${activeUsers} active`} />
                <StatCard icon={<FolderOpen className="h-5 w-5" />} label="ISO Workspaces" value={workspaces.length} sub={`${activeWorkspaces} active`} />
                <StatCard icon={<Building2 className="h-5 w-5" />} label="Departments" value={departments.length} sub="registered" />
                <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="System Status" value="Online" sub="All services operational" isText />
              </div>

              {/* Application Identity */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Application Identity</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="System Name" value="AuditFlow IMS" />
                  <InfoRow label="Organization" value="RECAFCO" />
                  <InfoRow label="Full Product Name" value="RECAFCO AuditFlow IMS" />
                  <InfoRow label="Purpose" value="Internal ISO & QHSE Audit Readiness System" />
                  <InfoRow label="Phase" value="Phase 1 — MVP" />
                  <InfoRow label="Language" value="English" />
                </div>
              </div>

              {/* Role Summary */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Users by Role</h2>
                <RoleBreakdown users={users} />
              </div>
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-default)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Departments <span className="ml-1.5 rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{departments.length}</span>
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Reference departments from the database</p>
              </div>
              {departments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16">
                  <Building2 className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No departments found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                      {['Code', 'Name', 'Description', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept, idx) => (
                      <tr
                        key={dept.id}
                        style={{
                          borderBottom: idx < departments.length - 1 ? '1px solid var(--border-default)' : 'none',
                        }}
                      >
                        <td className="px-5 py-3">
                          <span className="rounded-md px-2 py-0.5 text-xs font-mono font-medium" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                            {dept.code}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{dept.name}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{dept.description ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: dept.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.15)',
                              color: dept.isActive ? 'var(--state-success)' : 'var(--text-muted)',
                            }}
                          >
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* System Info Tab */}
          {activeTab === 'system' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Stack</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Frontend" value="Next.js 14 + TypeScript" />
                  <InfoRow label="Backend" value="NestJS + TypeScript" />
                  <InfoRow label="Database" value="PostgreSQL" />
                  <InfoRow label="ORM" value="Prisma" />
                  <InfoRow label="UI Library" value="Tailwind CSS + shadcn/ui" />
                  <InfoRow label="File Storage" value="Local server storage (MVP)" />
                  <InfoRow label="Auth" value="JWT (RS256)" />
                  <InfoRow label="Realtime" value="Socket.IO" />
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ports</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Frontend" value="http://localhost:3000" />
                  <InfoRow label="Backend API" value="http://localhost:4000" />
                  <InfoRow label="Health Check" value="http://localhost:4000/health" />
                  <InfoRow label="Database" value="PostgreSQL @ localhost:5432" />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl p-4" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This system is deployed for internal use only. File storage uses local server disk for MVP.
                  Future deployment can migrate to MinIO without changing business workflows.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}>
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function RoleBreakdown({ users }: { users: UserRow[] }) {
  const roleCounts: Record<string, { displayName: string; count: number }> = {};

  for (const u of users) {
    for (const { role } of u.userRoles) {
      if (!roleCounts[role.name]) {
        roleCounts[role.name] = { displayName: role.displayName, count: 0 };
      }
      roleCounts[role.name].count++;
    }
  }

  const entries = Object.entries(roleCounts).sort((a, b) => b[1].count - a[1].count);

  if (entries.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No users yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([name, { displayName, count }]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="w-48 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>{displayName}</span>
          <div className="flex-1 rounded-full" style={{ backgroundColor: 'var(--bg-muted)', height: 6 }}>
            <div
              className="rounded-full"
              style={{
                width: `${Math.min(100, (count / users.length) * 100)}%`,
                height: 6,
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          </div>
          <span className="w-6 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}
