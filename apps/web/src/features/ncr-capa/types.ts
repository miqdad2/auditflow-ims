export type NcrType = 'NCR' | 'CAPA' | 'OBSERVATION';

export type NcrStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_EVIDENCE'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REJECTED'
  | 'OVERDUE';

export type Severity = 'MINOR' | 'MAJOR' | 'CRITICAL' | 'OBSERVATION';

export interface NcrUser {
  id: string;
  fullName: string;
}

export interface NcrWorkspace {
  id: string;
  name: string;
}

export interface NcrDepartment {
  id: string;
  name: string;
}

export interface NcrChecklistItem {
  id: string;
  title: string;
  isoClause: string | null;
}

export interface NcrCapaSummary {
  id: string;
  ncrNumber: string | null;
  title: string;
  description: string | null;
  type: NcrType;
  severity: Severity;
  status: NcrStatus;
  isoClause: string | null;
  workspaceId: string | null;
  departmentId: string | null;
  checklistItemId: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  dueDate: string | null;
  verifiedAt: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  raisedBy: NcrUser;
  assignedTo: NcrUser | null;
  verifiedBy: NcrUser | null;
  closedBy: NcrUser | null;
  workspace: NcrWorkspace | null;
  department: NcrDepartment | null;
  _count: { comments: number };
}

export interface NcrCapaDetail extends NcrCapaSummary {
  checklistItem: NcrChecklistItem | null;
}

export interface NcrComment {
  id: string;
  body: string;
  createdAt: string;
  author: NcrUser;
}

export const NCR_STATUS_CONFIG: Record<NcrStatus, { label: string; color: string; bg: string }> = {
  OPEN:             { label: 'Open',             color: '#DC2626', bg: '#FEF2F2' },
  IN_PROGRESS:      { label: 'In Progress',      color: '#D97706', bg: '#FFFBEB' },
  WAITING_EVIDENCE: { label: 'Waiting Evidence', color: '#7C3AED', bg: '#F5F3FF' },
  SUBMITTED:        { label: 'Submitted',         color: '#2563EB', bg: '#EFF6FF' },
  VERIFIED:         { label: 'Verified',          color: '#059669', bg: '#ECFDF5' },
  CLOSED:           { label: 'Closed',            color: '#6B7280', bg: '#F9FAFB' },
  REJECTED:         { label: 'Rejected',          color: '#DC2626', bg: '#FEF2F2' },
  OVERDUE:          { label: 'Overdue',           color: '#9A3412', bg: '#FFF7ED' },
};

export const NCR_TYPE_LABELS: Record<NcrType, string> = {
  NCR: 'Non-Conformity (NCR)',
  CAPA: 'Corrective/Preventive Action (CAPA)',
  OBSERVATION: 'Observation',
};

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  MINOR:       { label: 'Minor',       color: '#6B7280' },
  MAJOR:       { label: 'Major',       color: '#D97706' },
  CRITICAL:    { label: 'Critical',    color: '#DC2626' },
  OBSERVATION: { label: 'Observation', color: '#2563EB' },
};
