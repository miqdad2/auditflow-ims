import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [AuditLogModule, WorkspacesModule],
  controllers: [PagesController],
  providers: [PagesService],
})
export class PagesModule {}
