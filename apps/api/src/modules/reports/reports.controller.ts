import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('overview')
  @RequirePermissions('project.read')
  getOverview(
    @CurrentUser() user: Record<string, unknown>,
    @Query('dateFrom')     dateFrom?: string,
    @Query('dateTo')       dateTo?: string,
    @Query('departmentId') departmentId?: string,
    @Query('workspaceId')  workspaceId?: string,
  ) {
    const roles  = extractUserRoles(user);
    const deptId = (user.departmentId as string | null) ?? null;
    return this.svc.getOverview(user.id as string, roles, deptId, {
      dateFrom:     dateFrom     ?? null,
      dateTo:       dateTo       ?? null,
      departmentId: departmentId ?? null,
      workspaceId:  workspaceId  ?? null,
    });
  }
}
