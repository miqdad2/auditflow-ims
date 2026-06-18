'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ChevronDown, ChevronRight, Loader2, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPostAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EvidencePanel } from '@/features/checklist/evidence-panel';
import type { ChecklistSummary, ChecklistItem, ChecklistReadiness } from '@/features/checklist/types';
import { ITEM_STATUS_CONFIG } from '@/features/checklist/types';

interface Props {
  workspaceId: string;
  workspaceName: string;
  refreshKey?: number;
}

function ReadinessBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'var(--state-success)' : pct >= 50 ? 'var(--state-warning)' : 'var(--state-error)';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-default)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-12 text-right text-xs font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function WorkspaceChecklistTab({ workspaceId, workspaceName, refreshKey }: Props) {
  const { token, user } = useAuth();

  const [checklists, setChecklists]   = useState<ChecklistSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [itemsMap, setItemsMap]       = useState<Record<string, ChecklistItem[]>>({});
  const [readinessMap, setReadinessMap] = useState<Record<string, ChecklistReadiness>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [creatingItemId, setCreatingItemId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [addingItem, setAddingItem]   = useState(false);

  const canCreate = user?.permissions?.includes('checklist.create') ?? false;

  const loadChecklists = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGet<ChecklistSummary[]>(`/checklists?workspaceId=${workspaceId}`, token);
      setChecklists(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, workspaceId]);

  useEffect(() => { void loadChecklists(); }, [loadChecklists]);
  useEffect(() => { if (refreshKey !== undefined && refreshKey > 0) void loadChecklists(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = useCallback(async (checklistId: string) => {
    if (!token || itemsMap[checklistId]) return;
    setLoadingItems(true);
    try {
      const [items, readiness] = await Promise.all([
        apiGet<ChecklistItem[]>(`/checklists/${checklistId}/items`, token),
        apiGet<ChecklistReadiness>(`/checklists/${checklistId}/readiness`, token),
      ]);
      setItemsMap((prev) => ({ ...prev, [checklistId]: items }));
      setReadinessMap((prev) => ({ ...prev, [checklistId]: readiness }));
    } catch { /* ignore */ }
    finally { setLoadingItems(false); }
  }, [token, itemsMap]);

  function handleToggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setSelectedItem(null);
    } else {
      setExpandedId(id);
      void loadItems(id);
    }
  }

  async function handleAddItem(checklistId: string) {
    if (!token || !newItemTitle.trim() || addingItem) return;
    setAddingItem(true);
    try {
      const item = await apiPostAuth<ChecklistItem>(
        `/checklists/${checklistId}/items`,
        { title: newItemTitle.trim() },
        token,
      );
      setItemsMap((prev) => ({ ...prev, [checklistId]: [...(prev[checklistId] ?? []), item] }));
      setNewItemTitle('');
      setCreatingItemId(null);
    } catch { /* ignore */ }
    finally { setAddingItem(false); }
  }

  const totalItems   = checklists.reduce((s, c) => s + c._count.items, 0);
  const approvedCount = Object.values(readinessMap).reduce((s, r) => s + r.approved, 0);
  const totalChecked  = Object.values(readinessMap).reduce((s, r) => s + r.total, 0);
  const overallPct    = totalChecked > 0 ? Math.round((approvedCount / totalChecked) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {checklists.length} checklist{checklists.length !== 1 ? 's' : ''} · {totalItems} items in this workspace
          </span>
          {checklists.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Overall readiness:</span>
              <div className="w-32"><ReadinessBar pct={overallPct} /></div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setItemsMap({}); void loadChecklists(); }}
            className="rounded-lg p-1.5" style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href={`/checklist?workspaceId=${workspaceId}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <ExternalLink className="h-3.5 w-3.5" />Full Checklist Page
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : checklists.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <ClipboardList className="h-10 w-10" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No checklists in this workspace</p>
            <Link href={`/checklist?workspaceId=${workspaceId}`}
              className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
              Go to Audit Checklist to create one →
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {checklists.map((cl) => {
              const isExpanded = expandedId === cl.id;
              const items      = itemsMap[cl.id] ?? [];
              const readiness  = readinessMap[cl.id];
              return (
                <div key={cl.id}>
                  {/* Checklist header row */}
                  <div
                    className="flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors"
                    style={{ backgroundColor: isExpanded ? 'var(--bg-subtle)' : undefined }}
                    onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
                    onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = ''; }}
                    onClick={() => handleToggle(cl.id)}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cl.name}</span>
                        {cl.isoStandard && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                            {cl.isoStandard}
                          </span>
                        )}
                      </div>
                      {cl.department && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cl.department.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {cl._count.items} item{cl._count.items !== 1 ? 's' : ''}
                      </span>
                      {readiness && (
                        <div className="w-28"><ReadinessBar pct={readiness.percentage} /></div>
                      )}
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                      {loadingItems && items.length === 0 ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                      ) : items.length === 0 ? (
                        <div className="px-10 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          No items in this checklist.
                        </div>
                      ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {items.map((item) => {
                            const cfg = ITEM_STATUS_CONFIG[item.status];
                            return (
                              <div key={item.id}>
                                <div
                                  className="flex cursor-pointer items-center gap-3 px-10 py-2.5 transition-colors"
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                                    {item.isoClause && (
                                      <p className="text-[10px]" style={{ color: 'var(--accent-primary)' }}>Clause {item.isoClause}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {item.responsibleUser && (
                                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.responsibleUser.fullName}</span>
                                    )}
                                    {item.dueDate && (
                                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(item.dueDate).toLocaleDateString('en-GB')}
                                      </span>
                                    )}
                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                      {item._count.evidence} evidence
                                    </span>
                                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                      {cfg.label}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {selectedItem?.id === item.id
                                        ? <ChevronDown className="h-3.5 w-3.5" />
                                        : <ChevronRight className="h-3.5 w-3.5" />}
                                    </span>
                                  </div>
                                </div>
                                {selectedItem?.id === item.id && (
                                  <div className="px-10 pb-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <EvidencePanel
                                      item={item}
                                      workspaceId={workspaceId}
                                      onClose={() => setSelectedItem(null)}
                                      onUpdated={(updated) => {
                                        setItemsMap((prev) => ({
                                          ...prev,
                                          [cl.id]: (prev[cl.id] ?? []).map((i) => i.id === updated.id ? updated : i),
                                        }));
                                        setSelectedItem(updated);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline add item */}
                      {canCreate && (
                        <div className="px-10 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          {creatingItemId === cl.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') void handleAddItem(cl.id); if (e.key === 'Escape') { setCreatingItemId(null); setNewItemTitle(''); } }}
                                placeholder="New checklist item title…"
                                className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                                style={{ border: '1px solid var(--accent-primary)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
                              />
                              <button disabled={addingItem} onClick={() => void handleAddItem(cl.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                style={{ backgroundColor: 'var(--accent-primary)' }}>
                                {addingItem ? 'Adding…' : 'Add'}
                              </button>
                              <button onClick={() => { setCreatingItemId(null); setNewItemTitle(''); }}
                                className="rounded-lg px-2 py-1.5 text-xs"
                                style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { setCreatingItemId(cl.id); setNewItemTitle(''); }}
                              className="flex items-center gap-1.5 text-xs transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                              <Plus className="h-3.5 w-3.5" />Add checklist item
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
