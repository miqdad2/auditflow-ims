import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ─── Kuwait timezone constant ────────────────────────────────────────────────
// Kuwait is UTC+3, no DST. Constant avoids Intl runtime dependency on server.
const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;

// ─── Detection rule types ─────────────────────────────────────────────────────

export type DetectionRule =
  | 'OVERDUE_TASK'
  | 'UNASSIGNED_TASK'
  | 'DOCUMENT_UNDER_REVIEW'
  | 'EXPIRED_FILE'
  | 'EXPIRING_FILE'
  | 'OPEN_ISSUE'
  | 'OVERDUE_ISSUE'
  | 'ISSUE_WAITING_VERIFICATION'
  | 'WORKSPACE_WITHOUT_MEMBERS';

export const ALL_RULES: DetectionRule[] = [
  'OVERDUE_TASK',
  'UNASSIGNED_TASK',
  'DOCUMENT_UNDER_REVIEW',
  'EXPIRED_FILE',
  'EXPIRING_FILE',
  'OPEN_ISSUE',
  'OVERDUE_ISSUE',
  'ISSUE_WAITING_VERIFICATION',
  'WORKSPACE_WITHOUT_MEMBERS',
];

export const RULE_DESCRIPTIONS: Record<DetectionRule, string> = {
  OVERDUE_TASK:               'task.dueDate is before end-of-day Kuwait time AND task.status is not COMPLETED, CANCELLED.',
  UNASSIGNED_TASK:            'task.assigneeId is null AND task.status is not COMPLETED, CANCELLED.',
  DOCUMENT_UNDER_REVIEW:      'document.status is exactly UNDER_REVIEW.',
  EXPIRED_FILE:               'attachment.expiryDate is before end-of-day Kuwait time AND attachment.isSuperseded is false.',
  EXPIRING_FILE:              'attachment.expiryDate is in the future AND within attachment.reminderDays window (default 30) AND isSuperseded is false.',
  OPEN_ISSUE:                 'issue.status is OPEN or IN_PROGRESS.',
  OVERDUE_ISSUE:              'issue.dueDate is before end-of-day Kuwait time AND status is not VERIFIED, CLOSED, CANCELLED, or REJECTED.',
  ISSUE_WAITING_VERIFICATION: 'issue.status is exactly SUBMITTED.',
  WORKSPACE_WITHOUT_MEMBERS:  'workspace.status is ACTIVE AND workspace has zero WorkspaceMember records.',
};

// ─── Issue status transitions ─────────────────────────────────────────────────
// Mirrors STATUS_TRANSITIONS in ncr-capa.service.ts.
// Single authoritative reference for the BAC to show valid next steps.
// The ncr-capa service enforces these at mutation time; the BAC surfaces them
// read-only so the Super User knows what action to take on the Issues page.

export const ISSUE_STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN:             ['IN_PROGRESS', 'OVERDUE'],
  IN_PROGRESS:      ['WAITING_EVIDENCE', 'OVERDUE'],
  WAITING_EVIDENCE: ['SUBMITTED'],
  SUBMITTED:        ['VERIFIED', 'REJECTED'],
  VERIFIED:         ['CLOSED'],
  REJECTED:         ['IN_PROGRESS'],
  OVERDUE:          ['IN_PROGRESS', 'CLOSED'],
  CLOSED:           [],
};

// ─── Overlap / precedence policy (Part 10) ────────────────────────────────────
// When the same entity matches multiple rules, keep one primary row and surface
// the remaining conditions as secondaryRules badges.
// Order matters: index 0 = highest priority.

type EntityType = 'TASK' | 'DOCUMENT' | 'FILE_ATTACHMENT' | 'ISSUE' | 'WORKSPACE';

const RULE_PRECEDENCE: Partial<Record<EntityType, DetectionRule[]>> = {
  TASK:            ['OVERDUE_TASK', 'UNASSIGNED_TASK'],
  ISSUE:           ['OVERDUE_ISSUE', 'ISSUE_WAITING_VERIFICATION', 'OPEN_ISSUE'],
  FILE_ATTACHMENT: ['EXPIRED_FILE', 'EXPIRING_FILE'],
};

// ─── ActionItem ───────────────────────────────────────────────────────────────

export interface ActionItem {
  id: string;                         // stable compound key: `${ruleKey}:${entityId}`
  ruleKey: DetectionRule;
  entityType: EntityType;
  entityId: string;
  title: string;
  workspaceName: string | null;
  workspaceId: string | null;
  department: string | null;
  responsibleUser: string | null;
  responsibleUserId: string | null;
  reason: string;                     // human-readable explanation (Part 6: explanation)
  detectedAt: string;                 // ISO timestamp of detection (Part 6: generatedAt)
  detectionField: string;             // which DB field triggered detection
  detectionValue: string;             // the field's value at detection time
  label: 'SYSTEM_DETECTED';
  dueDate: string | null;
  expiryDate: string | null;
  updatedAt: string | null;
  // Part 6: structured detection evidence
  sourceFacts: Record<string, unknown>;
  // Part 10: lower-priority rules that also matched this same entity
  secondaryRules?: DetectionRule[];
  // Part 2: for ISSUE entities, the valid next status transitions from current status
  validTransitions?: string[];
}

export interface ActionPreview {
  detectedAt: string;
  dryRun: true;
  totalItems: number;
  counts: Record<DetectionRule, number>;
  rules: Array<{ key: DetectionRule; description: string; count: number }>;
  items: ActionItem[];
}

// ─── Timezone helpers ─────────────────────────────────────────────────────────

/**
 * Returns the UTC instant that corresponds to 23:59:59.999 on the same
 * Kuwait calendar day as `d`.
 *
 * A task due on "21 June 2026" (date-only field stored as midnight UTC) is NOT
 * overdue until this moment has passed. This prevents false positives for tasks
 * assigned with a Kuwait business-day deadline.
 */
export function endOfDayKuwait(d: Date): Date {
  const shifted = new Date(d.getTime() + KUWAIT_OFFSET_MS);
  shifted.setUTCHours(23, 59, 59, 999);
  return new Date(shifted.getTime() - KUWAIT_OFFSET_MS);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kuwait',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function toLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BusinessActionsService {
  private readonly logger = new Logger(BusinessActionsService.name);

  constructor(private prisma: PrismaService) {}

  async detectItems(): Promise<ActionItem[]> {
    const now = new Date();
    const eod = endOfDayKuwait(now);
    const detectedAt = now.toISOString();
    const raw: ActionItem[] = [];

    // Run all 9 detections in parallel.
    // Each catch block prevents one broken rule from crashing the entire center.
    await Promise.all([
      this.detectOverdueTasks(eod, detectedAt, raw),
      this.detectUnassignedTasks(detectedAt, raw),
      this.detectDocumentsUnderReview(detectedAt, raw),
      this.detectExpiredFiles(eod, detectedAt, raw),
      this.detectExpiringFiles(now, eod, detectedAt, raw),
      this.detectOpenIssues(detectedAt, raw),
      this.detectOverdueIssues(eod, detectedAt, raw),
      this.detectIssuesWaitingVerification(detectedAt, raw),
      this.detectWorkspacesWithoutMembers(detectedAt, raw),
    ]);

    // Part 10: merge overlapping rules per entity into one primary row
    return this.applyPrecedence(raw);
  }

  async getPreview(): Promise<ActionPreview> {
    const now = new Date();
    const items = await this.detectItems();
    const counts = {} as Record<DetectionRule, number>;
    const rules: Array<{ key: DetectionRule; description: string; count: number }> = [];

    for (const rule of ALL_RULES) {
      const count = items.filter((i) => i.ruleKey === rule).length;
      counts[rule] = count;
      rules.push({ key: rule, description: RULE_DESCRIPTIONS[rule], count });
    }

    return {
      detectedAt: now.toISOString(),
      dryRun: true,
      totalItems: items.length,
      counts,
      rules,
      items,
    };
  }

  // ─── Part 10: Precedence / deduplication ─────────────────────────────────
  // Groups all raw items by entityId. For entities that matched multiple rules,
  // keeps the highest-priority rule as the primary row and attaches the others
  // as secondaryRules badges. Entities matched by only one rule are returned
  // unchanged.

  applyPrecedence(items: ActionItem[]): ActionItem[] {
    const byEntity = new Map<string, ActionItem[]>();
    for (const item of items) {
      if (!byEntity.has(item.entityId)) byEntity.set(item.entityId, []);
      byEntity.get(item.entityId)!.push(item);
    }

    const result: ActionItem[] = [];
    for (const entityItems of byEntity.values()) {
      if (entityItems.length === 1) {
        result.push(entityItems[0]);
        continue;
      }

      const priorityList = RULE_PRECEDENCE[entityItems[0].entityType] ?? [];
      const sorted = [...entityItems].sort((a, b) => {
        const ai = priorityList.indexOf(a.ruleKey);
        const bi = priorityList.indexOf(b.ruleKey);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

      const primary = { ...sorted[0] };
      primary.secondaryRules = sorted.slice(1).map((i) => i.ruleKey);
      result.push(primary);
    }

    // Restore predictable ordering (by rule priority in ALL_RULES)
    return result.sort((a, b) => ALL_RULES.indexOf(a.ruleKey) - ALL_RULES.indexOf(b.ruleKey));
  }

  // ─── Concurrency check (Part 8) ───────────────────────────────────────────
  // Before logging any Super User action, the frontend sends the entity's
  // updatedAt that was shown when the item was loaded. This verifies the record
  // has not changed since the center was last refreshed.

  async verifyEntityNotChanged(
    entityType: string,
    entityId: string,
    expectedUpdatedAt: string,
  ): Promise<{ changed: boolean; currentUpdatedAt: string | null; message?: string }> {
    try {
      let record: { updatedAt: Date } | null = null;

      if (entityType === 'TASK') {
        record = await this.prisma.task.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      } else if (entityType === 'DOCUMENT') {
        record = await this.prisma.document.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      } else if (entityType === 'ISSUE') {
        record = await this.prisma.ncrCapa.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      } else if (entityType === 'WORKSPACE') {
        record = await this.prisma.workspace.findUnique({ where: { id: entityId }, select: { updatedAt: true } });
      } else if (entityType === 'FILE_ATTACHMENT') {
        // FILE_ATTACHMENT uses createdAt as the updatedAt proxy (no updatedAt field)
        return { changed: false, currentUpdatedAt: null };
      }

      if (!record) {
        return { changed: true, currentUpdatedAt: null, message: 'Record not found. It may have been deleted.' };
      }

      const currentUpdatedAt = record.updatedAt.toISOString();
      const changed = currentUpdatedAt !== expectedUpdatedAt;

      return {
        changed,
        currentUpdatedAt,
        message: changed
          ? 'This record was updated by another user. Refresh before continuing.'
          : undefined,
      };
    } catch (err) {
      this.logger.error('verifyEntityNotChanged failed', err);
      return { changed: true, currentUpdatedAt: null, message: 'Could not verify record state. Please refresh.' };
    }
  }

  // ─── Detection: OVERDUE_TASK ──────────────────────────────────────────────
  // Rule: task.dueDate < end-of-day Kuwait AND status NOT IN [COMPLETED, CANCELLED]
  // WAITING_REVIEW tasks are included — they are still active and may be overdue.
  // Null dueDate → never flagged (no guessing).

  private async detectOverdueTasks(eod: Date, detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: {
          parentTaskId: null,
          isReference:  false,   // Reference items never produce operational overdue alerts
          dueDate: { not: null, lt: eod },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        select: {
          id: true, title: true, status: true, dueDate: true, updatedAt: true,
          workspace: {
            select: { id: true, name: true, department: { select: { name: true } } },
          },
          assignee: { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { dueDate: 'asc' },
      });

      for (const t of tasks) {
        if (!t.dueDate) continue;
        out.push({
          id:              `OVERDUE_TASK:${t.id}`,
          ruleKey:         'OVERDUE_TASK',
          entityType:      'TASK',
          entityId:        t.id,
          title:           t.title,
          workspaceName:   t.workspace?.name ?? null,
          workspaceId:     t.workspace?.id ?? null,
          department:      t.workspace?.department?.name ?? null,
          responsibleUser: t.assignee?.fullName ?? null,
          responsibleUserId: t.assignee?.id ?? null,
          reason:          `Due date has passed and task is not completed. Due ${fmtDate(t.dueDate)}, status is ${toLabel(t.status)}.`,
          detectedAt,
          detectionField:  'dueDate',
          detectionValue:  t.dueDate.toISOString(),
          label:           'SYSTEM_DETECTED',
          dueDate:         t.dueDate.toISOString(),
          expiryDate:      null,
          updatedAt:       t.updatedAt.toISOString(),
          sourceFacts: {
            dueDate:       t.dueDate.toISOString(),
            currentStatus: t.status,
            evaluatedAt:   detectedAt,
            timezone:      'Asia/Kuwait (UTC+3)',
            rule:          'dueDate < endOfDayKuwait(now) AND status NOT IN [COMPLETED, CANCELLED]',
          },
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectOverdueTasks failed — rule skipped', err);
      void this.logSystemError('detectOverdueTasks', err);
    }
  }

  // ─── Detection: UNASSIGNED_TASK ───────────────────────────────────────────
  // Rule: task.assigneeId is null AND status NOT IN [COMPLETED, CANCELLED]
  // WAITING_REVIEW tasks included — no assignee at review stage is still actionable.

  private async detectUnassignedTasks(detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: {
          parentTaskId: null,
          isReference:  false,   // Reference items do not require an assignee
          assigneeId:   null,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        select: {
          id: true, title: true, status: true, dueDate: true, updatedAt: true,
          workspace: {
            select: { id: true, name: true, department: { select: { name: true } } },
          },
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      for (const t of tasks) {
        out.push({
          id:              `UNASSIGNED_TASK:${t.id}`,
          ruleKey:         'UNASSIGNED_TASK',
          entityType:      'TASK',
          entityId:        t.id,
          title:           t.title,
          workspaceName:   t.workspace?.name ?? null,
          workspaceId:     t.workspace?.id ?? null,
          department:      t.workspace?.department?.name ?? null,
          responsibleUser: null,
          responsibleUserId: null,
          reason:          'No responsible user is assigned to this task.',
          detectedAt,
          detectionField:  'assigneeId',
          detectionValue:  'null',
          label:           'SYSTEM_DETECTED',
          dueDate:         t.dueDate?.toISOString() ?? null,
          expiryDate:      null,
          updatedAt:       t.updatedAt.toISOString(),
          sourceFacts: {
            assigneeId:    null,
            currentStatus: t.status,
            evaluatedAt:   detectedAt,
            rule:          'assigneeId IS NULL AND status NOT IN [COMPLETED, CANCELLED]',
          },
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectUnassignedTasks failed — rule skipped', err);
      void this.logSystemError('detectUnassignedTasks', err);
    }
  }

  // ─── Detection: DOCUMENT_UNDER_REVIEW ────────────────────────────────────
  // Rule: document.status === 'UNDER_REVIEW' (exact match, no inference)

  private async detectDocumentsUnderReview(detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const docs = await this.prisma.document.findMany({
        where: { status: 'UNDER_REVIEW' },
        select: {
          id: true, title: true, updatedAt: true,
          workspace: {
            select: { id: true, name: true, department: { select: { name: true } } },
          },
          department: { select: { name: true } },
          owner: { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { updatedAt: 'asc' },
      });

      for (const d of docs) {
        out.push({
          id:              `DOCUMENT_UNDER_REVIEW:${d.id}`,
          ruleKey:         'DOCUMENT_UNDER_REVIEW',
          entityType:      'DOCUMENT',
          entityId:        d.id,
          title:           d.title,
          workspaceName:   d.workspace?.name ?? null,
          workspaceId:     d.workspace?.id ?? null,
          department:      d.department?.name ?? d.workspace?.department?.name ?? null,
          responsibleUser: d.owner?.fullName ?? null,
          responsibleUserId: d.owner?.id ?? null,
          reason:          `File expiry date has passed and no renewal has superseded it. Document is awaiting approval or rejection.`,
          detectedAt,
          detectionField:  'status',
          detectionValue:  'UNDER_REVIEW',
          label:           'SYSTEM_DETECTED',
          dueDate:         null,
          expiryDate:      null,
          updatedAt:       d.updatedAt.toISOString(),
          sourceFacts: {
            status:        'UNDER_REVIEW',
            lastUpdated:   d.updatedAt.toISOString(),
            evaluatedAt:   detectedAt,
            rule:          'status = UNDER_REVIEW',
          },
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectDocumentsUnderReview failed — rule skipped', err);
      void this.logSystemError('detectDocumentsUnderReview', err);
    }
  }

  // ─── Detection: EXPIRED_FILE ──────────────────────────────────────────────
  // Rule: expiryDate < end-of-day Kuwait AND isSuperseded = false AND entityType = TASK
  // Null expiryDate → never flagged. isSuperseded=true → renewal active, excluded.

  private async detectExpiredFiles(eod: Date, detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const files = await this.prisma.fileAttachment.findMany({
        where: {
          entityType: 'TASK',
          isSuperseded: false,
          expiryDate: { not: null, lt: eod },
        },
        select: {
          id: true, displayName: true, originalFileName: true,
          expiryDate: true, createdAt: true, entityId: true,
          uploadedBy: { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { expiryDate: 'asc' },
      });

      if (files.length === 0) return;

      const taskIds = [...new Set(files.map((f) => f.entityId))];
      const tasks = await this.prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: {
          id: true, title: true, updatedAt: true,
          workspace: { select: { id: true, name: true, department: { select: { name: true } } } },
          assignee: { select: { id: true, fullName: true } },
        },
      }).catch(() => [] as typeof tasks);

      const taskMap = Object.fromEntries(
        (tasks as Array<{
          id: string; title: string; updatedAt: Date;
          workspace: { id: string; name: string; department: { name: string } | null } | null;
          assignee: { id: string; fullName: string } | null;
        }>).map((t) => [t.id, t]),
      );

      for (const f of files) {
        if (!f.expiryDate) continue;
        const task = taskMap[f.entityId];
        const name = f.displayName ?? f.originalFileName;

        out.push({
          id:              `EXPIRED_FILE:${f.id}`,
          ruleKey:         'EXPIRED_FILE',
          entityType:      'FILE_ATTACHMENT',
          entityId:        f.id,
          title:           name,
          workspaceName:   task?.workspace?.name ?? null,
          workspaceId:     task?.workspace?.id ?? null,
          department:      task?.workspace?.department?.name ?? null,
          responsibleUser: task?.assignee?.fullName ?? f.uploadedBy.fullName,
          responsibleUserId: task?.assignee?.id ?? f.uploadedBy.id,
          reason:          `File expiry date has passed and no renewal has superseded it. Expired on ${fmtDate(f.expiryDate)}. Task: ${task?.title ?? 'Unknown'}.`,
          detectedAt,
          detectionField:  'expiryDate',
          detectionValue:  f.expiryDate.toISOString(),
          label:           'SYSTEM_DETECTED',
          dueDate:         null,
          expiryDate:      f.expiryDate.toISOString(),
          updatedAt:       f.createdAt.toISOString(),
          sourceFacts: {
            expiryDate:    f.expiryDate.toISOString(),
            isSuperseded:  false,
            taskTitle:     task?.title ?? null,
            evaluatedAt:   detectedAt,
            timezone:      'Asia/Kuwait (UTC+3)',
            rule:          'expiryDate < endOfDayKuwait(now) AND isSuperseded = false',
          },
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectExpiredFiles failed — rule skipped', err);
      void this.logSystemError('detectExpiredFiles', err);
    }
  }

  // ─── Detection: EXPIRING_FILE ─────────────────────────────────────────────
  // Rule: expiryDate >= eod (not yet expired) AND expiryDate <= eod + reminderDays
  //       AND isSuperseded = false AND entityType = TASK
  // Uses per-file reminderDays (default 30 if null). Queries with 90-day ceiling.
  // Naturally exclusive with EXPIRED_FILE (different date range sides).

  private async detectExpiringFiles(now: Date, eod: Date, detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const maxWindow = new Date(eod.getTime() + 90 * 24 * 60 * 60 * 1000);

      const files = await this.prisma.fileAttachment.findMany({
        where: {
          entityType: 'TASK',
          isSuperseded: false,
          expiryDate: { gte: eod, lte: maxWindow },
        },
        select: {
          id: true, displayName: true, originalFileName: true,
          expiryDate: true, reminderDays: true, createdAt: true, entityId: true,
          uploadedBy: { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { expiryDate: 'asc' },
      });

      if (files.length === 0) return;

      const taskIds = [...new Set(files.map((f) => f.entityId))];
      const tasks = await this.prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: {
          id: true, title: true, updatedAt: true,
          workspace: { select: { id: true, name: true, department: { select: { name: true } } } },
          assignee: { select: { id: true, fullName: true } },
        },
      }).catch(() => [] as typeof tasks);

      const taskMap = Object.fromEntries(
        (tasks as Array<{
          id: string; title: string; updatedAt: Date;
          workspace: { id: string; name: string; department: { name: string } | null } | null;
          assignee: { id: string; fullName: string } | null;
        }>).map((t) => [t.id, t]),
      );

      for (const f of files) {
        if (!f.expiryDate) continue;
        const reminderDays = f.reminderDays ?? 30;
        const cutoff = new Date(eod.getTime() + reminderDays * 24 * 60 * 60 * 1000);
        if (f.expiryDate > cutoff) continue; // outside this file's individual reminder window

        const task = taskMap[f.entityId];
        const daysLeft = Math.ceil((f.expiryDate.getTime() - now.getTime()) / 86400000);
        const name = f.displayName ?? f.originalFileName;

        out.push({
          id:              `EXPIRING_FILE:${f.id}`,
          ruleKey:         'EXPIRING_FILE',
          entityType:      'FILE_ATTACHMENT',
          entityId:        f.id,
          title:           name,
          workspaceName:   task?.workspace?.name ?? null,
          workspaceId:     task?.workspace?.id ?? null,
          department:      task?.workspace?.department?.name ?? null,
          responsibleUser: task?.assignee?.fullName ?? f.uploadedBy.fullName,
          responsibleUserId: task?.assignee?.id ?? f.uploadedBy.id,
          reason:          `Expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'} on ${fmtDate(f.expiryDate)}. Within ${reminderDays}-day reminder window.`,
          detectedAt,
          detectionField:  'expiryDate',
          detectionValue:  f.expiryDate.toISOString(),
          label:           'SYSTEM_DETECTED',
          dueDate:         null,
          expiryDate:      f.expiryDate.toISOString(),
          updatedAt:       f.createdAt.toISOString(),
          sourceFacts: {
            expiryDate:    f.expiryDate.toISOString(),
            reminderDays,
            daysUntilExpiry: daysLeft,
            isSuperseded:  false,
            taskTitle:     task?.title ?? null,
            evaluatedAt:   detectedAt,
            timezone:      'Asia/Kuwait (UTC+3)',
            rule:          `expiryDate >= eod AND expiryDate <= eod + ${reminderDays}d AND isSuperseded = false`,
          },
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectExpiringFiles failed — rule skipped', err);
      void this.logSystemError('detectExpiringFiles', err);
    }
  }

  // ─── Detection: OPEN_ISSUE ────────────────────────────────────────────────
  // Rule: issue.status IN ['OPEN', 'IN_PROGRESS', 'WAITING_EVIDENCE']
  // Includes WAITING_EVIDENCE (evidence not yet submitted — still an open action).

  private async detectOpenIssues(detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const issues = await this.prisma.ncrCapa.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_EVIDENCE'] } },
        select: {
          id: true, title: true, ncrNumber: true, status: true, dueDate: true, updatedAt: true,
          workspace: { select: { id: true, name: true, department: { select: { name: true } } } },
          department: { select: { name: true } },
          assignedTo: { select: { id: true, fullName: true } },
          raisedBy:   { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      for (const issue of issues) {
        const ref            = issue.ncrNumber ?? `#${issue.id.slice(-6)}`;
        const statusLabel    = toLabel(issue.status);
        const transitions    = ISSUE_STATUS_TRANSITIONS[issue.status] ?? [];

        out.push({
          id:              `OPEN_ISSUE:${issue.id}`,
          ruleKey:         'OPEN_ISSUE',
          entityType:      'ISSUE',
          entityId:        issue.id,
          title:           `${ref} — ${issue.title}`,
          workspaceName:   issue.workspace?.name ?? null,
          workspaceId:     issue.workspace?.id ?? null,
          department:      issue.department?.name ?? issue.workspace?.department?.name ?? null,
          responsibleUser: issue.assignedTo?.fullName ?? issue.raisedBy.fullName,
          responsibleUserId: issue.assignedTo?.id ?? issue.raisedBy.id,
          reason:          `Issue status is ${statusLabel}. Issue has not yet been submitted for verification.`,
          detectedAt,
          detectionField:  'status',
          detectionValue:  issue.status,
          label:           'SYSTEM_DETECTED',
          dueDate:         issue.dueDate?.toISOString() ?? null,
          expiryDate:      null,
          updatedAt:       issue.updatedAt.toISOString(),
          sourceFacts: {
            status:            issue.status,
            validTransitions:  transitions,
            evaluatedAt:       detectedAt,
            rule:              'status IN [OPEN, IN_PROGRESS, WAITING_EVIDENCE]',
          },
          validTransitions: transitions,
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectOpenIssues failed — rule skipped', err);
      void this.logSystemError('detectOpenIssues', err);
    }
  }

  // ─── Detection: OVERDUE_ISSUE ─────────────────────────────────────────────
  // Rule: dueDate < end-of-day Kuwait AND status NOT IN [VERIFIED, CLOSED, CANCELLED, REJECTED]
  // Null dueDate → never flagged.

  private async detectOverdueIssues(eod: Date, detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const issues = await this.prisma.ncrCapa.findMany({
        where: {
          dueDate: { not: null, lt: eod },
          status: { notIn: ['VERIFIED', 'CLOSED', 'CANCELLED', 'REJECTED'] },
        },
        select: {
          id: true, title: true, ncrNumber: true, status: true, dueDate: true, updatedAt: true,
          workspace: { select: { id: true, name: true, department: { select: { name: true } } } },
          department: { select: { name: true } },
          assignedTo: { select: { id: true, fullName: true } },
          raisedBy:   { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { dueDate: 'asc' },
      });

      for (const issue of issues) {
        if (!issue.dueDate) continue;
        const ref         = issue.ncrNumber ?? `#${issue.id.slice(-6)}`;
        const statusLabel = toLabel(issue.status);
        const transitions = ISSUE_STATUS_TRANSITIONS[issue.status] ?? [];

        out.push({
          id:              `OVERDUE_ISSUE:${issue.id}`,
          ruleKey:         'OVERDUE_ISSUE',
          entityType:      'ISSUE',
          entityId:        issue.id,
          title:           `${ref} — ${issue.title}`,
          workspaceName:   issue.workspace?.name ?? null,
          workspaceId:     issue.workspace?.id ?? null,
          department:      issue.department?.name ?? issue.workspace?.department?.name ?? null,
          responsibleUser: issue.assignedTo?.fullName ?? issue.raisedBy.fullName,
          responsibleUserId: issue.assignedTo?.id ?? issue.raisedBy.id,
          reason:          `Due date has passed and issue is not closed. Due ${fmtDate(issue.dueDate)}, current status: ${statusLabel}.`,
          detectedAt,
          detectionField:  'dueDate',
          detectionValue:  issue.dueDate.toISOString(),
          label:           'SYSTEM_DETECTED',
          dueDate:         issue.dueDate.toISOString(),
          expiryDate:      null,
          updatedAt:       issue.updatedAt.toISOString(),
          sourceFacts: {
            dueDate:           issue.dueDate.toISOString(),
            currentStatus:     issue.status,
            validTransitions:  transitions,
            evaluatedAt:       detectedAt,
            timezone:          'Asia/Kuwait (UTC+3)',
            rule:              'dueDate < endOfDayKuwait(now) AND status NOT IN [VERIFIED, CLOSED, CANCELLED, REJECTED]',
          },
          validTransitions: transitions,
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectOverdueIssues failed — rule skipped', err);
      void this.logSystemError('detectOverdueIssues', err);
    }
  }

  // ─── Detection: ISSUE_WAITING_VERIFICATION ────────────────────────────────
  // Rule: issue.status === 'SUBMITTED' (exact match)
  // Precedence: OVERDUE_ISSUE > ISSUE_WAITING_VERIFICATION > OPEN_ISSUE

  private async detectIssuesWaitingVerification(detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const issues = await this.prisma.ncrCapa.findMany({
        where: { status: 'SUBMITTED' },
        select: {
          id: true, title: true, ncrNumber: true, dueDate: true, updatedAt: true,
          workspace: { select: { id: true, name: true, department: { select: { name: true } } } },
          department: { select: { name: true } },
          assignedTo: { select: { id: true, fullName: true } },
          raisedBy:   { select: { id: true, fullName: true } },
        },
        take: 100,
        orderBy: { updatedAt: 'asc' },
      });

      const transitions = ISSUE_STATUS_TRANSITIONS['SUBMITTED'] ?? [];

      for (const issue of issues) {
        const ref = issue.ncrNumber ?? `#${issue.id.slice(-6)}`;

        out.push({
          id:              `ISSUE_WAITING_VERIFICATION:${issue.id}`,
          ruleKey:         'ISSUE_WAITING_VERIFICATION',
          entityType:      'ISSUE',
          entityId:        issue.id,
          title:           `${ref} — ${issue.title}`,
          workspaceName:   issue.workspace?.name ?? null,
          workspaceId:     issue.workspace?.id ?? null,
          department:      issue.department?.name ?? issue.workspace?.department?.name ?? null,
          responsibleUser: issue.assignedTo?.fullName ?? issue.raisedBy.fullName,
          responsibleUserId: issue.assignedTo?.id ?? issue.raisedBy.id,
          reason:          `Issue status is SUBMITTED. Awaiting verification by an authorised reviewer (ISO Manager / QHSE).`,
          detectedAt,
          detectionField:  'status',
          detectionValue:  'SUBMITTED',
          label:           'SYSTEM_DETECTED',
          dueDate:         issue.dueDate?.toISOString() ?? null,
          expiryDate:      null,
          updatedAt:       issue.updatedAt.toISOString(),
          sourceFacts: {
            status:            'SUBMITTED',
            validTransitions:  transitions,
            evaluatedAt:       detectedAt,
            rule:              'status = SUBMITTED',
          },
          validTransitions: transitions,
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectIssuesWaitingVerification failed — rule skipped', err);
      void this.logSystemError('detectIssuesWaitingVerification', err);
    }
  }

  // ─── Detection: WORKSPACE_WITHOUT_MEMBERS ────────────────────────────────
  // Rule: workspace.status = 'ACTIVE' AND no WorkspaceMember records.
  // Archived or inactive workspaces are excluded.

  private async detectWorkspacesWithoutMembers(detectedAt: string, out: ActionItem[]): Promise<void> {
    try {
      const workspaces = await this.prisma.workspace.findMany({
        where: {
          status: 'ACTIVE',
          members: { none: {} },
        },
        select: {
          id: true, name: true, status: true, updatedAt: true,
          department: { select: { name: true } },
          owner: { select: { id: true, fullName: true } },
        },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });

      for (const ws of workspaces) {
        out.push({
          id:              `WORKSPACE_WITHOUT_MEMBERS:${ws.id}`,
          ruleKey:         'WORKSPACE_WITHOUT_MEMBERS',
          entityType:      'WORKSPACE',
          entityId:        ws.id,
          title:           ws.name,
          workspaceName:   ws.name,
          workspaceId:     ws.id,
          department:      ws.department?.name ?? null,
          responsibleUser: ws.owner.fullName,
          responsibleUserId: ws.owner.id,
          reason:          `Active workspace has zero assigned members. Users cannot collaborate unless explicitly added as workspace members.`,
          detectedAt,
          detectionField:  'memberCount',
          detectionValue:  '0',
          label:           'SYSTEM_DETECTED',
          dueDate:         null,
          expiryDate:      null,
          updatedAt:       ws.updatedAt.toISOString(),
          sourceFacts: {
            memberCount:     0,
            workspaceStatus: ws.status,
            evaluatedAt:     detectedAt,
            rule:            'status = ACTIVE AND members.count = 0',
          },
        });
      }
    } catch (err) {
      this.logger.error('[BAC] detectWorkspacesWithoutMembers failed — rule skipped', err);
      void this.logSystemError('detectWorkspacesWithoutMembers', err);
    }
  }

  // ─── System error logging ─────────────────────────────────────────────────

  private async logSystemError(rule: string, err: unknown): Promise<void> {
    try {
      await this.prisma.systemErrorLog.create({
        data: {
          source:   'API',
          severity: 'WARNING',
          message:  `Business Action Center: ${rule} detection failed`,
          stack:    err instanceof Error ? err.stack ?? null : null,
          path:     '/business-actions/items',
        },
      });
    } catch {
      // never throw from error logger
    }
  }
}
