'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, FileText, ListChecks, Building2, CalendarDays,
  RefreshCw, ChevronRight, CheckCircle2, Info, ShieldAlert, Eye,
  ExternalLink, X, Filter, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';
import { apiGet, apiPostAuth, ApiError } from '@/lib/api';
import type {
  ActionItem, ActionPreview, DetectionRule, ItemStatus, RuleColor,
} from './types';
import {
  ALL_RULES, RULE_LABELS, RULE_COLOR, STATUS_LABEL, ISSUE_STATUS_LABELS,
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

function ruleColorVars(color: RuleColor): { color: string; bg: string; border: string } {
  switch (color) {
    case 'error':   return { color: 'var(--state-error)',   bg: 'var(--state-error-soft)',   border: 'var(--state-error)30' };
    case 'warning': return { color: 'var(--state-warning)', bg: 'var(--state-warning-soft)', border: 'var(--state-warning)30' };
    case 'info':    return { color: 'var(--accent-primary)', bg: 'var(--accent-soft)',        border: 'var(--accent-primary)30' };
    default:        return { color: 'var(--text-muted)',    bg: 'var(--bg-muted)',            border: 'var(--border-subtle)' };
  }
}

function entityIcon(type: ActionItem['entityType']) {
  switch (type) {
    case 'TASK':            return ListChecks;
    case 'DOCUMENT':        return FileText;
    case 'FILE_ATTACHMENT': return CalendarDays;
    case 'ISSUE':           return AlertTriangle;
    case 'WORKSPACE':       return Building2;
    default:                return AlertTriangle;
  }
}

function entityLink(item: ActionItem): string | null {
  switch (item.entityType) {
    case 'TASK':
      if (item.workspaceId) return `/workspaces/${item.workspaceId}?task=${item.entityId}`;
      return null;
    case 'DOCUMENT':
      return `/documents/${item.entityId}`;
    case 'FILE_ATTACHMENT':
      if (item.workspaceId) return `/workspaces/${item.workspaceId}`;
      return null;
    case 'ISSUE':
      return `/ncr-capa`;
    case 'WORKSPACE':
      return `/workspaces/${item.entityId}`;
    default:
      return null;
  }
}

// Format a source-facts value for display (hide internal implementation details)
function formatFactValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.length === 0 ? 'None' : (value as string[]).map((v) => ISSUE_STATUS_LABELS[v] ?? v).join(' → ');
  }
  if (typeof value === 'string') {
    // Detect ISO date strings
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' }) + ' (Kuwait)';
      } catch { return value; }
    }
    // Skip internal rule expression (too verbose)
    if (key === 'rule') return value;
    return value;
  }
  return String(value);
}

// Keys to hide from the public sourceFacts display (internal/redundant)
const HIDDEN_FACT_KEYS = new Set(['rule', 'timezone']);

// ─── Rule badge ───────────────────────────────────────────────────────────────

function RuleBadge({ ruleKey }: { ruleKey: DetectionRule }) {
  const vars = ruleColorVars(RULE_COLOR[ruleKey]);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
      style={{ color: vars.color, backgroundColor: vars.bg, border: `1px solid ${vars.border}` }}
    >
      {RULE_LABELS[ruleKey]}
    </span>
  );
}

// ─── Local status badge ───────────────────────────────────────────────────────

function LocalStatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'SYSTEM_DETECTED') return null;
  const map: Record<Exclude<ItemStatus, 'SYSTEM_DETECTED'>, { color: string; bg: string }> = {
    NEEDS_REVIEW:   { color: 'var(--accent-primary)', bg: 'var(--accent-soft)' },
    NOT_APPLICABLE: { color: 'var(--text-muted)',     bg: 'var(--bg-muted)' },
  };
  const s = map[status as Exclude<ItemStatus, 'SYSTEM_DETECTED'>];
  if (!s) return null;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Confirmation modal (Part C) ──────────────────────────────────────────────
// Used for "Mark Not Applicable" — requires a reason before confirming.

interface ConfirmModalProps {
  item: ActionItem;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function NotApplicableModal({ item, onConfirm, onCancel }: ConfirmModalProps) {
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: '#0006' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 8px 32px #0002' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Mark as Not Applicable
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              This action will be recorded in the audit log.
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Record context (Part C: show before confirming) */}
        <div className="rounded-lg p-3 mb-4 text-xs space-y-1"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
          <p><span style={{ color: 'var(--text-muted)' }}>Record: </span>
             <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span></p>
          {item.workspaceName && (
            <p><span style={{ color: 'var(--text-muted)' }}>Workspace: </span>
               <span style={{ color: 'var(--text-secondary)' }}>{item.workspaceName}</span></p>
          )}
          <p><span style={{ color: 'var(--text-muted)' }}>Detection rule: </span>
             <span style={{ color: 'var(--text-secondary)' }}>{RULE_LABELS[item.ruleKey]}</span></p>
          {item.responsibleUser && (
            <p><span style={{ color: 'var(--text-muted)' }}>Responsible: </span>
               <span style={{ color: 'var(--text-secondary)' }}>{item.responsibleUser}</span></p>
          )}
        </div>

        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Reason <span style={{ color: 'var(--state-error)' }}>*</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && reason.trim()) onConfirm(reason.trim()); }}
          placeholder="e.g. Already handled via a separate process"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Source facts panel (Part 6: "Why this needs attention") ─────────────────

function SourceFactsPanel({ item }: { item: ActionItem }) {
  const facts = item.sourceFacts ?? {};
  const visibleEntries = Object.entries(facts).filter(([k]) => !HIDDEN_FACT_KEYS.has(k));

  if (visibleEntries.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-lg px-3 py-2 text-[10px]"
      style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
    >
      <p className="font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        Detection evidence
      </p>
      <dl className="space-y-0.5">
        {visibleEntries.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <dt className="font-mono shrink-0" style={{ color: 'var(--text-disabled)' }}>{k}:</dt>
            <dd style={{ color: 'var(--text-secondary)' }}>{formatFactValue(k, v)}</dd>
          </div>
        ))}
      </dl>

      {/* Part 2: valid issue transitions */}
      {item.validTransitions && item.validTransitions.length > 0 && (
        <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Valid next steps (via Issues page)
          </p>
          <div className="flex flex-wrap gap-1">
            {item.validTransitions.map((t) => (
              <span
                key={t}
                className="rounded px-1.5 py-0.5 font-medium"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
              >
                {ISSUE_STATUS_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single action item row ───────────────────────────────────────────────────

interface ItemRowProps {
  item: ActionItem;
  localStatus: ItemStatus;
  concurrencyWarning: string | null;
  onMarkReviewed: (item: ActionItem) => void;
  onMarkNotApplicable: (item: ActionItem) => void;
  reviewingId: string | null;
}

function ItemRow({ item, localStatus, concurrencyWarning, onMarkReviewed, onMarkNotApplicable, reviewingId }: ItemRowProps) {
  const [showFacts, setShowFacts] = useState(false);
  const Icon  = entityIcon(item.entityType);
  const link  = entityLink(item);
  const vars  = ruleColorVars(RULE_COLOR[item.ruleKey]);
  const isNa  = localStatus === 'NOT_APPLICABLE';
  const busy  = reviewingId === item.id;

  return (
    <div
      className="px-5 py-4 flex items-start gap-3 transition-colors"
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        opacity: isNa ? 0.55 : 1,
      }}
    >
      {/* Entity type icon */}
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: vars.bg, color: vars.color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Primary + secondary rule badges (Part 10) */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <RuleBadge ruleKey={item.ruleKey} />
          {/* Secondary rule badges for overlapping conditions */}
          {item.secondaryRules?.map((r) => (
            <RuleBadge key={r} ruleKey={r} />
          ))}
          <LocalStatusBadge status={localStatus} />
          {/* Part G: always show System Detected label */}
          <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
            System Detected
          </span>
        </div>

        {/* Title */}
        <p
          className="text-sm font-medium truncate"
          style={{ color: isNa ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          {item.title}
        </p>

        {/* Part 6: reason — why this was detected */}
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {item.reason}
        </p>

        {/* Meta */}
        <p className="text-xs mt-1 space-x-1.5" style={{ color: 'var(--text-muted)' }}>
          {item.workspaceName && <span>{item.workspaceName}</span>}
          {item.workspaceName && item.responsibleUser && <span>·</span>}
          {item.responsibleUser
            ? <span>{item.responsibleUser}</span>
            : <span className="italic">Unassigned</span>}
          <span>·</span>
          <span>{timeAgo(item.detectedAt)}</span>
        </p>

        {/* Part 8: concurrency warning (shown when the record changed since load) */}
        {concurrencyWarning && (
          <div
            className="mt-1.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px]"
            style={{ backgroundColor: 'var(--state-warning-soft)', color: 'var(--state-warning)', border: '1px solid var(--state-warning)30' }}
          >
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {concurrencyWarning}
          </div>
        )}

        {/* Part 6: expandable detection evidence */}
        <button
          onClick={() => setShowFacts((p) => !p)}
          className="mt-1 flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--text-disabled)' }}
        >
          {showFacts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showFacts ? 'Hide evidence' : 'Detection evidence'}
        </button>

        {showFacts && <SourceFactsPanel item={item} />}
      </div>

      {/* Actions — Part B + Part 9: no automatic business changes */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Open entity link — user takes action here */}
        {link && (
          <Link
            href={link}
            title="Open record to take action"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
          >
            Open <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        {/* Mark Reviewed */}
        {localStatus === 'SYSTEM_DETECTED' && (
          <button
            onClick={() => onMarkReviewed(item)}
            disabled={busy}
            title="Mark as reviewed — adds to audit log"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          >
            {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
            Noted
          </button>
        )}

        {/* Mark Not Applicable */}
        {localStatus !== 'NOT_APPLICABLE' && (
          <button
            onClick={() => onMarkNotApplicable(item)}
            disabled={busy}
            title="Mark as not applicable — requires reason, adds to audit log"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
          >
            <X className="h-3 w-3" /> N/A
          </button>
        )}

        {/* Revert N/A */}
        {localStatus === 'NOT_APPLICABLE' && (
          <button
            onClick={() => onMarkReviewed(item)}
            disabled={busy}
            title="Revert to active detection"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
          >
            <ChevronRight className="h-3 w-3" /> Revert
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Dry-run preview panel (Part L) ──────────────────────────────────────────

function PreviewPanel({ preview, onClose }: { preview: ActionPreview; onClose: () => void }) {
  return (
    <div
      className="mx-5 mb-4 rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dry-Run Preview — {preview.totalItems} items detected
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            (no notifications · no records modified · no audit entries)
          </span>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Rule</th>
            <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Detection condition</th>
            <th className="px-4 py-2 text-right font-medium" style={{ color: 'var(--text-muted)' }}>Count</th>
          </tr>
        </thead>
        <tbody>
          {preview.rules.map((r) => (
            <tr key={r.key} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td className="px-4 py-2 whitespace-nowrap">
                <RuleBadge ruleKey={r.key as DetectionRule} />
              </td>
              <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.description}
              </td>
              <td className="px-4 py-2 text-right font-semibold"
                style={{ color: r.count > 0 ? 'var(--state-error)' : 'var(--state-success)' }}>
                {r.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 text-[10px]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)' }}>
        Generated at {new Date(preview.detectedAt).toLocaleString('en-GB', { timeZone: 'Asia/Kuwait' })} (Kuwait time)
        · All rules use deterministic database queries only
      </div>
    </div>
  );
}

// ─── Post-action recalculation hint (Part 3) ─────────────────────────────────

function RecalcHint({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <div
      className="mx-5 mb-3 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs"
      style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-primary)30', color: 'var(--accent-primary)' }}
    >
      <div className="flex items-center gap-2">
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        <span>
          After taking action via a workspace or issues page, click <strong>Refresh</strong> to recalculate detected items.
          Items that are resolved will disappear automatically.
        </span>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-3 flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BusinessActionCenter({
  token,
  initialRuleFilter = '',
}: {
  token: string;
  initialRuleFilter?: DetectionRule | '';
}) {
  const [items, setItems]               = useState<ActionItem[] | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [ruleFilter, setRuleFilter]     = useState<DetectionRule | 'ALL'>(
    initialRuleFilter ? (initialRuleFilter as DetectionRule) : 'ALL',
  );
  const [showPreview, setShowPreview]   = useState(false);
  const [preview, setPreview]           = useState<ActionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showRecalcHint, setShowRecalcHint] = useState(false);

  // Part G: local review state — kept in component, not persisted to backend
  const [localStatus, setLocalStatus]   = useState<Record<string, ItemStatus>>({});

  // Part 8: per-item concurrency warnings (shown inline in the row)
  const [concurrencyWarnings, setConcurrencyWarnings] = useState<Record<string, string>>({});

  // Tracks which item is currently being processed (button loading state)
  const [reviewingId, setReviewingId]   = useState<string | null>(null);

  // Part C: confirmation modal state
  const [naTarget, setNaTarget]         = useState<ActionItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<ActionItem[]>('/business-actions/items', token);
      setItems(data);
      setShowRecalcHint(false);
      // Clear stale concurrency warnings after refresh
      setConcurrencyWarnings({});
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        setError('You do not have access to the Business Action Center.');
      } else {
        setError('Failed to load action items. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // ─── Part 8: concurrency check ──────────────────────────────────────────
  // Returns true if safe to proceed; shows an inline warning and still proceeds
  // for non-destructive review actions (Noted is safe; N/A requires reason).

  async function verifyBeforeAction(item: ActionItem): Promise<boolean> {
    if (!item.updatedAt) return true;
    if (item.entityType === 'FILE_ATTACHMENT') return true; // no updatedAt proxy

    try {
      const result = await apiPostAuth<{ changed: boolean; message?: string }>(
        '/business-actions/verify-entity',
        { entityType: item.entityType, entityId: item.entityId, expectedUpdatedAt: item.updatedAt },
        token,
      );

      if (result.changed && result.message) {
        // Show inline warning in the affected row (Part 8 — visible warning)
        setConcurrencyWarnings((prev) => ({ ...prev, [item.id]: result.message! }));
      }
    } catch {
      // Concurrency check failure is non-blocking for Noted (safe action)
    }
    return true;
  }

  // ─── Mark as Reviewed (Part G: NEEDS_REVIEW label) ──────────────────────
  async function handleMarkReviewed(item: ActionItem) {
    if (reviewingId) return;
    setReviewingId(item.id);
    try {
      await verifyBeforeAction(item);
      await apiPostAuth('/business-actions/log-action', {
        action:     'ALERT_REVIEWED',
        entityType: item.entityType,
        entityId:   item.entityId,
        ruleKey:    item.ruleKey,
        previousValue: 'SYSTEM_DETECTED',
        newValue:   'NEEDS_REVIEW',
      }, token);
      setLocalStatus((prev) => ({ ...prev, [item.id]: 'NEEDS_REVIEW' }));
      // Part 3: show recalc hint — item may still be active; user should take action then refresh
      setShowRecalcHint(true);
    } catch {
      // Silent — audit log failure must not block the reviewer
    } finally {
      setReviewingId(null);
    }
  }

  // ─── Mark as Not Applicable (Part C: requires reason + confirmation) ─────
  async function handleConfirmNotApplicable(reason: string) {
    if (!naTarget) return;
    const item = naTarget;
    setNaTarget(null);
    setReviewingId(item.id);
    try {
      await verifyBeforeAction(item);
      await apiPostAuth('/business-actions/log-action', {
        action:     'ALERT_NOT_APPLICABLE',
        entityType: item.entityType,
        entityId:   item.entityId,
        ruleKey:    item.ruleKey,
        previousValue: localStatus[item.id] ?? 'SYSTEM_DETECTED',
        newValue:   'NOT_APPLICABLE',
        note:       reason,
      }, token);
      setLocalStatus((prev) => ({ ...prev, [item.id]: 'NOT_APPLICABLE' }));
      setShowRecalcHint(true);
    } catch {
      // Silent
    } finally {
      setReviewingId(null);
    }
  }

  // ─── Dry-run preview ─────────────────────────────────────────────────────
  async function handleRunPreview() {
    if (previewLoading) return;
    setPreviewLoading(true);
    try {
      const data = await apiGet<ActionPreview>('/business-actions/preview', token);
      setPreview(data);
      setShowPreview(true);
    } catch {
      // Silent
    } finally {
      setPreviewLoading(false);
    }
  }

  // ─── Derived display values ───────────────────────────────────────────────
  const filtered = items
    ? ruleFilter === 'ALL'
      ? items
      : items.filter((i) => i.ruleKey === ruleFilter)
    : [];

  const activeItems = items
    ? items.filter((i) => localStatus[i.id] !== 'NOT_APPLICABLE')
    : [];

  const countByRule = items
    ? Object.fromEntries(ALL_RULES.map((r) => [r, items.filter((i) => i.ruleKey === r).length]))
    : {} as Record<string, number>;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="rounded-xl p-5 text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <ShieldAlert className="mx-auto mb-2 h-5 w-5" style={{ color: 'var(--state-error)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Part C: Not-applicable confirmation modal */}
      {naTarget && (
        <NotApplicableModal
          item={naTarget}
          onConfirm={(reason) => void handleConfirmNotApplicable(reason)}
          onCancel={() => setNaTarget(null)}
        />
      )}

      <div className="rounded-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Business Action Center
            </h2>
            {!loading && activeItems.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}
              >
                {activeItems.length}
              </span>
            )}
            {!loading && items !== null && (
              <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                · 9 deterministic rules · Kuwait TZ · No auto-actions
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Dry-run preview button (Part L) */}
            <button
              onClick={() => void handleRunPreview()}
              disabled={previewLoading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              title="Dry-run: detect items without creating notifications or changing records"
            >
              {previewLoading
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <Info className="h-3 w-3" />}
              Dry-Run Preview
            </button>

            {/* Refresh */}
            <button
              onClick={() => void load()}
              disabled={loading}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--text-muted)' }}
              title="Refresh — recalculates all detected items from the database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Rule filter chips */}
        {items !== null && items.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setRuleFilter('ALL')}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: ruleFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--bg-muted)',
                color: ruleFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              All ({items.length})
            </button>
            {ALL_RULES.filter((r) => (countByRule[r] ?? 0) > 0).map((r) => {
              const vars = ruleColorVars(RULE_COLOR[r]);
              const active = ruleFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRuleFilter(r === ruleFilter ? 'ALL' : r)}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: active ? vars.color : vars.bg,
                    color: active ? '#fff' : vars.color,
                    border: `1px solid ${vars.border}`,
                  }}
                >
                  {RULE_LABELS[r]} ({countByRule[r]})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* All-clear */}
        {!loading && items !== null && items.length === 0 && (
          <div className="flex flex-col items-center py-10 px-5 text-center">
            <CheckCircle2 className="mb-2 h-6 w-6" style={{ color: 'var(--state-success)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              No business issues detected
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              All 9 detection rules passed with no items found.
            </p>
          </div>
        )}

        {/* Filtered empty state */}
        {!loading && filtered.length === 0 && items !== null && items.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No items for the selected filter.
              <button onClick={() => setRuleFilter('ALL')} className="ml-1.5 underline" style={{ color: 'var(--accent-primary)' }}>
                Clear filter
              </button>
            </p>
          </div>
        )}

        {/* Part 3: recalculate hint — shown after taking a review action */}
        {showRecalcHint && !loading && items !== null && items.length > 0 && (
          <RecalcHint onRefresh={() => void load()} loading={loading} />
        )}

        {/* Items */}
        {!loading && filtered.length > 0 && (
          <div>
            {filtered.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                localStatus={localStatus[item.id] ?? 'SYSTEM_DETECTED'}
                concurrencyWarning={concurrencyWarnings[item.id] ?? null}
                onMarkReviewed={(i) => void handleMarkReviewed(i)}
                onMarkNotApplicable={(i) => setNaTarget(i)}
                reviewingId={reviewingId}
              />
            ))}
          </div>
        )}

        {/* Dry-run preview panel */}
        {showPreview && preview && (
          <div className="pt-2">
            <PreviewPanel preview={preview} onClose={() => setShowPreview(false)} />
          </div>
        )}

        {/* Footer */}
        {items !== null && (
          <div
            className="px-5 py-2.5 text-[10px] flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-disabled)' }}
          >
            <span>
              9 deterministic rules · Kuwait timezone (UTC+3, no DST) · Backend source of truth · No auto-actions
            </span>
            <span className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {ruleFilter === 'ALL' ? 'Showing all rules' : `Filtered: ${RULE_LABELS[ruleFilter]}`}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
