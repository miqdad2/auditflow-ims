# Production Pre-Flight Checklist — AuditFlow ISO

Release: auditflow-ims-2026-06-24-r3  
Commit: 7cfddfa (HEAD — all Unit 63.x through 65.6 changes committed)
Date: 2026-06-24

## Unit 66 — Final Safety Audit (2026-06-24)

| Check | Result |
|---|---|
| Working tree | ✅ CLEAN — all changes committed (7cfddfa) |
| API test suite | ✅ 531 total, 521 pass, 10 skip, 0 fail |
| API build | ✅ EXIT:0, dist/main.js verified |
| Web build (production env) | ✅ EXIT:0, 22 routes (adds /executive-dashboard) |
| Prisma schema validate | ✅ Schema is valid |
| Prisma migration status | ✅ 19 migrations, all applied locally, DB up to date |
| Prisma generate | ✅ Client v7.8.0 generated clean |
| Git diff --check | ✅ No whitespace errors |
| Port-4000 in bundle (source) | ✅ No hardcoded port in API call source |
| Port-4000 in bundle (display only) | ⚠️ In admin/settings system-info page (static display text, not API calls — acceptable) |
| Socket.IO path in bundle | ✅ /socket.io path explicit in socket provider |
| Single-origin socket URL | ✅ SOCKET_URL_ENV empty → window.location.origin in production |
| Caddy locally installed | ❌ Not installed locally — proxy test pending deployment window |
| Two-browser realtime test | ❌ NOT completed — first-window gate on deployment day |
| Disconnect/reconnect test | ❌ NOT completed — first-window gate on deployment day |
| Deployment docs updated | ✅ New: pre-deployment-checklist.md, deployment-day-checklist.md, rollback-procedure.md |

## Unit 64.3 — Readiness Verification Summary (2026-06-24) [archived]

| Check | Result |
|---|---|
| Working tree | ✅ CLEAN — all changes committed |
| API test suite | ✅ 413 total, 403 pass, 10 skip, 0 fail |
| API build | ✅ EXIT:0 |
| Web build (dev mode) | ✅ EXIT:0, 21 routes |
| Web build (production env) | ✅ EXIT:0 (with NEXT_PUBLIC_API_URL=/api via shell) |
| Prisma migration status | ✅ 17 migrations, all applied, DB up to date |
| Prisma generate | ✅ Clean |
| Git diff --check | ✅ No whitespace errors |
| Port-4000 in bundle (source) | ✅ No hardcoded port in component source |
| Port-4000 in bundle (env values) | ⚠️ Present from .env.local (expected — .env.local overrides at build time) |
| Caddy locally installed | ❌ Not installed locally — proxy test NOT completed |
| Two-browser realtime test | ❌ NOT completed — requires running instances |
| Disconnect/reconnect test | ❌ NOT completed — requires running instances |
| Event dedup runtime test | ❌ NOT completed — requires running instances |

## Critical pre-deployment action required

Before running `pnpm --filter web build` on the production server:

1. **The production server does NOT have a `.env.local` file** (only `.env`).
2. Update `apps/web/.env` on the server with production values:
   ```
   NEXT_PUBLIC_API_URL=/api
   NEXT_PUBLIC_SOCKET_URL=
   ```
3. Update `apps/api/.env` on the server:
   ```
   CORS_ORIGIN=http://<server-ip>
   ```
4. This ensures the production bundle does NOT contain localhost:4000 values.

## Port-4000 bundle audit explanation

The production-style build on the developer machine produced two files containing `localhost:4000`:
- **Admin system health page** (`page.tsx` line 28): Displays the configured API URL. With `NEXT_PUBLIC_API_URL=/api`, this would show `/api`.
- **Socket provider**: `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` was baked in from `.env.local` which overrides shell env at Next.js build time.

**Neither is a hardcoded string in source code.** Both are correctly driven by environment variables. On the production server where `.env.local` does not exist, the production values from `.env` will be used correctly.

---

## Previous Release Entry (2026-06-22-r1)

---

## Phase A — Repository and Release Audit

### Working Tree State

| Item | Status |
|---|---|
| Branch | main |
| HEAD commit | 34d1324 — feat: add workspace creation modal component |
| Uncommitted modified files | ~50+ files (working tree dirty) |
| Untracked files | None detected |
| Latest migration | 20260622120000_fix_recurrence_parentid_permanent_unique |
| Total migrations | 15 |

**⚠️ CRITICAL: The working tree has ~50+ modified files not yet committed to git.**  
These represent all implementation from Units 37–62.  
**Before deploying to the company server, all changes must be committed to a release commit.**

Release identifier for this deployment: `auditflow-ims-2026-06-22-r1`

---

### Version Information

| Component | Version |
|---|---|
| Node.js (required) | ≥18 (Next.js 16.2.9 requires Node 18+) |
| pnpm (required) | ^11.6.0 (per devEngines in root package.json) |
| Prisma | ^7.8.0 |
| NestJS | ^11.0.1 |
| Next.js | 16.2.9 |
| React | 19.2.4 |
| TypeScript | ^5.7.3 |
| PostgreSQL | Any version ≥13 compatible with Prisma 7 |

---

## Phase B — Migration Safety Audit

### All 15 Migrations — Safety Classification

| # | Migration Name | Operation Type | Additive | Risk | Production-Safe |
|---|---|---|---|---|---|
| 1 | 20260615000000_baseline_full_schema | CREATE TABLE ×11 | YES | None | ✅ YES |
| 2 | 20260615072840_add_documents | CREATE TABLE | YES | None | ✅ YES |
| 3 | 20260615074000_add_pages | CREATE TABLE | YES | None | ✅ YES |
| 4 | 20260615075416_add_file_attachments | CREATE TABLE | YES | None | ✅ YES |
| 5 | 20260615081748_add_controlled_documents | ALTER/ADD columns | YES | None | ✅ YES |
| 6 | 20260615084211_add_audit_checklist_evidence | CREATE TABLE | YES | None | ✅ YES |
| 7 | 20260615091332_add_ncr_capa | CREATE TABLE | YES | None | ✅ YES |
| 8 | 20260615093000_add_workspace_members | CREATE TABLE + UNIQUE | YES | None | ✅ YES |
| 9 | 20260617045748_add_workspace_access_control | ADD COLUMN (nullable + default) | YES | Low: visibility column gets default 'ORGANIZATION' then changed to 'PRIVATE' | ✅ YES |
| 10 | 20260617062256_add_home_pinned_linked | ADD COLUMN (default false) + CREATE TABLE | YES | None | ✅ YES |
| 11 | 20260621053109_add_task_sort_order_and_attachment_expiry | ADD COLUMNS (nullable/default) + CREATE TABLE | YES | None | ✅ YES |
| 12 | 20260621071334_add_notification_severity_deeplink_workspace | ADD COLUMNS (default + nullable) | YES | None | ✅ YES |
| 13 | 20260622000000_add_task_reference_and_recurrence | ADD COLUMNS + partial unique index | YES | Low: status-filtered unique index (replaced in migration 15) | ✅ YES |
| 14 | 20260622044545_add_activity_metadata | ADD COLUMN (nullable JSONB) | YES | None | ✅ YES |
| 15 | 20260622120000_fix_recurrence_parentid_permanent_unique | DROP INDEX + CREATE INDEX | YES (index only) | Low: drops status-filtered index, creates status-independent. Data verified safe. | ✅ YES |

**Destructive operations found:** None. No DROP TABLE, DROP COLUMN, ALTER COLUMN TYPE, SET NOT NULL without default, DELETE, TRUNCATE, or column rename in any migration.

**Verdict: ALL 15 MIGRATIONS ARE PRODUCTION-SAFE.**

---

### Special Notes on Migration 15

Migration 20260622120000 drops the old partial unique index `tasks_recurrenceParentId_unique` and replaces it with a new one (no status filter). The migration notes confirm 0 rows with non-null `recurrenceParentId` existed before this migration. This is safe.

---

### Visibility Column Note (Migration 9 + 11)

Existing production workspaces created after migration 9 but before migration 11 may have `visibility = 'ORGANIZATION'`. The application code handles both values — the workspace is treated as a non-public workspace. This is harmless.

---

## Phase C — Unique Constraint Pre-Checks

Run these queries on production DB before migration:

- Duplicate workspace members: `SELECT workspaceId, userId, COUNT(*) FROM workspace_members GROUP BY workspaceId, userId HAVING COUNT(*) > 1;` → must return 0 rows
- Duplicate role-permission pairs: same pattern → must return 0 rows
- Duplicate recurrenceParentId: same pattern → must return 0 rows

Full queries in `production-data-baseline.md`.

---

## Phase D — Enum Compatibility Audit

### Task Status (shared enum)

| Value | Code | Schema | Frontend | Backend | ✅ |
|---|---|---|---|---|---|
| TODO | ✅ | ✅ | ✅ | ✅ | OK |
| IN_PROGRESS | ✅ | ✅ | ✅ | ✅ | OK |
| WAITING_REVIEW | ✅ | ✅ | ✅ | ✅ | OK |
| COMPLETED | ✅ | ✅ | ✅ | ✅ | OK |
| REJECTED | ✅ | ✅ | ✅ | ✅ | OK |
| CANCELLED | ✅ | ✅ | ✅ | ✅ | OK |

Status stored as TEXT (not PostgreSQL ENUM type) — no migration needed to add values.

### NCR/CAPA Status (NcrCapaStatus)

All 8 values: OPEN, IN_PROGRESS, WAITING_EVIDENCE, SUBMITTED, VERIFIED, CLOSED, REJECTED, OVERDUE — confirmed in schema, service, frontend. No legacy values at risk.

### Roles

SUPER_ADMIN, SUPER_USER, IT_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER, AUDITOR_VIEWER, STAFF — all stored as strings in DB (not PostgreSQL ENUM). Safe.

### Workspace Roles (roleInWorkspace)

OWNER, MANAGER, MEMBER, VIEWER — stored as TEXT with DEFAULT 'MEMBER'. Existing rows with any of these values are compatible.

---

## Phase E — Build Results

| Build | Command | Exit Code | Notes |
|---|---|---|---|
| API | `pnpm --filter api build` | 0 ✅ | NestJS nest build, TypeScript clean |
| Web | `pnpm --filter web build` | 0 ✅ | 21 routes generated, TypeScript clean |

Web routes confirmed in build:
- `/` (root), `/_not-found`, `/action-center`, `/admin/settings`, `/admin/system-errors`, `/admin/system-health`
- `/change-password`, `/checklist`, `/dashboard`, `/departments`, `/documents`, `/documents/[id]`
- `/evidence`, `/login`, `/ncr-capa`, `/notifications`, `/reports`, `/tasks`, `/users`, `/workspaces`, `/workspaces/[id]`

---

## Phase F — Test Summary

| Suite | Total | Pass | Skip | Fail |
|---|---|---|---|---|
| tasks.service.spec.ts | 59 | 59 | 0 | 0 |
| workspace-status.helper.spec.ts | 42 | 42 | 0 | 0 |
| business-actions.service.spec.ts | 25 | 25 | 0 | 0 |
| notifications.service.spec.ts | 34 | 24 | 10 | 0 |
| workspaces.service.activity.spec.ts | 18 | 18 | 0 | 0 |
| dashboard.service.spec.ts | 17 | 17 | 0 | 0 |
| file-attachments.service.spec.ts | 17 | 17 | 0 | 0 |
| realtime.gateway.spec.ts | 8 | 8 | 0 | 0 |
| (other suites) | ~32 | ~32 | 0 | 0 |
| **TOTAL (Unit 62)** | **252** | **242** | **10** | **0** |

Skipped test explanation: 10 skipped tests in `notifications.service.spec.ts` are documented frontend manual verification cases that require a live browser (Web Audio API, desktop notification permission, multi-tab sound coordination). These cannot be run in a Node.js test environment. They are documented as manual verification checklist items and do not represent unknown failures.

---

## Phase G — Seed Safety Analysis

The `packages/db/prisma/seed.ts` script:

| Action | Safe for production? | Notes |
|---|---|---|
| Department upsert | ✅ YES | Updates name only if code matches |
| Role upsert | ✅ YES | Updates displayName/description only |
| Permission upsert | ✅ YES | Updates displayName/description only |
| Role-permission upsert | ✅ YES | Idempotent; adds missing mappings, never removes |
| Super Admin user upsert | ✅ YES | `update: {}` — does NOT update existing user password or fields |
| Demo users | ✅ N/A | No demo users in seed.ts (only `admin@recafco.com`) |

**Verdict: Seed is safe to run on production. It is strictly additive and idempotent.**

---

## Phase H — Environment Variable Assessment

| Variable | Dev Value | Production Status |
|---|---|---|
| PORT | 4000 | ✅ OK |
| CORS_ORIGIN | localhost:3000 | ⚠️ MUST CHANGE to server LAN URL |
| DATABASE_URL | localhost:5432 | ⚠️ VERIFY host/password on server |
| JWT_SECRET | placeholder text | ⚠️ MUST CHANGE to strong random 64-char |
| JWT_EXPIRES_IN | 8h | ✅ OK |
| UPLOAD_DIR | ../../uploads (relative) | ⚠️ MUST CHANGE to absolute path |
| MAX_FILE_SIZE_MB | 50 | ✅ OK |
| NODE_ENV | not set | ⚠️ ADD: NODE_ENV=production |
| NEXT_PUBLIC_API_URL | localhost:4000 | ⚠️ MUST CHANGE to server LAN URL |

---

## Phase I — Known Risks and Remaining Items

| Risk | Severity | Mitigation |
|---|---|---|
| Uncommitted working tree changes not in git | HIGH | Must commit before release; deploy from committed code |
| No PM2 ecosystem.config.js in repo | MEDIUM | Provided in company-server-update.md |
| JWT_SECRET not production-grade in dev .env | HIGH | Must be replaced before deployment |
| CORS_ORIGIN pointing to localhost | HIGH | Must be changed to server URL |
| UPLOAD_DIR relative path | MEDIUM | Must be absolute path on server |
| Existing workspaces with visibility='ORGANIZATION' | LOW | Code tolerates both values; no data loss |
| Staging rehearsal not run locally | MEDIUM | Must be run on server against production backup copy |

---

## Final Pre-Flight Decision

**CONDITIONAL GO** — Code quality, migration safety, and build health meet all technical
acceptance criteria. The following three conditions must be completed on the production server
before deployment begins:

1. ✅ Commit all working tree changes to a release commit
2. ✅ Complete database backup and verify pg_restore --list passes
3. ✅ Complete file storage backup and verify file counts match
4. ✅ Update production .env files (CORS_ORIGIN, JWT_SECRET, UPLOAD_DIR)
5. ✅ Run staging rehearsal (prisma migrate deploy against backup copy)

After all 5 conditions are met: **GO for deployment.**
