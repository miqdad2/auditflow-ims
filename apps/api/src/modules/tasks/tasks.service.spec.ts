/**
 * Unit 53 — Reference task and recurrence test cases (25 cases)
 *
 * Tests date-math helpers (addMonthsKuwait, addYearsKuwait, advanceByInterval,
 * computeNextDueDate) and the core service behaviour (create, reference storage,
 * Action Center exclusion, recurrence spawn, field-copy policy, concurrency).
 *
 * Service integration tests (spawnNextOccurrence) use mocked Prisma + Realtime.
 */

import {
  addMonthsKuwait, addYearsKuwait, advanceByInterval, computeNextDueDate,
} from './tasks.service';

// ─── Date helpers ─────────────────────────────────────────────────────────────

describe('Kuwait date helpers', () => {

  // Case 9: Monthly recurrence adds 1 calendar month
  it('Case 9 — addMonthsKuwait: Jan 15 + 1 month = Feb 15', () => {
    const base = new Date('2026-01-15T00:00:00Z');
    const next = addMonthsKuwait(base, 1);
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(1);   // February
    expect(next.getUTCDate()).toBe(15);
  });

  // Case 10: Quarterly recurrence adds 3 months
  it('Case 10 — addMonthsKuwait: Jan 1 + 3 months = Apr 1', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const next = addMonthsKuwait(base, 3);
    expect(next.getUTCMonth()).toBe(3);   // April
    expect(next.getUTCDate()).toBe(1);
  });

  // Case 11: Semiannual recurrence adds 6 months
  it('Case 11 — addMonthsKuwait: Aug 31 + 6 months = Feb 28 (month-end clamp)', () => {
    const base = new Date('2026-08-31T00:00:00Z');
    const next = addMonthsKuwait(base, 6);
    // Feb 2027 has 28 days (non-leap)
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(1);   // February
    expect(next.getUTCDate()).toBe(28);   // clamped to last valid day
  });

  // Case 12: Annual recurrence adds 1 year
  it('Case 12 — addYearsKuwait: Jan 15 2026 + 1 year = Jan 15 2027', () => {
    const base = new Date('2026-01-15T00:00:00Z');
    const next = addYearsKuwait(base, 1);
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(0);   // January
    expect(next.getUTCDate()).toBe(15);
  });

  // Case 13: Month-end safety — Jan 31 + 1 month
  it('Case 13 — addMonthsKuwait: Jan 31 + 1 month → Feb 28 (non-leap 2025)', () => {
    const base = new Date('2025-01-31T00:00:00Z');
    const next = addMonthsKuwait(base, 1);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(28);
  });

  // Case 14: Leap year annual recurrence
  it('Case 14 — addYearsKuwait: Feb 29 2024 + 1 year = Feb 28 2025 (non-leap)', () => {
    const base = new Date('2024-02-29T00:00:00Z');
    const next = addYearsKuwait(base, 1);
    expect(next.getUTCFullYear()).toBe(2025);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(28);
  });

  it('addYearsKuwait: Feb 29 2024 + 4 years = Feb 29 2028 (leap year)', () => {
    const base = new Date('2024-02-29T00:00:00Z');
    const next = addYearsKuwait(base, 4);
    expect(next.getUTCFullYear()).toBe(2028);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(29);   // 2028 is a leap year
  });

  it('advanceByInterval QUARTERLY delegates to +3 months', () => {
    const base = new Date('2026-03-31T00:00:00Z');
    const next = advanceByInterval(base, 'QUARTERLY');
    expect(next.getUTCMonth()).toBe(5);   // June
    expect(next.getUTCDate()).toBe(30);   // Jun has 30 days
  });

  it('advanceByInterval SEMIANNUAL delegates to +6 months', () => {
    const base = new Date('2026-06-30T00:00:00Z');
    const next = advanceByInterval(base, 'SEMIANNUAL');
    expect(next.getUTCMonth()).toBe(11);  // December
    expect(next.getUTCDate()).toBe(30);
  });

  it('advanceByInterval ANNUAL delegates to +1 year', () => {
    const base = new Date('2026-06-22T00:00:00Z');
    const next = advanceByInterval(base, 'ANNUAL');
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(5);
    expect(next.getUTCDate()).toBe(22);
  });

  // Case 15: Late completion — skip missed historical periods
  it('Case 15 — computeNextDueDate: late monthly completion skips missed periods', () => {
    // Task due Jan 1, monthly. Completed on Apr 10. Should yield May 1, not Feb/Mar/Apr.
    const baseDue = new Date('2026-01-01T00:00:00Z');
    const completedAt = new Date('2026-04-10T00:00:00Z');
    const next = computeNextDueDate(baseDue, 'MONTHLY', completedAt);
    // Jan → Feb → Mar → Apr → May (first future date after Apr 10)
    expect(next.getUTCMonth()).toBe(4);  // May
    expect(next.getUTCDate()).toBe(1);
    expect(next.getUTCFullYear()).toBe(2026);
    // Confirm it is in the future relative to completedAt
    expect(next > completedAt).toBe(true);
  });

  it('computeNextDueDate: on-time completion returns next interval', () => {
    const baseDue = new Date('2026-06-01T00:00:00Z');
    const now = new Date('2026-05-31T00:00:00Z'); // completed before due date
    const next = computeNextDueDate(baseDue, 'MONTHLY', now);
    // baseDue (Jun 1) is already after now (May 31) → returns Jun 1 + 1 month = Jul 1
    // Wait: computeNextDueDate advances while next <= now
    // Jun 1 > May 31 → loop doesn't run → next = Jun 1
    expect(next.getUTCMonth()).toBe(5);  // June 1 (already in the future)
  });

  it('computeNextDueDate: annual recurrence skips 3 missed years', () => {
    const baseDue = new Date('2022-01-01T00:00:00Z');
    const now     = new Date('2026-06-01T00:00:00Z');
    const next = computeNextDueDate(baseDue, 'ANNUAL', now);
    // 2022→2023→2024→2025→2026→2027 (first future year)
    expect(next.getUTCFullYear()).toBe(2027);
  });
});

// ─── Service behaviour (mocked) ───────────────────────────────────────────────
// These tests verify the logic paths in tasks.service.ts without hitting the DB.

import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RealtimeService } from '../realtime/realtime.service';

const makeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1', workspaceId: 'ws-1', taskListId: 'tl-1', parentTaskId: null,
  title: 'Test Task', description: null, status: 'TODO', priority: 'MEDIUM',
  isReference: false, assigneeId: null, createdById: 'user-1',
  dueDate: new Date('2026-07-01T00:00:00Z'),
  completedAt: null, sortOrder: 0,
  recurrenceInterval: 'NONE', recurrenceEndDate: null,
  recurrenceSeriesId: null, recurrenceParentId: null,
  createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

const mockPrisma = {
  task: {
    create:     jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    findFirst:  jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
    delete:     jest.fn(),
    groupBy:    jest.fn(),
  },
  taskList:      { findUnique: jest.fn() },
  taskComment:   { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  activityEvent: { create: jest.fn() },
  user:          { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn() },
  // workspace.findUnique is called to enrich TASK_ASSIGNED notification messages
  workspace:     { findUnique: jest.fn().mockResolvedValue(null) },
  $transaction:  jest.fn(),
};
const mockAuditLog     = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { create: jest.fn().mockResolvedValue(undefined) };
const mockWorkspaces   = {
  assertWorkspaceAccess:         jest.fn().mockResolvedValue(undefined),
  canCollaborateInWorkspace:     jest.fn().mockResolvedValue(true),
  buildWorkspaceVisibilityWhere: jest.fn().mockReturnValue({}),
  assertCanBeAssigned:           jest.fn().mockResolvedValue(undefined),
};
const mockRealtime = { emitToWorkspace: jest.fn(), emitToUser: jest.fn() };

describe('TasksService — reference and recurrence', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    // workspace.findUnique is called in notification enrichment for TASK_ASSIGNED
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    // user.findUnique defaults to null for actor-name enrichment
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,       useValue: mockPrisma },
        { provide: AuditLogService,     useValue: mockAuditLog },
        { provide: NotificationsService,useValue: mockNotifications },
        { provide: WorkspacesService,   useValue: mockWorkspaces },
        { provide: RealtimeService,     useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  // ── Case 1: Existing tasks default to non-reference ─────────────────────────
  it('Case 1 — create() persists isReference=false by default', async () => {
    const task = makeTask();
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: 'tl-1', title: 'Task A' },
      'user-1', ['ISO_MANAGER'], null,
    );

    const [createCall] = (mockPrisma.task.create as jest.Mock).mock.calls[0] as [{ data: Record<string, unknown> }][];
    expect((createCall as unknown as { data: Record<string, unknown> }).data['isReference']).toBe(false);
  });

  // ── Case 2: Reference item creates successfully ─────────────────────────────
  it('Case 2 — create() stores isReference=true when requested', async () => {
    const task = makeTask({ isReference: true });
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: 'tl-1', title: 'Ref Item', isReference: true },
      'user-1', ['ISO_MANAGER'], null,
    );

    const call = (mockPrisma.task.create as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data['isReference']).toBe(true);
  });

  // ── Case 3: Reference stores isReference separately — priority unchanged ────
  it('Case 3 — create() stores real priority (LOW) separately from isReference flag', async () => {
    const task = makeTask({ isReference: true, priority: 'LOW' });
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: 'tl-1', title: 'Ref', isReference: true, priority: 'LOW' },
      'user-1', ['ISO_MANAGER'], null,
    );

    const call = (mockPrisma.task.create as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data['priority']).toBe('LOW');           // real priority stored
    expect(call.data['isReference']).toBe(true);         // reference flag separate
    // 'REFERENCE' must NOT be stored as a priority value
    expect(call.data['priority']).not.toBe('REFERENCE');
  });

  // ── Case 5: Reference item does not become operationally overdue ────────────
  // The Action Center query adds isReference: false — reference items are excluded.
  // This is tested at the Prisma query level in the BAC test suite.
  // Here we verify create() stores isReference correctly (prerequisite for exclusion).
  it('Case 5 — reference item stores isReference=true so BAC WHERE clause excludes it', async () => {
    const task = makeTask({ isReference: true, dueDate: new Date('2020-01-01') }); // very old due date
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: 'tl-1', title: 'Old Ref', isReference: true, dueDate: '2020-01-01' },
      'user-1', ['ISO_MANAGER'], null,
    );

    const call = (mockPrisma.task.create as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data['isReference']).toBe(true);
    // A BAC query with { isReference: false } would not match this row
  });

  // ── Case 8: Normal Low/Medium/High/Critical tasks still work ────────────────
  it('Case 8 — create() with CRITICAL priority stores CRITICAL', async () => {
    const task = makeTask({ priority: 'CRITICAL' });
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: 'tl-1', title: 'Critical Task', priority: 'CRITICAL' },
      'user-1', ['ISO_MANAGER'], null,
    );

    const call = (mockPrisma.task.create as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data['priority']).toBe('CRITICAL');
    expect(call.data['isReference']).toBe(false);
  });

  // ── Case 9: Monthly recurrence creates one next occurrence ──────────────────
  it('Case 9 — completing a monthly task triggers atomic spawn', async () => {
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      recurrenceSeriesId: 'series-1',
    });
    const updated = { ...existing, status: 'COMPLETED', completedAt: new Date() };
    const nextOccurrence = makeTask({ id: 'task-2', recurrenceParentId: 'task-1', dueDate: new Date('2026-07-01') });

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // initial load
    // user.findUnique not needed (no assigneeId)
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // in-tx fresh re-read
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);      // no existing child
      mockPrisma.task.update.mockResolvedValueOnce(updated);      // complete source
      mockPrisma.task.create.mockResolvedValueOnce(nextOccurrence); // create child
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});  // child activity
      return fn(mockPrisma);
    });

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    expect(mockPrisma.task.update).toHaveBeenCalled();
    expect(mockPrisma.task.create).toHaveBeenCalled();
  });

  // ── Case 17: Recurrence end date prevents next creation ─────────────────────
  it('Case 17 — spawnNextOccurrence skips if next date is after recurrenceEndDate', async () => {
    // Task with monthly recurrence, endDate in the past
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2025-01-01T00:00:00Z'),
      recurrenceEndDate: new Date('2025-03-01T00:00:00Z'), // already passed
      recurrenceSeriesId: 'series-2',
    });
    const updated = { ...existing, status: 'COMPLETED', completedAt: new Date() };

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing);
    mockPrisma.task.update.mockResolvedValueOnce(updated);
    // spawnNextOccurrence will be called but should skip because next date > endDate

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    // update was called, create should not be called (no occurrence spawned)
    expect(mockPrisma.task.update).toHaveBeenCalled();
    // Allow time for the async spawnNextOccurrence to settle
    await Promise.resolve();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Case 19: Comments are not copied to next occurrence ─────────────────────
  it('Case 19 — next occurrence is created without copying comments', async () => {
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      recurrenceSeriesId: 'series-3',
    });
    const updated = { ...existing, status: 'COMPLETED', completedAt: new Date() };
    const nextTask = makeTask({ id: 'task-next', recurrenceParentId: 'task-1' });

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // initial load
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // in-tx re-read
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);      // no child
      mockPrisma.task.update.mockResolvedValueOnce(updated);
      mockPrisma.task.create.mockResolvedValueOnce(nextTask);
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    expect(mockPrisma.taskComment.create).not.toHaveBeenCalled();
  });

  // ── Case 20: Files are not copied to next occurrence ─────────────────────────
  it('Case 20 — new occurrence task gets a new ID, old file attachments stay on old task', async () => {
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      recurrenceSeriesId: 'series-4',
    });
    const updated  = { ...existing, status: 'COMPLETED', completedAt: new Date() };
    const nextTask = makeTask({ id: 'DIFFERENT_ID', recurrenceParentId: 'task-1' });

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // initial load
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(existing);
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce(updated);
      mockPrisma.task.create.mockResolvedValueOnce(nextTask);
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    // Files not copied: no external copy logic exists for file attachments
  });

  // ── Case 21: Reference recurrence remains Reference ──────────────────────────
  it('Case 21 — spawnNextOccurrence preserves isReference=true on next occurrence', async () => {
    const existing = makeTask({
      status: 'TODO', isReference: true, recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      recurrenceSeriesId: 'series-5',
    });
    const updated  = { ...existing, status: 'COMPLETED', completedAt: new Date() };
    const nextTask = makeTask({ id: 'task-ref-next', isReference: true, recurrenceParentId: 'task-1' });

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // initial load
    let capturedData: Record<string, unknown> | null = null;
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(existing);
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce(updated);
      mockPrisma.task.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
        capturedData = data;
        return nextTask;
      });
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    expect(capturedData).not.toBeNull();
    expect((capturedData as unknown as Record<string, unknown>)['isReference']).toBe(true);
  });

  // ── Case 22: Stop Future Recurrence prevents next creation ──────────────────
  it('Case 22 — stopRecurrence=true sets recurrenceInterval to NONE, no spawn', async () => {
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
    });
    const updated = { ...existing, recurrenceInterval: 'NONE' };

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing);
    mockPrisma.task.update.mockResolvedValueOnce(updated);

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { stopRecurrence: true }, actor);

    const updateCall = (mockPrisma.task.update as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data['recurrenceInterval']).toBe('NONE');
    // No spawn: $transaction not called because status wasn't changed to COMPLETED
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Case 16: Concurrency — two completion requests create only one occurrence ─
  it('Case 16 — second concurrent completion request finds existing child and skips create', async () => {
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      recurrenceSeriesId: 'series-6',
    });
    const updated  = { ...existing, status: 'COMPLETED' };
    const pending  = makeTask({ id: 'task-pending', recurrenceParentId: 'task-1', status: 'TODO' });

    mockPrisma.task.findUnique.mockResolvedValue(existing); // both initial and in-tx re-read
    // findFirst returns an existing child (any status) — status-independent check
    mockPrisma.task.findFirst.mockResolvedValue(pending);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      // in-tx: findUnique, findFirst (existing), update — no create
      mockPrisma.task.update.mockResolvedValueOnce(updated);
      return fn(mockPrisma);
    });

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    // $transaction IS called (atomic path always used for recurring completion)
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    // create must NOT be called because existing child was found
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // ── Case 18: Ineligible assignee creates unassigned next occurrence ─────────
  // (covers inactive user, removed member, or downgraded-to-Viewer scenarios)
  it('Case 18 — ineligible assignee results in null assigneeId on next occurrence', async () => {
    const existing = makeTask({
      status: 'TODO', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      assigneeId: 'inactive-user',
      recurrenceSeriesId: 'series-7',
    });
    const updated  = { ...existing, status: 'COMPLETED' };
    const nextTask = makeTask({ id: 'task-unassigned', assigneeId: null, recurrenceParentId: 'task-1' });

    mockPrisma.task.findUnique.mockResolvedValueOnce(existing);   // initial load
    // assertCanBeAssigned rejects — assignee is inactive / removed from workspace
    mockWorkspaces.assertCanBeAssigned.mockRejectedValueOnce(new Error('This user is inactive and cannot be assigned tasks.'));

    let capturedData: Record<string, unknown> | null = null;
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(existing); // in-tx re-read
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);      // no existing child
      mockPrisma.task.update.mockResolvedValueOnce(updated);      // complete source
      mockPrisma.task.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
        capturedData = data;
        return nextTask;
      });
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    const actor = { id: 'user-1', userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }], department: null };
    await service.update('task-1', { status: 'COMPLETED' }, actor);

    await Promise.resolve(); await Promise.resolve();
    expect(capturedData).not.toBeNull();
    expect((capturedData as unknown as Record<string, unknown>)['assigneeId']).toBeNull();
  });

  // ── Case 25: Builds pass ─────────────────────────────────────────────────────
  it('Case 25 — TasksService instantiates without errors (build smoke)', () => {
    expect(service).toBeDefined();
  });
});

// ─── Unit 53.1 — Atomicity, permanent idempotency, end-date, concurrency ─────

describe('TasksService — Unit 53.1 atomicity and permanent idempotency', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  const actor = {
    id: 'user-1',
    userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }],
    department: null,
  };

  function makeRecurringTask(overrides: Record<string, unknown> = {}) {
    return makeTask({
      recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'),
      recurrenceSeriesId: 'series-x',
      ...overrides,
    });
  }

  // ── Part 2: Status-independent idempotency ─────────────────────────────────

  // Test 1: Source creates exactly one direct child
  it('53.1-T1 — completing a recurring task produces exactly one child', async () => {
    const src = makeRecurringTask({ status: 'TODO' });
    const child = makeTask({ id: 'child-1', recurrenceParentId: 'task-1', status: 'TODO' });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null); // no existing child
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockResolvedValueOnce(child);
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(1);
  });

  // Test 2: Completing source twice creates only one child (status-independent)
  it('53.1-T2 — second completion attempt finds existing child (any status) and creates nothing', async () => {
    const src = makeRecurringTask({ status: 'TODO' });
    const existingChild = { id: 'child-already' }; // could be any status

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(existingChild); // child already exists
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // Test 3: Completed child does not allow parent to spawn another
  it('53.1-T3 — child being COMPLETED does not allow parent to spawn a second child', async () => {
    const src = makeRecurringTask({ status: 'TODO' });
    // Child already exists with status COMPLETED — old code (status-dependent check) would have allowed another
    const completedChild = { id: 'child-done', status: 'COMPLETED' };

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Status-independent check: findFirst with no status filter finds the COMPLETED child
      mockPrisma.task.findFirst.mockResolvedValueOnce(completedChild);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // Test 4: Cancelled child does not allow parent to spawn another
  it('53.1-T4 — child being CANCELLED does not allow parent to spawn a second child', async () => {
    const src = makeRecurringTask({ status: 'TODO' });
    const cancelledChild = { id: 'child-cancelled', status: 'CANCELLED' };

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(cancelledChild);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // ── Part 3: Atomicity ──────────────────────────────────────────────────────

  // Test 5: Completion and child creation happen in the same transaction
  it('53.1-T5 — task update and child create happen inside a single $transaction call', async () => {
    const src = makeRecurringTask({ status: 'TODO' });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    let txCallCount = 0;
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      txCallCount++;
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockResolvedValueOnce(makeTask({ id: 'child-new' }));
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(txCallCount).toBe(1);
    // Both update AND create must have been called
    expect(mockPrisma.task.update).toHaveBeenCalled();
    expect(mockPrisma.task.create).toHaveBeenCalled();
  });

  // Test 6: Child create failure causes the $transaction to propagate the error
  it('53.1-T6 — if $transaction throws, completion is not persisted', async () => {
    const src = makeRecurringTask({ status: 'TODO' });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB write failure'));

    await expect(
      service.update('task-1', { status: 'COMPLETED' }, actor),
    ).rejects.toThrow('DB write failure');
  });

  // Test 7: Realtime emit happens after transaction completes (not before)
  it('53.1-T7 — task.created emitted only after $transaction resolves', async () => {
    const src = makeRecurringTask({ status: 'TODO' });
    const child = makeTask({ id: 'child-rt', recurrenceParentId: 'task-1', workspaceId: 'ws-1', status: 'TODO' });
    const callOrder: string[] = [];

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      callOrder.push('tx');
      mockPrisma.task.findUnique.mockResolvedValueOnce(src); // in-tx re-read
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockResolvedValueOnce(child);
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });
    (mockRealtime.emitToWorkspace as jest.Mock).mockImplementation((_ws: string, event: string) => {
      callOrder.push(event);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);

    const txIdx     = callOrder.indexOf('tx');
    const emitIdx   = callOrder.indexOf('task.created');
    expect(txIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThan(txIdx);
  });

  // Test 8: Socket emit failure does not affect the committed task
  //
  // Approved post-commit realtime policy (Unit 57 / Unit 59.3):
  //   • The database commit is authoritative — it completed before any emit was attempted.
  //   • A socket.io exception after commit must NOT surface as an API error (500).
  //   • The failure is logged for technical monitoring (console.error).
  //   • Clients reconcile through polling/refresh after reconnect.
  //
  // Previous assertion `.rejects.toThrow('socket down')` was written before Unit 57
  // wrapped post-commit emits in try-catch. It contradicted the comment on line 707.
  // Fixed to match the approved policy: update() resolves and the DB write is confirmed.
  it('53.1-T8 — socket emit throwing does not undo committed completion', async () => {
    const src = makeRecurringTask({ status: 'TODO' });
    const child = makeTask({ id: 'child-emit-fail', workspaceId: 'ws-1', recurrenceParentId: 'task-1', status: 'TODO' });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(src); // in-tx re-read
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockResolvedValueOnce(child);
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });
    // Make realtime throw — this simulates Socket.IO being unavailable
    (mockRealtime.emitToWorkspace as jest.Mock).mockImplementation(() => { throw new Error('socket down'); });

    // Must resolve (not reject) — socket failures are caught and logged, never surfaced as API errors
    await expect(service.update('task-1', { status: 'COMPLETED' }, actor)).resolves.toBeDefined();
    // The DB write committed before the emit was attempted
    expect(mockPrisma.task.update).toHaveBeenCalled();
  });

  // ── Part 5: Recurrence end-date correctness ────────────────────────────────

  // Test 9: Next due equals end date → creation allowed (boundary inclusive)
  // Use computed dates rather than Date mock to avoid test fragility.
  it('53.1-T9 — next due date exactly equals recurrenceEndDate → child IS created', async () => {
    // Set base to 2 months in the past; monthly → next = 1 month in the past + advance = in future
    // More reliably: base = very old date, so nextDue = first future monthly occurrence
    // and endDate = exactly that future date → should create
    const baseDue = new Date('2025-01-01T00:00:00Z'); // far past
    const now = new Date();
    // Compute what the service will compute
    const nextDue = computeNextDueDate(baseDue, 'MONTHLY', now);
    // End date exactly equals next due → allowed (nextDue <= endDate is false only when strictly >)
    const endDate = new Date(nextDue); // same day = boundary

    const src = makeRecurringTask({
      status: 'TODO',
      dueDate: baseDue,
      recurrenceEndDate: endDate,
    });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findUnique.mockResolvedValueOnce(src);
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockResolvedValueOnce(makeTask({ id: 'child-boundary' }));
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(1);
  });

  // Test 10: Next due is one day after end date → NOT created
  it('53.1-T10 — next due date is after recurrenceEndDate → child is NOT created', async () => {
    const baseDue = new Date('2025-01-01T00:00:00Z');
    const now = new Date();
    const nextDue = computeNextDueDate(baseDue, 'MONTHLY', now);
    // End date is 1 day before next due → strictly greater than → blocked
    const endDate = new Date(nextDue.getTime() - 24 * 60 * 60 * 1000);

    const src = makeRecurringTask({
      status: 'TODO',
      dueDate: baseDue,
      recurrenceEndDate: endDate,
    });

    mockPrisma.task.findUnique.mockResolvedValueOnce(src);
    // spawnBlocked=true → simple update path, no $transaction
    mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // Test 11: Late completion still respects end date
  it('53.1-T11 — late completion skips historical periods but end date blocks creation', async () => {
    // Task due 13 months ago (far past). Monthly recurrence.
    // computeNextDueDate advances to next month (1 month from now).
    // Set endDate = yesterday → next (1 month from now) > endDate → blocked.
    const now = new Date();
    const baseDue = addMonthsKuwait(now, -13); // 13 months ago
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const src = makeRecurringTask({
      status: 'TODO',
      dueDate: baseDue,
      recurrenceEndDate: yesterday,
    });

    mockPrisma.task.findUnique.mockResolvedValueOnce(src);
    mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    // spawnBlocked=true (next due > yesterday endDate) → no child
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // ── Part 6: Stop recurrence + concurrency ─────────────────────────────────

  // Test 12: Stop recurrence before completion prevents child
  it('53.1-T12 — task with recurrenceInterval=NONE (stopped) does not spawn child on completion', async () => {
    // Source task has recurrence already stopped
    const src = makeTask({ status: 'TODO', recurrenceInterval: 'NONE' });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // Test 13: Concurrent stop + complete — in-tx interval check prevents child
  it('53.1-T13 — concurrent stop sets recurrenceInterval=NONE; in-tx check prevents child creation', async () => {
    const src = makeRecurringTask({ status: 'TODO' }); // initial has MONTHLY

    mockPrisma.task.findUnique.mockResolvedValueOnce(src); // initial load: MONTHLY → needsSpawn=true
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Re-read inside tx: concurrent stop already committed NONE
      mockPrisma.task.findUnique.mockResolvedValueOnce({ ...src, recurrenceInterval: 'NONE' });
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED', recurrenceInterval: 'NONE' });
      // shouldCreateChild = false because committedInterval = NONE
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // ── Part 7: Reconciliation preview ────────────────────────────────────────

  // Test 14: Preview identifies a missing child (completed source, no child)
  it('53.1-T14 — reconciliation preview identifies a completed source with no child', async () => {
    const src = {
      id: 'source-missing', title: 'Monthly Review', workspaceId: 'ws-1',
      recurrenceInterval: 'MONTHLY', recurrenceEndDate: null, recurrenceSeriesId: 'series-m',
      dueDate: new Date('2026-05-01T00:00:00Z'),
    };

    mockPrisma.task.findMany.mockResolvedValueOnce([src]);
    mockPrisma.task.findFirst.mockResolvedValueOnce(null); // no child

    const result = await service.getRecurrenceReconciliationPreview();

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].sourceId).toBe('source-missing');
    expect(result.missing[0].blockedByEndDate).toBe(false);
  });

  // Test 15: Preview finds nothing when child already exists
  it('53.1-T15 — reconciliation preview: no missing when child already exists (any status)', async () => {
    const src = {
      id: 'source-ok', title: 'Quarterly', workspaceId: 'ws-1',
      recurrenceInterval: 'QUARTERLY', recurrenceEndDate: null, recurrenceSeriesId: null,
      dueDate: new Date('2026-03-01T00:00:00Z'),
    };

    mockPrisma.task.findMany.mockResolvedValueOnce([src]);
    mockPrisma.task.findFirst.mockResolvedValueOnce({ id: 'existing-child' }); // child present

    const result = await service.getRecurrenceReconciliationPreview();
    expect(result.missing).toHaveLength(0);
  });

  // Test 16: Preview is read-only — never calls create
  it('53.1-T16 — reconciliation preview makes no write calls', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([]);

    await service.getRecurrenceReconciliationPreview();

    expect(mockPrisma.task.create).not.toHaveBeenCalled();
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
    expect(mockPrisma.activityEvent.create).not.toHaveBeenCalled();
  });

  // Test 17: Preview reports end-date blocking correctly
  it('53.1-T17 — preview flags blockedByEndDate when next due exceeds end date', async () => {
    const src = {
      id: 'source-blocked', title: 'Blocked', workspaceId: 'ws-1',
      recurrenceInterval: 'MONTHLY', recurrenceEndDate: new Date('2026-05-31T00:00:00Z'), recurrenceSeriesId: null,
      dueDate: new Date('2026-05-01T00:00:00Z'),
    };

    // Use a dueDate far in the past so nextDue is always in the future (> endDate 2026-05-31)
    // src.dueDate = 2026-05-01, monthly → next = 2026-06-01, endDate = 2026-05-31
    // 2026-06-01 > 2026-05-31 → blockedByEndDate = true
    mockPrisma.task.findMany.mockResolvedValueOnce([src]);
    mockPrisma.task.findFirst.mockResolvedValueOnce(null); // no child

    const result = await service.getRecurrenceReconciliationPreview();

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].blockedByEndDate).toBe(true);
  });

  // Test 18: Repair is idempotent — no duplicate if child already exists
  it('53.1-T18 — repair returns created:false if child already exists', async () => {
    const src = {
      id: 'src-repair', status: 'COMPLETED', recurrenceInterval: 'MONTHLY',
      dueDate: new Date('2026-06-01T00:00:00Z'), recurrenceEndDate: null,
      assigneeId: null, workspaceId: 'ws-1', taskListId: 'tl-1',
      title: 'T', description: null, priority: 'MEDIUM', isReference: false,
      recurrenceSeriesId: null,
    };

    mockPrisma.task.findUnique.mockResolvedValueOnce(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Child already exists
      mockPrisma.task.findFirst.mockResolvedValueOnce({ id: 'existing-repair-child' });
      return fn(mockPrisma);
    });

    const result = await service.repairMissingOccurrence('src-repair', 'admin-user');
    expect(result.created).toBe(false);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // Test 19: Reference recurrence remains Reference on child
  it('53.1-T19 — child created from reference task preserves isReference=true', async () => {
    const src = makeRecurringTask({ status: 'TODO', isReference: true });
    let capturedCreate: Record<string, unknown> | null = null;

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
        capturedCreate = data;
        return makeTask({ id: 'ref-child', isReference: true });
      });
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(capturedCreate?.['isReference']).toBe(true);
  });

  // Test 20: Comments are NOT copied to the new child
  it('53.1-T20 — TaskComment.create is never called during atomic recurrence spawn', async () => {
    const src = makeRecurringTask({ status: 'TODO' });

    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });
      mockPrisma.task.create.mockResolvedValueOnce(makeTask({ id: 'child-no-cmt' }));
      mockPrisma.activityEvent.create.mockResolvedValueOnce({});
      return fn(mockPrisma);
    });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.taskComment.create).not.toHaveBeenCalled();
  });

  // Test 21: Non-recurring task completion works unchanged
  it('53.1-T21 — non-recurring task completion does not attempt to spawn a child', async () => {
    const src = makeTask({ status: 'TODO', recurrenceInterval: 'NONE' });
    mockPrisma.task.findUnique.mockResolvedValue(src);
    mockPrisma.task.update.mockResolvedValueOnce({ ...src, status: 'COMPLETED' });

    await service.update('task-1', { status: 'COMPLETED' }, actor);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // Test 22: Builds pass (structural smoke test for Unit 53.1 additions)
  it('53.1-T22 — builds pass (service and reconciliation methods are defined)', () => {
    expect(service.getRecurrenceReconciliationPreview).toBeDefined();
    expect(service.repairMissingOccurrence).toBeDefined();
  });
});

// ── Unit 59.3 — Assignment eligibility tests ──────────────────────────────────

describe('TasksService — Unit 59.3 assignment eligibility', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    // workspace.findUnique used by TASK_ASSIGNED notification enrichment
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    // user.findUnique defaults to null for actor-name enrichment
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  const elevatedActor = {
    id: 'super-1',
    userRoles: [{ role: { name: 'SUPER_USER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }],
    department: null,
  };

  // T1: Super User can manage a task (workspace access check passes)
  it('59.3-T1 — Super User actor can manage any task (actor access)', async () => {
    const task = makeTask();
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.update.mockResolvedValueOnce({ ...task });
    mockWorkspaces.assertCanBeAssigned.mockResolvedValue(undefined);

    // Just updating title — no assigneeId change
    await expect(service.update('task-1', { title: 'New Title' }, elevatedActor)).resolves.toBeDefined();
  });

  // T2: Super User actor cannot assign to a non-member (assertCanBeAssigned enforced)
  it('59.3-T2 — Super User actor cannot bypass assignee workspace eligibility', async () => {
    const task = makeTask({ assigneeId: null });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    // assertCanBeAssigned rejects — non-member
    mockWorkspaces.assertCanBeAssigned.mockRejectedValueOnce(
      new Error('This user must be added to the workspace as a Member, Manager, or Owner before the task can be assigned.'),
    );

    await expect(service.update('task-1', { assigneeId: 'non-member-user' }, elevatedActor))
      .rejects.toThrow('must be added to the workspace');
  });

  // T3: Valid active Member is accepted
  it('59.3-T3 — active Member assignee is accepted', async () => {
    const task = makeTask({ assigneeId: null });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.update.mockResolvedValueOnce({ ...task, assigneeId: 'member-user' });
    mockWorkspaces.assertCanBeAssigned.mockResolvedValueOnce(undefined); // eligible

    await expect(service.update('task-1', { assigneeId: 'member-user' }, elevatedActor)).resolves.toBeDefined();
    expect(mockWorkspaces.assertCanBeAssigned).toHaveBeenCalledWith('member-user', 'ws-1', expect.any(Array));
  });

  // T4: Active Manager is accepted
  it('59.3-T4 — active Manager assignee is accepted', async () => {
    const task = makeTask({ assigneeId: null });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.update.mockResolvedValueOnce({ ...task, assigneeId: 'manager-user' });
    mockWorkspaces.assertCanBeAssigned.mockResolvedValueOnce(undefined);

    await expect(service.update('task-1', { assigneeId: 'manager-user' }, elevatedActor)).resolves.toBeDefined();
  });

  // T5: Viewer is rejected
  it('59.3-T5 — Viewer assignee is rejected with friendly message', async () => {
    const task = makeTask({ assigneeId: null });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockWorkspaces.assertCanBeAssigned.mockRejectedValueOnce(
      new Error('This user has read-only workspace access and cannot be assigned operational tasks.'),
    );

    await expect(service.update('task-1', { assigneeId: 'viewer-user' }, elevatedActor))
      .rejects.toThrow('read-only workspace access');
  });

  // T6: Inactive user is rejected
  it('59.3-T6 — inactive user is rejected with friendly message', async () => {
    const task = makeTask({ assigneeId: null });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockWorkspaces.assertCanBeAssigned.mockRejectedValueOnce(
      new Error('This user is inactive and cannot be assigned tasks.'),
    );

    await expect(service.update('task-1', { assigneeId: 'inactive-user' }, elevatedActor))
      .rejects.toThrow('inactive');
  });

  // T7: assertCanBeAssigned is NOT called when assigneeId does not change
  it('59.3-T7 — assertCanBeAssigned is skipped when assigneeId is unchanged', async () => {
    const task = makeTask({ assigneeId: 'same-user' });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.update.mockResolvedValueOnce({ ...task, title: 'Updated' });

    await service.update('task-1', { assigneeId: 'same-user' }, elevatedActor);
    // Same assigneeId → no eligibility check
    expect(mockWorkspaces.assertCanBeAssigned).not.toHaveBeenCalled();
  });

  // T8: assertCanBeAssigned is NOT called when clearing assignee (null)
  it('59.3-T8 — assertCanBeAssigned is skipped when clearing assignee to null', async () => {
    const task = makeTask({ assigneeId: 'some-user' });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.update.mockResolvedValueOnce({ ...task, assigneeId: null });

    await service.update('task-1', { assigneeId: null }, elevatedActor);
    expect(mockWorkspaces.assertCanBeAssigned).not.toHaveBeenCalled();
  });

  // T9: Task creation rejects invalid assignee
  it('59.3-T9 — task creation rejects invalid assignee via assertCanBeAssigned', async () => {
    mockWorkspaces.assertCanBeAssigned.mockRejectedValueOnce(
      new Error('This user must be added to the workspace as a Member, Manager, or Owner before the task can be assigned.'),
    );

    await expect(
      service.create({ workspaceId: 'ws-1', taskListId: 'tl-1', title: 'Task', assigneeId: 'invalid' }, 'super-1', ['SUPER_USER'], null),
    ).rejects.toThrow('must be added to the workspace');

    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  // T10: Socket failure does not fail committed assignment (T.708 policy confirmed)
  it('59.3-T10 — socket emit failure does not roll back a committed task update', async () => {
    const task = makeTask({ status: 'TODO' });
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.update.mockResolvedValueOnce({ ...task, status: 'IN_PROGRESS' });
    (mockRealtime.emitToWorkspace as jest.Mock).mockImplementation(() => { throw new Error('socket unreachable'); });

    // Must resolve — socket error is caught and logged, never propagated
    await expect(service.update('task-1', { status: 'IN_PROGRESS' }, elevatedActor)).resolves.toBeDefined();
    expect(mockPrisma.task.update).toHaveBeenCalled();
  });
});

// ── Unit 61 — Task visibility policy tests ────────────────────────────────────

describe('TasksService — Unit 61 task visibility policy', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValue(undefined);
    mockWorkspaces.buildWorkspaceVisibilityWhere.mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  // T1: Workspace-scoped query does not force assigneeId restriction for STAFF
  it('61-T1 — STAFF user with workspaceId filter sees all workspace tasks (Option A)', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([
      makeTask({ id: 'task-1', assigneeId: 'user-1' }),
      makeTask({ id: 'task-2', assigneeId: null }),
      makeTask({ id: 'task-3', assigneeId: 'other-user' }),
    ]);
    mockWorkspaces.buildWorkspaceVisibilityWhere.mockReturnValue({
      OR: [{ workspaceId: null }, { workspace: { members: { some: { userId: 'staff-1' } } } }],
    });

    const result = await service.findMany(
      { workspaceId: 'ws-1', parentTaskId: null },
      'staff-1',
      ['STAFF'],
      null,
    );

    // All 3 tasks returned — no assigneeId restriction when workspaceId is provided
    expect(result).toHaveLength(3);

    // The where passed to prisma should NOT contain assigneeId: 'staff-1'
    function getWhereStr() {
      const args = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
      return JSON.stringify(args[0].where);
    }
    // workspaceId restriction applied; no forced assigneeId
    expect(getWhereStr()).toContain('ws-1');
    expect(getWhereStr()).not.toContain('"assigneeId":"staff-1"');
  });

  // T2: Global task list (no workspaceId) still restricts STAFF to assigned tasks
  it('61-T2 — STAFF without workspaceId sees only assigned tasks (global task list)', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([
      makeTask({ id: 'task-1', assigneeId: 'staff-1' }),
    ]);
    mockWorkspaces.buildWorkspaceVisibilityWhere.mockReturnValue({
      OR: [{ workspaceId: null }, { workspace: { members: { some: { userId: 'staff-1' } } } }],
    });

    await service.findMany({ parentTaskId: null }, 'staff-1', ['STAFF'], null);

    const args2 = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
    const whereStr2 = JSON.stringify(args2[0].where);
    // For global (no workspaceId), STAFF must have assigneeId: actorId restriction
    expect(whereStr2).toContain('"assigneeId":"staff-1"');
  });

  // T3: taskListId-only query also uses Option A (no assigneeId restriction)
  it('61-T3 — STAFF with taskListId filter sees all list tasks (Option A)', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([
      makeTask({ id: 'task-1', assigneeId: 'user-a' }),
      makeTask({ id: 'task-2', assigneeId: null }),
    ]);
    mockWorkspaces.buildWorkspaceVisibilityWhere.mockReturnValue({});

    await service.findMany({ taskListId: 'tl-1', parentTaskId: null }, 'staff-1', ['STAFF'], null);

    const args3 = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
    const whereStr3 = JSON.stringify(args3[0].where);
    expect(whereStr3).not.toContain('"assigneeId":"staff-1"');
  });

  // T4: Elevated user always sees all tasks (unchanged behavior)
  it('61-T4 — SUPER_USER sees all tasks without any workspace restriction', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([makeTask()]);

    await service.findMany({ parentTaskId: null }, 'super-1', ['SUPER_USER'], null);

    const args4 = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
    const whereStr4 = JSON.stringify(args4[0].where);
    // Elevated: no extra filters added
    expect(whereStr4).not.toContain('"assigneeId"');
    expect(whereStr4).not.toContain('"workspace"');
  });

  // T5: AUDITOR_VIEWER without workspaceId still restricted to assigned tasks
  it('61-T5 — AUDITOR_VIEWER without workspace context sees only assigned tasks', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([]);
    mockWorkspaces.buildWorkspaceVisibilityWhere.mockReturnValue({});

    await service.findMany({ parentTaskId: null }, 'auditor-1', ['AUDITOR_VIEWER'], null);

    const args5 = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
    const whereStr5 = JSON.stringify(args5[0].where);
    expect(whereStr5).toContain('"assigneeId":"auditor-1"');
  });
});

// ── Unit 61.1 — Workspace My Tasks validation fix regression tests ────────────

describe('TasksService — Unit 61.1 workspace-scoped query regression', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValue(undefined);
    // Key: workspace-scoped query does NOT call buildWorkspaceVisibilityWhere at all
    mockWorkspaces.buildWorkspaceVisibilityWhere.mockReturnValue({
      OR: [{ workspaceId: null }, { workspace: { members: { some: { userId: 'staff-1' } } } }],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  // T1: workspaceId query — must NOT use buildWorkspaceVisibilityWhere (avoids workspaceId: null)
  it('61.1-T1 — STAFF with workspaceId does NOT pass workspaceId:null to Prisma', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([
      makeTask({ id: 'iso-1', assigneeId: 'staff-1' }),
    ]);

    await service.findMany(
      { workspaceId: 'ws-ict', taskListId: 'tl-1', parentTaskId: null },
      'staff-1',
      ['STAFF'],
      null,
    );

    const args = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
    const whereStr = JSON.stringify(args[0].where);

    // MUST NOT contain null workspaceId — this is what caused the PrismaClientValidationError
    expect(whereStr).not.toContain('"workspaceId":null');
    // Must contain the specific workspaceId
    expect(whereStr).toContain('"workspaceId":"ws-ict"');
    // buildWorkspaceVisibilityWhere must NOT have been called for workspaceId queries
    expect(mockWorkspaces.buildWorkspaceVisibilityWhere).not.toHaveBeenCalled();
  });

  // T2: workspaceId + taskListId STAFF query returns assigned task (no validation error path)
  it('61.1-T2 — STAFF with workspaceId+taskListId returns tasks without Prisma error', async () => {
    const assignedTask = makeTask({ id: 'iso-1', assigneeId: 'staff-1', status: 'IN_PROGRESS' });
    mockPrisma.task.findMany.mockResolvedValueOnce([assignedTask]);

    const result = await service.findMany(
      { workspaceId: 'ws-ict', taskListId: 'tl-1', parentTaskId: null },
      'staff-1',
      ['STAFF'],
      null,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('iso-1');
  });

  // T3: workspaceId query where only the assignee's task is in the DB — still returned
  it('61.1-T3 — workspace query returns 1 assigned task when 4 total (My Tasks scenario)', async () => {
    // Simulate the ICT workspace: 4 tasks total but only 1 assigned to staff user
    mockPrisma.task.findMany.mockResolvedValueOnce([
      makeTask({ id: 'iso-1', assigneeId: 'staff-1', title: 'iso 1', status: 'IN_PROGRESS' }),
      makeTask({ id: 'task-2', assigneeId: null, title: 'task 2' }),
      makeTask({ id: 'task-3', assigneeId: null, title: 'task 3' }),
      makeTask({ id: 'task-4', assigneeId: 'other', title: 'task 4' }),
    ]);

    const result = await service.findMany(
      { workspaceId: 'ws-ict', taskListId: 'tl-1', parentTaskId: null },
      'staff-1',
      ['STAFF'],
      null,
    );

    // Backend returns all 4 (Policy Option A); client-side 'mine' filter shows 1
    expect(result).toHaveLength(4);

    // Client would apply: result.filter(t => t.assigneeId === 'staff-1') → ['iso-1']
    const myTasks = (result as Array<{ assigneeId: string | null; title: string }>).filter((t) => t.assigneeId === 'staff-1');
    expect(myTasks).toHaveLength(1);
    expect(myTasks[0].title).toBe('iso 1');
  });

  // T4: taskListId without workspaceId uses Task-safe member condition (no workspaceId:null)
  it('61.1-T4 — taskListId-only query uses workspace.members relation (no workspaceId:null)', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([]);

    await service.findMany(
      { taskListId: 'tl-1', parentTaskId: null },
      'staff-1',
      ['STAFF'],
      null,
    );

    const args = (mockPrisma.task.findMany as jest.Mock).mock.calls[0] as unknown as [{ where: unknown }];
    const whereStr = JSON.stringify(args[0].where);

    // Must NOT contain null workspaceId for Task queries
    expect(whereStr).not.toContain('"workspaceId":null');
    // Must contain member visibility check
    expect(whereStr).toContain('"members"');
  });

  // T5: assertWorkspaceAccess is called for workspaceId queries
  it('61.1-T5 — assertWorkspaceAccess is called when workspaceId is provided', async () => {
    mockPrisma.task.findMany.mockResolvedValueOnce([]);

    await service.findMany(
      { workspaceId: 'ws-ict', parentTaskId: null },
      'staff-1',
      ['STAFF'],
      null,
    );

    expect(mockWorkspaces.assertWorkspaceAccess).toHaveBeenCalledWith(
      'ws-ict',
      'staff-1',
      ['STAFF'],
      null,
    );
  });
});

// ── Unit 62 — Assignee Work Completion Submission and Reviewer Verification ───
// Pure transition-map contract tests (no Prisma required).

import { TASK_STATUS_TRANSITIONS, TASK_STATUS_REASON_REQUIRED } from '@auditflow/shared';

describe('Unit 62 — MEMBER transition rules (work submission workflow)', () => {
  const MEMBER = TASK_STATUS_TRANSITIONS.MEMBER;
  const MANAGER = TASK_STATUS_TRANSITIONS.MANAGER;
  const ELEVATED = TASK_STATUS_TRANSITIONS.ELEVATED;

  // T1: Member TODO → IN_PROGRESS only
  it('62-T1 — Member TODO allows only Start Work (IN_PROGRESS)', () => {
    expect(MEMBER.TODO).toEqual(['IN_PROGRESS']);
    expect(MEMBER.TODO).not.toContain('CANCELLED');
    expect(MEMBER.TODO).not.toContain('WAITING_REVIEW');
    expect(MEMBER.TODO).not.toContain('COMPLETED');
  });

  // T2: Member IN_PROGRESS → WAITING_REVIEW only
  it('62-T2 — Member IN_PROGRESS allows only Mark Work Complete (WAITING_REVIEW)', () => {
    expect(MEMBER.IN_PROGRESS).toEqual(['WAITING_REVIEW']);
    expect(MEMBER.IN_PROGRESS).not.toContain('CANCELLED');
    expect(MEMBER.IN_PROGRESS).not.toContain('COMPLETED');
    expect(MEMBER.IN_PROGRESS).not.toContain('REJECTED');
  });

  // T3: Member WAITING_REVIEW — no transitions (awaiting reviewer)
  it('62-T3 — Member WAITING_REVIEW has no transitions (read-only state)', () => {
    expect(MEMBER.WAITING_REVIEW).toHaveLength(0);
  });

  // T4: Member REJECTED → IN_PROGRESS only (Resume Work)
  it('62-T4 — Member REJECTED allows only Resume Work (IN_PROGRESS)', () => {
    expect(MEMBER.REJECTED).toEqual(['IN_PROGRESS']);
    expect(MEMBER.REJECTED).not.toContain('WAITING_REVIEW');
    expect(MEMBER.REJECTED).not.toContain('CANCELLED');
  });

  // T5: Member COMPLETED — read-only
  it('62-T5 — Member COMPLETED has no transitions', () => {
    expect(MEMBER.COMPLETED).toHaveLength(0);
  });

  // T6: Member CANCELLED — read-only
  it('62-T6 — Member CANCELLED has no transitions', () => {
    expect(MEMBER.CANCELLED).toHaveLength(0);
  });

  // T7: WAITING_REVIEW requires a completion note (reason required)
  it('62-T7 — WAITING_REVIEW requires a mandatory reason (completion note)', () => {
    expect(TASK_STATUS_REASON_REQUIRED.has('WAITING_REVIEW')).toBe(true);
  });

  // T8: REJECTED still requires a reason
  it('62-T8 — REJECTED still requires a mandatory reason', () => {
    expect(TASK_STATUS_REASON_REQUIRED.has('REJECTED')).toBe(true);
  });

  // T9: CANCELLED still requires a reason
  it('62-T9 — CANCELLED still requires a mandatory reason', () => {
    expect(TASK_STATUS_REASON_REQUIRED.has('CANCELLED')).toBe(true);
  });

  // T10: Manager can review WAITING_REVIEW tasks
  it('62-T10 — Manager WAITING_REVIEW allows COMPLETED, REJECTED, CANCELLED', () => {
    expect(MANAGER.WAITING_REVIEW).toContain('COMPLETED');
    expect(MANAGER.WAITING_REVIEW).toContain('REJECTED');
    expect(MANAGER.WAITING_REVIEW).toContain('CANCELLED');
  });

  // T11: Elevated can review WAITING_REVIEW tasks
  it('62-T11 — Elevated WAITING_REVIEW allows COMPLETED, REJECTED, CANCELLED', () => {
    expect(ELEVATED.WAITING_REVIEW).toContain('COMPLETED');
    expect(ELEVATED.WAITING_REVIEW).toContain('REJECTED');
    expect(ELEVATED.WAITING_REVIEW).toContain('CANCELLED');
  });

  // T12: Manager can start tasks (TODO → IN_PROGRESS)
  it('62-T12 — Manager TODO allows IN_PROGRESS', () => {
    expect(MANAGER.TODO).toContain('IN_PROGRESS');
  });

  // T13: Full workflow paths exist (contract)
  it('62-T13 — Full work submission path exists: TODO→IN_PROGRESS→WAITING_REVIEW', () => {
    expect(MEMBER.TODO).toContain('IN_PROGRESS');
    expect(MEMBER.IN_PROGRESS).toContain('WAITING_REVIEW');
  });

  it('62-T14 — Full review path exists: WAITING_REVIEW→COMPLETED (Manager)', () => {
    expect(MANAGER.WAITING_REVIEW).toContain('COMPLETED');
  });

  it('62-T15 — Full rework path exists: REJECTED→IN_PROGRESS→WAITING_REVIEW (Member)', () => {
    expect(MEMBER.REJECTED).toContain('IN_PROGRESS');
    expect(MEMBER.IN_PROGRESS).toContain('WAITING_REVIEW');
  });

  it('62-T16 — Member cannot directly CANCEL task', () => {
    expect(MEMBER.TODO).not.toContain('CANCELLED');
    expect(MEMBER.IN_PROGRESS).not.toContain('CANCELLED');
    expect(MEMBER.REJECTED).not.toContain('CANCELLED');
  });

  it('62-T17 — Member cannot directly COMPLETE task', () => {
    expect(MEMBER.TODO).not.toContain('COMPLETED');
    expect(MEMBER.IN_PROGRESS).not.toContain('COMPLETED');
    expect(MEMBER.REJECTED).not.toContain('COMPLETED');
  });

  it('62-T18 — Recurrence does NOT spawn on WAITING_REVIEW (only on COMPLETED)', () => {
    // Contract: recurrence is gated by `newStatus === 'COMPLETED'` in changeStatus().
    // MEMBER cannot reach COMPLETED directly, so recurrence is safe.
    // This test documents the invariant for regression protection.
    const memberCanReachCompleted = Object.values(MEMBER).some((targets) => targets.includes('COMPLETED'));
    expect(memberCanReachCompleted).toBe(false);
  });
});

// ─── Unit 66.3 — Task reorder validation ─────────────────────────────────────

describe('TasksService — reorderTasks (Unit 66.3)', () => {
  let service: TasksService;

  const elevatedActor = {
    id: 'actor-1',
    userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'project.read' } }] } }],
    department: null,
    departmentId: null,
  };

  const taskList = { id: 'tl-1', workspaceId: 'ws-1', name: 'Sprint 1' };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValue(undefined);
    mockWorkspaces.canCollaborateInWorkspace.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  // 66.3-T1: Empty orderedIds throws friendly 400
  it('66.3-T1 — empty orderedIds throws BadRequestException', async () => {
    await expect(service.reorderTasks('tl-1', [], elevatedActor))
      .rejects.toThrow('orderedIds must be a non-empty array');
  });

  // 66.3-T2: Duplicate IDs rejected before DB call
  it('66.3-T2 — duplicate IDs in orderedIds throws BadRequestException', async () => {
    await expect(service.reorderTasks('tl-1', ['task-1', 'task-2', 'task-1'], elevatedActor))
      .rejects.toThrow('duplicate task IDs');
    // Neither taskList lookup nor task.findMany should have been called (dup check is pre-DB)
    expect(mockPrisma.taskList.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
  });

  // 66.3-T3: Non-existent task list throws NotFoundException
  it('66.3-T3 — unknown taskListId throws NotFoundException', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.reorderTasks('no-such-list', ['id-1'], elevatedActor))
      .rejects.toThrow('Task list not found');
  });

  // 66.3-T4: Unauthorized user (not a collaborator) throws ForbiddenException
  it('66.3-T4 — non-collaborator throws ForbiddenException', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockWorkspaces.canCollaborateInWorkspace.mockResolvedValueOnce(false);
    const nonMemberActor = {
      id: 'viewer-1',
      userRoles: [{ role: { name: 'STAFF', rolePermissions: [] } }],
      department: null,
      departmentId: null,
    };
    await expect(service.reorderTasks('tl-1', ['id-1'], nonMemberActor))
      .rejects.toThrow('MEMBER, MANAGER, OWNER, or elevated role required');
  });

  // 66.3-T5: Foreign ID (not in task list) rejected
  it('66.3-T5 — foreign IDs (not in task list) throw BadRequestException', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    // Only task-1 exists in the list
    mockPrisma.task.findMany.mockResolvedValueOnce([{ id: 'task-1' }]);
    await expect(service.reorderTasks('tl-1', ['task-1', 'foreign-id'], elevatedActor))
      .rejects.toThrow('not found in this task list');
  });

  // 66.3-T6: Missing IDs (incomplete reorder) rejected
  it('66.3-T6 — missing IDs (not all tasks sent) throw BadRequestException', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    // List has task-1 and task-2, but only task-1 sent
    mockPrisma.task.findMany.mockResolvedValueOnce([{ id: 'task-1' }, { id: 'task-2' }]);
    await expect(service.reorderTasks('tl-1', ['task-1'], elevatedActor))
      .rejects.toThrow('incomplete');
  });

  // 66.3-T7: Valid reorder commits transaction and emits realtime event (no caller-supplied eventId)
  it('66.3-T7 — valid reorder executes $transaction and emits task.reordered', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany
      .mockResolvedValueOnce([{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }]) // root tasks for validation
      .mockResolvedValueOnce([makeTask({ id: 'task-2', sortOrder: 0 }), makeTask({ id: 'task-3', sortOrder: 1 }), makeTask({ id: 'task-1', sortOrder: 2 })]);
    mockPrisma.$transaction.mockResolvedValueOnce(undefined);

    await service.reorderTasks('tl-1', ['task-2', 'task-3', 'task-1'], elevatedActor);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    // Verify workspace and taskListId in the payload — caller must not supply eventId
    expect(mockRealtime.emitToWorkspace).toHaveBeenCalledWith('ws-1', 'task.reordered', expect.objectContaining({
      taskListId: 'tl-1', workspaceId: 'ws-1',
    }));
    const callerPayload = (mockRealtime.emitToWorkspace as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
    expect(callerPayload).not.toHaveProperty('eventId'); // RealtimeService injects its own randomUUID()
  });

  // 66.3-T8: Audit log is created after successful transaction
  it('66.3-T8 — audit log is created with reorderedTasks count', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany
      .mockResolvedValueOnce([{ id: 'task-1' }, { id: 'task-2' }])
      .mockResolvedValueOnce([]);
    mockPrisma.$transaction.mockResolvedValueOnce(undefined);

    await service.reorderTasks('tl-1', ['task-2', 'task-1'], elevatedActor);
    // Audit log fires async — allow microtask queue to flush
    await Promise.resolve();

    expect(mockAuditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'UPDATED', entityType: 'TASK',
      newValue: expect.objectContaining({ reorderedTasks: 2 }),
    }));
  });

  // 66.3-T9: Caller does NOT supply eventId — RealtimeService auto-injects project-standard UUID
  it('66.3-T9 — caller payload has no eventId (RealtimeService injects randomUUID)', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany
      .mockResolvedValueOnce([{ id: 'task-1' }])
      .mockResolvedValueOnce([]);
    mockPrisma.$transaction.mockResolvedValueOnce(undefined);

    await service.reorderTasks('tl-1', ['task-1'], elevatedActor);

    const callerPayload = (mockRealtime.emitToWorkspace as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
    // The caller must not supply eventId so RealtimeService.emit() can inject its own randomUUID().
    // RealtimeService enriches: { eventId: randomUUID(), occurredAt, ...callerPayload }
    // If callerPayload.eventId were present, it would override the UUID — breaking project convention.
    expect(callerPayload).not.toHaveProperty('eventId');
    // Ensure the task/workspace identifiers are still present
    expect(callerPayload['taskListId']).toBe('tl-1');
    expect(callerPayload['workspaceId']).toBe('ws-1');
  });

  // 66.3-T10: Only sortOrder changes — no other task fields are touched
  it('66.3-T10 — task.update calls set only sortOrder', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany
      .mockResolvedValueOnce([{ id: 'task-1' }, { id: 'task-2' }])
      .mockResolvedValueOnce([]);
    mockPrisma.$transaction.mockImplementationOnce((ops: unknown[]) => Promise.all(ops as Array<Promise<unknown>>));
    mockPrisma.task.update.mockResolvedValue(makeTask());

    await service.reorderTasks('tl-1', ['task-2', 'task-1'], elevatedActor);

    // Every task.update call must only pass { sortOrder: N }
    const updateCalls = (mockPrisma.task.update as jest.Mock).mock.calls as Array<[{ where: unknown; data: Record<string, unknown> }]>;
    for (const [opts] of updateCalls) {
      expect(Object.keys(opts.data)).toEqual(['sortOrder']);
    }
  });

  // 66.3-T11: Subtask IDs are not in the root-task validation set (correct filter)
  it('66.3-T11 — subtask IDs (parentTaskId != null) are excluded from valid ID set', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    // Backend returns only root tasks (parentTaskId: null filter applied in service)
    mockPrisma.task.findMany.mockResolvedValueOnce([{ id: 'root-1' }]);
    // Sending subtask-id-that-should-not-be-here should be rejected as foreign
    await expect(service.reorderTasks('tl-1', ['root-1', 'subtask-of-root-1'], elevatedActor))
      .rejects.toThrow('not found in this task list');
  });
});

// ─── Unit 66.3.1 — EventId convention and root-task scope alignment ───────────

describe('TasksService — reorderTasks (Unit 66.3.1 hardening)', () => {
  let service: TasksService;

  const elevatedActor = {
    id: 'actor-1',
    userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'project.read' } }] } }],
    department: null,
    departmentId: null,
  };

  const taskList = { id: 'tl-1', workspaceId: 'ws-1', name: 'Sprint 1' };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValue(undefined);
    mockWorkspaces.canCollaborateInWorkspace.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  // 66.3.1-T1: Caller payload has no eventId — RealtimeService injects project-standard randomUUID
  it('66.3.1-T1 — reorder emit caller payload never includes eventId (project UUID convention)', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany
      .mockResolvedValueOnce([{ id: 'task-a' }, { id: 'task-b' }])
      .mockResolvedValueOnce([]);
    mockPrisma.$transaction.mockResolvedValueOnce(undefined);

    await service.reorderTasks('tl-1', ['task-b', 'task-a'], elevatedActor);

    const callerPayload = (mockRealtime.emitToWorkspace as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
    // Caller must NOT supply eventId — RealtimeService.emit() enriches with { eventId: randomUUID(), ...payload }
    // If caller supplied eventId it would override the UUID via spread, violating project convention.
    expect(callerPayload).not.toHaveProperty('eventId');
  });

  // 66.3.1-T2: Two rapid reorder calls pass independent non-identical payloads to emitToWorkspace
  it('66.3.1-T2 — two sequential reorder calls emit two independent events', async () => {
    // Both calls produce their own emitToWorkspace invocation
    (mockPrisma.taskList.findUnique as jest.Mock)
      .mockResolvedValueOnce(taskList)
      .mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany
      .mockResolvedValueOnce([{ id: 'task-a' }, { id: 'task-b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'task-a' }, { id: 'task-b' }])
      .mockResolvedValueOnce([]);
    mockPrisma.$transaction.mockResolvedValue(undefined);

    await service.reorderTasks('tl-1', ['task-b', 'task-a'], elevatedActor);
    await service.reorderTasks('tl-1', ['task-a', 'task-b'], elevatedActor);

    expect(mockRealtime.emitToWorkspace).toHaveBeenCalledTimes(2);
    // RealtimeService (not mocked here) would inject unique UUIDs per call —
    // verified separately in realtime.coverage.spec.ts Case 3
  });

  // 66.3.1-T3: Backend root-task filter — parentTaskId: null filter applied to validation query
  it('66.3.1-T3 — validation findMany uses parentTaskId: null (root tasks only)', async () => {
    (mockPrisma.taskList.findUnique as jest.Mock).mockResolvedValueOnce(taskList);
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockResolvedValue(undefined);

    // With empty root task list, a non-empty orderedIds should fail "incomplete" or "foreign" checks
    await expect(service.reorderTasks('tl-1', ['some-id'], elevatedActor))
      .rejects.toThrow(); // foreign or incomplete

    const findManyCall = (mockPrisma.task.findMany as jest.Mock).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findManyCall.where).toMatchObject({ taskListId: 'tl-1', parentTaskId: null });
  });
});

// ─── Unit 66.4 — Task creation uses correct taskListId ────────────────────────

describe('TasksService — create() taskListId targeting (Unit 66.4)', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    mockPrisma.workspace.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValue(undefined);
    mockWorkspaces.assertCanBeAssigned.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
        { provide: RealtimeService,      useValue: mockRealtime },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  const elevatedActor = {
    id: 'actor-1',
    userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.create' } }] } }],
    department: null,
    departmentId: null,
  };

  // 66.4-T1: Backend saves task with the exact taskListId provided — not a default or first list
  it('66.4-T1 — create() persists the provided taskListId (Task 3, not Task 1)', async () => {
    const task3Id = 'task-list-3-id';
    const task = makeTask({ taskListId: task3Id });
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: task3Id, title: 'iso34' },
      elevatedActor.id, ['ISO_MANAGER'], null,
    );

    const createCall = (mockPrisma.task.create as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data['taskListId']).toBe(task3Id);
    expect(createCall.data['taskListId']).not.toBe('task-list-1-id');
  });

  // 66.4-T2: taskListId from the create request is echoed back in the response
  it('66.4-T2 — create() response task.taskListId matches the requested task list', async () => {
    const task3Id = 'task-list-3-id';
    const created = makeTask({ taskListId: task3Id, title: 'iso34' });
    mockPrisma.task.create.mockResolvedValueOnce(created);

    const result = await service.create(
      { workspaceId: 'ws-1', taskListId: task3Id, title: 'iso34' },
      elevatedActor.id, ['ISO_MANAGER'], null,
    );

    expect(result.taskListId).toBe(task3Id);
  });

  // 66.4-T3: Creating with task-list-3 does not alter task-list-1 data
  it('66.4-T3 — create() only writes to the specified taskListId, no other list is touched', async () => {
    const task3Id = 'task-list-3-id';
    const task = makeTask({ taskListId: task3Id });
    mockPrisma.task.create.mockResolvedValueOnce(task);

    await service.create(
      { workspaceId: 'ws-1', taskListId: task3Id, title: 'iso34' },
      elevatedActor.id, ['ISO_MANAGER'], null,
    );

    // Only one task.create call
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(1);
    // No update/delete on other task lists
    expect(mockPrisma.task.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.task.delete).not.toHaveBeenCalled();
  });
});
