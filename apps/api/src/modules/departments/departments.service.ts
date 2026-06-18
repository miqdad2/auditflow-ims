import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.department.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    const nameConflict = await this.prisma.department.findFirst({ where: { name: dto.name } });
    if (nameConflict) throw new ConflictException('A department with this name already exists');
    const codeConflict = await this.prisma.department.findFirst({ where: { code: dto.code.toUpperCase() } });
    if (codeConflict) throw new ConflictException('A department with this code already exists');
    return this.prisma.department.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.toUpperCase().trim(),
        description: dto.description?.trim() ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
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
    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code.toUpperCase().trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
