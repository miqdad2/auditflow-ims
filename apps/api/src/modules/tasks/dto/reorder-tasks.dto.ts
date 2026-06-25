import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderTasksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds: string[];
}
