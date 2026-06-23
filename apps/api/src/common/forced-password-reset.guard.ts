import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Applied to controllers that use only JwtAuthGuard (no PermissionsGuard).
// Blocks access when the authenticated user has a forced password-change pending.
// Auth routes (/auth/me, /auth/change-password) do not use this guard and remain accessible.
@Injectable()
export class ForcedPasswordResetGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
    if (user?.mustChangePassword) {
      throw new ForbiddenException('You must change your temporary password before continuing');
    }
    return true;
  }
}
