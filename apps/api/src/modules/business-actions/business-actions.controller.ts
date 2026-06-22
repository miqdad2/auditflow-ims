import {
  Controller, Get, Post, Body, UseGuards, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PermissionsGuard, extractUserRoles } from '../../common/permissions.guard';
import { RequirePermissions } from '../../common/require-permissions.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { BusinessActionsService, ISSUE_STATUS_TRANSITIONS } from './business-actions.service';
import { AuditLogService } from '../audit-log/audit-log.service';

// Roles permitted to access the Business Action Center.
const BAC_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER', 'ISO_MANAGER', 'QHSE_USER'];

function assertBacAccess(roles: string[]): void {
  if (!roles.some((r) => BAC_ROLES.includes(r))) {
    throw new ForbiddenException('Business Action Center requires elevated access.');
  }
}

// Allowed audit actions from the frontend. Whitelist prevents arbitrary strings.
const ALLOWED_ACTIONS = new Set([
  'ALERT_REVIEWED',
  'ALERT_DISMISSED',
  'ALERT_NOT_APPLICABLE',
  'TASK_REASSIGNED',
  'TASK_STATUS_CHANGED',
  'DUE_DATE_CHANGED',
  'ISSUE_VERIFIED',
  'ISSUE_CLOSED',
  'ISSUE_REJECTED',
  'EXPIRY_METADATA_CHANGED',
  'RENEWAL_UPLOADED',
  'WORKSPACE_DEACTIVATED',
  'MEMBER_REMOVED',
  'REQUEST_UPDATE_SENT',
]);

@Controller('business-actions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BusinessActionsController {
  constructor(
    private svc: BusinessActionsService,
    private auditLog: AuditLogService,
  ) {}

  // GET /business-actions/items
  // Returns all currently detected action items. Pure read — no side effects.
  @Get('items')
  @RequirePermissions('project.read')
  async getItems(@CurrentUser() user: Record<string, unknown>) {
    assertBacAccess(extractUserRoles(user));
    return this.svc.detectItems();
  }

  // GET /business-actions/preview
  // Dry-run: same detection as above but returns counts + rule descriptions.
  // Creates no notifications, modifies no records.
  @Get('preview')
  @RequirePermissions('project.read')
  async getPreview(@CurrentUser() user: Record<string, unknown>) {
    assertBacAccess(extractUserRoles(user));
    return this.svc.getPreview();
  }

  // GET /business-actions/issue-transitions
  // Part 2: exposes the valid issue status transition map read-only.
  // Used by the frontend to show valid next steps without making any changes.
  // Same map that ncr-capa.service uses for mutation validation — consistent source of truth.
  @Get('issue-transitions')
  @RequirePermissions('project.read')
  async getIssueTransitions(@CurrentUser() user: Record<string, unknown>) {
    assertBacAccess(extractUserRoles(user));
    return { transitions: ISSUE_STATUS_TRANSITIONS };
  }

  // POST /business-actions/verify-entity
  // Part 8 concurrency check: verifies an entity's updatedAt has not changed since
  // the Super User last loaded the action item.
  @Post('verify-entity')
  @RequirePermissions('project.read')
  async verifyEntity(
    @CurrentUser() user: Record<string, unknown>,
    @Body() body: { entityType: string; entityId: string; expectedUpdatedAt: string },
  ) {
    assertBacAccess(extractUserRoles(user));
    if (!body.entityType || !body.entityId || !body.expectedUpdatedAt) {
      throw new BadRequestException('entityType, entityId, and expectedUpdatedAt are required.');
    }
    return this.svc.verifyEntityNotChanged(body.entityType, body.entityId, body.expectedUpdatedAt);
  }

  // POST /business-actions/log-action
  // Creates an audit log entry for a Super User action taken via the Action Center.
  // Only logs — never mutates business records directly (Part 9).
  @Post('log-action')
  @RequirePermissions('project.read')
  async logAction(
    @CurrentUser() user: Record<string, unknown>,
    @Body() body: {
      action: string;
      entityType: string;
      entityId: string;
      ruleKey: string;
      previousValue?: unknown;
      newValue?: unknown;
      note?: string;
    },
  ) {
    assertBacAccess(extractUserRoles(user));

    if (!ALLOWED_ACTIONS.has(body.action)) {
      throw new BadRequestException(`Unknown action type: ${body.action}`);
    }
    if (!body.entityType || !body.entityId || !body.ruleKey) {
      throw new BadRequestException('entityType, entityId, and ruleKey are required.');
    }

    await this.auditLog.log({
      actorId:       user.id as string,
      action:        `BUSINESS_ACTION:${body.action}`,
      entityType:    body.entityType,
      entityId:      body.entityId,
      previousValue: body.previousValue != null
        ? { value: body.previousValue, ruleKey: body.ruleKey }
        : undefined,
      newValue:      { ruleKey: body.ruleKey, note: body.note ?? null, newValue: body.newValue ?? null },
    });

    return { logged: true };
  }
}
