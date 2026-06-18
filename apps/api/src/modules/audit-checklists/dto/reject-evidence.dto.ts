import { IsString, MaxLength } from 'class-validator';

export class RejectEvidenceDto {
  @IsString() @MaxLength(1000) rejectionReason!: string;
}
