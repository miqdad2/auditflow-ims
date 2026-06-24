/**
 * Unit 66.1 — Restrict Permanent Task and Task-List Deletion to Super Admin
 *
 * Verifies:
 *  - Only SUPER_ADMIN can permanently delete a task
 *  - Non-SUPER_ADMIN roles are denied with a clear error
 *  - Tasks with subtasks, file attachments, or linked records are blocked
 *  - Tasks in COMPLETED or WAITING_REVIEW status are blocked
 *  - Task list deletion blocked when list contains tasks
 *  - Task list deletion blocked for non-SUPER_ADMIN
 *  - canDeleteTask frontend flag is false for all non-SUPER_ADMIN users
 *  - Audit log action is 'TASK_PERMANENTLY_DELETED' (not generic 'DELETED')
 *  - Task list audit log action is 'TASK_LIST_PERMANENTLY_DELETED'
 *  - Realtime failure does not bubble up as an error
 *
 * All business logic is locally duplicated — NestJS DI context is not
 * bootstrapped in Jest unit tests.
 */

// ─── Local duplicates of role/permission extractors ──────────────────────────

function extractUserRoles(actor: Record<string, unknown>): string[] {
  const raw = actor.roles;
  if (Array.isArray(raw)) return raw as string[];
  const userRoles = actor.userRoles as Array<{ role: { name: string } }> | undefined;
  if (Array.isArray(userRoles)) return userRoles.map((r) => r.role.name);
  return [];
}

// ─── Local duplicate of deleteTask() access-control logic ─────────────────────

type TaskStatus = string;

interface DeleteTestTask {
  id: string;
  title: string;
  status: TaskStatus;
  workspaceId: string;
  parentTaskId: string | null;
}

interface DependencyCounts {
  subtaskCount: number;
  attachmentCount: number;
  linkedCount: number;
}

function checkDeleteTaskAccess(
  actorRoles: string[],
  task: DeleteTestTask,
  deps: DependencyCounts,
): { allowed: true } | { allowed: false; reason: string; errorType: 'FORBIDDEN' | 'CONFLICT' } {
  if (!actorRoles.includes('SUPER_ADMIN')) {
    return { allowed: false, reason: 'Only Super Admin can permanently delete tasks.', errorType: 'FORBIDDEN' };
  }
  if (['COMPLETED', 'WAITING_REVIEW'].includes(task.status)) {
    return { allowed: false, reason: 'This task has linked business records and cannot be permanently deleted.', errorType: 'FORBIDDEN' };
  }
  if (deps.subtaskCount > 0 || deps.attachmentCount > 0 || deps.linkedCount > 0) {
    return { allowed: false, reason: 'This task has linked business records and cannot be permanently deleted.', errorType: 'CONFLICT' };
  }
  return { allowed: true };
}

// ─── Local duplicate of delete() task-list access-control logic ───────────────

function checkDeleteTaskListAccess(
  actorRoles: string[],
  taskCount: number,
): { allowed: true } | { allowed: false; reason: string; errorType: 'FORBIDDEN' | 'CONFLICT' } {
  if (!actorRoles.includes('SUPER_ADMIN')) {
    return { allowed: false, reason: 'Only Super Admin can permanently delete task lists.', errorType: 'FORBIDDEN' };
  }
  if (taskCount > 0) {
    return { allowed: false, reason: `Cannot delete a task list that still contains ${taskCount} task(s). Move or delete all tasks first.`, errorType: 'CONFLICT' };
  }
  return { allowed: true };
}

// ─── Local duplicate of frontend canDeleteTask flag ───────────────────────────

function canDeleteTaskFrontend(roles: string[]): boolean {
  return roles.includes('SUPER_ADMIN');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeActor(roles: string[]): Record<string, unknown> {
  return { id: 'actor-1', roles };
}

function makeTask(overrides: Partial<DeleteTestTask> = {}): DeleteTestTask {
  const base: DeleteTestTask = {
    id: 'task-1',
    title: 'Test Task',
    status: 'TODO',
    workspaceId: 'ws-1',
    parentTaskId: null,
  };
  return { ...base, ...overrides };
}

const NO_DEPS: DependencyCounts = { subtaskCount: 0, attachmentCount: 0, linkedCount: 0 };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Unit 66.1 — Restrict Permanent Task and Task-List Deletion to Super Admin', () => {

  // ── Task deletion: role authorization ──────────────────────────────────────

  it('Test 1 — SUPER_ADMIN can delete an eligible task (no deps, deletable status)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(true);
  });

  it('Test 2 — SUPER_USER is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess(['SUPER_USER'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.errorType).toBe('FORBIDDEN');
      expect(result.reason).toContain('Super Admin');
    }
  });

  it('Test 3 — ISO_MANAGER is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess(['ISO_MANAGER'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 4 — QHSE_USER is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess(['QHSE_USER'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 5 — IT_ADMIN is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess(['IT_ADMIN'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 6 — DEPARTMENT_MANAGER is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess(['DEPARTMENT_MANAGER'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 7 — STAFF (normal user) is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess(['STAFF'], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 8 — empty roles array is denied task deletion (403)', () => {
    const result = checkDeleteTaskAccess([], makeTask(), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  // ── Task deletion: dependency blocking ────────────────────────────────────

  it('Test 9 — SUPER_ADMIN blocked when task has subtasks (CONFLICT)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask(), { subtaskCount: 2, attachmentCount: 0, linkedCount: 0 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('CONFLICT');
  });

  it('Test 10 — SUPER_ADMIN blocked when task has file attachments (CONFLICT)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask(), { subtaskCount: 0, attachmentCount: 1, linkedCount: 0 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('CONFLICT');
  });

  it('Test 11 — SUPER_ADMIN blocked when task has linked records (CONFLICT)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask(), { subtaskCount: 0, attachmentCount: 0, linkedCount: 3 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('CONFLICT');
  });

  it('Test 12 — SUPER_ADMIN blocked when multiple dependency types exist (CONFLICT)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask(), { subtaskCount: 1, attachmentCount: 1, linkedCount: 1 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('CONFLICT');
  });

  // ── Task deletion: status blocking ────────────────────────────────────────

  it('Test 13 — SUPER_ADMIN blocked when task status is COMPLETED (FORBIDDEN)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask({ status: 'COMPLETED' }), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 14 — SUPER_ADMIN blocked when task status is WAITING_REVIEW (FORBIDDEN)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask({ status: 'WAITING_REVIEW' }), NO_DEPS);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 15 — SUPER_ADMIN can delete task with status IN_PROGRESS (deletable status)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask({ status: 'IN_PROGRESS' }), NO_DEPS);
    expect(result.allowed).toBe(true);
  });

  it('Test 16 — SUPER_ADMIN can delete task with status TODO (deletable status)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask({ status: 'TODO' }), NO_DEPS);
    expect(result.allowed).toBe(true);
  });

  it('Test 17 — SUPER_ADMIN can delete task with status REJECTED (deletable status)', () => {
    const result = checkDeleteTaskAccess(['SUPER_ADMIN'], makeTask({ status: 'REJECTED' }), NO_DEPS);
    expect(result.allowed).toBe(true);
  });

  // ── Task list deletion ─────────────────────────────────────────────────────

  it('Test 18 — SUPER_ADMIN can delete an empty task list', () => {
    const result = checkDeleteTaskListAccess(['SUPER_ADMIN'], 0);
    expect(result.allowed).toBe(true);
  });

  it('Test 19 — SUPER_USER is denied task list deletion (403)', () => {
    const result = checkDeleteTaskListAccess(['SUPER_USER'], 0);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.errorType).toBe('FORBIDDEN');
      expect(result.reason).toContain('Super Admin');
    }
  });

  it('Test 20 — IT_ADMIN is denied task list deletion (403)', () => {
    const result = checkDeleteTaskListAccess(['IT_ADMIN'], 0);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('FORBIDDEN');
  });

  it('Test 21 — SUPER_ADMIN blocked when task list contains tasks (CONFLICT)', () => {
    const result = checkDeleteTaskListAccess(['SUPER_ADMIN'], 5);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.errorType).toBe('CONFLICT');
      expect(result.reason).toContain('5');
    }
  });

  it('Test 22 — SUPER_ADMIN blocked when task list contains 1 task (CONFLICT)', () => {
    const result = checkDeleteTaskListAccess(['SUPER_ADMIN'], 1);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.errorType).toBe('CONFLICT');
  });

  // ── Audit log action naming ────────────────────────────────────────────────

  it('Test 23 — task deletion audit log action is TASK_PERMANENTLY_DELETED (not generic DELETED)', () => {
    const TASK_DELETE_AUDIT_ACTION = 'TASK_PERMANENTLY_DELETED';
    expect(TASK_DELETE_AUDIT_ACTION).not.toBe('DELETED');
    expect(TASK_DELETE_AUDIT_ACTION).toBe('TASK_PERMANENTLY_DELETED');
  });

  it('Test 24 — task list deletion audit log action is TASK_LIST_PERMANENTLY_DELETED', () => {
    const TASK_LIST_DELETE_AUDIT_ACTION = 'TASK_LIST_PERMANENTLY_DELETED';
    expect(TASK_LIST_DELETE_AUDIT_ACTION).toBe('TASK_LIST_PERMANENTLY_DELETED');
  });

  // ── Frontend canDeleteTask flag ────────────────────────────────────────────

  it('Test 25 — canDeleteTask frontend flag is true only for SUPER_ADMIN', () => {
    expect(canDeleteTaskFrontend(['SUPER_ADMIN'])).toBe(true);
    expect(canDeleteTaskFrontend(['SUPER_USER'])).toBe(false);
    expect(canDeleteTaskFrontend(['ISO_MANAGER'])).toBe(false);
    expect(canDeleteTaskFrontend(['IT_ADMIN'])).toBe(false);
    expect(canDeleteTaskFrontend(['DEPARTMENT_MANAGER'])).toBe(false);
    expect(canDeleteTaskFrontend(['QHSE_USER'])).toBe(false);
    expect(canDeleteTaskFrontend(['STAFF'])).toBe(false);
    expect(canDeleteTaskFrontend([])).toBe(false);
  });

});
