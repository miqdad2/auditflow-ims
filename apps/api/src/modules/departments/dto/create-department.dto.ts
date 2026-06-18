import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
