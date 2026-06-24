# Rollback Procedure — AuditFlow IMS

Release: auditflow-ims-2026-06-24-r3
Previous stable release: auditflow-ims-2026-06-22-r1 (commit 994d993)
Date: 2026-06-24

---

## Rollback Decision

Initiate rollback IMMEDIATELY if any of the following occur after deployment:

| # | Trigger | Severity | Rollback Type |
|---|---|---|---|
| R1 | Migration fails mid-run | CRITICAL | Type 2 (DB restore) |
| R2 | API fails to start | CRITICAL | Type 1 (code only) |
| R3 | Login fails for any existing user | CRITICAL | Type 1 first, Type 2 if data issue |
| R4 | User count decreased unexpectedly | CRITICAL | Type 2 |
| R5 | Workspace/task/document data missing | CRITICAL | Type 2 |
| R6 | File download returns 404 or 500 | HIGH | Type 1 + Type 3 if files damaged |
| R7 | >5% 500-rate in first 15 minutes | HIGH | Type 1 |
| R8 | Critical workflow broken (tasks, files, notifications) | HIGH | Type 1 |
| R9 | Cross-user data leakage confirmed | CRITICAL | Type 1, stop immediately |
| R10 | PM2 crash loop (>5 restarts in 5 min) | HIGH | Type 1 |
| R11 | dashboardExperience or workspaceVisibilityMode data corrupt | HIGH | Type 2 |

**Rollback decision window:**
- Simplest within first 15 minutes (before users write new data)
- After 24 hours: database restore loses user data since deployment

---

## Compatibility Note for This Release

All 4 pending migrations are STRICTLY ADDITIVE:
- New columns all have safe defaults (NOT NULL with DEFAULT or nullable)
- No column drops, no column renames, no type changes
- No existing rows deleted
- No foreign key changes

**This means: the previous release code (auditflow-ims-2026-06-22-r1) can run against the new schema without errors.** New columns are simply ignored by old code.

**Code-only rollback (Type 1) is ALWAYS safe for this release.**

---

## Type 1 — Code-Only Rollback

Use when: application code has a bug, API fails to start, crash loop.
**Does NOT require database restore. No data lost.**

```cmd
REM 1. Stop new release processes
pm2 stop auditflow-api
pm2 stop auditflow-web
pm2 stop auditflow-proxy

REM 2. Navigate to previous stable release directory
REM    (must exist at C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1)

REM 3. Update ecosystem.config.js cwd to point to previous release
REM    Edit: cwd: 'C:\\RecafcoServer\\releases\\auditflow-ims-2026-06-22-r1\\apps\\api'
REM    Edit: cwd: 'C:\\RecafcoServer\\releases\\auditflow-ims-2026-06-22-r1\\apps\\web'

REM 4. Start old processes from previous release
cd C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1
pm2 start ecosystem.config.js

REM 5. Verify
pm2 list
REM Expected: auditflow-api online, auditflow-web online
```

Post-rollback verification:
- [ ] Login works for Super Admin
- [ ] Login works for normal user
- [ ] Dashboard loads
- [ ] Existing workspace visible
- [ ] Existing task visible
- [ ] File download works
- [ ] `pm2 list` shows no crash loops

**Expected data loss: NONE**
New columns added by migration 16-19 are ignored by old code. Any writes made between deployment and rollback are preserved.

---

## Type 2 — Database Restore Rollback

Use ONLY when:
- Migration failed mid-run and schema is in a broken state
- Data corruption confirmed
- User/task/document counts decreased unexpectedly

**WARNING: Any writes made after deployment timestamp will be LOST.**

```cmd
REM 0. STOP all PM2 processes first
pm2 stop all

REM 1. Verify backup exists and is non-zero
dir "C:\RecafcoServer\backups\AuditFlow_IMS_2026-06-24_predeploy.dump"

REM 2. Terminate active DB connections
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='auditflow_ims' AND pid <> pg_backend_pid();"

REM 3. Rename broken database
psql -U postgres -c "ALTER DATABASE auditflow_ims RENAME TO auditflow_ims_broken_2026_06_24;"

REM 4. Create fresh database
psql -U postgres -c "CREATE DATABASE auditflow_ims;"

REM 5. Restore from pre-deployment backup
pg_restore -U postgres -d auditflow_ims -v "C:\RecafcoServer\backups\AuditFlow_IMS_2026-06-24_predeploy.dump"

REM 6. Verify restore succeeded
psql -U postgres -d auditflow_ims -c "SELECT COUNT(*) FROM users;"

REM 7. Start previous release
cd C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1
pm2 start ecosystem.config.js

REM 8. Verify login works
```

**Expected data loss:** Any writes made between deployment start and rollback completion.

---

## Type 3 — File Storage Rollback

Use ONLY when: upload directory was accidentally damaged or files are missing.

```cmd
REM 1. Stop API to prevent new uploads during restore
pm2 stop auditflow-api

REM 2. Preserve current (possibly corrupted) uploads
xcopy /E /I /Y "C:\RecafcoServer\uploads" "C:\RecafcoServer\uploads_post_deploy_corrupted"

REM 3. Restore from pre-deployment file backup
robocopy "C:\RecafcoServer\backups\uploads_2026-06-24" "C:\RecafcoServer\uploads" /MIR

REM 4. Verify file count matches
powershell "Get-ChildItem -Recurse 'C:\RecafcoServer\uploads' | Measure-Object | Select-Object Count"

REM 5. Restart API
pm2 start auditflow-api
```

---

## Rollback Type Decision Tree

```
Application fails to start or crashes repeatedly
  → Type 1 (code only) — no DB restore

Login fails for existing users
  → Check if users still exist: psql -c "SELECT COUNT(*) FROM users;"
  → If users exist: Type 1 (code issue)
  → If user count decreased: Type 2 (data issue)

Migration failed with partial output
  → Check _prisma_migrations table for "rolled_back" entries
  → Type 2 if schema is broken, Type 1 if migration completed but code is broken

File downloads return 404
  → Check if file exists on disk: Test-Path "C:\RecafcoServer\uploads\<storagePath>"
  → If file missing: Type 3
  → If file exists but 404: Type 1 (path resolution issue in code)

Cross-user data leakage
  → Stop API immediately: pm2 stop auditflow-api
  → Investigate logs, do NOT restart until root cause identified
  → Rollback Type 1 or 2 depending on cause
```

---

## After Any Rollback

- [ ] Run production-data-baseline.md queries to confirm data integrity
- [ ] Notify IT admin that rollback was performed and reason
- [ ] Preserve PM2 logs from failed deployment: `pm2 logs --lines 500 > C:\RecafcoServer\logs\failed_deploy_2026-06-24.txt`
- [ ] Keep broken database as `auditflow_ims_broken_2026_06_24` for investigation (do not delete immediately)
- [ ] Document exact failure point and error before next deployment attempt

---

## Rollback Contact

IT admin must be present during the rollback window.
Do not attempt rollback unattended if database restore is required.
