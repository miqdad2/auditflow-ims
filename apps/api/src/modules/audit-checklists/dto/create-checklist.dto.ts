import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateChecklistDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(50)  isoStandard?: string;
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional() @IsString() departmentId?: string;
}
