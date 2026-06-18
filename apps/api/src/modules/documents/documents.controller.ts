import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import {
  extractUserPermissions,
  extractUserRoles,
} from '../../common/permissions.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { BulkUploadDocumentDto } from './dto/bulk-upload-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private svc: DocumentsService) {}

  // ── List ────────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('documents.read')
  findAll(
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: Record<string, unknown>,
  ) {
    const actorRoles      = extractUserRoles(user ?? {});
    const actorDeptId     = (user?.departmentId as string | null) ?? null;
    const actorId         = user?.id as string;
    return this.svc.findAll(
      {
        status, departmentId, workspaceId, category, search,
        page:  page  ? parseInt(page, 10)  : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      actorRoles,
      actorDeptId,
      actorId,
    );
  }

  // ── Single document ──────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions('documents.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.findOne(id, user.id as string, actorRoles, actorDeptId);
  }

  // ── Version list ─────────────────────────────────────────────────────────────

  @Get(':id/versions')
  @RequirePermissions('documents.read')
  getVersions(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.getVersions(id, user.id as string, actorRoles, actorDeptId);
  }

  // ── Upload (create v1) ───────────────────────────────────────────────────────

  @Post('upload')
  @RequirePermissions('project.read')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    const permissions = extractUserPermissions(user);
    return this.svc.create(dto, file, user.id as string, actorRoles, actorDeptId, permissions);
  }

  // ── Bulk upload ──────────────────────────────────────────────────────────────
  // Accepts multipart/form-data with field "files[]" for multiple files.
  // Returns per-file results; partial success is handled gracefully.

  @Post('bulk-upload')
  @RequirePermissions('project.read')
  @UseInterceptors(FilesInterceptor('files[]', 50, { storage: memoryStorage() }))
  bulkUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: BulkUploadDocumentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    const permissions = extractUserPermissions(user);
    return this.svc.bulkUpload(files ?? [], dto, user.id as string, actorRoles, actorDeptId, permissions);
  }

  // ── Update metadata ──────────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions('documents.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.update(id, dto, user.id as string, actorRoles, actorDeptId);
  }

  // ── Upload new version ───────────────────────────────────────────────────────

  @Post(':id/versions')
  @RequirePermissions('project.read')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadNewVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    const permissions = extractUserPermissions(user);
    return this.svc.uploadNewVersion(id, file, user.id as string, actorRoles, actorDeptId, permissions);
  }

  // ── Status change ────────────────────────────────────────────────────────────
  // Controller requires project.read (minimum gate); the service enforces stricter per-transition
  // checks. Workspace MEMBER can submit DRAFT → UNDER_REVIEW; approve/archive require permissions.

  @Patch(':id/status')
  @RequirePermissions('project.read')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const permissions = extractUserPermissions(user);
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.updateStatus(id, dto, user.id as string, permissions, actorRoles, actorDeptId);
  }

  // ── Archive (dedicated) ──────────────────────────────────────────────────────

  @Patch(':id/archive')
  @RequirePermissions('documents.archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.archive(id, user.id as string, actorRoles, actorDeptId);
  }

  // ── Download current version ─────────────────────────────────────────────────

  @Get(':id/download')
  @RequirePermissions('documents.download')
  async downloadCurrent(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const permissions  = extractUserPermissions(user);
    const roles        = extractUserRoles(user);
    const departmentId = (user.departmentId as string | null) ?? null;
    await this.svc.downloadCurrentVersion(id, user.id as string, permissions, roles, departmentId, res);
  }

  // ── Download specific version ────────────────────────────────────────────────

  @Get(':id/versions/:versionId/download')
  @RequirePermissions('documents.download')
  async downloadVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const permissions  = extractUserPermissions(user);
    const roles        = extractUserRoles(user);
    const departmentId = (user.departmentId as string | null) ?? null;
    await this.svc.downloadVersion(id, versionId, user.id as string, permissions, roles, departmentId, res);
  }
}
