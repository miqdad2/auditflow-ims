import { FileExpiryStatus, DEFAULT_FILE_EXPIRY_REMINDER_DAYS } from '@auditflow/shared';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Classifies a single FileAttachment's expiry state relative to `now`.
 * Shared by TasksService.attachFileExpiry() (one representative file per task, for the
 * main Tasks table) and FileAttachmentsService.getExpiringFiles() (one row per file, for
 * the workspace expiry-review table) so both use identical day-math and thresholds.
 */
export function classifyFileExpiry(
  expiryDate: Date | null,
  reminderDays: number | null,
  now: Date,
): { status: FileExpiryStatus; daysLeft: number | null } {
  if (!expiryDate) {
    return { status: FileExpiryStatus.MISSING_EXPIRY_DATE, daysLeft: null };
  }
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / MS_PER_DAY);
  const reminder = reminderDays ?? DEFAULT_FILE_EXPIRY_REMINDER_DAYS;
  const status =
    daysLeft < 0 ? FileExpiryStatus.EXPIRED :
    daysLeft <= reminder ? FileExpiryStatus.EXPIRING_SOON :
    FileExpiryStatus.VALID;
  return { status, daysLeft };
}
