'use client';

import { useState, FormEvent, useRef, ChangeEvent } from 'react';
import { X, Loader2, UploadCloud, File } from 'lucide-react';
import { apiUploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DocumentDetail } from './types';
import { DOCUMENT_CATEGORIES } from './types';

interface Department { id: string; name: string; }
interface Workspace  { id: string; name: string; }

interface Props {
  departments: Department[];
  workspaces:  Workspace[];
  defaultWorkspaceId?: string;
  onClose:   () => void;
  onCreated: (doc: DocumentDetail) => void;
}

const ALLOWED_EXTENSIONS = ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.jpg','.jpeg','.png','.txt','.csv'];

export function UploadDocumentModal({ departments, workspaces, defaultWorkspaceId, onClose, onCreated }: Props) {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [category, setCategory]         = useState('GENERAL');
  const [departmentId, setDepartmentId] = useState('');
  const [workspaceId, setWorkspaceId]   = useState(defaultWorkspaceId ?? '');
  const [reviewDate, setReviewDate]     = useState('');
  const [expiryDate, setExpiryDate]     = useState('');
  const [file, setFile]                 = useState<File | null>(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    const ext = '.' + f.name.split('.').pop()!.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File type '${ext}' is not allowed.`);
      e.target.value = '';
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25 MB limit.');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Document title is required.'); return; }
    if (!file) { setError('Please select a file to upload.'); return; }

    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      if (documentNumber.trim()) fd.append('documentNumber', documentNumber.trim());
      fd.append('category', category);
      if (departmentId) fd.append('departmentId', departmentId);
      if (workspaceId)  fd.append('workspaceId',  workspaceId);
      if (reviewDate)   fd.append('reviewDate',   reviewDate);
      if (expiryDate)   fd.append('expiryDate',   expiryDate);

      const doc = await apiUploadFile<DocumentDetail>('/documents/upload', fd, token!);
      onCreated(doc);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none';
  const inputStyle = {
    backgroundColor: 'var(--bg-muted)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Document</h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quality Manual v3" className={inputCls} style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')} autoFocus />
          </div>

          {/* Doc Number + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Document Number</label>
              <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="e.g. QMS-001" className={inputCls} style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Department + Workspace */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— Select Department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Workspace</label>
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— Select Workspace —</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {/* Review Date + Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Review Date</label>
              <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={inputCls} style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={2}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')} />
          </div>

          {/* File picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>File *</label>
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 cursor-pointer"
              style={{ borderColor: file ? 'var(--accent-primary)' : 'var(--border-strong)', backgroundColor: 'var(--bg-subtle)' }}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <>
                  <File className="h-8 w-8" style={{ color: 'var(--accent-primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button type="button" className="text-xs underline" style={{ color: 'var(--accent-primary)' }} onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                    Change file
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click to select file</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, Word, Excel, PowerPoint, images, TXT, CSV — max 25 MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.csv" onChange={handleFileChange} />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: 'var(--accent-primary)' }}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><UploadCloud className="h-4 w-4" /> Upload</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
