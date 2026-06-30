# Company Server Update Procedure — AuditFlow ISO

Release: auditflow-ims-2026-06-24-r3  
Commit: 7cfddfa  
Date: 2026-06-24  
Target: RECAFCO company Windows server  
Previous release: auditflow-ims-2026-06-22-r1 (commit 994d993)

**DO NOT PROCEED WITHOUT READING rollback-plan.md FIRST.**  
**DO NOT EXECUTE THIS PROCEDURE WITHOUT A COMPLETED DATABASE BACKUP.**

---

## Pre-Flight Requirements (complete before starting)

- [ ] All modified files committed and pushed to git main branch
- [ ] `pnpm --filter api build` exits 0 on the release machine
- [ ] `pnpm --filter web build` exits 0 on the release machine (22 routes — adds /executive-dashboard)
- [ ] Pre-deployment database backup completed and verified (see Section 2)
- [ ] Pre-deployment file backup completed and verified (see Section 3)
- [ ] Pre-deployment count baseline recorded (see production-data-baseline.md)
- [ ] Maintenance window announced to users
- [ ] IT admin is available for the full maintenance window

---

## Section 1 — Prepare Release Directory on Server

```cmd
REM 1. Create releases directory structure
mkdir C:\RecafcoServer\releases
mkdir C:\RecafcoServer\backups
mkdir C:\RecafcoServer\logs

REM 2. Create the new release directory
mkdir C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1

REM 3. Clone / copy the latest code (option A: git)
cd C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1
git clone <repo-url> .
git checkout main
git log --oneline -3
REM Confirm latest commit hash matches release identifier

REM 4. OR copy from local machine (option B: xcopy/robocopy)
REM    Copy everything EXCEPT: node_modules, .next, dist, uploads, .env files
```

---

## Section 2 — Database Backup (MANDATORY — DO NOT SKIP)

```cmd
REM Create backup directory with timestamp
set BACKUP_TS=2026-06-22_predeploy
set BACKUP_DIR=C:\RecafcoServer\backups

REM Full custom-format backup (includes schema + data + migration table)
pg_dump -U postgres -d auditflow_ims -F c -f "%BACKUP_DIR%\AuditFlow_IMS_predeploy_%BACKUP_TS%.dump" -v

REM Schema-only plain SQL backup (for inspection)
pg_dump -U postgres -d auditflow_ims -F p --schema-only -f "%BACKUP_DIR%\AuditFlow_IMS_predeploy_%BACKUP_TS%_schema.sql"

REM Verify backup file exists and is non-zero
dir "%BACKUP_DIR%\AuditFlow_IMS_predeploy_%BACKUP_TS%.dump"

REM Validate backup can be listed (structural check)
pg_restore --list "%BACKUP_DIR%\AuditFlow_IMS_predeploy_%BACKUP_TS%.dump" | head -20

REM Record checksum
certutil -hashfile "%BACKUP_DIR%\AuditFlow_IMS_predeploy_%BACKUP_TS%.dump" SHA256
REM Save this checksum in a text file next to the backup
```

**STOP if backup file is zero bytes or pg_restore --list fails.**

---

## Section 3 — File Storage Backup (MANDATORY — DO NOT SKIP)

```cmd
REM Copy production upload directory to timestamped backup
robocopy "C:\RecafcoServer\uploads" "C:\RecafcoServer\backups\uploads_2026-06-22" /E /NFL /NDL /NJH /NJS

REM Verify file counts match
powershell "Get-ChildItem -Recurse 'C:\RecafcoServer\uploads' | Measure-Object | Select-Object Count"
powershell "Get-ChildItem -Recurse 'C:\RecafcoServer\backups\uploads_2026-06-22' | Measure-Object | Select-Object Count"
REM Counts must be equal before proceeding
```

---

## Section 4 — Record Pre-Deployment Baseline

Run all queries in `production-data-baseline.md` Step 2 and save the output to a text file.

```cmd
psql -U postgres -d auditflow_ims -c "SELECT COUNT(*) FROM users;" >> C:\RecafcoServer\backups\baseline_2026-06-22.txt
REM (run all baseline queries and redirect to the baseline file)
```

---

## Section 5 — Install Dependencies and Build on Server

```cmd
REM Navigate to release directory
cd C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1

REM CRITICAL: Preserve production .env files — DO NOT overwrite with dev .env
REM Copy production .env files into place:
copy C:\RecafcoServer\config\api.env apps\api\.env
copy C:\RecafcoServer\config\web.env apps\web\.env.local
copy C:\RecafcoServer\config\db.env packages\db\.env

REM Install dependencies (frozen lockfile — no version drift)
pnpm install --frozen-lockfile

REM Generate Prisma client
cd packages\db
pnpm exec prisma generate
cd C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1

REM Build API
pnpm --filter api build
REM Expected: EXIT:0, no TypeScript errors

REM Build web
pnpm --filter web build
REM Expected: EXIT:0, 21 routes

REM If either build fails: STOP. Fix issue. Do not proceed.
```

---

## Section 6 — Migration Status Check

```cmd
cd packages\db

REM Check which migrations have already been applied on production
pnpm exec prisma migrate status
REM Review output carefully:
REM   Applied: migrations already in production DB
REM   Pending: migrations that will run on deploy
REM
REM   Release auditflow-ims-2026-06-24-r3: 19 total migrations.
REM   If server is on auditflow-ims-2026-06-22-r1 (15 migrations applied),
REM   expect 4 PENDING migrations:
REM     20260623000000_add_task_approval_status
REM     20260623010000_add_file_validity_period
REM     20260624000000_add_job_title_dashboard_experience
REM     20260624010000_add_workspace_visibility_mode
REM
REM   Run Step 2 of pre-deployment-checklist.md before migration.
```

---

## Section 7 — Run Prisma Migrate Deploy

```cmd
REM ONLY run after backup is verified and build passes
pnpm exec prisma migrate deploy

REM Expected output: "X migrations applied" or "Database schema is up to date"
REM STOP if: any migration failure, constraint violation, error output
```

---

## Section 8 — Permission Reconciliation (Safe Upsert — CONDITIONAL)

**Unit 66 audit finding: Seed is NOT required for this release.**
All new fields (dashboardExperience, workspaceVisibilityMode, jobTitle, approval_status, validity_period)
have safe defaults from migration SQL and do not require seed updates.

Run the seed ONLY if a specific new permission key was added to the seed and is required by the new release.
If running seed:

```cmd
cd packages\db
pnpm exec ts-node prisma/seed.ts
REM The seed uses upsert — it will NOT create demo users, reset passwords,
REM or remove existing data. It WILL add missing permissions and role mappings.
REM Admin user update branch is update:{} — existing password and fields are preserved.
```

---

## Section 9 — Stop Old PM2 Processes

```cmd
REM Record current state before stopping
pm2 list
pm2 save --force
REM Note: PID, uptime, restart count for comparison after deployment

REM Stop (not delete) old processes
pm2 stop auditflow-api
pm2 stop auditflow-web

REM Verify no stale Node process is still bound to ports 4000 and 3000
netstat -ano | findstr ":4000"
netstat -ano | findstr ":3000"
REM If any PID still shows, kill it:
REM taskkill /PID <pid> /F
```

---

## Section 10 — Start New Release

Create or update PM2 ecosystem file:

```js
// C:\RecafcoServer\releases\auditflow-ims-2026-06-24-r3\ecosystem.config.js
// NOTE: There is NO start-web.cmd in the repository. The web process is started
// via node_modules/.bin/next with 'start -p 3000' args. This is the authoritative
// web startup method for all PM2 deployments.
module.exports = {
  apps: [
    {
      name: 'auditflow-api',
      script: 'dist/main.js',
      cwd: 'C:\\RecafcoServer\\releases\\auditflow-ims-2026-06-24-r3\\apps\\api',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 5,
      out_file: 'C:\\RecafcoServer\\logs\\api-out.log',
      error_file: 'C:\\RecafcoServer\\logs\\api-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'auditflow-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: 'C:\\RecafcoServer\\releases\\auditflow-ims-2026-06-24-r3\\apps\\web',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 5,
      out_file: 'C:\\RecafcoServer\\logs\\web-out.log',
      error_file: 'C:\\RecafcoServer\\logs\\web-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
```

```cmd
REM Start processes
cd C:\RecafcoServer\releases\auditflow-ims-2026-06-22-r1
pm2 start ecosystem.config.js

REM Wait 10 seconds for startup
timeout /t 10

REM Verify processes are running
pm2 list
REM Expected: auditflow-api online, auditflow-web online

REM Check startup logs
pm2 logs auditflow-api --lines 20
REM Expected: "Nest application successfully started on port 4000"
REM Expected: All module routes registered (look for "RouterExplorer" lines)

REM Save PM2 state for auto-restart on server reboot
pm2 save

REM If server uses pm2-startup or Windows Task Scheduler:
pm2 startup  REM (follow instructions shown)
```

---

## Section 11 — Post-Deployment Verification

Run the full smoke test from `post-deploy-smoke-test.md`.

All 13 steps must pass before ending the maintenance window.

---

## Section 12 — End Maintenance Window

```cmd
REM After smoke test passes:
REM 1. Record deployment completion time
REM 2. Notify users that the system is back online
REM 3. Monitor pm2 logs for first 30 minutes
pm2 logs --lines 50

REM 4. Check for any 500 errors in the first hour
pm2 logs auditflow-api --lines 200 | findstr /i "error\|exception\|500"
```

---

## Stale Build Protection

To prevent the Unit 56.2 incident (stale dist serving old routes):

After starting PM2, verify these routes return 401 (not 404):

```powershell
$routes = @(
    "http://localhost:4000/business-actions/items",
    "http://localhost:4000/tasks/transitions",
    "http://localhost:4000/dashboard/my-tasks",
    "http://localhost:4000/workspaces"
)
foreach ($r in $routes) {
    $res = Invoke-WebRequest -Uri $r -Method GET -ErrorAction SilentlyContinue
    Write-Host "$r → $($res.StatusCode)"
}
# Expected: all 401. 404 means the route is not in dist — rebuild is needed.
```

---

## Downtime Estimate

| Phase | Estimated Time |
|---|---|
| DB backup | 5–15 min (depends on DB size) |
| File backup | 5–20 min (depends on upload volume) |
| Dependency install | 5–10 min |
| Build API + Web | 3–5 min |
| Migration deploy | 1–3 min |
| Process restart | 1–2 min |
| Smoke test | 15 min |
| **Total** | **35–70 min** |

Plan for a 90-minute maintenance window to be safe.
