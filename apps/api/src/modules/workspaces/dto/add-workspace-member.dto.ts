import { IsString, IsIn, IsOptional } from 'class-validator';

export class AddWorkspaceMemberDto {
  @IsString()
  userId: string;

  @IsString()
  @IsIn(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'])
  @IsOptional()
  roleInWorkspace?: string;
}
