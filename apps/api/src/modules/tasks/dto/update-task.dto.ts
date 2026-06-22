import {
  IsString, IsOptional, MaxLength,
  IsIn, IsDateString, IsBoolean,
} from 'class-validator';
import { TaskStatus, Priority } from '@auditflow/shared';
import { RECURRENCE_INTERVALS } from './create-task.dto';

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

  @IsBoolean()
  @IsOptional()
  isReference?: boolean;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsString()
  @IsOptional()
  taskListId?: string;

  @IsString()
  @IsOptional()
  @IsIn(RECURRENCE_INTERVALS)
  recurrenceInterval?: string;

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string | null;

  // Stop future recurrence without deleting this task
  @IsBoolean()
  @IsOptional()
  stopRecurrence?: boolean;
}
