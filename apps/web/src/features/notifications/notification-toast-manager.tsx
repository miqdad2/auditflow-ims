'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { useSocket } from '@/lib/socket-provider';
import {
  loadNotificationPrefs, shouldPlaySound, shouldShowPopup,
} from './notification-prefs';
import { playNotificationSound } from './notification-sound';
import { showDesktopNotification } from './desktop-notifications';
import {
  getCategoryLabel, getCategoryStyle, getSeverityStyle, timeAgo, isCritical,
} from './notification-helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveNotification {
  id: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  workspaceId: string | null;
  deepLink: string | null;
  createdAt: string;
  isRead: false;
}

interface ToastEntry extends LiveNotification {
  toastId: number;
  dismissAt: number;
}

// ─── Category icon ────────────────────────────────────────────────────────────

function CategoryIcon({ category, severity }: { category: string; severity: string }) {
  const style = getSeverityStyle(severity);
  const cls = 'h-5 w-5 shrink-0 mt-0.5';
  if (severity === 'CRITICAL' || severity === 'ERROR') {
    return <AlertCircle className={cls} style={{ color: style.color }} />;
  }
  if (severity === 'WARNING') {
    return <AlertTriangle className={cls} style={{ color: style.color }} />;
  }
  if (category.includes('APPROVED') || category.includes('VERIFIED') || category.includes('RENEWED')) {
    return <CheckCircle className={cls} style={{ color: 'var(--state-success)' }} />;
  }
  if (category === 'MENTION' || category === 'TASK_ASSIGNED') {
    return <Bell className={cls} style={{ color: style.color }} />;
  }
  return <Info className={cls} style={{ color: style.color }} />;
}

// ─── Single toast card ────────────────────────────────────────────────────────

interface ToastCardProps {
  toast: ToastEntry;
  onDismiss: (toastId: number) => void;
  onOpen: (notif: LiveNotification) => void;
}

function ToastCard({ toast, onDismiss, onOpen }: ToastCardProps) {
  const severityStyle = getSeverityStyle(toast.severity);
  const categoryStyle = getCategoryStyle(toast.category);
  const label         = getCategoryLabel(toast.category);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        width:           '340px',
        backgroundColor: 'var(--bg-surface)',
        border:          '1px solid var(--border-default)',
        borderLeft:      `4px solid ${severityStyle.border}`,
        borderRadius:    '10px',
        boxShadow:       '0 4px 20px rgba(0,0,0,0.14)',
        padding:         '12px 14px',
        display:         'flex',
        flexDirection:   'column',
        gap:             '8px',
        animation:       'notif-toast-in 0.22s ease',
        position:        'relative',
      }}
    >
      {/* Top row: icon + title + dismiss */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <CategoryIcon category={toast.category} severity={toast.severity} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize:        '10px',
                fontWeight:      600,
                padding:         '1px 6px',
                borderRadius:    '4px',
                color:           categoryStyle.color,
                backgroundColor: categoryStyle.bg,
                textTransform:   'uppercase',
                letterSpacing:   '0.04em',
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {toast.title}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.toastId)}
          aria-label="Dismiss notification"
          style={{
            border:      'none',
            background:  'none',
            cursor:      'pointer',
            padding:     '2px',
            color:       'var(--text-muted)',
            lineHeight:  1,
            flexShrink:  0,
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom row: workspace + time + Open button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {timeAgo(toast.createdAt)}
        </span>
        {toast.deepLink && (
          <button
            type="button"
            onClick={() => { onOpen(toast); onDismiss(toast.toastId); }}
            style={{
              fontSize:        '11px',
              fontWeight:      600,
              color:           'var(--accent-primary)',
              background:      'none',
              border:          '1px solid var(--accent-primary)',
              borderRadius:    '5px',
              padding:         '2px 10px',
              cursor:          'pointer',
              textDecoration:  'none',
            }}
          >
            Open
          </button>
        )}
      </div>
    </div>
  );
}

// ─── NotificationToastManager ─────────────────────────────────────────────────
// Mounts once in the app layout. Listens to socket notification.created events
// and shows rich toasts. Never plays sound for initial page load or reconnect
// fetches — only for live socket events.

export function NotificationToastManager() {
  const { socket } = useSocket();
  const router     = useRouter();
  const counter    = useRef(0);
  const seenIds    = useRef<Set<string>>(new Set());

  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const handleDismiss = useCallback((toastId: number) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const handleOpen = useCallback((notif: LiveNotification) => {
    if (notif.deepLink) {
      router.push(notif.deepLink);
    }
  }, [router]);

  const handleNotification = useCallback((data: unknown) => {
    const notif = data as LiveNotification;
    if (!notif?.id) return;

    // ─── Client-side deduplication (Part 12) ─────────────────────────
    // Prevents double-processing if the same socket event fires twice
    // (e.g., due to reconnect during processing).
    if (seenIds.current.has(notif.id)) return;
    seenIds.current.add(notif.id);
    // Auto-expire dedup entry after 60s to prevent memory growth
    setTimeout(() => seenIds.current.delete(notif.id), 60_000);

    const prefs = loadNotificationPrefs();

    // ─── Sound (Part 7) ───────────────────────────────────────────────
    // Only plays for live realtime events; never for initial load or reconnect.
    if (shouldPlaySound(notif.severity, prefs)) {
      void playNotificationSound();
    }

    // ─── Desktop notification (Part 8) ───────────────────────────────
    if (prefs.desktop === 'ENABLED') {
      showDesktopNotification({
        title: notif.title,
        body:  notif.message,
        tag:   notif.id,
        onClick: () => { if (notif.deepLink) router.push(notif.deepLink); },
      });
    }

    // ─── In-app toast (Part 5) ────────────────────────────────────────
    if (!shouldShowPopup(notif.category, prefs)) return;

    const toastId   = ++counter.current;
    const critical  = isCritical(notif.category, notif.severity);
    const duration  = critical ? 12_000 : 8_000;
    const dismissAt = Date.now() + duration;

    const entry: ToastEntry = { ...notif, toastId, dismissAt };
    setToasts((prev) => [...prev.slice(-4), entry]); // max 5 toasts

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
    }, duration);
  }, [router]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification.created', handleNotification);
    return () => { socket.off('notification.created', handleNotification); };
  }, [socket, handleNotification]);

  if (toasts.length === 0) return null;

  return (
    <>
      {/* Toast stack — top-right */}
      <div
        style={{
          position:      'fixed',
          top:           '72px',
          right:         '20px',
          zIndex:        9999,
          display:       'flex',
          flexDirection: 'column',
          gap:           '8px',
          pointerEvents: 'none',
        }}
        aria-label="Notification toasts"
      >
        {toasts.map((t) => (
          <div key={t.toastId} style={{ pointerEvents: 'all' }}>
            <ToastCard toast={t} onDismiss={handleDismiss} onOpen={handleOpen} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes notif-toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
