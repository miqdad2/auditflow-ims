// ─── Workspace Status ─────────────────────────────────────────────────────────

export enum WorkspaceStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

// ─── User Roles ───────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  IT_ADMIN = "IT_ADMIN",
  ISO_MANAGER = "ISO_MANAGER",
  QHSE_USER = "QHSE_USER",
  DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER",
  DEPARTMENT_USER = "DEPARTMENT_USER",
  AUDITOR_VIEWER = "AUDITOR_VIEWER",
  STAFF = "STAFF",
}

// ─── Task Status ──────────────────────────────────────────────────────────────

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  WAITING_REVIEW = "WAITING_REVIEW",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

// ─── Document Status ──────────────────────────────────────────────────────────

export enum DocumentStatus {
  DRAFT = "DRAFT",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
}

// ─── Evidence Status ──────────────────────────────────────────────────────────

export enum EvidenceStatus {
  MISSING = "MISSING",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// ─── NCR/CAPA Status ──────────────────────────────────────────────────────────

export enum NcrCapaStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  WAITING_EVIDENCE = "WAITING_EVIDENCE",
  SUBMITTED = "SUBMITTED",
  VERIFIED = "VERIFIED",
  CLOSED = "CLOSED",
  REJECTED = "REJECTED",
  OVERDUE = "OVERDUE",
}

// ─── Priority ─────────────────────────────────────────────────────────────────

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// ─── Severity (NCR/CAPA) ─────────────────────────────────────────────────────

export enum Severity {
  MINOR = "MINOR",
  MAJOR = "MAJOR",
  CRITICAL = "CRITICAL",
  OBSERVATION = "OBSERVATION",
}

// ─── Audit Entity Types ───────────────────────────────────────────────────────

export enum AuditEntityType {
  USER = "USER",
  PROJECT = "PROJECT",
  TASK_LIST = "TASK_LIST",
  TASK = "TASK",
  SUBTASK = "SUBTASK",
  PAGE = "PAGE",
  SUB_PAGE = "SUB_PAGE",
  DOCUMENT = "DOCUMENT",
  DOCUMENT_VERSION = "DOCUMENT_VERSION",
  CHECKLIST_ITEM = "CHECKLIST_ITEM",
  EVIDENCE = "EVIDENCE",
  NCR_CAPA = "NCR_CAPA",
  COMMENT = "COMMENT",
  ROLE = "ROLE",
  DEPARTMENT = "DEPARTMENT",
  NOTIFICATION = "NOTIFICATION",
}

// ─── Audit Actions ────────────────────────────────────────────────────────────

export enum AuditAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
  ARCHIVED = "ARCHIVED",
  RESTORED = "RESTORED",
  STATUS_CHANGED = "STATUS_CHANGED",
  ASSIGNED = "ASSIGNED",
  UNASSIGNED = "UNASSIGNED",
  UPLOADED = "UPLOADED",
  DOWNLOADED = "DOWNLOADED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUBMITTED = "SUBMITTED",
  VERIFIED = "VERIFIED",
  CLOSED = "CLOSED",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  PERMISSION_CHANGED = "PERMISSION_CHANGED",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
}

// ─── Notification Category ────────────────────────────────────────────────────

export enum NotificationCategory {
  TASK_ASSIGNED = "TASK_ASSIGNED",
  TASK_DUE_REMINDER = "TASK_DUE_REMINDER",
  TASK_OVERDUE = "TASK_OVERDUE",
  TASK_WAITING_REVIEW = "TASK_WAITING_REVIEW",
  TASK_COMPLETED = "TASK_COMPLETED",
  TASK_REJECTED = "TASK_REJECTED",
  TASK_CANCELLED = "TASK_CANCELLED",
  TASK_REOPENED = "TASK_REOPENED",
  EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED",
  EVIDENCE_REJECTED = "EVIDENCE_REJECTED",
  DOCUMENT_REVIEW_PENDING = "DOCUMENT_REVIEW_PENDING",
  DOCUMENT_APPROVED = "DOCUMENT_APPROVED",
  DOCUMENT_REJECTED = "DOCUMENT_REJECTED",
  NCR_CAPA_ASSIGNED = "NCR_CAPA_ASSIGNED",
  NCR_CAPA_OVERDUE = "NCR_CAPA_OVERDUE",
  GENERAL = "GENERAL",
}

// ─── Task Status Transitions ──────────────────────────────────────────────────
// Single authoritative map shared by backend (service) and frontend (action UI).
// MEMBER = normal assignee/workspace-member
// ELEVATED = SUPER_ADMIN / IT_ADMIN / ISO_MANAGER / QHSE_USER / SUPER_USER
// MANAGER = workspace OWNER or MANAGER role

export const TASK_STATUS_TRANSITIONS: Record<'MEMBER' | 'ELEVATED' | 'MANAGER', Record<string, string[]>> = {
  // Unit 62: Normal assigned Member submits work for review — no direct COMPLETED or CANCELLED.
  // Workflow: TODO → IN_PROGRESS → WAITING_REVIEW → (reviewed by Manager/Elevated)
  //           REJECTED → IN_PROGRESS (resume) → WAITING_REVIEW
  MEMBER: {
    TODO:           ['IN_PROGRESS'],           // Start Work only
    IN_PROGRESS:    ['WAITING_REVIEW'],        // Mark Work Complete only
    WAITING_REVIEW: [],                        // Read-only — awaiting reviewer decision
    REJECTED:       ['IN_PROGRESS'],           // Resume Work only — no direct re-submit
    COMPLETED:      [],                        // Read-only
    CANCELLED:      [],                        // Read-only
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

// Transitions that require a mandatory non-empty reason.
// WAITING_REVIEW: assignee must provide a completion note when submitting work for review.
// (Reviewers/Managers who manually move tasks also benefit from having a note.)
export const TASK_STATUS_REASON_REQUIRED = new Set(['REJECTED', 'CANCELLED', 'WAITING_REVIEW']);

// Transitions that are considered "reopen" (from a terminal state)
export const TASK_STATUS_REOPEN_SOURCES = new Set(['COMPLETED', 'CANCELLED']);

// ─── Document Category ────────────────────────────────────────────────────────

export enum DocumentCategory {
  GENERAL = "GENERAL",
  POLICY = "POLICY",
  PROCEDURE = "PROCEDURE",
  WORK_INSTRUCTION = "WORK_INSTRUCTION",
  FORM = "FORM",
  RECORD = "RECORD",
  CERTIFICATE = "CERTIFICATE",
  REPORT = "REPORT",
  MANUAL = "MANUAL",
}

// ─── File Entity Type (what a file is attached to) ───────────────────────────

export enum FileEntityType {
  TASK = "TASK",
  PAGE = "PAGE",
  DOCUMENT = "DOCUMENT",
  CHECKLIST_ITEM = "CHECKLIST_ITEM",
  EVIDENCE = "EVIDENCE",
  NCR_CAPA = "NCR_CAPA",
  COMMENT = "COMMENT",
}

// ─── Allowed MIME types for upload ───────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "text/plain",
  "text/csv",
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB default

// ─── Department names (default list; editable by admin) ──────────────────────

export const DEFAULT_DEPARTMENTS = [
  "ISO Certificates",
  "MR/ER Appointment",
  "QHSE Policy",
  "Quality Objectives",
  "MR ISO Files",
  "QHSE Management System",
  "HR",
  "ICT",
  "Estimation & Tendering",
  "Purchasing & Stores",
  "Civil Engineering Contracts",
  "Operation / RMC Production",
  "Maintenance",
  "Technical Design & QC",
  "Project Site",
  "ISO Forms",
] as const;
