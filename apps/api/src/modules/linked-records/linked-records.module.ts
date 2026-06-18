import { Module } from '@nestjs/common';
import { LinkedRecordsService } from './linked-records.service';
import { LinkedRecordsController } from './linked-records.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [WorkspacesModule, AuditLogModule],
  providers: [LinkedRecordsService],
  controllers: [LinkedRecordsController],
})
export class LinkedRecordsModule {}
