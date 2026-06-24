import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { UpdateTaskListDto } from './dto/update-task-list.dto';

const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'];

@Injectable()
export class TaskListsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private realtime: RealtimeService,
    private workspaces: WorkspacesService,
  ) {}

  async findByWorkspace(
    workspaceId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    return this.prisma.taskList.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async create(
    workspaceId: string,
    dto: CreateTaskListDto,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ) {
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId);
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found');

    const tl = await this.prisma.taskList.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description ?? null,
        departmentId: dto.departmentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdById: actorId,
      },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'TASK_LIST',
      entityId: tl.id,
      newValue: { name: tl.name, workspaceId },
    });

    return tl;
  }

  async update(id: string, dto: UpdateTaskListDto, actorId: string) {
    const existing = await this.prisma.taskList.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task list not found');

    const updated = await this.prisma.taskList.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'TASK_LIST',
      entityId: id,
      previousValue: { name: existing.name },
      newValue: { name: updated.name },
    });

    return updated;
  }

  async delete(id: string, actorId: string, actorRoles: string[]) {
    // Permanent deletion is restricted to SUPER_ADMIN only
    if (!actorRoles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only Super Admin can permanently delete task lists.');
    }

    const list = await this.prisma.taskList.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });
    if (!list) throw new NotFoundException('Task list not found');

    // Block deletion if the list contains tasks — must be emptied first
    if (list._count.tasks > 0) {
      throw new ConflictException(`Cannot delete a task list that still contains ${list._count.tasks} task(s). Move or delete all tasks first.`);
    }

    const snapshot = { name: list.name, workspaceId: list.workspaceId };
    await this.prisma.taskList.delete({ where: { id } });

    await this.auditLog.log({
      actorId,
      action: 'TASK_LIST_PERMANENTLY_DELETED',
      entityType: 'TASK_LIST',
      entityId: id,
      previousValue: snapshot,
    });

    try {
      this.realtime.emitToWorkspace(list.workspaceId, 'task_list.deleted', {
        id, workspaceId: list.workspaceId,
      });
    } catch { /* realtime failure does not undo deletion */ }

    return { success: true };
  }

  async reorder(
    workspaceId: string,
    orderedIds: string[],
    actorId: string,
    actorRoles: string[],
  ) {
    // Permission: workspace manager/owner or elevated
    await this.workspaces.assertWorkspaceAccess(workspaceId, actorId, actorRoles, null);
    const isElevated = actorRoles.some((r) => ELEVATED_ROLES.includes(r));
    const wsRole = await this.workspaces.getWorkspaceMemberRole(actorId, workspaceId);
    if (!isElevated && !['OWNER', 'MANAGER'].includes(wsRole ?? '')) {
      throw new ForbiddenException('Only workspace managers, owners, or elevated roles can reorder task lists');
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }

    // Validate all IDs belong to this workspace
    const lists = await this.prisma.taskList.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });
    const validIds = new Set(lists.map((l) => l.id));
    const invalid = orderedIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(`IDs not found in workspace: ${invalid.join(', ')}`);
    }

    // Update positions in a transaction
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.taskList.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'PROJECT',
      entityId: workspaceId,
      newValue: { reorderedTaskLists: orderedIds.length },
    }).catch(() => {});

    this.realtime.emitToWorkspace(workspaceId, 'task_list.reordered', { workspaceId });

    return this.findByWorkspace(workspaceId, actorId, actorRoles, null);
  }
}
