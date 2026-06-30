'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, RefreshCw, Database, HardDrive, Zap, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface CheckResult {
  status: 'ok' | 'error' | 'degraded';
  latencyMs?: number;
  path?: string;
  writable?: boolean;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: CheckResult;
    storage: CheckResult;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--state-success)' }} />;
  return <AlertTriangle className="h-5 w-5" style={{ color: 'var(--state-error)' }} />;
}

function CheckCard({
  icon,
  label,
  result,
}: {
  icon: React.ReactNode;
  label: string;
  result: CheckResult | null;
}) {
  const ok = result?.status === 'ok';
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: ok ? 'var(--border-default)' : 'var(--state-error)',
        borderWidth: ok ? '1px' : '2px',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: ok ? 'var(--accent-soft)' : 'var(--state-error-soft)' }}
          >
            {icon}
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
        </div>
        {result && <StatusIcon status={result.status} />}
      </div>
      {result === null ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Checking…</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span
              className="font-semibold"
              style={{ color: ok ? 'var(--state-success)' : 'var(--state-error)' }}
            >
              {result.status.toUpperCase()}
            </span>
          </div>
          {result.latencyMs !== undefined && (
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Latency</span>
              <span style={{ color: 'var(--text-primary)' }}>{result.latencyMs}ms</span>
            </div>
          )}
          {result.path && (
            <div className="flex justify-between text-xs gap-2">
              <span style={{ color: 'var(--text-muted)' }}>Path</span>
              <span className="font-mono truncate text-right" style={{ color: 'var(--text-secondary)' }}>{result.path}</span>
            </div>
          )}
          {result.writable !== undefined && (
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Writable</span>
              <span style={{ color: result.writable ? 'var(--state-success)' : 'var(--state-error)' }}>
                {result.writable ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          {result.error && (
            <p className="mt-1 text-xs rounded-md px-2 py-1.5" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
              {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SystemHealthPage() {
  const { token, user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const isAdmin = user?.roles?.some((r) => ['SUPER_ADMIN', 'IT_ADMIN'].includes(r));

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/health`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json() as HealthResponse;
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, [token]);

  useEffect(() => { check(); }, [check]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
        <AlertTriangle className="h-10 w-10" style={{ color: 'var(--state-error)' }} />
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Access Denied</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Only SUPER_ADMIN and IT_ADMIN can view system health.</p>
      </div>
    );
  }

  const overallStatus = health?.status ?? 'error';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>System Health</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Real-time status of RECAFCO AuditFlow ISO infrastructure
          </p>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Check now
        </button>
      </div>

      {/* Overall status banner */}
      <div
        className="flex items-center gap-4 rounded-xl border p-5"
        style={{
          backgroundColor: overallStatus === 'ok' ? 'var(--state-success)' + '15' : 'var(--state-error-soft)',
          borderColor: overallStatus === 'ok' ? 'var(--state-success)' : 'var(--state-error)',
        }}
      >
        {overallStatus === 'ok' ? (
          <CheckCircle2 className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--state-success)' }} />
        ) : (
          <AlertTriangle className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--state-error)' }} />
        )}
        <div>
          <p className="font-bold text-base" style={{ color: overallStatus === 'ok' ? 'var(--state-success)' : 'var(--state-error)' }}>
            {overallStatus === 'ok' ? 'All systems operational' : overallStatus === 'degraded' ? 'System degraded — some checks failed' : 'System unavailable'}
          </p>
          {lastChecked && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Last checked: {lastChecked.toLocaleTimeString()}
              {health?.version && ` · API v${health.version}`}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <Zap className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Check cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CheckCard
          icon={<Database className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />}
          label="PostgreSQL Database"
          result={health?.checks.database ?? null}
        />
        <CheckCard
          icon={<HardDrive className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />}
          label="File Storage (uploads)"
          result={health?.checks.storage ?? null}
        />
      </div>

      {/* Quick links */}
      <div
        className="rounded-xl border p-5 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Quick actions</p>
        <div className="flex gap-3 flex-wrap">
          <a
            href="/admin/system-errors"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          >
            View Error Logs
          </a>
          <a
            href="/admin/settings"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          >
            Admin Settings
          </a>
        </div>
      </div>
    </div>
  );
}
