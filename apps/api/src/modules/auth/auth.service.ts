import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLog: AuditLogService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { login, password } = dto;

    // Lookup by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: login.toLowerCase() }, { username: login }],
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        department: true,
      },
    });

    if (!user) {
      await this.auditLog.log({
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        newValue: { login, reason: 'user_not_found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await this.auditLog.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        newValue: { reason: 'invalid_password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive. Contact your administrator.');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditLog.log({
      actorId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        jobTitle: user.jobTitle ?? null,
        departmentId: user.departmentId,
        department: user.department,
        roles,
        permissions,
        mustChangePassword: user.mustChangePassword,
        dashboardExperience: user.dashboardExperience ?? 'STANDARD',
        workspaceVisibilityMode: user.workspaceVisibilityMode ?? 'SELECTED',
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or account is inactive');
    }

    const currentPasswordMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentPasswordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const sameAsNew = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (sameAsNew) {
      throw new BadRequestException('New password must be different from your current password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    await this.auditLog.log({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
    });

    return { message: 'Password changed successfully' };
  }

  getMe(user: Record<string, unknown>) {
    const roles = (
      user.userRoles as Array<{ role: { name: string; rolePermissions: Array<{ permission: { key: string } }> } }>
    ).map((ur) => ur.role.name);

    const permissions = [
      ...new Set(
        (
          user.userRoles as Array<{ role: { rolePermissions: Array<{ permission: { key: string } }> } }>
        ).flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      jobTitle: (user.jobTitle as string | null) ?? null,
      departmentId: user.departmentId,
      department: user.department,
      roles,
      permissions,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      dashboardExperience: (user.dashboardExperience as string) ?? 'STANDARD',
      workspaceVisibilityMode: (user.workspaceVisibilityMode as string) ?? 'SELECTED',
    };
  }
}
