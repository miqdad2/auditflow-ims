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
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { BulkUploadDocumentDto } from './dto/bulk-upload-document.dto';

export interface BulkUploadFileResult {
  originalFileName: string;
  success: boolean;
  documentId?: string;
  versionId?: string;
  error?: string;
}

export interface BulkUploadResponse {
  results: BulkUploadFileResult[];
  successCount: number;
  failCount: number;
}

// storagePath is never returned to clients — excluded from selects.
const VERSION_SELECT = {
  id: true,
  versionNumber: true,
  originalFileName: true,
  storedFileName: true,
  mimeType: true,
  fileSize: true,
  checksum: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

const DOCUMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  documentNumber: true,
  category: true,
  status: true,
  currentVersionId: true,
  reviewDate: true,
  expiryDate: true,
  rejectionReason: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  departmentId: true,
  workspaceId: true,
  ownerId: true,
  createdById: true,
  department: { select: { id: true, name: true, code: true } },
  workspace: { select: { id: true, name: true } },
  owner: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  versions: {
    select: VERSION_SELECT,
    orderBy: { versionNumber: 'desc' as const },
  },
};

// Roles that bypass department/status access restrictions on documents.
const ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER', 'SUPER_USER'] as const;

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private realtime: RealtimeService,
    private fileStorage: FileStorageService,
    private workspaces: WorkspacesService,
  ) {}

  private emitDocumentUpdated(id: string, workspaceId: string | null | undefined, action: string) {
    if (workspaceId) {
      this.realtime.emitToWorkspace(workspaceId, 'document.updated', { id, action });
    }
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findAll(
    query: {
      status?: string;
      departmentId?: string;
      workspaceId?: string;
      taskId?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    actorRoles: string[],
    actorDepartmentId: string | null,
    actorId: string,
  ) {
    const page  = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Role-based list scoping
    if (!actorRoles.some(r => (ELEVATED_ROLES as readonly string[]).includes(r))) {
      if (actorRoles.includes('AUDITOR_VIEWER') || actorRoles.includes('STAFF')) {
        // Only APPROVED documents
        where['status'] = 'APPROVED';
      } else if (actorRoles.includes('DEPARTMENT_MANAGER')) {
        // Their department + own
        where['OR'] = [
          { departmentId: actorDepartmentId },
          { ownerId: actorId },
          { createdById: actorId },
        ];
      } else if (actorRoles.includes('DEPARTMENT_USER')) {
        // Approved docs from their dept, or docs they own/created
        where['OR'] = [
          { ownerId: actorId },
          { createdById: actorId },
          { status: 'APPROVED', departmentId: actorDepartmentId },
          { status: 'APPROVED', departmentId: null },
        ];
      }
    }

    // Query filters (additive, on top of role filter)
    if (query.status && !where['status']) where['status'] = query.status;
    if (query.departmentId) where['departmentId'] = query.departmentId;
    if (query.workspaceId) where['workspaceId'] = query.workspaceId;
    if (query.taskId) where['taskId'] = query.taskId;
    if (query.category) where['category'] = query.category;
    if (query.search) {
      const searchOr = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { documentNumber: { contains: query.search, mode: 'insensitive' } },
      ];
      // Merge search OR with existing role-scoped OR if both are present
      if (where['OR']) {
        where['AND'] = [{ OR: where['OR'] }, { OR: searchOr }];
        delete where['OR'];
      } else {
        where['OR'] = searchOr;
      }
    }

    // Add workspace visibility filter for non-elevated users
    const wsVis = this.workspaces.buildWorkspaceVisibilityWhere(actorId, actorRoles, actorDepartmentId);
    if (Object.keys(wsVis).length > 0) {
      const existing = { ...where };
      Object.keys(where).forEach((k) => delete where[k]);
      where['AND'] = [existing, wsVis];
    }

    const [total, items] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        select: {
          id: true, title: true, documentNumber: true, category: true,
          status: true, currentVersionId: true, reviewDate: true,
          expiryDate: true, rejectionReason: true, archivedAt: true,
          createdAt: true, updatedAt: true,
          department: { select: { id: true, name: true, code: true } },
          workspace:  { select: { id: true, name: true } },
          owner:      { select: { id: true, fullName: true } },
          createdBy:  { select: { id: true, fullName: true } },
          versions: {
            select: { id: true, versionNumber: true, originalFileName: true, mimeType: true, fileSize: true, createdAt: true },
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Single document ────────────────────────────────────────────────────────

  async findOne(
    id: string,
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      select: DOCUMENT_SELECT,
    });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    if (actorId && actorRoles && doc.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(
        doc.workspaceId, actorId, actorRoles, actorDeptId ?? null,
      );
    }
    return doc;
  }

  // ── Version list ───────────────────────────────────────────────────────────

  async getVersions(
    id: string,
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    await this.findOne(id, actorId, actorRoles, actorDeptId);
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      select: VERSION_SELECT,
      orderBy: { versionNumber: 'desc' },
    });
  }

  // ── Create (upload v1) ─────────────────────────────────────────────────────

  async create(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    actorPermissions: string[] = [],
  ) {
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const hasCreatePerm = actorPermissions.includes('documents.create');

    if (dto.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(dto.workspaceId, actorId, actorRoles, actorDeptId);
      if (!isElevated && !hasCreatePerm) {
        const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, dto.workspaceId, actorRoles, actorDeptId);
        if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to upload documents');
      }
    } else if (!isElevated && !hasCreatePerm) {
      throw new ForbiddenException('documents.create permission required');
    }
    const stored = await this.fileStorage.saveFile(file, 'documents');

    // eslint-disable-next-line prefer-const
    let doc: { id: string };
    try {
      doc = await this.prisma.$transaction(async (tx) => {
        const ownerId = dto.ownerId ?? actorId;

        const newDoc = await tx.document.create({
        data: {
          title: dto.title,
          description: dto.description,
          documentNumber: dto.documentNumber,
          category: dto.category ?? 'GENERAL',
          status: 'DRAFT',
          departmentId: dto.departmentId ?? null,
          workspaceId: dto.workspaceId ?? null,
          taskId: dto.taskId ?? null,
          ownerId,
          createdById: actorId,
          reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
      });

      const version = await tx.documentVersion.create({
        data: {
          documentId: newDoc.id,
          versionNumber: 1,
          originalFileName: stored.originalFileName,
          storedFileName:   stored.storedFileName,
          storagePath:      stored.storagePath,
          mimeType:         stored.mimeType,
          fileSize:         stored.fileSize,
          checksum:         stored.checksum,
          uploadedById: actorId,
        },
      });

      await tx.document.update({
        where: { id: newDoc.id },
        data: { currentVersionId: version.id },
      });

        return newDoc;
      });
    } catch (err) {
      // DB failed after file was already written — attempt orphan cleanup
      this.fileStorage.cleanupOrphanFile(stored.storagePath, 'document.create');
      throw err;
    }

    await this.auditLog.log({
      actorId,
      action: 'UPLOADED',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      newValue: { title: dto.title, category: dto.category, status: 'DRAFT' },
    });

    // Notify workspace members a new document was uploaded
    if (dto.workspaceId) {
      this.realtime.emitToWorkspace(dto.workspaceId, 'document.created', {
        id: doc.id, title: dto.title, workspaceId: dto.workspaceId,
      });
    }

    return this.findOne(doc.id);
  }

  // ── Update metadata ────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateDocumentDto,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
  ) {
    const existing = await this.findOne(id, actorId, actorRoles, actorDeptId);

    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot update an archived document.');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        title:          dto.title,
        description:    dto.description,
        documentNumber: dto.documentNumber,
        category:       dto.category,
        departmentId:   dto.departmentId,
        workspaceId:    dto.workspaceId,
        ownerId:        dto.ownerId,
        reviewDate:     dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        expiryDate:     dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATED',
      entityType: 'DOCUMENT',
      entityId: id,
      previousValue: { title: existing.title, status: existing.status },
      newValue: { title: updated.title },
    });

    this.emitDocumentUpdated(id, updated.workspaceId, 'updated');
    return this.findOne(id);
  }

  // ── Upload new version ─────────────────────────────────────────────────────

  async uploadNewVersion(
    id: string,
    file: Express.Multer.File,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    actorPermissions: string[] = [],
  ) {
    const existing = await this.findOne(id, actorId, actorRoles, actorDeptId);

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    if (!isElevated && !actorPermissions.includes('documents.update')) {
      if (existing.workspaceId) {
        const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, existing.workspaceId, actorRoles, actorDeptId);
        if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to upload new document version');
      } else {
        throw new ForbiddenException('documents.update permission required');
      }
    }

    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot upload a new version of an archived document.');
    }
    if (existing.status === 'APPROVED') {
      throw new BadRequestException(
        'Cannot upload a new version of an approved document. Archive or reject it first.',
      );
    }

    const stored = await this.fileStorage.saveFile(file, 'documents');

    const latestVersion = existing.versions[0];
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    let version: { id: string };
    try {
      version = await this.prisma.$transaction(async (tx) => {
        const newVersion = await tx.documentVersion.create({
          data: {
            documentId: id,
            versionNumber: nextVersionNumber,
            originalFileName: stored.originalFileName,
            storedFileName:   stored.storedFileName,
            storagePath:      stored.storagePath,
            mimeType:         stored.mimeType,
            fileSize:         stored.fileSize,
            checksum:         stored.checksum,
            uploadedById: actorId,
          },
        });

        await tx.document.update({
          where: { id },
          data: { currentVersionId: newVersion.id, status: 'DRAFT' },
        });

        return newVersion;
      });
    } catch (err) {
      this.fileStorage.cleanupOrphanFile(stored.storagePath, 'document.uploadNewVersion');
      throw err;
    }

    await this.auditLog.log({
      actorId,
      action: 'UPLOADED',
      entityType: 'DOCUMENT_VERSION',
      entityId: version.id,
      newValue: { documentId: id, versionNumber: nextVersionNumber },
    });

    this.emitDocumentUpdated(id, existing.workspaceId, 'new-version');
    return this.findOne(id);
  }

  // ── Status change ──────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    dto: UpdateDocumentStatusDto,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
  ) {
    const existing = await this.findOne(id, actorId, actorRoles, actorDeptId);
    const oldStatus = existing.status;
    const newStatus = dto.status;

    this.validateStatusTransition(oldStatus, newStatus);

    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const isPrivilegedTransition = ['APPROVED', 'REJECTED', 'ARCHIVED'].includes(newStatus);

    if (!isElevated) {
      if (isPrivilegedTransition) {
        this.validateStatusPermission(newStatus, actorPermissions);
      } else if (!actorPermissions.includes('documents.update')) {
        // DRAFT / UNDER_REVIEW: allow workspace MEMBER to submit their own doc for review
        if (existing.workspaceId) {
          const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, existing.workspaceId, actorRoles, actorDeptId);
          if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to change document status');
        } else {
          throw new ForbiddenException('documents.update permission required to change document status');
        }
      }
    }

    if (newStatus === 'REJECTED' && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('A rejection reason is required when rejecting a document.');
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'ARCHIVED') updateData['archivedAt'] = new Date();
    if (newStatus === 'REJECTED') updateData['rejectionReason'] = dto.rejectionReason;
    // Clear rejection reason when re-activating
    if (newStatus === 'DRAFT' || newStatus === 'UNDER_REVIEW') updateData['rejectionReason'] = null;

    await this.prisma.document.update({ where: { id }, data: updateData });

    await this.auditLog.log({
      actorId,
      action: newStatus === 'APPROVED'  ? 'APPROVED'      :
              newStatus === 'REJECTED'  ? 'REJECTED'      :
              newStatus === 'ARCHIVED'  ? 'ARCHIVED'      : 'STATUS_CHANGED',
      entityType: 'DOCUMENT',
      entityId: id,
      previousValue: { status: oldStatus },
      newValue: { status: newStatus, rejectionReason: dto.rejectionReason },
    });

    // Notifications
    if (newStatus === 'APPROVED' && existing.ownerId !== actorId) {
      void this.notifications.create({
        recipientId: existing.ownerId,
        category:    'DOCUMENT_APPROVED',
        title:       'Document Approved',
        message:     `Your document "${existing.title}" has been approved.`,
        entityType:  'DOCUMENT',
        entityId:    id,
      });
    }

    if (newStatus === 'REJECTED' && existing.ownerId !== actorId) {
      void this.notifications.create({
        recipientId: existing.ownerId,
        category:    'DOCUMENT_REJECTED',
        title:       'Document Rejected',
        message:     `Your document "${existing.title}" was rejected.${dto.rejectionReason ? ` Reason: ${dto.rejectionReason}` : ''}`,
        entityType:  'DOCUMENT',
        entityId:    id,
      });
    }

    if (newStatus === 'UNDER_REVIEW') {
      const reviewers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          userRoles: {
            some: { role: { name: { in: ['ISO_MANAGER', 'QHSE_USER', 'DEPARTMENT_MANAGER'] } } },
          },
        },
        select: { id: true },
      });
      for (const reviewer of reviewers) {
        if (reviewer.id !== actorId) {
          void this.notifications.create({
            recipientId: reviewer.id,
            category:    'DOCUMENT_REVIEW_PENDING',
            title:       'Document Submitted for Review',
            message:     `Document "${existing.title}" has been submitted for review.`,
            entityType:  'DOCUMENT',
            entityId:    id,
          });
        }
      }
    }

    this.emitDocumentUpdated(id, existing.workspaceId, dto.status.toLowerCase());
    return this.findOne(id);
  }

  // ── Archive (dedicated endpoint) ───────────────────────────────────────────

  async archive(
    id: string,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
  ) {
    const existing = await this.findOne(id, actorId, actorRoles, actorDeptId);

    if (existing.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED documents can be archived.');
    }

    await this.prisma.document.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });

    await this.auditLog.log({
      actorId,
      action: 'ARCHIVED',
      entityType: 'DOCUMENT',
      entityId: id,
      previousValue: { status: 'APPROVED' },
      newValue: { status: 'ARCHIVED' },
    });

    this.emitDocumentUpdated(id, existing.workspaceId, 'archived');
    return this.findOne(id);
  }

  // ── Bulk upload ────────────────────────────────────────────────────────────

  async bulkUpload(
    files: Express.Multer.File[],
    dto: BulkUploadDocumentDto,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
    actorPermissions: string[] = [],
  ): Promise<BulkUploadResponse> {
    const isElevated = actorRoles.some((r) => (ELEVATED_ROLES as readonly string[]).includes(r));
    const hasCreatePerm = actorPermissions.includes('documents.create');

    if (dto.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(dto.workspaceId, actorId, actorRoles, actorDeptId);
      if (!isElevated && !hasCreatePerm) {
        const canCollab = await this.workspaces.canCollaborateInWorkspace(actorId, dto.workspaceId, actorRoles, actorDeptId);
        if (!canCollab) throw new ForbiddenException('Workspace collaboration permission required to upload documents');
      }
    } else if (!isElevated && !hasCreatePerm) {
      throw new ForbiddenException('documents.create permission required');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for bulk upload.');
    }

    const results: BulkUploadFileResult[] = [];
    const defaultStatus = dto.defaultStatus ?? 'DRAFT';
    const ownerId       = dto.ownerId ?? actorId;
    let successCount    = 0;
    let anyUnderReview  = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Derive a human-readable title from the file name (strip extension + clean up)
      const rawName  = file.originalname.replace(/\.[^/.]+$/, '');
      const title    = rawName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim() || file.originalname;
      const docNumber = dto.documentNumberPrefix
        ? `${dto.documentNumberPrefix}-${String(i + 1).padStart(3, '0')}`
        : undefined;

      try {
        const stored = await this.fileStorage.saveFile(file, 'documents');

        const result = await this.prisma.$transaction(async (tx) => {
          const newDoc = await tx.document.create({
            data: {
              title,
              documentNumber: docNumber ?? null,
              category:     dto.category    ?? 'GENERAL',
              status:       defaultStatus,
              departmentId: dto.departmentId ?? null,
              workspaceId:  dto.workspaceId  ?? null,
              taskId:       dto.taskId       ?? null,
              ownerId,
              createdById:  actorId,
              reviewDate:   dto.reviewDate ? new Date(dto.reviewDate) : null,
              expiryDate:   dto.expiryDate ? new Date(dto.expiryDate) : null,
            },
          });

          const newVersion = await tx.documentVersion.create({
            data: {
              documentId:       newDoc.id,
              versionNumber:    1,
              originalFileName: stored.originalFileName,
              storedFileName:   stored.storedFileName,
              storagePath:      stored.storagePath,
              mimeType:         stored.mimeType,
              fileSize:         stored.fileSize,
              checksum:         stored.checksum,
              uploadedById:     actorId,
            },
          });

          await tx.document.update({
            where: { id: newDoc.id },
            data:  { currentVersionId: newVersion.id },
          });

          return { docId: newDoc.id, versionId: newVersion.id };
        });

        void this.auditLog.log({
          actorId,
          action:     'UPLOADED',
          entityType: 'DOCUMENT',
          entityId:   result.docId,
          newValue:   { title, status: defaultStatus, versionId: result.versionId, source: 'BULK_UPLOAD' },
        });

        if (defaultStatus === 'UNDER_REVIEW') anyUnderReview = true;
        successCount++;

        results.push({
          originalFileName: file.originalname,
          success:          true,
          documentId:       result.docId,
          versionId:        result.versionId,
        });
      } catch (err: unknown) {
        results.push({
          originalFileName: file.originalname,
          success:          false,
          error:            err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    // Summary audit log for the entire bulk operation
    void this.auditLog.log({
      actorId,
      action:     'BULK_UPLOADED',
      entityType: 'DOCUMENT',
      entityId:   null,
      newValue: {
        totalFiles:   files.length,
        successCount,
        failCount:    files.length - successCount,
        defaultStatus,
      },
    });

    // Single summary notification to reviewers — only if at least one UNDER_REVIEW upload succeeded
    if (anyUnderReview) {
      const reviewers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          userRoles: {
            some: { role: { name: { in: ['ISO_MANAGER', 'QHSE_USER', 'DEPARTMENT_MANAGER'] } } },
          },
        },
        select: { id: true },
      });
      for (const reviewer of reviewers) {
        if (reviewer.id !== actorId) {
          void this.notifications.create({
            recipientId: reviewer.id,
            category:    'DOCUMENT_REVIEW_PENDING',
            title:       'Documents Submitted for Review',
            message:     `${successCount} document${successCount !== 1 ? 's' : ''} uploaded via bulk upload are pending review.`,
            entityType:  'DOCUMENT',
          });
        }
      }
    }

    return { results, successCount, failCount: files.length - successCount };
  }

  // ── Download current version ───────────────────────────────────────────────

  async downloadCurrentVersion(
    id: string,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[],
    actorDepartmentId: string | null,
    res: Response,
  ) {
    const doc = await this.findOne(id, actorId, actorRoles, actorDepartmentId);
    if (!doc.currentVersionId) throw new NotFoundException('Document has no current version.');

    await this.assertDocumentReadAccess(doc, actorId, actorPermissions, actorRoles, actorDepartmentId);

    const versionRecord = await this.prisma.documentVersion.findUnique({
      where: { id: doc.currentVersionId },
    });
    if (!versionRecord) throw new NotFoundException('Current version record not found.');

    await this.streamVersion(versionRecord, doc.id, actorId);
    this.pipeFile(versionRecord, res);
  }

  // ── Download specific version ──────────────────────────────────────────────

  async downloadVersion(
    id: string,
    versionId: string,
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[],
    actorDepartmentId: string | null,
    res: Response,
  ) {
    const doc = await this.findOne(id, actorId, actorRoles, actorDepartmentId);
    const versionSummary = doc.versions.find((v: { id: string }) => v.id === versionId);
    if (!versionSummary) throw new NotFoundException(`Version ${versionId} not found on document ${id}`);

    await this.assertDocumentReadAccess(doc, actorId, actorPermissions, actorRoles, actorDepartmentId);

    const versionRecord = await this.prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!versionRecord) throw new NotFoundException('Version record not found');

    await this.streamVersion(versionRecord, id, actorId);
    this.pipeFile(versionRecord, res);
  }

  // ── Private: access matrix for document read/download ─────────────────────

  /**
   * Enforces entity-level read access for document detail and download.
   *
   * Layer 1 — Global admin (users.manage / settings.manage): bypass all
   * Layer 2 — Elevated roles (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER): bypass all
   * Layer 3 — DEPARTMENT_MANAGER: their department + own documents
   * Layer 4 — DEPARTMENT_USER: APPROVED docs from their dept or no dept + own docs
   * Layer 5 — AUDITOR_VIEWER: APPROVED documents only
   * Layer 6 — STAFF: APPROVED documents only (no dept restriction if dept is null)
   */
  private async assertDocumentReadAccess(
    doc: { id: string; status: string; departmentId: string | null; ownerId: string; createdById: string },
    actorId: string,
    actorPermissions: string[],
    actorRoles: string[],
    actorDepartmentId: string | null,
  ): Promise<void> {
    // Layer 1: global admin
    if (actorPermissions.includes('users.manage') || actorPermissions.includes('settings.manage')) return;

    // Layer 2: elevated role
    if (actorRoles.some(r => (ELEVATED_ROLES as readonly string[]).includes(r))) return;

    // Layer 3: DEPARTMENT_MANAGER
    if (actorRoles.includes('DEPARTMENT_MANAGER')) {
      if (doc.departmentId && doc.departmentId === actorDepartmentId) return;
      if (doc.ownerId === actorId || doc.createdById === actorId) return;
      throw new ForbiddenException('You can only access documents belonging to your department.');
    }

    // Layer 4: DEPARTMENT_USER
    if (actorRoles.includes('DEPARTMENT_USER')) {
      if (doc.ownerId === actorId || doc.createdById === actorId) return;
      if (doc.status === 'APPROVED') {
        if (doc.departmentId === null || doc.departmentId === actorDepartmentId) return;
      }
      throw new ForbiddenException('You can only download approved documents or your own documents.');
    }

    // Layer 5: AUDITOR_VIEWER
    if (actorRoles.includes('AUDITOR_VIEWER')) {
      if (doc.status !== 'APPROVED') {
        throw new ForbiddenException('Auditor viewers can only download approved documents.');
      }
      return;
    }

    // Layer 6: STAFF
    if (actorRoles.includes('STAFF')) {
      if (doc.status !== 'APPROVED') {
        throw new ForbiddenException('You can only download approved documents.');
      }
      if (doc.departmentId !== null && doc.departmentId !== actorDepartmentId) {
        throw new ForbiddenException('You can only download approved documents from your department.');
      }
      return;
    }
  }

  // ── Private: status transition validation ─────────────────────────────────

  private validateStatusTransition(from: string, to: string): void {
    const allowed: Record<string, string[]> = {
      DRAFT:        ['UNDER_REVIEW'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
      APPROVED:     ['ARCHIVED'],
      REJECTED:     ['DRAFT', 'UNDER_REVIEW'],
      ARCHIVED:     [],
    };
    if (!(allowed[from] ?? []).includes(to)) {
      throw new BadRequestException(
        `Cannot change document status from ${from} to ${to}.`,
      );
    }
  }

  /**
   * Per-transition permission check (service-level enforcement).
   * Controller requires minimum documents.update; this adds stricter per-target checks.
   */
  private validateStatusPermission(newStatus: string, permissions: string[]): void {
    const isAdmin = permissions.includes('users.manage') || permissions.includes('settings.manage');
    if (isAdmin) return;

    if (['APPROVED', 'REJECTED'].includes(newStatus) && !permissions.includes('documents.approve')) {
      throw new ForbiddenException('You do not have permission to approve or reject documents.');
    }
    if (newStatus === 'ARCHIVED' && !permissions.includes('documents.archive')) {
      throw new ForbiddenException('You do not have permission to archive documents.');
    }
    // DRAFT and UNDER_REVIEW transitions are allowed for anyone with documents.update
    // (enforced at controller level)
  }

  // ── Private: file helpers ─────────────────────────────────────────────────

  private async streamVersion(
    versionRecord: { id: string; storagePath: string; versionNumber: number },
    documentId: string,
    actorId: string,
  ) {
    if (!fs.existsSync(versionRecord.storagePath)) {
      throw new NotFoundException('File not found on storage.');
    }
    void this.auditLog.log({
      actorId,
      action: 'DOWNLOADED',
      entityType: 'DOCUMENT',
      entityId: documentId,
      newValue: { versionId: versionRecord.id, versionNumber: versionRecord.versionNumber },
    });
  }

  private pipeFile(
    record: { originalFileName: string; mimeType: string; fileSize: number; storagePath: string },
    res: Response,
  ) {
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${record.originalFileName}"`);
    res.setHeader('Content-Length', record.fileSize);
    fs.createReadStream(record.storagePath).pipe(res);
  }
}
