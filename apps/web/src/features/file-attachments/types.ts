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
  /** Soft warning returned when the uploaded filename resembles a controlled document. */
  warning?: string;
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
