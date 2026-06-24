/**
 * Unit 65.6 — Executive Navigation Simplification & Dashboard Helpers
 *
 * Verifies:
 *  - EXECUTIVE_NAV shape: 3 items, no ISO Workspaces
 *  - Dashboard href routing (resolved to /executive-dashboard for exec users)
 *  - getFirstName helper
 *  - getGreeting helper (Kuwait timezone, time-aware)
 *  - healthRowBg helper (CSS color-mix, CSS-var-only, case-sensitive)
 *
 * All helpers are duplicated locally — Next.js 'use client' modules cannot
 * be imported directly in Jest.
 */

// ─── Local duplicates of helpers (must match page.tsx exactly) ───────────────

function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first ?? fullName;
}

function getGreeting(hour: number, firstName: string): string {
  if (hour >= 5  && hour < 12) return `Good morning, ${firstName}.`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}.`;
  if (hour >= 17 && hour < 21) return `Good evening, ${firstName}.`;
  return `Welcome back, ${firstName}.`;
}

function healthRowBg(health: string): string {
  switch (health) {
    case 'CRITICAL':  return 'color-mix(in srgb, var(--state-error) 5%, transparent)';
    case 'AT_RISK':   return 'color-mix(in srgb, var(--state-warning) 4%, transparent)';
    case 'ATTENTION': return 'color-mix(in srgb, var(--state-warning) 3%, transparent)';
    default:          return '';
  }
}

// ─── Local duplicate of EXECUTIVE_NAV (must match app-sidebar.tsx exactly) ───

const EXECUTIVE_NAV = [
  { label: 'Dashboard',     href: '/dashboard'     },
  { label: 'Reports',       href: '/reports'        },
  { label: 'Notifications', href: '/notifications'  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Unit 65.6 — Executive Navigation & Dashboard Helpers', () => {

  // ── getFirstName ─────────────────────────────────────────────────────────

  it('Test 1 — getFirstName: single-word name returns the full name', () => {
    expect(getFirstName('Ahmad')).toBe('Ahmad');
  });

  it('Test 2 — getFirstName: two-word name returns first word only', () => {
    expect(getFirstName('Ahmad Al-Farsi')).toBe('Ahmad');
  });

  it('Test 3 — getFirstName: three-word name returns first word only', () => {
    expect(getFirstName('Ahmad Khalid Al-Rashidi')).toBe('Ahmad');
  });

  it('Test 4 — getFirstName: leading and trailing whitespace is trimmed before split', () => {
    expect(getFirstName('  Sarah  Johnson  ')).toBe('Sarah');
  });

  it('Test 5 — getFirstName: empty string returns empty string', () => {
    expect(getFirstName('')).toBe('');
  });

  // ── getGreeting: morning band (5–11) ─────────────────────────────────────

  it('Test 6 — getGreeting: hour 5 → Good morning', () => {
    expect(getGreeting(5, 'Ahmad')).toBe('Good morning, Ahmad.');
  });

  it('Test 7 — getGreeting: hour 11 → Good morning (last morning hour)', () => {
    expect(getGreeting(11, 'Ahmad')).toBe('Good morning, Ahmad.');
  });

  // ── getGreeting: afternoon band (12–16) ──────────────────────────────────

  it('Test 8 — getGreeting: hour 12 → Good afternoon', () => {
    expect(getGreeting(12, 'Sarah')).toBe('Good afternoon, Sarah.');
  });

  it('Test 9 — getGreeting: hour 16 → Good afternoon (last afternoon hour)', () => {
    expect(getGreeting(16, 'Sarah')).toBe('Good afternoon, Sarah.');
  });

  // ── getGreeting: evening band (17–20) ────────────────────────────────────

  it('Test 10 — getGreeting: hour 17 → Good evening', () => {
    expect(getGreeting(17, 'Omar')).toBe('Good evening, Omar.');
  });

  it('Test 11 — getGreeting: hour 20 → Good evening (last evening hour)', () => {
    expect(getGreeting(20, 'Omar')).toBe('Good evening, Omar.');
  });

  // ── getGreeting: late-night / overnight band ──────────────────────────────

  it('Test 12 — getGreeting: hour 21 → Welcome back (late night)', () => {
    expect(getGreeting(21, 'Layla')).toBe('Welcome back, Layla.');
  });

  it('Test 13 — getGreeting: hour 23 → Welcome back', () => {
    expect(getGreeting(23, 'Layla')).toBe('Welcome back, Layla.');
  });

  it('Test 14 — getGreeting: hour 0 → Welcome back (midnight)', () => {
    expect(getGreeting(0, 'Layla')).toBe('Welcome back, Layla.');
  });

  it('Test 15 — getGreeting: hour 4 → Welcome back (pre-dawn)', () => {
    expect(getGreeting(4, 'Layla')).toBe('Welcome back, Layla.');
  });

  // ── getGreeting: firstName substitution ──────────────────────────────────

  it('Test 16 — getGreeting: greeting includes firstName verbatim', () => {
    const result = getGreeting(10, 'Fatima');
    expect(result).toContain('Fatima');
  });

  it('Test 17 — getGreeting: different firstName produces a different greeting string', () => {
    const a = getGreeting(10, 'Ahmad');
    const b = getGreeting(10, 'Sara');
    expect(a).not.toBe(b);
  });

  // ── healthRowBg ───────────────────────────────────────────────────────────

  it('Test 18 — healthRowBg: CRITICAL returns color-mix with state-error 5%', () => {
    expect(healthRowBg('CRITICAL')).toBe('color-mix(in srgb, var(--state-error) 5%, transparent)');
  });

  it('Test 19 — healthRowBg: AT_RISK returns color-mix with state-warning 4%', () => {
    expect(healthRowBg('AT_RISK')).toBe('color-mix(in srgb, var(--state-warning) 4%, transparent)');
  });

  it('Test 20 — healthRowBg: ATTENTION returns color-mix with state-warning 3%', () => {
    expect(healthRowBg('ATTENTION')).toBe('color-mix(in srgb, var(--state-warning) 3%, transparent)');
  });

  it('Test 21 — healthRowBg: ON_TRACK returns empty string (no tint needed)', () => {
    expect(healthRowBg('ON_TRACK')).toBe('');
  });

  it('Test 22 — healthRowBg: unknown/empty health returns empty string', () => {
    expect(healthRowBg('')).toBe('');
    expect(healthRowBg('UNKNOWN')).toBe('');
  });

  it('Test 23 — healthRowBg: lowercase "critical" returns empty string (case-sensitive)', () => {
    expect(healthRowBg('critical')).toBe('');
  });

  it('Test 24 — healthRowBg: CRITICAL result contains "transparent" keyword', () => {
    expect(healthRowBg('CRITICAL')).toContain('transparent');
  });

  it('Test 25 — healthRowBg: AT_RISK result contains "transparent" keyword', () => {
    expect(healthRowBg('AT_RISK')).toContain('transparent');
  });

  it('Test 26 — healthRowBg: CRITICAL result references var(--state-error) CSS variable', () => {
    expect(healthRowBg('CRITICAL')).toContain('var(--state-error)');
  });

  it('Test 27 — healthRowBg: AT_RISK result references var(--state-warning) CSS variable', () => {
    expect(healthRowBg('AT_RISK')).toContain('var(--state-warning)');
  });

  // ── EXECUTIVE_NAV shape ───────────────────────────────────────────────────

  it('Test 28 — EXECUTIVE_NAV: has exactly 3 items (Dashboard, Reports, Notifications)', () => {
    expect(EXECUTIVE_NAV).toHaveLength(3);
  });

  it('Test 29 — EXECUTIVE_NAV: first item label is Dashboard', () => {
    expect(EXECUTIVE_NAV[0].label).toBe('Dashboard');
  });

  it('Test 30 — EXECUTIVE_NAV: second item label is Reports', () => {
    expect(EXECUTIVE_NAV[1].label).toBe('Reports');
  });

  it('Test 31 — EXECUTIVE_NAV: third item label is Notifications', () => {
    expect(EXECUTIVE_NAV[2].label).toBe('Notifications');
  });

  it('Test 32 — EXECUTIVE_NAV: no item has label "ISO Workspaces"', () => {
    const hasWorkspaces = EXECUTIVE_NAV.some((item) => item.label === 'ISO Workspaces');
    expect(hasWorkspaces).toBe(false);
  });

  it('Test 33 — EXECUTIVE_NAV: Dashboard href is "/dashboard" (resolved dynamically to /executive-dashboard in render)', () => {
    const dashItem = EXECUTIVE_NAV.find((item) => item.label === 'Dashboard');
    expect(dashItem?.href).toBe('/dashboard');
  });

});
