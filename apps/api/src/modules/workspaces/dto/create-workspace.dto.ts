import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ORGANIZATION', 'DEPARTMENT', 'PRIVATE'])
  visibility?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
