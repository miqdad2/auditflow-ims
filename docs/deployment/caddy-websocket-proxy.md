# Caddy WebSocket Proxy — Socket.IO Configuration and Production Connection Model

## Required for AuditFlow ISO Realtime

AuditFlow ISO uses Socket.IO for live realtime synchronization across:

- Dashboard auto-refresh (elevated users)
- Workspace task/document/issue/member updates
- Global Tasks page
- Action Center
- Documents list
- Issues list (NCR/CAPA)
- User Management updates
- Departments updates
- Notification badges
- Connection state indicator

Socket.IO must reach the NestJS API on port 4000.

---

## Socket.IO Transport Notes

Socket.IO first attempts WebSocket upgrade.
If WebSocket fails, it falls back to HTTP long-polling.

The client is configured with:

```ts
io(API_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10,
})
```

---

## Required Caddy Route

**IMPORTANT: The `/socket.io/*` route MUST appear BEFORE the general `/api/*` route.**

```caddy
your-domain.com {

    # WebSocket and Socket.IO polling — must route to API (port 4000)
    handle /socket.io/* {
        reverse_proxy 127.0.0.1:4000 {
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }

    # API REST routes
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy 127.0.0.1:4000
    }

    # All other routes → Next.js frontend (port 3000)
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

**Note:** If the API is accessed directly as `http://server:4000` (no path prefix), simplify to:

```caddy
your-domain.com {

    # Socket.IO — must route to API
    handle /socket.io/* {
        reverse_proxy 127.0.0.1:4000 {
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }

    # REST API
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy 127.0.0.1:4000
    }

    # Frontend
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

---

## Verify the Route Works

After deploying, verify Socket.IO can connect:

```bash
# Should return a 101 Switching Protocols or 200 (polling)
curl -v "https://your-domain.com/socket.io/?EIO=4&transport=polling"
```

A 200 response with JSON like `{"sid":"...","upgrades":["websocket"],...}` confirms the route is working.

---

## Production Connection Model (Single-Origin — Recommended)

All browser traffic uses ONE origin (port 80/443). No direct browser access to port 4000.

```
Browser → http://server/             → Caddy → Next.js :3000  (frontend)
Browser → http://server/api/*        → Caddy → NestJS  :4000  (REST API)
Browser → http://server/socket.io/*  → Caddy → NestJS  :4000  (WebSocket)
```

### Required environment variables for production build

Set BEFORE running `pnpm --filter web build`:

```
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SOCKET_URL=
```

An empty `NEXT_PUBLIC_SOCKET_URL` means the socket client uses `window.location.origin`
(the browser's current origin), which routes through Caddy's `/socket.io/*` rule.

### Required Caddy configuration

```caddy
:80 {
    # Socket.IO WebSocket — MUST be before /api/* (more specific route)
    handle /socket.io/* {
        reverse_proxy 127.0.0.1:4000 {
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }

    # REST API — Caddy strips /api before forwarding (NestJS has no global prefix)
    handle_path /api/* {
        reverse_proxy 127.0.0.1:4000
    }

    # Frontend — all other routes
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

### Required NestJS CORS

Set in `apps/api/.env`:
```
CORS_ORIGIN=http://server   (or https://server when TLS is enabled)
```

### Firewall

With single-origin model, port 4000 can remain private (accessible only from localhost/Caddy).
Port 80 (or 443 with TLS) is the only port browsers need.

```
Firewall: open port 80 (or 443)
Firewall: keep port 4000 private (localhost only)
Firewall: keep port 3000 private (localhost only)
```

### Legacy direct-port model

The previous model had browsers connecting directly to port 4000:
```
NEXT_PUBLIC_API_URL=http://192.168.1.69:4000
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.69:4000
```

This still works but requires port 4000 to be open to the network and bypasses Caddy for
API and WebSocket traffic. **The single-origin model is preferred for production.**

## Current Deployment Status

The current company-server deployment MAY still use the legacy direct-port model.

**Action required before production deployment:**

1. Add the Socket.IO route to the Caddyfile (see above)
2. Set production environment variables before rebuilding:
   ```
   NEXT_PUBLIC_API_URL=/api
   NEXT_PUBLIC_SOCKET_URL=
   CORS_ORIGIN=http://server
   ```
3. Rebuild: `pnpm --filter web build`
4. Reload Caddy: `caddy reload --config /etc/caddy/Caddyfile` (or system service restart)
5. Verify: `curl http://server/socket.io/?EIO=4&transport=polling` → 200 with JSON
6. Verify: `curl http://server/api/auth/me` with JWT → 401 (not 404)

---

## Future Multi-Instance Scaling

When running multiple PM2 instances or Node cluster mode, Socket.IO requires a shared pub-sub adapter so events emitted in one process reach clients connected to another.

**Required adapter:** Redis (using `@socket.io/redis-adapter`)

```bash
pnpm add @socket.io/redis-adapter redis
```

**NOT needed for the current single-instance PM2 deployment.**

Document this requirement before scaling to cluster mode.

---

## Socket Authentication

Every Socket.IO connection is authenticated via JWT:

1. Client sends `{ auth: { token } }` on connect
2. `RealtimeGateway.handleConnection()` verifies the JWT
3. If invalid or expired → connection is immediately disconnected
4. User is auto-joined to their private `user:{userId}` room
5. Client calls `join:workspace` per accessible workspace
6. Gateway validates workspace membership before joining room

Forced-password-reset users are blocked at the PermissionsGuard level — socket connection itself is allowed but all business API calls return 403.
