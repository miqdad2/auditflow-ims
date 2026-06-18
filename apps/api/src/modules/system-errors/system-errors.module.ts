import { Global, Module } from '@nestjs/common';
import { SystemErrorsService } from './system-errors.service';
import { SystemErrorsController } from './system-errors.controller';
import { PrismaModule } from '../../common/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SystemErrorsService],
  controllers: [SystemErrorsController],
  exports: [SystemErrorsService],
})
export class SystemErrorsModule {}
