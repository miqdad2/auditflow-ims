'use client';

// ─── Notification preferences (localStorage) ─────────────────────────────────
// No schema change needed for MVP. All sound/desktop preferences are stored
// client-side. PostgreSQL stores per-user notification rows only.

export type SoundPref = 'OFF' | 'CRITICAL' | 'IMPORTANT' | 'ALL';
export type DesktopPref = 'ENABLED' | 'DISABLED';

export interface NotificationPrefs {
  sound: SoundPref;
  desktop: DesktopPref;
  popups: boolean;                     // in-app toast popups on/off
  mutedCategories: string[];           // categories suppressed from toasts
  quietStart: string | null;           // HH:MM 24h
  quietEnd:   string | null;           // HH:MM 24h
}

const STORAGE_KEY = 'auditflow_notification_prefs';

const DEFAULTS: NotificationPrefs = {
  sound:           'OFF',
  desktop:         'DISABLED',
  popups:          true,
  mutedCategories: [],
  quietStart:      null,
  quietEnd:        null,
};

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) as Partial<NotificationPrefs> };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* localStorage may be unavailable in some browsers */ }
}

// ─── Quiet hours check ────────────────────────────────────────────────────────

export function isInQuietHours(prefs: NotificationPrefs): boolean {
  if (!prefs.quietStart || !prefs.quietEnd) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const start = prefs.quietStart;
  const end   = prefs.quietEnd;
  if (start <= end) {
    return hhmm >= start && hhmm < end;
  }
  // Overnight: start=22:00, end=07:00
  return hhmm >= start || hhmm < end;
}

// ─── Sound eligibility check ──────────────────────────────────────────────────

// Severity → pref level mapping.
// 'CRITICAL' pref: only ERROR/CRITICAL severity notifs play sound
// 'IMPORTANT' pref: WARNING/ERROR/CRITICAL play sound
// 'ALL': every notification plays sound

export function shouldPlaySound(severity: string, prefs: NotificationPrefs): boolean {
  if (prefs.sound === 'OFF') return false;
  if (isInQuietHours(prefs)) return false;
  if (prefs.sound === 'CRITICAL')  return severity === 'CRITICAL' || severity === 'ERROR';
  if (prefs.sound === 'IMPORTANT') return severity !== 'INFO';
  return true; // ALL
}

export function shouldShowPopup(category: string, prefs: NotificationPrefs): boolean {
  if (!prefs.popups) return false;
  if (prefs.mutedCategories.includes(category)) return false;
  return true;
}
