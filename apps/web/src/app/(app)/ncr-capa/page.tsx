'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle, Plus, Search, RefreshCw, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { CreateNcrModal } from '@/features/ncr-capa/create-ncr-modal';
import { NcrDetailPanel } from '@/features/ncr-capa/ncr-detail-panel';
import type { NcrCapaSummary, NcrStatus, Severity } from '@/features/ncr-capa/types';
import { NCR_STATUS_CONFIG, SEVERITY_CONFIG } from '@/features/ncr-capa/types';

const STATUS_TABS: Array<{ key: NcrStatus | 'ALL'; label: string }> = [
  { key: 'ALL',             label: 'All' },
  { key: 'OPEN',            label: 'Open' },
  { key: 'IN_PROGRESS',     label: 'In Progress' },
  { key: 'SUBMITTED',       label: 'Submitted' },
  { key: 'VERIFIED',        label: 'Verified' },
  { key: 'CLOSED',          label: 'Closed' },
  { key: 'REJECTED',        label: 'Rejected' },
];

function StatusBadge({ status }: { status: NcrStatus }) {
  const cfg = NCR_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className="text-xs font-medium" style={{ color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export default function NcrCapaPage() {
  const { user, token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const searchParams = useSearchParams();

  const [records, setRecords]       = useState<NcrCapaSummary[]>([]);
  const [allRecords, setAllRecords] = useState<NcrCapaSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusTab, setStatusTab]   = useState<NcrStatus | 'ALL'>('ALL');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [wsFilter, setWsFilter]     = useState(() => searchParams.get('workspaceId') ?? '');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canCreate = user?.permissions?.includes('ncr.create') ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/ncr-capa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: unknown = await res.json();
      if (Array.isArray(data)) {
        setAllRecords(data as NcrCapaSummary[]);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [base, token]);

  useEffect(() => { void load(); }, [load]);

  // Client-side filter for tabs + search + type + workspace
  useEffect(() => {
    let filtered = allRecords;
    if (statusTab !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusTab);
    }
    if (typeFilter) {
      filtered = filtered.filter(r => r.type === typeFilter);
    }
    if (wsFilter) {
      filtered = filtered.filter(r => r.workspaceId === wsFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.ncrNumber ?? '').toLowerCase().includes(q) ||
        (r.isoClause ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
      );
    }
    setRecords(filtered);
  }, [allRecords, statusTab, search, typeFilter, wsFilter]);

  const countByStatus = allRecords.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const openCount     = allRecords.filter(r => r.status === 'OPEN').length;
  const overdueCount  = allRecords.filter(r => r.status === 'OVERDUE').length;
  const verifiedCount = allRecords.filter(r => r.status === 'VERIFIED' || r.status === 'CLOSED').length;
  const rejectedCount = allRecords.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Issues &amp; Corrective Actions</h1>
            <p className="text-xs text-gray-500">Track issues, assign corrective actions, and verify completion.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Raise Issue
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white rounded border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Open</p>
          <p className="text-2xl font-semibold text-red-600">{openCount}</p>
        </div>
        <div className="bg-white rounded border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Overdue</p>
          <p className="text-2xl font-semibold text-orange-600">{overdueCount}</p>
        </div>
        <div className="bg-white rounded border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Verified / Closed</p>
          <p className="text-2xl font-semibold text-green-600">{verifiedCount}</p>
        </div>
        <div className="bg-white rounded border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Rejected</p>
          <p className="text-2xl font-semibold text-gray-600">{rejectedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search issues…"
            className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="NCR">NCR</option>
          <option value="CAPA">CAPA</option>
          <option value="OBSERVATION">Observation</option>
        </select>
        {wsFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Workspace filtered
            <button onClick={() => setWsFilter('')} title="Clear workspace filter">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 px-6 py-2 border-b border-gray-200 bg-white overflow-x-auto">
        {STATUS_TABS.map(tab => {
          const count = tab.key === 'ALL'
            ? allRecords.length
            : (countByStatus[tab.key] ?? 0);
          return (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                statusTab === tab.key
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">
            Loading issues…
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {allRecords.length === 0 ? 'No issues raised yet' : 'No issues match the current filter'}
            </p>
            {canCreate && allRecords.length === 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Raise Issue
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Issue #</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Priority</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">Responsible Person</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">Department</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Due Date</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-16">Cmt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(r => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                    {r.ncrNumber ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[260px]">{r.title}</p>
                    {r.isoClause && <p className="text-xs text-gray-500">Clause {r.isoClause}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{r.type}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <SeverityBadge severity={r.severity as Severity} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={r.status as NcrStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {r.assignedTo?.fullName ?? <span className="text-gray-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {r.department?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {r.dueDate ? (
                      <span
                        className={
                          new Date(r.dueDate) < new Date() && r.status !== 'CLOSED' && r.status !== 'VERIFIED'
                            ? 'text-red-600 font-medium'
                            : 'text-gray-700'
                        }
                      >
                        {new Date(r.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {r._count.comments > 0 ? r._count.comments : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateNcrModal
          onClose={() => setShowCreate(false)}
          onCreated={(rec) => {
            setAllRecords(prev => [rec, ...prev]);
          }}
        />
      )}

      {selectedId && (
        <NcrDetailPanel
          recordId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load()}
        />
      )}
    </div>
  );
}
