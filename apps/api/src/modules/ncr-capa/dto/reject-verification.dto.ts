import { IsString, MinLength } from 'class-validator';

export class RejectVerificationDto {
  @IsString()
  @MinLength(5)
  rejectionReason!: string;
}
