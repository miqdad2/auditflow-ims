import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemErrorsService } from '../modules/system-errors/system-errors.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/csv',
];

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.txt', '.csv',
]);

export interface StoredFile {
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
}

@Injectable()
export class FileStorageService {
  private readonly uploadDir: string;
  private readonly maxBytes: number;

  constructor(
    private config: ConfigService,
    private systemErrors: SystemErrorsService,
  ) {
    const rawDir = this.config.get<string>('UPLOAD_DIR', '../../uploads');
    this.uploadDir = path.resolve(process.cwd(), rawDir);
    const maxMb = parseInt(this.config.get<string>('MAX_FILE_SIZE_MB', '25'), 10);
    this.maxBytes = maxMb * 1024 * 1024;
  }

  validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, TXT, CSV.`,
      );
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `File extension '${ext}' is not allowed.`,
      );
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(
        `File is too large. Maximum allowed size is ${this.maxBytes / 1024 / 1024} MB.`,
      );
    }
  }

  async saveFile(file: Express.Multer.File, subDir: string): Promise<StoredFile> {
    this.validateFile(file);

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const dir = path.join(this.uploadDir, subDir, year, month);

    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      void this.systemErrors.log({
        source: 'STORAGE',
        severity: 'CRITICAL',
        message: `Failed to create upload directory: ${dir}`,
        stack: err instanceof Error ? err.stack : undefined,
        metadata: { dir, subDir },
      });
      throw new InternalServerErrorException('Storage directory could not be created. Contact your IT Administrator.');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    const uid = crypto.randomBytes(8).toString('hex');
    const storedFileName = `${uid}_${safeBase}${ext}`;
    const storagePath = path.join(dir, storedFileName);

    try {
      fs.writeFileSync(storagePath, file.buffer);
    } catch (err) {
      void this.systemErrors.log({
        source: 'STORAGE',
        severity: 'CRITICAL',
        message: `Failed to write uploaded file: ${storedFileName}`,
        stack: err instanceof Error ? err.stack : undefined,
        metadata: { storedFileName, subDir, fileSize: file.size },
      });
      throw new InternalServerErrorException('File could not be saved to storage. Contact your IT Administrator.');
    }

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    return {
      originalFileName: file.originalname,
      storedFileName,
      storagePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      checksum,
    };
  }

  getAbsolutePath(storagePath: string): string {
    return storagePath;
  }

  deleteFile(storagePath: string): void {
    try {
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
      }
    } catch (err) {
      // Log orphaned file but do not throw — manual cleanup is recoverable
      void this.systemErrors.log({
        source: 'STORAGE',
        severity: 'WARNING',
        message: `Failed to delete file from storage (orphaned file): ${path.basename(storagePath)}`,
        stack: err instanceof Error ? err.stack : undefined,
        metadata: { storagePath: path.basename(storagePath) },
      });
    }
  }

  // Called when a DB save fails after file was already written — attempt orphan cleanup
  cleanupOrphanFile(storagePath: string, context: string): void {
    try {
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
      }
    } catch (err) {
      void this.systemErrors.log({
        source: 'STORAGE',
        severity: 'ERROR',
        message: `Orphan file cleanup failed after DB error [${context}]: ${path.basename(storagePath)}`,
        stack: err instanceof Error ? err.stack : undefined,
        metadata: { storagePath: path.basename(storagePath), context },
      });
    }
  }
}
