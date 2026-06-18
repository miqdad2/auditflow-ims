import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@auditflow/db';

export type ErrorSource = 'API' | 'FRONTEND' | 'REALTIME' | 'STORAGE' | 'DATABASE';
export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogErrorDto {
  source: ErrorSource;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  path?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SystemErrorsService {
  constructor(private prisma: PrismaService) {}

  async log(dto: LogErrorDto): Promise<void> {
    try {
      await this.prisma.systemErrorLog.create({
        data: {
          source: dto.source,
          severity: dto.severity,
          message: dto.message.slice(0, 2000),
          stack: dto.stack ? dto.stack.slice(0, 5000) : undefined,
          path: dto.path,
          userId: dto.userId,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch {
      // Must never throw — logging cannot break the caller
    }
  }

  async findAll(query: {
    source?: string;
    severity?: string;
    resolved?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.SystemErrorLogWhereInput = {};
    if (query.source) where.source = query.source;
    if (query.severity) where.severity = query.severity;
    if (query.resolved === 'true') where.resolvedAt = { not: null };
    if (query.resolved === 'false') where.resolvedAt = null;

    const [items, total] = await Promise.all([
      this.prisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.systemErrorLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async resolve(id: string): Promise<void> {
    await this.prisma.systemErrorLog.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }

  async unresolve(id: string): Promise<void> {
    await this.prisma.systemErrorLog.update({
      where: { id },
      data: { resolvedAt: null },
    });
  }

  async getStats() {
    const [total, unresolved, bySeverity] = await Promise.all([
      this.prisma.systemErrorLog.count(),
      this.prisma.systemErrorLog.count({ where: { resolvedAt: null } }),
      this.prisma.systemErrorLog.groupBy({
        by: ['severity'],
        _count: { severity: true },
        where: { resolvedAt: null },
      }),
    ]);

    const severityCounts: Record<string, number> = {};
    for (const row of bySeverity) {
      severityCounts[row.severity] = row._count.severity;
    }

    return { total, unresolved, bySeverity: severityCounts };
  }
}
