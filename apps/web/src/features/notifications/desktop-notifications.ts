// ─── Browser desktop notifications ───────────────────────────────────────────
// Permission must never be requested automatically on page load.
// Call requestDesktopPermission() only after the user explicitly clicks
// "Enable desktop notifications" in the preferences panel.
//
// If permission is denied, fall back silently to in-app toasts.
// Never prompt repeatedly — check the current permission status first.

export type DesktopPermission = 'granted' | 'denied' | 'default' | 'unavailable';

export function getDesktopPermission(): DesktopPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unavailable';
  }
  return Notification.permission as DesktopPermission;
}

export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unavailable';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result as DesktopPermission;
  } catch {
    return 'denied';
  }
}

export interface DesktopNotifOptions {
  title: string;
  body: string;
  tag?: string;       // deduplication key — same tag replaces previous notif
  onClick?: () => void;
}

/**
 * Show a browser desktop notification.
 * Only shows when:
 * - Permission is granted
 * - The tab is NOT focused (to avoid duplication with in-app toast)
 *   unless `showWhenFocused` is explicitly true
 */
export function showDesktopNotification(
  opts: DesktopNotifOptions,
  showWhenFocused = false,
): void {
  if (getDesktopPermission() !== 'granted') return;
  if (!showWhenFocused && typeof document !== 'undefined' && document.hasFocus()) return;

  try {
    const notif = new Notification(`AuditFlow IMS — ${opts.title}`, {
      body: opts.body,
      tag:  opts.tag,
      // icon intentionally omitted — avoids needing a separate icon asset
    });
    if (opts.onClick) {
      notif.onclick = () => {
        window.focus();
        opts.onClick?.();
      };
    }
  } catch {
    // Notification API can throw in some browser/OS combinations
  }
}
