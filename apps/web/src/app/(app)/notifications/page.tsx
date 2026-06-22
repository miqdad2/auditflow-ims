'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, RefreshCw, Settings2, X, Volume2, VolumeX,
  Monitor, Moon, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-provider';
import { apiGet, apiPatchAuth } from '@/lib/api';
import {
  getCategoryLabel, getCategoryStyle, getSeverityStyle, timeAgo, getCategoryGroup,
} from '@/features/notifications/notification-helpers';
import {
  loadNotificationPrefs, saveNotificationPrefs, NotificationPrefs,
  SoundPref,
} from '@/features/notifications/notification-prefs';
import {
  playTestSound,
} from '@/features/notifications/notification-sound';
import {
  requestDesktopPermission, getDesktopPermission,
} from '@/features/notifications/desktop-notifications';

// ─── Types ─────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId:   string | null;
  workspaceId: string | null;
  deepLink:   string | null;
  readAt:     string | null;
  createdAt:  string;
}

// ─── Filter definitions ─────────────────────────────────────────────────────

type FilterKey = 'all' | 'unread' | 'critical' | 'tasks' | 'documents' | 'issues' | 'expiry' | 'requests';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'unread',    label: 'Unread' },
  { key: 'critical',  label: 'Critical' },
  { key: 'tasks',     label: 'Tasks' },
  { key: 'documents', label: 'Documents' },
  { key: 'issues',    label: 'Issues' },
  { key: 'expiry',    label: 'Expiry' },
  { key: 'requests',  label: 'Requests' },
];

function matchesFilter(n: NotificationItem, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':       return true;
    case 'unread':    return !n.readAt;
    case 'critical':  return n.severity === 'ERROR' || n.severity === 'CRITICAL';
    default:          return getCategoryGroup(n.category) === filter;
  }
}

// ─── Notification row ───────────────────────────────────────────────────────

interface RowProps {
  n: NotificationItem;
  onMarkRead:   (id: string) => void;
  onMarkUnread: (id: string) => void;
  onOpen:       (n: NotificationItem) => void;
}

function NotificationRow({ n, onMarkRead, onMarkUnread, onOpen }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isRead  = Boolean(n.readAt);
  const catStyle = getCategoryStyle(n.category);
  const sevStyle = getSeverityStyle(n.severity);
  const label    = getCategoryLabel(n.category);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 transition-colors"
      style={{ backgroundColor: isRead ? 'transparent' : 'rgba(37,99,235,0.04)' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isRead ? 'transparent' : 'rgba(37,99,235,0.04)'; }}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: isRead ? 'var(--border-default)' : 'var(--accent-primary)' }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ color: catStyle.color, backgroundColor: catStyle.bg }}
              >
                {label}
              </span>
              {(n.severity === 'ERROR' || n.severity === 'CRITICAL') && (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: sevStyle.color }} />
              )}
              <span
                className="text-sm font-medium truncate"
                style={{ color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}
              >
                {n.title}
              </span>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {n.message}
            </p>
          </div>

          {/* Right: time + three-dot menu */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(n.createdAt)}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Notification options"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-10 w-44 rounded-xl py-1 shadow-lg"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  {isRead ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => { onMarkUnread(n.id); setMenuOpen(false); }}
                    >
                      Mark as unread
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => { onMarkRead(n.id); setMenuOpen(false); }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action row */}
        {n.deepLink && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => { onOpen(n); }}
              className="text-xs font-medium px-3 py-1 rounded-lg border transition-colors"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', background: 'none' }}
            >
              Open →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preferences panel ──────────────────────────────────────────────────────

interface PrefsPanelProps {
  onClose: () => void;
}

function PreferencesPanel({ onClose }: PrefsPanelProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadNotificationPrefs);
  const [desktopPerm, setDesktopPerm] = useState(getDesktopPermission);
  const [testPlaying, setTestPlaying]   = useState(false);

  const save = (updates: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const handleEnableDesktop = async () => {
    const result = await requestDesktopPermission();
    setDesktopPerm(result);
    if (result === 'granted') {
      save({ desktop: 'ENABLED' });
    }
  };

  const handleTestSound = async () => {
    setTestPlaying(true);
    await playTestSound();
    setTimeout(() => setTestPlaying(false), 600);
  };

  const SOUND_OPTIONS: { value: SoundPref; label: string; desc: string }[] = [
    { value: 'OFF',       label: 'Off',                desc: 'No sound' },
    { value: 'CRITICAL',  label: 'Critical only',      desc: 'Expired files, overdue issues' },
    { value: 'IMPORTANT', label: 'Important',           desc: 'Assignments, rejections, requests' },
    { value: 'ALL',       label: 'All notifications',  desc: 'Every supported category' },
  ];

  const MUTABLE_CATEGORIES = [
    { key: 'TASK_ASSIGNED',           label: 'Tasks' },
    { key: 'DOCUMENT_REVIEW_PENDING', label: 'Documents' },
    { key: 'NCR_ASSIGNED',            label: 'Issues' },
    { key: 'FILE_EXPIRING',           label: 'Expiry alerts' },
    { key: 'REQUEST_UPDATE',          label: 'Requests' },
    { key: 'SYSTEM',                  label: 'System' },
  ];

  const toggleMuted = (key: string) => {
    const muted = prefs.mutedCategories.includes(key)
      ? prefs.mutedCategories.filter((c) => c !== key)
      : [...prefs.mutedCategories, key];
    save({ mutedCategories: muted });
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Notification Preferences
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            These notification preferences apply to this browser only.
          </p>
        </div>
        <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5">

        {/* In-app popups */}
        <div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>In-app popups</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Show toast notifications for new activity</p>
            </div>
            <button
              type="button"
              onClick={() => save({ popups: !prefs.popups })}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{ backgroundColor: prefs.popups ? 'var(--accent-primary)' : 'var(--border-strong)' }}
              role="switch"
              aria-checked={prefs.popups}
            >
              <span
                className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: prefs.popups ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </label>
        </div>

        {/* Sound preference */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notification sound</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => save({ sound: opt.value })}
                className="flex flex-col items-start rounded-lg px-3 py-2 text-left border transition-colors text-xs"
                style={{
                  borderColor:     prefs.sound === opt.value ? 'var(--accent-primary)' : 'var(--border-default)',
                  backgroundColor: prefs.sound === opt.value ? 'var(--accent-soft)'    : 'transparent',
                  color:           prefs.sound === opt.value ? 'var(--accent-primary)'  : 'var(--text-secondary)',
                }}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</span>
              </button>
            ))}
          </div>
          {prefs.sound !== 'OFF' && (
            <button
              type="button"
              onClick={() => void handleTestSound()}
              disabled={testPlaying}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', background: 'none' }}
            >
              {testPlaying ? 'Playing…' : 'Play test sound'}
            </button>
          )}
        </div>

        {/* Desktop notifications */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Desktop notifications</p>
          </div>
          {desktopPerm === 'unavailable' ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not supported in this browser.</p>
          ) : desktopPerm === 'denied' ? (
            <p className="text-xs" style={{ color: 'var(--state-error)' }}>
              Permission denied. Enable it in your browser&apos;s site settings.
            </p>
          ) : desktopPerm === 'granted' ? (
            <label className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Show when tab is not focused
              </p>
              <button
                type="button"
                onClick={() => save({ desktop: prefs.desktop === 'ENABLED' ? 'DISABLED' : 'ENABLED' })}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ backgroundColor: prefs.desktop === 'ENABLED' ? 'var(--accent-primary)' : 'var(--border-strong)' }}
                role="switch"
                aria-checked={prefs.desktop === 'ENABLED'}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ transform: prefs.desktop === 'ENABLED' ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </button>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnableDesktop()}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', background: 'none' }}
            >
              Enable desktop notifications
            </button>
          )}
        </div>

        {/* Quiet hours */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Moon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Quiet hours</p>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Suppress sounds during these hours (notifications still delivered)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>From</label>
              <input
                type="time"
                value={prefs.quietStart ?? ''}
                onChange={(e) => save({ quietStart: e.target.value || null })}
                className="rounded-lg border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Until</label>
              <input
                type="time"
                value={prefs.quietEnd ?? ''}
                onChange={(e) => save({ quietEnd: e.target.value || null })}
                className="rounded-lg border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
              />
            </div>
            {(prefs.quietStart || prefs.quietEnd) && (
              <button
                type="button"
                onClick={() => save({ quietStart: null, quietEnd: null })}
                className="mt-4 text-xs"
                style={{ color: 'var(--state-error)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Muted categories */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Muted categories</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Muted categories still appear in the list but won&apos;t show popups.
          </p>
          <div className="flex flex-wrap gap-2">
            {MUTABLE_CATEGORIES.map(({ key, label }) => {
              const isMuted = prefs.mutedCategories.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMuted(key)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors"
                  style={{
                    borderColor:     isMuted ? 'var(--state-error)'    : 'var(--border-default)',
                    backgroundColor: isMuted ? 'var(--state-error-soft)' : 'transparent',
                    color:           isMuted ? 'var(--state-error)'    : 'var(--text-secondary)',
                  }}
                >
                  {isMuted && <VolumeX className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { token }    = useAuth();
  const router       = useRouter();
  const { socket, connected } = useSocket();
  const base         = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const prevConnected = useRef(false);
  const seenIds       = useRef<Set<string>>(new Set());

  const [items, setItems]           = useState<NotificationItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState<FilterKey>('all');
  const [showPrefs, setShowPrefs]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<NotificationItem[]>('/notifications', token ?? '');
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // Refetch on socket reconnect (Part 13)
  useEffect(() => {
    if (connected && !prevConnected.current) {
      void load();
    }
    prevConnected.current = connected;
  }, [connected, load]);

  // Live prepend — deduplicated (Part 12)
  useEffect(() => {
    if (!socket) return;
    const handler = (data: unknown) => {
      const notif = data as NotificationItem & { isRead?: boolean };
      if (!notif?.id || seenIds.current.has(notif.id)) return;
      seenIds.current.add(notif.id);
      setItems((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [{ ...notif, readAt: null } as NotificationItem, ...prev];
      });
    };
    socket.on('notification.created', handler);
    return () => { socket.off('notification.created', handler); };
  }, [socket]);

  const markRead = useCallback(async (id: string) => {
    await apiPatchAuth(`/notifications/${id}/read`, {}, token ?? '').catch(() => null);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  }, [token]);

  const markUnread = useCallback(async (id: string) => {
    await fetch(`${base}/notifications/${id}/unread`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: null } : n));
  }, [base, token]);

  const markAllRead = useCallback(async () => {
    await apiPatchAuth('/notifications/read-all', {}, token ?? '').catch(() => null);
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
  }, [token]);

  const handleOpen = useCallback(async (n: NotificationItem) => {
    if (!n.readAt) await markRead(n.id);
    if (n.deepLink) {
      router.push(n.deepLink);
      return;
    }
    // Legacy fallback for notifications without deepLink
    if (n.entityType === 'TASK' && token && n.entityId) {
      try {
        const task = await apiGet<{ id: string; workspaceId: string }>(
          `/tasks/${n.entityId}`, token,
        );
        if (task?.workspaceId) {
          router.push(`/workspaces/${task.workspaceId}?task=${n.entityId}`);
        }
      } catch { /* gracefully do nothing if task unavailable */ }
    } else if (n.entityType === 'DOCUMENT') {
      router.push('/documents');
    } else if (n.entityType === 'NCR_CAPA') {
      router.push('/ncr-capa');
    }
  }, [markRead, router, token]);

  const displayed   = items.filter((n) => matchesFilter(n, filter));
  const unreadCount = items.filter((n) => !n.readAt).length;

  const filterCounts = Object.fromEntries(
    FILTERS.map((f) => [f.key, items.filter((n) => matchesFilter(n, f.key)).length]),
  ) as Record<FilterKey, number>;

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Stay updated on assignments, reviews, expiry alerts, and business requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: showPrefs ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            title="Notification preferences"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preferences panel */}
      {showPrefs && (
        <PreferencesPanel onClose={() => setShowPrefs(false)} />
      )}

      {/* Filter tabs */}
      <div
        className="flex gap-0.5 overflow-x-auto border-b pb-0"
        style={{ borderColor: 'var(--border-default)' }}
      >
        {FILTERS.map((f) => {
          const count = filterCounts[f.key];
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="px-3 py-2 text-xs font-medium whitespace-nowrap -mb-px border-b-2 transition-colors flex items-center gap-1"
              style={{
                borderColor: active ? 'var(--accent-primary)' : 'transparent',
                color:       active ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              {f.label}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-muted)',
                    color:           active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <AlertCircle className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
            <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              Retry
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <Bell className="h-9 w-9" style={{ color: 'var(--text-disabled)' }} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {filter === 'unread'
                  ? "You're all caught up."
                  : filter === 'all'
                    ? 'No notifications yet.'
                    : `No ${filter} notifications.`}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-disabled)' }}>
                {filter === 'all'
                  ? "You'll see assignments, review requests, expiry alerts, and updates here."
                  : 'No notifications match this filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {displayed.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onMarkRead={(id) => void markRead(id)}
                onMarkUnread={(id) => void markUnread(id)}
                onOpen={(item) => void handleOpen(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
