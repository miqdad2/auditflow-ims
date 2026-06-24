import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  login: string; // accepts email OR username

  // Login accepts temporary passwords (minimum 3 chars).
  // Permanent-password strength is enforced separately by ChangePasswordDto.
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Password must be at least 3 characters' })
  password: string;
}
