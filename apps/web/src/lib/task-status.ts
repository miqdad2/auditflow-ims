/** Mirrors TASK_STATUS_TRANSITIONS from @auditflow/shared. Keep in sync.
 * Unit 62: MEMBER tier restricted to submission-review workflow only.
 */
export const TASK_STATUS_TRANSITIONS: Record<'MEMBER' | 'ELEVATED' | 'MANAGER', Record<string, string[]>> = {
  MEMBER: {
    TODO:           ['IN_PROGRESS'],     // Start Work only
    IN_PROGRESS:    ['WAITING_REVIEW'], // Mark Work Complete only
    WAITING_REVIEW: [],                 // Awaiting reviewer decision — no Member actions
    REJECTED:       ['IN_PROGRESS'],    // Resume Work only
    COMPLETED:      [],
    CANCELLED:      [],
  },
  MANAGER: {
    TODO:           ['IN_PROGRESS', 'WAITING_REVIEW', 'COMPLETED', 'CANCELLED'],
    IN_PROGRESS:    ['WAITING_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    WAITING_REVIEW: ['COMPLETED', 'REJECTED', 'CANCELLED'],
    REJECTED:       ['IN_PROGRESS', 'WAITING_REVIEW', 'CANCELLED'],
    COMPLETED:      ['TODO', 'IN_PROGRESS'],
    CANCELLED:      ['TODO'],
  },
  ELEVATED: {
    TODO:           ['IN_PROGRESS', 'WAITING_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    IN_PROGRESS:    ['WAITING_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    WAITING_REVIEW: ['COMPLETED', 'REJECTED', 'CANCELLED'],
    REJECTED:       ['IN_PROGRESS', 'WAITING_REVIEW', 'CANCELLED'],
    COMPLETED:      ['TODO', 'IN_PROGRESS'],
    CANCELLED:      ['TODO'],
  },
};

// Statuses that require a mandatory reason before applying.
// WAITING_REVIEW: assignee must provide a completion note when submitting work for review.
export const TASK_STATUS_REASON_REQUIRED = new Set(['REJECTED', 'CANCELLED', 'WAITING_REVIEW']);

// Terminal statuses — leaving requires reopen reason
export const TASK_STATUS_REOPEN_SOURCES = new Set(['COMPLETED', 'CANCELLED']);

export type StatusTier = 'ELEVATED' | 'MANAGER' | 'MEMBER';

/** The full ordered list of task statuses shown in the dropdown */
export const ALL_TASK_STATUSES = [
  'TODO', 'IN_PROGRESS', 'WAITING_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED',
] as const;

/**
 * Dropdown status names (compact form used in the status select pill).
 * Unit 62: WAITING_REVIEW now shows "AWAITING REVIEW" as the status name.
 * Enum values are unchanged in the database.
 */
export const TASK_STATUS_DISPLAY_NAMES: Record<string, string> = {
  TODO:           'TODO',
  IN_PROGRESS:    'IN PROGRESS',
  WAITING_REVIEW: 'AWAITING REVIEW',
  COMPLETED:      'COMPLETED',
  REJECTED:       'REJECTED',
  CANCELLED:      'CANCELLED',
};

/**
 * Statuses where the user must confirm before the change commits.
 * COMPLETED, REJECTED, CANCELLED always require confirmation.
 * TODO as a target means "reopen" — also requires confirmation + reason.
 */
export const SENSITIVE_TARGET_STATUSES = new Set(['COMPLETED', 'REJECTED', 'CANCELLED', 'TODO']);

/** Status badge color tokens (mirrors status-badge.tsx) */
export const STATUS_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  TODO:           { bg: 'var(--bg-muted)',           color: 'var(--text-muted)' },
  IN_PROGRESS:    { bg: 'var(--accent-soft)',         color: 'var(--accent-primary)' },
  WAITING_REVIEW: { bg: 'var(--state-warning-soft)', color: 'var(--state-warning)' },
  COMPLETED:      { bg: 'var(--state-success-soft)', color: 'var(--state-success)' },
  REJECTED:       { bg: 'var(--state-error-soft)',   color: 'var(--state-error)' },
  CANCELLED:      { bg: 'var(--bg-muted)',           color: 'var(--text-disabled)' },
};

/**
 * Action labels used in dropdown menus.
 * These describe what WILL HAPPEN (the action), not the resulting state name.
 * Unit 62: action-oriented wording for Member tier.
 */
export const STATUS_ACTION_LABELS: Record<string, string> = {
  TODO:           'Reopen (To Do)',
  IN_PROGRESS:    'Start Work',
  WAITING_REVIEW: 'Mark Work Complete',
  COMPLETED:      'Approve Completion',
  REJECTED:       'Return for Correction',
  CANCELLED:      'Cancel Task',
};

/**
 * Action labels specifically for the MEMBER tier dropdown.
 * Maps the TARGET status to the user-friendly action label shown in the dropdown.
 * Unit 62: normal users see work-submission language, not reviewer language.
 */
export const MEMBER_STATUS_ACTION_LABELS: Record<string, string> = {
  IN_PROGRESS:    'Start Work',
  WAITING_REVIEW: 'Mark Work Complete',
};

/** Display labels for status badges (sentence-case, full wording).
 * Unit 62: WAITING_REVIEW displays as "Completed — Awaiting Review" in all user-facing contexts.
 * This communicates that the assignee has submitted and work is awaiting reviewer decision.
 */
export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  TODO:           'To Do',
  IN_PROGRESS:    'In Progress',
  WAITING_REVIEW: 'Completed — Awaiting Review',
  COMPLETED:      'Completed',
  REJECTED:       'Returned for Correction',
  CANCELLED:      'Cancelled',
};

/** Confirmation dialog config per target status */
export interface ConfirmConfig {
  title: string;
  body: string;
  reasonLabel?: string;
  reasonRequired: boolean;
  reasonPlaceholder?: string;
  confirmLabel: string;
  confirmStyle: 'primary' | 'danger' | 'warning';
}

export const STATUS_CONFIRM_CONFIG: Record<string, ConfirmConfig> = {
  IN_PROGRESS: {
    title:          'Start Work',
    body:           'Mark this task as In Progress.',
    reasonRequired: false,
    confirmLabel:   'Start Work',
    confirmStyle:   'primary',
  },
  WAITING_REVIEW: {
    title:          'Submit Work for Review',
    body:           'Confirm that your work is complete and submit this task for Super User or Manager review.',
    reasonLabel:    'Completion note *',
    reasonRequired: true,
    reasonPlaceholder: 'Describe what was completed and any important notes for the reviewer…',
    confirmLabel:   'Submit for Review',
    confirmStyle:   'primary',
  },
  COMPLETED: {
    title:          'Approve Completion',
    body:           'Approve completion of this task. The assignee will be notified and completion time recorded.',
    reasonLabel:    'Review note (optional)',
    reasonRequired: false,
    reasonPlaceholder: 'Any notes on the reviewed work…',
    confirmLabel:   'Approve Completion',
    confirmStyle:   'primary',
  },
  REJECTED: {
    title:          'Return for Correction',
    body:           'Return this task to the assignee for correction.',
    reasonLabel:    'Reason *',
    reasonRequired: true,
    reasonPlaceholder: 'Explain what must be corrected before the task can be reviewed again…',
    confirmLabel:   'Return Task',
    confirmStyle:   'danger',
  },
  CANCELLED: {
    title:          'Cancel Task',
    body:           'Cancel this task. The assignee will be notified.',
    reasonLabel:    'Reason *',
    reasonRequired: true,
    reasonPlaceholder: 'Explain why this task is being cancelled…',
    confirmLabel:   'Cancel Task',
    confirmStyle:   'danger',
  },
  TODO: {
    title:          'Reopen Task',
    body:           'Reopen this task and reset its status to To Do.',
    reasonLabel:    'Reason *',
    reasonRequired: true,
    reasonPlaceholder: 'Explain why this task is being reopened…',
    confirmLabel:   'Reopen Task',
    confirmStyle:   'warning',
  },
};
