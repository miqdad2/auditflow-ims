import { IsString, IsOptional, IsArray, IsEnum, MaxLength } from 'class-validator';
import { DashboardExperienceDto } from './create-user.dto';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

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

  @IsEnum(DashboardExperienceDto)
  @IsOptional()
  dashboardExperience?: DashboardExperienceDto;
}
