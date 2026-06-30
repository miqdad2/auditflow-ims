import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './common/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'RECAFCO AuditFlow ISO API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseHealth(): Promise<{ status: 'ok' | 'error'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? 'Database unreachable' : 'Unknown database error',
      };
    }
  }

  getStorageHealth(): { status: 'ok' | 'error'; path?: string; writable?: boolean; error?: string } {
    const uploadDir = this.config.get<string>('UPLOAD_DIR') ?? path.resolve(process.cwd(), '../../uploads');
    const resolved = path.resolve(uploadDir);

    try {
      const exists = fs.existsSync(resolved);
      if (!exists) {
        return { status: 'error', path: resolved, error: 'Upload directory does not exist' };
      }
      // Test writability by attempting a temp file
      const testFile = path.join(resolved, `.health-${Date.now()}`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      return { status: 'ok', path: resolved, writable: true };
    } catch (err) {
      return {
        status: 'error',
        path: resolved,
        writable: false,
        error: err instanceof Error ? err.message : 'Storage check failed',
      };
    }
  }

  async getFullHealth() {
    const [db, storage] = await Promise.all([
      this.getDatabaseHealth(),
      Promise.resolve(this.getStorageHealth()),
    ]);

    const allOk = db.status === 'ok' && storage.status === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      service: 'RECAFCO AuditFlow ISO API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        database: db,
        storage,
      },
    };
  }
}
