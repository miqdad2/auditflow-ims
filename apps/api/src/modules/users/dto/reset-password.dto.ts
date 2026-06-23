import { IsString, MinLength } from 'class-validator';

// Separate DTO for admin-initiated password reset.
// Temporary passwords require only 3 characters — complexity is NOT required.
// The user must change this password at first login (mustChangePassword=true).
// This DTO must never be used for self-service permanent-password changes.
export class ResetPasswordDto {
  @IsString()
  @MinLength(3, { message: 'Temporary password must be at least 3 characters' })
  temporaryPassword: string;
}
