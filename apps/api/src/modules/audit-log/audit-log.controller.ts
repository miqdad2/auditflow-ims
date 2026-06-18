import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { PrismaService } from '../../common/prisma.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private prisma: PrismaService) {}

  @Get('entity')
  @RequirePermissions('project.read')
  async getEntityActivity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    if (!entityType || !entityId) {
      return [];
    }
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        newValue: true,
        createdAt: true,
        actor: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
