# Deployment Day Checklist — AuditFlow ISO

Release: auditflow-ims-2026-06-24-r3
Commit: 7cfddfa
Date: 2026-06-24

**Read pre-deployment-checklist.md first. All items there must be complete before starting here.**

Each step must pass before moving to the next.
Any FAIL triggers the rollback procedure (see rollback-procedure.md).

---

## Phase 1 — Code Update

- [ ] Navigate to release directory on server
- [ ] `git fetch origin`
- [ ] `git checkout main && git pull --ff-only`
- [ ] `git rev-parse --short HEAD` returns `7cfddfa`
- [ ] Verify production .env files are in place:
  - `apps/api/.env` exists with production values
  - `apps/web/.env` has `NEXT_PUBLIC_API_URL=/api` and `NEXT_PUBLIC_SOCKET_URL=`
  - No `apps/web/.env.local` with conflicting values

---

## Phase 2 — Dependencies and Prisma

- [ ] `pnpm install --frozen-lockfile` exits 0
- [ ] `pnpm --filter db exec prisma validate` exits 0 ("schema is valid")
- [ ] `pnpm --filter db exec prisma migrate status` — review output carefully:
  - Record which migrations are currently applied to production
  - Confirm exactly 4 pending migrations:
    1. `20260623000000_add_task_approval_status`
    2. `20260623010000_add_file_validity_period`
    3. `20260624000000_add_job_title_dashboard_experience`
    4. `20260624010000_add_workspace_visibility_mode`
  - Confirm no unexpected "failed" or "rolled back" migrations

---

## Phase 3 — Migration

- [ ] Final backup checkpoint — confirm backup from pre-deployment-checklist.md exists and is verified
- [ ] `pnpm --filter db exec prisma migrate deploy`
- [ ] Output shows: "4 migrations applied" (or 4 if starting from the 2026-06-22-r1 baseline)
- [ ] No error output from migration
- [ ] `pnpm --filter db exec prisma migrate status` shows "Database schema is up to date"
- [ ] Verify new columns exist:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'tasks' AND column_name = 'approval_status';

  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name IN ('jobTitle', 'dashboardExperience', 'workspaceVisibilityMode');

  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'file_attachments' AND column_name = 'validity_period';
  ```
- [ ] Verify existing user rows were safely migrated:
  ```sql
  SELECT COUNT(*) FROM users WHERE "dashboardExperience" = 'STANDARD';
  SELECT COUNT(*) FROM users WHERE "workspaceVisibilityMode" = 'SELECTED';
  SELECT COUNT(*) FROM users WHERE "jobTitle" IS NOT NULL;
  -- Expected: all users have STANDARD, all have SELECTED, most have NULL jobTitle
  ```
- [ ] Verify existing task rows:
  ```sql
  SELECT COUNT(*) FROM tasks WHERE approval_status = 'APPROVED';
  SELECT COUNT(*) FROM tasks WHERE approval_status = 'PENDING';
  -- Expected: most tasks are APPROVED (all pre-existing ones), new member tasks may be PENDING
  ```

---

## Phase 4 — Prisma Client and Builds

- [ ] `pnpm --filter db exec prisma generate` exits 0
- [ ] `pnpm --filter api build` exits 0 (no TypeScript errors)
- [ ] `apps/api/dist/main.js` exists and is recent
- [ ] `pnpm --filter web build` exits 0 — 22 routes expected:
  - `/`, `/_not-found`, `/action-center`, `/admin/settings`, `/admin/system-errors`, `/admin/system-health`
  - `/change-password`, `/checklist`, `/dashboard`, `/departments`, `/documents`, `/documents/[id]`
  - `/evidence`, `/executive-dashboard`, `/login`, `/ncr-capa`, `/notifications`, `/reports`
  - `/tasks`, `/users`, `/workspaces`, `/workspaces/[id]`

---

## Phase 5 — Caddy Configuration

Verify Caddyfile contains the Socket.IO route BEFORE the /api route:

```caddy
:80 {
    handle /socket.io/* {
        reverse_proxy 127.0.0.1:4000 {
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }

    handle_path /api/* {
        reverse_proxy 127.0.0.1:4000
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

- [ ] Caddyfile contains `/socket.io/*` route BEFORE `/api/*`
- [ ] `& "C:\Caddy\caddy.exe" validate --config "C:\Caddy\Caddyfile"` exits 0

---

## Phase 6 — Process Restart

- [ ] Record current PM2 state: `pm2 list`
- [ ] `pm2 stop auditflow-api`
- [ ] `pm2 stop auditflow-web`
- [ ] Verify ports are free:
  ```cmd
  netstat -ano | findstr ":4000"
  netstat -ano | findstr ":3000"
  ```
  (No output = ports are free. If PID shown: `taskkill /PID <pid> /F`)
- [ ] Start processes with ecosystem.config.js (update cwd paths to new release directory)
- [ ] `pm2 start ecosystem.config.js`
- [ ] Wait 15 seconds for startup
- [ ] `pm2 list` shows both processes as **online** (not errored)
- [ ] `pm2 logs auditflow-api --lines 30` shows:
  - "Nest application successfully started on port 4000"
  - No PrismaClientInitializationError
  - No MODULE_NOT_FOUND errors
  - No EADDRINUSE errors
- [ ] Reload Caddy:
  ```cmd
  & "C:\Caddy\caddy.exe" reload --config "C:\Caddy\Caddyfile"
  ```

---

## Phase 7 — Stale Build Verification

Verify key routes return 401 (not 404 — 404 means route not in dist):

```powershell
Invoke-WebRequest -Uri http://localhost:4000/health -ErrorAction SilentlyContinue | Select-Object StatusCode
# Expected: 200

Invoke-WebRequest -Uri http://localhost:4000/business-actions/items -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
Invoke-WebRequest -Uri http://localhost:4000/tasks -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
Invoke-WebRequest -Uri http://localhost:4000/dashboard/executive -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
Invoke-WebRequest -Uri http://localhost:4000/workspaces -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
# Expected: all 401. 404 = route not in dist = rebuild required.
```

- [ ] `GET /health` returns 200
- [ ] `GET /business-actions/items` returns 401
- [ ] `GET /tasks` returns 401
- [ ] `GET /dashboard/executive` returns 401
- [ ] `GET /workspaces` returns 401

---

## Phase 8 — Caddy Proxy Verification

```cmd
curl.exe -I http://localhost/
curl.exe -i "http://localhost/api/health"
curl.exe -i "http://localhost/socket.io/?EIO=4&transport=polling"
```

- [ ] `GET /` returns 200 (Next.js login page HTML)
- [ ] `GET /api/health` returns 200 with `{"status":"ok"}` or similar
- [ ] `GET /socket.io/?EIO=4&transport=polling` returns 200 with JSON beginning `0{"sid":`
  (NOT Next.js HTML, NOT 404)

---

## Phase 9 — Data Count Comparison

Run all queries from `production-data-baseline.md` Step 2.
Compare against pre-deploy baseline recorded in Phase 0.

- [ ] Total users: unchanged (no reduction)
- [ ] Active users: unchanged
- [ ] Workspace members: unchanged
- [ ] Total tasks: unchanged
- [ ] Total file attachments: unchanged
- [ ] Total documents: unchanged
- [ ] Audit log entries: same or higher (migration may add entries)
- [ ] All users have `dashboardExperience = 'STANDARD'` (unless manually set otherwise)
- [ ] All users have `workspaceVisibilityMode = 'SELECTED'` (unless manually set otherwise)

---

## Phase 10 — Authentication Regression (two browser sessions)

### Existing Standard user
- [ ] Login works with existing password
- [ ] Lands on `/dashboard`
- [ ] Existing workspace memberships visible
- [ ] Existing tasks visible

### Super Admin account
- [ ] Login works
- [ ] Lands on `/dashboard`
- [ ] Full access confirmed (Users, Workspaces, Reports, Admin sections)

### Super User account (if exists)
- [ ] Login works
- [ ] Action Center accessible
- [ ] Protected technical users not visible
- [ ] Technical admin routes blocked

### Temporary-password user (if any)
- [ ] Login works with temporary password
- [ ] Forced password change screen appears
- [ ] Weak password rejected
- [ ] Strong new password accepted
- [ ] Old temporary password rejected after change

### Executive user (if dashboardExperience=EXECUTIVE was set)
- [ ] Login works
- [ ] Forced password reset (if mustChangePassword) fires before executive routing
- [ ] After reset, lands on `/executive-dashboard`
- [ ] No technical/admin access from executive view

---

## Phase 11 — File Download Regression

- [ ] Navigate to Documents page
- [ ] Download an existing uploaded file
- [ ] File downloads successfully (not 404 or 403)
- [ ] Navigate to a workspace with task attachments
- [ ] Download a task attachment
- [ ] File downloads successfully

---

## Phase 12 — Realtime Verification (two browsers)

Open Session A (elevated user) and Session B (any user) in the SAME workspace.

- [ ] Both sessions show socket "Connected" indicator in header
- [ ] Session A: change a task status
- [ ] Session B: sees status change WITHOUT refreshing
- [ ] Session A: add a comment to a task
- [ ] Session B: sees comment WITHOUT refreshing

Reconnect test:
- [ ] Session A connected
- [ ] Temporarily stop auditflow-api (`pm2 stop auditflow-api`)
- [ ] Session A: header shows "Reconnecting" or "Disconnected"
- [ ] Restart auditflow-api (`pm2 start auditflow-api`)
- [ ] Session A: reconnects and header shows "Connected"
- [ ] No duplicate toasts or sounds replayed

---

## Phase 13 — PM2 Save and Monitoring

- [ ] `pm2 save` — saves current process list for auto-restart on server reboot
- [ ] `pm2 logs --lines 100` — no repeated errors, no crash loops
- [ ] `pm2 logs auditflow-api --lines 200 | findstr /i "error\|exception\|500"` — only acceptable warnings

---

## Phase 14 — Final Sign-Off

- [ ] All Phase 7–12 checks passed
- [ ] Data counts unchanged from pre-deployment baseline
- [ ] No critical errors in PM2 logs
- [ ] At least one existing user's login verified
- [ ] At least one existing file download verified
- [ ] Realtime verified in two-browser session
- [ ] End maintenance window
- [ ] Notify users that system is back online
- [ ] Monitor for first 30 minutes: `pm2 logs --lines 50`

---

## If anything FAILS

Stop immediately. Execute rollback-procedure.md.

Record:
- Which phase failed
- Exact error message
- PM2 logs at time of failure
- Timestamp

Do NOT attempt partial fixes during the maintenance window. Rollback first, investigate after.
