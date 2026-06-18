'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, RefreshCw, Filter, Loader2, Info,
} from 'lucide-react';
import { apiGet, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface SystemError {
  id: string;
  source: string;
  severity: string;
  message: string;
  path: string | null;
  userId: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface ErrorList {
  items: SystemError[];
  total: number;
  page: number;
  limit: number;
}

interface ErrorStats {
  total: number;
  unresolved: number;
  bySeverity: Record<string, number>;
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: 'var(--state-error-soft)', color: 'var(--state-error)' },
  ERROR:    { bg: 'var(--state-error-soft)', color: 'var(--state-error)' },
  WARNING:  { bg: 'var(--state-warning-soft)', color: 'var(--state-warning)' },
  INFO:     { bg: 'var(--accent-soft)', color: 'var(--accent-primary)' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.INFO;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {severity}
    </span>
  );
}

export default function SystemErrorsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<ErrorList | null>(null);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterResolved, setFilterResolved] = useState('false');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const isAdmin = user?.roles?.some((r) => ['SUPER_ADMIN', 'IT_ADMIN'].includes(r));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterSource) params.set('source', filterSource);
      if (filterResolved) params.set('resolved', filterResolved);

      const [list, st] = await Promise.all([
        apiGet<ErrorList>(`/system-errors?${params.toString()}`, token),
        apiGet<ErrorStats>('/system-errors/stats', token),
      ]);
      setData(list);
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, page, filterSeverity, filterSource, filterResolved]);

  useEffect(() => { load(); }, [load]);

  async function toggleResolved(err: SystemError) {
    if (!token) return;
    setResolvingId(err.id);
    try {
      const action = err.resolvedAt ? 'unresolve' : 'resolve';
      await apiPatchAuth(`/system-errors/${err.id}/${action}`, {}, token);
      await load();
    } catch {
      // ignore
    } finally {
      setResolvingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
        <AlertTriangle className="h-10 w-10" style={{ color: 'var(--state-error)' }} />
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Access Denied</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Only SUPER_ADMIN and IT_ADMIN can view system error logs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>System Error Logs</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Monitor application errors, frontend crashes, and infrastructure failures
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Logged', value: stats.total, icon: Info, color: 'var(--text-muted)' },
            { label: 'Unresolved', value: stats.unresolved, icon: AlertTriangle, color: 'var(--state-error)' },
            { label: 'CRITICAL', value: stats.bySeverity.CRITICAL ?? 0, icon: AlertTriangle, color: 'var(--state-error)' },
            { label: 'ERROR', value: stats.bySeverity.ERROR ?? 0, icon: AlertTriangle, color: 'var(--state-warning)' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <Filter className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        <select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
          className="rounded-md border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="ERROR">ERROR</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
          className="rounded-md border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
        >
          <option value="">All Sources</option>
          <option value="API">API</option>
          <option value="FRONTEND">FRONTEND</option>
          <option value="REALTIME">REALTIME</option>
          <option value="STORAGE">STORAGE</option>
          <option value="DATABASE">DATABASE</option>
        </select>
        <select
          value={filterResolved}
          onChange={(e) => { setFilterResolved(e.target.value); setPage(1); }}
          className="rounded-md border px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
        >
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--state-success)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No errors found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-muted)' }}>
                {['Severity', 'Source', 'Message', 'Path', 'Time', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((err) => (
                <tr
                  key={err.id}
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                  className="hover:bg-[var(--bg-subtle)]"
                >
                  <td className="px-4 py-3"><SeverityBadge severity={err.severity} /></td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{err.source}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate" style={{ color: 'var(--text-primary)' }} title={err.message}>{err.message}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[140px]">
                    <p className="truncate" style={{ color: 'var(--text-muted)' }} title={err.path ?? ''}>{err.path ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(err.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {err.resolvedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--state-success)' }}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--state-error)' }}>
                        <AlertTriangle className="h-3.5 w-3.5" /> Open
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleResolved(err)}
                      disabled={resolvingId === err.id}
                      className="rounded-md border px-3 py-1 text-xs font-medium transition-colors"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
                    >
                      {resolvingId === err.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : err.resolvedAt ? 'Reopen' : 'Resolve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Showing {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * data.limit >= data.total}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
