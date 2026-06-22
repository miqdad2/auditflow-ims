'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Search, X, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CreateNcrModal } from '@/features/ncr-capa/create-ncr-modal';
import { NcrDetailPanel } from '@/features/ncr-capa/ncr-detail-panel';
import type { NcrCapaSummary, NcrStatus, Severity } from '@/features/ncr-capa/types';
import { NCR_STATUS_CONFIG, SEVERITY_CONFIG } from '@/features/ncr-capa/types';

interface Props {
  workspaceId: string;
  workspaceName: string;
  refreshKey?: number;
  canCollaborate?: boolean;
}

function NcrStatusBadge({ status }: { status: NcrStatus }) {
  const cfg = NCR_STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function SevBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
  );
}

export function WorkspaceNcrTab({ workspaceId, workspaceName, refreshKey, canCollaborate = false }: Props) {
  const { token, user } = useAuth();

  const [records, setRecords]     = useState<NcrCapaSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Issue creation requires ncr.create permission specifically.
  // Workspace collaboration (canCollaborate) does NOT automatically grant issue-creation rights.
  const canCreate = user?.permissions?.includes('ncr.create') ?? false;

  const loadRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspaceId });
      if (statusFilter) params.set('status', statusFilter);
      if (search)       params.set('search', search);
      const data = await apiGet<NcrCapaSummary[]>(`/ncr-capa?${params}`, token);
      setRecords(Array.isArray(data) ? data : (data as { items?: NcrCapaSummary[] }).items ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, workspaceId, statusFilter, search]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);
  useEffect(() => { if (refreshKey !== undefined && refreshKey > 0) void loadRecords(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCount   = records.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length;
  const overdueCount = records.filter((r) => r.status === 'OVERDUE').length;

  function getAge(createdAt: string) {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1d';
    return `${days}d`;
  }

  const STATUS_TABS: Array<{ key: string; label: string }> = [
    { key: '', label: `All (${records.length})` },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'WAITING_EVIDENCE', label: 'Waiting for Information' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'REJECTED', label: 'Returned' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  return (
    <div className="flex h-full w-full flex-col">
      {/* Tab header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Issues &amp; Corrective Actions</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Track issues, assign responsibility, and verify completion.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}>
            <Plus className="h-3.5 w-3.5" />Raise Issue
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5"
        style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
            <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="w-40 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }} />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {/* Status summary chips */}
          {openCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
              {openCount} open
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
              {overdueCount} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadRecords()}
            className="rounded-lg p-1.5" style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href={`/ncr-capa?workspaceId=${workspaceId}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}>
            <ExternalLink className="h-3.5 w-3.5" />All Issues
          </Link>
        </div>
      </div>

      {/* Status tab bar */}
      <div className="flex items-center gap-0 overflow-x-auto px-6"
        style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        {STATUS_TABS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setStatusFilter(key)}
            className="border-b-2 px-4 py-2 text-xs -mb-px whitespace-nowrap transition-colors outline-none"
            style={{
              borderColor: statusFilter === key ? 'var(--accent-primary)' : 'transparent',
              color:       statusFilter === key ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight:  statusFilter === key ? 600 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <AlertTriangle className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {statusFilter || search ? 'No issues match the current filter' : 'No issues in this workspace'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {statusFilter || search
                ? 'Try clearing the filter to see all issues.'
                : 'Raise the first issue when a problem or corrective action needs to be tracked.'}
            </p>
            {canCreate && !statusFilter && !search && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white mt-1"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-3.5 w-3.5" />Raise First Issue
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                {['Issue', 'Type', 'Priority', 'Status', 'Responsible Person', 'Due Date', 'Age', 'Raised'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="cursor-pointer"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onClick={() => setSelectedId(r.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
                      {r.ncrNumber && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.ncrNumber}</span>}
                      {r.isoClause && <span className="text-xs" style={{ color: 'var(--accent-primary)' }}>Clause {r.isoClause}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3"><SevBadge severity={r.severity} /></td>
                  <td className="px-4 py-3"><NcrStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {r.assignedTo?.fullName ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs"
                    style={{ color: r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'CLOSED' ? 'var(--state-error)' : 'var(--text-secondary)' }}>
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {getAge(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selectedId && (
        <NcrDetailPanel
          recordId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void loadRecords()}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateNcrModal
          defaultWorkspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(record) => {
            setShowCreate(false);
            setRecords((prev) => [record, ...prev]);
          }}
        />
      )}
    </div>
  );
}
