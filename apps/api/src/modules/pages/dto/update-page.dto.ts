import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
