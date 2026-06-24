import {
  IsString, IsNotEmpty, IsOptional, MaxLength,
  IsIn, IsDateString, IsBoolean,
} from 'class-validator';

import { TaskStatus, Priority } from '@auditflow/shared';

export const RECURRENCE_INTERVALS = ['NONE', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'] as const;
export type RecurrenceInterval = typeof RECURRENCE_INTERVALS[number];

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

  @IsBoolean()
  @IsOptional()
  isReference?: boolean;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(RECURRENCE_INTERVALS)
  recurrenceInterval?: string;

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  // Business reason — required for MEMBER-created tasks (enforced in service, not here).
  // Stored as approvalNote on the Task record.
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  approvalNote?: string;
}
