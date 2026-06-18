'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; fullName: string } | null;
}

interface Props {
  entityType: string;
  entityId: string;
  token: string;
  refreshKey?: number;
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({ entityType, entityId, token, refreshKey }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !entityType || !entityId) return;
    setLoading(true);
    try {
      const data = await apiGet<ActivityEntry[]>(
        `/audit-logs/entity?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
        token,
      );
      setEntries(data);
    } catch {
      // silently fail — activity is supplementary
    } finally {
      setLoading(false);
    }
  }, [token, entityType, entityId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
        <Clock className="h-5 w-5" style={{ color: 'var(--text-disabled)' }} />
        <p className="text-xs">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="relative flex gap-3 pb-4"
          style={{ paddingLeft: '2px' }}
        >
          {/* Vertical connector */}
          {idx < entries.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: '10px',
                top: '22px',
                bottom: 0,
                width: '1px',
                backgroundColor: 'var(--border-subtle)',
              }}
            />
          )}

          {/* Dot */}
          <div
            style={{
              flexShrink: 0,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-soft)',
              border: '2px solid var(--accent-primary)',
              marginTop: '2px',
            }}
          />

          {/* Content */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex flex-wrap items-baseline gap-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {entry.actor?.fullName ?? 'System'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {formatAction(entry.action)}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {formatTime(entry.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
