import { IsString, IsIn } from 'class-validator';

export class UpdateWorkspaceMemberDto {
  @IsString()
  @IsIn(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'])
  roleInWorkspace: string;
}
