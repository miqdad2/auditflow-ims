// ─── Notification sound (Web Audio API) ──────────────────────────────────────
// Uses Web Audio API to generate a short professional beep.
// No audio file needed — eliminates dependency on external assets.
//
// Browser constraint: AudioContext must be created/resumed after a user
// interaction. The first call to playNotificationSound() after page load will
// silently fail if the user has not yet interacted. After any click, it works.
//
// Multi-tab coordination: only plays if document.hasFocus() is true.
// This ensures a single focused tab plays the sound, not all tabs at once.

let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Play a single short professional notification beep.
 * Silently no-ops if:
 * - The tab is not focused (multi-tab coordination)
 * - AudioContext is not available or suspended and cannot be resumed
 * - Called during SSR
 */
export async function playNotificationSound(): Promise<void> {
  // Multi-tab: only the focused tab plays sound
  if (typeof document !== 'undefined' && !document.hasFocus()) return;

  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  try {
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    if (audioCtx.state !== 'running') return;

    const now = audioCtx.currentTime;

    // Two-tone gentle chime: 880 Hz then 1108 Hz, 80ms each
    const makeNote = (freq: number, startTime: number, duration: number) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    makeNote(880,  now,        0.12);
    makeNote(1108, now + 0.10, 0.14);
  } catch {
    // AudioContext errors are non-fatal — notification still shows
  }
}

/**
 * Play a test sound immediately (called after the user enables sound in prefs).
 * Same as playNotificationSound but always attempts to resume the context.
 */
export async function playTestSound(): Promise<void> {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  try {
    if (audioCtx.state !== 'running') {
      await audioCtx.resume();
    }
    await playNotificationSound();
  } catch { /* non-fatal */ }
}
