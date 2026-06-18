import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class UpdateDocumentStatusDto {
  @IsString()
  @IsIn(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;
}
