import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ReportFrontendErrorDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;
}
