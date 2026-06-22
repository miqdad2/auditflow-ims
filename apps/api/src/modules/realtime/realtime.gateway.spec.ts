/**
 * Unit 52.1 — Realtime gateway: private user-room tests (5 cases)
 *
 * Verifies that:
 * 1. Authenticated socket joins only user:{authenticatedUserId} (from JWT sub)
 * 2. Unauthenticated socket is rejected immediately
 * 3. Client-supplied fake userId in socket payload is ignored — identity from JWT only
 * 4. Invalid / expired JWT is rejected
 * 5. Reconnect re-authenticates and re-joins the correct user room
 *
 * The gateway reads userId from jwtService.verify(token).sub — never from browser data.
 * Room membership is: user:{sub} joined server-side in handleConnection().
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';

// ─── Minimal socket mock ─────────────────────────────────────────────────────

function makeSocket(token?: string) {
  const rooms = new Set<string>();
  return {
    handshake: {
      auth:    token ? { token }    : {},
      headers: token ? { authorization: `Bearer ${token}` } : {},
    },
    data: {} as Record<string, unknown>,
    join:       jest.fn(async (room: string) => { rooms.add(room); }),
    leave:      jest.fn(async (room: string) => { rooms.delete(room); }),
    disconnect: jest.fn(),
    rooms,
    // Expose joined rooms for assertions
    _rooms: rooms,
  };
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockJwt = {
  verify: jest.fn(),
};

const mockPrisma = {
  workspace: { findUnique: jest.fn() },
  user:      { findUnique: jest.fn() },
};

const mockRealtimeService = {
  setServer: jest.fn(),
  emit:      jest.fn(),
  emitToUser: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RealtimeGateway — private user rooms', () => {
  let gateway: RealtimeGateway;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService,       useValue: mockJwt },
        { provide: RealtimeService,  useValue: mockRealtimeService },
        { provide: PrismaService,    useValue: mockPrisma },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
  });

  // ─── Case 1: Authenticated socket joins user:{sub} ────────────────────────
  it('Case 1 — authenticated socket joins user:{sub} from JWT, not from browser data', async () => {
    mockJwt.verify.mockReturnValueOnce({ sub: 'alice-123', departmentId: null });
    const socket = makeSocket('valid-token');

    await gateway.handleConnection(socket as never);

    expect(mockJwt.verify).toHaveBeenCalledWith('valid-token');
    expect(socket.data['userId']).toBe('alice-123');
    expect(socket.join).toHaveBeenCalledWith('user:alice-123');
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  // ─── Case 2: Unauthenticated socket is rejected ───────────────────────────
  it('Case 2 — socket without token is disconnected immediately', async () => {
    const socket = makeSocket(); // no token

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  // ─── Case 3: Client-supplied userId in socket payload is ignored ──────────
  // A malicious client tries to inject userId='bob-999' via socket.data before
  // handleConnection runs. The gateway overwrites socket.data.userId with the
  // verified JWT sub — the injected value is discarded.
  it('Case 3 — pre-injected socket.data.userId is overwritten by JWT sub', async () => {
    mockJwt.verify.mockReturnValueOnce({ sub: 'alice-123' });
    const socket = makeSocket('valid-token');
    // Simulate a client that somehow pre-sets data (should never win)
    (socket.data as Record<string, unknown>)['userId'] = 'bob-999';

    await gateway.handleConnection(socket as never);

    // JWT sub wins — bob-999 is replaced
    expect(socket.data['userId']).toBe('alice-123');
    expect(socket.join).toHaveBeenCalledWith('user:alice-123');
    // bob-999's room was never joined
    const joinCalls = (socket.join as jest.Mock).mock.calls.map(([r]: [string]) => r);
    expect(joinCalls).not.toContain('user:bob-999');
  });

  // ─── Case 4: Invalid / expired JWT is rejected ────────────────────────────
  it('Case 4 — invalid or expired JWT disconnects the socket', async () => {
    mockJwt.verify.mockImplementationOnce(() => { throw new Error('jwt expired'); });
    const socket = makeSocket('expired-or-tampered-token');

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  // ─── Case 5: Reconnect re-authenticates and re-joins correct room ─────────
  // When a socket reconnects (new connection), handleConnection runs again
  // with the same JWT. The user re-joins user:{sub}.
  it('Case 5 — reconnect runs handleConnection again and rejoins user:{sub}', async () => {
    mockJwt.verify.mockReturnValue({ sub: 'alice-123' });

    const socket1 = makeSocket('valid-token');
    const socket2 = makeSocket('valid-token'); // new socket object on reconnect

    await gateway.handleConnection(socket1 as never);
    await gateway.handleConnection(socket2 as never); // reconnect

    // Both connections join the correct room
    expect(socket1.join).toHaveBeenCalledWith('user:alice-123');
    expect(socket2.join).toHaveBeenCalledWith('user:alice-123');
    // Both resolved identity from JWT, not browser
    expect(socket1.data['userId']).toBe('alice-123');
    expect(socket2.data['userId']).toBe('alice-123');
  });
});

// ─── Supplementary: join:workspace access control ────────────────────────────
// Verifies that the workspace room join checks DB membership — not client claim.

describe('RealtimeGateway — workspace room access', () => {
  let gateway: RealtimeGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService,       useValue: mockJwt },
        { provide: RealtimeService,  useValue: mockRealtimeService },
        { provide: PrismaService,    useValue: mockPrisma },
      ],
    }).compile();
    gateway = module.get<RealtimeGateway>(RealtimeGateway);
  });

  it('Supp-1 — unauthenticated socket cannot join a workspace room', async () => {
    const socket = makeSocket();
    // socket.data.userId not set (no successful handleConnection)

    await gateway.handleJoinWorkspace(socket as never, { workspaceId: 'ws-1' });

    expect(socket.join).not.toHaveBeenCalled();
  });

  it('Supp-2 — non-member, non-elevated user is denied workspace room', async () => {
    const socket = makeSocket('t');
    (socket.data as Record<string, unknown>)['userId'] = 'staff-user';

    mockPrisma.workspace.findUnique.mockResolvedValueOnce({
      id: 'ws-1', visibility: 'PRIVATE', departmentId: null,
      members: [], // empty — not a member
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'staff-user', departmentId: null,
      userRoles: [{ role: { name: 'STAFF' } }],
    });

    await gateway.handleJoinWorkspace(socket as never, { workspaceId: 'ws-1' });

    expect(socket.join).not.toHaveBeenCalled();
  });

  it('Supp-3 — explicit member is allowed workspace room', async () => {
    const socket = makeSocket('t');
    (socket.data as Record<string, unknown>)['userId'] = 'member-user';

    mockPrisma.workspace.findUnique.mockResolvedValueOnce({
      id: 'ws-1', visibility: 'PRIVATE', departmentId: null,
      members: [{ id: 'wm-1' }], // IS a member
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'member-user', departmentId: null,
      userRoles: [{ role: { name: 'STAFF' } }],
    });

    await gateway.handleJoinWorkspace(socket as never, { workspaceId: 'ws-1' });

    expect(socket.join).toHaveBeenCalledWith('workspace:ws-1');
  });
});
