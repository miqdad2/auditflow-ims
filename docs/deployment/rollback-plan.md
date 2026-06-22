# Rollback Plan — AuditFlow IMS Production

Generated: 2026-06-22  
Release: auditflow-ims-2026-06-22-r1

---

## Rollback Triggers

Initiate rollback immediately if any of the following occur after deployment:

| # | Trigger | Severity |
|---|---|---|
| R1 | Migration fails mid-run (partial schema change) | CRITICAL — restore DB immediately |
| R2 | API fails to start (Prisma errors, missing module, port conflict) | CRITICAL |
| R3 | Login fails for existing users | CRITICAL |
| R4 | Existing users are missing (count reduced) | CRITICAL |
| R5 | Existing workspace/task/document data missing | CRITICAL |
| R6 | File download fails (404, 500, path errors) | HIGH |
| R7 | High 500 rate (>5% of requests) in first 15 minutes | HIGH |
| R8 | Critical workflow broken (task status change, file upload, notification) | HIGH |
| R9 | Unauthorized access confirmed (user can see other workspace data) | CRITICAL — stop immediately |
| R10 | PM2 process fails to stay running (crash loop) | HIGH |

---

## Rollback Decision Window

- Smoke test window: 15 minutes after deployment
- Extended monitor window: 24 hours (first working day)
- **Rollback is simplest within the first 15 minutes** before new data is written by users
- After 24 hours, a database restore becomes more complex (new data would be lost)

---

## Rollback Types

### Type 1 — Code-Only Rollback (safest, no data loss)

Use this when:
- The bug is in application code only
- All 15 migrations applied successfully
- New DB schema is backward-compatible with old code (verified: all migrations are additive)

Since all migrations in this release are **strictly additive** (no column drops, no type changes, no renames),
the old application code can run against the new schema. New columns/tables are simply ignored by old code.

**Verdict: Code-only rollback is SAFE for this release.**

Steps:
```cmd
REM 1. Stop current PM2 processes
pm2 stop auditflow-api
pm2 stop auditflow-web

REM 2. Point PM2 to previous release directory
REM    Edit ecosystem.config.js: change cwd to previous release path
REM    e.g. from: C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1\apps\api
REM         to:   C:\RecafcoServer\releases\auditflow-ims-previous\apps\api

REM 3. Start old processes
pm2 start ecosystem.config.js

REM 4. Verify login works
REM 5. Verify existing tasks/workspaces visible

REM Expected data loss: NONE (no DB restore needed)
REM New writes since deployment: preserved (they exist in DB)
```

---

### Type 2 — Database Restore Rollback (use only for migration failure or data corruption)

Use this when:
- Migration failed mid-run and schema is in a broken state
- Data corruption is confirmed
- Type 1 rollback is not sufficient

**WARNING:** Any writes made after the deployment timestamp will be lost.

Steps:
```cmd
REM 1. Stop ALL PM2 processes immediately
pm2 stop all

REM 2. Drop or rename the broken database
REM    (DANGEROUS — confirm backup exists first!)
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='auditflow_ims' AND pid <> pg_backend_pid();"

REM 3. Create a fresh database with the original name
psql -U postgres -c "DROP DATABASE IF EXISTS auditflow_ims_broken;"
psql -U postgres -c "ALTER DATABASE auditflow_ims RENAME TO auditflow_ims_broken;"
psql -U postgres -c "CREATE DATABASE auditflow_ims;"

REM 4. Restore from pre-deployment backup
pg_restore -U postgres -d auditflow_ims -v "C:\RecafcoServer\backups\AuditFlow_IMS_predeploy_2026-06-22_143000.dump"

REM 5. Verify restore succeeded
psql -U postgres -d auditflow_ims -c "SELECT COUNT(*) FROM users;"

REM 6. Start old release
cd C:\RecafcoServer\releases\auditflow-ims-previous
pm2 start ecosystem.config.js

REM 7. Verify login works with existing users

REM Expected data loss: Any writes made between deployment start and rollback completion
```

---

### Type 3 — File Storage Rollback

Use this when:
- Upload directory was accidentally cleared or corrupted
- Files are missing after deployment

```cmd
REM 1. Stop API (prevent new uploads during restore)
pm2 stop auditflow-api

REM 2. Back up current (possibly corrupted) upload directory
xcopy /E /I /Y "C:\RecafcoServer\uploads" "C:\RecafcoServer\uploads_post_deploy_corrupted"

REM 3. Restore from pre-deployment file backup
robocopy "C:\RecafcoServer\backups\uploads_2026-06-22" "C:\RecafcoServer\uploads" /MIR /NFL /NDL

REM 4. Verify file count
powershell "Get-ChildItem -Recurse 'C:\RecafcoServer\uploads' | Measure-Object | Select-Object Count"

REM 5. Restart API
pm2 start auditflow-api
```

---

## Backward Compatibility Verification

This release adds the following to the schema (verified additive-only):
- `tasks.isReference` BOOLEAN DEFAULT false
- `tasks.recurrenceInterval` TEXT DEFAULT 'NONE'
- `tasks.recurrenceEndDate` nullable
- `tasks.recurrenceSeriesId` nullable
- `tasks.recurrenceParentId` nullable
- `tasks.sortOrder` INTEGER DEFAULT 0
- `file_attachments.displayName/issueDate/expiryDate/reminderDays/notes/isSuperseded/renewedFromId` (nullable/defaults)
- `notifications.severity` TEXT DEFAULT 'INFO'
- `notifications.deepLink` nullable
- `notifications.workspaceId` nullable
- `activity_events.metadata` JSONB nullable
- `workspaces.departmentId` nullable
- `workspaces.visibility` TEXT DEFAULT 'PRIVATE'
- New tables: `workspace_members`, `workspace_pinned_items`, `linked_records`, `system_error_logs`

**All new columns have safe defaults or are nullable. Old application code that does not know about
these columns will silently ignore them. Code-only rollback is safe.**

---

## Post-Rollback Checklist

After any rollback:
- [ ] Login works for Super Admin
- [ ] Login works for normal user
- [ ] Dashboard loads
- [ ] Existing workspace visible
- [ ] Existing task visible
- [ ] File download works
- [ ] PM2 shows no crash loops (`pm2 list`)
- [ ] Notify IT admin that rollback was performed and reason
- [ ] Preserve PM2 logs from failed deployment for investigation
