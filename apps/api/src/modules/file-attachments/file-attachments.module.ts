import { Module } from '@nestjs/common';
import { FileAttachmentsController } from './file-attachments.controller';
import { FileAttachmentsService } from './file-attachments.service';
import { FileStorageService } from '../../common/file-storage.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [AuditLogModule, WorkspacesModule],
  controllers: [FileAttachmentsController],
  providers: [FileAttachmentsService, FileStorageService],
  exports: [FileAttachmentsService],
})
export class FileAttachmentsModule {}
