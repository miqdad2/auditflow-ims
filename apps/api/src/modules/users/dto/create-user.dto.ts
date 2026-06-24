import {
  IsEmail, IsString, IsOptional, IsBoolean, IsArray, MinLength, IsEnum, MaxLength,
} from 'class-validator';

export enum DashboardExperienceDto {
  STANDARD  = 'STANDARD',
  EXECUTIVE = 'EXECUTIVE',
}

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
  @MaxLength(120)
  jobTitle?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsString()
  @MinLength(3, { message: 'Temporary password must be at least 3 characters' })
  temporaryPassword: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(DashboardExperienceDto)
  @IsOptional()
  dashboardExperience?: DashboardExperienceDto;
}
