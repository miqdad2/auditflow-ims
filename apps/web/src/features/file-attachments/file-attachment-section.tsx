'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  UploadCloud, Download, Trash2, Paperclip, Loader2, AlertTriangle,
  X, Clock, RefreshCw, ChevronDown, ChevronUp, CalendarDays, Pencil, Info,
} from 'lucide-react';
import { apiGet, apiPatchAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { FileAttachment, DocumentValidityPeriod } from './types';
import { formatFileSize, getExpiryStatus, NEW_UPLOAD_VALIDITY_OPTIONS, VALIDITY_PERIOD_LABELS } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

// Only 7 and 14 days are supported for new uploads.
// Legacy files may retain 15/30/60/90 but can only be changed to 7 or 14.
const REMINDER_OPTIONS = [
  { value: 7,  label: '7 days before' },
  { value: 14, label: '14 days before' },
];

interface ExpiryForm {
  displayName:     string;
  validityPeriod:  DocumentValidityPeriod;
  /** Only populated when validityPeriod = CUSTOM_EXISTING (legacy Set Validity) */
  customExpiryDate: string;
  reminderDays:    number;
  notes:           string;
  /** True only when the user has deliberately selected a new reminder value in the edit form. */
  reminderChanged: boolean;
}

const BLANK_EXPIRY: ExpiryForm = {
  displayName: '', validityPeriod: 'NONE', customExpiryDate: '',
  reminderDays: 14, notes: '', reminderChanged: false,
};

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
  /** Enable expiry metadata form — should be true for TASK attachments */
  showExpiryTracking?: boolean;
}

export function FileAttachmentSection({
  entityType, entityId, uploadEndpoint, listEndpoint,
  canUpload = true, canDelete = false, compact = false,
  isEntityLocked = false, showExpiryTracking = false,
}: Props) {
  const { token, user } = useAuth();
  const fileRef     = useRef<HTMLInputElement>(null);
  const renewRef    = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [dupWarning, setDupWarning]   = useState('');

  // Expiry metadata form (for attach flow)
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [pendingFile, setPendingFile]       = useState<File | null>(null);
  const [expiryForm, setExpiryForm]         = useState<ExpiryForm>({ ...BLANK_EXPIRY });

  // Renewal state
  const [renewingId, setRenewingId]           = useState<string | null>(null);
  const [renewForm, setRenewForm]             = useState<ExpiryForm>({ ...BLANK_EXPIRY });
  const [renewUploading, setRenewUploading]   = useState(false);
  const [renewError, setRenewError]           = useState('');

  // History expand state per attachment
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Edit metadata state
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editMetaForm, setEditMetaForm] = useState<ExpiryForm>({ ...BLANK_EXPIRY });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  const isElevated = (user?.roles as string[] | undefined)?.some((r) => ELEVATED_ROLES.includes(r)) ?? false;

  useEffect(() => {
    if (!token) return;
    apiGet<FileAttachment[]>(listEndpoint, token)
      .then(setAttachments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, listEndpoint]);

  // ── File picker handler ────────────────────────────────────────────────────

  function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    if (showExpiryTracking) {
      // Open metadata form before uploading
      setPendingFile(file);
      setExpiryForm({ ...BLANK_EXPIRY, displayName: file.name.replace(/\.[^.]+$/, '') });
      setShowAttachForm(true);
    } else {
      void doUpload(file, null);
    }
  }

  // ── Upload (with or without metadata) ────────────────────────────────────

  async function doUpload(file: File, meta: ExpiryForm | null) {
    setUploading(true); setError(''); setDupWarning('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (meta) {
        if (meta.displayName)                 fd.append('displayName',    meta.displayName);
        if (meta.validityPeriod !== 'NONE') {
          fd.append('validityPeriod', meta.validityPeriod);
          // reminderDays is only meaningful when expiry is tracked
          fd.append('reminderDays', String(meta.reminderDays));
        } else {
          fd.append('validityPeriod', 'NONE');
        }
        if (meta.notes) fd.append('notes', meta.notes);
      }

      const res = await fetch(`${API_URL}${uploadEndpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Upload failed');
      }
      const att = await res.json() as FileAttachment & { warning?: string };
      const { warning, ...cleanAtt } = att;
      setAttachments((prev) => [cleanAtt as FileAttachment, ...prev]);
      if (warning) setDupWarning(warning);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setShowAttachForm(false);
      setPendingFile(null);
      setExpiryForm({ ...BLANK_EXPIRY });
    }
  }

  function handleAttachFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFile) return;
    // CUSTOM_EXISTING is legacy-only; new uploads use standard validity periods
    if (expiryForm.validityPeriod === 'CUSTOM_EXISTING' && !expiryForm.customExpiryDate) {
      setError('Expiry date is required for custom validity'); return;
    }
    void doUpload(pendingFile, expiryForm);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this attachment? This cannot be undone.')) return;
    try {
      await fetch(`${API_URL}/attachments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }

  // ── Download ───────────────────────────────────────────────────────────────

  function downloadAttachment(att: FileAttachment) {
    fetch(`${API_URL}/attachments/${att.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob().then((blob) => ({ blob })))
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

  // ── Renewal ────────────────────────────────────────────────────────────────

  function handlePickRenewFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (renewRef.current) renewRef.current.value = '';
    void doRenew(file);
  }

  async function doRenew(file: File) {
    if (!renewingId) return;
    setRenewUploading(true); setRenewError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (renewForm.displayName) fd.append('displayName', renewForm.displayName);
      fd.append('validityPeriod', renewForm.validityPeriod);
      if (renewForm.validityPeriod !== 'NONE') {
        fd.append('reminderDays', String(renewForm.reminderDays));
      }
      if (renewForm.notes) fd.append('notes', renewForm.notes);

      const res = await fetch(`${API_URL}/attachments/${renewingId}/renew`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Renewal failed');
      }
      const newAtt = await res.json() as FileAttachment;
      // Mark old as superseded in local state, add new
      setAttachments((prev) => [
        newAtt,
        ...prev.map((a) => a.id === renewingId ? { ...a, isSuperseded: true } : a),
      ]);
      setRenewingId(null);
      setRenewForm({ ...BLANK_EXPIRY });
    } catch (err: unknown) {
      setRenewError(err instanceof Error ? err.message : 'Renewal failed');
    } finally {
      setRenewUploading(false);
    }
  }

  function toggleHistory(id: string) {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Edit metadata ─────────────────────────────────────────────────────────

  function startEditMeta(att: FileAttachment) {
    setEditingId(att.id);
    setEditError('');
    const storedReminder = att.reminderDays ?? 14;
    // Determine initial validity period for edit form
    const storedPeriod = (att.validityPeriod ?? (att.expiryDate ? 'CUSTOM_EXISTING' : 'NONE')) as DocumentValidityPeriod;
    setEditMetaForm({
      displayName:      att.displayName ?? '',
      validityPeriod:   storedPeriod,
      customExpiryDate: att.expiryDate ? new Date(att.expiryDate).toISOString().split('T')[0] : '',
      reminderDays:     storedReminder,
      notes:            att.notes ?? '',
      reminderChanged:  false,
    });
  }

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !token) return;
    if (editMetaForm.validityPeriod === 'CUSTOM_EXISTING' && !editMetaForm.customExpiryDate) {
      setEditError('Expiry date is required for custom validity'); return;
    }
    setEditSaving(true); setEditError('');
    try {
      const body: Record<string, unknown> = {
        displayName:    editMetaForm.displayName || null,
        notes:          editMetaForm.notes || null,
        validityPeriod: editMetaForm.validityPeriod,
      };

      // For CUSTOM_EXISTING legacy Set Validity, include the manually-entered expiryDate
      if (editMetaForm.validityPeriod === 'CUSTOM_EXISTING') {
        body.expiryDate = editMetaForm.customExpiryDate || null;
      }

      // reminderDays: clear when NONE, send only when user explicitly changed it
      if (editMetaForm.validityPeriod === 'NONE') {
        body.reminderDays = null;
      } else if (editMetaForm.reminderChanged) {
        body.reminderDays = editMetaForm.reminderDays;
      }
      // else: leave reminderDays out → backend preserves existing legacy value

      const updated = await apiPatchAuth<FileAttachment>(`/attachments/${editingId}/metadata`, body, token);
      setAttachments((prev) => prev.map((a) => a.id === editingId ? { ...a, ...updated } : a));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Compute renewal chain: group by renewal lineage ──────────────────────
  // Show non-superseded files first, then history below each
  const activeFiles    = attachments.filter((a) => !a.isSuperseded);
  const supersededFiles = attachments.filter((a) => a.isSuperseded);

  const sectionPadding = compact ? 'py-3' : 'py-4';

  return (
    <div className={sectionPadding}>
      {/* ── Section header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Files {attachments.length > 0 ? `(${activeFiles.length} active${supersededFiles.length > 0 ? ` · ${supersededFiles.length} old` : ''})` : ''}
          </span>
        </div>
        {canUpload && !isEntityLocked && !showAttachForm && (
          <button
            onClick={() => showExpiryTracking ? fileRef.current?.click() : fileRef.current?.click()}
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
          onChange={handlePickFile}
        />
        <input
          ref={renewRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv"
          onChange={handlePickRenewFile}
        />
      </div>

      {/* ── Guidance ─────────────────────────────────────────────────────── */}
      {canUpload && !isEntityLocked && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-disabled)' }}>
          For official controlled documents, use the Document Library instead of attaching duplicate files.
        </p>
      )}

      {/* Expiry status explanation — compact */}
      {showExpiryTracking && attachments.some((a) => a.expiryDate) && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-disabled)' }}>
          Expiry status is calculated automatically from the expiry date and reminder setting.
        </p>
      )}

      {error && <p className="text-xs mb-2" style={{ color: 'var(--state-error)' }}>{error}</p>}

      {/* ── Duplicate-document warning ───────────────────────────────────── */}
      {dupWarning && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-2 text-xs"
          style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)', color: 'var(--state-warning)' }}>
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{dupWarning}</span>
          <button onClick={() => setDupWarning('')} title="Dismiss"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* ── Attach form (expiry metadata) ────────────────────────────────── */}
      {showAttachForm && pendingFile && (
        <div className="mb-3 rounded-lg border p-3"
          style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Attaching: <span className="font-normal" style={{ color: 'var(--text-muted)' }}>{pendingFile.name}</span>
            </p>
            <button type="button" onClick={() => { setShowAttachForm(false); setPendingFile(null); }}
              style={{ color: 'var(--text-muted)' }}><X className="h-3.5 w-3.5" /></button>
          </div>
          <form onSubmit={handleAttachFormSubmit} className="flex flex-col gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Display Name (optional)</label>
              <input type="text" value={expiryForm.displayName}
                onChange={(e) => setExpiryForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g. Safety Certificate 2026"
                className="w-full rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Validity Period</label>
              <select
                value={expiryForm.validityPeriod}
                onChange={(e) => setExpiryForm((f) => ({ ...f, validityPeriod: e.target.value as DocumentValidityPeriod }))}
                className="w-full rounded-md border px-2 py-1 text-xs cursor-pointer"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                {NEW_UPLOAD_VALIDITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {expiryForm.validityPeriod !== 'NONE' && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Expiry date is calculated automatically from today.
                </p>
              )}
            </div>
            {expiryForm.validityPeriod !== 'NONE' && (
              <div className="pl-4">
                <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Remind Before Expiry</label>
                <div className="flex gap-3 mt-1">
                  {REMINDER_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <input
                        type="radio"
                        name="expiryReminder"
                        value={o.value}
                        checked={expiryForm.reminderDays === o.value}
                        onChange={() => setExpiryForm((f) => ({ ...f, reminderDays: o.value }))}
                        className="accent-blue-600"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
              <input type="text" value={expiryForm.notes}
                onChange={(e) => setExpiryForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes about this file"
                className="w-full rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--state-error)' }}>{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setShowAttachForm(false); setPendingFile(null); }}
                className="rounded-md border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button type="submit" disabled={uploading}
                className="flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                {uploading ? 'Uploading…' : 'Attach File'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Renewal form ─────────────────────────────────────────────────── */}
      {renewingId && (
        <div className="mb-3 rounded-lg border p-3"
          style={{ borderColor: 'var(--state-warning)', backgroundColor: 'var(--state-warning-soft)' }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" style={{ color: 'var(--state-warning)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--state-warning)' }}>Upload Renewal</p>
            </div>
            <button type="button" onClick={() => { setRenewingId(null); setRenewError(''); }}
              style={{ color: 'var(--text-muted)' }}><X className="h-3.5 w-3.5" /></button>
          </div>
          <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
            The old file will be kept as history and marked as renewed.
          </p>
          <div className="flex flex-col gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Display Name (optional)</label>
              <input type="text" value={renewForm.displayName}
                onChange={(e) => setRenewForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Name for renewed file"
                className="w-full rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Validity Period</label>
              <select
                value={renewForm.validityPeriod}
                onChange={(e) => setRenewForm((f) => ({ ...f, validityPeriod: e.target.value as DocumentValidityPeriod }))}
                className="w-full rounded-md border px-2 py-1 text-xs cursor-pointer"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                {NEW_UPLOAD_VALIDITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {renewForm.validityPeriod !== 'NONE' && (
              <div className="pl-4">
                <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Remind Before Expiry</label>
                <div className="flex gap-3 mt-1">
                  {REMINDER_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <input
                        type="radio"
                        name="renewReminder"
                        value={o.value}
                        checked={renewForm.reminderDays === o.value}
                        onChange={() => setRenewForm((f) => ({ ...f, reminderDays: o.value }))}
                        className="accent-blue-600"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {renewError && <p className="text-xs" style={{ color: 'var(--state-error)' }}>{renewError}</p>}
            <button type="button" disabled={renewUploading}
              onClick={() => renewRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-60 self-start"
              style={{ backgroundColor: 'var(--state-warning)' }}>
              {renewUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
              {renewUploading ? 'Uploading…' : 'Pick Renewal File'}
            </button>
          </div>
        </div>
      )}

      {/* ── File list ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>No files attached yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {/* Active (non-superseded) files first */}
          {activeFiles.map((att) => {
            const isOwner  = att.uploadedBy.id === user?.id;
            const canDel   = isEntityLocked ? isElevated : (canDelete || isOwner);
            const expInfo  = showExpiryTracking ? getExpiryStatus(att) : null;
            const canRenew = showExpiryTracking && !att.isSuperseded && att.expiryDate && (isOwner || isElevated);
            const history  = supersededFiles.filter((s) => {
              // A file is "history" for this active file if it's in the same renewal chain
              const renewalOf = s.renewedFromId;
              return renewalOf === att.renewedFromId || renewalOf === att.id;
            });
            const hasHistory = history.length > 0;

            return (
              <li key={att.id}>
                <div className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-1">
                    {/* File name + display name */}
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {att.displayName ?? att.originalFileName}
                    </span>
                    {att.displayName && att.displayName !== att.originalFileName && (
                      <span className="text-[10px] truncate" style={{ color: 'var(--text-disabled)' }}>{att.originalFileName}</span>
                    )}
                    {/* Uploaded date + uploader */}
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatFileSize(att.fileSize)} · Uploaded {new Date(att.createdAt).toLocaleDateString('en-GB')} by {att.uploadedBy.fullName}
                    </span>
                    {/* Expiry row with validity period and reminder setting */}
                    {showExpiryTracking && (att.expiryDate || att.validityPeriod) && (
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {att.validityPeriod && att.validityPeriod !== 'NONE' && (
                          <div className="flex items-center gap-1">
                            <Info className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                              Validity: {VALIDITY_PERIOD_LABELS[att.validityPeriod] ?? att.validityPeriod}
                            </span>
                          </div>
                        )}
                        {att.expiryDate && (
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              Expires {new Date(att.expiryDate).toLocaleDateString('en-GB')}
                              {expInfo?.daysLeft !== undefined && expInfo.daysLeft >= 0 && (
                                <span> · {expInfo.daysLeft}d left</span>
                              )}
                              {expInfo?.daysLeft !== undefined && expInfo.daysLeft < 0 && (
                                <span style={{ color: 'var(--state-error)' }}> · expired</span>
                              )}
                            </span>
                          </div>
                        )}
                        {att.reminderDays != null && (
                          <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                            Reminder: {att.reminderDays} days before
                          </span>
                        )}
                      </div>
                    )}
                    {att.notes && (
                      <span className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>{att.notes}</span>
                    )}
                  </div>

                  {/* Status badge + actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Expiry status badge */}
                    {expInfo && expInfo.status !== 'NO_EXPIRY' && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
                        style={{ backgroundColor: expInfo.bg, color: expInfo.color }}>
                        {expInfo.label}
                      </span>
                    )}
                    {/* Download */}
                    <button onClick={() => downloadAttachment(att)} className="p-1 rounded" title="Download"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {/* Edit metadata */}
                    {showExpiryTracking && (isElevated || att.uploadedBy.id === user?.id) && (
                      <button onClick={() => startEditMeta(att)}
                        className="p-1 rounded" title="Edit file info / expiry"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* Renewal */}
                    {canRenew && (
                      <button onClick={() => { setRenewingId(att.id); setRenewForm({ ...BLANK_EXPIRY }); }}
                        className="p-1 rounded" title="Upload Renewal"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-warning)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* History toggle */}
                    {hasHistory && (
                      <button onClick={() => toggleHistory(att.id)} title="View history"
                        className="p-1 rounded text-[10px] flex items-center gap-0.5"
                        style={{ color: 'var(--text-muted)' }}>
                        <Clock className="h-3 w-3" />
                        {expandedHistory.has(att.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                    {/* Delete */}
                    {canDel && (
                      <button onClick={() => void handleDelete(att.id)} className="p-1 rounded" title="Delete"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit metadata inline form */}
                {editingId === att.id && (
                  <form onSubmit={(e) => void handleSaveMeta(e)}
                    className="mt-1.5 rounded-lg border p-3"
                    style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Edit File Info</p>
                      <button type="button" onClick={() => setEditingId(null)} style={{ color: 'var(--text-muted)' }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                        <input type="text" value={editMetaForm.displayName}
                          onChange={(e) => setEditMetaForm((f) => ({ ...f, displayName: e.target.value }))}
                          className="w-full rounded-md border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Validity Period</label>
                        <select
                          value={editMetaForm.validityPeriod}
                          onChange={(e) => setEditMetaForm((f) => ({ ...f, validityPeriod: e.target.value as DocumentValidityPeriod, reminderChanged: false }))}
                          className="w-full rounded-md border px-2 py-1 text-xs cursor-pointer"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                        >
                          {/* Show standard options */}
                          {NEW_UPLOAD_VALIDITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                          {/* Show CUSTOM_EXISTING only if the file already has it (legacy) */}
                          {(att.validityPeriod === 'CUSTOM_EXISTING' || (!att.validityPeriod && att.expiryDate)) && (
                            <option value="CUSTOM_EXISTING">{VALIDITY_PERIOD_LABELS['CUSTOM_EXISTING']}</option>
                          )}
                        </select>
                        {editMetaForm.validityPeriod !== 'NONE' && editMetaForm.validityPeriod !== 'CUSTOM_EXISTING' && (
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            New expiry date will be calculated automatically from today.
                          </p>
                        )}
                      </div>
                      {/* CUSTOM_EXISTING: show expiry date input for legacy Set Validity */}
                      {editMetaForm.validityPeriod === 'CUSTOM_EXISTING' && (
                        <div className="pl-4">
                          <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Expiry Date *</label>
                          <input type="date" value={editMetaForm.customExpiryDate}
                            onChange={(e) => setEditMetaForm((f) => ({ ...f, customExpiryDate: e.target.value }))}
                            className="w-full rounded-md border px-2 py-1 text-xs"
                            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                        </div>
                      )}
                      {/* Reminder options — shown when expiry is tracked */}
                      {editMetaForm.validityPeriod !== 'NONE' && (
                        <div className="pl-4">
                          <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Remind Before Expiry</label>
                          {!editMetaForm.reminderChanged && ![7, 14].includes(editMetaForm.reminderDays) && (
                            <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                              This file uses an older reminder setting. It will remain unchanged unless you select 7 or 14 days.
                            </p>
                          )}
                          <div className="flex flex-col gap-1.5 mt-1">
                            {!editMetaForm.reminderChanged && ![7, 14].includes(editMetaForm.reminderDays) && (
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                <input type="radio" name="editReminder" checked={true} onChange={() => {}} className="accent-blue-600" readOnly />
                                Keep current ({editMetaForm.reminderDays} days before)
                              </label>
                            )}
                            {REMINDER_OPTIONS.map((o) => (
                              <label key={o.value} className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <input
                                  type="radio"
                                  name="editReminder"
                                  value={o.value}
                                  checked={editMetaForm.reminderChanged && editMetaForm.reminderDays === o.value}
                                  onChange={() => setEditMetaForm((f) => ({ ...f, reminderDays: o.value, reminderChanged: true }))}
                                  className="accent-blue-600"
                                />
                                {o.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="mb-0.5 block text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                        <input type="text" value={editMetaForm.notes}
                          onChange={(e) => setEditMetaForm((f) => ({ ...f, notes: e.target.value }))}
                          className="w-full rounded-md border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                      </div>
                      {editError && <p className="text-[10px]" style={{ color: 'var(--state-error)' }}>{editError}</p>}
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setEditingId(null); setEditError(''); }}
                          className="rounded-md border px-3 py-1 text-[11px]"
                          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
                        <button type="submit" disabled={editSaving}
                          className="flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                          style={{ backgroundColor: 'var(--accent-primary)' }}>
                          {editSaving && <Loader2 className="h-3 w-3 animate-spin" />}Save
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* History section */}
                {hasHistory && expandedHistory.has(att.id) && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l-2 pl-2"
                    style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--text-disabled)' }}>Previous versions</p>
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between rounded px-2 py-1"
                        style={{ backgroundColor: 'var(--bg-subtle)', opacity: 0.75 }}>
                        <div className="min-w-0 flex-1 mr-2">
                          <span className="text-[10px] truncate block" style={{ color: 'var(--text-secondary)' }}>
                            {h.displayName ?? h.originalFileName}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(h.createdAt).toLocaleDateString('en-GB')}
                            {h.expiryDate && ` · expired ${new Date(h.expiryDate).toLocaleDateString('en-GB')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] rounded px-1 py-0.5" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>Renewed</span>
                          <button onClick={() => downloadAttachment(h)} className="p-0.5 rounded" title="Download old version"
                            style={{ color: 'var(--text-muted)' }}>
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}

          {/* Orphan superseded files (no parent found in activeFiles) */}
          {supersededFiles
            .filter((s) => !activeFiles.some((a) =>
              s.renewedFromId === a.id || s.renewedFromId === a.renewedFromId,
            ))
            .map((att) => (
              <li key={att.id}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                style={{ backgroundColor: 'var(--bg-subtle)', opacity: 0.65 }}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-1">
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {att.displayName ?? att.originalFileName}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(att.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <span className="text-[10px] rounded px-1.5 py-0.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>Renewed</span>
                <button onClick={() => downloadAttachment(att)} title="Download" className="p-1 rounded flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}>
                  <Download className="h-3 w-3" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
