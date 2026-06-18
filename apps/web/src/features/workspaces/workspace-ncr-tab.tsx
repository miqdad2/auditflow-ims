'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Search, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
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

  const canCreate = (user?.permissions?.includes('ncr.create') ?? false) || canCollaborate;

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

  const STATUS_TABS: Array<{ key: string; label: string }> = [
    { key: '', label: `All (${records.length})` },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); void loadRecords(); }} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues…"
                className="rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none w-44"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </form>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {openCount > 0 && (
              <span style={{ color: 'var(--state-error)' }}>
                <strong>{openCount}</strong> open
              </span>
            )}
            {overdueCount > 0 && (
              <span style={{ color: 'var(--state-error)' }}>
                · <strong>{overdueCount}</strong> overdue
              </span>
            )}
            {openCount === 0 && overdueCount === 0 && (
              <span>{records.length} record{records.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadRecords()}
            className="rounded-lg p-1.5" style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href={`/ncr-capa?workspaceId=${workspaceId}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <ExternalLink className="h-3.5 w-3.5" />All Issues
          </Link>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}>
              <Plus className="h-3.5 w-3.5" />Raise Issue
            </button>
          )}
        </div>
      </div>

      {/* Status tab bar */}
      <div className="flex items-center gap-0 overflow-x-auto px-6"
        style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
        {STATUS_TABS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setStatusFilter(key)}
            className="border-b-2 px-4 py-2 text-xs -mb-px whitespace-nowrap transition-colors"
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
              {statusFilter ? 'No issues with this status' : 'No issues in this workspace'}
            </p>
            {canCreate && !statusFilter && (
              <button onClick={() => setShowCreate(true)}
                className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                Raise the first issue →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                {['Issue', 'Type', 'Priority', 'Status', 'Responsible Person', 'Due Date', 'Raised'].map((h) => (
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
