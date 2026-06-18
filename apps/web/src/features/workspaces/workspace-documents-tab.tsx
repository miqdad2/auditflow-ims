'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Files, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/status-badge';
import { UploadDocumentModal } from '@/features/documents/upload-document-modal';
import { BulkUploadModal } from '@/features/documents/bulk-upload-modal';
import type { DocumentSummary, DocumentListResponse } from '@/features/documents/types';
import { DOCUMENT_STATUSES, formatFileSize } from '@/features/documents/types';

interface Props {
  workspaceId: string;
  workspaceName: string;
  refreshKey?: number;
  canCollaborate?: boolean;
}

interface Department { id: string; name: string; code: string; }

export function WorkspaceDocumentsTab({ workspaceId, workspaceName, refreshKey, canCollaborate = false }: Props) {
  const { token, user } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showUpload, setShowUpload]     = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const canCreate  = (user?.permissions?.includes('documents.create') ?? false) || canCollaborate;

  const loadDocuments = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50', workspaceId });
      if (search)       params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiGet<DocumentListResponse>(`/documents?${params}`, token);
      setDocuments(res.items);
      setTotal(res.total);
      setPage(res.page);
      setPages(res.pages);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, workspaceId, search, statusFilter]);

  useEffect(() => {
    if (!token) return;
    apiGet<Department[]>('/departments', token).then(setDepartments).catch(() => {});
  }, [token]);

  useEffect(() => { void loadDocuments(1); }, [loadDocuments]);
  useEffect(() => { if (refreshKey !== undefined && refreshKey > 0) void loadDocuments(page); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCls = 'rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer';
  const selectSt  = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); void loadDocuments(1); }} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents…"
                  className="rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none w-44"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>
            </form>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); void loadDocuments(1); }} className={selectCls} style={selectSt}>
              <option value="">All Statuses</option>
              {DOCUMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {(search || statusFilter) && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="text-xs" style={{ color: 'var(--accent-primary)' }}>
                Clear
              </button>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {total} document{total !== 1 ? 's' : ''} in this workspace
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadDocuments(page)} className="rounded-lg p-1.5" style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href={`/documents?workspaceId=${workspaceId}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <ExternalLink className="h-3.5 w-3.5" />All Documents
          </Link>
          {canCreate && (
            <>
              <button onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                <Files className="h-3.5 w-3.5" />Bulk Upload
              </button>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-3.5 w-3.5" />Upload Document
              </button>
            </>
          )}
        </div>
      </div>

      {/* No-duplicate guidance */}
      <div className="px-6 py-2 text-xs" style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
        For official controlled documents, upload here in Documents. Use the attachment panel on tasks/pages only for supporting files.
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <FileText className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No documents in this workspace</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {canCreate ? 'Upload the first document for this workspace.' : 'No documents have been uploaded to this workspace yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                {['Document', 'Category', 'Version', 'Status', 'Owner', 'Review Date', 'Updated'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const lv = doc.versions[0];
                return (
                  <tr key={doc.id} className="cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{doc.title}</span>
                        {doc.documentNumber && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.documentNumber}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {doc.category}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {lv ? (
                        <div>
                          <div>v{lv.versionNumber}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{formatFileSize(lv.fileSize)}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{doc.owner.fullName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: doc.reviewDate ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {doc.reviewDate ? new Date(doc.reviewDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(doc.updatedAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-6 py-2.5" style={{ borderTop: '1px solid var(--border-default)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {pages} — {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => void loadDocuments(page - 1)} disabled={page <= 1}
              className="rounded-lg px-3 py-1 text-xs disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Previous</button>
            <button onClick={() => void loadDocuments(page + 1)} disabled={page >= pages}
              className="rounded-lg px-3 py-1 text-xs disabled:opacity-40"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>Next</button>
          </div>
        </div>
      )}

      {showUpload && (
        <UploadDocumentModal
          departments={departments}
          workspaces={[{ id: workspaceId, name: workspaceName }]}
          defaultWorkspaceId={workspaceId}
          onClose={() => setShowUpload(false)}
          onCreated={(doc) => {
            setShowUpload(false);
            setDocuments((prev) => [doc as unknown as DocumentSummary, ...prev]);
            setTotal((t) => t + 1);
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          departments={departments}
          workspaces={[{ id: workspaceId, name: workspaceName }]}
          defaultWorkspaceId={workspaceId}
          onClose={() => setShowBulkUpload(false)}
          onCompleted={(successCount) => {
            setShowBulkUpload(false);
            if (successCount > 0) void loadDocuments(1);
          }}
        />
      )}
    </div>
  );
}
