import {
  IsString, IsNotEmpty, IsOptional, MaxLength,
  IsIn, IsDateString,
} from 'class-validator';
import { TaskStatus, Priority } from '@auditflow/shared';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  taskListId: string;

  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(Priority))
  priority?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
