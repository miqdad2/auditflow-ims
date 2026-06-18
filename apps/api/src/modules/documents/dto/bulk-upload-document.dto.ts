import { IsString, IsOptional, IsDateString, MaxLength, IsIn } from 'class-validator';

export class BulkUploadDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumberPrefix?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'UNDER_REVIEW'])
  defaultStatus?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
