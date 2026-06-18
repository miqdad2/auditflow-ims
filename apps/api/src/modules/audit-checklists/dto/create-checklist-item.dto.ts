import { IsString, IsOptional, IsDateString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(50)   isoClause?: string;
  @IsOptional() @IsString() responsibleUserId?: string;
  @IsOptional() @IsString() reviewerId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
