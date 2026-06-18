'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, FileText, RefreshCw, Files, X } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge } from '@/components/status-badge';
import { UploadDocumentModal } from '@/features/documents/upload-document-modal';
import { BulkUploadModal } from '@/features/documents/bulk-upload-modal';
import type { DocumentSummary, DocumentListResponse } from '@/features/documents/types';
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, formatFileSize } from '@/features/documents/types';

interface Department { id: string; name: string; code: string; }
interface Workspace  { id: string; name: string; }

export default function DocumentsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [workspaces,  setWorkspaces]  = useState<Workspace[]>([]);

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter,   setDeptFilter]   = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [wsFilter,     setWsFilter]     = useState(() => searchParams.get('workspaceId') ?? '');

  const [showUpload,     setShowUpload]     = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const canCreate  = user?.permissions?.includes('documents.create')   ?? false;
  const canApprove = user?.permissions?.includes('documents.approve')  ?? false;

  const loadDocuments = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '25' });
      if (search)       params.set('search',       search);
      if (statusFilter) params.set('status',       statusFilter);
      if (deptFilter)   params.set('departmentId', deptFilter);
      if (catFilter)    params.set('category',     catFilter);
      if (wsFilter)     params.set('workspaceId',  wsFilter);

      const res = await apiGet<DocumentListResponse>(`/documents?${params}`, token);
      setDocuments(res.items);
      setTotal(res.total);
      setPage(res.page);
      setPages(res.pages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, deptFilter, catFilter, wsFilter]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiGet<Department[]>('/departments', token),
      apiGet<{ id: string; name: string }[]>('/workspaces', token).then((ws) =>
        ws.map((w) => ({ id: w.id, name: w.name }))
      ),
    ]).then(([depts, wss]) => {
      setDepartments(depts);
      setWorkspaces(wss);
    }).catch(() => {});
  }, [token]);

  useEffect(() => { loadDocuments(1); }, [loadDocuments]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadDocuments(1);
  }

  const selectCls = 'rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer';
  const selectSt  = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' };

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Document Library</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {total} document{total !== 1 ? 's' : ''} — ISO documents, version history, and approval workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadDocuments(page)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          {canCreate && (
            <>
              <button onClick={() => setShowBulkUpload(true)} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium" style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                <Files className="h-4 w-4" /> Bulk Upload
              </button>
              <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-4 w-4" /> Upload Document
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 flex-wrap" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none w-52"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          </div>
        </form>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); loadDocuments(1); }} className={selectCls} style={selectSt}>
          <option value="">All Statuses</option>
          {DOCUMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); loadDocuments(1); }} className={selectCls} style={selectSt}>
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); loadDocuments(1); }} className={selectCls} style={selectSt}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {wsFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
            Workspace: {workspaces.find((w) => w.id === wsFilter)?.name ?? wsFilter}
            <button onClick={() => setWsFilter('')} title="Clear workspace filter">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {(search || statusFilter || catFilter || deptFilter || wsFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setCatFilter(''); setDeptFilter(''); setWsFilter(''); }} className="text-sm underline" style={{ color: 'var(--accent-primary)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="mx-6 mt-4 rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full" style={{ border: '2px solid var(--bg-muted)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 h-64">
            <FileText className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No documents found</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {canCreate ? 'Click "Upload Document" to add your first ISO document.' : 'No documents match the current filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                {['Document', 'Category', 'Department', 'Version', 'Status', 'Owner', 'Review Date', 'Updated'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const latestVersion = doc.versions[0];
                return (
                  <tr
                    key={doc.id}
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border-default)' }}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{doc.title}</span>
                        {doc.documentNumber && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.documentNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {DOCUMENT_CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {doc.department?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {latestVersion ? (
                        <div className="flex flex-col gap-0.5">
                          <span>v{latestVersion.versionNumber}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(latestVersion.fileSize)}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {doc.owner.fullName}
                    </td>
                    <td className="px-4 py-3" style={{ color: doc.reviewDate ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {doc.reviewDate ? new Date(doc.reviewDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {new Date(doc.updatedAt).toLocaleDateString()}
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
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {pages} — {total} total
          </p>
          <div className="flex gap-2">
            <button onClick={() => loadDocuments(page - 1)} disabled={page <= 1} className="rounded-lg px-3 py-1.5 text-xs disabled:opacity-40" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              Previous
            </button>
            <button onClick={() => loadDocuments(page + 1)} disabled={page >= pages} className="rounded-lg px-3 py-1.5 text-xs disabled:opacity-40" style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              Next
            </button>
          </div>
        </div>
      )}

      {showUpload && (
        <UploadDocumentModal
          departments={departments}
          workspaces={workspaces}
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
          workspaces={workspaces}
          onClose={() => setShowBulkUpload(false)}
          onCompleted={(successCount) => {
            setShowBulkUpload(false);
            if (successCount > 0) loadDocuments(1);
          }}
        />
      )}
    </div>
  );
}
