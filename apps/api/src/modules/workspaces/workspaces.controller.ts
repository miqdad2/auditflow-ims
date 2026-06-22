import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { extractUserRoles } from '../../common/permissions.guard';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { SetHomePageDto } from './dto/set-home-page.dto';
import { PinItemDto } from './dto/pin-item.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkspacesController {
  constructor(private svc: WorkspacesService) {}

  @Get()
  @RequirePermissions('project.read')
  findAll(@CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.findAll(user.id as string, roles, dept?.id ?? null);
  }

  @Get(':id')
  @RequirePermissions('project.read')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.findOne(id, user.id as string, roles, dept?.id ?? null);
  }

  @Get(':id/overview')
  @RequirePermissions('project.read')
  getOverview(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.getOverview(id, user.id as string, roles, dept?.id ?? null);
  }

  @Get(':id/activity')
  @RequirePermissions('project.read')
  getActivity(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.getActivity(id, user.id as string, roles, dept?.id ?? null);
  }

  @Post()
  @RequirePermissions('project.create')
  create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.create(dto, user.id as string);
  }

  @Patch(':id')
  @RequirePermissions('project.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.update(id, dto, user.id as string);
  }

  @Delete(':id')
  @RequirePermissions('project.read')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.delete(id, user.id as string, roles);
  }

  // ─── Home Page ──────────────────────────────────────────────────────────────

  @Patch(':id/home-page')
  @RequirePermissions('project.update')
  setHomePage(
    @Param('id') id: string,
    @Body() dto: SetHomePageDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.setHomePage(id, dto, user.id as string, roles, dept?.id ?? null);
  }

  // ─── Pinned Items ────────────────────────────────────────────────────────────

  @Get(':id/pinned-items')
  @RequirePermissions('project.read')
  getPinnedItems(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.getPinnedItems(id, user.id as string, roles, dept?.id ?? null);
  }

  @Post(':id/pinned-items')
  @RequirePermissions('project.update')
  pinItem(
    @Param('id') id: string,
    @Body() dto: PinItemDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.pinItem(id, dto, user.id as string, roles, dept?.id ?? null);
  }

  @Delete(':id/pinned-items/:entityId')
  @RequirePermissions('project.update')
  unpinItem(
    @Param('id') id: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.unpinItem(id, entityId, user.id as string, roles, dept?.id ?? null);
  }

  // ─── Members ────────────────────────────────────────────────────────────────

  @Get(':id/members')
  @RequirePermissions('project.read')
  getMembers(@Param('id') id: string) {
    return this.svc.getMembers(id);
  }

  /** Eligible assignees: active MEMBER|MANAGER|OWNER for use in task assignee dropdowns. */
  @Get(':id/members/eligible')
  @RequirePermissions('project.read')
  getEligibleAssignees(@Param('id') id: string) {
    return this.svc.getEligibleAssignees(id);
  }

  /** Data integrity audit — read-only, elevated roles only. */
  @Get(':id/integrity')
  @RequirePermissions('project.read')
  getIntegrity(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    return this.svc.getIntegrity(id, roles);
  }

  @Post(':id/members')
  @RequirePermissions('project.read')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddWorkspaceMemberDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.addMember(id, dto, user);
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions('project.read')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.updateMember(id, memberId, dto, user);
  }

  /** Active-task impact check before removing a member. */
  @Get(':id/members/:memberId/impact')
  @RequirePermissions('project.read')
  getMemberRemovalImpact(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.svc.getMemberRemovalImpact(id, memberId);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions('project.read')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Query('taskHandling') taskHandling: string | undefined,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const handling = taskHandling === 'leave-unassigned' ? 'leave-unassigned' : undefined;
    return this.svc.removeMember(id, memberId, user, handling);
  }
}
