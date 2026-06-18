import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import {
  extractUserPermissions,
  extractUserRoles,
} from '../../common/permissions.guard';
import { AuditChecklistsService } from './audit-checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';
import { RejectEvidenceDto } from './dto/reject-evidence.dto';

@Controller('checklists')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditChecklistsController {
  constructor(private svc: AuditChecklistsService) {}

  // ─── Checklists ─────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('checklist.read')
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('workspaceId')  workspaceId?: string,
    @Query('search')       search?: string,
    @CurrentUser() user?: Record<string, unknown>,
  ) {
    const actorId     = user?.id as string | undefined;
    const actorRoles  = user ? extractUserRoles(user) : [];
    const actorDeptId = (user?.departmentId as string | null) ?? null;
    return this.svc.findAll({ departmentId, workspaceId, search }, actorId, actorRoles, actorDeptId);
  }

  @Get(':id')
  @RequirePermissions('checklist.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: Record<string, unknown>,
  ) {
    const actorId     = user?.id as string | undefined;
    const actorRoles  = user ? extractUserRoles(user) : [];
    const actorDeptId = (user?.departmentId as string | null) ?? null;
    return this.svc.findOne(id, actorId, actorRoles, actorDeptId);
  }

  @Get(':id/readiness')
  @RequirePermissions('checklist.read')
  getReadiness(@Param('id') id: string) {
    return this.svc.getReadiness(id);
  }

  @Post()
  @RequirePermissions('checklist.create')
  create(
    @Body() dto: CreateChecklistDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.create(dto, user.id as string, actorRoles, actorDeptId);
  }

  @Patch(':id')
  @RequirePermissions('checklist.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.update(id, dto, user.id as string);
  }

  // ─── Checklist Items ─────────────────────────────────────────────────────────

  @Get(':id/items')
  @RequirePermissions('checklist.read')
  getItems(@Param('id') id: string) {
    return this.svc.getItems(id);
  }

  @Post(':id/items')
  @RequirePermissions('checklist.create')
  createItem(
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.createItem(id, dto, user.id as string);
  }

  @Patch('items/:itemId')
  @RequirePermissions('checklist.update')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.updateItem(itemId, dto, user.id as string);
  }

  // ─── Evidence ─────────────────────────────────────────────────────────────

  @Get('items/:itemId/evidence')
  @RequirePermissions('checklist.read')
  getEvidence(
    @Param('itemId') itemId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    return this.svc.getEvidence(itemId, user.id as string, roles, permissions);
  }

  @Post('items/:itemId/evidence')
  @RequirePermissions('evidence.submit')
  submitEvidence(
    @Param('itemId') itemId: string,
    @Body() dto: SubmitEvidenceDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles        = extractUserRoles(user);
    const permissions  = extractUserPermissions(user);
    const departmentId = (user.departmentId as string | null) ?? null;
    return this.svc.submitEvidence(itemId, dto, user.id as string, roles, permissions, departmentId);
  }

  @Patch('evidence/:evidenceId/approve')
  @RequirePermissions('checklist.review')
  approveEvidence(
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    return this.svc.approveEvidence(evidenceId, user.id as string, roles, permissions);
  }

  @Patch('evidence/:evidenceId/reject')
  @RequirePermissions('checklist.review')
  rejectEvidence(
    @Param('evidenceId') evidenceId: string,
    @Body() dto: RejectEvidenceDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    return this.svc.rejectEvidence(evidenceId, dto, user.id as string, roles, permissions);
  }

  // ─── Department Readiness ────────────────────────────────────────────────

  @Get('departments/:deptId/readiness')
  @RequirePermissions('checklist.read')
  getDepartmentReadiness(@Param('deptId') deptId: string) {
    return this.svc.getDepartmentReadiness(deptId);
  }
}
