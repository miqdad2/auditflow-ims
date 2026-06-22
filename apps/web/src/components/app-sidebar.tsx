'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  FileText,
  AlertTriangle,
  Bell,
  BarChart2,
  Settings,
  Users,
  Activity,
  Bug,
  Building2,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// Business-elevated: full workspace/doc/task/NCR access; no technical admin
const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
// Department roles: see most things except admin panel
const DEPT_ROLES = ['DEPARTMENT_MANAGER', 'DEPARTMENT_USER'];
// Technical admin roles: see Admin Settings, System Health, Error Logs
const ADMIN_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];
// Business power-user: sees User Management + Departments, but NOT technical admin pages
const BUSINESS_ADMIN_ROLES = ['SUPER_USER'];
// Action Center: Super User and Super Admin daily control page
const ACTION_CENTER_ROLES = ['SUPER_USER', 'SUPER_ADMIN'];

const ALL_NAV = [
  { label: 'Dashboard',      href: '/dashboard',    icon: LayoutDashboard },
  { label: 'ISO Workspaces', href: '/workspaces',   icon: FolderOpen },
  { label: 'Tasks',          href: '/tasks',         icon: CheckSquare },
  { label: 'Documents',      href: '/documents',     icon: FileText },
  { label: 'Issues & Actions', href: '/ncr-capa',      icon: AlertTriangle },
  { label: 'Notifications',   href: '/notifications',  icon: Bell },
  { label: 'Reports',         href: '/reports',        icon: BarChart2 },
];

// STAFF and AUDITOR_VIEWER see a reduced set
const RESTRICTED_NAV = [
  { label: 'Dashboard',       href: '/dashboard',     icon: LayoutDashboard },
  { label: 'ISO Workspaces',  href: '/workspaces',    icon: FolderOpen },
  { label: 'My Tasks',        href: '/tasks',          icon: CheckSquare },
  { label: 'Notifications',  href: '/notifications',   icon: Bell },
];

// DEPARTMENT roles see most items but not reports
const DEPT_NAV = [
  { label: 'Dashboard',      href: '/dashboard',    icon: LayoutDashboard },
  { label: 'ISO Workspaces', href: '/workspaces',   icon: FolderOpen },
  { label: 'Tasks',          href: '/tasks',         icon: CheckSquare },
  { label: 'Documents',      href: '/documents',     icon: FileText },
  { label: 'Issues & Actions', href: '/ncr-capa',      icon: AlertTriangle },
  { label: 'Notifications',   href: '/notifications',  icon: Bell },
];

function getInitials(name: string | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

function NavItem({ href, icon: Icon, label, active }: {
  href: string;
  icon: typeof FolderOpen;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: active ? 'var(--sidebar-active)' : 'transparent',
          color: active ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
          boxShadow: active ? 'inset 3px 0 0 var(--sidebar-text)' : 'none',
        }}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </Link>
    </li>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const roles = user?.roles ?? [];
  const isElevated = roles.some((r) => ELEVATED_ROLES.includes(r));
  const isDept = roles.some((r) => DEPT_ROLES.includes(r));
  const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isBusinessAdmin = roles.some((r) => BUSINESS_ADMIN_ROLES.includes(r));
  const canAccessActionCenter = roles.some((r) => ACTION_CENTER_ROLES.includes(r));
  // User Management: SUPER_ADMIN, IT_ADMIN, SUPER_USER
  const canManageUsers = isAdmin || isBusinessAdmin;
  // Departments: SUPER_ADMIN and SUPER_USER only — IT_ADMIN manages system, not business master data
  const canManageDepts = isSuperAdmin || isBusinessAdmin;
  const displayName = user?.fullName ?? 'User';

  const navItems = isElevated
    ? ALL_NAV
    : isDept
      ? DEPT_NAV
      : RESTRICTED_NAV; // STAFF, AUDITOR_VIEWER

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col"
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      {/* Brand */}
      <div
        className="flex h-16 shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md p-1.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <div className="relative h-full w-full">
            <Image
              src="/recafco-logo.png"
              alt="RECAFCO"
              fill
              className="object-contain"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.style.display = 'none';
                const fb = t.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }}
            />
            <div
              className="absolute inset-0 hidden items-center justify-center rounded-sm text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--sidebar-active)' }}
            >
              R
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-base font-semibold leading-tight"
            style={{ color: 'var(--sidebar-text)' }}
          >
            AuditFlow IMS
          </p>
          <p className="truncate text-xs leading-tight" style={{ color: 'var(--brand-red)' }}>
            RECAFCO
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ label, href, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <NavItem key={href} href={href} icon={icon} label={label} active={active} />;
          })}

          {/* Action Center: SUPER_USER, SUPER_ADMIN */}
          {canAccessActionCenter && (
            <li>
              <NavItem
                href="/action-center"
                icon={Zap}
                label="Action Center"
                active={pathname.startsWith('/action-center')}
              />
            </li>
          )}

          {/* User Management: SUPER_ADMIN, IT_ADMIN, SUPER_USER */}
          {canManageUsers && (
            <li className="mt-2">
              <NavItem
                href="/users"
                icon={Users}
                label="User Management"
                active={pathname.startsWith('/users')}
              />
            </li>
          )}

          {/* Departments: SUPER_ADMIN, IT_ADMIN, SUPER_USER */}
          {canManageDepts && (
            <li>
              <NavItem
                href="/departments"
                icon={Building2}
                label="Departments"
                active={pathname.startsWith('/departments')}
              />
            </li>
          )}

          {/* Technical admin pages: SUPER_ADMIN, IT_ADMIN only */}
          {isAdmin && (
            <>
              <li>
                <NavItem
                  href="/admin/settings"
                  icon={Settings}
                  label="Admin Settings"
                  active={pathname === '/admin/settings'}
                />
              </li>
              <li>
                <NavItem
                  href="/admin/system-health"
                  icon={Activity}
                  label="System Health"
                  active={pathname === '/admin/system-health'}
                />
              </li>
              <li>
                <NavItem
                  href="/admin/system-errors"
                  icon={Bug}
                  label="System Errors"
                  active={pathname === '/admin/system-errors'}
                />
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* User area */}
      <div
        className="shrink-0 px-3 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center gap-3 rounded-lg px-2 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--sidebar-active)' }}
          >
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium leading-tight"
              style={{ color: 'var(--sidebar-text)' }}
            >
              {displayName}
            </p>
            <p
              className="truncate text-xs leading-tight"
              style={{ color: 'var(--sidebar-muted)' }}
            >
              {roles[0] ?? ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
