import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles, extractUserPermissions } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PagesController {
  constructor(private svc: PagesService) {}

  @Get('workspaces/:workspaceId/pages')
  @RequirePermissions('pages.read')
  findAll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.findAllForWorkspace(workspaceId, user.id as string, roles, dept?.id ?? null);
  }

  @Get('pages/:id')
  @RequirePermissions('pages.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post('workspaces/:workspaceId/pages')
  @RequirePermissions('project.read')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePageDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    const dept = user.department as { id: string } | null;
    return this.svc.create(workspaceId, dto, user.id as string, roles, dept?.id ?? null, permissions);
  }

  @Patch('pages/:id')
  @RequirePermissions('project.read')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    const dept = user.department as { id: string } | null;
    return this.svc.update(id, dto, user.id as string, roles, dept?.id ?? null, permissions);
  }

  @Delete('pages/:id')
  @RequirePermissions('pages.delete')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.delete(id, user.id as string);
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  @Get('pages/templates')
  @RequirePermissions('pages.read')
  getTemplates() {
    return this.svc.getTemplates();
  }

  @Post('workspaces/:workspaceId/pages/from-template')
  @RequirePermissions('project.read')
  createFromTemplate(
    @Param('workspaceId') workspaceId: string,
    @Query('templateId') templateId: string,
    @Query('parentId') parentId: string | undefined,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    const dept = user.department as { id: string } | null;
    return this.svc.createFromTemplate(
      workspaceId, templateId, parentId ?? null,
      user.id as string, roles, dept?.id ?? null, permissions,
    );
  }
}
