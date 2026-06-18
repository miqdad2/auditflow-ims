import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles, extractUserPermissions } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private svc: TasksService) {}

  @Get()
  @RequirePermissions('tasks.read')
  findMany(
    @CurrentUser() user: Record<string, unknown>,
    @Query('workspaceId') workspaceId?: string,
    @Query('taskListId') taskListId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
  ) {
    const roles = extractUserRoles(user);
    const dept = user.department as { id: string } | null;
    return this.svc.findMany(
      { workspaceId, taskListId, assigneeId, status, parentTaskId: null },
      user.id as string, roles, dept?.id ?? null,
    );
  }

  @Get(':id')
  @RequirePermissions('tasks.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('project.read')
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    const dept = user.department as { id: string } | null;
    return this.svc.create(dto, user.id as string, roles, dept?.id ?? null, permissions);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    // Permission checked inside service (tasks.update OR assignee)
    return this.svc.update(id, dto, user);
  }

  @Post(':id/comments')
  @RequirePermissions('tasks.read')
  addComment(
    @Param('id') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.addComment(taskId, dto, user.id as string);
  }

  @Get(':id/comments')
  @RequirePermissions('tasks.read')
  getComments(@Param('id') taskId: string) {
    return this.svc.getComments(taskId);
  }

  @Get(':id/activity')
  @RequirePermissions('tasks.read')
  getActivity(@Param('id') taskId: string) {
    return this.svc.getActivity(taskId);
  }

  @Post(':id/duplicate')
  @RequirePermissions('project.read')
  duplicateTask(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    const dept = user.department as { id: string } | null;
    return this.svc.duplicateTask(id, user.id as string, roles, dept?.id ?? null, permissions);
  }

  @Delete(':id')
  deleteTask(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.deleteTask(id, user);
  }

  @Patch(':id/comments/:commentId')
  @RequirePermissions('tasks.read')
  updateComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.updateComment(taskId, commentId, dto, user);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermissions('tasks.read')
  deleteComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.deleteComment(taskId, commentId, user);
  }
}
