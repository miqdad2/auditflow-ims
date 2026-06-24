import { IsString, IsOptional, MaxLength } from 'class-validator';

export class TaskApprovalReviewDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reviewNote?: string;
}

export class TaskApprovalReturnDto {
  @IsString()
  @MaxLength(2000)
  reviewNote: string;
}
