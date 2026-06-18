import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { TaskListsService } from './task-lists.service';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { UpdateTaskListDto } from './dto/update-task-list.dto';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskListsController {
  constructor(private svc: TaskListsService) {}

  @Get('workspaces/:workspaceId/task-lists')
  @RequirePermissions('project.read')
  findByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.findByWorkspace(workspaceId, user.id as string, roles, dept?.id ?? null);
  }

  @Post('workspaces/:workspaceId/task-lists')
  @RequirePermissions('project.create')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTaskListDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.create(workspaceId, dto, user.id as string, roles, dept?.id ?? null);
  }

  @Patch('task-lists/:id')
  @RequirePermissions('project.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskListDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.update(id, dto, user.id as string);
  }
}
