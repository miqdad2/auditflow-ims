import { IsString, IsOptional } from 'class-validator';

export class SetHomePageDto {
  @IsString()
  @IsOptional()
  pageId?: string | null;
}
