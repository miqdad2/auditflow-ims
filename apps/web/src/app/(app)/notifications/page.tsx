'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiPatchAuth } from '@/lib/api';

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

function categoryColor(category: string): { color: string; bg: string } {
  switch (category) {
    case 'TASK_ASSIGNED':         return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)' };
    case 'TASK_OVERDUE':          return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' };
    case 'EVIDENCE_SUBMITTED':    return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' };
    case 'EVIDENCE_REJECTED':     return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' };
    case 'DOCUMENT_APPROVED':     return { color: 'var(--state-success)', bg: 'var(--state-success-soft)' };
    case 'DOCUMENT_REJECTED':     return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' };
    case 'DOCUMENT_REVIEW_PENDING': return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' };
    case 'NCR_ASSIGNED':          return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)' };
    case 'NCR_VERIFIED':          return { color: 'var(--state-success)', bg: 'var(--state-success-soft)' };
    default:                      return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)' };
  }
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    TASK_ASSIGNED: 'Task',
    TASK_OVERDUE: 'Overdue',
    EVIDENCE_SUBMITTED: 'Evidence',
    EVIDENCE_REJECTED: 'Evidence',
    DOCUMENT_APPROVED: 'Document',
    DOCUMENT_REJECTED: 'Document',
    DOCUMENT_REVIEW_PENDING: 'Review',
    NCR_ASSIGNED: 'Issue',
    NCR_VERIFIED: 'Issue',
    NCR_REJECTED: 'Issue',
  };
  return map[category] ?? 'System';
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const [items, setItems]       = useState<NotificationItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${base}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json() as NotificationItem[];
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [base, token]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: string) => {
    await apiPatchAuth(`/notifications/${id}/read`, {}, token ?? '').catch(() => null);
    setItems(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    await apiPatchAuth('/notifications/read-all', {}, token ?? '').catch(() => null);
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? now })));
  };

  const displayed = filter === 'unread' ? items.filter(n => !n.readAt) : items;
  const unreadCount = items.filter(n => !n.readAt).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors"
            style={{
              borderColor: filter === f ? 'var(--accent-primary)' : 'transparent',
              color: filter === f ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            {f === 'all' ? `All (${items.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }} />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--state-error)' }}>{error}</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <Bell className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {displayed.map((n) => {
              const colors = categoryColor(n.category);
              const isRead = Boolean(n.readAt);
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ backgroundColor: isRead ? 'transparent' : 'var(--accent-soft)20' }}
                  onClick={() => { if (!isRead) void markRead(n.id); }}
                >
                  <div className="shrink-0 mt-0.5">
                    {!isRead && (
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                    )}
                    {isRead && (
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--border-default)' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ color: colors.color, backgroundColor: colors.bg }}
                          >
                            {categoryLabel(n.category)}
                          </span>
                          <p
                            className="text-sm font-medium"
                            style={{ color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                          >
                            {n.title}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {n.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
