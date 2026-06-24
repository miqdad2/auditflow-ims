import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
  UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { FileAttachmentsService, AttachmentMetaDto } from './file-attachments.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FileAttachmentsController {
  constructor(private svc: FileAttachmentsService) {}

  // ─── Task attachments ──────────────────────────────────────────────────────

  @Post('tasks/:id/attachments')
  @RequirePermissions('project.read')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadToTask(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    // Parse optional expiry metadata from multipart body fields
    const meta: AttachmentMetaDto = {
      displayName:    body.displayName    || undefined,
      issueDate:      body.issueDate      || undefined,
      expiryDate:     body.expiryDate     || undefined,
      reminderDays:   body.reminderDays   ? Number(body.reminderDays) : undefined,
      notes:          body.notes          || undefined,
      validityPeriod: body.validityPeriod || undefined,
    };
    return this.svc.upload(file, 'TASK', id, user.id as string, actorRoles, actorDeptId, meta);
  }

  @Get('tasks/:id/attachments')
  @RequirePermissions('project.read')
  listTaskAttachments(@Param('id') id: string) {
    return this.svc.findForEntity('TASK', id);
  }

  @Patch('attachments/:id/metadata')
  @RequirePermissions('project.read')
  updateAttachmentMetadata(
    @Param('id') id: string,
    @Body() body: AttachmentMetaDto,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles = extractUserRoles(user);
    return this.svc.updateMetadata(id, body, user.id as string, actorRoles);
  }

  @Post('attachments/:id/renew')
  @RequirePermissions('project.read')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  renewAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    const meta: AttachmentMetaDto = {
      displayName:    body.displayName    || undefined,
      issueDate:      body.issueDate      || undefined,
      expiryDate:     body.expiryDate     || undefined,
      reminderDays:   body.reminderDays   ? Number(body.reminderDays) : undefined,
      notes:          body.notes          || undefined,
      validityPeriod: body.validityPeriod || undefined,
    };
    return this.svc.renew(id, file, user.id as string, actorRoles, actorDeptId, meta);
  }

  // ─── Page attachments ──────────────────────────────────────────────────────

  @Post('pages/:id/attachments')
  @RequirePermissions('pages.read')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadToPage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.upload(file, 'PAGE', id, user.id as string, actorRoles, actorDeptId);
  }

  @Get('pages/:id/attachments')
  @RequirePermissions('pages.read')
  listPageAttachments(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.findForEntity('PAGE', id, user.id as string, actorRoles, actorDeptId);
  }

  // ─── Checklist evidence attachments ───────────────────────────────────────
  // Upload: actor must be the submitter of the evidence record (or elevated role).
  // List: checklist.read is sufficient — entity-level listing is not user-sensitive here.
  // Download: access enforced via assertEntityAccess (CHECKLIST_EVIDENCE branch).

  @Post('checklist-evidence/:id/attachments')
  @RequirePermissions('evidence.submit')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadToEvidence(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const roles       = extractUserRoles(user);
    const permissions = extractUserPermissions(user);
    await this.svc.assertEvidenceUploadAccess(id, user.id as string, permissions, roles);
    return this.svc.upload(file, 'CHECKLIST_EVIDENCE', id, user.id as string);
  }

  @Get('checklist-evidence/:id/attachments')
  @RequirePermissions('checklist.read')
  listEvidenceAttachments(@Param('id') id: string) {
    return this.svc.findForEntity('CHECKLIST_EVIDENCE', id);
  }

  // ─── NCR/CAPA attachments ─────────────────────────────────────────────────
  // Upload: raiser or assignee (or elevated role) only.
  // List: ncr.read is sufficient.
  // Download: access enforced via assertEntityAccess (NCR_CAPA branch).

  @Post('ncr-capa/:id/attachments')
  @RequirePermissions('ncr.read')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadToNcrCapa(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.upload(file, 'NCR_CAPA', id, user.id as string, actorRoles, actorDeptId);
  }

  @Get('ncr-capa/:id/attachments')
  @RequirePermissions('ncr.read')
  listNcrCapaAttachments(@Param('id') id: string) {
    return this.svc.findForEntity('NCR_CAPA', id);
  }

  // ─── Expiry endpoints (Super User / Super Admin) ─────────────────────────

  @Get('file-attachments/expiring')
  @RequirePermissions('project.read')
  getExpiringFiles(@CurrentUser() user: Record<string, unknown>) {
    const actorRoles = extractUserRoles(user);
    return this.svc.getExpiringFiles(user.id as string, actorRoles);
  }

  @Post('file-attachments/expiry-check')
  @RequirePermissions('project.read')
  runExpiryCheck(@CurrentUser() user: Record<string, unknown>) {
    const actorRoles = extractUserRoles(user);
    return this.svc.runExpiryCheck(user.id as string, actorRoles);
  }

  // ─── Download ─────────────────────────────────────────────────────────────
  // JwtAuthGuard ensures a valid session.
  // Entity-level access is enforced inside the service per entity type:
  //   TASK              — assignee / creator / workspace owner / matching department
  //   PAGE              — pages.read + workspace access (ORGANIZATION/DEPARTMENT/PRIVATE)
  //   CHECKLIST_EVIDENCE — submitter / reviewer / dept / checklist.review / APPROVED
  //   NCR_CAPA          — raiser / assignee / dept / ncr.verify / ncr.close
  //   Elevated roles (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER) bypass all checks.
  //   storagePath is never included in any response payload.

  @Get('attachments/:id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const permissions   = extractUserPermissions(user);
    const roles         = extractUserRoles(user);
    const departmentId  = (user.departmentId as string | null) ?? null;

    await this.svc.download(id, user.id as string, permissions, roles, departmentId, res);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  // Ownership + entity-permission + task-state + workspace-access checks enforced in the service.

  @Delete('attachments/:id')
  deleteAttachment(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const permissions = extractUserPermissions(user);
    const actorRoles  = extractUserRoles(user);
    const actorDeptId = (user.departmentId as string | null) ?? null;
    return this.svc.delete(id, user.id as string, permissions, actorRoles, actorDeptId);
  }
}
