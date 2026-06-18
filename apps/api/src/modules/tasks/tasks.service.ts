import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { extractUserPermissions, extractUserRoles } from '../../common/permissions.guard';
import { RealtimeService } from '../realtime/realtime.service';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

const TASK_INCLUDE = {
  assignee: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true } },
  taskList: { select: { id: true, name: true } },
  _count: { select: { subtasks: true, comments: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private realtime: RealtimeService,
    private workspaces: WorkspacesService,
  ) {}

  async findMany(
    filters: {
      workspaceId?: string;
      taskListId?: string;
      assigneeId?: string;
      status?: string;
      parentTaskId?: string | null;
    },
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    if (filters.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(filters.workspaceId, actorId, actorRoles, actorDeptId);
    }

    // For the global task list (no workspaceId filter), restrict to accessible workspaces.
    // Also always restrict STAFF/AUDITOR to only their own assigned tasks on the global list.
    const ELEVATED_ROLES_LOCAL = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES_LOCAL.includes(r));
    const isStaffOrAuditor = actorRoles.includes('STAFF') || actorRoles.includes('AUDITOR_VIEWER');

    const baseWhere: Record<string, unknown> = {
      ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
      ...(filters.taskListId && { taskListId: filters.taskListId }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.parentTaskId !== undefined && { parentTaskId: filters.parentTaskId }),
    };

    let where: Record<string, unknown> = baseWhere;

    if (!filters.workspaceId && !isElevated) {
      // Apply workspace visibility filter for global task list
      const wsVis = this.workspaces.buildWorkspaceVisibilityWhere(actorId, actorRoles, actorDeptId);
      if (isStaffOrAuditor) {
        // STAFF and AUDITOR_VIEWER can only see tasks assigned to them
        where = { AND: [baseWhere, { assigneeId: actorId }, wsVis] };
      } else {
        where = Object.keys(wsVis).length > 0 ? { AND: [baseWhere, wsVis] } : baseWhere;
      }
    }

    return this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: TASK_INCLUDE,
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        subtasks: { include: TASK_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(
    dto: CreateTaskDto,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
    actorPermissions: string[] = [],
  ) {
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const hasCreatePerm = actorPermissions.includes('tasks.create');

    if (dto.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(dto.workspaceId, actorId, actorRoles, actorDeptId);
      if (!isElevated && !hasCreatePerm) {
        const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, dto.workspaceId, actorRoles, actorDeptId);
        if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to create tasks');
      }
    } else if (!isElevated && !hasCreatePerm) {
      throw new ForbiddenException('tasks.create permission required');
    }
    const task = await this.prisma.task.create({
      data: {
        workspaceId: dto.workspaceId,
        taskListId: dto.taskListId,
        parentTaskId: dto.parentTaskId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'MEDIUM',
        assigneeId: dto.assigneeId ?? null,
        createdById: actorId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'TODO',
      },
      include: TASK_INCLUDE,
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'TASK',
      entityId: task.id,
      newValue: { title: task.title, status: task.status },
    });

    await this.recordActivity(task.id, actorId, 'CREATED', `Task created: "${task.title}"`);

    if (dto.assigneeId && dto.assigneeId !== actorId) {
      await this.notifications.create({
        recipientId: dto.assigneeId,
        category: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: `You have been assigned to: "${task.title}"`,
        entityType: 'TASK',
        entityId: task.id,
      });
    }

    this.realtime.emitToWorkspace(task.workspaceId, 'task.created', {
      id: task.id, title: task.title, status: task.status, workspaceId: task.workspaceId,
    });

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actor: Record<string, unknown>) {
    const actorId = actor.id as string;
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const actorPerms = extractUserPermissions(actor);
    const actorRoles = extractUserRoles(actor);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const canManage = actorPerms.includes('tasks.update');
    const isAssignee = existing.assigneeId === actorId;
    const isCreator = existing.createdById === actorId;

    if (!isElevated && !canManage && !isAssignee && !isCreator) {
      // Check workspace MEMBER collaboration as last resort
      if (existing.workspaceId) {
        const dept = (actor.department as { id: string } | null)?.id ?? null;
        const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, existing.workspaceId, actorRoles, dept);
        if (!canCollab) throw new ForbiddenException('Insufficient permissions to update this task');
      } else {
        throw new ForbiddenException('Insufficient permissions to update this task');
      }
    }

    if (!isElevated && !canManage && isAssignee && !isCreator) {
      // Assignee restricted to status updates only
      const restrictedFields = ['title', 'description', 'priority', 'assigneeId', 'dueDate', 'taskListId'];
      const hasRestricted = restrictedFields.some((f) => dto[f as keyof UpdateTaskDto] !== undefined);
      if (hasRestricted) throw new ForbiddenException('Assignee can only update task status');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if ('assigneeId' in dto) updateData.assigneeId = dto.assigneeId ?? null;
    if ('dueDate' in dto) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.taskListId !== undefined) updateData.taskListId = dto.taskListId;
    if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    else if (dto.status && dto.status !== existing.status && existing.status === 'COMPLETED') {
      updateData.completedAt = null;
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_INCLUDE,
    });

    if (dto.status && dto.status !== existing.status) {
      await this.auditLog.log({
        actorId,
        action: 'STATUS_CHANGED',
        entityType: 'TASK',
        entityId: id,
        previousValue: { status: existing.status },
        newValue: { status: dto.status },
      });
      await this.recordActivity(
        id, actorId, 'STATUS_CHANGED',
        `Status changed from ${existing.status} to ${dto.status}`,
      );
    } else {
      await this.auditLog.log({
        actorId,
        action: 'UPDATED',
        entityType: 'TASK',
        entityId: id,
        newValue: updateData as Record<string, unknown>,
      });
    }

    // Notify new assignee if assignee changed
    const newAssigneeId = updateData.assigneeId as string | null | undefined;
    if (
      newAssigneeId !== undefined &&
      newAssigneeId !== null &&
      newAssigneeId !== existing.assigneeId &&
      newAssigneeId !== actorId
    ) {
      await this.notifications.create({
        recipientId: newAssigneeId,
        category: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: `You have been assigned to: "${updated.title}"`,
        entityType: 'TASK',
        entityId: id,
      });
    }

    this.realtime.emitToWorkspace(updated.workspaceId, 'task.updated', {
      id: updated.id, title: updated.title, status: updated.status, workspaceId: updated.workspaceId,
    });

    // Emit task.moved when the task changes task list so other browsers can re-sort the board
    if (dto.taskListId !== undefined && dto.taskListId !== existing.taskListId) {
      this.realtime.emitToWorkspace(updated.workspaceId, 'task.moved', {
        id: updated.id, fromListId: existing.taskListId, toListId: dto.taskListId, workspaceId: updated.workspaceId,
      });
    }

    return updated;
  }

  async addComment(taskId: string, dto: CreateCommentDto, actorId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const comment = await this.prisma.taskComment.create({
      data: { taskId, authorId: actorId, body: dto.body },
      include: { author: { select: { id: true, fullName: true } } },
    });

    await this.recordActivity(taskId, actorId, 'CREATED', 'Added a comment');

    this.realtime.emitToWorkspace(task.workspaceId, 'comment.created', {
      id: comment.id, taskId, workspaceId: task.workspaceId,
    });

    // Detect @username mentions and create notifications (fire-and-forget)
    void this.processMentions(dto.body, actorId, task.title, taskId, 'TASK');

    return comment;
  }

  private async processMentions(
    body: string,
    actorId: string,
    contextTitle: string,
    entityId: string,
    entityType: string,
  ): Promise<void> {
    try {
      const mentions = [...body.matchAll(/@(\w+)/g)].map((m) => m[1]);
      if (mentions.length === 0) return;

      const users = await this.prisma.user.findMany({
        where: { username: { in: mentions }, isActive: true, id: { not: actorId } },
        select: { id: true, username: true },
      });

      for (const u of users) {
        await this.notifications.create({
          recipientId: u.id,
          category: 'MENTION',
          title: 'You were mentioned',
          message: `You were mentioned in a comment on "${contextTitle}"`,
          entityType,
          entityId,
        });
      }
    } catch {
      // Mention notifications are non-critical — swallow errors
    }
  }

  async getComments(taskId: string) {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async getActivity(taskId: string) {
    return this.prisma.activityEvent.findMany({
      where: { entityType: 'TASK', entityId: taskId },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, fullName: true } } },
    });
  }

  async duplicateTask(
    id: string,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    actorPermissions: string[] = [],
  ) {
    const original = await this.prisma.task.findUnique({
      where: { id },
      include: { taskList: { select: { id: true } } },
    });
    if (!original) throw new NotFoundException('Task not found');

    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const hasCreatePerm = actorPermissions.includes('tasks.create');
    if (!isElevated && !hasCreatePerm && original.workspaceId) {
      const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, original.workspaceId, actorRoles, actorDeptId);
      if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to duplicate tasks');
    } else if (!isElevated && !hasCreatePerm && !original.workspaceId) {
      throw new ForbiddenException('tasks.create permission required');
    }

    const copy = await this.prisma.task.create({
      data: {
        workspaceId:  original.workspaceId,
        taskListId:   original.taskListId,
        parentTaskId: null,
        title:        `${original.title} (Copy)`,
        description:  original.description,
        priority:     original.priority,
        assigneeId:   original.assigneeId,
        dueDate:      original.dueDate,
        status:       'TODO',
        createdById:  actorId,
      },
      include: TASK_INCLUDE,
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'TASK',
      entityId: copy.id,
      newValue: { title: copy.title, duplicatedFrom: id },
    });

    this.realtime.emitToWorkspace(copy.workspaceId, 'task.created', {
      id: copy.id, title: copy.title, status: copy.status, workspaceId: copy.workspaceId,
    });

    return copy;
  }

  async deleteTask(id: string, actor: Record<string, unknown>) {
    const actorId = actor.id as string;
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    const actorRoles = extractUserRoles(actor);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));

    if (!isElevated && ['COMPLETED', 'CANCELLED'].includes(task.status)) {
      throw new ForbiddenException('Cannot delete a completed or cancelled task');
    }

    const perms = extractUserPermissions(actor);
    if (!isElevated && !perms.includes('tasks.delete')) {
      throw new ForbiddenException('Insufficient permissions to delete this task');
    }

    await this.prisma.task.delete({ where: { id } });

    void this.auditLog.log({
      actorId,
      action: 'DELETED',
      entityType: 'TASK',
      entityId: id,
      previousValue: { title: task.title, status: task.status },
    });

    this.realtime.emitToWorkspace(task.workspaceId, 'task.deleted', {
      id, workspaceId: task.workspaceId,
    });

    return { success: true };
  }

  async updateComment(
    taskId: string,
    commentId: string,
    dto: UpdateCommentDto,
    actor: Record<string, unknown>,
  ) {
    const actorId = actor.id as string;
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const actorRoles = extractUserRoles(actor);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));

    if (!isElevated && comment.authorId !== actorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: { author: { select: { id: true, fullName: true } } },
    });

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'TASK_COMMENT',
      entityId: commentId,
      previousValue: { body: comment.body },
      newValue: { body: dto.body },
    });

    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { workspaceId: true } });
    if (task) {
      this.realtime.emitToWorkspace(task.workspaceId, 'comment.updated', { id: commentId, taskId });
    }

    return updated;
  }

  async deleteComment(
    taskId: string,
    commentId: string,
    actor: Record<string, unknown>,
  ) {
    const actorId = actor.id as string;
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const actorRoles = extractUserRoles(actor);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));

    if (!isElevated && comment.authorId !== actorId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { workspaceId: true } });

    await this.prisma.taskComment.delete({ where: { id: commentId } });

    void this.auditLog.log({
      actorId,
      action: 'DELETED',
      entityType: 'TASK_COMMENT',
      entityId: commentId,
      previousValue: { taskId, body: comment.body },
    });

    if (task) {
      this.realtime.emitToWorkspace(task.workspaceId, 'comment.deleted', { id: commentId, taskId });
    }

    return { success: true };
  }

  private async recordActivity(
    taskId: string, actorId: string, action: string, summary: string,
  ) {
    try {
      await this.prisma.activityEvent.create({
        data: { entityType: 'TASK', entityId: taskId, actorId, action, summary },
      });
    } catch (err) {
      console.error('[Activity] Failed to record activity:', err);
    }
  }
}
