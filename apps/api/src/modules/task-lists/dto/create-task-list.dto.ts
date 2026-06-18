import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class CreateTaskListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
