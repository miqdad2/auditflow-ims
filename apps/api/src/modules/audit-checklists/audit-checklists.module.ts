import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AuditChecklistsService } from './audit-checklists.service';
import { AuditChecklistsController } from './audit-checklists.controller';

@Module({
  imports: [PrismaModule, AuditLogModule, NotificationsModule, WorkspacesModule],
  providers: [AuditChecklistsService],
  controllers: [AuditChecklistsController],
})
export class AuditChecklistsModule {}
