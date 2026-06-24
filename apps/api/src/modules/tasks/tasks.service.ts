import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { extractUserPermissions, extractUserRoles } from '../../common/permissions.guard';
import { RealtimeService } from '../realtime/realtime.service';
import {
  TASK_STATUS_TRANSITIONS,
  TASK_STATUS_REASON_REQUIRED,
  TASK_STATUS_REOPEN_SOURCES,
  TaskApprovalStatus,
} from '@auditflow/shared';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

// ─── Kuwait calendar helpers ──────────────────────────────────────────────────
// Kuwait is UTC+3, no DST. Used for due-date calculation to preserve the
// user's intended Kuwait calendar date when advancing recurrence intervals.

/** Add months safely, clamping to the last valid day of the target month.
 *  e.g. Jan 31 + 1 month → Feb 28/29; Aug 31 + 6 months → Feb 28/29 */
export function addMonthsKuwait(date: Date, months: number): Date {
  const d = new Date(date);
  const srcDay   = d.getUTCDate();
  const srcMonth = d.getUTCMonth();
  const srcYear  = d.getUTCFullYear();
  const totalMonths = srcMonth + months;
  const targetYear  = srcYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  // Last valid day of the target month
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  d.setUTCFullYear(targetYear, targetMonth, Math.min(srcDay, lastDay));
  return d;
}

/** Add years safely, handling Feb 29 in non-leap years. */
export function addYearsKuwait(date: Date, years: number): Date {
  const d = new Date(date);
  const targetYear = d.getUTCFullYear() + years;
  const srcMonth   = d.getUTCMonth();
  const srcDay     = d.getUTCDate();
  const lastDay    = new Date(Date.UTC(targetYear, srcMonth + 1, 0)).getUTCDate();
  d.setUTCFullYear(targetYear, srcMonth, Math.min(srcDay, lastDay));
  return d;
}

/** Advance date by one recurrence step. */
export function advanceByInterval(date: Date, interval: string): Date {
  switch (interval) {
    case 'MONTHLY':    return addMonthsKuwait(date, 1);
    case 'QUARTERLY':  return addMonthsKuwait(date, 3);
    case 'SEMIANNUAL': return addMonthsKuwait(date, 6);
    case 'ANNUAL':     return addYearsKuwait(date,  1);
    default:           return date;
  }
}

/** Compute the next occurrence date after `now`, starting from `baseDue`.
 *  Handles late completions: skips all missed historical periods and returns
 *  the first scheduled date that is strictly after `now`. */
export function computeNextDueDate(baseDue: Date, interval: string, now: Date): Date {
  let next = new Date(baseDue);
  let guard = 0;
  while (next <= now && guard++ < 200) {
    next = advanceByInterval(next, interval);
  }
  return next;
}

const TASK_INCLUDE = {
  assignee:  { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true } },
  taskList:  { select: { id: true, name: true } },
  workspace: { select: { id: true, name: true } },
  _count:    { select: { subtasks: true, comments: true } },
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

    if (!isElevated) {
      if (filters.workspaceId) {
        // Workspace-scoped query (workspaceId explicitly provided):
        // assertWorkspaceAccess above already validated membership.
        // baseWhere already contains workspaceId: filters.workspaceId which fully scopes the query.
        // DO NOT apply buildWorkspaceVisibilityWhere here — it includes { workspaceId: null } which
        // is an invalid Prisma filter for Task.workspaceId (non-nullable String).
        // Policy Option A + approval visibility: workspace members see all APPROVED tasks,
        // plus any PENDING/RETURNED/REJECTED tasks they created,
        // plus all tasks visible to workspace managers/owners.
        const approvalVisibilityFilter = {
          OR: [
            { approvalStatus: 'APPROVED' },
            { createdById: actorId },
            {
              workspace: {
                members: {
                  some: { userId: actorId, roleInWorkspace: { in: ['MANAGER', 'OWNER'] } },
                },
              },
            },
          ],
        };
        where = { AND: [baseWhere, approvalVisibilityFilter] };
      } else if (filters.taskListId) {
        // taskListId provided without workspaceId:
        // Need to scope to accessible workspaces, but using a Task-safe member condition.
        // Task.workspaceId is non-nullable — never use { workspaceId: null }.
        const taskMemberCondition = this.buildTaskVisibilityWhere(actorId, actorRoles, actorDeptId);
        where = Object.keys(taskMemberCondition).length > 0
          ? { AND: [baseWhere, taskMemberCondition] }
          : baseWhere;
      } else if (isStaffOrAuditor) {
        // Global task list (no workspace/taskList context): STAFF and AUDITOR_VIEWER may only
        // see tasks assigned to them — prevents browsing the full company task set.
        const taskMemberCondition = this.buildTaskVisibilityWhere(actorId, actorRoles, actorDeptId);
        where = { AND: [baseWhere, { assigneeId: actorId }, taskMemberCondition] };
      } else {
        // DEPARTMENT_MANAGER / DEPARTMENT_USER / others: apply workspace visibility
        const taskMemberCondition = this.buildTaskVisibilityWhere(actorId, actorRoles, actorDeptId);
        where = Object.keys(taskMemberCondition).length > 0
          ? { AND: [baseWhere, taskMemberCondition] }
          : baseWhere;
      }
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: TASK_INCLUDE,
    });
  }

  /**
   * Task-safe workspace-visibility filter.
   * Unlike WorkspacesService.buildWorkspaceVisibilityWhere which includes { workspaceId: null }
   * (safe for nullable-workspaceId entities like Document/NcrCapa), this helper never uses
   * { workspaceId: null } because Task.workspaceId is a non-nullable String field.
   * Passing null to a non-nullable Prisma field causes PrismaClientValidationError.
   */
  private buildTaskVisibilityWhere(
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ): Record<string, unknown> {
    const ELEVATED_ROLES_LOCAL = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
    if (actorRoles.some((r) => ELEVATED_ROLES_LOCAL.includes(r))) return {};

    // Task always belongs to a workspace — only check direct membership.
    // No { workspaceId: null } condition since Task.workspaceId is non-nullable.
    const memberCondition = { workspace: { members: { some: { userId: actorId } } } };

    const isDeptRole = actorRoles.includes('DEPARTMENT_MANAGER') || actorRoles.includes('DEPARTMENT_USER');
    if (isDeptRole && actorDeptId) {
      return {
        OR: [
          memberCondition,
          { workspace: { visibility: 'DEPARTMENT', departmentId: actorDeptId } },
        ],
      };
    }

    return memberCondition;
  }

  async findOne(id: string, actorId?: string, actorRoles?: string[]) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        subtasks: { include: TASK_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Visibility check for private pending/returned/rejected tasks
    if (actorId && actorRoles && (task as Record<string, unknown>).approvalStatus !== 'APPROVED') {
      await this.assertApprovalVisibility(
        task as Record<string, unknown>,
        actorId,
        actorRoles,
      );
    }

    return task;
  }

  /** Check that `actorId` is allowed to see a non-approved (private) task.
   *  Throws ForbiddenException if access is denied. */
  private async assertApprovalVisibility(
    task: Record<string, unknown>,
    actorId: string,
    actorRoles: string[],
  ): Promise<void> {
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (isElevated) return;
    if (task['createdById'] === actorId) return;

    // Workspace manager/owner can always see pending tasks
    const wsId = task['workspaceId'] as string | null;
    if (wsId) {
      const memberRole = await this.workspaces.getWorkspaceMemberRole(actorId, wsId);
      if (memberRole === 'MANAGER' || memberRole === 'OWNER') return;
    }

    throw new ForbiddenException('You do not have access to this task.');
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

    // ── Determine whether this is a MEMBER private task request (Unit 63.1) ──
    // A task is private/pending when created by a non-elevated workspace Member.
    // hasCreatePerm covers DEPARTMENT_MANAGER/DEPARTMENT_USER who may create official tasks.
    const isMemberCreate = !isElevated && !hasCreatePerm && !!dto.workspaceId;

    if (isMemberCreate) {
      // Require business reason for private task requests
      if (!dto.approvalNote?.trim()) {
        throw new BadRequestException(
          'Please provide a business reason (approvalNote) for your task request.',
        );
      }
      // Members cannot assign to another user before approval
      if (dto.assigneeId && dto.assigneeId !== actorId) {
        throw new BadRequestException(
          'Private task requests are automatically assigned to you. You cannot assign another user before the task is approved.',
        );
      }
      // Members cannot create recurring private tasks before approval
      if (dto.recurrenceInterval && dto.recurrenceInterval !== 'NONE') {
        throw new BadRequestException(
          'Recurrence cannot be set on a private task request. Enable recurrence after the task is approved.',
        );
      }
    }

    const recurrenceInterval = isMemberCreate ? 'NONE' : (dto.recurrenceInterval ?? 'NONE');

    // Validate: recurring tasks must have a due date
    if (recurrenceInterval !== 'NONE' && !dto.dueDate) {
      throw new BadRequestException('A due date is required for recurring tasks.');
    }

    // Validate assignee: must be an active workspace member (elevated actors can assign to any active user)
    // For member creates, assigneeId is always overridden to actorId below.
    if (!isMemberCreate && dto.assigneeId && dto.workspaceId) {
      await this.workspaces.assertCanBeAssigned(dto.assigneeId, dto.workspaceId, actorRoles);
    }

    // Generate a series ID if this task has recurrence; it will be inherited by all occurrences
    const recurrenceSeriesId = recurrenceInterval !== 'NONE' ? randomUUID() : null;

    // Approval state: PENDING for MEMBER private requests, APPROVED for all others
    const approvalStatus = isMemberCreate ? TaskApprovalStatus.PENDING : TaskApprovalStatus.APPROVED;
    // For member creates: always self-assigned
    const resolvedAssigneeId = isMemberCreate ? actorId : (dto.assigneeId ?? null);

    const task = await this.prisma.task.create({
      data: {
        workspaceId:        dto.workspaceId,
        taskListId:         dto.taskListId,
        parentTaskId:       dto.parentTaskId ?? null,
        title:              dto.title,
        description:        dto.description ?? null,
        priority:           dto.priority ?? 'MEDIUM',
        isReference:        dto.isReference ?? false,
        assigneeId:         resolvedAssigneeId,
        createdById:        actorId,
        dueDate:            dto.dueDate ? new Date(dto.dueDate) : null,
        status:             'TODO',
        recurrenceInterval,
        recurrenceEndDate:  dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null,
        recurrenceSeriesId,
        approvalStatus,
        approvalNote:       dto.approvalNote?.trim() ?? null,
      },
      include: TASK_INCLUDE,
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'TASK',
      entityId: task.id,
      newValue: {
        title: task.title, status: task.status, approvalStatus,
        privateTaskRequest: isMemberCreate,
      },
    });

    const activitySummary = isMemberCreate
      ? `Private task request created: "${task.title}" — awaiting reviewer approval`
      : `Task created: "${task.title}"`;
    await this.recordActivity(task.id, actorId, 'CREATED', activitySummary);

    if (!isMemberCreate && dto.assigneeId && dto.assigneeId !== actorId) {
      // Standard task assignment notification (only for approved tasks)
      const [ws, actorUser] = await Promise.all([
        task.workspaceId ? this.prisma.workspace.findUnique({ where: { id: task.workspaceId }, select: { name: true } }).catch(() => null) : null,
        this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }).catch(() => null),
      ]);
      const wsText  = ws?.name         ? ` in ${ws.name}`              : '';
      const byText  = actorUser?.fullName ? ` by ${actorUser.fullName}` : '';
      const dueText = task.dueDate     ? ` · Due ${new Date(task.dueDate as Date).toLocaleDateString('en-GB')}` : '';
      await this.notifications.create({
        recipientId: dto.assigneeId,
        category:    'TASK_ASSIGNED',
        title:       'Task Assigned',
        message:     `You were assigned "${task.title}"${wsText}${byText}.${dueText}`,
        entityType:  'TASK',
        entityId:    task.id,
        workspaceId: task.workspaceId,
      });
    }

    if (isMemberCreate) {
      // Notify workspace managers/owners that a private task awaits approval
      await this.notifyApprovalReviewers(task.id, task.title as string, task.workspaceId, actorId).catch(() => {});
    }

    try {
      this.realtime.emitToWorkspace(task.workspaceId, 'task.created', {
        id: task.id, title: task.title, status: task.status, workspaceId: task.workspaceId,
        approvalStatus,
        createdAt: (task.createdAt as Date).toISOString(),
        updatedAt: (task.updatedAt as Date).toISOString(),
      });
    } catch (emitErr) {
      console.error('[Tasks] Post-commit task.created emit failed (non-critical):', emitErr);
    }

    return task;
  }

  /** Notify workspace managers/owners (and optionally super users) when a new
   *  private task request is submitted. Fire-and-forget — failures are swallowed. */
  private async notifyApprovalReviewers(
    taskId: string,
    taskTitle: string,
    workspaceId: string,
    creatorId: string,
  ): Promise<void> {
    const [ws, creator] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }).catch(() => null),
      this.prisma.user.findUnique({ where: { id: creatorId }, select: { fullName: true } }).catch(() => null),
    ]);
    const wsName      = ws?.name ?? 'the workspace';
    const creatorName = creator?.fullName ?? 'A team member';
    const msg = `${creatorName} added "${taskTitle}" in ${wsName}. Approval is required before it becomes an official workspace task.`;

    const reviewers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, roleInWorkspace: { in: ['MANAGER', 'OWNER'] }, user: { isActive: true } },
      select: { userId: true },
    });
    for (const r of reviewers) {
      if (r.userId === creatorId) continue;
      await this.notifications.create({
        recipientId: r.userId,
        category:    'TASK_PENDING_APPROVAL',
        title:       'New Task Awaiting Approval',
        message:     msg,
        entityType:  'TASK',
        entityId:    taskId,
        workspaceId,
      }).catch(() => {});
    }
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

    // Validate new assignee when changed — must be workspace member (unless elevated)
    if ('assigneeId' in dto && dto.assigneeId && dto.assigneeId !== existing.assigneeId && existing.workspaceId) {
      await this.workspaces.assertCanBeAssigned(dto.assigneeId, existing.workspaceId, actorRoles);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined)       updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined)      updateData.status = dto.status;
    if (dto.priority !== undefined)    updateData.priority = dto.priority;
    if (dto.isReference !== undefined) updateData.isReference = dto.isReference;
    if ('assigneeId' in dto) updateData.assigneeId = dto.assigneeId ?? null;
    if ('dueDate' in dto)    updateData.dueDate    = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.taskListId !== undefined) updateData.taskListId = dto.taskListId;
    if (dto.recurrenceInterval !== undefined) updateData.recurrenceInterval = dto.recurrenceInterval;
    if ('recurrenceEndDate' in dto)   updateData.recurrenceEndDate = dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null;

    // stopRecurrence: clear interval so no next occurrence is ever spawned
    if (dto.stopRecurrence === true) {
      updateData.recurrenceInterval = 'NONE';
      updateData.recurrenceEndDate  = null;
    }

    if (dto.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (dto.status && dto.status !== existing.status && existing.status === 'COMPLETED') {
      updateData.completedAt = null;
    }

    const isCompletingNow = dto.status === 'COMPLETED' && existing.status !== 'COMPLETED';
    const effectiveInterval = (updateData.recurrenceInterval as string | undefined) ?? existing.recurrenceInterval;
    const needsSpawn = isCompletingNow && effectiveInterval && effectiveInterval !== 'NONE';

    // ── Atomic completion path ─────────────────────────────────────────────
    // When a recurring task is completed, the completion and the next-occurrence
    // creation happen in a single transaction. If either fails, both roll back.
    // No fire-and-forget: the caller receives an error rather than silent data loss.
    let updated: Awaited<ReturnType<typeof this.prisma.task.update>>;
    let nextTask: Awaited<ReturnType<typeof this.prisma.task.create>> | null = null;

    if (needsSpawn) {
      // Pre-compute everything that can fail before entering the transaction
      const base = existing.dueDate as Date | null;
      if (!base) {
        // No due date — cannot compute next; fall back to non-atomic update
        updated = await this.prisma.task.update({ where: { id }, data: updateData, include: TASK_INCLUDE });
      } else {
        const now  = new Date();
        const end  = (updateData.recurrenceEndDate as Date | null) ?? (existing.recurrenceEndDate as Date | null);
        const nextDue = computeNextDueDate(base, effectiveInterval, now);

        // Resolve assignee eligibility for the next occurrence.
        // If the assignee is no longer active or is no longer a workspace member
        // with an operational role, the new task is spawned unassigned rather than failing.
        let assigneeId = existing.assigneeId as string | null;
        if (assigneeId && existing.workspaceId) {
          try {
            await this.workspaces.assertCanBeAssigned(assigneeId, existing.workspaceId, []);
          } catch {
            // Assignee became ineligible (inactive, removed from workspace, downgraded to Viewer)
            assigneeId = null;
          }
        }

        // Check recurrence end date using correct semantics (Part 5):
        // Allow creation if nextDue <= endDate (on the boundary: allowed).
        const spawnBlocked = end !== null && nextDue > end;

        if (spawnBlocked) {
          // End date passed — just complete, no spawn
          updated = await this.prisma.task.update({ where: { id }, data: updateData, include: TASK_INCLUDE });
        } else {
          // --- Atomic transaction: complete source + create child ---
          const txResult = await this.prisma.$transaction(async (tx) => {
            // Re-check source task inside transaction to handle concurrent stop/complete
            const fresh = await tx.task.findUnique({ where: { id }, select: { status: true, recurrenceInterval: true } });
            if (!fresh) throw new NotFoundException('Task not found inside transaction');
            // If another request already completed this task, the uniqueness constraint
            // on recurrenceParentId will catch any duplicate child.
            // If recurrence was stopped concurrently, do not create a child.
            const committedInterval = fresh.recurrenceInterval;
            const shouldCreateChild = committedInterval !== 'NONE';

            // Status-independent idempotency: any existing child (any status) blocks creation
            let existingChild: { id: string } | null = null;
            if (shouldCreateChild) {
              existingChild = await tx.task.findFirst({
                where:  { recurrenceParentId: id },
                select: { id: true },
              });
            }

            const updatedInTx = await tx.task.update({
              where: { id },
              data:  updateData,
              include: TASK_INCLUDE,
            });

            let createdChild: typeof updatedInTx | null = null;
            if (shouldCreateChild && !existingChild) {
              createdChild = await tx.task.create({
                data: {
                  workspaceId:        existing.workspaceId,
                  taskListId:         existing.taskListId,
                  title:              existing.title,
                  description:        existing.description,
                  priority:           existing.priority,
                  isReference:        existing.isReference,
                  assigneeId,
                  createdById:        actorId,
                  status:             'TODO',
                  dueDate:            nextDue,
                  recurrenceInterval: committedInterval,
                  recurrenceEndDate:  end,
                  recurrenceSeriesId: existing.recurrenceSeriesId,
                  recurrenceParentId: id,
                },
                include: TASK_INCLUDE,
              });

              // Audit for child — inside the same transaction for consistency
              await tx.activityEvent.create({
                data: {
                  entityType: 'TASK',
                  entityId:   createdChild.id,
                  actorId,
                  action:     'CREATED',
                  summary:    `Recurring task created from "${createdChild.title}" (${committedInterval})`,
                },
              });
            }

            return { updatedInTx, createdChild };
          });

          updated  = txResult.updatedInTx;
          nextTask = txResult.createdChild;

          // Post-commit: write audit log for the source (outside tx — non-critical)
          void this.auditLog.log({
            actorId,
            action: 'CREATED',
            entityType: 'TASK',
            entityId: nextTask?.id ?? id,
            newValue: nextTask ? {
              title: nextTask.title, isReference: nextTask.isReference,
              recurrenceInterval: effectiveInterval,
              sourceTaskId: id, previousDueDate: base.toISOString(),
              nextDueDate: nextTask.dueDate instanceof Date ? nextTask.dueDate.toISOString() : String(nextTask.dueDate),
              spawnedBySystem: true,
            } : { completedWithoutChild: true, reason: 'existing child or stopped' },
          }).catch(() => {});
        }
      }
    } else {
      // Non-recurring update or non-completion change
      updated = await this.prisma.task.update({ where: { id }, data: updateData, include: TASK_INCLUDE });
    }

    // ── Post-update audit and activity (for the source task) ──────────────
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
    } else if (!needsSpawn) {
      await this.auditLog.log({
        actorId,
        action: 'UPDATED',
        entityType: 'TASK',
        entityId: id,
        newValue: updateData as Record<string, unknown>,
      });
    }

    if (dto.stopRecurrence === true) {
      await this.auditLog.log({
        actorId, action: 'UPDATED', entityType: 'TASK', entityId: id,
        previousValue: { recurrenceInterval: existing.recurrenceInterval },
        newValue:      { recurrenceInterval: 'NONE', recurrenceStopped: true },
      });
      await this.recordActivity(id, actorId, 'UPDATED', 'Future recurrence stopped');
    }

    // ── Post-commit realtime + notifications ──────────────────────────────
    // Emit only after the transaction has committed successfully.
    // Wrapped in try-catch: a socket.io failure must never surface as a 500
    // after the DB write has already committed successfully.
    try {
      this.realtime.emitToWorkspace(updated.workspaceId, 'task.updated', {
        id: updated.id, title: updated.title, status: updated.status, workspaceId: updated.workspaceId,
        updatedAt: (updated.updatedAt as Date).toISOString(),
      });

      if (dto.taskListId !== undefined && dto.taskListId !== existing.taskListId) {
        this.realtime.emitToWorkspace(updated.workspaceId, 'task.moved', {
          id: updated.id, fromListId: existing.taskListId, toListId: dto.taskListId, workspaceId: updated.workspaceId,
        });
      }
    } catch (emitErr) {
      console.error('[Tasks] Post-commit task.updated emit failed (non-critical):', emitErr);
    }

    if (nextTask) {
      try {
        this.realtime.emitToWorkspace(nextTask.workspaceId, 'task.created', {
          id: nextTask.id, title: nextTask.title, status: nextTask.status,
          workspaceId: nextTask.workspaceId,
        });
      } catch (emitErr) {
        console.error('[Tasks] Post-commit task.created (recurrence) emit failed (non-critical):', emitErr);
      }

      // Notification — fire-and-forget; failure must not affect committed data
      const childAssigneeId = nextTask.assigneeId as string | null;
      if (childAssigneeId && childAssigneeId !== actorId) {
        void this.notifications.create({
          recipientId: childAssigneeId,
          category:    'TASK_ASSIGNED',
          title:       nextTask.isReference ? 'Recurring Reference Item' : 'Recurring Task Scheduled',
          message:     nextTask.isReference
            ? `A recurring reference item is due: "${nextTask.title}"`
            : `A recurring task has been scheduled: "${nextTask.title}"`,
          entityType:  'TASK',
          entityId:    nextTask.id,
          workspaceId: nextTask.workspaceId,
        }).catch((err) => {
          console.error('[Recurrence] Notification failed after commit (non-critical):', err);
        });
      }
    }

    // Notify new assignee if assignee changed (non-recurrence path)
    const newAssigneeId = updateData.assigneeId as string | null | undefined;
    if (
      newAssigneeId !== undefined &&
      newAssigneeId !== null &&
      newAssigneeId !== existing.assigneeId &&
      newAssigneeId !== actorId
    ) {
      // Enrich with workspace name and assigner name
      const [ws, actorUser] = await Promise.all([
        updated.workspaceId ? this.prisma.workspace.findUnique({ where: { id: updated.workspaceId }, select: { name: true } }).catch(() => null) : null,
        this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }).catch(() => null),
      ]);
      const wsText  = ws?.name        ? ` in ${ws.name}`                : '';
      const byText  = actorUser?.fullName ? ` by ${actorUser.fullName}` : '';
      const dueText = updated.dueDate ? ` · Due ${new Date(updated.dueDate as Date).toLocaleDateString('en-GB')}` : '';
      await this.notifications.create({
        recipientId: newAssigneeId,
        category:    'TASK_ASSIGNED',
        title:       'Task Assigned',
        message:     `You were assigned "${updated.title}"${wsText}${byText}.${dueText}`,
        entityType:  'TASK',
        entityId:    id,
        workspaceId: updated.workspaceId,
      });
    }

    return updated;
  }

  // ─── Controlled status change ─────────────────────────────────────────────────
  // Single authoritative method for all manual status transitions.
  // Validates transition map, role authority, mandatory reasons, concurrency,
  // then commits atomically: task update + ActivityEvent + AuditLog in one
  // transaction. Post-commit: realtime emit + status-change notifications.

  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
    actor: Record<string, unknown>,
  ) {
    const actorId    = actor.id as string;
    const actorRoles = extractUserRoles(actor);
    const actorPerms = extractUserPermissions(actor);

    const SUPER_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];
    const isElevated  = actorRoles.some((r) => SUPER_ROLES.includes(r));
    const canManage   = actorPerms.includes('tasks.update');

    // ── 1. Load task ────────────────────────────────────────────────────────
    const task = await this.prisma.task.findUnique({
      where:   { id },
      include: { taskList: { select: { id: true, workspaceId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const currentStatus    = task.status as string;
    const taskApprovalStatus = (task as Record<string, unknown>).approvalStatus as string;
    const { newStatus, reason, source = 'API', isOverride = false } = dto;

    // Same status — no-op, return current state without error
    if (currentStatus === newStatus) {
      return this.findOne(id);
    }

    // ── 2. Concurrency check (expectedUpdatedAt) ─────────────────────────────
    if (dto.expectedUpdatedAt) {
      const expected = new Date(dto.expectedUpdatedAt).getTime();
      const actual   = (task.updatedAt as Date).getTime();
      if (Math.abs(expected - actual) > 1000) {
        throw new ConflictException(
          'This task was updated by another user. Refresh before continuing.',
        );
      }
    }

    // ── 3. Determine role tier for transition map ─────────────────────────────
    const wsMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: task.workspaceId, userId: actorId },
      select: { roleInWorkspace: true },
    });
    const wsRole      = wsMember?.roleInWorkspace as string | undefined;
    const isWsManager = wsRole === 'OWNER' || wsRole === 'MANAGER';

    let tier: 'ELEVATED' | 'MANAGER' | 'MEMBER';
    if (isElevated || canManage)  tier = 'ELEVATED';
    else if (isWsManager)         tier = 'MANAGER';
    else                          tier = 'MEMBER';

    // ── 4a. Approval state guard for MEMBER tier ─────────────────────────────
    // RETURNED: creator should edit and resubmit via resubmitTask(), not change work status
    // REJECTED: task is closed — no work status changes allowed for non-elevated
    if (tier === 'MEMBER') {
      if (taskApprovalStatus === TaskApprovalStatus.RETURNED) {
        throw new ForbiddenException(
          'This task request was returned for correction. Edit your task details and resubmit it for review.',
        );
      }
      if (taskApprovalStatus === TaskApprovalStatus.REJECTED) {
        throw new ForbiddenException(
          'This task request was rejected and can no longer be changed.',
        );
      }
    }

    // ── 4. Validate transition ────────────────────────────────────────────────
    const validNext = TASK_STATUS_TRANSITIONS[tier][currentStatus] ?? [];
    const isAllowed = validNext.includes(newStatus);

    if (!isAllowed) {
      // Super users / Super Admins may override with explicit flag + reason
      if (isOverride && (actorRoles.includes('SUPER_ADMIN') || actorRoles.includes('SUPER_USER'))) {
        if (!reason?.trim()) {
          throw new BadRequestException(
            'An override reason is required when bypassing a transition restriction.',
          );
        }
        // override allowed — fall through
      } else {
        throw new BadRequestException(
          'This status change is not allowed from the current task status.',
        );
      }
    }

    // ── 5. Validate access (non-elevated non-managers must be assignee/creator) ──
    if (!isElevated && !canManage && !isWsManager) {
      const isAssignee = task.assigneeId === actorId;
      const isCreator  = task.createdById === actorId;
      if (!isAssignee && !isCreator) {
        const dept = (actor.department as { id: string } | null)?.id ?? null;
        const canCollab = await this.workspaces.canCollaborateInWorkspace(
          actorId, task.workspaceId, actorRoles, dept,
        );
        if (!canCollab) throw new ForbiddenException('You do not have permission to change this task status.');
      }
    }

    // Viewers (non-member workspace roles) cannot mutate
    if (wsRole === 'VIEWER' && !isElevated && !canManage) {
      throw new ForbiddenException('You do not have permission to change this task status.');
    }

    // ── 6. Validate mandatory reason ─────────────────────────────────────────
    const isReopening = TASK_STATUS_REOPEN_SOURCES.has(currentStatus);
    const requiresReason = TASK_STATUS_REASON_REQUIRED.has(newStatus) || isReopening;

    if (requiresReason && !reason?.trim()) {
      throw new BadRequestException('Please provide a reason before continuing.');
    }

    // ── 7. Compute completedAt ────────────────────────────────────────────────
    let completedAt: Date | null = task.completedAt as Date | null;
    if (newStatus === 'COMPLETED') {
      completedAt = new Date(); // server-authoritative timestamp
    } else if (isReopening && currentStatus === 'COMPLETED') {
      completedAt = null; // clear on reopen from COMPLETED
    }

    // ── 8. Check recurrence spawn requirement ─────────────────────────────────
    const isCompletingNow = newStatus === 'COMPLETED' && currentStatus !== 'COMPLETED';
    const effectiveInterval = (task as Record<string, unknown>).recurrenceInterval as string;
    const needsSpawn = isCompletingNow && effectiveInterval && effectiveInterval !== 'NONE';

    // ── 9. Atomic transaction: task + activityEvent + auditLog ───────────────
    let nextTask: { id: string; workspaceId: string; title: string; assigneeId: string | null } | null = null;

    await this.prisma.$transaction(async (tx) => {
      // Re-read for final concurrency safety inside tx
      const fresh = await tx.task.findUnique({ where: { id }, select: { status: true, updatedAt: true } });
      if (!fresh) throw new NotFoundException('Task not found');
      if (fresh.status !== currentStatus) {
        throw new ConflictException(
          'This task was updated by another user. Refresh before continuing.',
        );
      }

      // Update task status
      await tx.task.update({
        where: { id },
        data:  { status: newStatus, completedAt },
      });

      // ActivityEvent with metadata — use action-oriented summary (Part 19)
      const activitySummary = (() => {
        const t = task.title as string;
        if (newStatus === 'WAITING_REVIEW') return `submitted "${t}" for completion review${reason ? `: "${reason}"` : ''}`;
        if (newStatus === 'COMPLETED')      return `approved completion of "${t}"${reason ? `. ${reason}` : ''}`;
        if (newStatus === 'REJECTED')       return `returned "${t}" for correction${reason ? `. Reason: "${reason}"` : ''}`;
        if (newStatus === 'IN_PROGRESS' && currentStatus === 'REJECTED') return `resumed work on "${t}"`;
        if (newStatus === 'IN_PROGRESS' && currentStatus === 'TODO') return `started work on "${t}"`;
        if (newStatus === 'CANCELLED')      return `cancelled "${t}"${reason ? `. Reason: "${reason}"` : ''}`;
        if (newStatus === 'TODO')           return `reopened "${t}"${reason ? `. Reason: "${reason}"` : ''}`;
        return `changed "${t}" from ${currentStatus} to ${newStatus}${reason ? `: "${reason}"` : ''}`;
      })();

      await tx.activityEvent.create({
        data: {
          entityType: 'TASK',
          entityId:   id,
          actorId,
          action:     'STATUS_CHANGED',
          summary:    activitySummary,
          metadata:   {
            previousStatus: currentStatus,
            newStatus,
            reason:    reason?.trim() ?? null,
            source,
            assigneeId: task.assigneeId as string | null,
            isOverride: isOverride && (actorRoles.includes('SUPER_ADMIN') || actorRoles.includes('SUPER_USER')),
          },
        },
      });

      // AuditLog
      await tx.auditLog.create({
        data: {
          actorId,
          action:        'STATUS_CHANGED',
          entityType:    'TASK',
          entityId:      id,
          previousValue: { status: currentStatus, reason: null },
          newValue:      {
            status:     newStatus,
            reason:     reason?.trim() ?? null,
            source,
            isOverride: isOverride && (actorRoles.includes('SUPER_ADMIN') || actorRoles.includes('SUPER_USER')),
          },
        },
      });

      // Recurrence spawn inside the same transaction
      if (needsSpawn) {
        const base  = task.dueDate as Date | null;
        const end   = task.recurrenceEndDate as Date | null;
        const now   = new Date();

        if (base) {
          const nextDue = computeNextDueDate(base, effectiveInterval, now);
          const spawnBlocked = end !== null && nextDue > end;

          if (!spawnBlocked) {
            // Idempotency: any existing child blocks creation
            const existingChild = await tx.task.findFirst({
              where:  { recurrenceParentId: id },
              select: { id: true },
            });

            if (!existingChild) {
              // Validate assignee is still active
              let childAssigneeId = task.assigneeId as string | null;
              if (childAssigneeId) {
                const assignee = await tx.user.findUnique({
                  where:  { id: childAssigneeId },
                  select: { isActive: true },
                });
                if (!assignee?.isActive) childAssigneeId = null;
              }

              const child = await tx.task.create({
                data: {
                  workspaceId:        task.workspaceId,
                  taskListId:         task.taskListId,
                  title:              task.title as string,
                  description:        task.description as string | null,
                  priority:           task.priority as string,
                  isReference:        task.isReference as boolean,
                  assigneeId:         childAssigneeId,
                  createdById:        actorId,
                  status:             'TODO',
                  dueDate:            nextDue,
                  recurrenceInterval: effectiveInterval,
                  recurrenceEndDate:  end,
                  recurrenceSeriesId: task.recurrenceSeriesId as string | null,
                  recurrenceParentId: id,
                },
                select: {
                  id: true, workspaceId: true, title: true, assigneeId: true,
                },
              });

              await tx.activityEvent.create({
                data: {
                  entityType: 'TASK',
                  entityId:   child.id,
                  actorId,
                  action:     'CREATED',
                  summary:    `Recurring task scheduled: "${child.title}"`,
                  metadata:   { spawnedBySystem: true, sourceTaskId: id, nextDueDate: nextDue.toISOString() },
                },
              });

              nextTask = child;
            }
          }
        }
      }
    });

    // ── 10. Fetch updated task after commit ───────────────────────────────────
    const updated = await this.findOne(id);

    // ── 11. Realtime — after commit, wrapped so emit failure ≠ API failure ────
    const actorUser = await this.prisma.user.findUnique({
      where:  { id: actorId },
      select: { id: true, fullName: true },
    });

    try {
      this.realtime.emitToWorkspace(task.workspaceId, 'task.updated', {
        id,
        workspaceId:    task.workspaceId,
        previousStatus: currentStatus,
        newStatus,
        updatedAt:      updated.updatedAt,
        completedAt:    updated.completedAt,
        changedBy:      actorUser ?? { id: actorId, fullName: 'Unknown' },
        reason:         reason?.trim() ?? null,
        source,
      });
    } catch (emitErr) {
      console.error('[Tasks] Post-commit task.updated emit failed (non-critical):', emitErr);
    }

    const spawnedTask = nextTask as { id: string; workspaceId: string } | null;
    if (spawnedTask) {
      try {
        this.realtime.emitToWorkspace(spawnedTask.workspaceId, 'task.created', {
          id: spawnedTask.id, workspaceId: spawnedTask.workspaceId,
        });
      } catch (emitErr) {
        console.error('[Tasks] Post-commit task.created (recurrence) emit failed:', emitErr);
      }
    }

    // ── 12. Status-change notifications (fire-and-forget after commit) ────────
    void this.sendStatusChangeNotifications(
      id, task.title as string, task.workspaceId,
      currentStatus, newStatus,
      task.assigneeId as string | null,
      task.createdById as string,
      actorId, reason?.trim() ?? null, nextTask,
    ).catch((err) => {
      console.error('[Tasks] Status-change notifications failed (non-critical):', err);
    });

    return updated;
  }

  private async sendStatusChangeNotifications(
    taskId: string,
    taskTitle: string,
    workspaceId: string,
    previousStatus: string,
    newStatus: string,
    assigneeId: string | null,
    creatorId: string,
    actorId: string,
    reason: string | null,
    nextTask: { id: string; workspaceId: string; title: string; assigneeId: string | null } | null,
  ): Promise<void> {
    const notify = (recipientId: string, category: string, title: string, message: string) => {
      if (recipientId === actorId) return; // don't notify the actor
      return this.notifications.create({
        recipientId, category, title, message,
        entityType: 'TASK', entityId: taskId, workspaceId,
      });
    };

    switch (newStatus) {
      case 'WAITING_REVIEW': {
        // Notify the task creator (may be Super User or Manager) + workspace managers/owners
        const submitterName = actorId === assigneeId ? 'The assignee' : 'A team member';
        const reviewMsg = `${submitterName} submitted "${taskTitle}" for completion review.`;

        if (creatorId !== actorId) {
          await notify(creatorId, 'TASK_WAITING_REVIEW', 'Task Submitted for Review', reviewMsg);
        }

        // Also notify workspace managers and owners (they are the designated reviewers)
        if (workspaceId) {
          const wsManagers = await this.prisma.workspaceMember.findMany({
            where: { workspaceId, roleInWorkspace: { in: ['MANAGER', 'OWNER'] } },
            select: { userId: true },
          });
          for (const m of wsManagers) {
            if (m.userId !== actorId && m.userId !== creatorId) {
              await notify(m.userId, 'TASK_WAITING_REVIEW', 'Task Submitted for Review', reviewMsg);
            }
          }
        }
        break;
      }

      case 'COMPLETED': {
        // Reviewer approved completion — notify assignee
        const approverNote = reason ? ` Review note: ${reason}` : '';
        if (assigneeId) await notify(assigneeId, 'TASK_COMPLETED', 'Completion Approved',
          `Your work on "${taskTitle}" was reviewed and approved.${approverNote}`);
        if (creatorId !== assigneeId && creatorId !== actorId) await notify(creatorId, 'TASK_COMPLETED', 'Task Completed',
          `"${taskTitle}" has been approved and marked complete.`);
        break;
      }

      case 'REJECTED': {
        const returnReason = reason
          ? `"${taskTitle}" was returned for correction. Reason: ${reason}`
          : `"${taskTitle}" was returned for correction.`;
        if (assigneeId) await notify(assigneeId, 'TASK_REJECTED', 'Task Returned for Correction', returnReason);
        break;
      }

      case 'CANCELLED':
        if (assigneeId) await notify(assigneeId, 'TASK_CANCELLED', 'Task Cancelled',
          `"${taskTitle}" has been cancelled.`);
        if (creatorId !== assigneeId) await notify(creatorId, 'TASK_CANCELLED', 'Task Cancelled',
          `"${taskTitle}" has been cancelled.`);
        break;

      default:
        // IN_PROGRESS, TODO (reopen) — notify assignee
        if ((previousStatus === 'COMPLETED' || previousStatus === 'CANCELLED') && assigneeId) {
          await notify(assigneeId, 'TASK_REOPENED', 'Task Reopened',
            `"${taskTitle}" has been reopened${reason ? `: ${reason}` : ''}.`);
        }
        break;
    }

    // If recurrence spawned a new task, notify new child's assignee
    if (nextTask?.assigneeId && nextTask.assigneeId !== actorId) {
      await this.notifications.create({
        recipientId: nextTask.assigneeId,
        category:    'TASK_ASSIGNED',
        title:       'Recurring Task Scheduled',
        message:     `A recurring task has been scheduled: "${nextTask.title}"`,
        entityType:  'TASK', entityId: nextTask.id, workspaceId: nextTask.workspaceId,
      });
    }
  }

  // ─── Recurrence reconciliation ──────────────────────────────────────────────
  // Preview: find completed recurring tasks that are missing their next child.
  // Read-only — creates nothing, sends nothing.

  async getRecurrenceReconciliationPreview(): Promise<{
    missing: Array<{
      sourceId: string;
      title: string;
      workspaceId: string;
      recurrenceInterval: string;
      lastDueDate: string | null;
      recurrenceEndDate: string | null;
      recurrenceSeriesId: string | null;
      candidateNextDue: string;
      blockedByEndDate: boolean;
    }>;
  }> {
    const now = new Date();
    // Find all completed root tasks with active recurrence
    const candidates = await this.prisma.task.findMany({
      where: {
        parentTaskId:       null,
        status:             'COMPLETED',
        recurrenceInterval: { not: 'NONE' },
      },
      select: {
        id: true, title: true, workspaceId: true,
        recurrenceInterval: true, recurrenceEndDate: true,
        recurrenceSeriesId: true, dueDate: true,
      },
    });

    const missing: Array<{
      sourceId: string; title: string; workspaceId: string;
      recurrenceInterval: string; lastDueDate: string | null;
      recurrenceEndDate: string | null; recurrenceSeriesId: string | null;
      candidateNextDue: string; blockedByEndDate: boolean;
    }> = [];

    for (const t of candidates) {
      // Status-independent: any existing child blocks
      const child = await this.prisma.task.findFirst({
        where:  { recurrenceParentId: t.id },
        select: { id: true },
      });
      if (child) continue; // child exists — not missing

      if (!t.dueDate) continue; // cannot compute next without base date

      const nextDue = computeNextDueDate(t.dueDate, t.recurrenceInterval, now);
      const blockedByEndDate = t.recurrenceEndDate !== null && nextDue > t.recurrenceEndDate;

      missing.push({
        sourceId:           t.id,
        title:              t.title,
        workspaceId:        t.workspaceId,
        recurrenceInterval: t.recurrenceInterval,
        lastDueDate:        t.dueDate?.toISOString() ?? null,
        recurrenceEndDate:  t.recurrenceEndDate?.toISOString() ?? null,
        recurrenceSeriesId: t.recurrenceSeriesId,
        candidateNextDue:   nextDue.toISOString(),
        blockedByEndDate,
      });
    }

    return { missing };
  }

  // Repair: idempotent, atomic creation of a missing next occurrence.
  // Requires Super User / Super Admin role (enforced in controller).
  async repairMissingOccurrence(sourceId: string, actorId: string): Promise<{
    created: boolean;
    taskId?: string;
    reason?: string;
  }> {
    const source = await this.prisma.task.findUnique({
      where: { id: sourceId },
      select: {
        id: true, title: true, status: true, workspaceId: true, taskListId: true,
        description: true, priority: true, isReference: true, assigneeId: true,
        dueDate: true, recurrenceInterval: true, recurrenceEndDate: true,
        recurrenceSeriesId: true,
      },
    });

    if (!source) throw new NotFoundException('Source task not found');
    if (source.status !== 'COMPLETED')
      return { created: false, reason: 'Source task is not COMPLETED' };
    if (source.recurrenceInterval === 'NONE')
      return { created: false, reason: 'Source task has no recurrence' };
    if (!source.dueDate)
      return { created: false, reason: 'Source task has no due date' };

    const now    = new Date();
    const nextDue = computeNextDueDate(source.dueDate, source.recurrenceInterval, now);

    if (source.recurrenceEndDate && nextDue > source.recurrenceEndDate)
      return { created: false, reason: 'Next due date exceeds recurrence end date' };

    // Validate assignee
    let assigneeId = source.assigneeId;
    if (assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { isActive: true } });
      if (!assignee?.isActive) assigneeId = null;
    }

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        // Status-independent check: any existing child (any status) is idempotent
        const existing = await tx.task.findFirst({
          where:  { recurrenceParentId: sourceId },
          select: { id: true },
        });
        if (existing) return { taskId: existing.id, wasCreated: false };

        const created = await tx.task.create({
          data: {
            workspaceId:        source.workspaceId,
            taskListId:         source.taskListId,
            title:              source.title,
            description:        source.description,
            priority:           source.priority,
            isReference:        source.isReference,
            assigneeId,
            createdById:        actorId,
            status:             'TODO',
            dueDate:            nextDue,
            recurrenceInterval: source.recurrenceInterval,
            recurrenceEndDate:  source.recurrenceEndDate,
            recurrenceSeriesId: source.recurrenceSeriesId,
            recurrenceParentId: sourceId,
          },
          select: { id: true },
        });
        return { taskId: created.id, wasCreated: true };
      });

      if (!txResult.wasCreated) {
        return { created: false, reason: 'Child already exists (idempotent)' };
      }

      void this.auditLog.log({
        actorId,
        action: 'CREATED',
        entityType: 'TASK',
        entityId: txResult.taskId,
        newValue: {
          repairedRecurrence: true,
          sourceTaskId: sourceId,
          nextDueDate: nextDue.toISOString(),
          recurrenceInterval: source.recurrenceInterval,
        },
      }).catch(() => {});

      this.realtime.emitToWorkspace(source.workspaceId, 'task.created', {
        id: txResult.taskId, workspaceId: source.workspaceId,
      });

      return { created: true, taskId: txResult.taskId };
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error';
      if (msg.includes('Unique constraint')) {
        return { created: false, reason: 'Child already exists (unique constraint)' };
      }
      throw err;
    }
  }

  // ─── Task Approval Actions (Unit 63.1) ────────────────────────────────────────
  // These four methods handle the reviewer workflow for private pending tasks.
  // All require the actor to be an elevated role or workspace Manager/Owner.

  private async loadPendingTask(id: string, actorId: string, actorRoles: string[]) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertApprovalReviewerAccess(task as Record<string, unknown>, actorId, actorRoles);
    return task;
  }

  private async assertApprovalReviewerAccess(
    task: Record<string, unknown>,
    actorId: string,
    actorRoles: string[],
  ): Promise<void> {
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (isElevated) return;

    const wsId = task['workspaceId'] as string | null;
    if (!wsId) throw new ForbiddenException('You are not authorized to review this task.');

    const memberRole = await this.workspaces.getWorkspaceMemberRole(actorId, wsId);
    if (memberRole !== 'MANAGER' && memberRole !== 'OWNER') {
      throw new ForbiddenException('Only workspace Managers, Owners, or elevated roles can approve or reject tasks.');
    }

    // Reviewers cannot approve their own task requests
    if (task['createdById'] === actorId) {
      throw new ForbiddenException('You cannot approve your own task request.');
    }
  }

  /** Approve a pending task → it becomes an official workspace task. */
  async approveTask(id: string, reviewNote: string | undefined, actorId: string, actorRoles: string[]) {
    const task = await this.loadPendingTask(id, actorId, actorRoles);
    const approvalStatus = (task as Record<string, unknown>).approvalStatus as string;
    if (approvalStatus === 'APPROVED') {
      throw new BadRequestException('This task is already approved.');
    }

    const now = new Date();
    await this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus:       'APPROVED',
        approvalReviewNote:   reviewNote?.trim() ?? null,
        approvalReviewedAt:   now,
        approvalReviewedById: actorId,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      previousValue: { approvalStatus },
      newValue: { approvalStatus: 'APPROVED', reviewNote: reviewNote?.trim() ?? null, privateTaskApproved: true },
    });
    await this.recordActivity(id, actorId, 'STATUS_CHANGED',
      `Task request approved — "${task.title}" is now an official workspace task${reviewNote ? `. Note: ${reviewNote}` : ''}`);

    // Notify creator
    const reviewer = await this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }).catch(() => null);
    const reviewerName = reviewer?.fullName ?? 'A reviewer';
    const creatorId = task.createdById as string;
    await this.notifications.create({
      recipientId: creatorId,
      category:    'TASK_APPROVAL_APPROVED',
      title:       'Task Approved',
      message:     `Your task "${task.title}" was approved by ${reviewerName}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      entityType:  'TASK',
      entityId:    id,
      workspaceId: task.workspaceId as string,
    }).catch(() => {});

    try {
      this.realtime.emitToWorkspace(task.workspaceId as string, 'task.updated', {
        id, workspaceId: task.workspaceId, approvalStatus: 'APPROVED',
      });
    } catch { /* non-critical */ }

    return this.findOne(id);
  }

  /** Approve and simultaneously complete a task (when work was already submitted). */
  async approveAndCompleteTask(id: string, reviewNote: string | undefined, actorId: string, actorRoles: string[]) {
    const task = await this.loadPendingTask(id, actorId, actorRoles);
    const approvalStatus = (task as Record<string, unknown>).approvalStatus as string;
    if (approvalStatus === 'APPROVED') throw new BadRequestException('This task is already approved.');

    const now = new Date();
    await this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus:       'APPROVED',
        approvalReviewNote:   reviewNote?.trim() ?? null,
        approvalReviewedAt:   now,
        approvalReviewedById: actorId,
        status:               'COMPLETED',
        completedAt:          now,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      previousValue: { approvalStatus, status: task.status },
      newValue: { approvalStatus: 'APPROVED', status: 'COMPLETED', approvedAndCompleted: true, reviewNote: reviewNote?.trim() ?? null },
    });
    await this.recordActivity(id, actorId, 'STATUS_CHANGED',
      `Task approved and marked complete — "${task.title}"${reviewNote ? `. Note: ${reviewNote}` : ''}`);

    const approveCompleteReviewer = await this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }).catch(() => null);
    const approveCompleteReviewerName = approveCompleteReviewer?.fullName ?? 'A reviewer';
    const creatorId = task.createdById as string;
    await this.notifications.create({
      recipientId: creatorId,
      category:    'TASK_APPROVAL_APPROVED',
      title:       'Task Approved and Completed',
      message:     `Your task "${task.title}" was approved and marked as complete by ${approveCompleteReviewerName}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      entityType:  'TASK',
      entityId:    id,
      workspaceId: task.workspaceId as string,
    }).catch(() => {});

    try {
      this.realtime.emitToWorkspace(task.workspaceId as string, 'task.updated', {
        id, workspaceId: task.workspaceId, approvalStatus: 'APPROVED', status: 'COMPLETED',
      });
    } catch { /* non-critical */ }

    return this.findOne(id);
  }

  /** Return a task request for creator correction (task stays PENDING-ish, becomes RETURNED). */
  async returnTask(id: string, reviewNote: string, actorId: string, actorRoles: string[]) {
    if (!reviewNote?.trim()) {
      throw new BadRequestException('A return reason is required when returning a task request for correction.');
    }
    const task = await this.loadPendingTask(id, actorId, actorRoles);
    const approvalStatus = (task as Record<string, unknown>).approvalStatus as string;
    if (approvalStatus === 'APPROVED') throw new BadRequestException('An approved task cannot be returned.');

    const now = new Date();
    await this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus:       'RETURNED',
        approvalReviewNote:   reviewNote.trim(),
        approvalReviewedAt:   now,
        approvalReviewedById: actorId,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      previousValue: { approvalStatus },
      newValue: { approvalStatus: 'RETURNED', reviewNote: reviewNote.trim() },
    });
    await this.recordActivity(id, actorId, 'STATUS_CHANGED',
      `Task request returned for correction — "${task.title}". Reason: ${reviewNote}`);

    const returnReviewer = await this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }).catch(() => null);
    const returnReviewerName = returnReviewer?.fullName ?? 'A reviewer';
    const creatorId = task.createdById as string;
    await this.notifications.create({
      recipientId: creatorId,
      category:    'TASK_APPROVAL_RETURNED',
      title:       'Task Returned for Correction',
      message:     `${returnReviewerName} returned "${task.title}" for correction. Reason: ${reviewNote.trim()}`,
      entityType:  'TASK',
      entityId:    id,
      workspaceId: task.workspaceId as string,
    }).catch(() => {});

    try {
      this.realtime.emitToWorkspace(task.workspaceId as string, 'task.updated', {
        id, workspaceId: task.workspaceId, approvalStatus: 'RETURNED',
      });
    } catch { /* non-critical */ }

    return this.findOne(id);
  }

  /** Reject a task request entirely. Creator may view but not continue working. */
  async rejectTask(id: string, reviewNote: string, actorId: string, actorRoles: string[]) {
    if (!reviewNote?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }
    const task = await this.loadPendingTask(id, actorId, actorRoles);
    const approvalStatus = (task as Record<string, unknown>).approvalStatus as string;
    if (approvalStatus === 'APPROVED') throw new BadRequestException('An approved task cannot be rejected through this endpoint.');

    const now = new Date();
    await this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus:       'REJECTED',
        approvalReviewNote:   reviewNote.trim(),
        approvalReviewedAt:   now,
        approvalReviewedById: actorId,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      previousValue: { approvalStatus },
      newValue: { approvalStatus: 'REJECTED', reviewNote: reviewNote.trim() },
    });
    await this.recordActivity(id, actorId, 'STATUS_CHANGED',
      `Task request rejected — "${task.title}". Reason: ${reviewNote}`);

    const rejectReviewer = await this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }).catch(() => null);
    const rejectReviewerName = rejectReviewer?.fullName ?? 'A reviewer';
    const creatorId = task.createdById as string;
    await this.notifications.create({
      recipientId: creatorId,
      category:    'TASK_APPROVAL_REJECTED',
      title:       'Task Rejected',
      message:     `${rejectReviewerName} rejected "${task.title}". Reason: ${reviewNote.trim()}`,
      entityType:  'TASK',
      entityId:    id,
      workspaceId: task.workspaceId as string,
    }).catch(() => {});

    try {
      this.realtime.emitToWorkspace(task.workspaceId as string, 'task.updated', {
        id, workspaceId: task.workspaceId, approvalStatus: 'REJECTED',
      });
    } catch { /* non-critical */ }

    return this.findOne(id);
  }

  /** Creator resubmits a RETURNED task — approvalStatus goes back to PENDING. */
  async resubmitTask(id: string, actorId: string, actorRoles: string[]) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const approvalStatus = (task as Record<string, unknown>).approvalStatus as string;

    if (approvalStatus !== 'RETURNED') {
      throw new BadRequestException('Only RETURNED tasks can be resubmitted.');
    }

    // Only the creator can resubmit
    const isCreator  = task.createdById === actorId;
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    if (!isCreator && !isElevated) {
      throw new ForbiddenException('Only the task creator can resubmit a returned request.');
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus:       'PENDING',
        approvalReviewNote:   null,
        approvalReviewedAt:   null,
        approvalReviewedById: null,
        approvalNote:         (task as Record<string, unknown>).approvalNote as string | null,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      previousValue: { approvalStatus: 'RETURNED' },
      newValue: { approvalStatus: 'PENDING', resubmitted: true },
    });
    await this.recordActivity(id, actorId, 'STATUS_CHANGED',
      `Task request resubmitted for review — "${task.title}"`);

    // Re-notify workspace managers/owners
    await this.notifyApprovalReviewers(id, task.title as string, task.workspaceId as string, actorId).catch(() => {});

    try {
      this.realtime.emitToWorkspace(task.workspaceId as string, 'task.updated', {
        id, workspaceId: task.workspaceId, approvalStatus: 'PENDING',
      });
    } catch { /* non-critical */ }

    return this.findOne(id);
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
        isReference:  original.isReference,
        assigneeId:   original.assigneeId,
        dueDate:      original.dueDate,
        status:       'TODO',
        createdById:  actorId,
        // Duplicates do not inherit recurrence — they are independent copies
        recurrenceInterval: 'NONE',
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

  // ── Task reorder ──────────────────────────────────────────────────────────

  async reorderTasks(
    taskListId: string,
    orderedIds: string[],
    actor: Record<string, unknown>,
  ) {
    const actorId    = actor.id as string;
    const actorRoles = extractUserRoles(actor);
    const actorDeptId = (actor.departmentId as string | null) ?? null;
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }

    // Validate task list and workspace access
    const taskList = await this.prisma.taskList.findUnique({
      where: { id: taskListId },
      select: { id: true, workspaceId: true, name: true },
    });
    if (!taskList) throw new NotFoundException('Task list not found');

    await this.workspaces.assertWorkspaceAccess(taskList.workspaceId, actorId, actorRoles, actorDeptId);

    // Members can reorder tasks (same gate as creating/updating tasks)
    const canCollaborate = isElevated || await this.workspaces.canCollaborateInWorkspace(
      actorId, taskList.workspaceId, actorRoles, actorDeptId,
    );
    if (!canCollaborate) {
      throw new ForbiddenException('Workspace MEMBER, MANAGER, OWNER, or elevated role required to reorder tasks');
    }

    // Validate all task IDs belong to this task list
    const tasks = await this.prisma.task.findMany({
      where: { taskListId },
      select: { id: true },
    });
    const validIds = new Set(tasks.map((t) => t.id));
    const invalid  = orderedIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(`Task IDs not found in list: ${invalid.join(', ')}`);
    }

    // Update sortOrder in a transaction
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.task.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'TASK',
      entityId: taskListId,
      newValue: { reorderedTasks: orderedIds.length, taskListName: taskList.name },
    }).catch(() => {});

    this.realtime.emitToWorkspace(taskList.workspaceId, 'task.reordered', {
      taskListId,
      workspaceId: taskList.workspaceId,
    });

    // Return updated tasks ordered by new sortOrder
    return this.prisma.task.findMany({
      where: { taskListId, parentTaskId: null },
      include: TASK_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
