'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, ChevronRight, CheckCircle2, XCircle, Lock, Clock, Link2, Link2Off, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useWorkspaceSocket } from '@/lib/socket-provider';
import { useToast } from '@/lib/toast-provider';
import { ActivityTimeline } from '@/components/activity-timeline';
import { FileAttachmentSection } from '@/features/file-attachments/file-attachment-section';
import { apiGet, apiPostAuth, apiDeleteAuth } from '@/lib/api';
import type { LinkedRecord } from '@/features/workspaces/types';
import type { NcrCapaDetail, NcrComment, NcrStatus } from './types';
import { NCR_STATUS_CONFIG, SEVERITY_CONFIG } from './types';

interface Props {
  recordId: string;
  onClose: () => void;
  onUpdated: () => void;
}

function StatusBadge({ status }: { status: NcrStatus }) {
  const cfg = NCR_STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

export function NcrDetailPanel({ recordId, onClose, onUpdated }: Props) {
  const { user, token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const [record, setRecord]     = useState<NcrCapaDetail | null>(null);
  const [comments, setComments] = useState<NcrComment[]>([]);
  const [tab, setTab]           = useState<'details' | 'comments' | 'linked' | 'activity'>('details');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activityKey, setActivityKey] = useState(0);

  const { showToast } = useToast();

  const [commentBody, setCommentBody]         = useState('');
  const [sendingComment, setSendingComment]   = useState(false);
  const [rejReason, setRejReason]             = useState('');
  const [showRejectForm, setShowRejectForm]   = useState(false);
  const [actionLoading, setActionLoading]     = useState(false);

  // Linked records
  const [linkedRecords, setLinkedRecords]     = useState<LinkedRecord[]>([]);
  const [linkedLoading, setLinkedLoading]     = useState(false);
  const [showAddLink, setShowAddLink]         = useState(false);
  const [addLinkType, setAddLinkType]         = useState<'DOCUMENT' | 'TASK' | 'CHECKLIST_ITEM'>('DOCUMENT');
  const [addLinkSearch, setAddLinkSearch]     = useState('');
  const [addLinkResults, setAddLinkResults]   = useState<{ id: string; title: string }[]>([]);
  const [addLinkSelected, setAddLinkSelected] = useState<string | null>(null);
  const [addLinkSearching, setAddLinkSearching] = useState(false);
  const [addLinkSubmitting, setAddLinkSubmitting] = useState(false);
  const [addLinkError, setAddLinkError]       = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, cmtRes] = await Promise.all([
        fetch(`${base}/ncr-capa/${recordId}`, { headers }),
        fetch(`${base}/ncr-capa/${recordId}/comments`, { headers }),
      ]);
      const recData = await recRes.json();
      const cmtData = await cmtRes.json();
      setRecord(recData);
      if (Array.isArray(cmtData)) setComments(cmtData);
    } catch {
      setError('Failed to load NCR/CAPA record');
    } finally {
      setLoading(false);
    }
  }, [recordId, base, token]);

  useEffect(() => { void load(); }, [load]);

  const socketHandlers = useMemo(() => ({
    'ncr.updated': (data: Record<string, unknown>) => {
      if (data.id === recordId) {
        showToast('NCR/CAPA updated by another user');
        void load();
        setActivityKey((k) => k + 1);
        onUpdated();
      }
    },
  }), [recordId, load, showToast, onUpdated]);

  useWorkspaceSocket(record?.workspaceId ?? null, socketHandlers);

  const canVerify = user?.permissions?.includes('ncr.verify') || false;
  const canClose  = user?.permissions?.includes('ncr.close')  || false;
  const canUpdate = user?.permissions?.includes('ncr.update')  || false;

  const isAssignee = record?.assignedTo?.id === user?.id;
  const isRaiser   = record?.raisedBy?.id   === user?.id;

  useEffect(() => {
    if (tab !== 'linked' || !token) return;
    setLinkedLoading(true);
    apiGet<LinkedRecord[]>(`/linked-records?sourceType=NCR_CAPA&sourceId=${recordId}`, token)
      .then(setLinkedRecords)
      .catch(() => {})
      .finally(() => setLinkedLoading(false));
  }, [tab, recordId, token]);

  async function handleSearchForLink() {
    if (!token || !record?.workspaceId) return;
    setAddLinkSearching(true);
    setAddLinkResults([]);
    setAddLinkSelected(null);
    setAddLinkError('');
    try {
      const results = await apiGet<{ id: string; title: string }[]>(
        `/linked-records/search?workspaceId=${record.workspaceId}&targetType=${addLinkType}&q=${encodeURIComponent(addLinkSearch)}`,
        token,
      );
      setAddLinkResults(results);
    } catch { /* ignore */ }
    finally { setAddLinkSearching(false); }
  }

  async function handleAddLink() {
    if (!token || !addLinkSelected) return;
    setAddLinkSubmitting(true);
    setAddLinkError('');
    try {
      await apiPostAuth('/linked-records', {
        sourceType: 'NCR_CAPA', sourceId: recordId,
        targetType: addLinkType, targetId: addLinkSelected,
      }, token);
      const records = await apiGet<LinkedRecord[]>(`/linked-records?sourceType=NCR_CAPA&sourceId=${recordId}`, token);
      setLinkedRecords(records);
      setShowAddLink(false); setAddLinkSearch(''); setAddLinkResults([]); setAddLinkSelected(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add link';
      setAddLinkError(msg.toLowerCase().includes('already exists') ? 'This link already exists.' : msg);
    }
    finally { setAddLinkSubmitting(false); }
  }

  async function handleDeleteLink(id: string) {
    if (!token || !confirm('Remove this link?')) return;
    try {
      await apiDeleteAuth(`/linked-records/${id}`, token);
      setLinkedRecords((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  const handleSubmit = async () => {
    if (!record) return;
    setActionLoading(true);
    try {
      await fetch(`${base}/ncr-capa/${recordId}/submit`, { method: 'PATCH', headers });
      await load();
      onUpdated();
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await fetch(`${base}/ncr-capa/${recordId}/verify`, { method: 'PATCH', headers });
      await load();
      onUpdated();
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejReason.trim()) return;
    setActionLoading(true);
    try {
      await fetch(`${base}/ncr-capa/${recordId}/reject-verification`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejReason.trim() }),
      });
      setShowRejectForm(false);
      setRejReason('');
      await load();
      onUpdated();
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      await fetch(`${base}/ncr-capa/${recordId}/close`, { method: 'PATCH', headers });
      await load();
      onUpdated();
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const handleReopen = async () => {
    setActionLoading(true);
    try {
      // Submit directly from REJECTED status (backend now accepts OPEN/IN_PROGRESS/WAITING_EVIDENCE/REJECTED)
      await fetch(`${base}/ncr-capa/${recordId}/submit`, { method: 'PATCH', headers });
      await load();
      onUpdated();
    } catch { /* ignore */ } finally { setActionLoading(false); }
  };

  const sendComment = async () => {
    if (!commentBody.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`${base}/ncr-capa/${recordId}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      const newComment = await res.json();
      setComments(prev => [...prev, newComment]);
      setCommentBody('');
    } catch { /* ignore */ } finally { setSendingComment(false); }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/30" onClick={onClose} />
        <div className="w-[540px] bg-white flex items-center justify-center">
          <span className="text-sm text-gray-500">Loading…</span>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/30" onClick={onClose} />
        <div className="w-[540px] bg-white flex items-center justify-center">
          <span className="text-sm text-red-500">{error || 'Record not found'}</span>
        </div>
      </div>
    );
  }

  const sevCfg = SEVERITY_CONFIG[record.severity as keyof typeof SEVERITY_CONFIG];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[540px] bg-white flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {record.ncrNumber && (
                <span className="text-xs font-mono text-gray-500">{record.ncrNumber}</span>
              )}
              <StatusBadge status={record.status as NcrStatus} />
              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ color: sevCfg.color, backgroundColor: '#F9FAFB' }}>
                {sevCfg.label}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 truncate">{record.title}</h2>
          </div>
          <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Rejection reason banner */}
        {record.status === 'REJECTED' && record.rejectionReason && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Rejected:</strong> {record.rejectionReason}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          {/* Assignee/Raiser: submit for verification */}
          {(['OPEN', 'IN_PROGRESS', 'WAITING_EVIDENCE', 'REJECTED'] as const).includes(record.status as 'OPEN' | 'IN_PROGRESS' | 'WAITING_EVIDENCE' | 'REJECTED') && (isAssignee || isRaiser || canVerify || canUpdate) && (
            <button onClick={handleSubmit} disabled={actionLoading} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              Submit for Verification
            </button>
          )}

          {/* Verifier: verify */}
          {record.status === 'SUBMITTED' && canVerify && (
            <button onClick={handleVerify} disabled={actionLoading} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verify
            </button>
          )}

          {/* Verifier: reject */}
          {record.status === 'SUBMITTED' && canVerify && !showRejectForm && (
            <button onClick={() => setShowRejectForm(true)} className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          )}

          {/* Closer: close */}
          {record.status === 'VERIFIED' && canClose && (
            <button onClick={handleClose} disabled={actionLoading} className="px-3 py-1.5 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              Close NCR/CAPA
            </button>
          )}
        </div>

        {/* Reject form */}
        {showRejectForm && (
          <div className="mx-5 my-2 p-3 bg-red-50 border border-red-200 rounded space-y-2">
            <p className="text-xs font-medium text-red-700">Rejection reason (required)</p>
            <textarea
              value={rejReason}
              onChange={e => setRejReason(e.target.value)}
              rows={2}
              className="w-full border border-red-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Explain why verification is rejected…"
            />
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={actionLoading || !rejReason.trim()} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                Confirm Rejection
              </button>
              <button onClick={() => { setShowRejectForm(false); setRejReason(''); }} className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          {([
            { key: 'details',   label: 'Details' },
            { key: 'comments',  label: `Comments (${comments.length})` },
            { key: 'linked',    label: `Linked (${linkedRecords.length})` },
            { key: 'activity',  label: 'Activity' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'details' && (
            <>
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium text-gray-800">{record.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ISO Clause</p>
                  <p className="font-medium text-gray-800">{record.isoClause || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Raised By</p>
                  <p className="font-medium text-gray-800">{record.raisedBy.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Assigned To</p>
                  <p className="font-medium text-gray-800">{record.assignedTo?.fullName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="font-medium text-gray-800">{record.department?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Workspace</p>
                  <p className="font-medium text-gray-800">{record.workspace?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="font-medium text-gray-800">
                    {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Raised On</p>
                  <p className="font-medium text-gray-800">{new Date(record.createdAt).toLocaleDateString()}</p>
                </div>
                {record.verifiedBy && (
                  <div>
                    <p className="text-xs text-gray-500">Verified By</p>
                    <p className="font-medium text-gray-800">{record.verifiedBy.fullName}</p>
                  </div>
                )}
                {record.closedBy && (
                  <div>
                    <p className="text-xs text-gray-500">Closed By</p>
                    <p className="font-medium text-gray-800">{record.closedBy.fullName}</p>
                  </div>
                )}
              </div>

              {record.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.description}</p>
                </div>
              )}

              {/* Root cause / Corrective / Preventive */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Root Cause</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
                    {record.rootCause || <span className="text-gray-400 italic">Not provided yet</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Corrective Action</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
                    {record.correctiveAction || <span className="text-gray-400 italic">Not provided yet</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Preventive Action</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
                    {record.preventiveAction || <span className="text-gray-400 italic">Not provided yet</span>}
                  </p>
                </div>
              </div>

              {record.checklistItem && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm">
                  <p className="text-xs text-blue-500 mb-0.5">Linked Checklist Item</p>
                  <p className="font-medium text-blue-900">{record.checklistItem.title}</p>
                  {record.checklistItem.isoClause && (
                    <p className="text-xs text-blue-700">Clause: {record.checklistItem.isoClause}</p>
                  )}
                </div>
              )}

              {/* Attachments */}
              <div className="border-t pt-1" style={{ borderColor: '#E2E8F0' }}>
                <FileAttachmentSection
                  entityType="NCR_CAPA"
                  entityId={recordId}
                  uploadEndpoint={`/ncr-capa/${recordId}/attachments`}
                  listEndpoint={`/ncr-capa/${recordId}/attachments`}
                  canUpload={canUpdate && record.status !== 'CLOSED'}
                  canDelete={canUpdate || canVerify}
                  isEntityLocked={record.status === 'CLOSED'}
                  compact
                />
              </div>
            </>
          )}

          {tab === 'comments' && (
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                    {c.author.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-medium text-gray-900">{c.author.fullName}</span>
                      <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}

              {record.status !== 'CLOSED' && (
                <div className="pt-3 border-t border-gray-100">
                  <textarea
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add a comment…"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={sendComment}
                      disabled={sendingComment || !commentBody.trim()}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingComment ? 'Sending…' : 'Comment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'linked' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Linked documents, tasks, and checklist items</span>
                {record.status !== 'CLOSED' && canUpdate && (
                  <button
                    onClick={() => setShowAddLink((v) => !v)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--accent-primary)', border: '1px solid var(--accent-soft)' }}
                  >
                    <Link2 className="h-3 w-3" />
                    Add Link
                  </button>
                )}
              </div>

              {showAddLink && record.workspaceId && (
                <div className="border rounded-lg p-3 space-y-2" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-default)' }}>
                  <div className="flex gap-2">
                    <select
                      value={addLinkType}
                      onChange={(e) => { setAddLinkType(e.target.value as typeof addLinkType); setAddLinkResults([]); setAddLinkSelected(null); }}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="DOCUMENT">Document</option>
                      <option value="TASK">Task</option>
                      <option value="CHECKLIST_ITEM">Checklist Item</option>
                    </select>
                    <input
                      type="text"
                      value={addLinkSearch}
                      onChange={(e) => setAddLinkSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleSearchForLink()}
                      placeholder="Search…"
                      className="flex-1 border rounded px-2 py-1 text-xs"
                    />
                    <button onClick={() => void handleSearchForLink()} disabled={addLinkSearching} className="px-2 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50">
                      {addLinkSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Find'}
                    </button>
                  </div>
                  {addLinkResults.length > 0 && (
                    <ul className="border rounded divide-y max-h-32 overflow-y-auto text-xs">
                      {addLinkResults.map((r) => (
                        <li
                          key={r.id}
                          onClick={() => setAddLinkSelected(r.id)}
                          className={`px-2 py-1.5 cursor-pointer ${addLinkSelected === r.id ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'}`}
                        >
                          {r.title}
                        </li>
                      ))}
                    </ul>
                  )}
                  {addLinkError && <p className="text-xs text-red-600">{addLinkError}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowAddLink(false); setAddLinkSearch(''); setAddLinkResults([]); setAddLinkSelected(null); setAddLinkError(''); }} className="text-xs px-2 py-1 border rounded">Cancel</button>
                    <button onClick={() => void handleAddLink()} disabled={!addLinkSelected || addLinkSubmitting} className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50">
                      {addLinkSubmitting ? 'Linking…' : 'Add Link'}
                    </button>
                  </div>
                </div>
              )}

              {linkedLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
              ) : linkedRecords.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No linked records. Use Add Link to connect this NCR/CAPA to documents or tasks.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {linkedRecords.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{r.targetTitle}</p>
                          <p className="text-[10px] text-gray-400">{r.targetType.replace('_', ' ')}</p>
                        </div>
                      </div>
                      {(canUpdate || r.createdById === user?.id) && (
                        <button onClick={() => void handleDeleteLink(r.id)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0" title="Remove link">
                          <Link2Off className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'activity' && token && (
            <ActivityTimeline
              entityType="NCR_CAPA"
              entityId={recordId}
              token={token}
              refreshKey={activityKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}
