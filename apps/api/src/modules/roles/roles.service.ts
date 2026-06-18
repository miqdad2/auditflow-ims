import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { displayName: 'asc' },
    });
  }
}
