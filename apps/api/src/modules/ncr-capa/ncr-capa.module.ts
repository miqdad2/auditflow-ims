import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { NcrCapaService } from './ncr-capa.service';
import { NcrCapaController } from './ncr-capa.controller';

@Module({
  imports: [PrismaModule, AuditLogModule, NotificationsModule, WorkspacesModule],
  controllers: [NcrCapaController],
  providers: [NcrCapaService],
})
export class NcrCapaModule {}
