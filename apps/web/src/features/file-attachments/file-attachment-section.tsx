'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { UploadCloud, Download, Trash2, Paperclip, Loader2, AlertTriangle, X } from 'lucide-react';
import { apiGet, apiUploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { FileAttachment } from './types';
import { formatFileSize } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

interface Props {
  entityType: 'TASK' | 'PAGE' | 'CHECKLIST_EVIDENCE' | 'NCR_CAPA';
  entityId: string;
  uploadEndpoint: string;
  listEndpoint: string;
  canUpload?: boolean;
  canDelete?: boolean;
  compact?: boolean;
  /** When true, only elevated roles can delete (e.g. approved evidence, closed NCR/CAPA) */
  isEntityLocked?: boolean;
}

export function FileAttachmentSection({
  entityType, entityId, uploadEndpoint, listEndpoint,
  canUpload = true, canDelete = false, compact = false, isEntityLocked = false,
}: Props) {
  const { token, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [dupWarning, setDupWarning]   = useState('');

  const isElevated = (user?.roles as string[] | undefined)?.some((r) => ELEVATED_ROLES.includes(r)) ?? false;

  useEffect(() => {
    if (!token) return;
    apiGet<FileAttachment[]>(listEndpoint, token)
      .then(setAttachments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, listEndpoint]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    setUploading(true); setError(''); setDupWarning('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const att = await apiUploadFile<FileAttachment>(uploadEndpoint, fd, token!);
      // Strip the non-standard warning field before storing in state
      const { warning, ...cleanAtt } = att;
      setAttachments((prev) => [...prev, cleanAtt as FileAttachment]);
      if (warning) setDupWarning(warning);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attachment? This cannot be undone.')) return;
    try {
      await fetch(`${API_URL}/attachments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  }

  function downloadAttachment(att: FileAttachment) {
    fetch(`${API_URL}/attachments/${att.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob().then((blob) => ({ blob, res })))
      .then(({ blob }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = att.originalFileName;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }

  const sectionPadding = compact ? 'py-3' : 'py-4';

  return (
    <div className={sectionPadding}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Files {attachments.length > 0 ? `(${attachments.length})` : ''}
          </span>
        </div>
        {canUpload && !isEntityLocked && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs rounded-md px-2 py-1 disabled:opacity-50"
            style={{ color: 'var(--accent-primary)', border: '1px solid var(--accent-soft)' }}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
            {uploading ? 'Uploading…' : 'Attach'}
          </button>
        )}
        <input
          ref={fileRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv"
          onChange={handleFileChange}
        />
      </div>

      {/* Helper text — visible only when upload button is shown */}
      {canUpload && !isEntityLocked && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-disabled)' }}>
          For official controlled documents, use the Document Library instead of attaching duplicate files.
        </p>
      )}

      {error && <p className="text-xs mb-2" style={{ color: 'var(--state-error)' }}>{error}</p>}

      {/* Soft duplicate-document warning */}
      {dupWarning && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2 mb-2 text-xs"
          style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)', color: '#92400e' }}
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
          <span className="flex-1">{dupWarning}</span>
          <button onClick={() => setDupWarning('')} className="flex-shrink-0 ml-1" title="Dismiss">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>No files attached yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((att) => {
            const isOwner = att.uploadedBy.id === user?.id;
            // When entity is locked (approved evidence, closed NCR), only elevated roles can delete
            const canDel  = isEntityLocked
              ? isElevated
              : (canDelete || isOwner);
            return (
              <li
                key={att.id}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 group"
                style={{ backgroundColor: 'var(--bg-muted)' }}
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-2">
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {att.originalFileName}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatFileSize(att.fileSize)} · {att.uploadedBy.fullName} · {new Date(att.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => downloadAttachment(att)}
                    className="p-1 rounded"
                    title="Download"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {canDel && (
                    <button
                      onClick={() => void handleDelete(att.id)}
                      className="p-1 rounded"
                      title="Delete"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
