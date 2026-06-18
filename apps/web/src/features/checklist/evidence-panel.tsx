'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Send, CheckCircle, XCircle, AlertCircle, Link2, Link2Off, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet, apiPostAuth, apiPatchAuth, apiDeleteAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { FileAttachmentSection } from '@/features/file-attachments/file-attachment-section';
import type { ChecklistItem, ChecklistEvidence } from './types';
import type { LinkedRecord } from '@/features/workspaces/types';
import { ITEM_STATUS_CONFIG } from './types';

interface Props {
  item: ChecklistItem;
  workspaceId?: string;
  onClose:   () => void;
  onUpdated: (item: ChecklistItem) => void;
}

export function EvidencePanel({ item, workspaceId, onClose, onUpdated }: Props) {
  const { token, user } = useAuth();
  const [evidence,      setEvidence]      = useState<ChecklistEvidence[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [notes,         setNotes]         = useState('');
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejectingId,   setRejectingId]   = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  // Per-evidence linked records state
  const [linkedMap,     setLinkedMap]     = useState<Record<string, LinkedRecord[]>>({});
  const [loadingLinked, setLoadingLinked] = useState<Record<string, boolean>>({});
  const [expandedLinked,setExpandedLinked]= useState<Set<string>>(new Set());
  // One add-link form open at a time
  const [addLinkForEv,    setAddLinkForEv]    = useState<string | null>(null);
  const [addLinkType,     setAddLinkType]     = useState<'DOCUMENT' | 'NCR_CAPA' | 'TASK'>('DOCUMENT');
  const [addLinkSearch,   setAddLinkSearch]   = useState('');
  const [addLinkResults,  setAddLinkResults]  = useState<{ id: string; title: string }[]>([]);
  const [addLinkSelected, setAddLinkSelected] = useState<string | null>(null);
  const [addLinkSearching,setAddLinkSearching]= useState(false);
  const [addLinkSubmitting,setAddLinkSubmitting]= useState(false);
  const [addLinkError,    setAddLinkError]    = useState('');

  const canSubmit = user?.permissions?.includes('evidence.submit') ?? false;
  const canReview = user?.permissions?.includes('checklist.review') ?? false;

  const loadEvidence = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGet<ChecklistEvidence[]>(`/checklists/items/${item.id}/evidence`, token);
      setEvidence(data);
    } catch {
      setError('Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [token, item.id]);

  useEffect(() => { void loadEvidence(); }, [loadEvidence]);

  async function loadLinkedForEv(evId: string) {
    if (!token) return;
    setLoadingLinked((p) => ({ ...p, [evId]: true }));
    try {
      const records = await apiGet<LinkedRecord[]>(`/linked-records?sourceType=CHECKLIST_EVIDENCE&sourceId=${evId}`, token);
      setLinkedMap((p) => ({ ...p, [evId]: records }));
    } catch { /* ignore */ }
    finally { setLoadingLinked((p) => ({ ...p, [evId]: false })); }
  }

  function toggleLinked(evId: string) {
    setExpandedLinked((prev) => {
      const next = new Set(prev);
      if (next.has(evId)) { next.delete(evId); return next; }
      next.add(evId);
      if (!linkedMap[evId]) void loadLinkedForEv(evId);
      return next;
    });
  }

  async function handleEvidenceSearchForLink() {
    if (!token || !workspaceId) return;
    setAddLinkSearching(true);
    setAddLinkResults([]);
    setAddLinkSelected(null);
    setAddLinkError('');
    try {
      const results = await apiGet<{ id: string; title: string }[]>(
        `/linked-records/search?workspaceId=${workspaceId}&targetType=${addLinkType}&q=${encodeURIComponent(addLinkSearch)}`,
        token,
      );
      setAddLinkResults(results);
    } catch { /* ignore */ }
    finally { setAddLinkSearching(false); }
  }

  async function handleEvidenceAddLink() {
    if (!token || !addLinkForEv || !addLinkSelected) return;
    setAddLinkSubmitting(true);
    setAddLinkError('');
    try {
      await apiPostAuth('/linked-records', {
        sourceType: 'CHECKLIST_EVIDENCE', sourceId: addLinkForEv,
        targetType: addLinkType, targetId: addLinkSelected,
      }, token);
      await loadLinkedForEv(addLinkForEv);
      setAddLinkForEv(null); setAddLinkSearch(''); setAddLinkResults([]); setAddLinkSelected(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setAddLinkError(msg.toLowerCase().includes('already exists') ? 'This link already exists.' : msg);
    }
    finally { setAddLinkSubmitting(false); }
  }

  async function handleEvidenceDeleteLink(evId: string, linkId: string) {
    if (!token || !confirm('Remove this link?')) return;
    try {
      await apiDeleteAuth(`/linked-records/${linkId}`, token);
      setLinkedMap((p) => ({ ...p, [evId]: (p[evId] ?? []).filter((r) => r.id !== linkId) }));
    } catch { /* ignore */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true); setError('');
    try {
      const ev = await apiPostAuth<ChecklistEvidence>(`/checklists/items/${item.id}/evidence`, { notes: notes.trim() || undefined }, token);
      setEvidence((prev) => [ev, ...prev]);
      setNotes('');
      onUpdated({ ...item, status: 'SUBMITTED', _count: { evidence: item._count.evidence + 1 } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(evidenceId: string) {
    if (!token) return;
    setError('');
    try {
      const updated = await apiPatchAuth<ChecklistEvidence>(`/checklists/evidence/${evidenceId}/approve`, {}, token);
      setEvidence((prev) => prev.map((e) => e.id === evidenceId ? updated : e));
      onUpdated({ ...item, status: 'APPROVED' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve evidence');
    }
  }

  async function handleReject(evidenceId: string) {
    if (!token || !rejectReason.trim()) return;
    setError('');
    try {
      const updated = await apiPatchAuth<ChecklistEvidence>(`/checklists/evidence/${evidenceId}/reject`, { rejectionReason: rejectReason.trim() }, token);
      setEvidence((prev) => prev.map((e) => e.id === evidenceId ? updated : e));
      setRejectingId(null);
      setRejectReason('');
      onUpdated({ ...item, status: 'REJECTED' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject evidence');
    }
  }

  const cfg = ITEM_STATUS_CONFIG[item.status];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="h-full w-full max-w-xl flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold rounded px-2 py-0.5" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              {item.isoClause && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Clause {item.isoClause}</span>
              )}
            </div>
            <h2 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{item.title}</h2>
            {item.description && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
            )}
            {item.rejectionReason && (
              <div className="mt-2 flex items-start gap-1.5 text-xs rounded px-2 py-1.5" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>Rejected: {item.rejectionReason}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1" style={{ color: 'var(--text-muted)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Evidence list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="h-5 w-5 animate-spin rounded-full" style={{ border: '2px solid var(--bg-muted)', borderTopColor: 'var(--accent-primary)' }} />
            </div>
          ) : evidence.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <Send className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No evidence submitted yet</p>
            </div>
          ) : (
            evidence.map((ev) => (
              <div key={ev.id} className="rounded-lg p-3" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {ev.submittedBy.fullName}
                    </span>
                    <span
                      className="text-xs rounded px-1.5 py-0.5 font-medium"
                      style={{
                        backgroundColor: ev.status === 'APPROVED' ? 'var(--state-success-soft)' : ev.status === 'REJECTED' ? 'var(--state-error-soft)' : 'var(--state-warning-soft)',
                        color: ev.status === 'APPROVED' ? 'var(--state-success)' : ev.status === 'REJECTED' ? 'var(--state-error)' : 'var(--state-warning)',
                      }}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(ev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {ev.notes && (
                  <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{ev.notes}</p>
                )}

                {ev.rejectionReason && (
                  <div className="flex items-start gap-1.5 text-xs rounded px-2 py-1.5 mb-2" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{ev.rejectionReason}</span>
                  </div>
                )}

                {/* Evidence file attachments */}
                <div className="mt-1 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <FileAttachmentSection
                    entityType="CHECKLIST_EVIDENCE"
                    entityId={ev.id}
                    uploadEndpoint={`/checklist-evidence/${ev.id}/attachments`}
                    listEndpoint={`/checklist-evidence/${ev.id}/attachments`}
                    canUpload={canSubmit && ev.status === 'SUBMITTED'}
                    canDelete={canSubmit}
                    isEntityLocked={ev.status === 'APPROVED'}
                    compact
                  />
                </div>

                {/* Linked records for this evidence submission */}
                {workspaceId && (
                  <div className="mt-1 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <button
                      type="button"
                      onClick={() => toggleLinked(ev.id)}
                      className="flex items-center gap-1 py-1.5 text-[11px] font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {expandedLinked.has(ev.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <Link2 className="h-3 w-3" />
                      Linked ({(linkedMap[ev.id] ?? []).length})
                    </button>
                    {expandedLinked.has(ev.id) && (
                      <div className="pb-2 space-y-1.5">
                        {loadingLinked[ev.id] ? (
                          <div className="flex justify-center py-2"><Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
                        ) : (linkedMap[ev.id] ?? []).length === 0 ? (
                          <p className="text-[10px] pl-1" style={{ color: 'var(--text-disabled)' }}>No linked records yet.</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {(linkedMap[ev.id] ?? []).map((r) => (
                              <li key={r.id} className="flex items-center justify-between gap-1">
                                <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{r.targetTitle} <span style={{ color: 'var(--text-disabled)' }}>({r.targetType.replace('_', ' ')})</span></span>
                                {canSubmit && (
                                  <button onClick={() => void handleEvidenceDeleteLink(ev.id, r.id)} title="Remove link" style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                    <Link2Off className="h-3 w-3" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {canSubmit && ev.status !== 'APPROVED' && (
                          addLinkForEv === ev.id ? (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex gap-1">
                                <select value={addLinkType} onChange={(e) => { setAddLinkType(e.target.value as typeof addLinkType); setAddLinkResults([]); setAddLinkSelected(null); }}
                                  className="border rounded px-1 py-0.5 text-[10px]">
                                  <option value="DOCUMENT">Document</option>
                                  <option value="NCR_CAPA">NCR/CAPA</option>
                                  <option value="TASK">Task</option>
                                </select>
                                <input type="text" value={addLinkSearch} onChange={(e) => setAddLinkSearch(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && void handleEvidenceSearchForLink()}
                                  placeholder="Search…" className="flex-1 border rounded px-1 py-0.5 text-[10px]" />
                                <button onClick={() => void handleEvidenceSearchForLink()} disabled={addLinkSearching}
                                  className="px-1.5 py-0.5 text-[10px] text-white rounded disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
                                  {addLinkSearching ? '…' : 'Find'}
                                </button>
                              </div>
                              {addLinkResults.length > 0 && (
                                <ul className="border rounded divide-y max-h-24 overflow-y-auto text-[10px]">
                                  {addLinkResults.map((r) => (
                                    <li key={r.id} onClick={() => setAddLinkSelected(r.id)}
                                      className={`px-2 py-1 cursor-pointer ${addLinkSelected === r.id ? 'font-semibold' : ''}`}>{r.title}</li>
                                  ))}
                                </ul>
                              )}
                              {addLinkError && <p className="text-[10px]" style={{ color: 'var(--state-error)' }}>{addLinkError}</p>}
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => { setAddLinkForEv(null); setAddLinkSearch(''); setAddLinkResults([]); setAddLinkSelected(null); setAddLinkError(''); }}
                                  className="text-[10px] px-1.5 py-0.5 border rounded" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                                <button onClick={() => void handleEvidenceAddLink()} disabled={!addLinkSelected || addLinkSubmitting}
                                  className="text-[10px] px-1.5 py-0.5 text-white rounded disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
                                  {addLinkSubmitting ? 'Linking…' : 'Link'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setAddLinkForEv(ev.id); setAddLinkSearch(''); setAddLinkResults([]); setAddLinkSelected(null); setAddLinkError(''); }}
                              className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--accent-primary)' }}>
                              <Link2 className="h-3 w-3" /> Add Link
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Review actions */}
                {canReview && ev.status === 'SUBMITTED' && (
                  <div className="flex flex-col gap-2">
                    {rejectingId === ev.id ? (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                          rows={2} placeholder="Rejection reason (required)…"
                          className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--state-error)', color: 'var(--text-primary)' }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleReject(ev.id)} disabled={!rejectReason.trim()} className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--state-error)' }}>
                            Confirm Rejection
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="rounded-lg px-3 py-1.5 text-xs" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(ev.id)} className="flex items-center gap-1.5 flex-1 justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: 'var(--state-success)' }}>
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => setRejectingId(ev.id)} className="flex items-center gap-1.5 flex-1 justify-center rounded-lg px-3 py-1.5 text-xs font-medium" style={{ border: '1px solid var(--state-error)', color: 'var(--state-error)' }}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Submit form */}
        {canSubmit && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} placeholder="Add evidence notes (optional)…"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <button type="submit" disabled={submitting} className="self-end flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting…' : 'Submit Evidence'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
