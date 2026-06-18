import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { SystemErrorsService } from './system-errors.service';
import { ReportFrontendErrorDto } from './dto/report-frontend-error.dto';

@Controller('system-errors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemErrorsController {
  constructor(private svc: SystemErrorsService) {}

  // Any authenticated user can report a frontend error
  @Post('report')
  @RequirePermissions('project.read')
  report(
    @Body() dto: ReportFrontendErrorDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    void this.svc.log({
      source: 'FRONTEND',
      severity: 'ERROR',
      message: dto.message,
      stack: dto.stack,
      path: dto.path,
      userId: user.id as string,
    });
    return { received: true };
  }

  @Get()
  @RequirePermissions('settings.manage')
  findAll(
    @Query('source') source?: string,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({
      source,
      severity,
      resolved,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('stats')
  @RequirePermissions('settings.manage')
  getStats() {
    return this.svc.getStats();
  }

  @Patch(':id/resolve')
  @RequirePermissions('settings.manage')
  resolve(@Param('id') id: string) {
    return this.svc.resolve(id);
  }

  @Patch(':id/unresolve')
  @RequirePermissions('settings.manage')
  unresolve(@Param('id') id: string) {
    return this.svc.unresolve(id);
  }
}
