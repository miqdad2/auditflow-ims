import { Module } from '@nestjs/common';
import { TaskListsService } from './task-lists.service';
import { TaskListsController } from './task-lists.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuditLogModule, WorkspacesModule, RealtimeModule],
  providers: [TaskListsService],
  controllers: [TaskListsController],
  exports: [TaskListsService],
})
export class TaskListsModule {}
