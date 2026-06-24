import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

// ─── Severity auto-assignment ─────────────────────────────────────────────────
// If the caller does not specify severity, it is inferred from category.
// Callers may override by passing severity explicitly.

const CATEGORY_SEVERITY: Record<string, 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'> = {
  TASK_ASSIGNED:           'INFO',
  TASK_OVERDUE:            'ERROR',
  TASK_REJECTED:           'WARNING',
  TASK_WAITING_REVIEW:     'INFO',
  TASK_COMPLETED:          'INFO',
  TASK_CANCELLED:          'WARNING',
  TASK_REOPENED:           'INFO',
  TASK_DUE_SOON:              'WARNING',
  // Approval workflow (Unit 63.1)
  TASK_PENDING_APPROVAL:      'WARNING', // reviewers: new task awaiting decision
  TASK_APPROVAL_APPROVED:     'INFO',    // creator: task approved
  TASK_APPROVAL_RETURNED:     'WARNING', // creator: task returned for correction
  TASK_APPROVAL_REJECTED:     'WARNING', // creator: task rejected
  EVIDENCE_SUBMITTED:         'INFO',
  EVIDENCE_APPROVED:       'INFO',
  EVIDENCE_REJECTED:       'WARNING',
  DOCUMENT_APPROVED:       'INFO',
  DOCUMENT_REJECTED:       'WARNING',
  DOCUMENT_REVIEW_PENDING: 'INFO',
  NCR_ASSIGNED:            'WARNING',
  NCR_VERIFIED:            'INFO',
  NCR_REJECTED:            'ERROR',
  NCR_WAITING_VERIFICATION:'INFO',
  CHECKLIST_ASSIGNMENT:    'INFO',
  MEMBER_ADDED:            'INFO',
  MEMBER_ROLE_CHANGED:     'INFO',
  MEMBER_REMOVED:          'WARNING',
  MENTION:                 'INFO',
  REQUEST_UPDATE:          'WARNING',
  FILE_EXPIRING:           'WARNING',
  FILE_EXPIRED:            'ERROR',
  FILE_RENEWED:            'INFO',
  SYSTEM:                  'INFO',
};

// ─── DeepLink computation ─────────────────────────────────────────────────────
// Generates a safe client-side route from the entity context so the frontend
// does not need a secondary fetch to navigate to the related record.

function computeDeepLink(
  entityType?: string,
  entityId?: string,
  workspaceId?: string,
  extra?: Record<string, string>,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'TASK':
      return workspaceId
        ? `/workspaces/${workspaceId}?task=${entityId}${extra?.fileId ? `&fileId=${extra.fileId}` : ''}`
        : null;
    case 'DOCUMENT':
      return `/documents/${entityId}`;
    case 'NCR_CAPA':
      return workspaceId
        ? `/workspaces/${workspaceId}?ncr=${entityId}`
        : '/ncr-capa';
    case 'WORKSPACE':
      return `/workspaces/${entityId}`;
    default:
      return null;
  }
}

// ─── DTO ──────────────────────────────────────────────────────────────────────

export interface CreateNotificationDto {
  recipientId: string;
  category: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  workspaceId?: string;
  deepLink?: string;
  deepLinkExtra?: Record<string, string>;  // extra URL params (e.g. fileId)
}

// ─── Safe emit payload type ───────────────────────────────────────────────────
// Only these fields travel over the socket. Never expose storagePath or credentials.

export interface NotificationSocketPayload {
  id: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  workspaceId: string | null;
  deepLink: string | null;
  createdAt: string;
  isRead: false;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<void> {
    try {
      // Dedup: skip if same recipient+category+entityId already has an unread notification
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

      const severity = dto.severity ?? CATEGORY_SEVERITY[dto.category] ?? 'INFO';
      const deepLink =
        dto.deepLink ??
        computeDeepLink(dto.entityType, dto.entityId, dto.workspaceId, dto.deepLinkExtra);

      const notification = await this.prisma.notification.create({
        data: {
          recipientId: dto.recipientId,
          category:    dto.category,
          severity,
          title:       dto.title,
          message:     dto.message,
          entityType:  dto.entityType ?? null,
          entityId:    dto.entityId ?? null,
          workspaceId: dto.workspaceId ?? null,
          deepLink:    deepLink ?? null,
        },
      });

      // Emit ONLY after successful DB persistence (Part 3 guarantee)
      const payload: NotificationSocketPayload = {
        id:          notification.id,
        category:    notification.category,
        severity:    notification.severity,
        title:       notification.title,
        message:     notification.message,
        entityType:  notification.entityType,
        entityId:    notification.entityId,
        workspaceId: notification.workspaceId,
        deepLink:    notification.deepLink,
        createdAt:   notification.createdAt.toISOString(),
        isRead:      false,
      };

      this.realtime.emitToUser(dto.recipientId, 'notification.created', payload as unknown as Record<string, unknown>);
    } catch (err) {
      console.error('[Notifications] Failed to create notification:', err);
    }
  }

  async findForUser(userId: string, params?: { category?: string; unreadOnly?: boolean }) {
    return this.prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(params?.unreadOnly ? { readAt: null } : {}),
        ...(params?.category   ? { category: params.category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, category: true, severity: true, title: true, message: true,
        entityType: true, entityId: true, workspaceId: true, deepLink: true,
        readAt: true, createdAt: true,
      },
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
      data:  { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data:  { readAt: new Date() },
    });
  }

  async markUnread(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data:  { readAt: null },
    });
  }
}
