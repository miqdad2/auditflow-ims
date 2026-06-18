export interface DocumentUser {
  id: string;
  fullName: string;
  email?: string;
}

export interface DocumentVersionSummary {
  id: string;
  versionNumber: number;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  createdAt: string;
  uploadedBy: { id: string; fullName: string };
}

export interface DocumentSummary {
  id: string;
  title: string;
  documentNumber?: string;
  category: string;
  status: string;
  currentVersionId?: string;
  reviewDate?: string;
  expiryDate?: string;
  rejectionReason?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string; code: string };
  workspace?: { id: string; name: string };
  owner: { id: string; fullName: string };
  createdBy: { id: string; fullName: string };
  versions: DocumentVersionSummary[];
}

export interface DocumentDetail extends DocumentSummary {
  description?: string;
  departmentId?: string;
  workspaceId?: string;
  ownerId: string;
  createdById: string;
  rejectionReason?: string;
}

export interface DocumentListResponse {
  items: DocumentSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const DOCUMENT_CATEGORIES = [
  { value: 'GENERAL',          label: 'General' },
  { value: 'POLICY',           label: 'Policy' },
  { value: 'PROCEDURE',        label: 'Procedure' },
  { value: 'WORK_INSTRUCTION', label: 'Work Instruction' },
  { value: 'FORM',             label: 'Form' },
  { value: 'RECORD',           label: 'Record' },
  { value: 'CERTIFICATE',      label: 'Certificate' },
  { value: 'REPORT',           label: 'Report' },
  { value: 'MANUAL',           label: 'Manual' },
];

export const DOCUMENT_STATUSES = [
  { value: 'DRAFT',        label: 'Draft' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED',     label: 'Approved' },
  { value: 'REJECTED',     label: 'Rejected' },
  { value: 'ARCHIVED',     label: 'Archived' },
];

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT:        ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED:     ['ARCHIVED'],
  REJECTED:     ['DRAFT', 'UNDER_REVIEW'],
  ARCHIVED:     [],
};

/**
 * Returns the status values that the actor may transition to, filtered by
 * their permissions. Mirrors the service-level per-transition permission logic.
 *
 * APPROVED / REJECTED  → requires documents.approve
 * ARCHIVED             → requires documents.archive
 * DRAFT / UNDER_REVIEW → requires documents.update (anyone who can edit)
 */
export function getAllowedTransitions(
  currentStatus: string,
  permissions: string[],
): string[] {
  const all = STATUS_TRANSITIONS[currentStatus] ?? [];
  return all.filter((target) => {
    if (target === 'APPROVED' || target === 'REJECTED') {
      return (
        permissions.includes('documents.approve') ||
        permissions.includes('users.manage') ||
        permissions.includes('settings.manage')
      );
    }
    if (target === 'ARCHIVED') {
      return (
        permissions.includes('documents.archive') ||
        permissions.includes('users.manage') ||
        permissions.includes('settings.manage')
      );
    }
    return permissions.includes('documents.update');
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
