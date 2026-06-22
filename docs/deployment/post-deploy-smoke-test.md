# Post-Deployment Smoke Test — AuditFlow IMS

Generated: 2026-06-22  
Release: auditflow-ims-2026-06-22-r1  
Time budget: 15 minutes

Run this checklist immediately after deployment. Each step must pass before moving to the next.
Any FAIL triggers the rollback plan (see rollback-plan.md).

---

## T+0 — Process Health (1 min)

```cmd
pm2 list
REM Expected: auditflow-api status=online, auditflow-web status=online
REM Check: uptime is recent (after deployment), no "errored" status

pm2 logs auditflow-api --lines 30
REM Expected: "Nest application successfully started"
REM No: PrismaClientInitializationError, EADDRINUSE, MODULE_NOT_FOUND
```

---

## T+1 — Health Endpoint (30 sec)

Open in browser on server:
```
http://localhost:4000/health
```
or via PowerShell:
```powershell
Invoke-WebRequest -Uri http://localhost:4000/health | Select-Object StatusCode, Content
```

Expected: HTTP 200, `{"status":"ok"}` or similar.  
FAIL if: 404, 500, connection refused.

---

## T+2 — Super Admin Login (2 min)

1. Open browser → `http://<server-ip>:3000`
2. Login with Super Admin credentials
3. Expected: Redirect to Dashboard
4. Verify: RECAFCO logo visible, sidebar visible, no JavaScript errors in console
5. FAIL if: Login fails, white screen, "Cannot GET /", 500 error

---

## T+3 — Existing Data Visible (2 min)

Still logged in as Super Admin:

1. Open Workspaces page
2. Verify: existing workspaces listed (count matches pre-deploy baseline)
3. Click one existing workspace
4. Verify: existing task lists and tasks visible
5. Click one existing task
6. Verify: task detail panel opens, existing comments visible
7. FAIL if: workspaces empty, tasks missing, task detail crashes

---

## T+4 — Super User Login (1 min)

1. Open new browser tab / incognito
2. Login with Super User credentials
3. Expected: Dashboard loads, Action Center accessible
4. Verify: "Action Center" link visible in sidebar
5. FAIL if: Login fails, Action Center returns 404

---

## T+5 — Normal User Login (1 min)

1. Open new browser tab / incognito
2. Login with a normal staff user account
3. Expected: Dashboard with personal tasks
4. Click "My Tasks"
5. Verify: assigned tasks visible (or empty state — no 500 error)
6. FAIL if: Login fails, My Tasks crashes, 403 for basic routes

---

## T+6 — Existing File Download (2 min)

1. Navigate to Documents
2. Find an existing uploaded document
3. Click Download
4. Verify: file downloads (browser saves file, no 404 or 403)
5. Navigate to a workspace with task files
6. Open a task with an attachment
7. Click download on the attachment
8. Verify: file downloads
9. FAIL if: 404 (file not found on disk), 403 (unauthorized), 500

---

## T+7 — Task Status Change (1 min)

1. As Super User: open an existing workspace task in TODO status
2. Change status to IN_PROGRESS
3. Verify: status updates, no error toast
4. FAIL if: PATCH /tasks/:id/status returns 404, 500, or module not found

---

## T+8 — Notification (1 min)

1. As Super User: assign a task to a normal user
2. Log in as that normal user in another tab
3. Verify: notification bell shows unread count
4. Click notification
5. Verify: notification links to correct task
6. FAIL if: no notification received, deeplink broken

---

## T+9 — Realtime (1 min)

1. Two browser sessions: Super User (Session A) + Normal User (Session B) in same workspace
2. Session A: add a comment to a task
3. Session B: verify comment appears without page refresh
4. FAIL if: realtime completely broken (check pm2 logs for socket errors)
   NOTE: Minor socket reconnection is acceptable; total silence is a FAIL

---

## T+10 — API Route Verification (30 sec)

```powershell
# Verify key routes return 401 (not 404) when no token provided
# 401 = route exists, auth required. 404 = route not registered.
Invoke-WebRequest -Uri http://localhost:4000/dashboard/overview -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
Invoke-WebRequest -Uri http://localhost:4000/business-actions/items -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
Invoke-WebRequest -Uri http://localhost:4000/tasks -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
# Expected: 401 for all. FAIL if: 404 (route not in dist)
```

---

## T+11 — Record Count Comparison (2 min)

Run the queries from `production-data-baseline.md` Step 2 and compare with pre-deploy baseline:

Critical checks:
- Total users: no reduction
- Workspace members: no reduction
- Total tasks: no reduction
- Total attachments: no reduction
- Total documents: no reduction

FAIL if: ANY count decreased unexpectedly.

---

## T+12 — Log Inspection (1 min)

```cmd
pm2 logs auditflow-api --lines 100 | findstr /i "error\|warn\|fail\|exception"
```

ACCEPTABLE warnings: Deprecation notices, optional service timeouts
FAIL: PrismaClientValidationError, UnhandledPromiseRejection, ENOENT for upload directory,
      repeated port binding errors, JWT secret missing

---

## Final Decision

| Step | Pass/Fail | Notes |
|---|---|---|
| T+0 Process Health | | |
| T+1 Health Endpoint | | |
| T+2 Super Admin Login | | |
| T+3 Existing Data | | |
| T+4 Super User Login | | |
| T+5 Normal User Login | | |
| T+6 File Download | | |
| T+7 Task Status | | |
| T+8 Notification | | |
| T+9 Realtime | | |
| T+10 Route Verification | | |
| T+11 Count Comparison | | |
| T+12 Log Inspection | | |

**All PASS → Deployment successful. End maintenance window.**  
**Any FAIL → Execute rollback plan immediately.**
