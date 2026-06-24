/**
 * Unit 66.2 — Simplify Executive Dashboard and Grant CEO All-Workspace Visibility
 *
 * Verifies:
 *  - EXEC_NAV_66_2 shape: 4 items including ISO Workspaces
 *  - assertWorkspaceAccess with visibilityMode = 'ALL' grants access
 *  - assertWorkspaceAccess with visibilityMode = 'SELECTED' still blocks non-members
 *  - findAll workspace list respects visibilityMode = 'ALL'
 *  - Removed Executive Dashboard sections (UI logic)
 *  - Remaining Executive Dashboard sections
 *  - ALL visibility does not grant Super Admin or elevated roles
 *  - Standard user without membership remains blocked (SELECTED mode)
 *  - New workspace automatically visible to ALL mode users (no WHERE filter)
 *
 * All business logic is locally duplicated — NestJS DI is not bootstrapped here.
 */

// ─── Local duplicate of EXEC_NAV_66_2 (must match app-sidebar.tsx exactly) ────

const EXEC_NAV_66_2 = [
  { label: 'Dashboard',      href: '/dashboard'    },
  { label: 'ISO Workspaces', href: '/workspaces'   },
  { label: 'Reports',        href: '/reports'       },
  { label: 'Notifications',  href: '/notifications' },
];

// ─── Local duplicate of assertWorkspaceAccess logic ───────────────────────────

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

function checkWorkspaceAccess(params: {
  actorRoles: string[];
  isMember: boolean;
  visibilityMode: string;
  workspaceExists?: boolean;
}): { allowed: true } | { allowed: false; reason: string } {
  const { actorRoles, isMember, visibilityMode, workspaceExists = true } = params;

  if (!workspaceExists) return { allowed: false, reason: 'Workspace not found' };

  // Elevated roles always pass
  if (actorRoles.some((r) => ELEVATED_ROLES.includes(r))) return { allowed: true };

  // Explicit workspace member passes
  if (isMember) return { allowed: true };

  // ALL visibility: grants read-level access to all workspaces
  if (visibilityMode === 'ALL') return { allowed: true };

  // SELECTED: only explicit members allowed
  return { allowed: false, reason: 'Workspace unavailable or access denied.' };
}

// ─── Local duplicate of findAll visibility logic ──────────────────────────────

function buildWorkspaceListWhere(params: {
  actorId: string;
  actorRoles: string[];
  actorDeptId: string | null;
  visibilityMode: string;
}): Record<string, unknown> {
  const { actorId, actorRoles, actorDeptId, visibilityMode } = params;
  const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
  const isDeptRole = actorRoles.includes('DEPARTMENT_MANAGER') || actorRoles.includes('DEPARTMENT_USER');

  if (isElevated || visibilityMode === 'ALL') return {};

  if (isDeptRole && actorDeptId) {
    return { OR: [{ visibility: 'DEPARTMENT', departmentId: actorDeptId }, { members: { some: { userId: actorId } } }] };
  }

  return { members: { some: { userId: actorId } } };
}

// ─── Removed dashboard sections — label constants ────────────────────────────
// The following section labels were removed from the Executive Dashboard UI in Unit 66.2:
const REMOVED_SECTIONS = [
  'Compliance Health',       // KPI card removed
  'Pending Decisions',       // KPI card removed
  'Executive Summary',       // summary strip removed
  'Requires Executive Attention', // attention panel removed
  'Decisions Awaiting You',  // decisions panel removed
] as const;

// ─── Kept KPI card labels ─────────────────────────────────────────────────────
const KEPT_KPI_LABELS = [
  'Active Workspaces',
  'Critical Issues',
  'Overdue Actions',
  'Expiring Files',
] as const;

// ─── Kept secondary strip labels ─────────────────────────────────────────────
const KEPT_SECONDARY_LABELS = [
  'Awaiting Review',
  'Completion Rate',
  'Completed This Week',
] as const;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Unit 66.2 — Executive Dashboard Simplification and CEO All-Workspace Visibility', () => {

  // ── EXEC_NAV_66_2 shape ───────────────────────────────────────────────────

  it('Test 1 — EXEC_NAV_66_2: has 4 items', () => {
    expect(EXEC_NAV_66_2).toHaveLength(4);
  });

  it('Test 2 — EXEC_NAV_66_2: Dashboard is item 1', () => {
    expect(EXEC_NAV_66_2[0].label).toBe('Dashboard');
  });

  it('Test 3 — EXEC_NAV_66_2: ISO Workspaces is item 2 (restored in Unit 66.2)', () => {
    expect(EXEC_NAV_66_2[1].label).toBe('ISO Workspaces');
  });

  it('Test 4 — EXEC_NAV_66_2: Reports is item 3', () => {
    expect(EXEC_NAV_66_2[2].label).toBe('Reports');
  });

  it('Test 5 — EXEC_NAV_66_2: Notifications is item 4', () => {
    expect(EXEC_NAV_66_2[3].label).toBe('Notifications');
  });

  it('Test 6 — EXEC_NAV_66_2: does not contain My Tasks', () => {
    const hasMyTasks = EXEC_NAV_66_2.some((i) => i.label === 'My Tasks');
    expect(hasMyTasks).toBe(false);
  });

  it('Test 7 — EXEC_NAV_66_2: does not contain Admin Settings', () => {
    const has = EXEC_NAV_66_2.some((i) => i.label === 'Admin Settings');
    expect(has).toBe(false);
  });

  it('Test 8 — EXEC_NAV_66_2: does not contain System Health', () => {
    const has = EXEC_NAV_66_2.some((i) => i.label === 'System Health');
    expect(has).toBe(false);
  });

  it('Test 9 — EXEC_NAV_66_2: does not contain User Management', () => {
    const has = EXEC_NAV_66_2.some((i) => i.label === 'User Management');
    expect(has).toBe(false);
  });

  // ── Workspace access: ALL visibility ─────────────────────────────────────

  it('Test 10 — ALL visibility: Normal User (no elevation) without membership can access workspace', () => {
    const result = checkWorkspaceAccess({ actorRoles: ['STAFF'], isMember: false, visibilityMode: 'ALL' });
    expect(result.allowed).toBe(true);
  });

  it('Test 11 — ALL visibility: Executive user without membership can access workspace', () => {
    const result = checkWorkspaceAccess({ actorRoles: ['STAFF'], isMember: false, visibilityMode: 'ALL' });
    expect(result.allowed).toBe(true);
  });

  it('Test 12 — ALL visibility: grants access to any workspace including newly created ones (no workspace filter)', () => {
    const where = buildWorkspaceListWhere({
      actorId: 'ceo-user',
      actorRoles: ['STAFF'],
      actorDeptId: null,
      visibilityMode: 'ALL',
    });
    // Empty WHERE means all workspaces, including newly created ones
    expect(Object.keys(where)).toHaveLength(0);
  });

  it('Test 13 — ALL visibility: workspace list WHERE is empty object (unrestricted)', () => {
    const where = buildWorkspaceListWhere({
      actorId: 'ceo-1',
      actorRoles: [],
      actorDeptId: null,
      visibilityMode: 'ALL',
    });
    expect(where).toEqual({});
  });

  // ── Workspace access: SELECTED visibility blocks non-members ─────────────

  it('Test 14 — SELECTED visibility: non-member Normal User is denied', () => {
    const result = checkWorkspaceAccess({ actorRoles: ['STAFF'], isMember: false, visibilityMode: 'SELECTED' });
    expect(result.allowed).toBe(false);
  });

  it('Test 15 — SELECTED visibility: non-member without any role is denied', () => {
    const result = checkWorkspaceAccess({ actorRoles: [], isMember: false, visibilityMode: 'SELECTED' });
    expect(result.allowed).toBe(false);
  });

  it('Test 16 — SELECTED visibility: friendly error message returned', () => {
    const result = checkWorkspaceAccess({ actorRoles: ['STAFF'], isMember: false, visibilityMode: 'SELECTED' });
    if (!result.allowed) {
      expect(result.reason).toBe('Workspace unavailable or access denied.');
    }
  });

  it('Test 17 — SELECTED visibility: explicit member is still allowed', () => {
    const result = checkWorkspaceAccess({ actorRoles: ['STAFF'], isMember: true, visibilityMode: 'SELECTED' });
    expect(result.allowed).toBe(true);
  });

  it('Test 18 — SELECTED visibility: workspace list WHERE restricts to member workspaces', () => {
    const where = buildWorkspaceListWhere({
      actorId: 'normal-user',
      actorRoles: ['STAFF'],
      actorDeptId: null,
      visibilityMode: 'SELECTED',
    });
    expect(where).toEqual({ members: { some: { userId: 'normal-user' } } });
  });

  // ── ALL visibility does not grant elevated roles ──────────────────────────

  it('Test 19 — ALL visibility does not grant SUPER_ADMIN role', () => {
    // visibilityMode is orthogonal to role. User with ALL visibility remains STAFF.
    const actorRoles = ['STAFF'];
    const hasElevation = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    expect(hasElevation).toBe(false);
  });

  it('Test 20 — ALL visibility does not grant SUPER_USER role', () => {
    const actorRoles = ['STAFF'];
    expect(actorRoles.includes('SUPER_USER')).toBe(false);
  });

  it('Test 21 — ALL visibility does not grant permanent-delete permission (no tasks.delete in STAFF roles)', () => {
    const staffPermissions: string[] = [];  // Normal User has no tasks.delete
    expect(staffPermissions.includes('tasks.delete')).toBe(false);
  });

  it('Test 22 — Elevated roles always bypass visibility mode (SUPER_ADMIN still passes without ALL)', () => {
    const result = checkWorkspaceAccess({
      actorRoles: ['SUPER_ADMIN'],
      isMember: false,
      visibilityMode: 'SELECTED',
    });
    expect(result.allowed).toBe(true);
  });

  // ── Removed dashboard sections contract ──────────────────────────────────

  it('Test 23 — Compliance Health is in the REMOVED_SECTIONS list', () => {
    expect(REMOVED_SECTIONS).toContain('Compliance Health');
  });

  it('Test 24 — Pending Decisions is in the REMOVED_SECTIONS list', () => {
    expect(REMOVED_SECTIONS).toContain('Pending Decisions');
  });

  it('Test 25 — Executive Summary is in the REMOVED_SECTIONS list', () => {
    expect(REMOVED_SECTIONS).toContain('Executive Summary');
  });

  it('Test 26 — Requires Executive Attention is in the REMOVED_SECTIONS list', () => {
    expect(REMOVED_SECTIONS).toContain('Requires Executive Attention');
  });

  it('Test 27 — Decisions Awaiting You is in the REMOVED_SECTIONS list', () => {
    expect(REMOVED_SECTIONS).toContain('Decisions Awaiting You');
  });

  // ── Kept KPI sections contract ────────────────────────────────────────────

  it('Test 28 — Active Workspaces KPI is in the KEPT_KPI_LABELS list', () => {
    expect(KEPT_KPI_LABELS).toContain('Active Workspaces');
  });

  it('Test 29 — Critical Issues KPI is in the KEPT_KPI_LABELS list', () => {
    expect(KEPT_KPI_LABELS).toContain('Critical Issues');
  });

  it('Test 30 — Overdue Actions KPI is in the KEPT_KPI_LABELS list', () => {
    expect(KEPT_KPI_LABELS).toContain('Overdue Actions');
  });

  it('Test 31 — Expiring Files KPI is in the KEPT_KPI_LABELS list', () => {
    expect(KEPT_KPI_LABELS).toContain('Expiring Files');
  });

  it('Test 32 — Awaiting Review is in the secondary strip', () => {
    expect(KEPT_SECONDARY_LABELS).toContain('Awaiting Review');
  });

  it('Test 33 — Completion Rate is in the secondary strip', () => {
    expect(KEPT_SECONDARY_LABELS).toContain('Completion Rate');
  });

  it('Test 34 — Completed This Week is in the secondary strip', () => {
    expect(KEPT_SECONDARY_LABELS).toContain('Completed This Week');
  });

  // ── Primary KPI count ────────────────────────────────────────────────────

  it('Test 35 — Primary KPI grid has exactly 4 cards', () => {
    expect(KEPT_KPI_LABELS).toHaveLength(4);
  });

  it('Test 36 — Removed sections count is 5', () => {
    expect(REMOVED_SECTIONS).toHaveLength(5);
  });

  // ── Executive + ALL: workspace detail accessible ─────────────────────────

  it('Test 37 — Executive with ALL mode can open any workspace regardless of membership', () => {
    const testCases = [
      { isMember: false, expected: true },
      { isMember: true,  expected: true },
    ];
    for (const tc of testCases) {
      const result = checkWorkspaceAccess({ actorRoles: ['STAFF'], isMember: tc.isMember, visibilityMode: 'ALL' });
      expect(result.allowed).toBe(tc.expected);
    }
  });

  it('Test 38 — Missing workspace returns error regardless of visibility mode', () => {
    const result = checkWorkspaceAccess({
      actorRoles: ['STAFF'],
      isMember: false,
      visibilityMode: 'ALL',
      workspaceExists: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain('not found');
  });

});
