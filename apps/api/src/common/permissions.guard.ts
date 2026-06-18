import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: Record<string, unknown> }>();
    const userPerms = extractUserPermissions(user);
    const hasAll = required.every((p) => userPerms.includes(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}

export function extractUserPermissions(user: Record<string, unknown>): string[] {
  const roles = user.userRoles as Array<{
    role: { rolePermissions: Array<{ permission: { key: string } }> };
  }>;
  return [
    ...new Set(
      roles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
    ),
  ];
}

export function extractUserRoles(user: Record<string, unknown>): string[] {
  const roles = user.userRoles as Array<{ role: { name: string } }>;
  return roles.map((ur) => ur.role.name);
}
