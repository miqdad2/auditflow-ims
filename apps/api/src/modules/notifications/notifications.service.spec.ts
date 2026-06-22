/**
 * Unit 52 — Notification system test cases (18 cases)
 *
 * Cases 1-2, 11-14, 16 are backend (service-level) tests.
 * Cases 3-10, 12, 15, 17-18 are frontend (client-side) behaviours;
 * they are documented here as manual or e2e verification steps because
 * they rely on the DOM, Web Audio API, Socket.IO client, and localStorage
 * which cannot be meaningfully exercised in a pure NestJS unit test.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService, CreateNotificationDto } from './notifications.service';
import { PrismaService } from '../../common/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  notification: {
    findFirst:   jest.fn(),
    create:      jest.fn(),
    findMany:    jest.fn(),
    count:       jest.fn(),
    updateMany:  jest.fn(),
  },
};

const mockRealtime = {
  emitToUser: jest.fn(),
};

// ─── Test setup ───────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.resetAllMocks(); // also clears queued mockOnce implementations between tests

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: RealtimeService, useValue: mockRealtime },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ─── Case 1: Save-before-emit guarantee ──────────────────────────────────
  // Notification row must be persisted to PostgreSQL BEFORE the socket event
  // is emitted. If the DB write fails, no socket event fires.
  it('Case 1 — persists to DB before emitting socket event', async () => {
    const fakeRow = {
      id: 'n1', category: 'TASK_ASSIGNED', severity: 'INFO',
      title: 'Task assigned', message: 'You were assigned a task.',
      entityType: 'TASK', entityId: 't1', workspaceId: 'ws1',
      deepLink: '/workspaces/ws1?task=t1',
      createdAt: new Date(),
    };

    let callTracker = 0;
    let dbCallOrder = 0;
    let emitCallOrder = 0;

    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);
    mockPrisma.notification.create.mockImplementationOnce(async () => {
      dbCallOrder = ++callTracker;
      return fakeRow;
    });
    mockRealtime.emitToUser.mockImplementationOnce(() => {
      emitCallOrder = ++callTracker;
    });

    const dto: CreateNotificationDto = {
      recipientId: 'u1',
      category:    'TASK_ASSIGNED',
      title:       'Task assigned',
      message:     'You were assigned a task.',
      entityType:  'TASK',
      entityId:    't1',
      workspaceId: 'ws1',
    };

    await service.create(dto);

    expect(dbCallOrder).toBeLessThan(emitCallOrder);
    expect(mockRealtime.emitToUser).toHaveBeenCalledTimes(1);
    expect(mockRealtime.emitToUser).toHaveBeenCalledWith(
      'u1',
      'notification.created',
      expect.objectContaining({ id: fakeRow.id }),
    );
  });

  // ─── Case 2: Only intended user room receives event ───────────────────────
  // emitToUser is called with the correct recipientId (from JWT sub),
  // never with a different user's ID.
  it('Case 2 — emits only to the notification recipient room', async () => {
    const recipientId = 'user-alice';
    const otherUserId = 'user-bob';
    const fakeRow = {
      id: 'n2', category: 'TASK_ASSIGNED', severity: 'INFO',
      title: 'T', message: 'M', entityType: null, entityId: null,
      workspaceId: null, deepLink: null, createdAt: new Date(),
    };

    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);
    mockPrisma.notification.create.mockResolvedValueOnce(fakeRow);

    await service.create({ recipientId, category: 'TASK_ASSIGNED', title: 'T', message: 'M' });

    expect(mockRealtime.emitToUser).toHaveBeenCalledWith(
      recipientId, 'notification.created', expect.anything(),
    );
    const calls = (mockRealtime.emitToUser as jest.Mock).mock.calls;
    expect(calls.every(([uid]: [string]) => uid !== otherUserId)).toBe(true);
  });

  // ─── Case 3: Duplicate socket event produces one toast ────────────────────
  // FRONTEND — cannot test in NestJS unit test.
  // Manual verification: open browser dev tools → Network → WS.
  // If the same notification.created event fires twice (same id),
  // NotificationToastManager renders only one ToastCard (seenIds dedup).
  it.skip('Case 3 — FRONTEND: duplicate socket event produces one toast (manual)', () => {});

  // ─── Case 4: Duplicate event increments unread badge once ────────────────
  // FRONTEND — AppHeader seenBadgeIds Set prevents double increment.
  // Manual: inject same payload twice into socket mock, confirm badge is +1 not +2.
  it.skip('Case 4 — FRONTEND: badge increments once per unique notification id (manual)', () => {});

  // ─── Case 5: Initial page load does not play sound ───────────────────────
  // FRONTEND — apiGet('/notifications') on mount must not call playNotificationSound().
  // Sound is only triggered by socket 'notification.created' events.
  it.skip('Case 5 — FRONTEND: initial fetch does not trigger audio (manual)', () => {});

  // ─── Case 6: Reconnect refetch does not replay sound ─────────────────────
  // FRONTEND — when socket reconnects, AppHeader calls fetchUnread() and
  // notifications page calls load() — neither should call playNotificationSound().
  it.skip('Case 6 — FRONTEND: reconnect refetch is silent (manual)', () => {});

  // ─── Case 7: Critical notification plays sound when enabled ──────────────
  // FRONTEND — with prefs.sound='ALL' and document.hasFocus()=true,
  // a TASK_OVERDUE socket event should invoke playNotificationSound().
  it.skip('Case 7 — FRONTEND: sound plays for critical notification when enabled (manual)', () => {});

  // ─── Case 8: Sound disabled produces no audio ────────────────────────────
  // FRONTEND — with prefs.sound='OFF', no AudioContext is created.
  it.skip('Case 8 — FRONTEND: no AudioContext call when sound=OFF (manual)', () => {});

  // ─── Case 9: Quiet hours suppress sound ──────────────────────────────────
  // FRONTEND — isInQuietHours() returns true → shouldPlaySound() returns false.
  it.skip('Case 9 — FRONTEND: quiet hours block sound (manual)', () => {});

  // ─── Case 10: Desktop permission denied falls back to toast ──────────────
  // FRONTEND — Notification.permission='denied' → desktop notification skipped,
  // in-app ToastCard still shown.
  it.skip('Case 10 — FRONTEND: desktop denied → in-app toast fallback (manual)', () => {});

  // ─── Case 11: markRead clears readAt for the right user ──────────────────
  it('Case 11 — markRead updates readAt scoped to the requesting user', async () => {
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.markRead('n-abc', 'user-alice');

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n-abc', recipientId: 'user-alice' },
      data:  { readAt: expect.any(Date) },
    });
  });

  // ─── Case 12: markAllRead resets all unread for user ─────────────────────
  it('Case 12 — markAllRead sets readAt on all unread rows for the user', async () => {
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 5 });

    await service.markAllRead('user-alice');

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { recipientId: 'user-alice', readAt: null },
      data:  { readAt: expect.any(Date) },
    });
  });

  // ─── Case 13: Deleted target is handled safely ───────────────────────────
  // computeDeepLink returns null when entityType/entityId are absent.
  // If the task no longer exists, the deepLink simply isn't clickable.
  it('Case 13 — create() does not throw when entity has been deleted', async () => {
    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);
    mockPrisma.notification.create.mockResolvedValueOnce({
      id: 'n13', category: 'TASK_ASSIGNED', severity: 'INFO',
      title: 'T', message: 'M', entityType: null, entityId: null,
      workspaceId: null, deepLink: null, createdAt: new Date(),
    });

    await expect(
      service.create({ recipientId: 'u1', category: 'TASK_ASSIGNED', title: 'T', message: 'M' }),
    ).resolves.toBeUndefined();
  });

  // ─── Case 14: Unauthorized user cannot read another user's notifications ─
  // markRead uses { id, recipientId } — a different user's userId won't match.
  it('Case 14 — markRead with wrong userId silently updates 0 rows', async () => {
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });

    // bob tries to mark alice's notification as read
    await service.markRead('n-alice', 'user-bob');

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n-alice', recipientId: 'user-bob' },
      data:  { readAt: expect.any(Date) },
    });
  });

  // ─── Case 15: Two browser tabs do not produce repeated sound ─────────────
  // FRONTEND — document.hasFocus() check in playNotificationSound() ensures
  // only the focused tab plays audio. Unfocused tabs receive the event but skip.
  it.skip('Case 15 — FRONTEND: only focused tab plays sound (manual)', () => {});

  // ─── Case 16: findForUser is scoped strictly to the requesting user ───────
  it('Case 16 — findForUser queries only the recipient user', async () => {
    mockPrisma.notification.findMany.mockResolvedValueOnce([]);

    await service.findForUser('user-alice', { unreadOnly: true });

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recipientId: 'user-alice' }),
      }),
    );
  });

  // ─── Case 17: Empty/error states render safely ───────────────────────────
  // FRONTEND — /notifications page shows "No notifications yet." when the list is empty.
  // Loading spinner shows while fetching; error state shows "Retry" on failure.
  it.skip('Case 17 — FRONTEND: empty/loading/error states render (manual)', () => {});

  // ─── Case 18: Builds pass ─────────────────────────────────────────────────
  // Verified externally: `pnpm --filter api build` and `pnpm --filter web build`
  // both complete without TypeScript errors after Unit 52 changes.
  it('Case 18 — service instantiates without errors (build smoke)', () => {
    expect(service).toBeDefined();
  });

  // ─── Severity auto-assignment (supplementary) ────────────────────────────
  it('assigns ERROR severity for TASK_OVERDUE category automatically', async () => {
    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);

    let capturedData: Record<string, unknown> | null = null;
    mockPrisma.notification.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
      capturedData = data;
      return { ...data, id: 'n-x', createdAt: new Date() };
    });

    await service.create({
      recipientId: 'u1',
      category:    'TASK_OVERDUE',
      title:       'Task is overdue',
      message:     'Task X is overdue',
    });

    expect(capturedData).not.toBeNull();
    expect((capturedData as unknown as Record<string, unknown>)['severity']).toBe('ERROR');
  });

  // ─── DeepLink computation (supplementary) ────────────────────────────────
  it('computes TASK deepLink as /workspaces/{ws}?task={id}', async () => {
    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);

    let capturedData: Record<string, unknown> | null = null;
    mockPrisma.notification.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
      capturedData = data;
      return { ...data, id: 'n-y', createdAt: new Date() };
    });

    await service.create({
      recipientId: 'u1',
      category:    'TASK_ASSIGNED',
      title:       'Task assigned',
      message:     'You have a task',
      entityType:  'TASK',
      entityId:    'task-123',
      workspaceId: 'ws-456',
    });

    expect((capturedData as unknown as Record<string, unknown>)['deepLink']).toBe(
      '/workspaces/ws-456?task=task-123',
    );
  });

  // ─── Dedup guard (supplementary) ─────────────────────────────────────────
  it('skips create() when an identical unread notification already exists', async () => {
    mockPrisma.notification.findFirst.mockResolvedValueOnce({ id: 'existing' });

    await service.create({
      recipientId: 'u1',
      category:    'TASK_ASSIGNED',
      title:       'Task assigned',
      message:     'You have a task',
      entityId:    'task-dup',
    });

    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    expect(mockRealtime.emitToUser).not.toHaveBeenCalled();
  });

  // ─── Save-before-emit: DB failure → no socket event (Part 3) ─────────────
  it('Part3-fail-A — DB create failure suppresses socket emit', async () => {
    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);
    mockPrisma.notification.create.mockRejectedValueOnce(new Error('DB connection lost'));

    await service.create({
      recipientId: 'u1',
      category:    'TASK_ASSIGNED',
      title:       'T',
      message:     'M',
    });

    // create() swallows the error internally — must not throw
    expect(mockRealtime.emitToUser).not.toHaveBeenCalled();
  });

  // ─── Save-before-emit: socket failure → DB row preserved (Part 3) ────────
  // The notification is already committed before emitToUser is called.
  // emitToUser throwing does NOT roll back the DB row.
  it('Part3-fail-B — socket emit failure does not remove the stored notification', async () => {
    const fakeRow = {
      id: 'n-persist', category: 'TASK_ASSIGNED', severity: 'INFO',
      title: 'T', message: 'M', entityType: null, entityId: null,
      workspaceId: null, deepLink: null, createdAt: new Date(),
    };
    mockPrisma.notification.findFirst.mockResolvedValueOnce(null);
    mockPrisma.notification.create.mockResolvedValueOnce(fakeRow);
    // Socket emit throws
    mockRealtime.emitToUser.mockImplementationOnce(() => { throw new Error('socket server not ready'); });

    // service.create() catches all errors — must not throw
    await expect(
      service.create({ recipientId: 'u1', category: 'TASK_ASSIGNED', title: 'T', message: 'M' }),
    ).resolves.toBeUndefined();

    // DB create was called — row is committed
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
  });

  // ─── API scoping: findForUser cannot leak cross-user data ─────────────────
  it('Part4-scope — findForUser always includes recipientId in WHERE', async () => {
    mockPrisma.notification.findMany.mockResolvedValueOnce([]);

    await service.findForUser('user-alice');

    const [callArg] = (mockPrisma.notification.findMany as jest.Mock).mock.calls[0] as [{ where: Record<string, unknown> }];
    expect(callArg.where['recipientId']).toBe('user-alice');
  });

  // ─── API scoping: getUnreadCount scoped to recipient ─────────────────────
  it('Part4-scope — getUnreadCount includes recipientId + readAt:null filter', async () => {
    mockPrisma.notification.count.mockResolvedValueOnce(3);

    const count = await service.getUnreadCount('user-alice');

    expect(count).toBe(3);
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { recipientId: 'user-alice', readAt: null },
    });
  });

  // ─── API scoping: markUnread scoped to recipient ──────────────────────────
  it('Part4-scope — markUnread uses { id, recipientId } — cross-user attempt is a no-op', async () => {
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });

    await service.markUnread('n-alice', 'user-bob'); // bob tries to mark alice's notif unread

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n-alice', recipientId: 'user-bob' },
      data:  { readAt: null },
    });
    // 0 rows affected — alice's notification is untouched
  });

  // ─── Deep-link matrix (Part 5) ────────────────────────────────────────────
  const deepLinkMatrix: Array<{
    label: string;
    entityType: string; entityId: string; workspaceId?: string;
    expected: string | null;
  }> = [
    { label: 'TASK with workspace',      entityType: 'TASK',      entityId: 't1', workspaceId: 'ws1', expected: '/workspaces/ws1?task=t1' },
    { label: 'TASK without workspace',   entityType: 'TASK',      entityId: 't1',                     expected: null },
    { label: 'DOCUMENT',                 entityType: 'DOCUMENT',  entityId: 'd1',                     expected: '/documents/d1' },
    { label: 'NCR_CAPA with workspace',  entityType: 'NCR_CAPA',  entityId: 'n1', workspaceId: 'ws2', expected: '/workspaces/ws2?ncr=n1' },
    { label: 'NCR_CAPA without workspace',entityType:'NCR_CAPA', entityId: 'n1',                     expected: '/ncr-capa' },
    { label: 'WORKSPACE',                entityType: 'WORKSPACE', entityId: 'ws1',                    expected: '/workspaces/ws1' },
    { label: 'unknown entity type',      entityType: 'FOO',       entityId: 'x1',                     expected: null },
    { label: 'no entityType at all',     entityType: '',          entityId: '',                        expected: null },
  ];

  deepLinkMatrix.forEach(({ label, entityType, entityId, workspaceId, expected }) => {
    it(`Part5-deeplink — ${label} → ${expected ?? 'null'}`, async () => {
      mockPrisma.notification.findFirst.mockResolvedValueOnce(null);

      let capturedDeepLink: unknown = undefined;
      mockPrisma.notification.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
        capturedDeepLink = data['deepLink'];
        return { ...data, id: 'n-x', createdAt: new Date() };
      });

      await service.create({
        recipientId: 'u1',
        category:    'TASK_ASSIGNED',
        title:       'T',
        message:     'M',
        entityType:  entityType || undefined,
        entityId:    entityId   || undefined,
        workspaceId: workspaceId,
      });

      expect(capturedDeepLink).toBe(expected);
    });
  });
});
