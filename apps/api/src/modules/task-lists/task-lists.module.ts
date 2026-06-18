import { Module } from '@nestjs/common';
import { TaskListsService } from './task-lists.service';
import { TaskListsController } from './task-lists.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [AuditLogModule, WorkspacesModule],
  providers: [TaskListsService],
  controllers: [TaskListsController],
  exports: [TaskListsService],
})
export class TaskListsModule {}
