import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateTaskListDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
