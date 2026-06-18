'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  X, UploadCloud, FileText, CheckCircle, XCircle, Loader2, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, formatFileSize } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const ALLOWED_EXTENSIONS = new Set([
  '.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx',
  '.jpg','.jpeg','.png','.txt','.csv',
]);

export interface BulkUploadFileResult {
  originalFileName: string;
  success: boolean;
  documentId?: string;
  versionId?: string;
  error?: string;
}

interface BulkUploadApiResponse {
  results: BulkUploadFileResult[];
  successCount: number;
  failCount: number;
}

interface Department { id: string; name: string; }
interface Workspace  { id: string; name: string; }

interface Props {
  departments: Department[];
  workspaces:  Workspace[];
  defaultWorkspaceId?: string;
  onClose:     () => void;
  onCompleted: (successCount: number) => void;
}

function ext(name: string): string {
  return '.' + (name.split('.').pop() ?? '').toLowerCase();
}

export function BulkUploadModal({ departments, workspaces, defaultWorkspaceId, onClose, onCompleted }: Props) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files state
  const [files, setFiles]   = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Form fields
  const [category,     setCategory]     = useState('GENERAL');
  const [departmentId, setDepartmentId] = useState('');
  const [workspaceId,  setWorkspaceId]  = useState(defaultWorkspaceId ?? '');
  const [defaultStatus, setDefaultStatus] = useState('DRAFT');
  const [reviewDate,   setReviewDate]   = useState('');
  const [expiryDate,   setExpiryDate]   = useState('');
  const [docNumberPrefix, setDocNumberPrefix] = useState('');

  // Upload state
  const [uploading, setUploading]   = useState(false);
  const [progress,  setProgress]    = useState(0); // count of processed files (for visual)
  const [results,   setResults]     = useState<BulkUploadFileResult[] | null>(null);
  const [error,     setError]       = useState('');

  // ── File selection helpers ─────────────────────────────────────────────────

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const valid: File[] = [];
    const invalid: string[] = [];

    list.forEach((f) => {
      const e = ext(f.name);
      if (!ALLOWED_EXTENSIONS.has(e)) {
        invalid.push(`${f.name} (unsupported type)`);
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        invalid.push(`${f.name} (exceeds 50 MB)`);
        return;
      }
      // Deduplicate by name
      if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) {
        valid.push(f);
      }
    });

    if (invalid.length > 0) {
      setError(`Skipped ${invalid.length} file(s): ${invalid.join(', ')}`);
    } else {
      setError('');
    }

    setFiles((prev) => [...prev, ...valid]);
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (files.length === 0) { setError('Please select at least one file.'); return; }
    setError(''); setUploading(true); setProgress(0);

    const fd = new FormData();
    files.forEach((f) => fd.append('files[]', f));

    fd.append('category', category);
    fd.append('defaultStatus', defaultStatus);
    if (departmentId)    fd.append('departmentId',         departmentId);
    if (workspaceId)     fd.append('workspaceId',          workspaceId);
    if (reviewDate)      fd.append('reviewDate',           reviewDate);
    if (expiryDate)      fd.append('expiryDate',           expiryDate);
    if (docNumberPrefix.trim()) fd.append('documentNumberPrefix', docNumberPrefix.trim());

    // Animate progress bar over ~2s while request is in flight
    const totalFiles = files.length;
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 1, totalFiles - 1));
    }, Math.max(100, 2000 / totalFiles));

    try {
      const res = await fetch(`${API_URL}/documents/bulk-upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });

      clearInterval(timer);
      setProgress(totalFiles);

      const data: BulkUploadApiResponse = await res.json();

      if (!res.ok) {
        const msg = (data as unknown as { message?: string }).message ?? 'Bulk upload failed.';
        setError(msg);
        setUploading(false);
        return;
      }

      setResults(data.results);
      onCompleted(data.successCount);
    } catch (err: unknown) {
      clearInterval(timer);
      setError(err instanceof Error ? err.message : 'Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none';
  const inputSt  = {
    backgroundColor: 'var(--bg-muted)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };
  const focusBorder = (e: React.FocusEvent<HTMLElement>) =>
    ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)');
  const blurBorder  = (e: React.FocusEvent<HTMLElement>) =>
    ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)');

  // ── Results view ───────────────────────────────────────────────────────────

  if (results) {
    const successCount = results.filter((r) => r.success).length;
    const failCount    = results.length - successCount;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', maxHeight: '85vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Bulk Upload Complete</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {successCount} succeeded · {failCount} failed · {results.length} total
              </p>
            </div>
            <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Summary banners */}
          <div className="px-6 pt-4 flex-shrink-0 flex flex-col gap-2">
            {successCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm" style={{ backgroundColor: 'var(--state-success-soft)', color: 'var(--state-success)' }}>
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                {successCount} document{successCount !== 1 ? 's' : ''} created successfully.
              </div>
            )}
            {failCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {failCount} file{failCount !== 1 ? 's' : ''} failed. Review errors below.
              </div>
            )}
          </div>

          {/* Results table */}
          <div className="overflow-auto flex-1 px-6 py-4">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['File Name', 'Status', 'Details'].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2.5 pr-4 max-w-xs">
                      <span className="text-sm truncate block" style={{ color: 'var(--text-primary)' }}>{r.originalFileName}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.success ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--state-success-soft)', color: 'var(--state-success)' }}>
                          <CheckCircle className="h-3 w-3" /> Created
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-xs" style={{ color: r.success ? 'var(--text-muted)' : 'var(--state-error)' }}>
                      {r.success ? (r.documentId ? `ID: ${r.documentId.slice(0, 12)}…` : 'Saved') : (r.error ?? 'Unknown error')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 pb-6 pt-2 flex-shrink-0 flex justify-end">
            <button onClick={onClose} className="rounded-lg px-5 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload form ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', maxHeight: '90vh' }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Bulk Document Upload</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Upload multiple ISO/QHSE documents at once</p>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-6 flex flex-col gap-5">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)' }}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--state-warning)' }} />
            <p className="text-sm" style={{ color: 'var(--state-warning)' }}>
              Bulk upload creates a controlled document record for each file. Each document starts in the selected status and must go through the approval workflow separately.
            </p>
          </div>

          {/* Drop zone */}
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors"
            style={{
              borderColor: isDragging ? 'var(--accent-primary)' : 'var(--border-strong)',
              backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--bg-subtle)',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-8 w-8" style={{ color: isDragging ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isDragging ? 'Drop files here' : 'Click or drag files here'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              PDF, Word, Excel, PowerPoint, images, TXT, CSV — max 50 MB each
            </p>
            {files.length > 0 && (
              <span className="mt-1 rounded-full px-3 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv"
            onChange={handleFileInputChange} />

          {/* Selected file list */}
          {files.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-36 overflow-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatFileSize(f.size)}</span>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Metadata fields — 2 col grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} style={{ ...inputSt, cursor: 'pointer' }}>
                {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Default Status</label>
              <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)} className={inputCls} style={{ ...inputSt, cursor: 'pointer' }}>
                {DOCUMENT_STATUSES.filter((s) => ['DRAFT', 'UNDER_REVIEW'].includes(s.value)).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Department <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls} style={{ ...inputSt, cursor: 'pointer' }}>
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Workspace <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={inputCls} style={{ ...inputSt, cursor: 'pointer' }}>
                <option value="">— None —</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Review Date <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)}
                className={inputCls} style={inputSt} onFocus={focusBorder} onBlur={blurBorder} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expiry Date <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                className={inputCls} style={inputSt} onFocus={focusBorder} onBlur={blurBorder} />
            </div>
          </div>

          {/* Document number prefix */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Document Number Prefix <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input type="text" value={docNumberPrefix} onChange={(e) => setDocNumberPrefix(e.target.value)}
              placeholder="e.g. QMS → generates QMS-001, QMS-002 …"
              className={inputCls} style={inputSt} onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
          )}

          {/* Progress bar during upload */}
          {uploading && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Uploading…</span>
                <span>{progress} / {files.length}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(progress / files.length) * 100}%`, backgroundColor: 'var(--accent-primary)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-default)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {files.length === 0
              ? 'No files selected'
              : `${files.length} file${files.length !== 1 ? 's' : ''} ready to upload`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={uploading}
              className="rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="button" onClick={handleUpload} disabled={uploading || files.length === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)' }}>
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                : <><UploadCloud className="h-4 w-4" /> Upload {files.length > 0 ? `${files.length} File${files.length !== 1 ? 's' : ''}` : 'Files'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
