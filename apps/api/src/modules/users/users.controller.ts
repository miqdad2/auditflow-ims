import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { extractUserRoles } from '../../common/permissions.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @RequirePermissions('users.manage')
  findAll(
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('roleId') roleId?: string,
    @Query('isActive') isActive?: string,
    @CurrentUser() user?: Record<string, unknown>,
  ) {
    return this.svc.findAll({ search, departmentId, roleId, isActive }, extractUserRoles(user ?? {}));
  }

  // Lightweight user list for dropdowns (assignee pickers, member selectors, etc.)
  // Requires only project.read so workspace owners can use it
  @Get('search')
  @RequirePermissions('project.read')
  search(@Query('isActive') isActive?: string) {
    return this.svc.findAll({ isActive: isActive ?? 'true' });
  }

  @Get(':id')
  @RequirePermissions('users.manage')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.findOne(id, extractUserRoles(user));
  }

  @Get(':id/workspaces')
  @RequirePermissions('users.manage')
  getUserWorkspaces(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.getUserWorkspaces(id, extractUserRoles(user));
  }

  @Post()
  @RequirePermissions('users.manage')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.create(dto, user.id as string, extractUserRoles(user));
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.update(id, dto, user.id as string, extractUserRoles(user));
  }

  @Patch(':id/status')
  @RequirePermissions('users.manage')
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.setStatus(id, dto, user.id as string, extractUserRoles(user));
  }

  @Post('backfill-usernames')
  @RequirePermissions('users.manage')
  backfillUsernames() {
    return this.svc.backfillUsernames();
  }

  @Post(':id/reset-password')
  @RequirePermissions('users.manage')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.svc.resetPassword(id, dto, user.id as string, extractUserRoles(user));
  }
}
