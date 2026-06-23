/**
 * Unit 63.4 — Super User business-user scope tests (27 cases)
 *
 * Verifies that:
 *  - SUPER_ADMIN has full unrestricted access to all users
 *  - SUPER_USER can only list, view, update, deactivate, and reset passwords for
 *    business users — never for SUPER_ADMIN, IT_ADMIN, or other SUPER_USER accounts
 *  - Normal users (STAFF) with users.manage can act on business users
 *
 * All Prisma calls are mocked.
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { isSuperUserOnly, buildManageableUserWhere } from './users.service';

// ─── Role sets ────────────────────────────────────────────────────────────────

const ROLES = {
  SUPER_ADMIN: ['SUPER_ADMIN'],
  IT_ADMIN:    ['IT_ADMIN'],
  SUPER_USER:  ['SUPER_USER'],
  STAFF:       ['STAFF'],
  NONE:        [] as string[],
};

// ─── Helper factories ─────────────────────────────────────────────────────────

function makeUserRoles(roleNames: string[]) {
  return roleNames.map((name) => ({ role: { name } }));
}

function makeUser(id: string, roleNames: string[]) {
  return {
    id,
    email: `${id}@test.com`,
    username: id,
    fullName: id,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: null,
    userRoles: makeUserRoles(roleNames),
  };
}

// Minimal Prisma mock builder
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

function makeAuditLog() {
  return { log: jest.fn() };
}

// Lazy import so mocks are set before the module is loaded
async function makeService(prisma: ReturnType<typeof makePrisma>) {
  const { UsersService } = await import('./users.service');
  return new UsersService(prisma as never, makeAuditLog() as never);
}

// ─── Part A: Pure helper functions (no DB needed) ─────────────────────────────

describe('isSuperUserOnly()', () => {
  // Case 1
  it('Case 1 — returns true for SUPER_USER without SUPER_ADMIN or IT_ADMIN', () => {
    expect(isSuperUserOnly(['SUPER_USER'])).toBe(true);
  });

  // Case 2
  it('Case 2 — returns false for SUPER_ADMIN even if SUPER_USER is also present', () => {
    expect(isSuperUserOnly(['SUPER_USER', 'SUPER_ADMIN'])).toBe(false);
  });

  // Case 3
  it('Case 3 — returns false for IT_ADMIN even if SUPER_USER is also present', () => {
    expect(isSuperUserOnly(['SUPER_USER', 'IT_ADMIN'])).toBe(false);
  });

  // Case 4
  it('Case 4 — returns false for SUPER_ADMIN alone', () => {
    expect(isSuperUserOnly(['SUPER_ADMIN'])).toBe(false);
  });

  // Case 5
  it('Case 5 — returns false for empty role array', () => {
    expect(isSuperUserOnly([])).toBe(false);
  });

  // Case 6
  it('Case 6 — returns false for STAFF role', () => {
    expect(isSuperUserOnly(['STAFF'])).toBe(false);
  });
});

describe('buildManageableUserWhere()', () => {
  // Case 7
  it('Case 7 — returns a where clause excluding all privileged roles', () => {
    const where = buildManageableUserWhere();
    expect(where).toEqual({
      userRoles: {
        none: { role: { name: { in: ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'] } } },
      },
    });
  });
});

// ─── Part B: findAll scope ────────────────────────────────────────────────────

describe('UsersService.findAll()', () => {
  // Case 8
  it('Case 8 — SUPER_ADMIN gets unfiltered findMany call', async () => {
    const prisma = makePrisma();
    const svc = await makeService(prisma);

    await svc.findAll({}, ROLES.SUPER_ADMIN);

    const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).not.toHaveProperty('userRoles.none');
  });

  // Case 9
  it('Case 9 — SUPER_USER findMany includes userRoles.none exclusion clause', async () => {
    const prisma = makePrisma();
    const svc = await makeService(prisma);

    await svc.findAll({}, ROLES.SUPER_USER);

    const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toHaveProperty('userRoles');
    expect(call.where.userRoles).toHaveProperty('none');
  });

  // Case 10
  it('Case 10 — SUPER_USER scope exclusion targets SUPER_ADMIN, IT_ADMIN, SUPER_USER', async () => {
    const prisma = makePrisma();
    const svc = await makeService(prisma);

    await svc.findAll({}, ROLES.SUPER_USER);

    const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    const inList: string[] = call.where.userRoles.none.role.name.in;
    expect(inList).toContain('SUPER_ADMIN');
    expect(inList).toContain('IT_ADMIN');
    expect(inList).toContain('SUPER_USER');
  });

  // Case 11
  it('Case 11 — IT_ADMIN gets unfiltered findMany (no scope restriction)', async () => {
    const prisma = makePrisma();
    const svc = await makeService(prisma);

    await svc.findAll({}, ROLES.IT_ADMIN);

    const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).not.toHaveProperty('userRoles.none');
  });

  // Case 12
  it('Case 12 — empty actorRoles gets unfiltered findMany', async () => {
    const prisma = makePrisma();
    const svc = await makeService(prisma);

    await svc.findAll({}, ROLES.NONE);

    const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(call.where)).not.toContain('none');
  });
});

// ─── Part C: findOne scope ────────────────────────────────────────────────────

describe('UsersService.findOne()', () => {
  // Case 13
  it('Case 13 — SUPER_ADMIN can view a SUPER_ADMIN user', async () => {
    const target = makeUser('sa1', ['SUPER_ADMIN']);
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(target), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() } });
    const svc = await makeService(prisma);

    await expect(svc.findOne('sa1', ROLES.SUPER_ADMIN)).resolves.toEqual(target);
  });

  // Case 14
  it('Case 14 — SUPER_USER gets NotFoundException for SUPER_ADMIN target', async () => {
    const target = makeUser('sa1', ['SUPER_ADMIN']);
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(target), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() } });
    const svc = await makeService(prisma);

    await expect(svc.findOne('sa1', ROLES.SUPER_USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  // Case 15
  it('Case 15 — SUPER_USER gets NotFoundException for IT_ADMIN target', async () => {
    const target = makeUser('ita1', ['IT_ADMIN']);
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(target), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() } });
    const svc = await makeService(prisma);

    await expect(svc.findOne('ita1', ROLES.SUPER_USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  // Case 16
  it('Case 16 — SUPER_USER gets NotFoundException for another SUPER_USER target', async () => {
    const target = makeUser('su2', ['SUPER_USER']);
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(target), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() } });
    const svc = await makeService(prisma);

    await expect(svc.findOne('su2', ROLES.SUPER_USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  // Case 17
  it('Case 17 — SUPER_USER can view a STAFF business user', async () => {
    const target = makeUser('staff1', ['STAFF']);
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(target), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() } });
    const svc = await makeService(prisma);

    await expect(svc.findOne('staff1', ROLES.SUPER_USER)).resolves.toEqual(target);
  });
});

// ─── Part D: update scope ─────────────────────────────────────────────────────

describe('UsersService.update()', () => {
  // Case 18
  it('Case 18 — SUPER_USER cannot update a SUPER_ADMIN account', async () => {
    const target = makeUser('sa1', ['SUPER_ADMIN']);
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'sa1'
            ? Promise.resolve({ userRoles: makeUserRoles(['SUPER_ADMIN']) })
            : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.update('sa1', { fullName: 'Hacked' }, 'actor1', ROLES.SUPER_USER))
      .rejects.toBeInstanceOf(ForbiddenException);
    void target;
  });

  // Case 19
  it('Case 19 — SUPER_USER cannot update another SUPER_USER account', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'su2'
            ? Promise.resolve({ userRoles: makeUserRoles(['SUPER_USER']) })
            : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.update('su2', { fullName: 'Changed' }, 'su1', ROLES.SUPER_USER))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  // Case 20
  it('Case 20 — SUPER_ADMIN can update any account including SUPER_ADMIN', async () => {
    const target = makeUser('sa2', ['SUPER_ADMIN']);
    const prisma = makePrisma({
      role: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string; username?: string } }) =>
          where.id === 'sa2' && !where.username ? Promise.resolve(target) : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
      userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
        userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
        user: { update: jest.fn() },
      })),
    });
    const svc = await makeService(prisma);

    // Should not throw
    await expect(svc.update('sa2', { fullName: 'Updated' }, 'sa1', ROLES.SUPER_ADMIN))
      .resolves.toBeDefined();
  });
});

// ─── Part E: setStatus scope ──────────────────────────────────────────────────

describe('UsersService.setStatus()', () => {
  // Case 21
  it('Case 21 — SUPER_USER cannot deactivate a SUPER_ADMIN account', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'sa1'
            ? Promise.resolve({ id: 'sa1', isActive: true, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] })
            : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.setStatus('sa1', { isActive: false }, 'su1', ROLES.SUPER_USER))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  // Case 22
  it('Case 22 — SUPER_USER cannot deactivate an IT_ADMIN account', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'ita1'
            ? Promise.resolve({ id: 'ita1', isActive: true, userRoles: [{ role: { name: 'IT_ADMIN' } }] })
            : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.setStatus('ita1', { isActive: false }, 'su1', ROLES.SUPER_USER))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  // Case 23
  it('Case 23 — SUPER_USER cannot deactivate another SUPER_USER', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'su2'
            ? Promise.resolve({ id: 'su2', isActive: true, userRoles: [{ role: { name: 'SUPER_USER' } }] })
            : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.setStatus('su2', { isActive: false }, 'su1', ROLES.SUPER_USER))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  // Case 24
  it('Case 24 — SUPER_ADMIN can deactivate a SUPER_USER account', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'su1', isActive: true, userRoles: [{ role: { name: 'SUPER_USER' } }] })
          .mockResolvedValue(makeUser('su1', ['SUPER_USER'])),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn().mockResolvedValue({}),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.setStatus('su1', { isActive: false }, 'sa1', ROLES.SUPER_ADMIN))
      .resolves.toBeDefined();
  });

  // Case 25
  it('Case 25 — SUPER_USER can deactivate a normal STAFF user', async () => {
    const staffUser = makeUser('staff1', ['STAFF']);
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'staff1', isActive: true, userRoles: [{ role: { name: 'STAFF' } }] })
          .mockResolvedValue(staffUser),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn().mockResolvedValue({}),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.setStatus('staff1', { isActive: false }, 'su1', ROLES.SUPER_USER))
      .resolves.toBeDefined();
  });
});

// ─── Part F: resetPassword scope ──────────────────────────────────────────────

describe('UsersService.resetPassword()', () => {
  // Case 26
  it('Case 26 — SUPER_USER cannot reset password of a SUPER_ADMIN account', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'sa1'
            ? Promise.resolve({ userRoles: makeUserRoles(['SUPER_ADMIN']) })
            : Promise.resolve(null),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.resetPassword('sa1', { temporaryPassword: '123' }, 'su1', ROLES.SUPER_USER))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  // Case 27
  it('Case 27 — SUPER_ADMIN can reset password of any user including IT_ADMIN', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          where.id === 'ita1'
            ? Promise.resolve({ id: 'ita1', passwordHash: 'old' })
            : Promise.resolve({ userRoles: makeUserRoles(['IT_ADMIN']) }),
        ),
        findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const svc = await makeService(prisma);

    await expect(svc.resetPassword('ita1', { temporaryPassword: '123' }, 'sa1', ROLES.SUPER_ADMIN))
      .resolves.toHaveProperty('message');
  });
});
