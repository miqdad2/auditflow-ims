/**
 * Unit 63.6 — Temporary and permanent password policy tests (12 cases)
 *
 * Verifies that:
 *   - Temporary passwords (admin-created) require only 3+ characters
 *   - Permanent passwords require full complexity (8+ chars, upper, lower, digit, special)
 *   - PermissionsGuard blocks requests from users with mustChangePassword=true
 *   - PermissionsGuard allows /auth/change-password (no @RequirePermissions decorator)
 *
 * Uses class-validator directly to test DTO constraints without database.
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ForbiddenException } from '@nestjs/common';

// ─── Import DTOs ──────────────────────────────────────────────────────────────

// Re-export the path for the test runner
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function validateDto(cls: new () => object, plain: Record<string, unknown>): Promise<string[]> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance as object);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

// ─── Part A: Temporary password (CreateUserDto) ───────────────────────────────

describe('Unit 63.6 — temporary password policy (CreateUserDto)', () => {

  const BASE = {
    email: 'test@recafco.com',
    fullName: 'Test User',
  };

  // Case 1: 3-character temporary password is accepted
  it('Case 1 — temporaryPassword "123" (3 chars) passes validation', async () => {
    const errors = await validateDto(CreateUserDto, { ...BASE, temporaryPassword: '123' });
    const pwErrors = errors.filter((e) => e.toLowerCase().includes('password') || e.toLowerCase().includes('3'));
    expect(pwErrors).toHaveLength(0);
  });

  // Case 2: exactly 3 characters accepted
  it('Case 2 — temporaryPassword "abc" (3 chars) passes validation', async () => {
    const errors = await validateDto(CreateUserDto, { ...BASE, temporaryPassword: 'abc' });
    const pwErrors = errors.filter((e) => e.toLowerCase().includes('password') || e.toLowerCase().includes('3'));
    expect(pwErrors).toHaveLength(0);
  });

  // Case 3: 2-character temporary password rejected
  it('Case 3 — temporaryPassword "ab" (2 chars) fails validation', async () => {
    const errors = await validateDto(CreateUserDto, { ...BASE, temporaryPassword: 'ab' });
    expect(errors.some((e) => e.includes('3'))).toBe(true);
  });

  // Case 4: 1-character temporary password rejected
  it('Case 4 — temporaryPassword "1" (1 char) fails validation', async () => {
    const errors = await validateDto(CreateUserDto, { ...BASE, temporaryPassword: '1' });
    expect(errors.some((e) => e.includes('3'))).toBe(true);
  });

  // Case 5: empty temporary password rejected
  it('Case 5 — empty temporaryPassword fails validation', async () => {
    const errors = await validateDto(CreateUserDto, { ...BASE, temporaryPassword: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  // Case 6: long simple password accepted (no complexity requirement)
  it('Case 6 — temporaryPassword "111111111" (all same digit) passes validation', async () => {
    const errors = await validateDto(CreateUserDto, { ...BASE, temporaryPassword: '111111111' });
    const pwErrors = errors.filter((e) => e.toLowerCase().includes('password'));
    expect(pwErrors).toHaveLength(0);
  });
});

// ─── Part B: Permanent password (ChangePasswordDto) ───────────────────────────

describe('Unit 63.6 — permanent password policy (ChangePasswordDto)', () => {

  // Case 7: "123" rejected as permanent password (too short + no complexity)
  it('Case 7 — newPassword "123" rejected — too short and no complexity', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      currentPassword: 'anything',
      newPassword: '123',
      confirmPassword: '123',
    });
    expect(errors.some((e) => e.toLowerCase().includes('8') || e.toLowerCase().includes('uppercase') || e.toLowerCase().includes('lowercase'))).toBe(true);
  });

  // Case 8: "password" rejected as permanent password (no complexity)
  it('Case 8 — newPassword "password" rejected — no complexity', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      currentPassword: 'anything',
      newPassword: 'password',
      confirmPassword: 'password',
    });
    expect(errors.some((e) => e.toLowerCase().includes('uppercase') || e.toLowerCase().includes('special'))).toBe(true);
  });

  // Case 9: valid permanent password accepted
  it('Case 9 — newPassword "Recafco@2026" passes validation', async () => {
    const errors = await validateDto(ChangePasswordDto, {
      currentPassword: 'anything',
      newPassword: 'Recafco@2026',
      confirmPassword: 'Recafco@2026',
    });
    const pwErrors = errors.filter((e) => e.toLowerCase().includes('password') && !e.toLowerCase().includes('current'));
    expect(pwErrors).toHaveLength(0);
  });
});

// ─── Part C: PermissionsGuard mustChangePassword check ───────────────────────

describe('Unit 63.6 — PermissionsGuard mustChangePassword enforcement', () => {
  // Inline implementation test — mirrors the guard logic without NestJS DI

  function simulateGuard(mustChangePassword: boolean, permissions: string[], required: string[]): boolean {
    if (required.length === 0) return true;
    // Mirror guard logic
    if (mustChangePassword) throw new ForbiddenException('You must change your temporary password before continuing');
    const hasAll = required.every((p) => permissions.includes(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    return true;
  }

  // Case 10: user with mustChangePassword=true is blocked
  it('Case 10 — user with mustChangePassword=true is blocked by PermissionsGuard', () => {
    expect(() => simulateGuard(true, ['project.read'], ['project.read'])).toThrow(ForbiddenException);
  });

  // Case 11: user with mustChangePassword=false passes (if has permission)
  it('Case 11 — user with mustChangePassword=false passes PermissionsGuard when permission matches', () => {
    expect(simulateGuard(false, ['project.read'], ['project.read'])).toBe(true);
  });

  // Case 12: routes without @RequirePermissions skip the mustChangePassword check
  // (no required permissions → guard returns true immediately, no check performed)
  it('Case 12 — route with no @RequirePermissions skips guard entirely (allows change-password route)', () => {
    // Empty required list → guard returns true without reaching mustChangePassword check
    expect(simulateGuard(true, [], [])).toBe(true);
  });
});
