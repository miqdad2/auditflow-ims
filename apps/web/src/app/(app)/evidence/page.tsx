'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileCheck, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface EvidenceReview {
  id: string;
  status: string;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  submittedBy: { id: string; fullName: string } | null;
  checklistItem: {
    id: string;
    title: string;
    isoClause: string | null;
    checklist: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
  } | null;
}

function statusStyle(s: string): { color: string; bg: string; label: string } {
  switch (s) {
    case 'SUBMITTED': return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)', label: 'Submitted' };
    case 'APPROVED':  return { color: 'var(--state-success)', bg: 'var(--state-success-soft)', label: 'Approved' };
    case 'REJECTED':  return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)',   label: 'Rejected' };
    case 'MISSING':   return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)',            label: 'Missing' };
    default:          return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)',            label: s };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

export default function EvidencePage() {
  const { user, token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const [items, setItems]     = useState<EvidenceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');

  const canReview = user?.permissions?.includes('checklist.review') ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all checklists, then their items, then evidence
      // Use dashboard overview's evidenceSummary as a proxy to know if there's anything
      // For the evidence page, we show evidence grouped from checklists
      const res = await fetch(`${base}/checklists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load checklists');
      const checklists = await res.json() as { id: string }[];

      // Collect evidence from all checklists' items
      const allEvidence: EvidenceReview[] = [];
      for (const cl of checklists) {
        const itemsRes = await fetch(`${base}/checklists/${cl.id}/items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!itemsRes.ok) continue;
        const clItems = await itemsRes.json() as { id: string }[];
        for (const item of clItems) {
          const evRes = await fetch(`${base}/checklists/items/${item.id}/evidence`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!evRes.ok) continue;
          const evList = await evRes.json() as EvidenceReview[];
          allEvidence.push(...evList);
        }
      }

      // Sort by createdAt desc
      allEvidence.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(allEvidence);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [base, token]);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter(e => statusFilter === 'all' || e.status === statusFilter);

  const counts = {
    SUBMITTED: items.filter(e => e.status === 'SUBMITTED').length,
    APPROVED:  items.filter(e => e.status === 'APPROVED').length,
    REJECTED:  items.filter(e => e.status === 'REJECTED').length,
    all:       items.length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Evidence Review</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {canReview
              ? 'Review and approve or reject submitted audit evidence'
              : 'Your submitted audit evidence and approval status'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/checklist"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
            Go to Checklists
          </Link>
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Submitted',  value: counts.SUBMITTED, color: 'var(--state-warning)' },
          { label: 'Approved',   value: counts.APPROVED,  color: 'var(--state-success)' },
          { label: 'Rejected',   value: counts.REJECTED,  color: 'var(--state-error)' },
          { label: 'Total',      value: counts.all,       color: 'var(--text-muted)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {[
          { key: 'SUBMITTED', label: `Pending Review (${counts.SUBMITTED})` },
          { key: 'APPROVED',  label: `Approved (${counts.APPROVED})` },
          { key: 'REJECTED',  label: `Rejected (${counts.REJECTED})` },
          { key: 'all',       label: `All (${counts.all})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className="px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors"
            style={{
              borderColor: statusFilter === key ? 'var(--accent-primary)' : 'transparent',
              color: statusFilter === key ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Evidence list */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--accent-primary)', borderRightColor: 'var(--accent-primary)' }} />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--state-error)' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <FileCheck className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No evidence in this category.
            </p>
            <Link href="/checklist" className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              Go to Audit Checklist →
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {filtered.map((ev) => {
              const ss = statusStyle(ev.status);
              const dept = ev.checklistItem?.department?.name;
              const clause = ev.checklistItem?.isoClause;
              return (
                <div key={ev.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {ev.checklistItem?.title ?? 'Unknown item'}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {clause && (
                            <span className="text-xs" style={{ color: 'var(--accent-primary)' }}>
                              Clause {clause}
                            </span>
                          )}
                          {dept && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dept}</span>
                          )}
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Submitted by {ev.submittedBy?.fullName ?? 'Unknown'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {timeAgo(ev.createdAt)}
                          </span>
                        </div>
                        {ev.notes && (
                          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {ev.notes}
                          </p>
                        )}
                        {ev.rejectionReason && ev.status === 'REJECTED' && (
                          <p className="mt-1 text-xs px-2 py-1 rounded" style={{ color: 'var(--state-error)', backgroundColor: 'var(--state-error-soft)' }}>
                            Rejected: {ev.rejectionReason}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ color: ss.color, backgroundColor: ss.bg }}
                        >
                          {ss.label}
                        </span>
                        {ev.checklistItem && (
                          <Link
                            href="/checklist"
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Open in checklist"
                          >
                            <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-disabled)' }} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canReview && counts.SUBMITTED > 0 && (
        <div className="rounded-xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)' }}>
          <p className="text-sm" style={{ color: 'var(--state-warning)' }}>
            <strong>{counts.SUBMITTED}</strong> evidence submission{counts.SUBMITTED > 1 ? 's' : ''} pending your review.
            Open the Audit Checklist to approve or reject.
          </p>
          <Link
            href="/checklist"
            className="shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium"
            style={{ backgroundColor: 'var(--state-warning)', color: '#fff' }}
          >
            Review Now
          </Link>
        </div>
      )}
    </div>
  );
}
