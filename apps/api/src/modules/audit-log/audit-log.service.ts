import { Injectable } from '@nestjs/common';
import { Prisma } from '@auditflow/db';
import { PrismaService } from '../../common/prisma.service';

interface CreateAuditLogDto {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: dto.actorId ?? null,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId ?? null,
          previousValue: dto.previousValue != null
            ? (dto.previousValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValue: dto.newValue != null
            ? (dto.newValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
        },
      });
    } catch (err) {
      console.error('[AuditLog] Failed to write audit log:', err);
    }
  }
}
