export interface FileAttachment {
  id: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  uploadedBy: { id: string; fullName: string };
  // Expiry tracking
  displayName?:   string | null;
  issueDate?:     string | null;
  expiryDate?:    string | null;
  reminderDays?:  number | null;
  notes?:         string | null;
  isSuperseded?:  boolean;
  renewedFromId?: string | null;
  /** Soft warning returned when the uploaded filename resembles a controlled document. */
  warning?: string;
}

// ─── Expiry status helpers ────────────────────────────────────────────────────

export type ExpiryStatus = 'NO_EXPIRY' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED';

export interface ExpiryStatusInfo {
  status:  ExpiryStatus;
  label:   string;
  color:   string;
  bg:      string;
  daysLeft?: number;
}

export function getExpiryStatus(att: FileAttachment): ExpiryStatusInfo {
  if (att.isSuperseded) return { status: 'RENEWED', label: 'Renewed', color: 'var(--text-muted)', bg: 'var(--bg-muted)' };
  if (!att.expiryDate)  return { status: 'NO_EXPIRY', label: 'No Expiry', color: 'var(--text-disabled)', bg: 'var(--bg-subtle)' };

  const now      = Date.now();
  const expiry   = new Date(att.expiryDate).getTime();
  const daysLeft = Math.ceil((expiry - now) / 86400000);
  const window   = att.reminderDays ?? 30;

  if (daysLeft < 0)           return { status: 'EXPIRED',       label: 'Expired',        color: 'var(--state-error)',   bg: 'var(--state-error-soft)',   daysLeft };
  if (daysLeft <= window)     return { status: 'EXPIRING_SOON', label: 'Expiring Soon',  color: 'var(--state-warning)', bg: 'var(--state-warning-soft)', daysLeft };
  return                             { status: 'VALID',         label: 'Valid',          color: 'var(--state-success)', bg: 'var(--state-success-soft)', daysLeft };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
  if (mimeType.includes('csv') || mimeType.includes('text')) return '📋';
  return '📎';
}
