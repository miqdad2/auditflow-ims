import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitEvidenceDto {
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
