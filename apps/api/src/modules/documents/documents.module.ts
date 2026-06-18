import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { FileStorageService } from '../../common/file-storage.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [AuditLogModule, NotificationsModule, WorkspacesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, FileStorageService],
  exports: [DocumentsService, FileStorageService],
})
export class DocumentsModule {}
