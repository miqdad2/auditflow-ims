import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import {
  extractUserRoles,
} from '../../common/permissions.guard';
import { DashboardService } from './dashboard.service';

// Roles that may access the Executive Dashboard endpoint.
const EXECUTIVE_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('overview')
  @RequirePermissions('project.read')
  getOverview(@CurrentUser() user: Record<string, unknown>) {
    const roles  = extractUserRoles(user);
    const deptId = (user.departmentId as string | null) ?? null;
    return this.svc.getOverview(user.id as string, roles, deptId);
  }

  /**
   * Personal assigned-task scope for the current user.
   */
  @Get('my-tasks')
  @RequirePermissions('project.read')
  getMyTasks(@CurrentUser() user: Record<string, unknown>) {
    const roles  = extractUserRoles(user);
    const deptId = (user.departmentId as string | null) ?? null;
    return this.svc.getMyTasks(user.id as string, roles, deptId);
  }

  /**
   * Executive summary — one-page management overview (Unit 65).
   * Requires elevated role (ELEVATED tier). Standard/dept users receive 403.
   * dashboardExperience field controls the frontend landing page, not this endpoint access.
   */
  @Get('executive')
  @RequirePermissions('project.read')
  getExecutiveSummary(@CurrentUser() user: Record<string, unknown>) {
    const roles  = extractUserRoles(user);
    const deptId = (user.departmentId as string | null) ?? null;
    if (!roles.some((r: string) => EXECUTIVE_ROLES.includes(r))) {
      throw new ForbiddenException('Executive summary requires elevated access');
    }
    return this.svc.getExecutiveSummary(user.id as string, roles, deptId);
  }
}
