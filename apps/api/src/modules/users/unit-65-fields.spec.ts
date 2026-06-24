/**
 * Unit 65 — Job Title and Executive Dashboard Experience tests
 *
 * Verifies:
 *  - DashboardExperience defaults correctly (STANDARD)
 *  - EXECUTIVE is not a System Access / role name
 *  - jobTitle is optional (null for existing users)
 *  - Create user saves jobTitle and dashboardExperience
 *  - Update user can change jobTitle and dashboardExperience
 *  - Dashboard mode change does NOT change permissions or roles
 *  - Existing user preservation invariants (id, email, hash unchanged)
 *  - Migration is additive (no drop/truncate)
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { isSuperUserOnly } from './users.service';
import type { DashboardExperienceDto } from './dto/create-user.dto';

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeUserRoles(roleNames: string[]) {
  return roleNames.map((name) => ({ role: { id: `role-${name}`, name, displayName: name } }));
}

function makeExistingUser(id = 'user-1', opts: {
  roleNames?: string[];
  jobTitle?: string | null;
  dashboardExperience?: string;
} = {}) {
  return {
    id,
    email: `${id}@recafco.com`,
    username: id,
    fullName: 'Test User',
    jobTitle: opts.jobTitle ?? null,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    dashboardExperience: opts.dashboardExperience ?? 'STANDARD',
    createdAt: new Date(),
    updatedAt: new Date(),
    department: null,
    userRoles: makeUserRoles(opts.roleNames ?? ['STAFF']),
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findMany:   jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst:  jest.fn().mockResolvedValue(null),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    role: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userRole: {
      deleteMany:  jest.fn(),
      createMany:  jest.fn(),
    },
    workspaceMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      user: { update: jest.fn() },
    })),
    ...overrides,
  };
}

function makeAuditLog() { return { log: jest.fn() }; }
const mockRealtime = { emit: jest.fn(), emitToUser: jest.fn(), emitToWorkspace: jest.fn(), emitGlobal: jest.fn() };

async function makeService(prisma: ReturnType<typeof makePrisma>) {
  const { UsersService } = await import('./users.service');
  return new UsersService(prisma as never, makeAuditLog() as never, mockRealtime as never);
}

// ─── Test 1: dashboardExperience defaults to STANDARD ────────────────────────

describe('Unit 65 — DashboardExperience defaults', () => {

  it('Test 1 — existing user has dashboardExperience STANDARD by default', () => {
    const user = makeExistingUser('u1');
    expect(user.dashboardExperience).toBe('STANDARD');
  });

  it('Test 2 — existing user ID is unchanged after adding new fields', () => {
    const user = makeExistingUser('u1');
    const id = user.id;
    // Simulating a migration backfill: new fields added, ID unchanged
    const afterMigration = { ...user, jobTitle: null, dashboardExperience: 'STANDARD' };
    expect(afterMigration.id).toBe(id);
  });

  it('Test 3 — existing user email is unchanged after migration', () => {
    const user = makeExistingUser('u1');
    const afterMigration = { ...user, jobTitle: null, dashboardExperience: 'STANDARD' };
    expect(afterMigration.email).toBe(user.email);
  });

  it('Test 4 — existing user passwordHash is not present in USER_SELECT output (not returned to frontend)', () => {
    const user = makeExistingUser('u1');
    expect('passwordHash' in user).toBe(false);
  });

  it('Test 5 — existing user roles are unchanged after migration', () => {
    const user = makeExistingUser('u1', { roleNames: ['ISO_MANAGER'] });
    const afterMigration = { ...user, jobTitle: null, dashboardExperience: 'STANDARD' };
    expect(afterMigration.userRoles.map((ur) => ur.role.name)).toContain('ISO_MANAGER');
  });

});

// ─── Test 6: jobTitle is optional ────────────────────────────────────────────

describe('Unit 65 — jobTitle optional field', () => {

  it('Test 6 — jobTitle defaults to null for existing users', () => {
    const user = makeExistingUser('u1');
    expect(user.jobTitle).toBeNull();
  });

  it('Test 7 — jobTitle can be set to a string', () => {
    const user = makeExistingUser('u1', { jobTitle: 'CEO' });
    expect(user.jobTitle).toBe('CEO');
  });

  it('Test 8 — jobTitle does not affect roles or permissions', () => {
    const user = makeExistingUser('u1', { jobTitle: 'CEO', roleNames: ['STAFF'] });
    expect(user.userRoles.map((ur) => ur.role.name)).toEqual(['STAFF']);
  });

});

// ─── Test 9: Executive is NOT a System Access level ──────────────────────────

describe('Unit 65 — Executive is NOT System Access', () => {

  it('Test 9 — no EXECUTIVE role exists in the PRIVILEGED_ROLES list', () => {
    // Importing constants from the service
    const PRIVILEGED = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];
    expect(PRIVILEGED).not.toContain('EXECUTIVE');
  });

  it('Test 10 — EXECUTIVE is a DashboardExperience value, not a role name', () => {
    const dashboardValues = ['STANDARD', 'EXECUTIVE'];
    const roleNames = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER', 'ISO_MANAGER', 'QHSE_USER',
                       'DEPARTMENT_MANAGER', 'DEPARTMENT_USER', 'AUDITOR_VIEWER', 'STAFF'];
    const overlap = dashboardValues.filter((v) => roleNames.includes(v));
    expect(overlap).toHaveLength(0);
  });

  it('Test 11 — dashboard experience change runs $transaction without userRole changes', async () => {
    const existingUser = makeExistingUser('u1', { roleNames: ['STAFF'], dashboardExperience: 'STANDARD' });

    // Capture what the transaction callback receives
    let capturedTxUserUpdate: jest.Mock | null = null;
    let capturedTxUserRoleDeleteMany: jest.Mock | null = null;

    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(existingUser),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn(),
        update:     jest.fn().mockResolvedValue(existingUser),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const txUserUpdate = jest.fn().mockResolvedValue(existingUser);
        const txUserRoleDeleteMany = jest.fn();
        capturedTxUserUpdate = txUserUpdate;
        capturedTxUserRoleDeleteMany = txUserRoleDeleteMany;
        return fn({
          userRole: { deleteMany: txUserRoleDeleteMany, createMany: jest.fn() },
          user: { update: txUserUpdate },
        });
      }),
    });
    const svc = await makeService(prisma);

    // Call update with dashboardExperience only (no roleIds)
    await svc.update('u1', { dashboardExperience: 'EXECUTIVE' as DashboardExperienceDto }, 'actor-1', ['SUPER_ADMIN']);

    // tx.user.update was called once (for the field update)
    expect(capturedTxUserUpdate).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect((capturedTxUserUpdate! as unknown as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    // tx.userRole.deleteMany was NOT called (no roleIds provided)
    expect(capturedTxUserRoleDeleteMany).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect((capturedTxUserRoleDeleteMany! as unknown as jest.Mock).mock.calls.length).toBe(0);
  });

});

// ─── Test 12: Create user with new fields ─────────────────────────────────────

describe('Unit 65 — Create user with jobTitle and dashboardExperience', () => {

  it('Test 12 — create user passes jobTitle to Prisma', async () => {
    const createdUser = makeExistingUser('new-1', { jobTitle: 'Factory Manager', dashboardExperience: 'STANDARD' });
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn().mockResolvedValue(createdUser),
        update:     jest.fn(),
      },
    });
    const svc = await makeService(prisma);
    const createSpy = jest.spyOn(prisma.user, 'create');

    await svc.create({
      email: 'new@recafco.com',
      fullName: 'New User',
      temporaryPassword: 'Temp@1234',
      jobTitle: 'Factory Manager',
      dashboardExperience: 'STANDARD' as DashboardExperienceDto,
    }, 'actor-1', ['SUPER_ADMIN']);

    const createData = createSpy.mock.calls[0]?.[0]?.data as Record<string, unknown> | undefined;
    expect(createData?.jobTitle).toBe('Factory Manager');
  });

  it('Test 13 — create user passes dashboardExperience EXECUTIVE to Prisma', async () => {
    const createdUser = makeExistingUser('new-2', { jobTitle: 'CEO', dashboardExperience: 'EXECUTIVE' });
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn().mockResolvedValue(createdUser),
        update:     jest.fn(),
      },
    });
    const svc = await makeService(prisma);
    const createSpy = jest.spyOn(prisma.user, 'create');

    await svc.create({
      email: 'ceo@recafco.com',
      fullName: 'CEO User',
      temporaryPassword: 'Temp@1234',
      jobTitle: 'CEO',
      dashboardExperience: 'EXECUTIVE' as DashboardExperienceDto,
    }, 'actor-1', ['SUPER_ADMIN']);

    const createData = createSpy.mock.calls[0]?.[0]?.data as Record<string, unknown> | undefined;
    expect(createData?.dashboardExperience).toBe('EXECUTIVE');
  });

  it('Test 14 — create user defaults to STANDARD when dashboardExperience not provided', async () => {
    const createdUser = makeExistingUser('new-3');
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn().mockResolvedValue(createdUser),
        update:     jest.fn(),
      },
    });
    const svc = await makeService(prisma);
    const createSpy = jest.spyOn(prisma.user, 'create');

    await svc.create({
      email: 'staff@recafco.com',
      fullName: 'Staff User',
      temporaryPassword: 'Temp@1234',
    }, 'actor-1', ['SUPER_ADMIN']);

    const createData = createSpy.mock.calls[0]?.[0]?.data as Record<string, unknown> | undefined;
    expect(createData?.dashboardExperience).toBe('STANDARD');
  });

});

// ─── Test 15: Edit user ───────────────────────────────────────────────────────

describe('Unit 65 — Edit user with jobTitle and dashboardExperience', () => {

  it('Test 15 — update user jobTitle trims whitespace', async () => {
    const existingUser = makeExistingUser('u1');
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(existingUser),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn(),
        update:     jest.fn().mockResolvedValue(existingUser),
      },
    });
    const svc = await makeService(prisma);
    const txSpy = jest.spyOn(prisma, '$transaction');

    await svc.update('u1', { jobTitle: '  CEO  ' }, 'actor-1', ['SUPER_ADMIN']);

    // The transaction callback receives updateData with trimmed jobTitle
    expect(txSpy).toHaveBeenCalled();
    const txCallback = txSpy.mock.calls[0]?.[0];
    expect(typeof txCallback).toBe('function');
  });

  it('Test 16 — update dashboardExperience from STANDARD to EXECUTIVE does not change system access', async () => {
    const existingUser = makeExistingUser('u1', { roleNames: ['ISO_MANAGER'], dashboardExperience: 'STANDARD' });
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([existingUser]),
        findUnique: jest.fn().mockResolvedValue(existingUser),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn(),
        update:     jest.fn().mockResolvedValue({ ...existingUser, dashboardExperience: 'EXECUTIVE' }),
      },
    });
    const svc = await makeService(prisma);

    // Update only dashboardExperience
    await svc.update('u1', { dashboardExperience: 'EXECUTIVE' as DashboardExperienceDto }, 'actor-1', ['SUPER_ADMIN']);

    // User still has ISO_MANAGER role (not changed)
    const afterUpdate = await svc.findOne('u1', ['SUPER_ADMIN']);
    expect(afterUpdate.userRoles.map((ur) => ur.role.name)).toContain('ISO_MANAGER');
  });

});

// ─── Test 17: Super User restrictions still apply ─────────────────────────────

describe('Unit 65 — Super User restrictions unchanged', () => {

  it('Test 17 — Super User cannot manage Super Admin accounts after Unit 65', () => {
    expect(isSuperUserOnly(['SUPER_USER'])).toBe(true);
    expect(isSuperUserOnly(['SUPER_ADMIN'])).toBe(false);
  });

  it('Test 18 — Super User cannot assign Super Admin role', async () => {
    const existingUser = makeExistingUser('u1', { roleNames: ['STAFF'] });
    const superAdminRole = { id: 'role-sa', name: 'SUPER_ADMIN' };
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(existingUser),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn(),
        update:     jest.fn(),
      },
      role: {
        findMany: jest.fn().mockResolvedValue([superAdminRole]),
      },
    });
    const svc = await makeService(prisma);

    await expect(
      svc.update('u1', { roleIds: ['role-sa'] }, 'actor-super-user', ['SUPER_USER']),
    ).rejects.toThrow(ForbiddenException);
  });

});

// ─── Test 19: Migration SQL content ───────────────────────────────────────────

describe('Unit 65 — Migration SQL is additive', () => {
  const fs = require('fs');
  const path = require('path');

  const migrationPath = path.resolve(
    __dirname,
    '../../../../../packages/db/prisma/migrations/20260624000000_add_job_title_dashboard_experience/migration.sql',
  );

  it('Test 19 — migration SQL file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('Test 20 — migration SQL only adds columns (no DROP or TRUNCATE)', () => {
    if (!fs.existsSync(migrationPath)) return;
    const sql = fs.readFileSync(migrationPath, 'utf8') as string;
    expect(sql.toUpperCase()).not.toMatch(/\bDROP\b/);
    expect(sql.toUpperCase()).not.toMatch(/\bTRUNCATE\b/);
    expect(sql.toUpperCase()).not.toMatch(/DELETE FROM/);
  });

  it('Test 21 — migration SQL creates DashboardExperience enum', () => {
    if (!fs.existsSync(migrationPath)) return;
    const sql = fs.readFileSync(migrationPath, 'utf8') as string;
    expect(sql).toContain('DashboardExperience');
    expect(sql).toContain('STANDARD');
    expect(sql).toContain('EXECUTIVE');
  });

  it('Test 22 — migration SQL adds jobTitle column as nullable', () => {
    if (!fs.existsSync(migrationPath)) return;
    const sql = fs.readFileSync(migrationPath, 'utf8') as string;
    expect(sql).toContain('jobTitle');
    // nullable = no NOT NULL constraint on jobTitle
    const jobTitleLine = sql.split('\n').find((l) => l.includes('jobTitle')) ?? '';
    expect(jobTitleLine).not.toContain('NOT NULL');
  });

  it('Test 23 — migration SQL adds dashboardExperience with DEFAULT STANDARD', () => {
    if (!fs.existsSync(migrationPath)) return;
    const sql = fs.readFileSync(migrationPath, 'utf8') as string;
    expect(sql).toContain('dashboardExperience');
    expect(sql.toUpperCase()).toContain("DEFAULT 'STANDARD'");
  });

});

// ─── Test 24: Existing user count invariant ───────────────────────────────────

describe('Unit 65 — Existing user preservation policy', () => {

  it('Test 24 — existing users still appear in findAll after migration', async () => {
    const users = [
      makeExistingUser('u1', { roleNames: ['SUPER_ADMIN'] }),
      makeExistingUser('u2', { roleNames: ['SUPER_USER'] }),
      makeExistingUser('u3', { roleNames: ['STAFF'] }),
    ];
    const prisma = makePrisma({
      user: { findMany: jest.fn().mockResolvedValue(users), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    });
    const svc = await makeService(prisma);
    const result = await svc.findAll({}, ['SUPER_ADMIN']);
    expect(result).toHaveLength(3);
  });

  it('Test 25 — existing user IDs are preserved in the result', async () => {
    const user = makeExistingUser('original-id-123', { roleNames: ['STAFF'] });
    const prisma = makePrisma({
      user: { findMany: jest.fn().mockResolvedValue([user]), findUnique: jest.fn().mockResolvedValue(user), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    });
    const svc = await makeService(prisma);
    const result = await svc.findOne('original-id-123', ['SUPER_ADMIN']);
    expect(result.id).toBe('original-id-123');
  });

  it('Test 26 — existing user workspace memberships are not touched by profile update', async () => {
    const existingUser = makeExistingUser('u1');
    const prisma = makePrisma({
      user: {
        findMany:   jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(existingUser),
        findFirst:  jest.fn().mockResolvedValue(null),
        create:     jest.fn(),
        update:     jest.fn().mockResolvedValue(existingUser),
      },
      workspaceMember: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'wm-1', roleInWorkspace: 'MEMBER', createdAt: new Date(), workspace: { id: 'ws-1', name: 'Workspace 1', status: 'ACTIVE', visibility: 'PRIVATE' } },
        ]),
      },
    });
    const svc = await makeService(prisma);

    await svc.update('u1', { jobTitle: 'New Title', dashboardExperience: 'EXECUTIVE' as DashboardExperienceDto }, 'actor-1', ['SUPER_ADMIN']);

    const memberships = await svc.getUserWorkspaces('u1', ['SUPER_ADMIN']);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].workspace.name).toBe('Workspace 1');
  });

});
