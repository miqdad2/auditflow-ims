import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// Technical/system accounts that only SUPER_ADMIN can manage.
// SUPER_USER is restricted to business users only and cannot see or touch these.
const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER'];

// Whether actor is a plain Super User (not Super Admin or IT Admin)
export function isSuperUserOnly(actorRoles: string[]): boolean {
  return (
    actorRoles.includes('SUPER_USER') &&
    !actorRoles.includes('SUPER_ADMIN') &&
    !actorRoles.includes('IT_ADMIN')
  );
}

// Prisma where fragment that restricts to non-privileged accounts.
// Used when actor is SUPER_USER.
export function buildManageableUserWhere() {
  return {
    userRoles: {
      none: { role: { name: { in: PRIVILEGED_ROLES } } },
    },
  };
}

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  jobTitle: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  dashboardExperience: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, code: true } },
  userRoles: {
    include: {
      role: { select: { id: true, name: true, displayName: true } },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private realtime: RealtimeService,
  ) {}

  async findAll(
    query: { search?: string; departmentId?: string; roleId?: string; isActive?: string },
    actorRoles: string[] = [],
  ) {
    const where: Record<string, unknown> = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.roleId) {
      where.userRoles = { some: { roleId: query.roleId } };
    }

    // SUPER_USER scope: exclude privileged/technical accounts
    if (isSuperUserOnly(actorRoles)) {
      Object.assign(where, buildManageableUserWhere());
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      select: USER_SELECT,
    });
  }

  async findOne(id: string, actorRoles: string[] = []) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    // SUPER_USER cannot view protected technical accounts
    if (isSuperUserOnly(actorRoles) && this.isProtectedUser(user.userRoles)) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Returns true if the user holds any privileged role
  private isProtectedUser(userRoles: Array<{ role: { name: string } }>): boolean {
    return userRoles.some((ur) => PRIVILEGED_ROLES.includes(ur.role.name));
  }

  // Throws ForbiddenException if actor (SUPER_USER) tries to target a protected account
  private async assertCanTargetUser(targetId: string, actorRoles: string[]): Promise<void> {
    if (!isSuperUserOnly(actorRoles)) return;
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { userRoles: { select: { role: { select: { name: true } } } } },
    });
    if (!target) return; // will 404 elsewhere
    if (this.isProtectedUser(target.userRoles)) {
      throw new ForbiddenException('Super User cannot manage privileged accounts');
    }
  }

  private async assertRoleAssignmentAllowed(roleIds: string[] | undefined, actorRoles: string[]) {
    if (!roleIds || roleIds.length === 0) return;
    const isSuperAdmin = actorRoles.includes('SUPER_ADMIN');
    const isItAdmin    = actorRoles.includes('IT_ADMIN');
    if (isSuperAdmin || isItAdmin) return; // full privilege — no restriction
    // For SUPER_USER and others: check that none of the assigned roles are privileged
    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds } }, select: { name: true, id: true } });
    const forbidden = roles.filter((r) => PRIVILEGED_ROLES.includes(r.name));
    if (forbidden.length > 0) {
      throw new ForbiddenException(`Cannot assign privileged role(s): ${forbidden.map((r) => r.name).join(', ')}`);
    }
  }

  async create(dto: CreateUserDto, actorId: string, actorRoles: string[] = []) {
    await this.assertRoleAssignmentAllowed(dto.roleIds, actorRoles);
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already in use');

    // Generate username from email if not provided
    const baseUsername = dto.username ?? dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
    let username = baseUsername;
    let suffix = 1;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix++}`;
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username,
        passwordHash,
        fullName: dto.fullName,
        jobTitle: dto.jobTitle?.trim() || null,
        departmentId: dto.departmentId ?? null,
        isActive: dto.isActive ?? true,
        mustChangePassword: true,
        dashboardExperience: dto.dashboardExperience ?? 'STANDARD',
        ...(dto.roleIds && dto.roleIds.length > 0
          ? {
              userRoles: {
                create: dto.roleIds.map((roleId) => ({ roleId })),
              },
            }
          : {}),
      },
      select: USER_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action: 'CREATED',
      entityType: 'USER',
      entityId: user.id,
      newValue: { email: user.email, fullName: user.fullName },
    });
    try { this.realtime.emitGlobal('user.updated', { id: user.id, action: 'created' }); } catch { /* non-fatal */ }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string, actorRoles: string[] = []) {
    await this.assertCanTargetUser(id, actorRoles);
    await this.assertRoleAssignmentAllowed(dto.roleIds, actorRoles);
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const updateData: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.jobTitle !== undefined) updateData.jobTitle = dto.jobTitle?.trim() || null;
    if (dto.dashboardExperience !== undefined) updateData.dashboardExperience = dto.dashboardExperience;

    await this.prisma.$transaction(async (tx) => {
      if (dto.roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (dto.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
          });
        }
      }
      if (Object.keys(updateData).length > 0) {
        await tx.user.update({ where: { id }, data: updateData });
      }
    });

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'USER',
      entityId: id,
      newValue: updateData as Record<string, unknown>,
    });
    try { this.realtime.emitGlobal('user.updated', { id, action: 'updated' }); } catch { /* non-fatal */ }

    return this.findOne(id);
  }

  async setStatus(id: string, dto: SetUserStatusDto, actorId: string, actorRoles: string[] = []) {
    // SUPER_USER scope: block all privileged accounts (SUPER_ADMIN, IT_ADMIN, SUPER_USER)
    await this.assertCanTargetUser(id, actorRoles);

    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: { select: { name: true } } } } },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (id === actorId) {
      throw new BadRequestException('Cannot change your own active status');
    }

    // SUPER_ADMIN / IT_ADMIN: no restriction on status changes
    // Everyone else (including SUPER_USER after the scope check above): block privileged accounts
    const isFullAdmin = actorRoles.includes('SUPER_ADMIN') || actorRoles.includes('IT_ADMIN');
    if (!isFullAdmin) {
      const targetRoles = existing.userRoles.map((ur) => ur.role.name);
      if (targetRoles.some((r) => PRIVILEGED_ROLES.includes(r))) {
        throw new ForbiddenException('Cannot change the status of privileged accounts');
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    void this.auditLog.log({
      actorId,
      action: dto.isActive ? 'REACTIVATED' : 'DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      previousValue: { isActive: existing.isActive },
      newValue: { isActive: dto.isActive },
    });
    try { this.realtime.emitGlobal('user.updated', { id, action: dto.isActive ? 'reactivated' : 'deactivated' }); } catch { /* non-fatal */ }

    return this.findOne(id);
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actorId: string, actorRoles: string[] = []): Promise<{ message: string }> {
    await this.assertCanTargetUser(id, actorRoles);
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });

    void this.auditLog.log({
      actorId,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: id,
    });

    return { message: 'Password has been reset. The user must change it at next login.' };
  }

  async backfillUsernames(): Promise<{ updated: number }> {
    // username is non-nullable in schema — find users with empty-string username as a safeguard
    const users = await this.prisma.user.findMany({
      where: { username: '' },
      select: { id: true, email: true },
    });

    let updated = 0;
    for (const u of users) {
      const base = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      let username = base;
      let suffix = 1;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${base}${suffix++}`;
      }
      await this.prisma.user.update({ where: { id: u.id }, data: { username } });
      updated++;
    }

    return { updated };
  }

  async getUserWorkspaces(userId: string, actorRoles: string[] = []) {
    await this.assertCanTargetUser(userId, actorRoles);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        roleInWorkspace: true,
        createdAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            status: true,
            visibility: true,
          },
        },
      },
    });
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
