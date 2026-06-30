# RECAFCO AuditFlow ISO — Live Demo via ngrok Tunnel

Use this guide to expose the local app to a presentation-room computer via ngrok.
Nothing is deployed. The database stays local. All data is yours.

---

## Prerequisites

- ngrok installed and authenticated: https://ngrok.com/download
  - Free account is enough. Run `ngrok config add-authtoken YOUR_TOKEN` once.
- PostgreSQL running locally (auditflow_ims database)
- pnpm installed at project root

---

## Step 1 — Backup the database (strongly recommended)

Open PowerShell:

```powershell
# Set your DB password (find it in apps/api/.env under DATABASE_URL)
$env:PGPASSWORD = "YOUR_DB_PASSWORD"

# Dump the database
pg_dump -h localhost -p 5432 -U postgres auditflow_ims | `
  Out-File -Encoding utf8 "auditflow_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Verify it created the file
Get-ChildItem auditflow_backup_*.sql
```

---

## Step 2 — Start the NestJS backend

Open Terminal 1:

```powershell
pnpm --filter api start:dev
```

Wait for: `RECAFCO AuditFlow ISO API running on http://localhost:4000`

---

## Step 3 — Verify the backend is healthy

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Expected response: `status: ok`

---

## Step 4 — Start the ngrok tunnel for the backend (API)

Open Terminal 2:

```powershell
ngrok http 4000
```

Copy the **Forwarding** HTTPS URL. It looks like:
```
https://abc123.ngrok-free.app
```

This is your **API tunnel URL**. Keep this terminal open.

---

## Step 5 — Configure the frontend to use the API tunnel URL

Edit `apps/web/.env.local` — change the API URL to the ngrok URL from Step 4:

```
NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

(A template is at `apps/web/.env.demo.local` — copy its content and fill in the URL.)

---

## Step 6 — Configure the backend to allow the frontend tunnel URL

You need the frontend ngrok URL first (Step 7). Come back here after Step 7.

Append this line to `apps/api/.env`:

```
DEMO_ALLOWED_ORIGINS=https://xyz789.ngrok-free.app
```

Replace `xyz789.ngrok-free.app` with your actual frontend tunnel URL from Step 7.

(A template is at `apps/api/.env.demo.local`.)

---

## Step 7 — Start the Next.js frontend

Open Terminal 3:

```powershell
pnpm --filter web dev
```

Wait for: `Ready in X.Xs`

---

## Step 8 — Start the ngrok tunnel for the frontend

Open Terminal 4:

```powershell
ngrok http 3000
```

Copy the **Forwarding** HTTPS URL. It looks like:
```
https://xyz789.ngrok-free.app
```

This is your **frontend tunnel URL**.

---

## Step 9 — Restart both services with the correct URLs

Now that you have both tunnel URLs:

1. **Frontend** (`apps/web/.env.local`) should have the API tunnel URL (from Step 4)
2. **Backend** (`apps/api/.env`) should have `DEMO_ALLOWED_ORIGINS` with the frontend tunnel URL (from Step 8)

Restart Terminal 1 (backend): `Ctrl+C`, then `pnpm --filter api start:dev`
Restart Terminal 3 (frontend): `Ctrl+C`, then `pnpm --filter web dev`

The ngrok tunnels in Terminals 2 and 4 do NOT need to be restarted.

---

## Step 10 — Verify everything works

From your own laptop:

```powershell
# Check API tunnel health
Invoke-RestMethod https://YOUR-API-TUNNEL.ngrok-free.app/health
```

Open in browser:
- `http://localhost:3000` — local frontend (your laptop)
- `https://YOUR-FRONTEND-TUNNEL.ngrok-free.app` — presentation-room computer URL

Test login with a demo account and confirm the dashboard loads.

---

## Step 11 — Open on the presentation-room computer

Give the audience this URL:
```
https://xyz789.ngrok-free.app
```

The first time they open an ngrok URL, their browser may show an ngrok interstitial page.
Click **Visit Site** to proceed. This only appears once per browser session.

---

## Demo Accounts (all passwords: `Recafco@2025!`)

| Role | Email |
|---|---|
| Super Admin | admin@recafco.com |
| ISO Manager | iso.manager@recafco.com |
| HR Manager | hr.manager@recafco.com |
| ICT User | ict.user@recafco.com |
| Auditor (view-only) | auditor@recafco.com |

---

## Two-Browser Realtime Demo Checklist

**Browser A** — login as `iso.manager@recafco.com`
**Browser B** — login as `ict.user@recafco.com`

Open the workspace `[SAMPLE] ISO Audit Readiness 2026` in both browsers.

| # | Action | Expected Result |
|---|---|---|
| 1 | A creates a task in ICT task list | B sees task appear (stale indicator or reload) |
| 2 | B adds a comment on the task | A sees comment appear in task panel |
| 3 | A uploads an attachment | B sees "attachment.created" toast |
| 4 | A changes task status to IN_PROGRESS | B sees status change reflected |
| 5 | A edits a page while B has it open | B sees conflict banner with "Refresh" option |
| 6 | ISO Manager removes ICT user from workspace | ICT user redirected to /workspaces |

---

## Health Check Checklist

Before the presentation starts, verify:

- [ ] `http://localhost:4000/health` → `status: ok`
- [ ] `https://YOUR-API-TUNNEL.ngrok-free.app/health` → `status: ok`
- [ ] `http://localhost:3000` → login page loads
- [ ] `https://YOUR-FRONTEND-TUNNEL.ngrok-free.app` → login page loads on presentation computer
- [ ] Login with `iso.manager@recafco.com` works
- [ ] Dashboard loads with KPI cards
- [ ] Workspace `[SAMPLE] ISO Audit Readiness 2026` opens
- [ ] Socket connected indicator (no "Disconnected" badge in header)
- [ ] Document upload works (test with a small PDF)
- [ ] Two-browser realtime: task created in A appears in B

---

## After the Demo — Cleanup

1. **Restore frontend env** — edit `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

2. **Remove demo CORS from backend** — edit `apps/api/.env` and delete the line:
   ```
   DEMO_ALLOWED_ORIGINS=...
   ```

3. **Stop ngrok tunnels** — `Ctrl+C` in Terminals 2 and 4

4. The `.env.demo.local` template files in `apps/web/` and `apps/api/` can stay (they are gitignored and contain only placeholders).

---

## Troubleshooting

**Socket shows "Disconnected" on the presentation computer**
- Confirm `NEXT_PUBLIC_API_URL` points to the API ngrok URL (not localhost)
- Restart the Next.js dev server after changing `.env.local`
- Check that ngrok tunnel for port 4000 is still running

**CORS error in browser console**
- Confirm `DEMO_ALLOWED_ORIGINS` in `apps/api/.env` matches the exact frontend tunnel URL
- Restart the NestJS backend after changing `.env`

**ngrok interstitial page blocks the app**
- Click "Visit Site" — appears only once per browser session per tunnel URL

**Login works but API calls fail**
- The frontend is still pointing to localhost. Check `NEXT_PUBLIC_API_URL` in `.env.local` and restart `next dev`

**Database connection error**
- PostgreSQL must be running locally. `DATABASE_URL` in `apps/api/.env` never changes for demo.

---

## What This Does NOT Do

- Does not deploy anything to the cloud
- Does not change the database location
- Does not create permanent infrastructure
- Does not store data externally
- Does not expose `DATABASE_URL`, `JWT_SECRET`, or any secret — only the API HTTP port is tunneled
