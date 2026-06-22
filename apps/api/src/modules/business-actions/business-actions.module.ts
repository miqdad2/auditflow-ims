import { Module } from '@nestjs/common';
import { BusinessActionsController } from './business-actions.controller';
import { BusinessActionsService } from './business-actions.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [BusinessActionsController],
  providers: [BusinessActionsService],
  exports: [BusinessActionsService],
})
export class BusinessActionsModule {}
