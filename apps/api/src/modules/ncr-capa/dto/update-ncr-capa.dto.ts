import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

const SEVERITIES = ['MINOR', 'MAJOR', 'CRITICAL', 'OBSERVATION'] as const;

export class UpdateNcrCapaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: string;

  @IsOptional()
  @IsString()
  isoClause?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
