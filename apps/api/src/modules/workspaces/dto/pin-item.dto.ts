import { IsString, IsIn } from 'class-validator';

export class PinItemDto {
  @IsString()
  @IsIn(['PAGE'])
  entityType: string;

  @IsString()
  entityId: string;
}
