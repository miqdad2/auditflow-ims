'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, ChevronDown, WifiOff, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet } from '@/lib/api';
import { useSocket } from '@/lib/socket-provider';
import { useState, useEffect, useCallback, useRef } from 'react';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const { socket, connected, reconnecting, isConnecting } = useSocket();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Dedup: track notification IDs already counted in the badge this session
  const seenBadgeIds = useRef<Set<string>>(new Set());
  const prevConnected = useRef(false);

  const currentPageTitle = title ?? getHeaderTitle(pathname);

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet<{ count: number }>('/notifications/unread-count', token);
      setUnreadCount(data.count);
    } catch { /* non-critical */ }
  }, [token]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Refetch unread count from backend on socket reconnect (Part 4 + Part 13)
  // This reconciles any notifications that arrived while disconnected.
  useEffect(() => {
    if (connected && !prevConnected.current) {
      void fetchUnread();
    }
    prevConnected.current = connected;
  }, [connected, fetchUnread]);

  // Live badge increment — deduplicated by notification ID (Part 12)
  useEffect(() => {
    if (!socket) return;
    const handler = (data: unknown) => {
      const notif = data as { id?: string };
      if (!notif?.id) {
        setUnreadCount((c) => c + 1);
        return;
      }
      if (seenBadgeIds.current.has(notif.id)) return;
      seenBadgeIds.current.add(notif.id);
      // Auto-expire entry after 60s to prevent unbounded memory growth
      setTimeout(() => seenBadgeIds.current.delete(notif.id!), 60_000);
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification.created', handler);
    return () => { socket.off('notification.created', handler); };
  }, [socket]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header
      className="fixed right-0 left-60 top-0 z-20 flex h-14 items-center justify-between px-6"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>AuditFlow IMS</span>
          <span>/</span>
          <span className="truncate">{currentPageTitle}</span>
        </div>
        <h2 className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {currentPageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Connection status — hidden during initial connection attempt to avoid flickering */}
        {token && !connected && !isConnecting && (
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)' }}
          >
            {reconnecting ? (
              <><RefreshCw className="h-3 w-3 animate-spin" /> Reconnecting…</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Disconnected</>
            )}
          </div>
        )}

        {/* Notification bell with badge */}
        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: 'var(--state-error)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--sidebar-bg)' }}
            >
              {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <span className="hidden sm:block">{user?.fullName ?? 'User'}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 shadow-lg"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div
                className="px-3 py-2 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {user?.email}
              </div>
              <div style={{ borderTop: '1px solid var(--border-default)' }} className="my-1" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                style={{ color: 'var(--state-error)' }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function getHeaderTitle(pathname: string): string {
  if (pathname.startsWith('/executive-dashboard')) return 'Executive Dashboard';
  if (pathname.startsWith('/workspaces')) return 'ISO Workspaces';
  if (pathname.startsWith('/tasks')) return 'Tasks';
  if (pathname.startsWith('/documents')) return 'Document Library';
  if (pathname.startsWith('/checklist')) return 'Audit Checklist';
  if (pathname.startsWith('/evidence')) return 'Evidence Review';
  if (pathname.startsWith('/ncr-capa')) return 'NCR / CAPA';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/departments')) return 'Departments';
  if (pathname.startsWith('/users')) return 'User Management';
  if (pathname.startsWith('/admin')) return 'Admin Settings';
  return 'Dashboard';
}
