import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { UpdateTaskListDto } from './dto/update-task-list.dto';

@Injectable()
export class TaskListsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
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
}
