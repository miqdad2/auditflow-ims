import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ORGANIZATION', 'DEPARTMENT', 'PRIVATE'])
  visibility?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
