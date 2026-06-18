import {
  IsString, IsOptional, MaxLength,
  IsIn, IsDateString,
} from 'class-validator';
import { TaskStatus, Priority } from '@auditflow/shared';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(TaskStatus))
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(Priority))
  priority?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsString()
  @IsOptional()
  taskListId?: string;
}
