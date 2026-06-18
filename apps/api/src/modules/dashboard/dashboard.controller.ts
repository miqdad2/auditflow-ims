import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import {
  extractUserRoles,
} from '../../common/permissions.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('overview')
  @RequirePermissions('project.read')
  getOverview(@CurrentUser() user: Record<string, unknown>) {
    const roles    = extractUserRoles(user);
    const deptId   = (user.departmentId as string | null) ?? null;
    return this.svc.getOverview(user.id as string, roles, deptId);
  }
}
