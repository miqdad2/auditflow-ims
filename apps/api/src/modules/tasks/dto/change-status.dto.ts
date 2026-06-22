import {
  IsString, IsNotEmpty, IsOptional, MaxLength, IsIn, IsDateString, IsBoolean,
} from 'class-validator';
import { TaskStatus } from '@auditflow/shared';

const VALID_SOURCES = [
  'WORKSPACE_TASK_DRAWER',
  'GLOBAL_TASK_CONTROL',
  'ACTION_CENTER',
  'API',
  'RECURRENCE_SYSTEM',
] as const;

export class ChangeStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(TaskStatus))
  newStatus: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @IsString()
  @IsOptional()
  @IsIn([...VALID_SOURCES])
  source?: string;

  /** ISO timestamp of the task's updatedAt when the client last fetched it — enables optimistic locking */
  @IsDateString()
  @IsOptional()
  expectedUpdatedAt?: string;

  /** Set by Super User / Super Admin to override a normally blocked transition */
  @IsBoolean()
  @IsOptional()
  isOverride?: boolean;
}
