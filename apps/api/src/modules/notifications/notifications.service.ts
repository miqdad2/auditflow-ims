import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

interface CreateNotificationDto {
  recipientId: string;
  category: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<void> {
    try {
      // Dedup: skip if same recipient+category+entityId already has unread notification
      if (dto.entityId) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            recipientId: dto.recipientId,
            category: dto.category,
            entityId: dto.entityId,
            readAt: null,
          },
        });
        if (existing) return;
      }

      const notification = await this.prisma.notification.create({
        data: {
          recipientId: dto.recipientId,
          category: dto.category,
          title: dto.title,
          message: dto.message,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
        },
      });

      this.realtime.emitToUser(dto.recipientId, 'notification.created', {
        id: notification.id,
        category: notification.category,
        title: notification.title,
        message: notification.message,
      });
    } catch (err) {
      console.error('[Notifications] Failed to create notification:', err);
    }
  }

  async findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
