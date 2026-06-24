'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from './socket-provider';

export interface UseRealtimeInvalidationOptions {
  /** Socket.IO event names to subscribe to */
  events: readonly string[] | string[];
  /** Callback to call when invalidation is triggered (latest reference used — no stale closures) */
  onInvalidate: () => void;
  /** Debounce window in ms — multiple events within this window produce one callback (default 500ms) */
  debounceMs?: number;
  /** If false, no subscriptions are created (useful for permission-gated pages) */
  enabled?: boolean;
  /** If true, onInvalidate is also called once when socket reconnects (default true) */
  reconnect?: boolean;
  /** If provided, only events whose payload.workspaceId matches are acted on */
  workspaceId?: string | null;
}

/**
 * Shared realtime invalidation hook.
 *
 * Subscribes to a list of socket events and calls onInvalidate() once (debounced)
 * when any matching event arrives. Handles stale-closure safety, debounce timer
 * cleanup on unmount, and optional per-reconnect refresh.
 *
 * Designed to be used with the existing SocketProvider — creates NO new socket connection.
 */
export function useRealtimeInvalidation({
  events,
  onInvalidate,
  debounceMs = 500,
  enabled = true,
  reconnect = true,
  workspaceId,
}: UseRealtimeInvalidationOptions): void {
  const { socket, connected } = useSocket();

  // Stable ref for the callback — callers don't need to memoize
  const onInvalidateRef  = useRef(onInvalidate);
  useEffect(() => { onInvalidateRef.current = onInvalidate; }, [onInvalidate]);

  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnectedRef = useRef(false);

  // Strict eventId deduplication: Map<eventId, timestampMs> with 60s TTL
  const seenEventIds = useRef(new Map<string, number>());

  // Stable string key so the event-subscription effect only re-runs when the
  // events list actually changes (not on every render from an inline array literal)
  const eventsKey = [...events].join(',');

  useEffect(() => {
    if (!socket || !enabled) return;

    function schedule(payload?: Record<string, unknown>) {
      // Strict eventId deduplication — prevents duplicate refetch for same event
      const eventId = payload?.eventId as string | undefined;
      if (eventId) {
        const now = Date.now();
        const TTL = 60_000; // 60 seconds
        // Lazily clean expired entries to prevent unbounded growth
        for (const [id, ts] of seenEventIds.current) {
          if (now - ts > TTL) seenEventIds.current.delete(id);
        }
        if (seenEventIds.current.has(eventId)) return; // duplicate — ignore
        seenEventIds.current.set(eventId, now);
      }
      // eventId missing (legacy/old event) → process via debounce only

      // Optional per-workspace filtering
      if (workspaceId && payload?.workspaceId && payload.workspaceId !== workspaceId) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onInvalidateRef.current();
        timerRef.current = null;
      }, debounceMs);
    }

    const eventList = eventsKey.split(',').filter(Boolean);
    eventList.forEach((e) => socket.on(e, schedule));

    return () => {
      eventList.forEach((e) => socket.off(e, schedule));
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  // eventsKey is a stable string derived from the events array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, enabled, debounceMs, eventsKey, workspaceId]);

  // Reconnect: call onInvalidate once when socket transitions disconnected → connected
  useEffect(() => {
    if (!reconnect || !enabled) return;
    if (connected && !prevConnectedRef.current) {
      onInvalidateRef.current();
    }
    prevConnectedRef.current = connected;
  }, [connected, reconnect, enabled]);
}
