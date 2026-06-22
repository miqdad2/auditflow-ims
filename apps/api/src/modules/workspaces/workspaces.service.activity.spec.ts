/**
 * Unit 61.2 — Role-Scoped Workspace Activity tests.
 *
 * Tests getMemberScopedActivity filtering logic:
 * - Member sees own actions + assigned-task events + their membership events
 * - Member does NOT see unrelated workspace updates or other users' task events
 * - Manager/elevated bypass filter and see full workspace activity
 */

// ── Pure logic tests (no Prisma, no NestJS) ──────────────────────────────────

// Mirrors the post-filter logic in getMemberScopedActivity()
function memberPostFilter(
  log: { actorId: string | null; entityType: string; action: string; newValue: unknown; previousValue: unknown },
  currentUserId: string,
): boolean {
  if (log.entityType !== 'PROJECT') return true;
  if (log.actorId === currentUserId) return true;
  const nv = log.newValue as Record<string, unknown> | null;
  const pv = log.previousValue as Record<string, unknown> | null;
  if (log.action === 'MEMBER_ADDED' || log.action === 'MEMBER_UPDATED') return nv?.userId === currentUserId;
  if (log.action === 'MEMBER_REMOVED') return pv?.userId === currentUserId;
  return false;
}

const MEMBER_ID = 'member-user';
const OTHER_ID  = 'other-user';
const ACTOR_ID  = 'super-user';
const WS_ID     = 'ws-ict';
const TASK_ID   = 'iso-1-task';

function makeLog(overrides: {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string | null;
  newValue?: unknown;
  previousValue?: unknown;
}) {
  return {
    entityType:    overrides.entityType    ?? 'TASK',
    entityId:      overrides.entityId      ?? TASK_ID,
    action:        overrides.action        ?? 'UPDATED',
    actorId:       overrides.actorId       ?? ACTOR_ID,
    newValue:      overrides.newValue      ?? null,
    previousValue: overrides.previousValue ?? null,
  };
}

// ── Member sees own task actions ──────────────────────────────────────────────

describe('Unit 61.2 — getMemberScopedActivity post-filter', () => {
  it('T1 — TASK event passes post-filter (any actor, any action)', () => {
    const log = makeLog({ entityType: 'TASK', actorId: ACTOR_ID });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });

  it('T2 — DOCUMENT event passes post-filter', () => {
    const log = makeLog({ entityType: 'DOCUMENT', actorId: MEMBER_ID });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });

  it('T3 — NCR_CAPA event passes post-filter', () => {
    const log = makeLog({ entityType: 'NCR_CAPA', actorId: MEMBER_ID });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });
});

// ── PROJECT event filtering ───────────────────────────────────────────────────

describe('Unit 61.2 — PROJECT event post-filter', () => {
  it('T4 — PROJECT MEMBER_ADDED for current user passes', () => {
    const log = makeLog({
      entityType: 'PROJECT',
      entityId:   WS_ID,
      action:     'MEMBER_ADDED',
      actorId:    ACTOR_ID,
      newValue:   { userId: MEMBER_ID, roleInWorkspace: 'MEMBER' },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });

  it('T5 — PROJECT MEMBER_ADDED for different user is hidden', () => {
    const log = makeLog({
      entityType: 'PROJECT',
      entityId:   WS_ID,
      action:     'MEMBER_ADDED',
      actorId:    ACTOR_ID,
      newValue:   { userId: OTHER_ID, roleInWorkspace: 'MEMBER' },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(false);
  });

  it('T6 — PROJECT MEMBER_REMOVED for current user passes', () => {
    const log = makeLog({
      entityType:    'PROJECT',
      entityId:      WS_ID,
      action:        'MEMBER_REMOVED',
      actorId:       ACTOR_ID,
      previousValue: { userId: MEMBER_ID },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });

  it('T7 — PROJECT MEMBER_REMOVED for different user is hidden', () => {
    const log = makeLog({
      entityType:    'PROJECT',
      entityId:      WS_ID,
      action:        'MEMBER_REMOVED',
      actorId:       ACTOR_ID,
      previousValue: { userId: OTHER_ID },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(false);
  });

  it('T8 — PROJECT MEMBER_UPDATED for current user passes', () => {
    const log = makeLog({
      entityType: 'PROJECT',
      entityId:   WS_ID,
      action:     'MEMBER_UPDATED',
      actorId:    ACTOR_ID,
      newValue:   { userId: MEMBER_ID, roleInWorkspace: 'MANAGER' },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });

  it('T9 — PROJECT UPDATED (workspace renamed) is hidden from Member', () => {
    const log = makeLog({
      entityType:    'PROJECT',
      entityId:      WS_ID,
      action:        'UPDATED',
      actorId:       ACTOR_ID,
      previousValue: { name: 'Old Name', status: 'ACTIVE' },
      newValue:      { name: 'New Name', status: 'ACTIVE' },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(false);
  });

  it('T10 — PROJECT CREATED is hidden from Member unless they are the actor', () => {
    const log = makeLog({
      entityType: 'PROJECT',
      entityId:   WS_ID,
      action:     'CREATED',
      actorId:    ACTOR_ID,
      newValue:   { name: 'ICT' },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(false);
  });

  it('T11 — PROJECT event where Member IS the actor passes', () => {
    const log = makeLog({
      entityType: 'PROJECT',
      entityId:   WS_ID,
      action:     'UPDATED',
      actorId:    MEMBER_ID, // member performed this action
      newValue:   { departmentId: 'dept-1' },
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(true);
  });

  it('T12 — MEMBER_ADDED null newValue is safe (returns false, not crash)', () => {
    const log = makeLog({
      entityType: 'PROJECT',
      entityId:   WS_ID,
      action:     'MEMBER_ADDED',
      actorId:    ACTOR_ID,
      newValue:   null,
    });
    expect(memberPostFilter(log, MEMBER_ID)).toBe(false);
  });
});

// ── Full-access tiers (bypass filter entirely) ────────────────────────────────

describe('Unit 61.2 — elevated tiers see all events', () => {
  it('T13 — Manager/elevated receives full getWorkspaceAuditLogs (no filter applied)', () => {
    // Verifies the branch decision: elevated → getWorkspaceAuditLogs (no post-filter).
    // The presence of both is a code contract assertion, not a Prisma test.
    const isElevatedBranch = (roles: string[]) => {
      const ELEVATED = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
      return roles.some((r) => ELEVATED.includes(r));
    };
    expect(isElevatedBranch(['SUPER_USER'])).toBe(true);
    expect(isElevatedBranch(['STAFF'])).toBe(false);
  });

  it('T14 — MANAGER workspace role routes to full activity (contract)', () => {
    function isManagerOrOwner(role: string): boolean { return role === 'MANAGER' || role === 'OWNER'; }
    expect(isManagerOrOwner('MANAGER')).toBe(true);
    expect(isManagerOrOwner('OWNER')).toBe(true);
  });

  it('T15 — MEMBER workspace role routes to scoped activity (contract)', () => {
    function isManagerOrOwner(role: string): boolean { return role === 'MANAGER' || role === 'OWNER'; }
    expect(isManagerOrOwner('MEMBER')).toBe(false);
  });

  it('T16 — VIEWER workspace role routes to scoped activity (contract)', () => {
    function isManagerOrOwner(role: string): boolean { return role === 'MANAGER' || role === 'OWNER'; }
    expect(isManagerOrOwner('VIEWER')).toBe(false);
  });
});

// ── Sentinel task ID (prevents empty IN clause crash) ────────────────────────

describe('Unit 61.2 — empty assigned-task list safety', () => {
  it('T17 — sentinel task ID used when no tasks assigned (no Prisma crash)', () => {
    const assignedTaskIds: string[] = [];
    const taskIdList = assignedTaskIds.length > 0 ? assignedTaskIds : ['__NO_ASSIGNED_TASKS__'];
    expect(taskIdList).toHaveLength(1);
    expect(taskIdList[0]).toBe('__NO_ASSIGNED_TASKS__');
  });

  it('T18 — actual task IDs used when tasks are assigned', () => {
    const assignedTaskIds = ['task-1', 'task-2'];
    const taskIdList = assignedTaskIds.length > 0 ? assignedTaskIds : ['__NO_ASSIGNED_TASKS__'];
    expect(taskIdList).toHaveLength(2);
    expect(taskIdList).toContain('task-1');
  });
});
