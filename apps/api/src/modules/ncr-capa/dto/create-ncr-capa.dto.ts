import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

const NCR_TYPES = ['NCR', 'CAPA', 'OBSERVATION'] as const;
const SEVERITIES = ['MINOR', 'MAJOR', 'CRITICAL', 'OBSERVATION'] as const;

export class CreateNcrCapaDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(NCR_TYPES)
  type?: string;

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: string;

  @IsOptional()
  @IsString()
  isoClause?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  checklistItemId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  ncrNumber?: string;
}
