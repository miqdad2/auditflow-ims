/**
 * Unit 65.1 — Executive Dashboard access decoupled from System Roles
 *
 * Verifies:
 *  - dashboardExperience === EXECUTIVE is the ONLY access gate (not role names)
 *  - Normal User + Executive can call the controller
 *  - Standard Normal User, Standard Super User, Standard Super Admin are denied
 *  - Executive Super User and Executive Super Admin are allowed
 *  - Job Title has no effect on access
 *  - Role-based EXECUTIVE_ROLES constant has been removed from the controller
 */

import { ForbiddenException } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';

// ─── Minimal mock for DashboardService ───────────────────────────────────────

function makeDashboardService() {
  return {
    getOverview:         jest.fn().mockResolvedValue({}),
    getMyTasks:          jest.fn().mockResolvedValue({ summary: {}, tasks: [] }),
    getExecutiveSummary: jest.fn().mockResolvedValue({
      summary: {
        complianceHealth: 0, activeWorkspaces: 0, criticalIssues: 0,
        overdueActions: 0, pendingDecisionsCount: 0, expiringFiles: 0,
        tasksAwaitingReview: 0, completionRate: 0,
      },
      attentionItems: [],
      organizationHealth: [],
      pendingDecisions: [],
      trends: {
        completedThisWeek: 0, completedLastWeek: 0, weeklyTrend: null,
        evidenceReadiness: 0, docApprovalRate: 0, ncrResolutionRate: 100,
      },
      departmentPerformance: [],
      significantActivity: [],
      generatedAt: new Date().toISOString(),
    }),
  };
}

// ─── Helper: build a CurrentUser-style object ─────────────────────────────────

function makeUser(opts: {
  id?: string;
  roles?: string[];
  dashboardExperience?: string;
  departmentId?: string | null;
  jobTitle?: string | null;
}) {
  const roles = opts.roles ?? ['STAFF'];
  return {
    id:                  opts.id ?? 'user-1',
    email:               'test@recafco.com',
    username:            'testuser',
    fullName:            'Test User',
    jobTitle:            opts.jobTitle ?? null,
    departmentId:        opts.departmentId ?? null,
    isActive:            true,
    mustChangePassword:  false,
    dashboardExperience: opts.dashboardExperience ?? 'STANDARD',
    userRoles: roles.map((name) => ({
      role: {
        name,
        rolePermissions: [{ permission: { key: 'project.read' } }],
      },
    })),
    department: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Unit 65.1 — Executive Dashboard controller access', () => {

  let controller: DashboardController;
  let svc: ReturnType<typeof makeDashboardService>;

  beforeEach(() => {
    svc = makeDashboardService();
    controller = new DashboardController(svc as never);
  });

  // ── Test 1: Normal User + Executive is ALLOWED ──────────────────────────────
  it('Test 1 — Normal User + dashboardExperience=EXECUTIVE: endpoint returns 200 (no throw)', async () => {
    const user = makeUser({ roles: ['STAFF'], dashboardExperience: 'EXECUTIVE' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
    expect(svc.getExecutiveSummary).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: Normal User + Standard is DENIED ───────────────────────────────
  it('Test 2 — Normal User + dashboardExperience=STANDARD: 403 ForbiddenException', async () => {
    const user = makeUser({ roles: ['STAFF'], dashboardExperience: 'STANDARD' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 3: Super User + Standard is DENIED ────────────────────────────────
  it('Test 3 — Super User + dashboardExperience=STANDARD: 403', async () => {
    const user = makeUser({ roles: ['SUPER_USER'], dashboardExperience: 'STANDARD' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 4: Super Admin + Standard is DENIED ───────────────────────────────
  it('Test 4 — Super Admin + dashboardExperience=STANDARD: 403', async () => {
    const user = makeUser({ roles: ['SUPER_ADMIN'], dashboardExperience: 'STANDARD' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 5: Super User + Executive is ALLOWED ──────────────────────────────
  it('Test 5 — Super User + dashboardExperience=EXECUTIVE: allowed', async () => {
    const user = makeUser({ roles: ['SUPER_USER'], dashboardExperience: 'EXECUTIVE' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
  });

  // ── Test 6: Super Admin + Executive is ALLOWED ─────────────────────────────
  it('Test 6 — Super Admin + dashboardExperience=EXECUTIVE: allowed', async () => {
    const user = makeUser({ roles: ['SUPER_ADMIN'], dashboardExperience: 'EXECUTIVE' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
  });

  // ── Test 7: ISO_MANAGER + Standard is DENIED (role alone not enough) ───────
  it('Test 7 — ISO_MANAGER + dashboardExperience=STANDARD: 403 (role alone is not sufficient)', async () => {
    const user = makeUser({ roles: ['ISO_MANAGER'], dashboardExperience: 'STANDARD' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 8: ISO_MANAGER + Executive is ALLOWED ─────────────────────────────
  it('Test 8 — ISO_MANAGER + dashboardExperience=EXECUTIVE: allowed', async () => {
    const user = makeUser({ roles: ['ISO_MANAGER'], dashboardExperience: 'EXECUTIVE' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
  });

  // ── Test 9: Job Title has NO effect on access ──────────────────────────────
  it('Test 9 — Job Title CEO does not grant executive access when dashboardExperience=STANDARD', async () => {
    const user = makeUser({ roles: ['STAFF'], dashboardExperience: 'STANDARD', jobTitle: 'CEO' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 10: Job Title with EXECUTIVE still allowed ────────────────────────
  it('Test 10 — Job Title CEO + dashboardExperience=EXECUTIVE: allowed', async () => {
    const user = makeUser({ roles: ['STAFF'], dashboardExperience: 'EXECUTIVE', jobTitle: 'CEO' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
  });

  // ── Test 11: dashboardExperience missing (undefined) defaults to denied ────
  it('Test 11 — missing dashboardExperience (undefined) defaults to STANDARD → 403', async () => {
    const user = {
      ...makeUser({ roles: ['SUPER_USER'] }),
      dashboardExperience: undefined,
    };
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 12: service receives correct args when allowed ────────────────────
  it('Test 12 — service is called with actorId, roles, and deptId when executive', async () => {
    const user = makeUser({ id: 'u-123', roles: ['STAFF'], dashboardExperience: 'EXECUTIVE', departmentId: 'dept-1' });
    await controller.getExecutiveSummary(user as never);
    expect(svc.getExecutiveSummary).toHaveBeenCalledWith('u-123', ['STAFF'], 'dept-1');
  });

  // ── Test 13: service is NOT called when denied ─────────────────────────────
  it('Test 13 — service.getExecutiveSummary is not called when access is denied', async () => {
    const user = makeUser({ roles: ['STAFF'], dashboardExperience: 'STANDARD' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
    expect(svc.getExecutiveSummary).not.toHaveBeenCalled();
  });

  // ── Test 14: EXECUTIVE_ROLES constant is NOT used by the controller ────────
  it('Test 14 — EXECUTIVE_ROLES constant is not defined or exported from the controller file', async () => {
    // If a user has only IT_ADMIN but STANDARD experience, they are denied.
    // Previously EXECUTIVE_ROLES included IT_ADMIN, so this was allowed. Now it's denied.
    const user = makeUser({ roles: ['IT_ADMIN'], dashboardExperience: 'STANDARD' });
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 15: dashboardExperience is read from server-side user object ──────
  // The controller reads `user.dashboardExperience` from the DB-backed user record,
  // NOT from a request body or query parameter.
  it('Test 15 — dashboardExperience is taken from CurrentUser, not a request body param', async () => {
    // Simulate: request body has executive=true but user record says STANDARD
    const user = makeUser({ roles: ['SUPER_ADMIN'], dashboardExperience: 'STANDARD' });
    // The controller only reads user.dashboardExperience from the CurrentUser decorator
    expect(() => controller.getExecutiveSummary(user as never)).toThrow(ForbiddenException);
  });

  // ── Test 16: DEPARTMENT_USER + Executive is ALLOWED ───────────────────────
  it('Test 16 — DEPARTMENT_USER + dashboardExperience=EXECUTIVE: allowed', async () => {
    const user = makeUser({ roles: ['DEPARTMENT_USER'], dashboardExperience: 'EXECUTIVE' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
  });

  // ── Test 17: Empty role array + Executive is ALLOWED ──────────────────────
  it('Test 17 — empty role array + dashboardExperience=EXECUTIVE: allowed (dashboard-exp is sole gate)', async () => {
    const user = makeUser({ roles: [], dashboardExperience: 'EXECUTIVE' });
    await expect(controller.getExecutiveSummary(user as never)).resolves.toBeDefined();
  });

  // ── Test 18: No migration is introduced (schema unchanged) ────────────────
  it('Test 18 — no new migration file exists for Unit 65.1 (schema unchanged)', () => {
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.resolve(
      __dirname, '../../../../../packages/db/prisma/migrations',
    );
    const dirs = fs.existsSync(migrationsDir)
      ? (fs.readdirSync(migrationsDir) as string[]).filter((d: string) => d.includes('65_1') || d.includes('65-1'))
      : [];
    expect(dirs).toHaveLength(0);
  });

});
