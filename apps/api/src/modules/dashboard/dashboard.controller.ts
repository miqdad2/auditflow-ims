import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
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
   * Executive summary — one-page management overview (Unit 65.1).
   * Access gate: dashboardExperience === EXECUTIVE, read from the DB-backed current user.
   * Does NOT require elevated role — a Normal User with Executive dashboard can access this.
   * All returned data is scoped to the user's accessible workspaces and permissions.
   */
  @Get('executive')
  @RequirePermissions('project.read')
  getExecutiveSummary(@CurrentUser() user: Record<string, unknown>) {
    const roles  = extractUserRoles(user);
    const deptId = (user.departmentId as string | null) ?? null;
    // Read dashboardExperience from the DB-backed user (JWT strategy loads full user row).
    const dashboardExp = (user.dashboardExperience as string | undefined) ?? 'STANDARD';
    if (dashboardExp !== 'EXECUTIVE') {
      throw new ForbiddenException('Executive Dashboard is not enabled for this account.');
    }
    return this.svc.getExecutiveSummary(user.id as string, roles, deptId);
  }
}
