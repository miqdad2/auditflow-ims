import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.departmentsService.findAll(includeInactive === 'true');
  }

  @Get(':id/usage')
  @RequirePermissions('departments.manage')
  getUsage(@Param('id') id: string) {
    return this.departmentsService.getUsageCounts(id);
  }

  @Get(':id')
  @RequirePermissions('departments.manage')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @RequirePermissions('departments.manage')
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: Record<string, unknown>) {
    return this.departmentsService.create(dto, user.id as string);
  }

  @Patch(':id')
  @RequirePermissions('departments.manage')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: Record<string, unknown>) {
    return this.departmentsService.update(id, dto, user.id as string);
  }
}
