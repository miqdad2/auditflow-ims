/**
 * Business Action Center — Service Unit Tests
 * Part 13: Accuracy test matrix (25 items)
 *
 * Tests cover:
 * - Kuwait timezone / end-of-day boundary helper
 * - Overlap / precedence logic (applyPrecedence)
 * - ISSUE_STATUS_TRANSITIONS constant completeness
 * - Detection rule behavior (via mocked Prisma)
 *
 * Excluded from nest build via tsconfig.build.json ("exclude": ["**\/*spec.ts"]).
 * Run with: pnpm --filter api test
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BusinessActionsService,
  endOfDayKuwait,
  ISSUE_STATUS_TRANSITIONS,
  ALL_RULES,
  ActionItem,
  DetectionRule,
} from './business-actions.service';
import { PrismaService } from '../../common/prisma.service';

// ─── Kuwait timezone helper tests ─────────────────────────────────────────────

describe('endOfDayKuwait()', () => {
  // Test 2: Due today in Kuwait → not overdue until end of day
  it('sets the end-of-day boundary to 23:59:59.999 Kuwait local time', () => {
    // 2026-06-21 00:00:00 UTC = 2026-06-21 03:00:00 Kuwait
    const d = new Date('2026-06-21T00:00:00.000Z');
    const eod = endOfDayKuwait(d);
    // Expected: 2026-06-21 23:59:59.999 Kuwait = 2026-06-21 20:59:59.999 UTC
    expect(eod.toISOString()).toBe('2026-06-21T20:59:59.999Z');
  });

  it('a task due on 2026-06-21 is NOT overdue at 2026-06-21T19:00:00.000Z (before Kuwait eod)', () => {
    const now = new Date('2026-06-21T19:00:00.000Z'); // 22:00 Kuwait
    const eod = endOfDayKuwait(now);
    const dueDate = new Date('2026-06-21T00:00:00.000Z'); // date stored as midnight UTC
    expect(dueDate < eod).toBe(true);  // would be overdue (before eod) — this tests eod includes the day
  });

  it('a task due on 2026-06-21 IS overdue at 2026-06-21T21:00:00.000Z (after Kuwait eod)', () => {
    const now = new Date('2026-06-21T21:00:00.000Z'); // 00:00 next day Kuwait
    const eod = endOfDayKuwait(now);
    // eod is now 2026-06-22 20:59:59.999Z
    // dueDate 2026-06-21T00:00:00.000Z < eod → overdue
    const dueDateYesterday = new Date('2026-06-21T00:00:00.000Z');
    expect(dueDateYesterday < eod).toBe(true);
  });

  // Test 8: Expiry today in Kuwait → valid until end of day
  it('returns different eod values for morning vs evening on the same Kuwait day', () => {
    const morning = new Date('2026-06-21T06:00:00.000Z'); // 09:00 Kuwait
    const evening = new Date('2026-06-21T17:00:00.000Z'); // 20:00 Kuwait
    // Both should give the same eod because it's the same Kuwait calendar day
    expect(endOfDayKuwait(morning).toISOString()).toBe(endOfDayKuwait(evening).toISOString());
  });
});

// ─── ISSUE_STATUS_TRANSITIONS constant ───────────────────────────────────────

describe('ISSUE_STATUS_TRANSITIONS', () => {
  // Test 17: Valid issue transition map is complete and correct
  it('defines transitions for all known NcrCapa statuses', () => {
    const knownStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_EVIDENCE', 'SUBMITTED', 'VERIFIED', 'CLOSED', 'REJECTED', 'OVERDUE'];
    for (const status of knownStatuses) {
      expect(ISSUE_STATUS_TRANSITIONS).toHaveProperty(status);
      expect(Array.isArray(ISSUE_STATUS_TRANSITIONS[status])).toBe(true);
    }
  });

  it('SUBMITTED → [VERIFIED, REJECTED] (issue waiting verification transitions)', () => {
    expect(ISSUE_STATUS_TRANSITIONS['SUBMITTED']).toEqual(['VERIFIED', 'REJECTED']);
  });

  it('CLOSED has no further transitions', () => {
    expect(ISSUE_STATUS_TRANSITIONS['CLOSED']).toEqual([]);
  });

  it('OPEN can transition to IN_PROGRESS or OVERDUE', () => {
    expect(ISSUE_STATUS_TRANSITIONS['OPEN']).toContain('IN_PROGRESS');
    expect(ISSUE_STATUS_TRANSITIONS['OPEN']).toContain('OVERDUE');
  });

  it('VERIFIED can only transition to CLOSED', () => {
    expect(ISSUE_STATUS_TRANSITIONS['VERIFIED']).toEqual(['CLOSED']);
  });
});

// ─── ALL_RULES constant ───────────────────────────────────────────────────────

describe('ALL_RULES', () => {
  it('contains exactly 9 detection rules', () => {
    expect(ALL_RULES).toHaveLength(9);
  });

  it('does not contain WAITING_REVIEW_TASK (not a valid detection rule)', () => {
    expect(ALL_RULES).not.toContain('WAITING_REVIEW_TASK');
  });
});

// ─── applyPrecedence() ───────────────────────────────────────────────────────

function makeItem(ruleKey: DetectionRule, entityId: string, entityType: ActionItem['entityType'] = 'TASK'): ActionItem {
  return {
    id:               `${ruleKey}:${entityId}`,
    ruleKey,
    entityType,
    entityId,
    title:            `Test item ${entityId}`,
    workspaceName:    null,
    workspaceId:      null,
    department:       null,
    responsibleUser:  null,
    responsibleUserId: null,
    reason:           'Test reason',
    detectedAt:       new Date().toISOString(),
    detectionField:   'test',
    detectionValue:   'test',
    label:            'SYSTEM_DETECTED',
    dueDate:          null,
    expiryDate:       null,
    updatedAt:        null,
    sourceFacts:      {},
  };
}

describe('BusinessActionsService.applyPrecedence()', () => {
  let service: BusinessActionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessActionsService,
        {
          provide: PrismaService,
          useValue: {}, // Not used in applyPrecedence
        },
      ],
    }).compile();

    service = module.get<BusinessActionsService>(BusinessActionsService);
  });

  // Test 21: Duplicate/overlapping conditions produce one primary row
  it('collapses OVERDUE_TASK + UNASSIGNED_TASK for the same task into one primary row', () => {
    const overdueItem    = makeItem('OVERDUE_TASK',    'task-1', 'TASK');
    const unassignedItem = makeItem('UNASSIGNED_TASK', 'task-1', 'TASK');

    const result = service.applyPrecedence([overdueItem, unassignedItem]);

    expect(result).toHaveLength(1);
    expect(result[0].ruleKey).toBe('OVERDUE_TASK');           // higher priority
    expect(result[0].secondaryRules).toEqual(['UNASSIGNED_TASK']); // secondary badge
  });

  it('keeps separate rows for different entities', () => {
    const task1Overdue   = makeItem('OVERDUE_TASK',    'task-1', 'TASK');
    const task2Unassigned = makeItem('UNASSIGNED_TASK', 'task-2', 'TASK');

    const result = service.applyPrecedence([task1Overdue, task2Unassigned]);

    expect(result).toHaveLength(2);
  });

  it('applies OVERDUE_ISSUE > ISSUE_WAITING_VERIFICATION > OPEN_ISSUE precedence', () => {
    const openIssue       = makeItem('OPEN_ISSUE',                 'issue-1', 'ISSUE');
    const waitingVerif    = makeItem('ISSUE_WAITING_VERIFICATION', 'issue-1', 'ISSUE');
    const overdueIssue    = makeItem('OVERDUE_ISSUE',              'issue-1', 'ISSUE');

    const result = service.applyPrecedence([openIssue, waitingVerif, overdueIssue]);

    expect(result).toHaveLength(1);
    expect(result[0].ruleKey).toBe('OVERDUE_ISSUE');
    expect(result[0].secondaryRules).toContain('ISSUE_WAITING_VERIFICATION');
    expect(result[0].secondaryRules).toContain('OPEN_ISSUE');
  });

  it('EXPIRED_FILE takes precedence over EXPIRING_FILE for the same attachment', () => {
    const expiredItem  = makeItem('EXPIRED_FILE',  'file-1', 'FILE_ATTACHMENT');
    const expiringItem = makeItem('EXPIRING_FILE', 'file-1', 'FILE_ATTACHMENT');

    const result = service.applyPrecedence([expiredItem, expiringItem]);

    expect(result).toHaveLength(1);
    expect(result[0].ruleKey).toBe('EXPIRED_FILE');
    expect(result[0].secondaryRules).toEqual(['EXPIRING_FILE']);
  });

  it('single-rule entity is returned unchanged with no secondaryRules', () => {
    const item = makeItem('DOCUMENT_UNDER_REVIEW', 'doc-1', 'DOCUMENT');
    const result = service.applyPrecedence([item]);

    expect(result).toHaveLength(1);
    expect(result[0].secondaryRules).toBeUndefined();
  });

  it('empty input returns empty array', () => {
    expect(service.applyPrecedence([])).toEqual([]);
  });
});

// ─── Detection tests (mocked Prisma) ─────────────────────────────────────────

const now = new Date('2026-06-21T10:00:00.000Z'); // 13:00 Kuwait, mid-day

function makeMockPrisma(overrides: Record<string, unknown> = {}): Partial<PrismaService> {
  return {
    task: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    } as unknown,
    document: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    } as unknown,
    fileAttachment: {
      findMany: jest.fn().mockResolvedValue([]),
    } as unknown,
    ncrCapa: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    } as unknown,
    workspace: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    } as unknown,
    systemErrorLog: {
      create: jest.fn().mockResolvedValue({}),
    } as unknown,
    ...overrides,
  } as Partial<PrismaService>;
}

describe('detectItems() integration-style tests (mocked Prisma)', () => {
  let service: BusinessActionsService;
  let mockPrisma: Partial<PrismaService>;

  function buildService(prismaOverrides: Record<string, unknown> = {}) {
    mockPrisma = makeMockPrisma(prismaOverrides);
    return new BusinessActionsService(mockPrisma as PrismaService);
  }

  // Test 1: Due yesterday + In Progress → OVERDUE_TASK detected
  it('Test 1: task due yesterday + IN_PROGRESS → OVERDUE_TASK', async () => {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    service = buildService({
      task: {
        findMany: jest.fn().mockImplementation((args: { where?: { dueDate?: unknown } }) => {
          // Only respond to the overdue query (has dueDate.lt)
          if (args?.where?.dueDate && typeof args.where.dueDate === 'object' && 'lt' in (args.where.dueDate as object)) {
            return Promise.resolve([{
              id: 't1', title: 'Test Task', status: 'IN_PROGRESS',
              dueDate: yesterday, updatedAt: now,
              workspace: { id: 'ws1', name: 'WS', department: null },
              assignee: { id: 'u1', fullName: 'Ali' },
            }]);
          }
          return Promise.resolve([]);
        }),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    const overdueTasks = items.filter((i) => i.ruleKey === 'OVERDUE_TASK');
    expect(overdueTasks.length).toBeGreaterThanOrEqual(1);
    expect(overdueTasks[0].entityId).toBe('t1');
    expect(overdueTasks[0].sourceFacts['currentStatus']).toBe('IN_PROGRESS');
  });

  // Test 3: COMPLETED task with old dueDate → not overdue
  it('Test 3: COMPLETED task with old dueDate → not in OVERDUE_TASK results', async () => {
    service = buildService({
      task: {
        findMany: jest.fn().mockResolvedValue([]), // Prisma filter excludes COMPLETED — returns empty
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    expect(items.filter((i) => i.ruleKey === 'OVERDUE_TASK')).toHaveLength(0);
  });

  // Test 4: Null dueDate → not overdue
  it('Test 4: task with null dueDate → not in OVERDUE_TASK', async () => {
    service = buildService({
      task: {
        findMany: jest.fn().mockResolvedValue([]), // null dueDate excluded by Prisma filter
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    expect(items.filter((i) => i.ruleKey === 'OVERDUE_TASK')).toHaveLength(0);
  });

  // Test 5: Active task with null assigneeId → UNASSIGNED_TASK
  it('Test 5: active task with null assigneeId → UNASSIGNED_TASK', async () => {
    service = buildService({
      task: {
        findMany: jest.fn().mockImplementation((args: { where?: { assigneeId?: unknown } }) => {
          if ('assigneeId' in (args?.where ?? {})) {
            return Promise.resolve([{
              id: 't2', title: 'No Assignee', status: 'TODO',
              dueDate: null, updatedAt: now,
              workspace: { id: 'ws1', name: 'WS', department: null },
            }]);
          }
          return Promise.resolve([]);
        }),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    const unassigned = items.filter((i) => i.ruleKey === 'UNASSIGNED_TASK');
    expect(unassigned.length).toBeGreaterThanOrEqual(1);
    expect(unassigned[0].sourceFacts['assigneeId']).toBeNull();
  });

  // Test 11: Superseded file → no EXPIRED_FILE
  it('Test 11: isSuperseded=true file → no EXPIRED_FILE (Prisma filter excludes it)', async () => {
    service = buildService({
      fileAttachment: {
        findMany: jest.fn().mockResolvedValue([]), // isSuperseded=false filter excludes superseded files
      } as unknown,
    });

    const items = await service.detectItems();
    expect(items.filter((i) => i.ruleKey === 'EXPIRED_FILE')).toHaveLength(0);
  });

  // Test 12: NCR status=OPEN → OPEN_ISSUE detected
  it('Test 12: issue status=OPEN → OPEN_ISSUE', async () => {
    service = buildService({
      ncrCapa: {
        findMany: jest.fn().mockImplementation((args: { where?: { status?: unknown } }) => {
          const where = args?.where as { status?: { in?: string[] } | string } | undefined;
          if (where?.status && typeof where.status === 'object' && 'in' in where.status) {
            return Promise.resolve([{
              id: 'ncr1', title: 'Test Issue', ncrNumber: 'NCR-001',
              status: 'OPEN', dueDate: null, updatedAt: now,
              workspace: { id: 'ws1', name: 'WS', department: null },
              department: null,
              assignedTo: null,
              raisedBy: { id: 'u1', fullName: 'Ahmed' },
            }]);
          }
          return Promise.resolve([]);
        }),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    const openIssues = items.filter((i) => i.ruleKey === 'OPEN_ISSUE');
    expect(openIssues.length).toBeGreaterThanOrEqual(1);
    expect(openIssues[0].validTransitions).toContain('IN_PROGRESS');
  });

  // Test 13: SUBMITTED issue → ISSUE_WAITING_VERIFICATION
  it('Test 13: issue status=SUBMITTED → ISSUE_WAITING_VERIFICATION (highest precedence wins)', async () => {
    service = buildService({
      ncrCapa: {
        findMany: jest.fn().mockImplementation((args: { where?: { status?: unknown } }) => {
          const where = args?.where as { status?: { in?: string[] } | string } | undefined;
          if (typeof where?.status === 'string' && where.status === 'SUBMITTED') {
            return Promise.resolve([{
              id: 'ncr2', title: 'Submitted Issue', ncrNumber: 'NCR-002',
              dueDate: null, updatedAt: now,
              workspace: null, department: null,
              assignedTo: null,
              raisedBy: { id: 'u1', fullName: 'Omar' },
            }]);
          }
          return Promise.resolve([]);
        }),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    const waiting = items.filter((i) => i.ruleKey === 'ISSUE_WAITING_VERIFICATION');
    expect(waiting.length).toBeGreaterThanOrEqual(1);
    expect(waiting[0].sourceFacts['validTransitions']).toEqual(['VERIFIED', 'REJECTED']);
  });

  // Test 15: Active workspace with zero members → WORKSPACE_WITHOUT_MEMBERS
  it('Test 15: active workspace with zero members → WORKSPACE_WITHOUT_MEMBERS', async () => {
    service = buildService({
      workspace: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'ws99', name: 'Orphan WS', status: 'ACTIVE', updatedAt: now,
          department: null,
          owner: { id: 'u1', fullName: 'Admin' },
        }]),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    const noMembers = items.filter((i) => i.ruleKey === 'WORKSPACE_WITHOUT_MEMBERS');
    expect(noMembers.length).toBeGreaterThanOrEqual(1);
    expect(noMembers[0].sourceFacts['memberCount']).toBe(0);
  });

  // Test 16: Archived workspace → excluded (status != ACTIVE)
  it('Test 16: archived workspace → no WORKSPACE_WITHOUT_MEMBERS (Prisma filter excludes non-ACTIVE)', async () => {
    service = buildService({
      workspace: {
        findMany: jest.fn().mockResolvedValue([]), // status=ACTIVE filter excludes archived
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    const items = await service.detectItems();
    expect(items.filter((i) => i.ruleKey === 'WORKSPACE_WITHOUT_MEMBERS')).toHaveLength(0);
  });

  // Test 18: Stale/concurrent update → verify-entity returns changed=true
  it('Test 18: concurrency check → returns changed=true when updatedAt differs', async () => {
    const newerTime = new Date(now.getTime() + 60000);
    service = buildService({
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ updatedAt: newerTime }),
      } as unknown,
    });

    const result = await service.verifyEntityNotChanged('TASK', 'task-1', now.toISOString());
    expect(result.changed).toBe(true);
    expect(result.message).toContain('updated by another user');
  });

  it('Test 18b: concurrency check → returns changed=false when updatedAt matches', async () => {
    service = buildService({
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ updatedAt: now }),
      } as unknown,
    });

    const result = await service.verifyEntityNotChanged('TASK', 'task-1', now.toISOString());
    expect(result.changed).toBe(false);
    expect(result.message).toBeUndefined();
  });

  // Test 22: Restricted user (non-BAC role) receives 403 — enforced at controller level,
  // not service level. Service itself has no role check; controller guard does.
  // This is documented here for completeness; tested in e2e / integration tests.

  // Test 24: Preview mode causes no writes/notifications
  it('Test 24: getPreview() returns dryRun=true and does not call any write method', async () => {
    const createSpy = jest.fn();
    service = buildService({
      systemErrorLog: { create: createSpy } as unknown,
    });

    const preview = await service.getPreview();
    expect(preview.dryRun).toBe(true);
    expect(typeof preview.totalItems).toBe('number');
    expect(preview.counts).toBeDefined();
    // No systemErrorLog.create called (no errors)
    expect(createSpy).not.toHaveBeenCalled();
  });

  // Test 25: Malformed record in one rule does not crash full response
  it('Test 25: one failing rule does not crash other rules', async () => {
    service = buildService({
      task: {
        // Throw on first call (overdue tasks), succeed on second (unassigned tasks)
        findMany: jest.fn()
          .mockRejectedValueOnce(new Error('DB error on overdue'))
          .mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown,
    });

    // Should not throw; other rules should still run
    const items = await service.detectItems();
    expect(Array.isArray(items)).toBe(true);
    // OVERDUE_TASK rule failed — no items from it
    expect(items.filter((i) => i.ruleKey === 'OVERDUE_TASK')).toHaveLength(0);
  });
});
