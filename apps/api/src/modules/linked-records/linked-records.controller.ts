import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { LinkedRecordsService } from './linked-records.service';
import { CreateLinkedRecordDto } from './dto/create-linked-record.dto';

@Controller('linked-records')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LinkedRecordsController {
  constructor(private svc: LinkedRecordsService) {}

  @Get('search')
  @RequirePermissions('project.read')
  search(
    @Query('workspaceId') workspaceId: string,
    @Query('targetType') targetType: string,
    @Query('q') q: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.search(workspaceId, targetType, q ?? '', user.id as string, roles, dept?.id ?? null);
  }

  @Get()
  @RequirePermissions('project.read')
  findForSource(
    @Query('sourceType') sourceType: string,
    @Query('sourceId') sourceId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.findForSource(sourceType, sourceId, user.id as string, roles, dept?.id ?? null);
  }

  @Post()
  @RequirePermissions('project.update')
  create(
    @Body() dto: CreateLinkedRecordDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.create(dto, user.id as string, roles, dept?.id ?? null);
  }

  @Delete(':id')
  @RequirePermissions('project.update')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.delete(id, user.id as string, roles, dept?.id ?? null);
  }
}
