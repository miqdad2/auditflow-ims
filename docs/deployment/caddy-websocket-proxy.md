# Caddy WebSocket Proxy — Socket.IO Configuration

## Required for AuditFlow IMS Realtime

AuditFlow IMS uses Socket.IO for live realtime synchronization across:

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

## Current Production Deployment

The current company-server deployment uses:

```
/api/* → 127.0.0.1:4000   (REST API)
other  → 127.0.0.1:3000   (Next.js frontend)
```

The `/socket.io/*` route is NOT explicitly listed in the current Caddyfile.

**Action required before production deployment:** Add the Socket.IO route to the Caddyfile and reload Caddy:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

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
