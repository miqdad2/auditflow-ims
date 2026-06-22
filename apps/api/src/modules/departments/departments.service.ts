import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const COUNT_SELECT = { users: true, workspaces: true } as const;

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.department.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: COUNT_SELECT } },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: COUNT_SELECT } },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async getUsageCounts(id: string) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found');
    const [users, workspaces, openTasks] = await Promise.all([
      this.prisma.user.count({ where: { departmentId: id, isActive: true } }),
      this.prisma.workspace.count({ where: { departmentId: id } }),
      this.prisma.task.count({
        where: {
          taskList: { departmentId: id },
          status: { notIn: ['DONE', 'CANCELLED'] },
          parentTaskId: null,
        },
      }),
    ]);
    return { users, workspaces, openTasks };
  }

  async create(dto: CreateDepartmentDto, actorId?: string) {
    const nameConflict = await this.prisma.department.findFirst({ where: { name: dto.name } });
    if (nameConflict) throw new ConflictException('A department with this name already exists');
    const codeConflict = await this.prisma.department.findFirst({ where: { code: dto.code.toUpperCase() } });
    if (codeConflict) throw new ConflictException('A department with this code already exists');
    const dept = await this.prisma.department.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.toUpperCase().trim(),
        description: dto.description?.trim() ?? null,
      },
      include: { _count: { select: COUNT_SELECT } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: dept.id,
        newValue: { name: dept.name, code: dept.code },
      },
    });
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto, actorId?: string) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found');
    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.prisma.department.findFirst({ where: { name: dto.name, NOT: { id } } });
      if (conflict) throw new ConflictException('A department with this name already exists');
    }
    if (dto.code && dto.code.toUpperCase() !== existing.code) {
      const conflict = await this.prisma.department.findFirst({ where: { code: dto.code.toUpperCase(), NOT: { id } } });
      if (conflict) throw new ConflictException('A department with this code already exists');
    }
    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code.toUpperCase().trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { _count: { select: COUNT_SELECT } },
    });
    if (dto.isActive !== undefined && dto.isActive !== existing.isActive) {
      await this.prisma.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: dto.isActive ? 'DEPARTMENT_REACTIVATED' : 'DEPARTMENT_DEACTIVATED',
          entityType: 'Department',
          entityId: id,
          previousValue: { isActive: existing.isActive },
          newValue: { isActive: dto.isActive },
        },
      });
    } else if (dto.name !== undefined || dto.code !== undefined || dto.description !== undefined) {
      await this.prisma.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: 'DEPARTMENT_UPDATED',
          entityType: 'Department',
          entityId: id,
          previousValue: { name: existing.name, code: existing.code },
          newValue: { name: updated.name, code: updated.code },
        },
      });
    }
    return updated;
  }
}
