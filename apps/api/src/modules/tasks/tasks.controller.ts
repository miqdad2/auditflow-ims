import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles, extractUserPermissions } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TaskApprovalReviewDto, TaskApprovalReturnDto } from './dto/task-approval.dto';
import { TASK_STATUS_TRANSITIONS } from '@auditflow/shared';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private svc: TasksService) {}

  /** Returns the authoritative transition map for all role tiers */
  @Get('transitions')
  @RequirePermissions('project.read')
  getTransitions() {
    return TASK_STATUS_TRANSITIONS;
  }

  @Get()
  @RequirePermissions('project.read')
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
  @RequirePermissions('project.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.findOne(id, user.id as string, roles);
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

  /** Controlled status change — validates transition map, role authority, concurrency, mandatory reasons */
  @Patch(':id/status')
  @RequirePermissions('project.read')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.changeStatus(id, dto, user);
  }

  @Post(':id/comments')
  @RequirePermissions('project.read')
  addComment(
    @Param('id') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.addComment(taskId, dto, user.id as string);
  }

  @Get(':id/comments')
  @RequirePermissions('project.read')
  getComments(@Param('id') taskId: string) {
    return this.svc.getComments(taskId);
  }

  @Get(':id/activity')
  @RequirePermissions('project.read')
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

  // ── Task Approval Workflow Endpoints (Unit 63.1) ──────────────────────────
  // Reviewers: workspace Manager/Owner or elevated roles.
  // Creator: resubmit only (RETURNED → PENDING).

  /** Approve a pending task — it becomes an official workspace task. */
  @Post(':id/approval/approve')
  @RequirePermissions('project.read')
  approveTask(
    @Param('id') id: string,
    @Body() dto: TaskApprovalReviewDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.approveTask(id, dto.reviewNote, user.id as string, roles);
  }

  /** Approve and simultaneously mark the task complete (work already submitted). */
  @Post(':id/approval/approve-complete')
  @RequirePermissions('project.read')
  approveAndCompleteTask(
    @Param('id') id: string,
    @Body() dto: TaskApprovalReviewDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.approveAndCompleteTask(id, dto.reviewNote, user.id as string, roles);
  }

  /** Return a task request for creator correction — reason required. */
  @Post(':id/approval/return')
  @RequirePermissions('project.read')
  returnTask(
    @Param('id') id: string,
    @Body() dto: TaskApprovalReturnDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.returnTask(id, dto.reviewNote, user.id as string, roles);
  }

  /** Reject a task request entirely — reason required. */
  @Post(':id/approval/reject')
  @RequirePermissions('project.read')
  rejectTask(
    @Param('id') id: string,
    @Body() dto: TaskApprovalReturnDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.rejectTask(id, dto.reviewNote, user.id as string, roles);
  }

  /** Creator resubmits a RETURNED task — goes back to PENDING. */
  @Post(':id/approval/resubmit')
  @RequirePermissions('project.read')
  resubmitTask(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    return this.svc.resubmitTask(id, user.id as string, roles);
  }

  // ── Recurrence reconciliation (elevated-only) ─────────────────────────────
  // Preview: read-only report of completed recurring tasks missing a next child.
  @Get('recurrence/reconciliation-preview')
  @RequirePermissions('project.read')
  getRecurrenceReconciliationPreview(@CurrentUser() user: Record<string, unknown>) {
    const roles = extractUserRoles(user);
    const ELEVATED = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
    if (!roles.some((r) => ELEVATED.includes(r))) {
      throw new ForbiddenException('Recurrence reconciliation is restricted to elevated roles');
    }
    return this.svc.getRecurrenceReconciliationPreview();
  }

  // Repair: idempotent creation of a single missing next occurrence.
  @Post('recurrence/repair/:sourceId')
  @RequirePermissions('project.read')
  repairMissingOccurrence(
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles = extractUserRoles(user);
    const ELEVATED = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];
    if (!roles.some((r) => ELEVATED.includes(r))) {
      throw new ForbiddenException('Recurrence repair requires Super Admin or Super User role');
    }
    return this.svc.repairMissingOccurrence(sourceId, user.id as string);
  }

  @Patch(':id/comments/:commentId')
  @RequirePermissions('project.read')
  updateComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.updateComment(taskId, commentId, dto, user);
  }

  @Delete(':id/comments/:commentId')
  @RequirePermissions('project.read')
  deleteComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.deleteComment(taskId, commentId, user);
  }
}

// ── Task reorder endpoint lives outside the /tasks prefix ────────────────────
// Route: PATCH /task-lists/:taskListId/tasks/reorder

import { Controller as Ctrl2, Patch as Patch2, Param as Param2, Body as Body2, UseGuards as UseGuards2 } from '@nestjs/common';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';

@Ctrl2('task-lists')
@UseGuards2(JwtAuthGuard, PermissionsGuard)
export class TaskReorderController {
  constructor(private svc: TasksService) {}

  @Patch2(':taskListId/tasks/reorder')
  @RequirePermissions('project.read')
  reorder(
    @Param2('taskListId') taskListId: string,
    @Body2() dto: ReorderTasksDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.reorderTasks(taskListId, dto.orderedIds, user);
  }
}
