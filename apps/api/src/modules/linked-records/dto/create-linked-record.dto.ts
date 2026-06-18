import { IsString, IsIn } from 'class-validator';

const VALID_TYPES = ['TASK', 'PAGE', 'DOCUMENT', 'CHECKLIST_ITEM', 'NCR_CAPA'];

export class CreateLinkedRecordDto {
  @IsString()
  @IsIn(VALID_TYPES)
  sourceType: string;

  @IsString()
  sourceId: string;

  @IsString()
  @IsIn(VALID_TYPES)
  targetType: string;

  @IsString()
  targetId: string;
}
