import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';
import { RejectEvidenceDto } from './dto/reject-evidence.dto';

// Roles that can review/approve evidence from any department
const REVIEWER_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER'];

const CHECKLIST_SELECT = {
  id: true, name: true, description: true, isoStandard: true,
  workspaceId: true, departmentId: true, createdById: true,
  createdAt: true, updatedAt: true,
  workspace:  { select: { id: true, name: true } },
  department: { select: { id: true, name: true, code: true } },
  createdBy:  { select: { id: true, fullName: true } },
  _count:     { select: { items: true } },
};

const ITEM_SELECT = {
  id: true, checklistId: true, departmentId: true,
  title: true, description: true, isoClause: true,
  responsibleUserId: true, reviewerId: true,
  dueDate: true, status: true, sortOrder: true,
  reviewedAt: true, rejectionReason: true,
  createdById: true, createdAt: true, updatedAt: true,
  department:       { select: { id: true, name: true, code: true } },
  responsibleUser:  { select: { id: true, fullName: true } },
  reviewer:         { select: { id: true, fullName: true } },
  createdBy:        { select: { id: true, fullName: true } },
  _count:           { select: { evidence: true } },
};

const EVIDENCE_SELECT = {
  id: true, checklistItemId: true, submittedById: true,
  status: true, notes: true, reviewerId: true,
  reviewedAt: true, rejectionReason: true,
  createdAt: true, updatedAt: true,
  submittedBy: { select: { id: true, fullName: true } },
  reviewer:    { select: { id: true, fullName: true } },
};

@Injectable()
export class AuditChecklistsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private realtime: RealtimeService,
    private workspaces: WorkspacesService,
  ) {}

  private async emitEvidenceUpdated(checklistId: string, checklistItemId: string, evidenceId: string, action: string) {
    try {
      const cl = await this.prisma.auditChecklist.findUnique({ where: { id: checklistId }, select: { workspaceId: true } });
      if (cl?.workspaceId) {
        this.realtime.emitToWorkspace(cl.workspaceId, 'evidence.updated', { checklistItemId, evidenceId, action });
      }
    } catch {
      // fire-and-forget; never block main workflow
    }
  }

  // ─── Checklists ─────────────────────────────────────────────────────────────

  async findAll(
    query: { departmentId?: string; workspaceId?: string; search?: string },
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    const where: Record<string, unknown> = {};
    if (query.departmentId) where['departmentId'] = query.departmentId;
    if (query.workspaceId)  where['workspaceId']  = query.workspaceId;
    if (query.search) {
      where['OR'] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { isoStandard: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (actorId && actorRoles) {
      const wsVis = this.workspaces.buildWorkspaceVisibilityWhere(actorId, actorRoles, actorDeptId ?? null);
      if (Object.keys(wsVis).length > 0) {
        const existing = { ...where };
        Object.keys(where).forEach((k) => delete where[k]);
        where['AND'] = [existing, wsVis];
      }
    }

    return this.prisma.auditChecklist.findMany({
      where,
      select: CHECKLIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    actorId?: string,
    actorRoles?: string[],
    actorDeptId?: string | null,
  ) {
    const checklist = await this.prisma.auditChecklist.findUnique({
      where: { id },
      select: CHECKLIST_SELECT,
    });
    if (!checklist) throw new NotFoundException('Checklist not found');
    if (actorId && actorRoles && checklist.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(
        checklist.workspaceId, actorId, actorRoles, actorDeptId ?? null,
      );
    }
    return checklist;
  }

  async create(
    dto: CreateChecklistDto,
    actorId: string,
    actorRoles: string[] = [],
    actorDeptId: string | null = null,
  ) {
    if (dto.workspaceId) {
      await this.workspaces.assertWorkspaceAccess(dto.workspaceId, actorId, actorRoles, actorDeptId);
    }
    const checklist = await this.prisma.auditChecklist.create({
      data: {
        name:         dto.name,
        description:  dto.description,
        isoStandard:  dto.isoStandard,
        workspaceId:  dto.workspaceId,
        departmentId: dto.departmentId,
        createdById:  actorId,
      },
      select: CHECKLIST_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action:     'CHECKLIST_CREATED',
      entityType: 'AUDIT_CHECKLIST',
      entityId:   checklist.id,
      newValue:   { name: checklist.name },
    });

    return checklist;
  }

  async update(id: string, dto: UpdateChecklistDto, actorId: string) {
    await this.findOne(id);
    const updated = await this.prisma.auditChecklist.update({
      where: { id },
      data: {
        ...(dto.name         !== undefined && { name: dto.name }),
        ...(dto.description  !== undefined && { description: dto.description }),
        ...(dto.isoStandard  !== undefined && { isoStandard: dto.isoStandard }),
        ...(dto.workspaceId  !== undefined && { workspaceId: dto.workspaceId }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
      },
      select: CHECKLIST_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action:     'CHECKLIST_UPDATED',
      entityType: 'AUDIT_CHECKLIST',
      entityId:   id,
      newValue:   { ...dto } as Record<string, unknown>,
    });

    return updated;
  }

  // ─── Readiness ───────────────────────────────────────────────────────────────

  async getReadiness(id: string) {
    await this.findOne(id);
    const [total, approved] = await Promise.all([
      this.prisma.auditChecklistItem.count({ where: { checklistId: id } }),
      this.prisma.auditChecklistItem.count({ where: { checklistId: id, status: 'APPROVED' } }),
    ]);
    const percentage = total === 0 ? 0 : Math.round((approved / total) * 100);
    return { checklistId: id, total, approved, percentage };
  }

  async getDepartmentReadiness(departmentId: string) {
    const [total, approved] = await Promise.all([
      this.prisma.auditChecklistItem.count({ where: { departmentId } }),
      this.prisma.auditChecklistItem.count({ where: { departmentId, status: 'APPROVED' } }),
    ]);
    const percentage = total === 0 ? 0 : Math.round((approved / total) * 100);
    return { departmentId, total, approved, percentage };
  }

  // ─── Checklist Items ─────────────────────────────────────────────────────────

  async getItems(checklistId: string) {
    await this.findOne(checklistId);
    return this.prisma.auditChecklistItem.findMany({
      where:   { checklistId },
      select:  ITEM_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createItem(checklistId: string, dto: CreateChecklistItemDto, actorId: string) {
    await this.findOne(checklistId);
    const item = await this.prisma.auditChecklistItem.create({
      data: {
        checklistId,
        title:             dto.title,
        description:       dto.description,
        isoClause:         dto.isoClause,
        responsibleUserId: dto.responsibleUserId,
        reviewerId:        dto.reviewerId,
        departmentId:      dto.departmentId,
        dueDate:           dto.dueDate ? new Date(dto.dueDate) : undefined,
        sortOrder:         dto.sortOrder ?? 0,
        createdById:       actorId,
      },
      select: ITEM_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action:     'CHECKLIST_ITEM_CREATED',
      entityType: 'AUDIT_CHECKLIST_ITEM',
      entityId:   item.id,
      newValue:   { title: item.title, checklistId },
    });

    // Notify responsible user
    if (dto.responsibleUserId && dto.responsibleUserId !== actorId) {
      void this.notifications.create({
        recipientId: dto.responsibleUserId,
        category:    'CHECKLIST_ASSIGNMENT',
        title:       'Checklist Item Assigned',
        message:     `You have been assigned a checklist item: "${item.title}"`,
        entityType:  'AUDIT_CHECKLIST_ITEM',
        entityId:    item.id,
      }).catch(() => {});
    }

    return item;
  }

  async updateItem(itemId: string, dto: UpdateChecklistItemDto, actorId: string) {
    const existing = await this.prisma.auditChecklistItem.findUnique({ where: { id: itemId } });
    if (!existing) throw new NotFoundException('Checklist item not found');

    const item = await this.prisma.auditChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.title             !== undefined && { title: dto.title }),
        ...(dto.description       !== undefined && { description: dto.description }),
        ...(dto.isoClause         !== undefined && { isoClause: dto.isoClause }),
        ...(dto.responsibleUserId !== undefined && { responsibleUserId: dto.responsibleUserId }),
        ...(dto.reviewerId        !== undefined && { reviewerId: dto.reviewerId }),
        ...(dto.departmentId      !== undefined && { departmentId: dto.departmentId }),
        ...(dto.dueDate           !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.sortOrder         !== undefined && { sortOrder: dto.sortOrder }),
      },
      select: ITEM_SELECT,
    });

    void this.auditLog.log({
      actorId,
      action:     'CHECKLIST_ITEM_UPDATED',
      entityType: 'AUDIT_CHECKLIST_ITEM',
      entityId:   itemId,
      newValue:   { ...dto } as Record<string, unknown>,
    });

    return item;
  }

  // ─── Evidence ─────────────────────────────────────────────────────────────

  /**
   * Evidence visibility rules (evaluated in order, first match determines the filter):
   *
   * - REVIEWER_ROLES or `checklist.review`   → all evidence (any status)
   * - `evidence.submit`                       → own submissions (any status) + APPROVED from others
   * - otherwise (AUDITOR_VIEWER, no submit)   → APPROVED only
   *
   * NOTE: `evidence.review` exists in the permission catalogue for future standalone
   * evidence modules. For checklist evidence the operative permission is `checklist.review`.
   * `evidence.submit` alone CANNOT approve or reject evidence — approve/reject endpoints
   * require `checklist.review` at the controller guard level.
   */
  async getEvidence(
    checklistItemId: string,
    actorId: string,
    actorRoles: string[],
    actorPermissions: string[],
  ) {
    const item = await this.prisma.auditChecklistItem.findUnique({ where: { id: checklistItemId } });
    if (!item) throw new NotFoundException('Checklist item not found');

    const canReviewAll =
      actorRoles.some((r) => REVIEWER_ROLES.includes(r)) ||
      actorPermissions.includes('checklist.review');

    if (canReviewAll) {
      return this.prisma.checklistEvidence.findMany({
        where:   { checklistItemId },
        select:  EVIDENCE_SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    const canSubmit = actorPermissions.includes('evidence.submit');

    if (canSubmit) {
      // Return own submissions (any status) and everyone else's APPROVED submissions
      return this.prisma.checklistEvidence.findMany({
        where: {
          checklistItemId,
          OR: [
            { submittedById: actorId },
            { status: 'APPROVED' },
          ],
        },
        select:  EVIDENCE_SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    // AUDITOR_VIEWER and other read-only roles: APPROVED only
    return this.prisma.checklistEvidence.findMany({
      where:   { checklistItemId, status: 'APPROVED' },
      select:  EVIDENCE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Submit restriction rules:
   *
   * - REVIEWER_ROLES or `checklist.create`/`checklist.update`  → may submit for any item
   * - Actor is the item's `responsibleUserId`                   → allowed
   * - Actor's `departmentId` matches item's `departmentId`      → allowed (dept users submitting
   *   evidence for their own department's items)
   * - Otherwise                                                 → ForbiddenException
   *
   * This prevents STAFF with `evidence.submit` from submitting evidence for items they are
   * unrelated to (not responsible user, wrong department).
   */
  async submitEvidence(
    checklistItemId: string,
    dto: SubmitEvidenceDto,
    actorId: string,
    actorRoles: string[],
    actorPermissions: string[],
    actorDepartmentId: string | null,
  ) {
    const item = await this.prisma.auditChecklistItem.findUnique({ where: { id: checklistItemId } });
    if (!item) throw new NotFoundException('Checklist item not found');

    // Elevated roles bypass submission restriction
    const isElevated =
      actorRoles.some((r) => REVIEWER_ROLES.includes(r)) ||
      actorPermissions.includes('checklist.create') ||
      actorPermissions.includes('checklist.update');

    if (!isElevated) {
      const isResponsible = item.responsibleUserId === actorId;
      const isDeptMatch   = item.departmentId !== null && item.departmentId === actorDepartmentId;

      if (!isResponsible && !isDeptMatch) {
        throw new ForbiddenException(
          'You are not responsible for this checklist item or do not belong to its department',
        );
      }
    }

    const evidence = await this.prisma.checklistEvidence.create({
      data: {
        checklistItemId,
        submittedById: actorId,
        status:        'SUBMITTED',
        notes:         dto.notes,
      },
      select: EVIDENCE_SELECT,
    });

    // Move item to SUBMITTED if it was MISSING or REJECTED
    if (item.status === 'MISSING' || item.status === 'REJECTED') {
      await this.prisma.auditChecklistItem.update({
        where: { id: checklistItemId },
        data:  { status: 'SUBMITTED' },
      });
    }

    void this.auditLog.log({
      actorId,
      action:     'EVIDENCE_SUBMITTED',
      entityType: 'CHECKLIST_EVIDENCE',
      entityId:   evidence.id,
      newValue:   { checklistItemId },
    });

    // Notify reviewer if assigned
    if (item.reviewerId && item.reviewerId !== actorId) {
      void this.notifications.create({
        recipientId: item.reviewerId,
        category:    'EVIDENCE_SUBMITTED',
        title:       'Evidence Submitted for Review',
        message:     `Evidence has been submitted for checklist item: "${item.title}"`,
        entityType:  'CHECKLIST_EVIDENCE',
        entityId:    evidence.id,
      }).catch(() => {});
    }

    void this.emitEvidenceUpdated(item.checklistId, checklistItemId, evidence.id, 'submitted');
    return evidence;
  }

  async approveEvidence(
    evidenceId: string,
    actorId: string,
    actorRoles: string[],
    actorPermissions: string[],
  ) {
    const evidence = await this.prisma.checklistEvidence.findUnique({
      where:   { id: evidenceId },
      include: { checklistItem: true },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');

    const canReview =
      actorRoles.some((r) => REVIEWER_ROLES.includes(r)) ||
      actorPermissions.includes('checklist.review') ||
      evidence.checklistItem.reviewerId === actorId;

    if (!canReview) throw new ForbiddenException('You do not have permission to review evidence');
    if (evidence.status !== 'SUBMITTED') {
      throw new ForbiddenException('Only SUBMITTED evidence can be approved');
    }

    const updated = await this.prisma.checklistEvidence.update({
      where: { id: evidenceId },
      data: {
        status:         'APPROVED',
        reviewerId:     actorId,
        reviewedAt:     new Date(),
        rejectionReason: null,
      },
      select: EVIDENCE_SELECT,
    });

    // Set item status to APPROVED
    await this.prisma.auditChecklistItem.update({
      where: { id: evidence.checklistItemId },
      data:  { status: 'APPROVED', reviewedAt: new Date(), rejectionReason: null },
    });

    void this.auditLog.log({
      actorId,
      action:        'EVIDENCE_APPROVED',
      entityType:    'CHECKLIST_EVIDENCE',
      entityId:      evidenceId,
      previousValue: { status: evidence.status },
      newValue:      { status: 'APPROVED' },
    });

    // Notify submitter
    void this.notifications.create({
      recipientId: evidence.submittedById,
      category:    'EVIDENCE_APPROVED',
      title:       'Evidence Approved',
      message:     `Your evidence for "${evidence.checklistItem.title}" has been approved.`,
      entityType:  'CHECKLIST_EVIDENCE',
      entityId:    evidenceId,
    }).catch(() => {});

    void this.emitEvidenceUpdated(evidence.checklistItem.checklistId, evidence.checklistItemId, evidenceId, 'approved');
    return updated;
  }

  async rejectEvidence(
    evidenceId: string,
    dto: RejectEvidenceDto,
    actorId: string,
    actorRoles: string[],
    actorPermissions: string[],
  ) {
    const evidence = await this.prisma.checklistEvidence.findUnique({
      where:   { id: evidenceId },
      include: { checklistItem: true },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');

    const canReview =
      actorRoles.some((r) => REVIEWER_ROLES.includes(r)) ||
      actorPermissions.includes('checklist.review') ||
      evidence.checklistItem.reviewerId === actorId;

    if (!canReview) throw new ForbiddenException('You do not have permission to review evidence');
    if (evidence.status !== 'SUBMITTED') {
      throw new ForbiddenException('Only SUBMITTED evidence can be rejected');
    }

    const updated = await this.prisma.checklistEvidence.update({
      where: { id: evidenceId },
      data: {
        status:          'REJECTED',
        reviewerId:      actorId,
        reviewedAt:      new Date(),
        rejectionReason: dto.rejectionReason,
      },
      select: EVIDENCE_SELECT,
    });

    // Move item back to REJECTED so resubmission is possible
    await this.prisma.auditChecklistItem.update({
      where: { id: evidence.checklistItemId },
      data:  {
        status:          'REJECTED',
        reviewedAt:      new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    void this.auditLog.log({
      actorId,
      action:        'EVIDENCE_REJECTED',
      entityType:    'CHECKLIST_EVIDENCE',
      entityId:      evidenceId,
      previousValue: { status: evidence.status },
      newValue:      { status: 'REJECTED', rejectionReason: dto.rejectionReason },
    });

    // Notify submitter
    void this.notifications.create({
      recipientId: evidence.submittedById,
      category:    'EVIDENCE_REJECTED',
      title:       'Evidence Rejected',
      message:     `Your evidence for "${evidence.checklistItem.title}" was rejected: ${dto.rejectionReason}`,
      entityType:  'CHECKLIST_EVIDENCE',
      entityId:    evidenceId,
    }).catch(() => {});

    void this.emitEvidenceUpdated(evidence.checklistItem.checklistId, evidence.checklistItemId, evidenceId, 'rejected');
    return updated;
  }
}
