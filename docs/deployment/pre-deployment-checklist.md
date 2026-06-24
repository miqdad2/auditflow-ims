# Pre-Deployment Checklist — AuditFlow IMS

Release: auditflow-ims-2026-06-24-r3
Commit: 7cfddfa
Date prepared: 2026-06-24
Prepared by: Unit 66 safety audit

---

## How to use

Complete every item BEFORE beginning the deployment procedure.
Any unchecked critical item = DO NOT DEPLOY until resolved.

---

## A — Repository and Release State

- [ ] Confirm release commit hash: `7cfddfa`
- [ ] `git status` shows clean working tree on server (no uncommitted changes)
- [ ] `git branch --show-current` shows `main`
- [ ] `git rev-parse --short HEAD` returns `7cfddfa`
- [ ] No `.env`, credentials, database dumps, private keys, or production backups are in the git repository

---

## B — Backups (MANDATORY — DO NOT SKIP)

- [ ] Full PostgreSQL dump completed:
  ```cmd
  pg_dump -U postgres -d auditflow_ims -F c -f "C:\RecafcoServer\backups\AuditFlow_IMS_2026-06-24_predeploy.dump"
  ```
- [ ] Backup file is non-zero bytes (verified with `dir`)
- [ ] Backup structural integrity verified:
  ```cmd
  pg_restore --list "C:\RecafcoServer\backups\AuditFlow_IMS_2026-06-24_predeploy.dump" | head -10
  ```
- [ ] Backup SHA256 checksum recorded in a .txt file next to the backup
- [ ] Upload directory backup completed:
  ```cmd
  robocopy "C:\RecafcoServer\uploads" "C:\RecafcoServer\backups\uploads_2026-06-24" /E
  ```
- [ ] Upload file counts match (source = backup)
- [ ] Previous release code backed up:
  ```cmd
  xcopy /E /I "C:\RecafcoServer\current" "C:\RecafcoServer\backups\code_2026-06-24"
  ```
- [ ] `apps/api/.env` from current server backed up to `C:\RecafcoServer\backups\`
- [ ] `apps/web/.env` from current server backed up to `C:\RecafcoServer\backups\`
- [ ] PM2 current state saved: `pm2 save --force` → backed up `~/.pm2/dump.pm2`
- [ ] Current Caddyfile backed up

---

## C — Pre-Deployment Baseline Counts

Run all queries from `production-data-baseline.md` Step 2 and record to a text file.
Save as `C:\RecafcoServer\backups\baseline_predeploy_2026-06-24.txt`.

Critical counts to record before deployment:

- [ ] Total users recorded: __
- [ ] Active users recorded: __
- [ ] Workspace members recorded: __
- [ ] Total tasks recorded: __
- [ ] Total file attachments recorded: __
- [ ] Total documents recorded: __
- [ ] Total notifications recorded: __
- [ ] Audit log entries recorded: __

---

## D — Production Environment Variables Ready

On the production server, confirm the following files contain correct values:

### apps/api/.env
- [ ] `PORT=4000`
- [ ] `CORS_ORIGIN=http://<actual-server-ip-or-hostname>` (NOT localhost — exact URL employees use)
- [ ] `DATABASE_URL` points to production PostgreSQL (not localhost dev database)
- [ ] `JWT_SECRET` is a strong 64-char random string (NOT the default placeholder)
- [ ] `UPLOAD_DIR=C:\RecafcoServer\uploads` (absolute path, NOT relative `../../uploads`)
- [ ] `MAX_FILE_SIZE_MB=50`
- [ ] `NODE_ENV=production`

### apps/web/.env (used at build time)
- [ ] `NEXT_PUBLIC_API_URL=/api` (single-origin model — NOT http://server:4000)
- [ ] `NEXT_PUBLIC_SOCKET_URL=` (empty string — socket uses window.location.origin through Caddy)
- [ ] No `apps/web/.env.local` exists on the server with conflicting localhost values

### packages/db/.env
- [ ] `DATABASE_URL` matches the API database URL

---

## E — Unique Constraint Pre-Checks

Run on production database before migration. All must return zero rows:

```sql
-- Duplicate workspace members
SELECT "workspaceId", "userId", COUNT(*) FROM workspace_members
GROUP BY "workspaceId", "userId" HAVING COUNT(*) > 1;

-- Duplicate role-permissions
SELECT "roleId", "permissionId", COUNT(*) FROM role_permissions
GROUP BY "roleId", "permissionId" HAVING COUNT(*) > 1;

-- Duplicate emails
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Duplicate usernames
SELECT username, COUNT(*) FROM users GROUP BY username HAVING COUNT(*) > 1;

-- Duplicate recurrenceParentId
SELECT "recurrenceParentId", COUNT(*) FROM tasks
WHERE "recurrenceParentId" IS NOT NULL
GROUP BY "recurrenceParentId" HAVING COUNT(*) > 1;
```

- [ ] Zero duplicate workspace members
- [ ] Zero duplicate role-permissions
- [ ] Zero duplicate emails
- [ ] Zero duplicate usernames
- [ ] Zero duplicate recurrenceParentId

---

## F — PostgreSQL Enum Type Pre-Check

This release introduces two new PostgreSQL enum types.
Run on production database to verify they do NOT already exist:

```sql
SELECT typname FROM pg_type WHERE typname IN ('DashboardExperience', 'WorkspaceVisibilityMode');
```

Expected: 0 rows. If either type already exists, STOP and investigate before migrating.

- [ ] Neither enum type exists in production database

---

## G — Maintenance Window

- [ ] Maintenance window announced to all users (minimum 90 minutes window)
- [ ] IT admin is available and present for the entire maintenance window
- [ ] Rollback contacts identified and available

---

## H — Tools Ready on Server

- [ ] `git` accessible
- [ ] `pnpm` accessible (version ≥11.6.0): `pnpm --version`
- [ ] `node` accessible (version ≥18): `node --version`
- [ ] `psql` accessible: `psql --version`
- [ ] `pg_dump` / `pg_restore` accessible
- [ ] `pm2` accessible: `pm2 --version`
- [ ] `C:\Caddy\caddy.exe` accessible

---

**STOP** if any item in sections A–H is unchecked.
Do not begin the deployment procedure until all items are complete.
