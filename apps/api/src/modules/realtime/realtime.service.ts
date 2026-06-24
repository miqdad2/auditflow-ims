import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emit(room: string, event: string, payload: Record<string, unknown>) {
    if (!this.server) return;
    // Enrich every event with a stable eventId (for frontend deduplication)
    // and occurredAt (for ordering). Existing payloads are not modified in-place.
    const enriched: Record<string, unknown> = {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    this.server.to(room).emit(event, enriched);
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
    this.emit(`user:${userId}`, event, payload);
  }

  emitToWorkspace(workspaceId: string, event: string, payload: Record<string, unknown>) {
    this.emit(`workspace:${workspaceId}`, event, payload);
  }

  emitToDepartment(departmentId: string, event: string, payload: Record<string, unknown>) {
    this.emit(`department:${departmentId}`, event, payload);
  }

  // Broadcast to all connected sockets — for admin-level changes (users, departments)
  // that only affect authorized pages. Safe in a single-company internal system.
  emitGlobal(event: string, payload: Record<string, unknown>) {
    if (!this.server) return;
    const enriched: Record<string, unknown> = {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    this.server.emit(event, enriched);
  }
}
