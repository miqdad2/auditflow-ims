export interface ChecklistSummary {
  id: string;
  name: string;
  description?: string;
  isoStandard?: string;
  workspaceId?: string;
  departmentId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  workspace?:  { id: string; name: string };
  department?: { id: string; name: string; code: string };
  createdBy:   { id: string; fullName: string };
  _count: { items: number };
}

export type ItemStatus = 'MISSING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface ChecklistItem {
  id: string;
  checklistId: string;
  departmentId?: string;
  title: string;
  description?: string;
  isoClause?: string;
  responsibleUserId?: string;
  reviewerId?: string;
  dueDate?: string;
  status: ItemStatus;
  sortOrder: number;
  reviewedAt?: string;
  rejectionReason?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  department?:      { id: string; name: string; code: string };
  responsibleUser?: { id: string; fullName: string };
  reviewer?:        { id: string; fullName: string };
  createdBy:        { id: string; fullName: string };
  _count: { evidence: number };
}

export interface ChecklistEvidence {
  id: string;
  checklistItemId: string;
  submittedById: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  notes?: string;
  reviewerId?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: { id: string; fullName: string };
  reviewer?:   { id: string; fullName: string };
}

export interface ChecklistReadiness {
  checklistId: string;
  total: number;
  approved: number;
  percentage: number;
}

export const ITEM_STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  MISSING:   { label: 'Missing',   color: 'var(--state-error)',   bg: 'var(--state-error-soft)' },
  SUBMITTED: { label: 'Submitted', color: 'var(--state-warning)', bg: 'var(--state-warning-soft)' },
  APPROVED:  { label: 'Approved',  color: 'var(--state-success)', bg: 'var(--state-success-soft)' },
  REJECTED:  { label: 'Rejected',  color: 'var(--state-error)',   bg: 'var(--state-error-soft)' },
};
