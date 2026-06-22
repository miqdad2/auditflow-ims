import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { PrismaService } from '../../common/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private realtimeService: RealtimeService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; departmentId?: string }>(token);
      const userId = payload.sub;

      // Store userId on socket for later use
      (client.data as Record<string, unknown>).userId = userId;

      // Auto-join user room
      await client.join(`user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup is automatic â€” Socket.IO removes from rooms on disconnect
    void client;
  }

  @SubscribeMessage('join:workspace')
  async handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (!data?.workspaceId) return;
    const userId = (client.data as Record<string, unknown>).userId as string | undefined;
    if (!userId) return;

    const ws = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: { members: { where: { userId }, select: { id: true } } },
    });
    if (!ws) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: { select: { name: true } } } } },
    });
    if (!user) return;

    const ELEVATED = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
    const DEPT_ROLES = ['DEPARTMENT_MANAGER', 'DEPARTMENT_USER'];
    const roles = user.userRoles.map((ur) => ur.role.name);
    const isElevated = roles.some((r) => ELEVATED.includes(r));

    if (isElevated) {
      await client.join(`workspace:${data.workspaceId}`);
      return;
    }

    const isMember = ws.members.length > 0;

    // Explicit member always gets access
    if (isMember) {
      await client.join(`workspace:${data.workspaceId}`);
      return;
    }

    // DEPARTMENT visibility: allow department roles if dept matches
    if (ws.visibility === 'DEPARTMENT' && user.departmentId && ws.departmentId === user.departmentId) {
      const isDeptRole = roles.some((r) => DEPT_ROLES.includes(r));
      if (isDeptRole) {
        await client.join(`workspace:${data.workspaceId}`);
        return;
      }
    }

    // ORGANIZATION: only elevated (above) and explicit members (above)
    // PRIVATE: only explicit members (above)
    // STAFF / AUDITOR_VIEWER without membership: deny â€” do not join room
  }

  @SubscribeMessage('leave:workspace')
  async handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (data?.workspaceId) {
      await client.leave(`workspace:${data.workspaceId}`);
    }
  }

  @SubscribeMessage('join:department')
  async handleJoinDepartment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { departmentId: string },
  ) {
    if (data?.departmentId) {
      await client.join(`department:${data.departmentId}`);
    }
  }
}

