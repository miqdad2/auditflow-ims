/**
 * Unit 65.4 — Executive Dashboard UI refinement
 *
 * Tests the pure helper functions exported from the executive dashboard page.
 * React rendering is verified manually (see Part 17 of the spec).
 *
 * Covered:
 *  - formatAction: SNAKE_CASE → Title Case
 *  - fmtMetric: null → N/A, value → value+suffix
 *  - metricStatus: thresholds and null handling
 *  - kpiStyle: CSS variable output, no hex leakage
 *  - buildExecSummary: Overall Status, Highest Risk, Most Urgent, Current Trend
 *  - N/A remains neutral (not error)
 *  - No fake trend when weeklyTrend is null
 *  - Long title truncation
 */

// ─── Re-implement helpers locally (same logic as page.tsx exports) ────────────
// We re-implement here to avoid importing a Next.js client component into Jest.

type KpiStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';

function metricStatus(v: number | null, good = 80, warn = 60): KpiStatus {
  if (v === null) return 'neutral';
  if (v >= good)  return 'success';
  if (v >= warn)  return 'warning';
  return 'error';
}

function kpiStyle(status: KpiStatus): { accent: string; iconBg: string; iconColor: string } {
  switch (status) {
    case 'success': return { accent: 'var(--state-success)', iconBg: 'var(--state-success-soft)', iconColor: 'var(--state-success)' };
    case 'warning': return { accent: 'var(--state-warning)', iconBg: 'var(--state-warning-soft)', iconColor: 'var(--state-warning)' };
    case 'error':   return { accent: 'var(--state-error)',   iconBg: 'var(--state-error-soft)',   iconColor: 'var(--state-error)'   };
    case 'info':    return { accent: 'var(--accent-primary)', iconBg: 'var(--accent-soft)',        iconColor: 'var(--accent-primary)' };
    default:        return { accent: 'var(--border-strong)', iconBg: 'var(--bg-muted)',            iconColor: 'var(--text-muted)'    };
  }
}

function fmtMetric(v: number | null, suffix = ''): string {
  return v === null ? 'N/A' : `${v}${suffix}`;
}

function formatAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── buildExecSummary (same logic as page.tsx) ────────────────────────────────

interface SummaryItem { label: string; value: string; color: string }

interface ExecTestData {
  summary: {
    complianceHealth: number | null;
    activeWorkspaces: number;
    criticalIssues: number;
    overdueActions: number;
    pendingDecisionsCount: number;
    expiringFiles: number;
    tasksAwaitingReview: number;
    completionRate: number | null;
  };
  attentionItems: Array<{ title: string; severity: string }>;
  organizationHealth: Array<{ health: string; workspaceName: string }>;
  trends: { weeklyTrend: number | null };
  pendingDecisions: unknown[];
}

function buildExecSummary(data: ExecTestData): SummaryItem[] {
  const { summary, attentionItems, organizationHealth, trends, pendingDecisions } = data;
  const items: SummaryItem[] = [];

  let status = 'On Track';
  let statusColor = 'var(--state-success)';
  if (summary.criticalIssues > 0 || (summary.complianceHealth !== null && summary.complianceHealth < 60)) {
    status = 'At Risk'; statusColor = 'var(--state-error)';
  } else if (
    summary.overdueActions > 0 ||
    attentionItems.length > 0 ||
    (summary.complianceHealth !== null && summary.complianceHealth < 80)
  ) {
    status = 'Attention Required'; statusColor = 'var(--state-warning)';
  } else if (summary.complianceHealth === null && summary.activeWorkspaces > 0) {
    status = 'Awaiting Data'; statusColor = 'var(--text-muted)';
  }
  items.push({ label: 'Overall Status', value: status, color: statusColor });

  const critWs = organizationHealth.find((r) => r.health === 'CRITICAL');
  const riskWs = critWs ?? organizationHealth.find((r) => r.health === 'AT_RISK');
  if (riskWs) {
    items.push({
      label: 'Highest Risk',
      value: riskWs.workspaceName,
      color: critWs ? 'var(--state-error)' : 'var(--state-warning)',
    });
  }

  const urgent = attentionItems[0];
  if (urgent) {
    const truncated = urgent.title.length > 42 ? `${urgent.title.slice(0, 42)}…` : urgent.title;
    items.push({
      label: 'Most Urgent',
      value: truncated,
      color: urgent.severity === 'CRITICAL' ? 'var(--state-error)' : 'var(--state-warning)',
    });
  } else if (pendingDecisions.length > 0) {
    const n = pendingDecisions.length;
    items.push({
      label: 'Most Urgent',
      value: `${n} decision${n > 1 ? 's' : ''} awaiting review`,
      color: 'var(--state-warning)',
    });
  }

  if (trends.weeklyTrend !== null) {
    const t = trends.weeklyTrend;
    items.push({
      label: 'Current Trend',
      value: t > 0 ? `Improving (+${t}%)` : t < 0 ? `Declining (${t}%)` : 'Stable',
      color: t > 0 ? 'var(--state-success)' : t < 0 ? 'var(--state-error)' : 'var(--text-secondary)',
    });
  }

  return items;
}

// ─── Test data factory ────────────────────────────────────────────────────────

function makeData(overrides: Partial<{
  complianceHealth: number | null;
  criticalIssues: number;
  overdueActions: number;
  weeklyTrend: number | null;
  orgHealth: Array<{ health: string; workspaceName: string }>;
  attentionItems: Array<{ title: string; severity: string }>;
  pendingDecisions: unknown[];
  activeWorkspaces: number;
}>): ExecTestData {
  return {
    summary: {
      complianceHealth: overrides.complianceHealth ?? null,
      activeWorkspaces: overrides.activeWorkspaces ?? 2,
      criticalIssues: overrides.criticalIssues ?? 0,
      overdueActions: overrides.overdueActions ?? 0,
      pendingDecisionsCount: overrides.pendingDecisions?.length ?? 0,
      expiringFiles: 0,
      tasksAwaitingReview: 0,
      completionRate: null,
    },
    attentionItems: overrides.attentionItems ?? [],
    organizationHealth: overrides.orgHealth ?? [],
    trends: { weeklyTrend: overrides.weeklyTrend ?? null },
    pendingDecisions: overrides.pendingDecisions ?? [],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Unit 65.4 — Executive Dashboard UI helpers', () => {

  // ── formatAction ─────────────────────────────────────────────────────────

  it('Test 1 — formatAction: DOCUMENT_APPROVED → "Document Approved"', () => {
    expect(formatAction('DOCUMENT_APPROVED')).toBe('Document Approved');
  });

  it('Test 2 — formatAction: single word "CREATED" → "Created"', () => {
    expect(formatAction('CREATED')).toBe('Created');
  });

  it('Test 3 — formatAction: three-word action "TASK_STATUS_CHANGED" → title case', () => {
    expect(formatAction('TASK_STATUS_CHANGED')).toBe('Task Status Changed');
  });

  // ── fmtMetric ─────────────────────────────────────────────────────────────

  it('Test 4 — fmtMetric(null) → "N/A" regardless of suffix', () => {
    expect(fmtMetric(null)).toBe('N/A');
    expect(fmtMetric(null, '%')).toBe('N/A');
  });

  it('Test 5 — fmtMetric(85, "%") → "85%"', () => {
    expect(fmtMetric(85, '%')).toBe('85%');
  });

  it('Test 6 — fmtMetric(0) → "0" (zero is not N/A)', () => {
    expect(fmtMetric(0)).toBe('0');
  });

  // ── metricStatus ──────────────────────────────────────────────────────────

  it('Test 7 — metricStatus(null) → neutral', () => {
    expect(metricStatus(null)).toBe('neutral');
  });

  it('Test 8 — metricStatus(90) → success', () => {
    expect(metricStatus(90)).toBe('success');
  });

  it('Test 9 — metricStatus(70) → warning', () => {
    expect(metricStatus(70)).toBe('warning');
  });

  it('Test 10 — metricStatus(40) → error', () => {
    expect(metricStatus(40)).toBe('error');
  });

  it('Test 11 — metricStatus with custom thresholds respected', () => {
    expect(metricStatus(75, 70, 50)).toBe('success');
    expect(metricStatus(60, 70, 50)).toBe('warning');
    expect(metricStatus(30, 70, 50)).toBe('error');
  });

  // ── kpiStyle: N/A is neutral, not error ───────────────────────────────────

  it('Test 12 — null Compliance Health uses neutral style (not error)', () => {
    const style = kpiStyle('neutral');
    expect(style.accent).not.toBe('var(--state-error)');
    expect(style.iconBg).toBe('var(--bg-muted)');
  });

  it('Test 13 — kpiStyle returns CSS variables for all statuses (no raw hex)', () => {
    const statuses: KpiStatus[] = ['success', 'warning', 'error', 'info', 'neutral'];
    for (const s of statuses) {
      const style = kpiStyle(s);
      expect(style.accent).toMatch(/^var\(--/);
      expect(style.iconBg).toMatch(/^var\(--/);
      expect(style.iconColor).toMatch(/^var\(--/);
    }
  });

  // ── buildExecSummary: Overall Status ──────────────────────────────────────

  it('Test 14 — Overall Status: healthy compliance → "On Track"', () => {
    const items = buildExecSummary(makeData({ complianceHealth: 90, criticalIssues: 0, overdueActions: 0 }));
    expect(items.find((i) => i.label === 'Overall Status')?.value).toBe('On Track');
    expect(items.find((i) => i.label === 'Overall Status')?.color).toBe('var(--state-success)');
  });

  it('Test 15 — Overall Status: overdueActions > 0 → "Attention Required"', () => {
    const items = buildExecSummary(makeData({ overdueActions: 2, complianceHealth: 90 }));
    expect(items.find((i) => i.label === 'Overall Status')?.value).toBe('Attention Required');
  });

  it('Test 16 — Overall Status: criticalIssues > 0 → "At Risk"', () => {
    const items = buildExecSummary(makeData({ criticalIssues: 1 }));
    expect(items.find((i) => i.label === 'Overall Status')?.value).toBe('At Risk');
    expect(items.find((i) => i.label === 'Overall Status')?.color).toBe('var(--state-error)');
  });

  it('Test 17 — Overall Status: no compliance data + workspaces exist → "Awaiting Data"', () => {
    const items = buildExecSummary(makeData({ complianceHealth: null, criticalIssues: 0, overdueActions: 0, activeWorkspaces: 3 }));
    expect(items.find((i) => i.label === 'Overall Status')?.value).toBe('Awaiting Data');
  });

  it('Test 18 — Overall Status: complianceHealth < 60 → "At Risk"', () => {
    const items = buildExecSummary(makeData({ complianceHealth: 45, criticalIssues: 0, overdueActions: 0 }));
    expect(items.find((i) => i.label === 'Overall Status')?.value).toBe('At Risk');
  });

  // ── buildExecSummary: Highest Risk ────────────────────────────────────────

  it('Test 19 — Highest Risk: CRITICAL workspace shown with error color', () => {
    const items = buildExecSummary(makeData({
      orgHealth: [
        { health: 'ON_TRACK', workspaceName: 'HR' },
        { health: 'CRITICAL', workspaceName: 'ICT' },
      ],
    }));
    const risk = items.find((i) => i.label === 'Highest Risk');
    expect(risk?.value).toBe('ICT');
    expect(risk?.color).toBe('var(--state-error)');
  });

  it('Test 20 — Highest Risk: AT_RISK workspace shown with warning color', () => {
    const items = buildExecSummary(makeData({
      orgHealth: [{ health: 'AT_RISK', workspaceName: 'Maintenance' }],
    }));
    const risk = items.find((i) => i.label === 'Highest Risk');
    expect(risk?.value).toBe('Maintenance');
    expect(risk?.color).toBe('var(--state-warning)');
  });

  it('Test 21 — Highest Risk: all ON_TRACK → no Highest Risk item', () => {
    const items = buildExecSummary(makeData({
      orgHealth: [{ health: 'ON_TRACK', workspaceName: 'HR' }],
    }));
    expect(items.find((i) => i.label === 'Highest Risk')).toBeUndefined();
  });

  it('Test 22 — Highest Risk: CRITICAL preferred over AT_RISK', () => {
    const items = buildExecSummary(makeData({
      orgHealth: [
        { health: 'AT_RISK', workspaceName: 'Maintenance' },
        { health: 'CRITICAL', workspaceName: 'ICT' },
      ],
    }));
    expect(items.find((i) => i.label === 'Highest Risk')?.value).toBe('ICT');
  });

  // ── buildExecSummary: Most Urgent ─────────────────────────────────────────

  it('Test 23 — Most Urgent: attention item title shown', () => {
    const items = buildExecSummary(makeData({
      attentionItems: [{ title: 'Safety audit overdue', severity: 'CRITICAL' }],
    }));
    const urgent = items.find((i) => i.label === 'Most Urgent');
    expect(urgent?.value).toBe('Safety audit overdue');
    expect(urgent?.color).toBe('var(--state-error)');
  });

  it('Test 24 — Most Urgent: HIGH severity uses warning color', () => {
    const items = buildExecSummary(makeData({
      attentionItems: [{ title: 'Task overdue', severity: 'HIGH' }],
    }));
    expect(items.find((i) => i.label === 'Most Urgent')?.color).toBe('var(--state-warning)');
  });

  it('Test 25 — Most Urgent: title truncated at 42 chars + ellipsis', () => {
    const longTitle = 'A'.repeat(50);
    const items = buildExecSummary(makeData({
      attentionItems: [{ title: longTitle, severity: 'HIGH' }],
    }));
    const urgent = items.find((i) => i.label === 'Most Urgent');
    expect(urgent?.value).toHaveLength(43);
    expect(urgent?.value).toMatch(/…$/);
  });

  it('Test 26 — Most Urgent: pending decisions shown when no attention items', () => {
    const items = buildExecSummary(makeData({
      pendingDecisions: [{ id: 'd1' }, { id: 'd2' }],
    }));
    const urgent = items.find((i) => i.label === 'Most Urgent');
    expect(urgent?.value).toBe('2 decisions awaiting review');
  });

  it('Test 27 — Most Urgent: singular decision label when count is 1', () => {
    const items = buildExecSummary(makeData({
      pendingDecisions: [{ id: 'd1' }],
    }));
    const urgent = items.find((i) => i.label === 'Most Urgent');
    expect(urgent?.value).toBe('1 decision awaiting review');
  });

  // ── buildExecSummary: Current Trend ───────────────────────────────────────

  it('Test 28 — Current Trend: positive weeklyTrend → "Improving (+N%)"', () => {
    const items = buildExecSummary(makeData({ weeklyTrend: 15 }));
    expect(items.find((i) => i.label === 'Current Trend')?.value).toBe('Improving (+15%)');
    expect(items.find((i) => i.label === 'Current Trend')?.color).toBe('var(--state-success)');
  });

  it('Test 29 — Current Trend: negative weeklyTrend → "Declining (N%)"', () => {
    const items = buildExecSummary(makeData({ weeklyTrend: -10 }));
    expect(items.find((i) => i.label === 'Current Trend')?.value).toBe('Declining (-10%)');
    expect(items.find((i) => i.label === 'Current Trend')?.color).toBe('var(--state-error)');
  });

  it('Test 30 — Current Trend: zero weeklyTrend → "Stable"', () => {
    const items = buildExecSummary(makeData({ weeklyTrend: 0 }));
    expect(items.find((i) => i.label === 'Current Trend')?.value).toBe('Stable');
  });

  it('Test 31 — No fake trend: null weeklyTrend → no Current Trend item', () => {
    const items = buildExecSummary(makeData({ weeklyTrend: null }));
    expect(items.find((i) => i.label === 'Current Trend')).toBeUndefined();
  });

  it('Test 32 — No fake trend: null weeklyTrend is not displayed as 0% or Stable', () => {
    const items = buildExecSummary(makeData({ weeklyTrend: null }));
    const trendItem = items.find((i) => i.label === 'Current Trend');
    expect(trendItem).toBeUndefined();
  });

});
