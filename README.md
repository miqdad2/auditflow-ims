# RECAFCO AuditFlow IMS

**Internal ISO & QHSE Audit Readiness System**

RECAFCO AuditFlow IMS is an internal document control, task management, evidence tracking, audit checklist, and NCR/CAPA system built for RECAFCO's ISO audit preparation.

---

## Quick Start (Local Development)

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | LTS recommended |
| pnpm | 9+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | Must be running locally |

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd AuditFlow_IMS
pnpm install
```

### 2. Create the PostgreSQL database

```sql
-- Run in psql or pgAdmin
CREATE DATABASE auditflow_ims;
```

### 3. Set up environment variables

**API (`apps/api/.env`):**

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/auditflow_ims
JWT_SECRET=your-strong-random-secret-here
JWT_EXPIRES_IN=8h
UPLOAD_DIR=../../uploads
MAX_FILE_SIZE_MB=50
```

**Database package (`packages/db/.env`):**

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/auditflow_ims
```

**Frontend (`apps/web/.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> Copy `.env.example` files in each directory as a starting point.

### 4. Create the uploads directory

```bash
mkdir uploads
```

The uploads directory stores all uploaded files (documents, evidence, attachments).
It is **not** committed to git. Back it up separately.

### 5. Run database migrations

```bash
cd packages/db
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 6. Seed the database (roles, permissions, admin user)

```bash
cd packages/db
npx prisma db seed
cd ../..
```

This creates:
- 10 departments
- 8 roles with 40 permissions
- Initial admin user: `admin@recafco.com` / `Admin@12345`

> The admin must change their password on first login.

### 7. (Optional) Seed demo data for internal presentation

```bash
cd packages/db
npx ts-node --project tsconfig.json prisma/seed-demo.ts
cd ../..
```

This creates sample workspaces, tasks, documents, checklists, evidence, and NCR/CAPA records.
All demo records are prefixed with `[SAMPLE]`.

Demo user passwords are all: `Demo@12345`

### 8. Start the API

```bash
cd apps/api
pnpm dev
```

API runs at: `http://localhost:4000`
Health check: `http://localhost:4000/health`

### 9. Start the frontend

```bash
cd apps/web
pnpm dev
```

Frontend runs at: `http://localhost:3000`

---

## Running Both Services Simultaneously

From the monorepo root:

```bash
# Terminal 1 — API
pnpm --filter api dev

# Terminal 2 — Frontend
pnpm --filter web dev
```

---

## Production Build

```bash
# Build API
pnpm --filter api build

# Build frontend
pnpm --filter web build

# Start API in production mode
pnpm --filter api start

# Start frontend in production mode
pnpm --filter web start
```

---

## Initial Login

| Field | Value |
|-------|-------|
| URL | http://localhost:3000 |
| Email | admin@recafco.com |
| Username | admin |
| Password | Admin@12345 |

**You will be required to change the password on first login.**

---

## Creating Users

After logging in as admin:

1. There is no user management UI in this MVP phase.
2. Users can be created directly via PostgreSQL or by extending the seed.
3. Use the demo seed (`seed-demo.ts`) as reference for creating users with roles and departments.

To manually create a user with bcrypt password:

```sql
-- First hash the password using bcrypt (12 rounds) externally
-- Then insert:
INSERT INTO users (id, email, username, "passwordHash", "fullName", "isActive", "mustChangePassword", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'user@recafco.com', 'username', '<bcrypt_hash>', 'Full Name', true, true, now(), now());
```

---

## Project Structure

```
AuditFlow_IMS/
├── apps/
│   ├── api/          — NestJS backend (port 4000)
│   └── web/          — Next.js frontend (port 3000)
├── packages/
│   ├── db/           — Prisma schema, migrations, seed scripts
│   └── shared/       — Shared TypeScript enums and constants
├── uploads/          — Uploaded files (NOT in git, back up separately)
├── context/          — Project context and documentation files
├── CLAUDE.md         — AI development instructions
├── README.md         — This file
└── DEPLOYMENT.md     — Server deployment guide
```

---

## Roles and Access

| Role | Access Level |
|------|-------------|
| SUPER_ADMIN | Full system access |
| IT_ADMIN | User and system administration |
| ISO_MANAGER | Full ISO workspace, document approval, NCR/CAPA verification |
| QHSE_USER | ISO tasks, documents, evidence, NCR/CAPA |
| DEPARTMENT_MANAGER | Department-level review and approval |
| DEPARTMENT_USER | Upload files, submit evidence, update assigned tasks |
| AUDITOR_VIEWER | Read-only: approved documents, approved evidence, checklist status |
| STAFF | Basic task access, evidence submission |

---

## Security Notes

- All passwords are bcrypt-hashed (12 rounds). Passwords are never stored or logged in plain text.
- JWT secret must be set via `JWT_SECRET` environment variable. Never hardcode it.
- The `uploads/` directory must not be web-accessible directly. Files are served through the API with permission checks.
- `.env` files are git-ignored. Never commit environment files with secrets.
- All file uploads validate MIME type and file size before saving.
- `storagePath` is never returned to clients in API responses.

---

## Database Backup

```bash
# Backup
pg_dump -U postgres auditflow_ims > auditflow_ims_backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres auditflow_ims < auditflow_ims_backup_20260615.sql
```

Also back up the `uploads/` directory separately (contains all uploaded files).

---

## Useful Commands

```bash
# Run Prisma Studio (database browser)
cd packages/db && npx prisma studio

# Check migration status
cd packages/db && npx prisma migrate status

# Apply new migrations
cd packages/db && npx prisma migrate deploy

# Regenerate Prisma client after schema changes
cd packages/db && npx prisma generate

# Rebuild shared enums package after changes
pnpm --filter @auditflow/shared build
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript (App Router) |
| UI | Tailwind CSS + shadcn/ui + Lucide React |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (jsonwebtoken) |
| File Storage | Local filesystem (MVP) |
| Password Hashing | bcrypt (12 rounds) |
| Monorepo | pnpm workspaces |

---

## Support

For issues or questions, contact the IT team or refer to `context/` documentation files.

RECAFCO AuditFlow IMS — Internal Use Only
