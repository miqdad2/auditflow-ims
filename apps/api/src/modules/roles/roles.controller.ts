import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ForcedPasswordResetGuard } from '../../common/forced-password-reset.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard, ForcedPasswordResetGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
