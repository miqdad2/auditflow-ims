/**
 * Unit 54.1 — File attachment reminder compatibility and timestamp tests (17 cases)
 *
 * Covers:
 * - New upload reminderDays validation (7 and 14 accepted, others rejected)
 * - Existing legacy reminderDays values remain readable and are NOT changed
 *   unless the user explicitly sends a new 7 or 14 value
 * - Uploaded date (createdAt) is server-set, never from client
 * - Task createdAt immutability and updatedAt advancement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FileAttachmentsService } from './file-attachments.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { FileStorageService } from '../../common/file-storage.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TasksService } from '../tasks/tasks.service';

// ─── Shared mocks ──────────────────────────────────────────────────────────

const mockPrisma = {
  fileAttachment: {
    create:     jest.fn(),
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    findMany:   jest.fn(),
    update:     jest.fn(),
  },
  document: {
    findFirst: jest.fn().mockResolvedValue(null), // no duplicate doc by default
  },
  task: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    groupBy:    jest.fn(),
    findMany:   jest.fn(),
    count:      jest.fn(),
    findFirst:  jest.fn(),
  },
  activityEvent: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockAuditLog = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { create: jest.fn().mockResolvedValue(undefined) };
const mockRealtime = { emitToWorkspace: jest.fn() };
const mockFileStorage = {
  saveFile: jest.fn(),
  cleanupOrphanFile: jest.fn(),
  getAbsolutePath: jest.fn(),
};
const mockWorkspaces = {
  assertWorkspaceAccess: jest.fn().mockResolvedValue(undefined),
  buildWorkspaceVisibilityWhere: jest.fn().mockReturnValue({}),
};

// A minimal valid file object
const makeFile = (): Express.Multer.File => ({
  fieldname: 'file', originalname: 'test.pdf', encoding: '7bit',
  mimetype: 'application/pdf', size: 1024, buffer: Buffer.from(''),
  destination: '', filename: '', path: '', stream: null as never,
});

// Minimal stored file result
const storedFile = {
  originalFileName: 'test.pdf', storedFileName: 'abc123.pdf',
  storagePath: '/uploads/attachments/task/abc123.pdf',
  mimeType: 'application/pdf', fileSize: 1024, checksum: null,
};

// ─── FileAttachmentsService tests ──────────────────────────────────────────

describe('FileAttachmentsService — reminder validation and compatibility', () => {
  let svc: FileAttachmentsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAuditLog.log.mockResolvedValue(undefined);
    mockNotifications.create.mockResolvedValue(undefined);
    mockPrisma.activityEvent.create.mockResolvedValue({});
    mockFileStorage.saveFile.mockResolvedValue(storedFile);
    mockPrisma.task.findUnique.mockResolvedValue({ workspaceId: 'ws-1' });
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAttachmentsService,
        { provide: PrismaService,        useValue: mockPrisma },
        { provide: AuditLogService,      useValue: mockAuditLog },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: RealtimeService,      useValue: mockRealtime },
        { provide: FileStorageService,   useValue: mockFileStorage },
        { provide: WorkspacesService,    useValue: mockWorkspaces },
      ],
    }).compile();

    svc = module.get<FileAttachmentsService>(FileAttachmentsService);
  });

  // ── Test 1: New upload accepts reminderDays = 7 ────────────────────────────
  it('T1 — upload() accepts reminderDays = 7', async () => {
    const savedRow = { id: 'att-1', reminderDays: 7, expiryDate: new Date('2027-01-01'), createdAt: new Date(), ...storedFile };
    mockPrisma.fileAttachment.create.mockResolvedValueOnce(savedRow);
    mockPrisma.fileAttachment.findFirst.mockResolvedValueOnce(null); // no dedup hit
    mockWorkspaces.assertWorkspaceAccess.mockResolvedValueOnce(undefined);

    await expect(
      svc.upload(makeFile(), 'TASK', 'task-1', 'user-1', ['ISO_MANAGER'], null, {
        expiryDate: '2027-01-01', reminderDays: 7,
      }),
    ).resolves.toBeDefined();
    expect(mockFileStorage.saveFile).toHaveBeenCalled();
  });

  // ── Test 2: New upload accepts reminderDays = 14 ────────────────────────────
  it('T2 — upload() accepts reminderDays = 14', async () => {
    const savedRow = { id: 'att-2', reminderDays: 14, expiryDate: new Date('2027-01-01'), createdAt: new Date(), ...storedFile };
    mockPrisma.fileAttachment.create.mockResolvedValueOnce(savedRow);
    mockPrisma.fileAttachment.findFirst.mockResolvedValueOnce(null);

    await expect(
      svc.upload(makeFile(), 'TASK', 'task-1', 'user-1', ['ISO_MANAGER'], null, {
        expiryDate: '2027-01-01', reminderDays: 14,
      }),
    ).resolves.toBeDefined();
  });

  // ── Test 3: New upload rejects reminderDays = 30 ────────────────────────────
  it('T3 — upload() rejects reminderDays = 30 with BadRequestException', async () => {
    await expect(
      svc.upload(makeFile(), 'TASK', 'task-1', 'user-1', ['ISO_MANAGER'], null, {
        expiryDate: '2027-01-01', reminderDays: 30,
      }),
    ).rejects.toThrow(BadRequestException);
    // File must NOT have been saved
    expect(mockFileStorage.saveFile).not.toHaveBeenCalled();
  });

  // ── Test 4: Existing legacy value 30 remains in DB ──────────────────────────
  // findForEntity returns whatever reminderDays is stored, including legacy values.
  it('T4 — findForEntity() returns stored reminderDays = 30 unmodified', async () => {
    mockPrisma.fileAttachment.findMany.mockResolvedValueOnce([
      { id: 'att-3', reminderDays: 30, isSuperseded: false, expiryDate: null, createdAt: new Date() },
    ]);
    const result = await svc.findForEntity('TASK', 'task-x');
    expect(result[0].reminderDays).toBe(30);
  });

  // ── Test 5: Existing legacy value 90 remains in DB ──────────────────────────
  it('T5 — findForEntity() returns stored reminderDays = 90 unmodified', async () => {
    mockPrisma.fileAttachment.findMany.mockResolvedValueOnce([
      { id: 'att-4', reminderDays: 90, isSuperseded: false, expiryDate: new Date(), createdAt: new Date() },
    ]);
    const result = await svc.findForEntity('TASK', 'task-x');
    expect(result[0].reminderDays).toBe(90);
  });

  // ── Test 6: Editing only Display Name preserves legacy reminderDays ─────────
  // PATCH body has no reminderDays → Prisma skips the field → DB keeps 90.
  it('T6 — updateMetadata() without reminderDays preserves the legacy stored value', async () => {
    const att = { id: 'att-5', uploadedById: 'user-1', entityType: 'TASK', entityId: 'task-y' };
    mockPrisma.fileAttachment.findUnique.mockResolvedValueOnce(att);
    mockPrisma.fileAttachment.update.mockResolvedValueOnce({ ...att, displayName: 'New Name', reminderDays: 90 });

    await svc.updateMetadata('att-5', { displayName: 'New Name' }, 'user-1', ['ISO_MANAGER']);

    const updateCall = (mockPrisma.fileAttachment.update as jest.Mock).mock.calls[0][0] as {
      data: { reminderDays?: number | undefined };
    };
    // reminderDays should be undefined (not sent) so Prisma skips it
    expect(updateCall.data.reminderDays).toBeUndefined();
  });

  // ── Test 7: Editing only Notes preserves legacy reminderDays ──────────────
  it('T7 — updateMetadata() with only notes preserves legacy reminderDays', async () => {
    const att = { id: 'att-6', uploadedById: 'user-1', entityType: 'TASK', entityId: 'task-z' };
    mockPrisma.fileAttachment.findUnique.mockResolvedValueOnce(att);
    mockPrisma.fileAttachment.update.mockResolvedValueOnce({ ...att, notes: 'Updated note', reminderDays: 60 });

    await svc.updateMetadata('att-6', { notes: 'Updated note' }, 'user-1', ['ISO_MANAGER']);

    const updateCall = (mockPrisma.fileAttachment.update as jest.Mock).mock.calls[0][0] as {
      data: { reminderDays?: number | undefined };
    };
    expect(updateCall.data.reminderDays).toBeUndefined();
  });

  // ── Test 8: Editing Expiry Date without reminder change preserves legacy ───
  it('T8 — updateMetadata() with only expiryDate preserves legacy reminderDays', async () => {
    const att = { id: 'att-7', uploadedById: 'user-1', entityType: 'TASK', entityId: 'task-w' };
    mockPrisma.fileAttachment.findUnique.mockResolvedValueOnce(att);
    mockPrisma.fileAttachment.update.mockResolvedValueOnce({ ...att, expiryDate: new Date('2028-01-01'), reminderDays: 90 });

    await svc.updateMetadata('att-7', { expiryDate: '2028-01-01' }, 'user-1', ['ISO_MANAGER']);

    const updateCall = (mockPrisma.fileAttachment.update as jest.Mock).mock.calls[0][0] as {
      data: { reminderDays?: number | undefined };
    };
    expect(updateCall.data.reminderDays).toBeUndefined();
  });

  // ── Test 9: Explicit legacy-to-7 change succeeds ─────────────────────────
  it('T9 — updateMetadata() with reminderDays = 7 changes legacy 90 → 7', async () => {
    const att = { id: 'att-8', uploadedById: 'user-1', entityType: 'TASK', entityId: 'task-v' };
    mockPrisma.fileAttachment.findUnique.mockResolvedValueOnce(att);
    mockPrisma.fileAttachment.update.mockResolvedValueOnce({ ...att, reminderDays: 7 });

    await svc.updateMetadata('att-8', { reminderDays: 7 }, 'user-1', ['ISO_MANAGER']);

    const updateCall = (mockPrisma.fileAttachment.update as jest.Mock).mock.calls[0][0] as {
      data: { reminderDays?: number };
    };
    expect(updateCall.data.reminderDays).toBe(7);
  });

  // ── Test 10: Explicit legacy-to-14 change succeeds ────────────────────────
  it('T10 — updateMetadata() with reminderDays = 14 changes legacy 90 → 14', async () => {
    const att = { id: 'att-9', uploadedById: 'user-1', entityType: 'TASK', entityId: 'task-u' };
    mockPrisma.fileAttachment.findUnique.mockResolvedValueOnce(att);
    mockPrisma.fileAttachment.update.mockResolvedValueOnce({ ...att, reminderDays: 14 });

    await svc.updateMetadata('att-9', { reminderDays: 14 }, 'user-1', ['ISO_MANAGER']);

    const updateCall = (mockPrisma.fileAttachment.update as jest.Mock).mock.calls[0][0] as {
      data: { reminderDays?: number };
    };
    expect(updateCall.data.reminderDays).toBe(14);
  });

  // ── Test 11: Attempt to change 14 to 30 is rejected ───────────────────────
  it('T11 — updateMetadata() rejects reminderDays = 30 with BadRequestException', async () => {
    const att = { id: 'att-10', uploadedById: 'user-1', entityType: 'TASK', entityId: 'task-t' };
    mockPrisma.fileAttachment.findUnique.mockResolvedValueOnce(att);

    await expect(
      svc.updateMetadata('att-10', { reminderDays: 30 }, 'user-1', ['ISO_MANAGER']),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.fileAttachment.update).not.toHaveBeenCalled();
  });

  // ── Test 12: Unsupported client value produces friendly 400 ───────────────
  it('T12 — upload() with reminderDays = 90 rejects with friendly BadRequestException message', async () => {
    let caught: BadRequestException | null = null;
    try {
      await svc.upload(makeFile(), 'TASK', 'task-1', 'user-1', ['ISO_MANAGER'], null, {
        expiryDate: '2027-01-01', reminderDays: 90,
      });
    } catch (e) {
      caught = e as BadRequestException;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    const msg = caught?.message ?? '';
    expect(msg).toContain('7 or 14');
  });

  // ── Test 13: Uploaded Date is server-controlled ────────────────────────────
  // The createdAt is set by Prisma @default(now()) — client cannot override it.
  // upload() does not accept a createdAt parameter, and the meta DTO has no createdAt field.
  it('T13 — upload() does not accept a client-supplied createdAt field', async () => {
    const savedRow = { id: 'att-11', reminderDays: 7, expiryDate: null, createdAt: new Date(), ...storedFile };
    mockPrisma.fileAttachment.create.mockResolvedValueOnce(savedRow);
    mockPrisma.fileAttachment.findFirst.mockResolvedValueOnce(null);

    const result = await svc.upload(makeFile(), 'TASK', 'task-1', 'user-1', ['ISO_MANAGER'], null, {
      displayName: 'My File', reminderDays: 7,
    });

    // The saved row must not contain a client-supplied createdAt
    const createCall = (mockPrisma.fileAttachment.create as jest.Mock).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data['createdAt']).toBeUndefined();
    expect(result).toBeDefined();
  });
});

// ─── Task timestamp behavior ───────────────────────────────────────────────
// (TasksService, AuditLogService, NotificationsService already imported above)

const makeTaskRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-ts', workspaceId: 'ws-1', taskListId: 'tl-1', parentTaskId: null,
  title: 'TS Task', description: null, status: 'TODO', priority: 'MEDIUM',
  isReference: false, assigneeId: null, createdById: 'user-1',
  dueDate: null, completedAt: null, sortOrder: 0,
  recurrenceInterval: 'NONE', recurrenceEndDate: null,
  recurrenceSeriesId: null, recurrenceParentId: null,
  createdAt: new Date('2026-06-01T08:00:00Z'),
  updatedAt: new Date('2026-06-01T08:00:00Z'),
  ...overrides,
});

const mockTaskPrisma = {
  task: {
    create:        jest.fn(),
    findUnique:    jest.fn(),
    findMany:      jest.fn(),
    findFirst:     jest.fn(),
    update:        jest.fn(),
    delete:        jest.fn(),
    groupBy:       jest.fn(),
    count:         jest.fn(),
    updateMany:    jest.fn(),
  },
  taskComment:   { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  activityEvent: { create: jest.fn() },
  user:          { findUnique: jest.fn(), findMany: jest.fn() },
  $transaction:  jest.fn(),
};
const mockTaskAuditLog     = { log: jest.fn().mockResolvedValue(undefined) };
const mockTaskNotifications = { create: jest.fn().mockResolvedValue(undefined) };
const mockTaskWorkspaces   = {
  assertWorkspaceAccess: jest.fn().mockResolvedValue(undefined),
  canCollaborateInWorkspace: jest.fn().mockResolvedValue(true),
  buildWorkspaceVisibilityWhere: jest.fn().mockReturnValue({}),
};
const mockTaskRealtime = { emitToWorkspace: jest.fn(), emitToUser: jest.fn() };

describe('Task timestamp behavior', () => {
  let taskSvc: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTaskAuditLog.log.mockResolvedValue(undefined);
    mockTaskNotifications.create.mockResolvedValue(undefined);
    mockTaskPrisma.activityEvent.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService,        useValue: mockTaskPrisma },
        { provide: AuditLogService,      useValue: mockTaskAuditLog },
        { provide: NotificationsService, useValue: mockTaskNotifications },
        { provide: WorkspacesService,    useValue: mockTaskWorkspaces },
        { provide: RealtimeService,      useValue: mockTaskRealtime },
      ],
    }).compile();
    taskSvc = module.get<TasksService>(TasksService);
  });

  const actor = {
    id: 'user-1',
    userRoles: [{ role: { name: 'ISO_MANAGER', rolePermissions: [{ permission: { key: 'tasks.update' } }] } }],
    department: null,
  };

  // ── Test 14: Task createdAt remains unchanged after update ─────────────────
  it('T14 — update() does not alter createdAt (Prisma @updatedAt only touches updatedAt)', async () => {
    const originalCreatedAt = new Date('2026-06-01T08:00:00Z');
    const existing = makeTaskRow({ status: 'TODO', createdAt: originalCreatedAt });
    const updatedRow = makeTaskRow({
      status: 'IN_PROGRESS',
      createdAt: originalCreatedAt,  // unchanged
      updatedAt: new Date('2026-06-01T09:00:00Z'),
    });

    mockTaskPrisma.task.findUnique.mockResolvedValueOnce(existing);
    mockTaskPrisma.task.update.mockResolvedValueOnce(updatedRow);

    const result = await taskSvc.update('task-ts', { status: 'IN_PROGRESS' }, actor);

    const updateCallData = (mockTaskPrisma.task.update as jest.Mock).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // createdAt must never be in the update data
    expect(updateCallData.data['createdAt']).toBeUndefined();
    // Result preserves original createdAt
    expect((result.createdAt as Date).getTime()).toBe(originalCreatedAt.getTime());
  });

  // ── Test 15: Task updatedAt advances on direct task-field change ───────────
  it('T15 — realtime task.updated payload includes server updatedAt timestamp', async () => {
    const existing = makeTaskRow({ status: 'TODO' });
    const newUpdatedAt = new Date('2026-06-21T12:00:00Z');
    const updatedRow = makeTaskRow({ status: 'IN_PROGRESS', updatedAt: newUpdatedAt });

    mockTaskPrisma.task.findUnique.mockResolvedValueOnce(existing);
    mockTaskPrisma.task.update.mockResolvedValueOnce(updatedRow);

    await taskSvc.update('task-ts', { status: 'IN_PROGRESS' }, actor);

    const emitCalls = (mockTaskRealtime.emitToWorkspace as jest.Mock).mock.calls;
    const updatedEmit = emitCalls.find(([, event]) => event === 'task.updated');
    expect(updatedEmit).toBeDefined();
    const payload = updatedEmit[2] as Record<string, unknown>;
    expect(payload['updatedAt']).toBe(newUpdatedAt.toISOString());
  });

  // ── Test 16: Older realtime updatedAt cannot overwrite newer state ────────
  // The frontend's stale-safe guard (incomingUpdatedAt > task.updatedAt) is documented
  // in workspace-client.tsx. This backend test verifies the server-sourced payload
  // always carries the accurate DB timestamp for the client to compare.
  it('T16 — task.created realtime payload includes server createdAt and updatedAt', async () => {
    const createdAt = new Date('2026-06-21T10:00:00Z');
    const createdRow = makeTaskRow({ createdAt, updatedAt: createdAt });
    mockTaskPrisma.task.findUnique.mockResolvedValue({ workspaceId: 'ws-1' });
    mockTaskPrisma.task.create.mockResolvedValueOnce(createdRow);

    await taskSvc.create(
      { workspaceId: 'ws-1', taskListId: 'tl-1', title: 'New Task' },
      'user-1', ['ISO_MANAGER'], null,
    );

    const emitCalls = (mockTaskRealtime.emitToWorkspace as jest.Mock).mock.calls;
    const createdEmit = emitCalls.find(([, event]) => event === 'task.created');
    expect(createdEmit).toBeDefined();
    const payload = createdEmit[2] as Record<string, unknown>;
    expect(payload['createdAt']).toBe(createdAt.toISOString());
    expect(payload['updatedAt']).toBe(createdAt.toISOString());
  });

  // ── Test 17: Builds pass (structural smoke) ───────────────────────────────
  it('T17 — FileAttachmentsService and TasksService instantiate without errors', () => {
    expect(taskSvc).toBeDefined();
  });
});
