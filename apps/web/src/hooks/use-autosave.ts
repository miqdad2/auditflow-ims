import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave hook.
 *
 * Usage:
 *   const { status, schedule, flush } = useAutosave(async () => {
 *     await apiPatchAuth('/tasks/123', { description: text }, token);
 *   }, 1500);
 *
 *   onChange: (e) => { setText(e.target.value); schedule(); }
 *
 * - `schedule()` — debounce-schedules the next save
 * - `flush()` — immediately executes the pending save (e.g., on blur/unmount)
 * - `status` — 'idle' | 'saving' | 'saved' | 'error'
 */
export function useAutosave(onSave: () => Promise<void>, delay = 1500) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef  = useRef(onSave);
  const pendingRef = useRef(false);

  // Keep saveRef pointing to the latest onSave without re-creating schedule/flush
  useEffect(() => { saveRef.current = onSave; }, [onSave]);

  const executeSave = useCallback(async () => {
    pendingRef.current = false;
    setStatus('saving');
    try {
      await saveRef.current();
      setStatus('saved');
      // Clear "saved" indicator after 2s
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setStatus('error');
    }
  }, []);

  const schedule = useCallback(() => {
    pendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void executeSave(); }, delay);
  }, [delay, executeSave]);

  const flush = useCallback(async () => {
    if (!pendingRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await executeSave();
  }, [executeSave]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = false;
    setStatus('idle');
  }, []);

  return { status, schedule, flush, cancel };
}
