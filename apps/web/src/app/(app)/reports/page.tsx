'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { DashboardOverview } from '@/features/dashboard/types';

function readinessColor(pct: number): string {
  if (pct >= 80) return 'var(--state-success)';
  if (pct >= 50) return 'var(--state-warning)';
  return 'var(--state-error)';
}

export default function ReportsPage() {
  const { token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const [data, setData]       = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${base}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load report data');
      const json = await res.json() as DashboardOverview;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [base, token]);

  useEffect(() => { void load(); }, [load]);

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)' }}>
        <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error || 'Failed to load'}</p>
        <button onClick={() => void load()} className="mt-2 text-xs underline" style={{ color: 'var(--state-error)' }}>Retry</button>
      </div>
    );
  }

  const { overallAuditReadinessPercent, checklistReadinessPercent, departmentReadiness,
          documentSummary, evidenceSummary, ncrCapaSummary, overdueSummary } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Audit Readiness Report</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            RECAFCO — ISO/QHSE Audit Readiness Summary · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <Download className="h-3.5 w-3.5" />
            Print / Export
          </button>
          <button onClick={() => void load()} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overall readiness banner */}
      <div
        className="rounded-xl px-6 py-5 flex items-center gap-6"
        style={{
          backgroundColor: readinessColor(overallAuditReadinessPercent) === 'var(--state-success)'
            ? 'var(--state-success-soft)' : readinessColor(overallAuditReadinessPercent) === 'var(--state-warning)'
              ? 'var(--state-warning-soft)' : 'var(--state-error-soft)',
          border: `1px solid ${readinessColor(overallAuditReadinessPercent)}30`,
        }}
      >
        <Shield className="h-10 w-10 shrink-0" style={{ color: readinessColor(overallAuditReadinessPercent) }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Overall ISO Audit Readiness
          </p>
          <p className="text-4xl font-bold" style={{ color: readinessColor(overallAuditReadinessPercent) }}>
            {overallAuditReadinessPercent}%
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Checklist: {checklistReadinessPercent}% · Documents: {documentSummary.total > 0 ? Math.round(documentSummary.approved / documentSummary.total * 100) : 0}% · NCR Resolution: {ncrCapaSummary.total > 0 ? Math.round((ncrCapaSummary.verified + ncrCapaSummary.closed) / ncrCapaSummary.total * 100) : 100}%
          </p>
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Documents',     value: documentSummary.total,    sub: `${documentSummary.approved} approved` },
          { label: 'Evidence Items',      value: evidenceSummary.totalItems, sub: `${evidenceSummary.approved} approved` },
          { label: 'Open NCR/CAPA',       value: ncrCapaSummary.open + ncrCapaSummary.inProgress, sub: `${ncrCapaSummary.overdue} overdue` },
          { label: 'Total Overdue Items', value: overdueSummary.total,     sub: `${overdueSummary.overdueTasks} tasks, ${overdueSummary.overdueNcrCapa} NCR` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl px-4 py-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Department readiness */}
      {departmentReadiness.length > 0 && (
        <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-default)' }}>
            <BarChart3 className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Department Readiness</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[...departmentReadiness].sort((a, b) => b.readinessPercent - a.readinessPercent).map((d) => (
              <div key={d.departmentId}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{d.departmentName}</span>
                  <div className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-xs">
                      {d.approved} approved / {d.total} total
                      {d.missing > 0 && <span style={{ color: 'var(--state-error)' }}> · {d.missing} missing</span>}
                    </span>
                    <span className="font-bold w-10 text-right" style={{ color: readinessColor(d.readinessPercent) }}>
                      {d.readinessPercent}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.readinessPercent}%`, backgroundColor: readinessColor(d.readinessPercent) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Document Status</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {[
              { label: 'Approved',     value: documentSummary.approved,    color: 'var(--state-success)' },
              { label: 'Under Review', value: documentSummary.underReview,  color: 'var(--state-warning)' },
              { label: 'Draft',        value: documentSummary.draft,        color: 'var(--text-muted)' },
              { label: 'Rejected',     value: documentSummary.rejected,     color: 'var(--state-error)' },
              { label: 'Archived',     value: documentSummary.archived,     color: 'var(--text-disabled)' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Evidence Summary</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {[
              { label: 'Approved',  value: evidenceSummary.approved,  color: 'var(--state-success)' },
              { label: 'Submitted', value: evidenceSummary.submitted, color: 'var(--state-warning)' },
              { label: 'Rejected',  value: evidenceSummary.rejected,  color: 'var(--state-error)' },
              { label: 'Missing',   value: evidenceSummary.missing,   color: 'var(--text-muted)' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-default)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Readiness</span>
              <span className="font-bold" style={{ color: readinessColor(evidenceSummary.readinessPercent) }}>
                {evidenceSummary.readinessPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NCR/CAPA */}
      <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Issues &amp; Corrective Actions</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-4 gap-4">
          {[
            { label: 'Open',     value: ncrCapaSummary.open,     color: 'var(--state-error)' },
            { label: 'Verified', value: ncrCapaSummary.verified, color: 'var(--state-success)' },
            { label: 'Closed',   value: ncrCapaSummary.closed,   color: 'var(--text-muted)' },
            { label: 'Overdue',  value: ncrCapaSummary.overdue,  color: 'var(--state-error)' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-disabled)' }}>
        RECAFCO AuditFlow IMS · Internal Use Only · Generated {new Date().toLocaleString()}
      </p>
    </div>
  );
}
