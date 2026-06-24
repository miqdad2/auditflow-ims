import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { FileStorageService } from '../../common/file-storage.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

// Elevated roles: can access all attachments regardless of workspace/department.
const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'] as const;

// Valid validity periods for new uploads (CUSTOM_EXISTING is backfill-only).
export const VALIDITY_PERIODS = ['NONE', 'ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'ONE_YEAR'] as const;
export type ValidityPeriod = typeof VALIDITY_PERIODS[number] | 'CUSTOM_EXISTING';

// Kuwait timezone offset — UTC+3, no DST.
const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Computes the expiry date from a validity period using calendar arithmetic.
 * Returns null for NONE and CUSTOM_EXISTING (no new expiry calculated).
 * Expiry is snapped to end-of-day Kuwait time (23:59:59.999 Kuwait = 20:59:59.999 UTC).
 */
export function computeExpiryDate(period: ValidityPeriod, startDate: Date): Date | null {
  if (period === 'NONE' || period === 'CUSTOM_EXISTING') return null;

  const d = new Date(startDate);
  switch (period) {
    case 'ONE_MONTH':     d.setMonth(d.getMonth() + 1);       break;
    case 'THREE_MONTHS':  d.setMonth(d.getMonth() + 3);       break;
    case 'SIX_MONTHS':    d.setMonth(d.getMonth() + 6);       break;
    case 'ONE_YEAR':      d.setFullYear(d.getFullYear() + 1); break;
  }

  // Snap to end-of-day Kuwait time
  const shifted = new Date(d.getTime() + KUWAIT_OFFSET_MS);
  shifted.setUTCHours(23, 59, 59, 999);
  return new Date(shifted.getTime() - KUWAIT_OFFSET_MS);
}

// storagePath is intentionally excluded — never returned to clients.
const ATTACHMENT_SELECT = {
  id: true,
  originalFileName: true,
  storedFileName: true,
  mimeType: true,
  fileSize: true,
  checksum: true,
  entityType: true,
  entityId: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
  // Expiry tracking fields
  displayName:       true,
  issueDate:         true,
  expiryDate:        true,
  reminderDays:      true,
  notes:             true,
  isSuperseded:      true,
  renewedFromId:     true,
  validityPeriod:    true,
  validityStartDate: true,
};

export interface AttachmentMetaDto {
  displayName?:    string;
  issueDate?:      string; // ISO date string (legacy only)
  expiryDate?:     string; // ISO date string (Set Validity for CUSTOM_EXISTING legacy files only)
  reminderDays?:   number;
  notes?:          string;
  validityPeriod?: string; // NONE | ONE_MONTH | THREE_MONTHS | SIX_MONTHS | ONE_YEAR (CUSTOM_EXISTING forbidden on new uploads)
}

@Injectable()
export class FileAttachmentsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private realtime: RealtimeService,
    private fileStorage: FileStorageService,
    private workspaces: WorkspacesService,
    private notifications: NotificationsService,
  ) {}

  private async resolveWorkspaceId(entityType: string, entityId: string): Promise<string | null> {
    if (entityType === 'TASK') {
      const t = await this.prisma.task.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      return t?.workspaceId ?? null;
    }
    if (entityType === 'PAGE') {
      const p = await this.prisma.page.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      return p?.workspaceId ?? null;
    }
    if (entityType === 'NCR_CAPA') {
      const n = await this.prisma.ncrCapa.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      return n?.workspaceId ?? null;
    }
    return null;
  }

  async upload(
    file: Express.Multer.File,
    entityType: string,
    entityId: string,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    meta?: AttachmentMetaDto,
  ) {
    // For PAGE uploads: verify workspace access.
    if (entityType === 'PAGE') {
      await this.assertPageWorkspaceAccess(entityId, actorId, actorRoles, actorDeptId);
    }

    // For TASK uploads: verify the actor has access to the task's workspace.
    if (entityType === 'TASK') {
      const task = await this.prisma.task.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      if (task?.workspaceId) {
        await this.workspaces.assertWorkspaceAccess(task.workspaceId, actorId, actorRoles, actorDeptId);
      }
    }

    // For NCR_CAPA uploads: verify workspace access.
    if (entityType === 'NCR_CAPA') {
      const ncr = await this.prisma.ncrCapa.findUnique({ where: { id: entityId }, select: { workspaceId: true } });
      if (ncr?.workspaceId) {
        await this.workspaces.assertWorkspaceAccess(ncr.workspaceId, actorId, actorRoles, actorDeptId);
      }
    }

    // Validate reminderDays — only 7 or 14 days accepted for new uploads
    if (meta?.reminderDays !== undefined && meta.reminderDays !== null) {
      if (![7, 14].includes(meta.reminderDays)) {
        throw new BadRequestException('Reminder must be 7 or 14 days before expiry.');
      }
    }

    // Validate validityPeriod — CUSTOM_EXISTING is for legacy backfill only
    if (meta?.validityPeriod) {
      if (meta.validityPeriod === 'CUSTOM_EXISTING') {
        throw new BadRequestException('CUSTOM_EXISTING is reserved for legacy files. Use a standard validity period.');
      }
      if (!(VALIDITY_PERIODS as readonly string[]).includes(meta.validityPeriod)) {
        throw new BadRequestException(`Invalid validity period: ${meta.validityPeriod}`);
      }
    }

    const stored = await this.fileStorage.saveFile(file, `attachments/${entityType.toLowerCase()}`);

    // Compute expiryDate from validityPeriod if provided
    const uploadDate = new Date();
    const resolvedValidityPeriod = (meta?.validityPeriod ?? 'NONE') as ValidityPeriod;
    const computedExpiry = resolvedValidityPeriod !== 'NONE'
      ? computeExpiryDate(resolvedValidityPeriod, uploadDate)
      : null;

    let attachment: Record<string, unknown>;
    try {
      attachment = await this.prisma.fileAttachment.create({
        data: {
          originalFileName: stored.originalFileName,
          storedFileName:   stored.storedFileName,
          storagePath:      stored.storagePath,
          mimeType:         stored.mimeType,
          fileSize:         stored.fileSize,
          checksum:         stored.checksum,
          uploadedById:     actorId,
          entityType,
          entityId,
          // Optional expiry metadata
          displayName:       meta?.displayName  ?? null,
          issueDate:         null, // server-controlled; not set on initial upload
          expiryDate:        computedExpiry,
          reminderDays:      meta?.reminderDays ?? null,
          notes:             meta?.notes        ?? null,
          validityPeriod:    resolvedValidityPeriod,
          validityStartDate: resolvedValidityPeriod !== 'NONE' ? uploadDate : null,
        },
        select: ATTACHMENT_SELECT,
      }) as Record<string, unknown>;
    } catch (err) {
      this.fileStorage.cleanupOrphanFile(stored.storagePath, `attachment.upload[${entityType}]`);
      throw err;
    }

    await this.auditLog.log({
      actorId,
      action: 'UPLOADED',
      entityType,
      entityId,
      newValue: {
        attachmentId: attachment.id,
        fileName: stored.originalFileName,
        fileSize: stored.fileSize,
      },
    });

    // Resolve workspace once — used for expiry notification, duplicate-document warning and realtime emit.
    const wsId = await this.resolveWorkspaceId(entityType, entityId);

    // If expiry was computed and is within the reminder window, create an immediate notification
    if (computedExpiry && meta?.reminderDays) {
      const daysUntil = Math.ceil((computedExpiry.getTime() - Date.now()) / 86400000);
      if (daysUntil >= 0 && daysUntil <= meta.reminderDays) {
        void this.notifications.create({
          recipientId: actorId,
          title:       'Task file expiring soon',
          message:     `"${meta.displayName ?? stored.originalFileName}" expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
          category:    'FILE_EXPIRING',
          entityType,
          entityId,
          workspaceId: wsId ?? undefined,
        }).catch(() => {});
      }
    }
    let warning: string | undefined;

    if (wsId) {
      // Soft duplicate check: warn if a controlled document with a similar name exists.
      const baseName = stored.originalFileName.replace(/\.[^.]+$/, '').trim();
      if (baseName) {
        const existingDoc = await this.prisma.document.findFirst({
          where: { workspaceId: wsId, title: { contains: baseName, mode: 'insensitive' } },
          select: { title: true },
        });
        if (existingDoc) {
          warning = `A controlled document named "${existingDoc.title}" already exists in this workspace. Consider linking it from the Document Library instead of uploading a duplicate file.`;
        }
      }
      this.realtime.emitToWorkspace(wsId, 'attachment.created', { entityType, entityId, attachmentId: attachment.id });
    }

    return warning ? { ...attachment, warning } : attachment;
  }

  async findForEntity(
    entityType: string,
    entityId: string,
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    // For PAGE listings: verify the actor has access to the parent workspace.
    if (entityType === 'PAGE' && actorId && actorRoles) {
      await this.assertPageWorkspaceAccess(entityId, actorId, actorRoles, actorDeptId ?? null);
    }
    return this.prisma.fileAttachment.findMany({
      where: { entityType, entityId },
      select: ATTACHMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async download(
    id: string,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[],
    actorDepartmentId: string | null,
    res: Response,
  ) {
    const attachment = await this.prisma.fileAttachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.assertEntityAccess(
      attachment.entityType,
      attachment.entityId,
      actorId,
      actorPermissions,
      actorRoles,
      actorDepartmentId,
    );

    if (!fs.existsSync(attachment.storagePath)) {
      throw new NotFoundException('File not found on storage');
    }

    // Fire-and-forget — download must not stall if audit log fails
    void this.auditLog.log({
      actorId,
      action: 'DOWNLOADED',
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      newValue: { attachmentId: id, fileName: attachment.originalFileName },
    });

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.originalFileName}"`,
    );
    res.setHeader('Content-Length', attachment.fileSize);
    fs.createReadStream(attachment.storagePath).pipe(res);
  }

  /**
   * Called before uploading a file to a CHECKLIST_EVIDENCE entity.
   * Verifies the actor is the submitter of the evidence record or an elevated role.
   * Elevated roles (REVIEWER_ROLES) and global admins bypass this check.
   */
  async assertEvidenceUploadAccess(
    evidenceId: string,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[],
  ): Promise<void> {
    if (this.isGlobalAdmin(actorPermissions)) return;
    if (actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r))) return;

    const evidence = await this.prisma.checklistEvidence.findUnique({
      where: { id: evidenceId },
      select: { submittedById: true },
    });
    if (!evidence) throw new NotFoundException('Evidence record not found');

    if (evidence.submittedById !== actorId) {
      throw new ForbiddenException('You can only attach files to your own evidence submissions');
    }
  }

  async delete(
    id: string,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
  ) {
    const attachment = await this.prisma.fileAttachment.findUnique({
      where: { id },
      select: {
        id: true,
        uploadedById: true,
        entityType: true,
        entityId: true,
        originalFileName: true,
        storagePath: true,
      },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const isAdmin    = this.isGlobalAdmin(actorPermissions);
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));

    if (!isAdmin && !isElevated) {
      // Must be the uploader
      if (attachment.uploadedById !== actorId) {
        throw new ForbiddenException('You can only delete your own attachments');
      }

      // Check if the actor has the required update permission on the entity type.
      // Workspace MEMBERs who uploaded the file are exempt from the global update-perm check.
      const updatePerm = this.updatePermFor(attachment.entityType);
      if (updatePerm && !actorPermissions.includes(updatePerm)) {
        // Try workspace MEMBER bypass for the uploader
        const wsId = await this.resolveWorkspaceId(attachment.entityType, attachment.entityId);
        if (wsId) {
          const memberRole = await this.workspaces.getWorkspaceMemberRole(actorId, wsId);
          if (!memberRole || !['MEMBER', 'MANAGER', 'OWNER'].includes(memberRole)) {
            throw new ForbiddenException('You do not have permission to modify this entity');
          }
        } else {
          throw new ForbiddenException('You do not have permission to modify this entity');
        }
      }

      // For PAGE: verify the actor still has access to the parent workspace.
      // This prevents deleting after workspace membership is revoked.
      if (attachment.entityType === 'PAGE') {
        await this.assertPageWorkspaceAccess(attachment.entityId, actorId, actorRoles, actorDeptId);
      }

      // For tasks: block deletion when task is locked (completed / cancelled)
      if (attachment.entityType === 'TASK') {
        const task = await this.prisma.task.findUnique({
          where: { id: attachment.entityId },
          select: { status: true },
        });
        if (task && ['COMPLETED', 'CANCELLED'].includes(task.status)) {
          throw new ForbiddenException(
            'Cannot delete attachments from a completed or cancelled task',
          );
        }
      }
    }

    const { entityType, entityId } = attachment;
    await this.prisma.fileAttachment.delete({ where: { id } });
    this.fileStorage.deleteFile(attachment.storagePath);

    await this.auditLog.log({
      actorId,
      action: 'DELETED',
      entityType,
      entityId,
      previousValue: { attachmentId: id, fileName: attachment.originalFileName },
    });

    void this.resolveWorkspaceId(entityType, entityId).then((wsId) => {
      if (wsId) {
        this.realtime.emitToWorkspace(wsId, 'attachment.deleted', { entityType, entityId, attachmentId: id });
      }
    });
  }

  // ── Private: access matrix ──────────────────────────────────────────────────

  /**
   * Enforces entity-level read access for attachment download.
   *
   * Access rules (evaluated in order, first match wins):
   *
   * Layer 1 — Global admin bypass (users.manage or settings.manage)
   * Layer 2 — Elevated role bypass (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER)
   * Layer 3 — TASK: requires tasks.read PLUS one of:
   *   - task assignee, creator, workspace owner, or matching department
   * Layer 4 — PAGE: requires pages.read PLUS workspace access
   *   - Workspace visibility (ORGANIZATION / DEPARTMENT / PRIVATE) enforced via
   *     WorkspacesService.assertWorkspaceAccess. storagePath is never returned.
   * Layer 5 — CHECKLIST_EVIDENCE: submitter / reviewer / dept / checklist.review / APPROVED
   * Layer 6 — NCR_CAPA: raiser / assignee / dept / ncr.verify / ncr.close
   */
  private async assertEntityAccess(
    entityType: string,
    entityId: string,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[],
    actorDepartmentId: string | null,
  ): Promise<void> {
    // Layer 1: global admin
    if (this.isGlobalAdmin(actorPermissions)) return;

    // Layer 2: elevated role
    if (actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r))) return;

    if (entityType === 'TASK') {
      if (!actorPermissions.includes('tasks.read')) {
        throw new ForbiddenException('Access denied to this attachment');
      }

      const task = await this.prisma.task.findUnique({
        where: { id: entityId },
        select: {
          assigneeId:  true,
          createdById: true,
          workspaceId: true,
          taskList:    { select: { departmentId: true } },
          workspace:   { select: { ownerId: true } },
        },
      });

      if (!task) throw new NotFoundException('Parent task not found');

      const isAssignee  = task.assigneeId === actorId;
      const isCreator   = task.createdById === actorId;
      const isWsOwner   = task.workspace?.ownerId === actorId;
      const deptMatch   = task.taskList?.departmentId !== null &&
                          task.taskList?.departmentId === actorDepartmentId;

      if (isAssignee || isCreator || isWsOwner || deptMatch) return;

      // Workspace MEMBER can download task attachments in their workspace
      if (task.workspaceId) {
        const memberRole = await this.workspaces.getWorkspaceMemberRole(actorId, task.workspaceId);
        if (memberRole) return;
      }

      throw new ForbiddenException(
        'You do not have access to this task\'s attachments',
      );
    }

    if (entityType === 'PAGE') {
      if (!actorPermissions.includes('pages.read')) {
        throw new ForbiddenException('Access denied to this attachment');
      }

      // Workspace access enforces visibility (ORGANIZATION / DEPARTMENT / PRIVATE).
      // Elevated roles are already bypassed at Layer 2 above.
      await this.assertPageWorkspaceAccess(entityId, actorId, actorRoles, actorDepartmentId);
      return;
    }

    if (entityType === 'CHECKLIST_EVIDENCE') {
      // Must have at least checklist.read or evidence.submit to attempt access
      const hasRead   = actorPermissions.includes('checklist.read');
      const hasSubmit = actorPermissions.includes('evidence.submit');
      if (!hasRead && !hasSubmit) {
        throw new ForbiddenException('Access denied to this evidence attachment');
      }

      const evidence = await this.prisma.checklistEvidence.findUnique({
        where:   { id: entityId },
        include: { checklistItem: true },
      });
      if (!evidence) throw new NotFoundException('Parent evidence not found');

      // Submitter of this evidence record
      if (evidence.submittedById === actorId) return;

      // Reviewer assigned on the checklist item
      if (evidence.checklistItem.reviewerId === actorId) return;

      // Department match
      if (
        evidence.checklistItem.departmentId !== null &&
        evidence.checklistItem.departmentId === actorDepartmentId
      ) return;

      // Has checklist.review — can see all evidence
      if (actorPermissions.includes('checklist.review')) return;

      // Read-only roles (e.g. AUDITOR_VIEWER): only APPROVED evidence attachments
      if (hasRead && evidence.status === 'APPROVED') return;

      throw new ForbiddenException('You do not have access to this evidence attachment');
    }

    if (entityType === 'NCR_CAPA') {
      const hasRead = actorPermissions.includes('ncr.read');
      if (!hasRead) throw new ForbiddenException('Access denied to this NCR/CAPA attachment');

      const record = await this.prisma.ncrCapa.findUnique({
        where: { id: entityId },
        select: { raisedById: true, assignedToId: true, departmentId: true },
      });
      if (!record) throw new NotFoundException('Parent NCR/CAPA record not found');

      // Raiser always has access
      if (record.raisedById === actorId) return;
      // Assignee has access
      if (record.assignedToId === actorId) return;
      // Department match
      if (record.departmentId !== null && record.departmentId === actorDepartmentId) return;
      // ncr.verify or ncr.close holders can access all NCR/CAPA attachments
      if (actorPermissions.includes('ncr.verify') || actorPermissions.includes('ncr.close')) return;

      throw new ForbiddenException('You do not have access to this NCR/CAPA attachment');
    }
  }

  // ── Expiry check: for Super User / Super Admin ────────────────────────────

  async getExpiringFiles(actorId: string, actorRoles: string[]) {
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated) throw new ForbiddenException('Only elevated roles can access the expiring files list');

    const now  = new Date();
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Get all active task files with expiry date (expired or expiring within 90 days)
    const files = await this.prisma.fileAttachment.findMany({
      where: {
        entityType:   'TASK',
        isSuperseded: false,
        expiryDate:   { not: null, lte: in90 },
      },
      select: {
        id: true,
        originalFileName: true,
        displayName:      true,
        issueDate:        true,
        expiryDate:       true,
        reminderDays:     true,
        notes:            true,
        isSuperseded:     true,
        createdAt:        true,
        entityId:         true,
        uploadedBy:       { select: { id: true, fullName: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 100,
    });

    if (files.length === 0) return [];

    // Resolve task details for each file
    const taskIds = [...new Set(files.map((f) => f.entityId))];
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id:         true,
        title:      true,
        assigneeId: true,
        workspaceId: true,
        workspace:  { select: { id: true, name: true } },
        assignee:   { select: { id: true, fullName: true } },
      },
    });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const nowMs = now.getTime();
    return files.map((f) => ({
      ...f,
      task: taskMap.get(f.entityId) ?? null,
      daysUntilExpiry: f.expiryDate
        ? Math.ceil((new Date(f.expiryDate).getTime() - nowMs) / 86400000)
        : null,
    }));
  }

  async runExpiryCheck(actorId: string, actorRoles: string[]) {
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated) throw new ForbiddenException('Only elevated roles can run the expiry check');

    const now = new Date();

    // Scan all active task file attachments with expiry set
    const files = await this.prisma.fileAttachment.findMany({
      where: { entityType: 'TASK', isSuperseded: false, expiryDate: { not: null } },
      select: {
        id:           true,
        originalFileName: true,
        displayName:  true,
        expiryDate:   true,
        reminderDays: true,
        entityId:     true,
        uploadedById: true,
      },
    });

    // Get task info for assignee lookups
    const taskIds = [...new Set(files.map((f) => f.entityId))];
    const tasks = taskIds.length > 0
      ? await this.prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, assigneeId: true, workspaceId: true },
        })
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    let expiringSoon = 0;
    let expired = 0;
    let notificationsCreated = 0;

    for (const file of files) {
      if (!file.expiryDate) continue;
      const expiry     = new Date(file.expiryDate);
      const daysLeft   = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
      const window     = file.reminderDays ?? 30;
      const name       = file.displayName ?? file.originalFileName;
      const task       = taskMap.get(file.entityId);

      let message: string | null = null;
      let isExpired = false;

      if (daysLeft < 0) {
        expired++;
        isExpired = true;
        message = `File "${name}" has expired.`;
      } else if (daysLeft <= window) {
        expiringSoon++;
        message = `File "${name}" will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`;
      }

      if (message) {
        const recipientIds = new Set([file.uploadedById]);
        if (task?.assigneeId) recipientIds.add(task.assigneeId);

        for (const recipientId of recipientIds) {
          try {
            await this.notifications.create({
              recipientId,
              title:      isExpired ? 'Task file expired' : 'Task file expiring soon',
              message,
              category:   isExpired ? 'FILE_EXPIRED' : 'FILE_EXPIRING',
              entityType: 'TASK',
              entityId:   file.entityId,
              workspaceId: task?.workspaceId ?? undefined,
            });
            notificationsCreated++;
          } catch { /* ignore notification failures */ }
        }
      }
    }

    return { scanned: files.length, expiringSoon, expired, notificationsCreated };
  }

  // ── Private: small helpers ──────────────────────────────────────────────────

  private isGlobalAdmin(permissions: string[]): boolean {
    return (
      permissions.includes('users.manage') ||
      permissions.includes('settings.manage')
    );
  }

  private updatePermFor(entityType: string): string | null {
    if (entityType === 'TASK')    return 'tasks.update';
    if (entityType === 'PAGE')    return 'pages.update';
    if (entityType === 'NCR_CAPA') return 'ncr.update';
    return null;
  }

  /**
   * Resolves the parent Page's workspaceId and delegates to
   * WorkspacesService.assertWorkspaceAccess. All Pages belong to a workspace
   * (Page.workspaceId is non-nullable), so no null-workspace fallback is needed.
   * Elevated-role bypass is handled inside assertWorkspaceAccess.
   */
  private async assertPageWorkspaceAccess(
    pageId: string,
    actorId: string,
    actorRoles: string[],
    actorDeptId: string | null,
  ): Promise<void> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { workspaceId: true },
    });
    if (!page) throw new NotFoundException('Parent page not found');
    await this.workspaces.assertWorkspaceAccess(page.workspaceId, actorId, actorRoles, actorDeptId);
  }

  // ── Expiry metadata: update ───────────────────────────────────────────────

  async updateMetadata(
    id: string,
    meta: AttachmentMetaDto,
    actorId: string,
    actorRoles: string[] = [],
  ) {
    const att = await this.prisma.fileAttachment.findUnique({
      where: { id },
      select: { id: true, uploadedById: true, entityType: true, entityId: true, validityPeriod: true, expiryDate: true },
    });
    if (!att) throw new NotFoundException('Attachment not found');

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const isOwner    = att.uploadedById === actorId;
    if (!isElevated && !isOwner) {
      throw new ForbiddenException('Only the uploader or an elevated role can update file metadata');
    }

    // Validate reminderDays when being changed — only 7 or 14 accepted
    if (meta.reminderDays !== undefined && meta.reminderDays !== null) {
      if (![7, 14].includes(meta.reminderDays)) {
        throw new BadRequestException('Reminder must be 7 or 14 days before expiry.');
      }
    }

    // Resolve new expiry date from validityPeriod (if provided)
    let resolvedExpiryDate: Date | null | undefined = undefined; // undefined = Prisma skips the field
    let resolvedValidityPeriod: string | undefined = undefined;
    let resolvedValidityStartDate: Date | null | undefined = undefined;

    if (meta.validityPeriod !== undefined) {
      const period = meta.validityPeriod as ValidityPeriod;
      if (period === 'CUSTOM_EXISTING') {
        // Legacy Set Validity: keep existing expiryDate, just mark period
        resolvedValidityPeriod = 'CUSTOM_EXISTING';
        resolvedExpiryDate     = meta.expiryDate ? new Date(meta.expiryDate) : (att.expiryDate ?? null);
        resolvedValidityStartDate = undefined; // not applicable
      } else if (period === 'NONE') {
        resolvedValidityPeriod    = 'NONE';
        resolvedExpiryDate        = null;
        resolvedValidityStartDate = null;
      } else if ((VALIDITY_PERIODS as readonly string[]).includes(period)) {
        // Standard period: compute expiry from today
        const startDate = new Date();
        resolvedValidityPeriod    = period;
        resolvedValidityStartDate = startDate;
        resolvedExpiryDate        = computeExpiryDate(period, startDate);
      } else {
        throw new BadRequestException(`Invalid validity period: ${meta.validityPeriod}`);
      }
    } else if (meta.expiryDate !== undefined) {
      // Direct expiryDate patch (legacy CUSTOM_EXISTING Set Validity without period change)
      resolvedExpiryDate = meta.expiryDate ? new Date(meta.expiryDate) : null;
    }

    const updated = await this.prisma.fileAttachment.update({
      where: { id },
      data: {
        displayName:       meta.displayName       ?? undefined,
        notes:             meta.notes             ?? undefined,
        reminderDays:      meta.reminderDays      ?? undefined,
        expiryDate:        resolvedExpiryDate,
        validityPeriod:    resolvedValidityPeriod,
        validityStartDate: resolvedValidityStartDate,
      },
      select: ATTACHMENT_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: att.entityType,
      entityId:   att.entityId,
      newValue:   {
        attachmentId:   id,
        validityPeriod: resolvedValidityPeriod,
        expiryDate:     resolvedExpiryDate?.toISOString() ?? null,
        displayName:    meta.displayName,
      },
    });

    return updated;
  }

  // ── Renewal: upload a new file that supersedes an existing one ────────────

  async renew(
    oldAttachmentId: string,
    file: Express.Multer.File,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    meta?: AttachmentMetaDto,
  ) {
    const old = await this.prisma.fileAttachment.findUnique({
      where: { id: oldAttachmentId },
      select: {
        id: true, uploadedById: true, entityType: true, entityId: true,
        originalFileName: true, isSuperseded: true,
      },
    });
    if (!old) throw new NotFoundException('Attachment not found');
    if (old.isSuperseded) throw new ForbiddenException('This file has already been renewed');

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const isOwner    = old.uploadedById === actorId;
    if (!isElevated && !isOwner) {
      throw new ForbiddenException('Only the uploader or an elevated role can renew a file');
    }

    // Check task workspace access
    if (old.entityType === 'TASK') {
      const task = await this.prisma.task.findUnique({
        where: { id: old.entityId }, select: { workspaceId: true, assigneeId: true },
      });
      if (task?.workspaceId) {
        await this.workspaces.assertWorkspaceAccess(task.workspaceId, actorId, actorRoles, actorDeptId);
      }

      // Validate validityPeriod if provided on renewal
      if (meta?.validityPeriod && meta.validityPeriod === 'CUSTOM_EXISTING') {
        throw new BadRequestException('CUSTOM_EXISTING is reserved for legacy files. Use a standard validity period.');
      }

      // Store file
      const stored = await this.fileStorage.saveFile(file, `attachments/${old.entityType.toLowerCase()}`);

      // Compute renewal expiry
      const renewDate = new Date();
      const renewValidityPeriod = (meta?.validityPeriod ?? 'NONE') as ValidityPeriod;
      const renewExpiry = renewValidityPeriod !== 'NONE' ? computeExpiryDate(renewValidityPeriod, renewDate) : null;

      let newAtt: Record<string, unknown>;
      try {
        // Create new attachment
        newAtt = await this.prisma.fileAttachment.create({
          data: {
            originalFileName: stored.originalFileName,
            storedFileName:   stored.storedFileName,
            storagePath:      stored.storagePath,
            mimeType:         stored.mimeType,
            fileSize:         stored.fileSize,
            checksum:         stored.checksum,
            uploadedById:     actorId,
            entityType:       old.entityType,
            entityId:         old.entityId,
            displayName:      meta?.displayName  ?? null,
            issueDate:        null,
            expiryDate:       renewExpiry,
            reminderDays:     meta?.reminderDays ?? null,
            notes:            meta?.notes        ?? null,
            renewedFromId:    old.id,
            validityPeriod:    renewValidityPeriod,
            validityStartDate: renewValidityPeriod !== 'NONE' ? renewDate : null,
          },
          select: ATTACHMENT_SELECT,
        });
      } catch (err) {
        this.fileStorage.cleanupOrphanFile(stored.storagePath, `attachment.renew[${old.id}]`);
        throw err;
      }

      // Mark old file as superseded
      await this.prisma.fileAttachment.update({
        where: { id: old.id },
        data:  { isSuperseded: true },
      });

      void this.auditLog.log({
        actorId,
        action:     'UPLOADED',
        entityType: old.entityType,
        entityId:   old.entityId,
        newValue:   { renewal: true, oldAttachmentId: old.id, newAttachmentId: (newAtt as { id: string }).id },
      });

      // Notify task assignee and uploader of old file
      const assigneeId = task?.assigneeId;
      const notifyIds = new Set([old.uploadedById, ...(assigneeId ? [assigneeId] : [])].filter((id) => id !== actorId));
      const fileName = meta?.displayName ?? stored.originalFileName;
      for (const recipientId of notifyIds) {
        void this.notifications.create({
          recipientId,
          title:      'Task file renewed',
          message:    `"${fileName}" has been renewed.`,
          category:   'FILE_RENEWED',
          entityType: old.entityType,
          entityId:   old.entityId,
          workspaceId: task?.workspaceId ?? undefined,
        }).catch(() => {});
      }

      // Realtime
      const wsId = await this.resolveWorkspaceId(old.entityType, old.entityId);
      if (wsId) {
        this.realtime.emitToWorkspace(wsId, 'attachment.created', {
          entityType: old.entityType, entityId: old.entityId, renewal: true,
        });
      }

      return newAtt;
    }

    throw new ForbiddenException('Renewal is only supported for TASK attachments');
  }
}
