'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, FileText, ChevronRight, Loader2, Trash2, Check, X, AlertCircle,
  Home, BookOpen, Link2, Link2Off,
} from 'lucide-react';
import { apiGet, apiPostAuth, apiPatchAuth, apiDeleteAuth } from '@/lib/api';
import type { PageTemplate, LinkedRecord } from '@/features/workspaces/types';
import { useAuth } from '@/lib/auth-context';
import { useWorkspaceSocket } from '@/lib/socket-provider';
import { useToast } from '@/lib/toast-provider';
import { ActivityTimeline } from '@/components/activity-timeline';
import { FileAttachmentSection } from '@/features/file-attachments/file-attachment-section';
import type { PageItem, PageChild } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  workspaceId: string;
  canCollaborate?: boolean;
}

export function PagesView({ workspaceId, canCollaborate = false }: Props) {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageItem | null>(null);
  const [pageLoading, setPageLoading] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Track dirty content — used for conflict detection
  const isDirtyRef = useRef(false);
  const [conflict, setConflict] = useState(false);

  const [activeTab, setActiveTab] = useState<'content' | 'linked' | 'activity'>('content');

  // Linked records
  const [linkedRecords, setLinkedRecords]         = useState<LinkedRecord[]>([]);
  const [linkedLoading, setLinkedLoading]         = useState(false);
  const [showAddLink, setShowAddLink]             = useState(false);
  const [addLinkType, setAddLinkType]             = useState<'DOCUMENT' | 'TASK' | 'CHECKLIST_ITEM' | 'NCR_CAPA'>('DOCUMENT');
  const [addLinkSearch, setAddLinkSearch]         = useState('');
  const [addLinkResults, setAddLinkResults]       = useState<{ id: string; title: string }[]>([]);
  const [addLinkSelected, setAddLinkSelected]     = useState<string | null>(null);
  const [addLinkSearching, setAddLinkSearching]   = useState(false);
  const [addLinkSubmitting, setAddLinkSubmitting] = useState(false);
  const [addLinkError, setAddLinkError]           = useState('');
  const [activityKey, setActivityKey] = useState(0);

  const [newPageName, setNewPageName] = useState('');
  const [newPageParent, setNewPageParent] = useState<string | null>(null);
  const [showNewPage, setShowNewPage] = useState(false);
  const [creating, setCreating] = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Templates
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [templateCreating, setTemplateCreating] = useState(false);

  // Home page management
  const [homeLoading, setHomeLoading] = useState(false);

  const canCreate = (user?.permissions?.includes('pages.create') ?? false) || canCollaborate;
  const canUpdate = (user?.permissions?.includes('pages.update') ?? false) || canCollaborate;
  const canDelete = user?.permissions?.includes('pages.delete') ?? false;
  const canManage = (user?.permissions?.includes('project.update') ?? false) || canCollaborate;

  // Warn before leaving page when there are unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const loadPages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const ps = await apiGet<PageItem[]>(`/workspaces/${workspaceId}/pages`, token);
      setPages(ps);
    } catch {}
    finally { setLoading(false); }
  }, [token, workspaceId]);

  useEffect(() => { loadPages(); }, [loadPages]);

  async function selectPage(id: string) {
    if (selectedId === id) return;
    setSelectedId(id);
    setPageLoading(true);
    setSaveMsg('');
    setConflict(false);
    isDirtyRef.current = false;
    setActiveTab('content');
    try {
      const p = await apiGet<PageItem>(`/pages/${id}`, token!);
      setSelectedPage(p);
      setContent(p.content ?? '');
      setDraftTitle(p.title);
    } catch {}
    finally { setPageLoading(false); }
  }

  async function reloadCurrentPage() {
    if (!selectedId || !token) return;
    try {
      const p = await apiGet<PageItem>(`/pages/${selectedId}`, token);
      setSelectedPage(p);
      setContent(p.content ?? '');
      setDraftTitle(p.title);
      isDirtyRef.current = false;
      setConflict(false);
    } catch {}
  }

  // ── Linked records ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'linked' || !selectedId || !token) return;
    setLinkedLoading(true);
    apiGet<LinkedRecord[]>(`/linked-records?sourceType=PAGE&sourceId=${selectedId}`, token)
      .then(setLinkedRecords)
      .catch(() => {})
      .finally(() => setLinkedLoading(false));
  }, [activeTab, selectedId, token]);

  async function handleSearchForLink() {
    if (!token || !selectedPage?.workspaceId) return;
    setAddLinkSearching(true);
    setAddLinkResults([]);
    setAddLinkSelected(null);
    setAddLinkError('');
    try {
      const results = await apiGet<{ id: string; title: string }[]>(
        `/linked-records/search?workspaceId=${selectedPage.workspaceId}&targetType=${addLinkType}&q=${encodeURIComponent(addLinkSearch)}`,
        token,
      );
      setAddLinkResults(results);
    } catch { /* ignore */ }
    finally { setAddLinkSearching(false); }
  }

  async function handleAddLink() {
    if (!token || !addLinkSelected || !selectedId) return;
    setAddLinkSubmitting(true);
    setAddLinkError('');
    try {
      await apiPostAuth('/linked-records', {
        sourceType: 'PAGE', sourceId: selectedId,
        targetType: addLinkType, targetId: addLinkSelected,
      }, token);
      const records = await apiGet<LinkedRecord[]>(`/linked-records?sourceType=PAGE&sourceId=${selectedId}`, token);
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

  // ── Socket handlers ───────────────────────────────────────────────────────
  const socketHandlers = useMemo(() => ({
    'page.updated': (data: Record<string, unknown>) => {
      if (data.workspaceId !== workspaceId) return;
      const updatedId = data.id as string | undefined;

      // Always refresh the page tree sidebar
      void loadPages();

      // If this page is open
      if (updatedId && updatedId === selectedId) {
        if (isDirtyRef.current) {
          setConflict(true);
        } else {
          void reloadCurrentPage();
          setActivityKey((k) => k + 1);
          showToast('Page updated by another user');
        }
      }
    },
    'page.deleted': (data: Record<string, unknown>) => {
      if (data.workspaceId !== workspaceId) return;
      const deletedId = data.id as string | undefined;

      void loadPages();

      if (deletedId && deletedId === selectedId) {
        setSelectedId(null);
        setSelectedPage(null);
        setContent('');
        isDirtyRef.current = false;
        setConflict(false);
        showToast('This page was deleted by another user.');
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [workspaceId, selectedId, loadPages, showToast]);

  const handleReconnect = useCallback(() => {
    void loadPages();
    if (!isDirtyRef.current) void reloadCurrentPage();
    showToast('Reconnected — refreshing pages');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPages, showToast]);

  useWorkspaceSocket(workspaceId, socketHandlers, handleReconnect);

  function scheduleAutoSave(newContent: string) {
    setContent(newContent);
    isDirtyRef.current = true;
    setSaveMsg('');
    if (!selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveContent(newContent), 1500);
  }

  async function saveContent(c: string) {
    if (!selectedId || !canUpdate) return;
    setSaving(true);
    try {
      const updated = await apiPatchAuth<PageItem>(`/pages/${selectedId}`, { content: c }, token!);
      setSelectedPage(updated);
      setSaveMsg('Saved');
      isDirtyRef.current = false;
      setPages((prev) => updatePageInTree(prev, updated));
      setTimeout(() => setSaveMsg((s) => s === 'Saved' ? '' : s), 2500);
    } catch { setSaveMsg('Save failed'); }
    finally { setSaving(false); }
  }

  async function saveTitle() {
    if (!selectedId || !draftTitle.trim() || !canUpdate) { setEditingTitle(false); return; }
    try {
      const updated = await apiPatchAuth<PageItem>(`/pages/${selectedId}`, { title: draftTitle.trim() }, token!);
      setSelectedPage(updated);
      setPages((prev) => updatePageInTree(prev, updated));
    } catch {}
    finally { setEditingTitle(false); }
  }

  async function createPage() {
    if (!newPageName.trim()) return;
    setCreating(true);
    try {
      const page = await apiPostAuth<PageItem>(
        `/workspaces/${workspaceId}/pages`,
        { title: newPageName.trim(), parentId: newPageParent ?? undefined },
        token!,
      );
      setPages((prev) => newPageParent ? insertChild(prev, newPageParent, page as unknown as PageChild) : [...prev, page]);
      if (newPageParent) setExpanded((s) => new Set([...s, newPageParent!]));
      setShowNewPage(false);
      setNewPageName('');
      setNewPageParent(null);
      void selectPage(page.id);
    } catch {}
    finally { setCreating(false); }
  }

  async function deletePage(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this page? This cannot be undone.')) return;
    try {
      await fetch(`${API_URL}/pages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setPages((prev) => removePageFromTree(prev, id));
      if (selectedId === id) { setSelectedId(null); setSelectedPage(null); }
    } catch {}
  }

  async function setAsHome(pageId: string | null) {
    if (!token) return;
    setHomeLoading(true);
    try {
      await apiPatchAuth(`/workspaces/${workspaceId}/home-page`, { pageId }, token);
      // Reflect in page tree
      setPages((prev) => prev.map((p) => markHome(p, pageId)));
      if (selectedPage) {
        setSelectedPage((prev) => prev ? { ...prev, isHome: prev.id === pageId } : null);
      }
      showToast(pageId ? 'Home page set' : 'Home page cleared');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed'); }
    finally { setHomeLoading(false); }
  }

  function markHome(page: PageItem, homeId: string | null): PageItem {
    return {
      ...page,
      isHome: page.id === homeId,
      children: page.children?.map((c) => ({ ...c, isHome: c.id === homeId, children: c.children?.map((cc) => ({ ...cc, isHome: cc.id === homeId })) })) ?? [],
    };
  }

  async function openTemplateModal() {
    setShowTemplateModal(true);
    if (templates.length === 0 && token) {
      const list = await apiGet<PageTemplate[]>('/pages/templates', token).catch(() => []);
      setTemplates(list);
    }
  }

  async function createPageFromTemplate(templateId: string) {
    if (!token) return;
    setTemplateCreating(true);
    try {
      const page = await apiPostAuth<PageItem>(
        `/workspaces/${workspaceId}/pages/from-template?templateId=${encodeURIComponent(templateId)}`,
        {},
        token,
      );
      setPages((prev) => [...prev, page]);
      setShowTemplateModal(false);
      void selectPage(page.id);
      showToast('Page created from template');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to create page'); }
    finally { setTemplateCreating(false); }
  }

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderTree(items: (PageItem | PageChild)[], depth = 0) {
    return items.map((p) => {
      const hasChildren = (p.children?.length ?? 0) > 0;
      const isExpanded  = expanded.has(p.id);
      const isSelected  = selectedId === p.id;
      return (
        <div key={p.id}>
          <div
            className="group flex cursor-pointer items-center gap-1 rounded-lg pr-1 py-1.5 text-sm"
            style={{
              paddingLeft: `${8 + depth * 16}px`,
              backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
              color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: isSelected ? 600 : 400,
            }}
            onClick={() => void selectPage(p.id)}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-muted)'; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center" onClick={hasChildren ? (e) => toggleExpand(p.id, e) : undefined}>
              {hasChildren
                ? <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                : <FileText className="h-3 w-3" style={{ color: 'var(--text-disabled)' }} />
              }
            </span>
            <span className="flex-1 truncate">{p.title}</span>
            {('isHome' in p && p.isHome) && (
              <span title="Workspace Home"><Home className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} /></span>
            )}
            <span className="hidden group-hover:flex items-center gap-0.5">
              {canCreate && (
                <button onClick={(e) => { e.stopPropagation(); setNewPageParent(p.id); setShowNewPage(true); }} title="Add sub-page"
                  className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--accent-primary)')}
                  onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                  <Plus className="h-3 w-3" />
                </button>
              )}
              {canDelete && (
                <button onClick={(e) => void deletePage(p.id, e)} title="Delete"
                  className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--state-error)')}
                  onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderTree(p.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Pages sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pages</span>
          <div className="flex items-center gap-0.5">
            {canCreate && (
              <button onClick={() => void openTemplateModal()} title="Create from template" className="rounded p-0.5" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <BookOpen className="h-4 w-4" />
              </button>
            )}
            {canCreate && (
              <button onClick={() => { setNewPageParent(null); setShowNewPage(true); }} title="New Page" className="rounded p-0.5" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>
          ) : pages.length === 0 ? (
            <p className="px-2 py-3 text-xs" style={{ color: 'var(--text-disabled)' }}>No pages yet</p>
          ) : (
            renderTree(pages)
          )}
        </div>

        {/* Inline new page form */}
        {showNewPage && (
          <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {newPageParent ? 'New sub-page' : 'New page'}
            </p>
            <input
              autoFocus type="text" value={newPageName} onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void createPage(); if (e.key === 'Escape') { setShowNewPage(false); setNewPageName(''); } }}
              placeholder="Page title…"
              className="w-full rounded-lg px-2 py-1.5 text-xs outline-none mb-2"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-1.5">
              <button onClick={() => void createPage()} disabled={creating || !newPageName.trim()} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Create
              </button>
              <button onClick={() => { setShowNewPage(false); setNewPageName(''); setNewPageParent(null); }} className="rounded-md px-2 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Template modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-xl border p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Create Page from Template</h3>
              <button type="button" onClick={() => setShowTemplateModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {templates.length === 0 ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>
            ) : (
              <div className="flex flex-col gap-2">
                {templates.map((t) => (
                  <button key={t.id} type="button"
                    disabled={templateCreating}
                    onClick={() => void createPageFromTemplate(t.id)}
                    className="flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                    </div>
                    <span className="ml-6 text-xs" style={{ color: 'var(--text-muted)' }}>{t.description}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setShowTemplateModal(false)}
                className="rounded-lg border px-4 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page editor */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <FileText className="h-8 w-8" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {pages.length === 0 ? 'Create a page to get started' : 'Select a page to view or edit'}
            </p>
            {canCreate && pages.length === 0 && (
              <button onClick={() => setShowNewPage(true)} className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
                <Plus className="h-4 w-4" /> New Page
              </button>
            )}
          </div>
        ) : pageLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : selectedPage ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Page title bar */}
            <div className="flex items-center justify-between border-b px-6 py-3" style={{ borderColor: 'var(--border-default)' }}>
              {editingTitle ? (
                <input
                  autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  onBlur={() => void saveTitle()}
                  className="text-base font-semibold outline-none rounded px-1 flex-1 mr-4"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)' }}
                />
              ) : (
                <h2
                  className="text-base font-semibold cursor-text flex-1 mr-4"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => canUpdate && setEditingTitle(true)}
                  title={canUpdate ? 'Click to rename' : undefined}
                >
                  {selectedPage.title}
                </h2>
              )}
              <div className="flex items-center gap-3">
                {saving && (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </span>
                )}
                {saveMsg && !saving && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: saveMsg === 'Saved' ? 'var(--state-success)' : 'var(--state-error)' }}>
                      {saveMsg}
                    </span>
                    {saveMsg === 'Save failed' && (
                      <button
                        onClick={() => void saveContent(content)}
                        className="text-[11px] underline"
                        style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Retry
                      </button>
                    )}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  by {selectedPage.createdBy.fullName} · {new Date(selectedPage.updatedAt).toLocaleDateString()}
                </span>
                {canManage && (
                  <button
                    onClick={() => void setAsHome(selectedPage.isHome ? null : selectedPage.id)}
                    disabled={homeLoading}
                    title={selectedPage.isHome ? 'Clear as Home' : 'Set as Workspace Home'}
                    className="flex items-center gap-1 text-xs rounded-lg px-2 py-1"
                    style={{
                      color: selectedPage.isHome ? 'var(--accent-primary)' : 'var(--text-muted)',
                      border: `1px solid ${selectedPage.isHome ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    }}>
                    <Home className="h-3 w-3" />
                    {selectedPage.isHome ? 'Home' : 'Set Home'}
                  </button>
                )}
                {canDelete && (
                  <button onClick={(e) => void deletePage(selectedPage.id, e)} className="flex items-center gap-1 text-xs rounded-lg px-2 py-1" style={{ color: 'var(--state-error)', border: '1px solid var(--state-error-soft)' }}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>

            {/* Conflict banner */}
            {conflict && (
              <div className="mx-5 mt-3 flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ backgroundColor: 'var(--state-warning-soft)', border: '1px solid var(--state-warning)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--state-warning)' }} />
                <span className="flex-1 text-xs" style={{ color: 'var(--state-warning)' }}>
                  This page was updated by another user. Your unsaved text is still here.
                </span>
                <button
                  type="button"
                  onClick={() => { setConflict(false); void reloadCurrentPage(); }}
                  className="text-xs font-medium underline"
                  style={{ color: 'var(--state-warning)' }}
                >
                  Discard & Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setConflict(false)}
                  className="text-xs"
                  style={{ color: 'var(--state-warning)' }}
                >
                  Keep editing
                </button>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-0 border-b px-6" style={{ borderColor: 'var(--border-default)' }}>
              {[
                { key: 'content',  label: 'Content' },
                { key: 'linked',   label: `Linked (${linkedRecords.length})` },
                { key: 'activity', label: 'Activity' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className="py-2 px-4 text-xs font-medium"
                  style={{
                    color: activeTab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6 flex flex-col">
              {activeTab === 'content' ? (
                <>
                  {canUpdate ? (
                    <textarea
                      value={content}
                      onChange={(e) => scheduleAutoSave(e.target.value)}
                      placeholder="Start writing your page content here…&#10;&#10;You can use this space for SOPs, notes, checklists, audit preparation notes, department guidelines, or any structured text content."
                      className="w-full resize-none text-sm leading-relaxed outline-none"
                      style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', minHeight: '320px' }}
                    />
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)', minHeight: '320px' }}>
                      {content || <span style={{ color: 'var(--text-disabled)' }}>No content yet.</span>}
                    </div>
                  )}

                  {/* Page attachments */}
                  <div className="mt-4 border-t pt-1" style={{ borderColor: 'var(--border-default)' }}>
                    <FileAttachmentSection
                      entityType="PAGE"
                      entityId={selectedPage.id}
                      uploadEndpoint={`/pages/${selectedPage.id}/attachments`}
                      listEndpoint={`/pages/${selectedPage.id}/attachments`}
                      canUpload={canUpdate}
                      canDelete={canDelete}
                    />
                  </div>
                </>
              ) : activeTab === 'linked' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Linked documents, tasks, checklist items, and NCRs</span>
                    {canUpdate && selectedPage.workspaceId && (
                      <button
                        onClick={() => setShowAddLink((v) => !v)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                        style={{ color: 'var(--accent-primary)', border: '1px solid var(--accent-soft)' }}
                      >
                        <Link2 className="h-3 w-3" /> Add Link
                      </button>
                    )}
                  </div>

                  {showAddLink && selectedPage.workspaceId && (
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
                          <option value="NCR_CAPA">NCR/CAPA</option>
                        </select>
                        <input
                          type="text"
                          value={addLinkSearch}
                          onChange={(e) => setAddLinkSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && void handleSearchForLink()}
                          placeholder="Search…"
                          className="flex-1 border rounded px-2 py-1 text-xs"
                        />
                        <button onClick={() => void handleSearchForLink()} disabled={addLinkSearching} className="px-2 py-1 text-xs text-white rounded disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
                          {addLinkSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Find'}
                        </button>
                      </div>
                      {addLinkResults.length > 0 && (
                        <ul className="border rounded divide-y max-h-32 overflow-y-auto text-xs">
                          {addLinkResults.map((r) => (
                            <li key={r.id} onClick={() => setAddLinkSelected(r.id)}
                              className={`px-2 py-1.5 cursor-pointer ${addLinkSelected === r.id ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'}`}>
                              {r.title}
                            </li>
                          ))}
                        </ul>
                      )}
                      {addLinkError && <p className="text-xs" style={{ color: 'var(--state-error)' }}>{addLinkError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setShowAddLink(false); setAddLinkSearch(''); setAddLinkResults([]); setAddLinkSelected(null); setAddLinkError(''); }}
                          className="text-xs px-2 py-1 border rounded" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                        <button onClick={() => void handleAddLink()} disabled={!addLinkSelected || addLinkSubmitting}
                          className="text-xs px-2 py-1 text-white rounded disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>
                          {addLinkSubmitting ? 'Linking…' : 'Add Link'}
                        </button>
                      </div>
                    </div>
                  )}

                  {linkedLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
                  ) : linkedRecords.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-disabled)' }}>No linked records. Use Add Link to connect this page to documents, tasks, or checklist items.</p>
                  ) : (
                    <ul className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                      {linkedRecords.map((r) => (
                        <li key={r.id} className="flex items-center justify-between py-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.targetTitle}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.targetType.replace('_', ' ')}</p>
                            </div>
                          </div>
                          {canUpdate && (
                            <button onClick={() => void handleDeleteLink(r.id)} className="p-1 flex-shrink-0" title="Remove link" style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                              <Link2Off className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                token && (
                  <ActivityTimeline
                    entityType="PAGE"
                    entityId={selectedPage.id}
                    token={token}
                    refreshKey={activityKey}
                  />
                )
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function updatePageInTree(pages: PageItem[], updated: PageItem): PageItem[] {
  return pages.map((p) => {
    if (p.id === updated.id) return { ...p, title: updated.title, content: updated.content, updatedAt: updated.updatedAt };
    if (p.children?.length) return { ...p, children: updateChildrenInTree(p.children, updated) };
    return p;
  });
}

function updateChildrenInTree(children: PageChild[], updated: PageItem): PageChild[] {
  return children.map((c) => {
    if (c.id === updated.id) return { ...c, title: updated.title };
    if (c.children?.length) return { ...c, children: updateChildrenInTree(c.children, updated) };
    return c;
  });
}

function removePageFromTree(pages: PageItem[], id: string): PageItem[] {
  return pages
    .filter((p) => p.id !== id)
    .map((p) => ({ ...p, children: removeChildFromTree(p.children, id) }));
}

function removeChildFromTree(children: PageChild[], id: string): PageChild[] {
  return children
    .filter((c) => c.id !== id)
    .map((c) => ({ ...c, children: c.children ? removeChildFromTree(c.children, id) : [] }));
}

function insertChild(pages: PageItem[], parentId: string, child: PageChild): PageItem[] {
  return pages.map((p) => {
    if (p.id === parentId) return { ...p, children: [...p.children, child] };
    if (p.children?.length) return { ...p, children: insertChildInChildren(p.children, parentId, child) };
    return p;
  });
}

function insertChildInChildren(children: PageChild[], parentId: string, child: PageChild): PageChild[] {
  return children.map((c) => {
    if (c.id === parentId) return { ...c, children: [...(c.children ?? []), child] };
    if (c.children?.length) return { ...c, children: insertChildInChildren(c.children, parentId, child) };
    return c;
  });
}
