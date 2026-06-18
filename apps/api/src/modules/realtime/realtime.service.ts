import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emit(room: string, event: string, payload: Record<string, unknown>) {
    if (!this.server) return;
    this.server.to(room).emit(event, payload);
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
}
