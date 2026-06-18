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
import { NcrCapaService } from './ncr-capa.service';
import { CreateNcrCapaDto } from './dto/create-ncr-capa.dto';
import { UpdateNcrCapaDto } from './dto/update-ncr-capa.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';

@Controller('ncr-capa')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NcrCapaController {
  constructor(private svc: NcrCapaService) {}

  @Get()
  @RequirePermissions('ncr.read')
  findAll(
    @Query('status')       status?: string,
    @Query('severity')     severity?: string,
    @Query('departmentId') departmentId?: string,
    @Query('workspaceId')  workspaceId?: string,
    @Query('type')         type?: string,
    @Query('search')       search?: string,
    @CurrentUser() user?: Record<string, unknown>,
  ) {
    const actorId     = user?.id as string | undefined;
    const actorRoles  = user ? extractUserRoles(user) : [];
    const actorDeptId = (user?.departmentId as string | null) ?? null;
    return this.svc.findAll({ status, severity, departmentId, workspaceId, type, search }, actorId, actorRoles, actorDeptId);
  }

  @Get(':id')
  @RequirePermissions('ncr.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: Record<string, unknown>,
  ) {
    const actorId     = user?.id as string | undefined;
    const actorRoles  = user ? extractUserRoles(user) : [];
    const actorDeptId = (user?.departmentId as string | null) ?? null;
    return this.svc.findOne(id, actorId, actorRoles, actorDeptId);
  }

  @Post()
  @RequirePermissions('project.read')
  create(
    @Body() dto: CreateNcrCapaDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    const permissions = extractUserPermissions(user);
    return this.svc.create(dto, user.id as string, actorRoles, actorDeptId, permissions);
  }

  @Patch(':id')
  @RequirePermissions('ncr.read')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNcrCapaDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    const deptId      = (user.departmentId as string | null) ?? null;
    return this.svc.update(id, dto, user.id as string, roles, permissions, deptId);
  }

  @Patch(':id/submit')
  @RequirePermissions('ncr.read')
  submit(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.submit(id, user.id as string, roles);
  }

  @Patch(':id/verify')
  @RequirePermissions('ncr.verify')
  verify(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    return this.svc.verify(id, user.id as string, roles, permissions);
  }

  @Patch(':id/reject-verification')
  @RequirePermissions('ncr.verify')
  rejectVerification(
    @Param('id') id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    return this.svc.rejectVerification(id, dto, user.id as string, roles, permissions);
  }

  @Patch(':id/close')
  @RequirePermissions('ncr.close')
  close(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    return this.svc.close(id, user.id as string, roles, permissions);
  }

  @Post(':id/comments')
  @RequirePermissions('ncr.read')
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.addComment(id, dto, user.id as string);
  }

  @Get(':id/comments')
  @RequirePermissions('ncr.read')
  getComments(@Param('id') id: string) {
    return this.svc.getComments(id);
  }
}
