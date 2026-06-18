# RECAFCO AuditFlow IMS — Deployment Guide

Internal deployment reference for the RECAFCO IT team.

---

## Local Deployment (Current Phase)

See `README.md` for full local setup instructions.

**Summary:**
1. Install Node.js 18+, pnpm, PostgreSQL 14+
2. Create database `auditflow_ims`
3. Set environment variables in `apps/api/.env`, `packages/db/.env`, `apps/web/.env.local`
4. Run `pnpm install` from root
5. Run `cd packages/db && npx prisma migrate deploy && npx prisma generate`
6. Run `cd packages/db && npx prisma db seed`
7. Start API: `pnpm --filter api dev`
8. Start Web: `pnpm --filter web dev`

---

## Company Server Deployment

When moving from local to company server (Windows or Linux):

### Prerequisites on Server

- Node.js 18 LTS (or later)
- pnpm (`npm install -g pnpm`)
- PostgreSQL 14+ (or use existing company PostgreSQL instance)
- A reverse proxy (nginx or IIS ARR) to serve both apps on standard ports
- `uploads/` directory on a persistent disk

### Environment Variables

Create environment files on the server. Never copy development `.env` files with `localhost` URLs.

**`apps/api/.env` (server):**

```env
PORT=4000
CORS_ORIGIN=http://YOUR_SERVER_IP_OR_HOSTNAME
DATABASE_URL=postgresql://auditflow_user:STRONG_PASSWORD@localhost:5432/auditflow_ims
JWT_SECRET=LONG_RANDOM_SECRET_AT_LEAST_64_CHARS
JWT_EXPIRES_IN=8h
UPLOAD_DIR=/var/data/auditflow/uploads
MAX_FILE_SIZE_MB=50
NODE_ENV=production
```

**`apps/web/.env.local` (server):**

```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP_OR_HOSTNAME:4000
```

> If using a reverse proxy to put both on port 80/443, adjust `NEXT_PUBLIC_API_URL` to match.

### Build for Production

```bash
# From monorepo root on server

pnpm install --frozen-lockfile

# Build shared package
pnpm --filter @auditflow/shared build

# Build API
pnpm --filter api build

# Build frontend
pnpm --filter web build
```

### Run in Production

**Option A: Direct (for testing)**

```bash
# Terminal 1 — API
cd apps/api && node dist/main.js

# Terminal 2 — Frontend
cd apps/web && pnpm start
```

**Option B: PM2 (recommended for persistent operation)**

Install PM2:

```bash
npm install -g pm2
```

Start services:

```bash
# Start API
pm2 start apps/api/dist/main.js --name auditflow-api

# Start Frontend
cd apps/web && pm2 start "pnpm start" --name auditflow-web

# Save PM2 process list
pm2 save

# Configure PM2 to start on server boot
pm2 startup
```

Manage services:

```bash
pm2 list                    # Show all services
pm2 logs auditflow-api     # View API logs
pm2 restart auditflow-api  # Restart API
pm2 stop auditflow-web     # Stop frontend
```

### Nginx Reverse Proxy (Optional)

If running both on a single domain:

```nginx
# /etc/nginx/sites-available/auditflow

server {
    listen 80;
    server_name YOUR_SERVER_HOSTNAME;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> If using the nginx reverse proxy above, update `NEXT_PUBLIC_API_URL` to `http://YOUR_SERVER_HOSTNAME/api`
> and remove the `/api/` rewrite, adding the path prefix in the NestJS global prefix instead.

### Uploads Directory on Server

The `uploads/` directory must be:

1. Located outside the git repository (do not commit it)
2. On a persistent disk (not a temporary partition)
3. Readable and writable by the Node.js process user
4. Backed up regularly (contains all uploaded files)

```bash
# Create uploads directory
mkdir -p /var/data/auditflow/uploads

# Set ownership (replace 'nodeuser' with the actual user running Node)
chown -R nodeuser:nodeuser /var/data/auditflow/uploads
chmod 750 /var/data/auditflow/uploads
```

Set `UPLOAD_DIR=/var/data/auditflow/uploads` in `apps/api/.env`.

---

## Database Setup on Server

### Create PostgreSQL user and database

```sql
-- In psql as postgres superuser
CREATE USER auditflow_user WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE auditflow_ims OWNER auditflow_user;
GRANT ALL PRIVILEGES ON DATABASE auditflow_ims TO auditflow_user;
```

### Run migrations

```bash
cd packages/db
DATABASE_URL=postgresql://auditflow_user:STRONG_PASSWORD@localhost:5432/auditflow_ims \
  npx prisma migrate deploy
npx prisma generate
```

### Seed roles, permissions, and admin user

```bash
cd packages/db
DATABASE_URL=postgresql://auditflow_user:STRONG_PASSWORD@localhost:5432/auditflow_ims \
  npx prisma db seed
```

---

## Backup and Restore

### Database Backup

```bash
# Full backup
pg_dump -U auditflow_user -h localhost auditflow_ims \
  > /backups/auditflow_ims_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
pg_dump -U auditflow_user -h localhost -Fc auditflow_ims \
  > /backups/auditflow_ims_$(date +%Y%m%d_%H%M%S).dump
```

### Database Restore

```bash
# From SQL file
psql -U auditflow_user -h localhost auditflow_ims < /backups/auditflow_ims_20260615.sql

# From compressed dump
pg_restore -U auditflow_user -h localhost -d auditflow_ims /backups/auditflow_ims_20260615.dump
```

### Uploads Backup

```bash
# Copy uploads directory
cp -r /var/data/auditflow/uploads /backups/auditflow_uploads_$(date +%Y%m%d)/

# Or use rsync
rsync -av /var/data/auditflow/uploads/ /backups/auditflow_uploads_$(date +%Y%m%d)/
```

### Automated Backup (crontab example)

```bash
# Edit crontab: crontab -e
# Daily backup at 2:00 AM
0 2 * * * pg_dump -U auditflow_user auditflow_ims > /backups/auditflow_db_$(date +\%Y\%m\%d).sql
0 3 * * * rsync -a /var/data/auditflow/uploads/ /backups/uploads_$(date +\%Y\%m\%d)/
```

---

## Future Upgrades

### MinIO File Storage

When moving to MinIO for file storage:

1. Deploy MinIO on the company server or internal network
2. Add MinIO connection details to `apps/api/.env`:
   ```env
   MINIO_ENDPOINT=minio.internal.recafco.com
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_BUCKET=auditflow-uploads
   MINIO_USE_SSL=false
   ```
3. Update `FileStorageService` in `apps/api/src/common/file-storage.service.ts` to use MinIO SDK
4. Migrate existing files from local disk to MinIO bucket
5. Update PostgreSQL `storagePath` records to point to MinIO keys

The database schema and business logic do not change. Only the storage backend changes.

### Redis + BullMQ for Background Jobs

When adding scheduled reminders (overdue task notifications, due date reminders):

1. Install Redis on server
2. Add to `apps/api`:
   ```bash
   pnpm add @nestjs/bull bull @types/bull
   ```
3. Configure BullMQ queues for:
   - Daily overdue task check
   - 3-day-ahead due date reminders
   - Weekly readiness summary notifications

---

## Security Checklist Before Production

- [ ] `JWT_SECRET` set to a strong random value (at least 64 characters)
- [ ] Passwords are bcrypt-hashed (never plain text in database)
- [ ] `uploads/` directory is not directly web-accessible
- [ ] `.env` files are not committed to git
- [ ] `storagePath` is not returned in any API response
- [ ] File upload validates MIME type and rejects executables
- [ ] File size limit enforced (`MAX_FILE_SIZE_MB`)
- [ ] `NODE_ENV=production` set on server
- [ ] PostgreSQL is not exposed on public network interface
- [ ] Firewall allows only ports 80, 443 (and 22 for SSH) from external
- [ ] Backup schedule is configured and tested
- [ ] Admin password changed from default on first login

---

## Troubleshooting

### API not starting

Check:
- PostgreSQL is running and accessible
- `DATABASE_URL` is correct in `apps/api/.env`
- `JWT_SECRET` is set
- Port 4000 is not in use: `netstat -tulnp | grep 4000`

### Uploads not saving

Check:
- `UPLOAD_DIR` directory exists and is writable
- Node.js process user has write permission to `UPLOAD_DIR`

### Migration failing

```bash
# Check migration status
cd packages/db && npx prisma migrate status

# If drift, resolve manually
npx prisma migrate resolve --applied <migration_name>
```

### Prisma client errors after schema change

```bash
cd packages/db && npx prisma generate
```

Then restart the API.

---

*RECAFCO AuditFlow IMS — Internal Use Only*
*Prepared for RECAFCO IT Team*
