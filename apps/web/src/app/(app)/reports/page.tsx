'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw, Download, Loader2, AlertTriangle, CheckCircle2,
  AlertCircle, Activity, Building2, FolderOpen, ListTodo,
  FileText, Zap, Clock, Users, TrendingUp,
  ChevronRight, Filter, X,
} from 'lucide-react';
import { apiGet, apiDownloadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket-provider';
import type {
  ReportOverview, DeptStatus, WsStatus, OverdueTask,
  IssueRow, DateRangePreset,
  ReportDepartment, ReportWorkspace,
} from '@/features/reports/types';
import {
  PRIORITY_COLOR, ISSUE_STATUS_COLOR, STATUS_CONFIG,
  getDateRange, overdueByDays,
} from '@/features/reports/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB');
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'Just now';
}

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    ?? { label: label ?? status, color: 'var(--text-muted)', bg: 'var(--bg-muted)' };
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function IssueStatusBadge({ status }: { status: string }) {
  const cfg = ISSUE_STATUS_COLOR[status] ?? { color: 'var(--text-muted)', bg: 'var(--bg-muted)', label: status };
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function SectionHeader({ title, count, icon: Icon }: { title: string; count?: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {count !== undefined && (
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{count} record{count !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        {message}
      </td>
    </tr>
  );
}

// ─── CSV export helpers ───────────────────────────────────────────────────────

function csvDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadCSV(filename: string, headers: string[], rows: string[]) {
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escRow(cells: (string | number | null)[]): string {
  return cells.map((v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

function exportDeptCSV(rows: DeptStatus[]) {
  const headers = ['Department', 'Code', 'Active Workspaces', 'Open Tasks', 'Overdue Tasks', 'Docs Under Review', 'Open Issues', 'Expired Files', 'Expiring Files', 'Status'];
  const data = rows.map((d) => {
    // Show "—" for expiry when department has no linked workspaces (avoids misleading 0)
    const expiredCell  = d.activeWorkspaces === 0 ? '—' : d.expiredFiles;
    const expiringCell = d.activeWorkspaces === 0 ? '—' : d.expiringFiles;
    return escRow([d.departmentName, d.code, d.activeWorkspaces, d.openTasks, d.overdueTasks, d.docsUnderReview, d.openIssues, expiredCell, expiringCell, d.status]);
  });
  downloadCSV(`RECAFCO_Department_Status_${csvDate()}.csv`, headers, data);
}

function exportWsCSV(rows: WsStatus[]) {
  const headers = ['Workspace', 'Department', 'Open Tasks', 'Overdue Tasks', 'Total Docs', 'Docs Under Review', 'Open Issues', 'Expired Files', 'Expiring Files', 'Members', 'Status'];
  const data = rows.map((w) =>
    escRow([w.name, w.department ?? '', w.openTasks, w.overdueTasks, w.totalDocs, w.docsUnderReview, w.openIssues, w.expiredFiles, w.expiringFiles, w.memberCount, w.operationalStatusLabel])
  );
  downloadCSV(`RECAFCO_Workspace_Status_${csvDate()}.csv`, headers, data);
}

function exportOverdueCSV(rows: OverdueTask[]) {
  const headers = ['Task', 'Workspace', 'Department', 'Assignee', 'Due Date', 'Overdue By (days)', 'Priority', 'Status'];
  const data = rows.map((t) =>
    escRow([t.title, t.workspaceName, t.department ?? '', t.assignee ?? '', t.dueDate ? fmtDate(t.dueDate) : '', t.dueDate ? overdueByDays(t.dueDate) : '', t.priority, t.status])
  );
  downloadCSV(`RECAFCO_Overdue_Tasks_${csvDate()}.csv`, headers, data);
}

function exportIssuesCSV(rows: IssueRow[]) {
  const headers = ['Issue #', 'Title', 'Workspace', 'Department', 'Priority', 'Assignee', 'Due Date', 'Status'];
  const data = rows.map((r) =>
    escRow([r.ncrNumber ?? '', r.title, r.workspaceName ?? '', r.department ?? '', r.priority, r.assignee ?? '', r.dueDate ? fmtDate(r.dueDate) : '', r.status])
  );
  downloadCSV(`RECAFCO_Issues_${csvDate()}.csv`, headers, data);
}

function exportSummaryCSV(d: ReportOverview, periodFrom: string, periodTo: string) {
  const headers = ['Metric', 'Value', 'Notes'];
  const rows = [
    escRow(['Reporting Period', `${fmtDate(periodFrom)} to ${fmtDate(periodTo)}`, '']),
    escRow(['Generated At', new Date(d.generatedAt).toLocaleString('en-GB'), '']),
    escRow(['Overall Status', d.summary.status, '']),
    escRow(['Active Workspaces', d.summary.activeWorkspaces, '']),
    escRow(['Open Tasks', d.summary.openTasks, '']),
    escRow(['Overdue Tasks', d.summary.overdueTasks, d.summary.overdueTasks > 0 ? 'Immediate action needed' : '']),
    escRow(['Completed in Period', d.summary.completedInPeriod, '']),
    escRow(['Total Documents', d.summary.docsTotal, '']),
    escRow(['Docs Under Review', d.summary.docsUnderReview, d.summary.docsUnderReview > 0 ? 'Pending approval' : '']),
    escRow(['Open Issues', d.summary.openIssues, '']),
    escRow(['Overdue Issues', d.summary.overdueIssues, '']),
    escRow(['Expired Task Files', d.summary.expiredFiles, d.summary.expiredFiles > 0 ? 'Renewal required' : '']),
    escRow(['Expiring Task Files', d.summary.expiringSoonFiles, '']),
  ];
  downloadCSV(`RECAFCO_Business_Operations_Report_${csvDate()}.csv`, headers, rows);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today',   label: 'Today' },
  { value: 'week',    label: 'This Week' },
  { value: 'month',   label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'custom',  label: 'Custom' },
];

const STALE_EVENTS = ['task.created', 'task.updated', 'document.created', 'document.updated', 'ncr.created', 'ncr.updated', 'attachment.created', 'attachment.updated'];

export default function ReportsPage() {
  const { token, user } = useAuth();
  const { socket }      = useSocket();

  const isElevated = user?.roles?.some((r: string) => ELEVATED_ROLES.includes(r)) ?? false;

  // ── Filter state ─────────────────────────────────────────────────────────
  const [preset, setPreset]     = useState<DateRangePreset>('month');
  const [dateFrom, setDateFrom] = useState<string>(() => getDateRange('month').from);
  const [dateTo, setDateTo]     = useState<string>(() => getDateRange('month').to);
  const [deptFilter, setDeptFilter]   = useState<string>('');
  const [wsFilter, setWsFilter]       = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter options loaded from API
  const [departments, setDepartments] = useState<ReportDepartment[]>([]);
  const [workspaces, setWorkspaces]   = useState<ReportWorkspace[]>([]);

  // ── Data state ───────────────────────────────────────────────────────────
  const [data, setData]           = useState<ReportOverview | null>(null);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const reportsRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Export menu ──────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  async function downloadFile(fileId: string, fallbackName: string) {
    if (downloadingIds.has(fileId) || !token) return;
    setDownloadingIds((prev) => new Set(prev).add(fileId));
    try {
      const { blob, filename } = await apiDownloadFile(`/file-attachments/${fileId}/download`, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename || fallbackName; a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — file may have been deleted or access revoked
    } finally {
      setDownloadingIds((prev) => { const s = new Set(prev); s.delete(fileId); return s; });
    }
  }

  useEffect(() => {
    if (!exportOpen) return;
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [exportOpen]);

  // ── Load report data ─────────────────────────────────────────────────────
  // silent=true: debounced auto-refresh — no spinner, preserves existing data on failure
  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) { setLoading(true); setFetchError(''); }
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo)   params.set('dateTo', dateTo);
      if (deptFilter) params.set('departmentId', deptFilter);
      if (wsFilter)   params.set('workspaceId', wsFilter);
      const result = await apiGet<ReportOverview>(`/reports/overview?${params}`, token);
      setData(result);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      if (!silent) setFetchError(err instanceof Error ? err.message : 'Failed to load report data');
      // On silent failure: preserve existing data, no error shown
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, dateFrom, dateTo, deptFilter, wsFilter]);

  // Load filter options
  useEffect(() => {
    if (!token || !isElevated) return;
    void apiGet<ReportDepartment[]>('/departments?includeInactive=false', token)
      .then(setDepartments).catch(() => {});
    void apiGet<{ items: ReportWorkspace[] }>('/workspaces?status=ACTIVE&limit=200', token)
      .then((r) => setWorkspaces(Array.isArray(r) ? r : r.items ?? [])).catch(() => {});
  }, [token, isElevated]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: auto-refresh reports with a 2.5s debounce (heavier — report queries are expensive)
  useEffect(() => {
    if (!socket) return;
    const schedule = () => {
      if (reportsRefreshTimer.current) clearTimeout(reportsRefreshTimer.current);
      reportsRefreshTimer.current = setTimeout(() => void load(true), 2500);
    };
    STALE_EVENTS.forEach((ev) => socket.on(ev, schedule));
    return () => {
      STALE_EVENTS.forEach((ev) => socket.off(ev, schedule));
      if (reportsRefreshTimer.current) clearTimeout(reportsRefreshTimer.current);
    };
  }, [socket, load]);

  // Apply preset
  function applyPreset(p: DateRangePreset) {
    setPreset(p);
    if (p !== 'custom') {
      const range = getDateRange(p);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }

  function resetFilters() {
    setPreset('month');
    const range = getDateRange('month');
    setDateFrom(range.from);
    setDateTo(range.to);
    setDeptFilter('');
    setWsFilter('');
  }

  const hasActiveFilters = deptFilter || wsFilter || preset !== 'month';

  // ── Render ────────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const cardSt = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' };
  const thSt   = { color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' };
  const tdSt   = { color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' };

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Operations &amp; Compliance Report
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            RECAFCO workspace, task, document, issue, and expiry summary · {today}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Reporting period: {fmtDate(dateFrom)} – {fmtDate(dateTo)}
            {lastUpdated && !loading && <> · Last updated: {lastUpdated}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {lastUpdated && !loading && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {lastUpdated}</span>
          )}
          {/* Export menu */}
          <div className="relative" ref={exportRef}>
            <button onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}>
              <Download className="h-3.5 w-3.5" />Export
            </button>
            {exportOpen && data && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl py-1 shadow-lg"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <button onClick={() => { exportSummaryCSV(data, dateFrom, dateTo); setExportOpen(false); }}
                  className="flex w-full items-center px-3 py-2 text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                  Export Summary CSV
                </button>
                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '2px 0' }} />
                <button onClick={() => { window.print(); setExportOpen(false); }}
                  className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                  Print Report
                </button>
                {data.departmentStatus.length > 0 && (
                  <button onClick={() => { exportDeptCSV(data.departmentStatus); setExportOpen(false); }}
                    className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    Export Dept Status CSV
                  </button>
                )}
                <button onClick={() => { exportWsCSV(data.workspaceStatus); setExportOpen(false); }}
                  className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                  Export Workspace CSV
                </button>
                {data.overdueTasks.length > 0 && (
                  <button onClick={() => { exportOverdueCSV(data.overdueTasks); setExportOpen(false); }}
                    className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    Export Overdue Tasks CSV
                  </button>
                )}
                {data.issueRows.length > 0 && (
                  <button onClick={() => { exportIssuesCSV(data.issueRows); setExportOpen(false); }}
                    className="flex w-full items-center px-3 py-2 text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    Export Issues CSV
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg p-2"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}
            title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filters toolbar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border p-4" style={cardSt}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date preset tabs */}
          <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            {DATE_PRESETS.map((p) => (
              <button key={p.value} onClick={() => applyPreset(p.value)}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{
                  backgroundColor: preset === p.value ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: preset === p.value ? '#fff' : 'var(--text-secondary)',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
            </div>
          )}

          {isElevated && (
            <button onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: 'var(--border-default)', color: showFilters ? 'var(--accent-primary)' : 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}>
              <Filter className="h-3.5 w-3.5" />More Filters
            </button>
          )}

          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}>
              <X className="h-3 w-3" />Reset
            </button>
          )}

          <button onClick={() => void load()}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}>
            Apply
          </button>
        </div>

        {showFilters && isElevated && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-xs outline-none cursor-pointer"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={wsFilter} onChange={(e) => setWsFilter(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-xs outline-none cursor-pointer"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              <option value="">All Workspaces</option>
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Loading / Error ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      )}

      {!loading && fetchError && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)' }}>
          <AlertTriangle className="mx-auto mb-2 h-6 w-6" style={{ color: 'var(--state-error)' }} />
          <p className="text-sm" style={{ color: 'var(--state-error)' }}>{fetchError}</p>
          <button onClick={() => void load()} className="mt-2 text-xs underline" style={{ color: 'var(--state-error)' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !fetchError && data && (
        <>
          {/* ── Business Attention Summary ─────────────────────────────────── */}
          <div className="rounded-xl border p-5" style={{
            ...cardSt,
            backgroundColor: data.summary.status === 'critical'
              ? 'var(--state-error-soft)'
              : data.summary.status === 'needs_attention'
                ? 'var(--state-warning-soft)'
                : 'var(--state-success-soft)',
            borderColor: data.summary.status === 'critical'
              ? 'var(--state-error)'
              : data.summary.status === 'needs_attention'
                ? 'var(--state-warning)'
                : 'var(--state-success)',
          }}>
            <div className="flex items-center gap-3 mb-4">
              {data.summary.status === 'critical'
                ? <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--state-error)' }} />
                : data.summary.status === 'needs_attention'
                  ? <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--state-warning)' }} />
                  : <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--state-success)' }} />
              }
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Business Attention Summary — <StatusBadge status={data.summary.status} />
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {data.summary.status === 'critical'
                    ? 'Immediate action required: overdue tasks, issues, or expired files detected.'
                    : data.summary.status === 'needs_attention'
                      ? 'Some items require attention: documents under review, open issues, or expiring files.'
                      : 'No urgent items detected. Operations appear on track.'}
                </p>
              </div>
            </div>
            {/* Urgent items highlight */}
            {data.summary.status !== 'healthy' && (
              <div className="flex flex-wrap gap-3 mb-4">
                {data.summary.overdueTasks > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)' }}>
                    {data.summary.overdueTasks} overdue task{data.summary.overdueTasks !== 1 ? 's' : ''}
                  </span>
                )}
                {data.summary.overdueIssues > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)' }}>
                    {data.summary.overdueIssues} overdue issue{data.summary.overdueIssues !== 1 ? 's' : ''}
                  </span>
                )}
                {data.summary.expiredFiles > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)', border: '1px solid var(--state-error)' }}>
                    {data.summary.expiredFiles} expired file{data.summary.expiredFiles !== 1 ? 's' : ''}
                  </span>
                )}
                {data.summary.docsUnderReview > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)' }}>
                    {data.summary.docsUnderReview} doc{data.summary.docsUnderReview !== 1 ? 's' : ''} under review
                  </span>
                )}
                {data.summary.expiringSoonFiles > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)' }}>
                    {data.summary.expiringSoonFiles} expiring soon
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── KPI Cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {[
              {
                label: 'Active Workspaces', value: data.summary.activeWorkspaces,
                sub: 'Currently active', icon: FolderOpen, color: 'var(--accent-primary)',
              },
              {
                label: 'Open Tasks', value: data.summary.openTasks,
                sub: `${data.summary.completedInPeriod} completed in period`, icon: ListTodo, color: 'var(--text-primary)',
              },
              {
                label: 'Overdue Tasks', value: data.summary.overdueTasks,
                sub: data.summary.overdueTasks > 0 ? 'Immediate action needed' : 'None overdue',
                icon: Clock,
                color: data.summary.overdueTasks > 0 ? 'var(--state-error)' : 'var(--state-success)',
              },
              {
                label: 'Documents', value: data.summary.docsTotal,
                sub: `${data.summary.docsUnderReview} under review`, icon: FileText, color: 'var(--text-primary)',
              },
              {
                label: 'Docs Under Review', value: data.summary.docsUnderReview,
                sub: 'Pending approval', icon: TrendingUp,
                color: data.summary.docsUnderReview > 0 ? 'var(--state-warning)' : 'var(--state-success)',
              },
              {
                label: 'Open Issues', value: data.summary.openIssues,
                sub: `${data.summary.overdueIssues} overdue`, icon: AlertCircle,
                color: data.summary.openIssues > 0 ? 'var(--state-error)' : 'var(--state-success)',
              },
              {
                label: 'Expired Files', value: data.summary.expiredFiles,
                sub: 'Renewal required', icon: Zap,
                color: data.summary.expiredFiles > 0 ? 'var(--state-error)' : 'var(--state-success)',
              },
              {
                label: 'Expiring Soon', value: data.summary.expiringSoonFiles,
                sub: 'Based on file reminder setting', icon: AlertTriangle,
                color: data.summary.expiringSoonFiles > 0 ? 'var(--state-warning)' : 'var(--state-success)',
              },
            ].map((card) => (
              <div key={card.label} className="rounded-xl px-4 py-4" style={cardSt}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
                  <card.icon className="h-3.5 w-3.5" style={{ color: 'var(--text-disabled)' }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Department Operations Status (elevated only) ────────────────── */}
          {isElevated && data.departmentStatus.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={cardSt}>
              <SectionHeader title="Department Operations Status" count={data.departmentStatus.length} icon={Building2} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Department', 'Code', 'Workspaces', 'Open Tasks', 'Overdue', 'Docs Under Review', 'Open Issues', 'Last Activity', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={thSt}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.departmentStatus.map((d) => (
                      <tr key={d.departmentId}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{d.departmentName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{d.code}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{d.activeWorkspaces}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{d.openTasks}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: d.overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-muted)', fontWeight: d.overdueTasks > 0 ? 600 : 400 }}>{d.overdueTasks}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: d.docsUnderReview > 0 ? 'var(--state-warning)' : 'var(--text-muted)' }}>{d.docsUnderReview}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: d.openIssues > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>{d.openIssues}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{d.lastActivity ? timeAgo(d.lastActivity) : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Workspace Status ───────────────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden" style={cardSt}>
            <SectionHeader title="Workspace Status" count={data.workspaceStatus.length} icon={FolderOpen} />
            {data.workspaceStatus.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FolderOpen className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No workspaces found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Workspace', 'Department', 'Open Tasks', 'Overdue', 'Docs', 'Under Review', 'Open Issues', 'Expired Files', 'Members', 'Last Activity', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={thSt}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.workspaceStatus.map((ws) => (
                      <tr key={ws.id}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-4 py-3">
                          <Link href={`/workspaces/${ws.id}`} className="flex items-center gap-1 text-xs font-medium hover:underline"
                            style={{ color: 'var(--accent-primary)' }}>
                            {ws.name}<ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{ws.department ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{ws.openTasks}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: ws.overdueTasks > 0 ? 'var(--state-error)' : 'var(--text-muted)', fontWeight: ws.overdueTasks > 0 ? 600 : 400 }}>{ws.overdueTasks}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{ws.totalDocs}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: ws.docsUnderReview > 0 ? 'var(--state-warning)' : 'var(--text-muted)' }}>{ws.docsUnderReview}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: ws.openIssues > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>{ws.openIssues}</td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: ws.expiredFiles > 0 ? 'var(--state-error)' : 'var(--text-muted)' }}>
                          {ws.expiredFiles > 0 ? ws.expiredFiles : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>
                          <div className="flex items-center gap-1"><Users className="h-3 w-3" />{ws.memberCount}</div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{ws.lastActivity ? timeAgo(ws.lastActivity) : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={ws.operationalStatus} label={ws.operationalStatusLabel} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Overdue Work ───────────────────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden" style={cardSt}>
            <SectionHeader title="Overdue Work" count={data.overdueTasks.length} icon={Clock} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Task', 'Workspace', 'Department', 'Assignee', 'Due Date', 'Overdue By', 'Priority', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={thSt}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.overdueTasks.length === 0 ? (
                    <EmptyRow cols={8} message="No overdue tasks for the selected period." />
                  ) : data.overdueTasks.map((t) => {
                    const ovdDays = overdueByDays(t.dueDate);
                    return (
                      <tr key={t.id}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-4 py-3">
                          <Link href={`/workspaces/${t.workspaceId}?task=${t.id}`}
                            className="text-xs font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
                            {t.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>
                          <Link href={`/workspaces/${t.workspaceId}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
                            {t.workspaceName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{t.department ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{t.assignee ?? <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--state-error)' }}>{fmtDate(t.dueDate)}</td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--state-error)' }}>{ovdDays}d</td>
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: PRIORITY_COLOR[t.priority] ?? 'var(--text-muted)' }}>{t.priority}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{t.status.replace(/_/g, ' ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Documents Requiring Attention ──────────────────────────────── */}
          <div className="rounded-xl overflow-hidden" style={cardSt}>
            <SectionHeader title="Documents Requiring Attention" count={data.documentsRequiringAttention.length} icon={FileText} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Document / File', 'Type', 'Workspace', 'Responsible', 'Status', 'Expiry Date', 'Action'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={thSt}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.documentsRequiringAttention.length === 0 ? (
                    <EmptyRow cols={7} message="No documents requiring attention." />
                  ) : data.documentsRequiringAttention.map((doc) => {
                    const statusColor = doc.status === 'EXPIRED' ? 'var(--state-error)'
                      : doc.status === 'EXPIRING_SOON' ? 'var(--state-warning)'
                      : 'var(--state-warning)';
                    const statusBg = doc.status === 'EXPIRED' ? 'var(--state-error-soft)'
                      : doc.status === 'EXPIRING_SOON' ? 'var(--state-warning-soft)'
                      : 'var(--state-warning-soft)';
                    const statusLabel = doc.status === 'UNDER_REVIEW' ? 'Under Review'
                      : doc.status === 'EXPIRED' ? 'Expired'
                      : doc.status === 'EXPIRING_SOON' ? 'Expiring Soon'
                      : doc.status;
                    return (
                      <tr key={doc.id}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                        <td className="px-4 py-3 text-xs font-medium max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>{doc.title}</td>
                        <td className="px-4 py-3">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                            {doc.type === 'DOCUMENT' ? 'Document' : 'Task File'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{doc.workspaceName ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={tdSt}>{doc.responsible ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ color: statusColor, backgroundColor: statusBg }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: doc.expiryDate ? statusColor : 'var(--text-muted)' }}>
                          {fmtDate(doc.expiryDate)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {doc.type === 'DOCUMENT' && doc.workspaceId ? (
                            <Link href={`/documents/${doc.id}`} className="hover:underline" style={{ color: 'var(--accent-primary)' }}>
                              Open Document
                            </Link>
                          ) : doc.type === 'DOCUMENT' ? (
                            <span style={{ color: 'var(--text-muted)' }}>Record unavailable</span>
                          ) : doc.relatedTaskId && doc.relatedTaskWorkspaceId ? (
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/workspaces/${doc.relatedTaskWorkspaceId}?task=${doc.relatedTaskId}&fileId=${doc.id}`}
                                className="hover:underline" style={{ color: 'var(--accent-primary)' }}>
                                Open Task ↗
                              </Link>
                              <button
                                onClick={() => void downloadFile(doc.id, doc.title)}
                                disabled={downloadingIds.has(doc.id)}
                                className="hover:underline disabled:opacity-50"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Download file">
                                {downloadingIds.has(doc.id) ? '…' : 'Download'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Record unavailable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Issues & Corrective Actions ────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden" style={cardSt}>
            <SectionHeader title="Issues &amp; Corrective Actions" icon={AlertCircle} />
            {/* Summary counts */}
            <div className="grid grid-cols-3 gap-px sm:grid-cols-6 border-b" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--border-default)' }}>
              {([
                { label: 'Open',        value: data.issuesSummary.open,       color: 'var(--state-error)' },
                { label: 'In Progress', value: data.issuesSummary.inProgress, color: 'var(--state-warning)' },
                { label: 'Submitted',   value: data.issuesSummary.submitted,  color: 'var(--accent-primary)' },
                { label: 'Verified',    value: data.issuesSummary.verified,   color: 'var(--state-success)' },
                { label: 'Closed',      value: data.issuesSummary.closed,     color: 'var(--text-muted)' },
                { label: 'Overdue',     value: data.issuesSummary.overdue,    color: 'var(--state-error)' },
              ] as const).map((s) => (
                <div key={s.label} className="px-4 py-3 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
            {/* Issue rows table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Issue #', 'Title', 'Workspace', 'Department', 'Priority', 'Assignee', 'Due Date', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={thSt}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.issueRows.length === 0 ? (
                    <EmptyRow cols={8} message="No open or overdue issues." />
                  ) : data.issueRows.map((r) => (
                    <tr key={r.id}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{r.ncrNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.title}</td>
                      <td className="px-4 py-3 text-xs" style={tdSt}>{r.workspaceName ?? '—'}</td>
                      <td className="px-4 py-3 text-xs" style={tdSt}>{r.department ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: PRIORITY_COLOR[r.priority] ?? 'var(--text-muted)' }}>{r.priority}</td>
                      <td className="px-4 py-3 text-xs" style={tdSt}>{r.assignee ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: r.dueDate && new Date(r.dueDate) < new Date() ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                        {fmtDate(r.dueDate)}
                      </td>
                      <td className="px-4 py-3"><IssueStatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Recent Business Activity ───────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden" style={cardSt}>
            <SectionHeader title="Recent Business Activity" count={data.recentActivity.length} icon={Activity} />
            {data.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Activity className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No activity recorded for the selected period.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <div className="h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                      <span className="text-[10px] font-semibold">{a.actorName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{a.actorName}</span>
                        {' '}{a.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                          {a.entityType}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{fmtDateTime(a.createdAt)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] flex-shrink-0 mt-1" style={{ color: 'var(--text-disabled)' }}>{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Print-only header (hidden on screen, visible in print) ─── */}
          <div className="hidden print:block rounded-xl border p-4 text-xs" style={{ borderColor: 'var(--border-default)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              RECAFCO AuditFlow IMS — Operations &amp; Compliance Report
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Reporting period: {fmtDate(dateFrom)} – {fmtDate(dateTo)}
              {lastUpdated && <> · Last updated: {lastUpdated}</>}
              {(deptFilter || wsFilter) && ' · Filtered view'}
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              Generated: {new Date(data.generatedAt).toLocaleString('en-GB')} · Internal Use Only
            </p>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <p className="text-xs text-center print:hidden" style={{ color: 'var(--text-disabled)' }}>
            RECAFCO AuditFlow IMS · Internal Use Only · Generated {new Date(data.generatedAt).toLocaleString('en-GB')}
            {(deptFilter || wsFilter) && ' · Filtered view'}
          </p>
        </>
      )}
    </div>
  );
}
