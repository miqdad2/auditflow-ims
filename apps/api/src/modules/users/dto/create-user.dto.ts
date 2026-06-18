import {
  IsEmail, IsString, IsOptional, IsBoolean, IsArray, MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsString()
  @MinLength(8)
  temporaryPassword: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
