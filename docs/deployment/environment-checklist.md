# Environment Variable Checklist — AuditFlow IMS Production

Generated: 2026-06-22  
Release: auditflow-ims-2026-06-22-r1

---

## apps/api/.env (on production server)

| Variable | Required | Status in Dev .env | Production Action Required |
|---|---|---|---|
| `PORT` | YES | `4000` | Keep 4000 (or change if port conflict) |
| `CORS_ORIGIN` | YES | `http://localhost:3000` | **MUST CHANGE** to server LAN URL, e.g. `http://192.168.x.x:3000` |
| `DATABASE_URL` | YES | `postgresql://postgres:...@localhost:5432/auditflow_ims?schema=public` | Verify host/password match production PostgreSQL |
| `JWT_SECRET` | YES | `recafco-auditflow-jwt-secret-change-in-production` | **MUST CHANGE** — generate a strong 64-char random secret |
| `JWT_EXPIRES_IN` | YES | `8h` | Keep or adjust to company policy |
| `UPLOAD_DIR` | YES | `../../uploads` (relative) | **MUST CHANGE** to absolute path: e.g. `C:\RecafcoServer\uploads` |
| `MAX_FILE_SIZE_MB` | YES | `50` | Keep or adjust |

### Missing from env (add to production):

| Variable | Recommended Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode for NestJS |
| `LOG_DIR` | `C:\RecafcoServer\logs` | Log output directory |

---

## apps/web/.env.local (on production server)

| Variable | Required | Current Dev Value | Production Action Required |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | YES | `http://localhost:4000` | **MUST CHANGE** to server LAN URL: `http://192.168.x.x:4000` |

---

## packages/db/.env (for Prisma migrations)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | YES | Must match the API `DATABASE_URL` |

---

## CORS / LAN Access Verification

1. Production web is served at: `http://<server-ip>:3000`
2. Production API is served at: `http://<server-ip>:4000`
3. `CORS_ORIGIN` in API must equal the exact web origin employees use
4. `NEXT_PUBLIC_API_URL` in web must equal the exact API origin
5. Socket.IO uses the same `CORS_ORIGIN` env variable (realtime.gateway.ts)
6. No wildcard `*` CORS with credentials — JWT is sent via Authorization header (not cookie)

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random 64+ character string (not the default placeholder)
- [ ] `DATABASE_URL` password is production-grade (not the default `Recafco@12345`)
- [ ] `UPLOAD_DIR` is an absolute path and the directory exists with write permission
- [ ] `CORS_ORIGIN` matches the exact URL employees use in browsers
- [ ] `NODE_ENV=production` is set so NestJS does not run in debug/verbose mode
- [ ] No `.env` file with secrets is committed to git

---

## How to Generate a Strong JWT Secret (Windows PowerShell)

```powershell
# Run on the production server:
[System.Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Copy the output into `JWT_SECRET=<output>` in `apps/api/.env`.

---

## Notes

- `UPLOAD_DIR` relative path `../../uploads` works when NestJS starts from `apps/api/` but may break if PM2 uses a different `cwd`. Use absolute path to eliminate ambiguity.
- `workspaceId` on Notification has no FK constraint (by design) — no migration risk from orphaned workspace references.
- Socket.IO origin lock is in `realtime.gateway.ts` line: `origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000'`. If CORS_ORIGIN is wrong, realtime events will silently fail on the client.
