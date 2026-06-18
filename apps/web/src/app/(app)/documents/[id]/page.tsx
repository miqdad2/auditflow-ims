'use client';

import { use, useState, useEffect, useRef, useMemo, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Download, UploadCloud, CheckCircle, XCircle,
  Archive, ChevronDown, File, Loader2, AlertCircle, Clock,
} from 'lucide-react';
import { apiGet, apiPatchAuth, apiUploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWorkspaceSocket } from '@/lib/socket-provider';
import { useToast } from '@/lib/toast-provider';
import { ActivityTimeline } from '@/components/activity-timeline';
import { StatusBadge } from '@/components/status-badge';
import type { DocumentDetail } from '@/features/documents/types';
import {
  DOCUMENT_CATEGORIES, formatFileSize, getAllowedTransitions,
} from '@/features/documents/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token, user } = useAuth();
  const router = useRouter();

  const [doc, setDoc]         = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [statusLoading, setStatusLoading]   = useState(false);
  const [statusError, setStatusError]       = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingStatus, setPendingStatus]   = useState<string | null>(null);

  const [versionLoading, setVersionLoading] = useState(false);
  const [versionError, setVersionError]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpdate   = user?.permissions?.includes('documents.update')   ?? false;
  const canDownload = user?.permissions?.includes('documents.download') ?? false;

  const [activityKey, setActivityKey] = useState(0);
  const [activePanel, setActivePanel] = useState<'versions' | 'activity'>('versions');
  const { showToast } = useToast();

  const loadDoc = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiGet<DocumentDetail>(`/documents/${id}`, token)
      .then(setDoc)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load document.'))
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

  const socketHandlers = useMemo(() => ({
    'document.updated': (data: Record<string, unknown>) => {
      if (data.id === id) {
        showToast('Document updated by another user');
        loadDoc();
        setActivityKey((k) => k + 1);
      }
    },
  }), [id, showToast, loadDoc]);

  useWorkspaceSocket(doc?.workspace?.id ?? null, socketHandlers);

  async function handleStatusChange(newStatus: string) {
    if (newStatus === 'REJECTED') {
      setPendingStatus('REJECTED');
      setShowStatusMenu(false);
      return;
    }
    setShowStatusMenu(false);
    setStatusLoading(true); setStatusError('');
    try {
      const updated = await apiPatchAuth<DocumentDetail>(`/documents/${id}/status`, { status: newStatus }, token!);
      setDoc(updated);
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setStatusLoading(false);
    }
  }

  async function confirmRejection() {
    if (!rejectionReason.trim()) return;
    setStatusLoading(true); setStatusError(''); setPendingStatus(null);
    try {
      const updated = await apiPatchAuth<DocumentDetail>(`/documents/${id}/status`, { status: 'REJECTED', rejectionReason: rejectionReason.trim() }, token!);
      setDoc(updated);
      setRejectionReason('');
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleVersionUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVersionLoading(true); setVersionError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const updated = await apiUploadFile<DocumentDetail>(`/documents/${id}/versions`, fd, token!);
      setDoc(updated);
    } catch (err: unknown) {
      setVersionError(err instanceof Error ? err.message : 'Version upload failed.');
    } finally {
      setVersionLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function downloadVersion(versionId: string) {
    const url = `${API_URL}/documents/${id}/versions/${versionId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    fetch(url, { headers })
      .then((res) => {
        const disposition = res.headers.get('Content-Disposition') ?? '';
        const fnMatch = disposition.match(/filename="(.+?)"/);
        const filename = fnMatch?.[1] ?? 'download';
        return res.blob().then((blob) => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const objUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objUrl;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch(() => { window.open(url, '_blank'); });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full" style={{ border: '2px solid var(--bg-muted)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-64">
        <AlertCircle className="h-8 w-8" style={{ color: 'var(--state-error)' }} />
        <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error || 'Document not found.'}</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--accent-primary)' }}>Go back</button>
      </div>
    );
  }

  const allowedTransitions = getAllowedTransitions(doc.status, user?.permissions ?? []);
  const latestVersion = doc.versions[0];
  const categoryLabel = DOCUMENT_CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span style={{ color: 'var(--border-default)' }}>/</span>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h1>
          <StatusBadge status={doc.status} />
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-2">
          {canUpdate && allowedTransitions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                disabled={statusLoading}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Change Status <ChevronDown className="h-4 w-4" />
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', minWidth: '160px' }}>
                  {allowedTransitions.map((s) => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                      {s === 'APPROVED'     && <CheckCircle className="h-4 w-4" style={{ color: 'var(--state-success)' }} />}
                      {s === 'REJECTED'     && <XCircle    className="h-4 w-4" style={{ color: 'var(--state-error)' }} />}
                      {s === 'ARCHIVED'     && <Archive    className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
                      {s === 'UNDER_REVIEW' && <CheckCircle className="h-4 w-4" style={{ color: 'var(--state-warning)' }} />}
                      {s === 'DRAFT'        && <File       className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
                      {s.replace('_', ' ').charAt(0) + s.replace('_', ' ').slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {canUpdate && doc.status !== 'ARCHIVED' && doc.status !== 'APPROVED' && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={versionLoading}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                {versionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                New Version
              </button>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv"
                onChange={handleVersionUpload} />
            </>
          )}
        </div>
      </div>

      {(statusError || versionError) && (
        <div className="mx-6 mt-3 rounded-lg px-4 py-2 text-sm flex items-center gap-2" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {statusError || versionError}
        </div>
      )}

      {/* Rejection reason dialog */}
      {pendingStatus === 'REJECTED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Reject Document</h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Please provide a reason for rejection:</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
              rows={3} placeholder="Rejection reason..."
              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')} autoFocus />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setPendingStatus(null); setRejectionReason(''); }} className="rounded-lg px-4 py-2 text-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={confirmRejection} disabled={!rejectionReason.trim()} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--state-error)' }}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection reason banner */}
      {doc.status === 'REJECTED' && doc.rejectionReason && (
        <div className="mx-6 mt-3 rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: 'var(--state-error-soft)', border: '1px solid var(--state-error)' }}>
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--state-error)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--state-error)' }}>Document Rejected</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--state-error)' }}>{doc.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto grid grid-cols-3 gap-0">
        {/* Left: Metadata */}
        <div className="col-span-2 p-6 flex flex-col gap-6" style={{ borderRight: '1px solid var(--border-default)' }}>

          {/* Document metadata */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Document Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Title',          doc.title],
                ['Document No.',   doc.documentNumber ?? '—'],
                ['Category',       categoryLabel],
                ['Status',         null],
                ['Department',     doc.department?.name ?? '—'],
                ['Workspace',      doc.workspace?.name ?? '—'],
                ['Owner',          doc.owner.fullName],
                ['Created By',     doc.createdBy.fullName],
                ['Review Date',    doc.reviewDate ? new Date(doc.reviewDate).toLocaleDateString() : '—'],
                ['Expiry Date',    doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'],
                ['Created',        new Date(doc.createdAt).toLocaleDateString()],
                ['Last Updated',   new Date(doc.updatedAt).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  {value === null
                    ? <StatusBadge status={doc.status} size="xs" />
                    : <p style={{ color: 'var(--text-primary)' }}>{value as string}</p>
                  }
                </div>
              ))}
            </div>

            {doc.description && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{doc.description}</p>
              </div>
            )}
          </section>

          {/* Current file */}
          {latestVersion && (
            <section>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Current File (v{latestVersion.versionNumber})</h2>
              <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8" style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{latestVersion.originalFileName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(latestVersion.fileSize)} · {latestVersion.mimeType}</p>
                  </div>
                </div>
                {canDownload && (
                  <button onClick={() => downloadVersion(latestVersion.id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                    style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                    <Download className="h-4 w-4" /> Download
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right: Version history + Activity */}
        <div className="flex flex-col overflow-hidden">
          {/* Panel tab bar */}
          <div className="flex border-b px-4 pt-3 gap-0" style={{ borderColor: 'var(--border-default)' }}>
            {([
              { key: 'versions', label: 'Versions', icon: File },
              { key: 'activity', label: 'Activity',  icon: Clock },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActivePanel(key)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 -mb-px transition-colors"
                style={{
                  borderColor: activePanel === key ? 'var(--accent-primary)' : 'transparent',
                  color: activePanel === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: activePanel === key ? 600 : 400,
                }}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activePanel === 'versions' ? (
              <>
                {doc.versions.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No versions available.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {doc.versions.map((v) => (
                      <div key={v.id} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ border: '1px solid var(--border-default)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>v{v.versionNumber}</span>
                          {canDownload && (
                            <button onClick={() => downloadVersion(v.id)}
                              className="flex items-center gap-1 text-xs"
                              style={{ color: 'var(--accent-primary)' }}>
                              <Download className="h-3 w-3" /> Download
                            </button>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{v.originalFileName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(v.fileSize)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {v.uploadedBy.fullName} · {new Date(v.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <ActivityTimeline
                entityType="DOCUMENT"
                entityId={id}
                token={token!}
                refreshKey={activityKey}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
