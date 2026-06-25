# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js + TypeScript | Main web application, dashboards, project views, document library, task UI |
| UI | Tailwind CSS + shadcn/ui + Lucide React | Professional internal workspace UI |
| Backend | NestJS + TypeScript | API, business logic, permissions, workflows, notifications, audit logs |
| Database | PostgreSQL | System of record for users, projects, tasks, documents, checklists, comments, notifications, audit logs |
| ORM | Prisma | Type-safe database access and migrations |
| Auth | Custom username/email + password auth | Internal company authentication |
| File Storage MVP | Local server storage | Store uploaded ISO documents, evidence files, and attachments |
| File Storage Future | MinIO | S3-compatible private object storage for company server deployment |
| Queue Future | Redis + BullMQ | Background reminders, scheduled notifications, file processing |
| Deployment | Local first, company server later | Development locally, later deploy to internal server/VM |

## System Boundaries

- `apps/web/` — Next.js frontend application. Owns UI screens, routing, components, forms, dashboard views, and client-side interactions.
- `apps/api/` — NestJS backend application. Owns API routes, authentication, RBAC, business workflows, reminders, notifications, audit logs, and file upload handling.
- `packages/db/` — Prisma schema, migrations, generated client, and database utilities.
- `packages/shared/` — Shared TypeScript types, enums, validation schemas, constants, and permission definitions.
- `uploads/` — Local file storage directory for MVP. Must not be committed to git.
- `context/` — Project context files, system documentation, workflow notes, architecture decisions, and progress tracker.

## Storage Model

- **PostgreSQL** stores metadata, relationships, permissions, statuses, activity logs, audit logs, notifications, comments, document versions, checklist items, and user assignments.
- **Local file storage** stores physical uploaded files for the MVP.
- **MinIO later** stores physical uploaded files when moved to company server.
- **Database must never store large file binaries.** Only metadata and file paths/keys are stored in PostgreSQL.

## Auth and Access Model

- Every user signs in using company email or username and password.
- Passwords must be securely hashed.
- Users belong to one or more roles.
- Users may optionally belong to a department.
- Access is controlled using role-based permissions.
- Every sensitive mutation must enforce authentication and permission checks in the backend.
- Frontend guards are only for user experience; backend checks are mandatory.
- Audit logs must record important mutations.

## Primary Roles

- `SUPER_ADMIN` — Full system access.
- `IT_ADMIN` — User, role, system configuration, and technical administration.
- `ISO_MANAGER` — Full ISO workspace, audit checklist, document approval, and NCR/CAPA control.
- `QHSE_USER` — Manage ISO tasks, documents, evidence, checklist items, and corrective actions based on permission.
- `DEPARTMENT_MANAGER` — Review department tasks, documents, evidence, and corrective actions.
- `DEPARTMENT_USER` — Upload files, update assigned tasks, comment, and submit evidence.
- `AUDITOR_VIEWER` — Read-only access to approved documents, approved evidence, and audit readiness views.
- `STAFF` — Basic assigned-task access.

## Main Data Domains

### Users and Access

- Users
- Roles
- Permissions
- Departments
- Sessions or auth tokens

### ISO Workspace

- ISO projects
- Task lists
- Pages
- Sub-pages
- Tasks
- Subtasks
- Comments
- Activity events

### Document Control

- Documents
- Document versions
- Document categories
- File attachments
- Review dates
- Approval statuses

### Audit Readiness

- Audit checklists
- Checklist items
- Evidence submissions
- Evidence reviews
- Department readiness status

### NCR / CAPA

- Findings
- Root cause records
- Corrective actions
- Verification notes
- Closure records

### Notifications

- Notifications
- Reminder rules
- User notification states

### Audit Logs

- Entity type
- Entity ID
- Actor
- Action
- Before value
- After value
- Timestamp
- IP/user agent where available

## Core Status Models

### Task Status

- `TODO`
- `IN_PROGRESS`
- `WAITING_REVIEW`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`

### Document Status

- `DRAFT`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `ARCHIVED`

### Evidence Status

- `MISSING`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`

### NCR/CAPA Status

- `OPEN`
- `IN_PROGRESS`
- `WAITING_EVIDENCE`
- `SUBMITTED`
- `VERIFIED`
- `CLOSED`
- `REJECTED`
- `OVERDUE`

### Priority

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

## Invariants

1. Backend permission checks are mandatory for every mutation.
2. Uploaded file binaries must not be stored in PostgreSQL.
3. Every uploaded file must have a database metadata record.
4. Every document version must remain traceable after replacement.
5. Approved documents cannot be physically deleted by normal users; they can only be archived.
6. Evidence approval/rejection must create an audit log entry.
7. NCR/CAPA closure must require verification by an authorized ISO/QHSE or department manager role.
8. Frontend must not invent statuses that do not exist in shared enums.
9. API input must be validated before business logic runs.
10. No module may bypass the audit log for important ISO-related state changes.
11. Build must pass before a feature is marked complete.
12. The MVP must run locally with PostgreSQL and local file storage without requiring paid cloud services.
13. RECAFCO branding must be used consistently in the UI and must not be replaced with generic SaaS branding.

## Executive Dashboard and Workspace Visibility

The system supports a dedicated Executive Dashboard experience controlled by two User fields:

- `dashboardExperience: STANDARD | EXECUTIVE` — controls which dashboard is shown at login and which sidebar items appear.
- `workspaceVisibilityMode: SELECTED | ALL` — controls workspace scope for executive users.

### ALL Workspace Visibility

When `workspaceVisibilityMode = 'ALL'`:
- `WorkspacesService.findAll()` returns all workspaces (no membership filter) — same as elevated role scope.
- `WorkspacesService.assertWorkspaceAccess()` allows access to any workspace — equivalent to VIEWER-level access.
- `DashboardService.getExecutiveSummary()` aggregates all active workspaces globally.
- New workspaces are automatically visible — no manual assignment required.

ALL visibility does NOT grant:
- Elevated system roles (SUPER_ADMIN, SUPER_USER, etc.)
- Permission to create, edit, or delete tasks, documents, or issues.
- Admin Settings, System Health, System Errors, or User Management access.
- Permanent-delete authority.

Backend authorization is always enforced. `assertWorkspaceAccess` with ALL mode grants read access only; all mutation endpoints independently require specific permissions that Normal Users do not hold.

### Executive Sidebar

Users with `dashboardExperience = EXECUTIVE` see: Dashboard → ISO Workspaces → Reports → Notifications.
Technical admin items (Admin Settings, System Health, System Errors) are only shown when the same account separately has SUPER_ADMIN or IT_ADMIN system access roles.

## Workspace Task List Selection Model

The active task list selection is a frontend state variable (`selectedListId`) preserved across all workspace operations.

**Initial selection**: on first workspace load, `selectedListId` is null → fall back to `taskLists[0]?.id`.

**Preservation rule** (applied on every workspace refresh via `loadWorkspace`/`refreshWorkspaceQuiet`):
```typescript
setSelectedListId((currentId) => {
  if (currentId && ws.taskLists.some((tl) => tl.id === currentId)) return currentId;
  return ws.taskLists[0]?.id ?? null;
});
```

**Stable callbacks**: `loadWorkspace`, `refreshWorkspaceQuiet`, `loadTasks`, `debouncedRefreshWorkspace` do NOT capture `selectedListId` in their closure dep arrays. They read current values via `selectedListIdRef.current` (a ref that is updated on every render). This is required because socket event handlers are registered **once** at socket connect time; stale closures would otherwise capture the initial `null` value and reset the selection.

**Stale response guard in `loadTasks`**: after the API responds, `loadTasks` checks `selectedListIdRef.current !== listId` and discards the response if the user switched lists while the request was in flight.

**Background refresh**: `refreshWorkspaceQuiet` does not call `setLoading(true)` — no loading spinner during realtime-triggered workspace refreshes.

## Task Hierarchy Model

**Root task**: `parentTaskId = null`. Appears in the main workspace task table, global Tasks page, and all operational counts and metrics.

**Subtask**: `parentTaskId = parent task ID`. Displayed only inside the parent-task detail panel. Never appears as a top-level row.

**Recurrence children** (`recurrenceParentId` set, `parentTaskId = null`) are root tasks — visible in the main task table.

**Reference-only tasks** (`isReference = true`) are independent of hierarchy — they appear as root tasks when `parentTaskId = null`.

The following represent root tasks only (`parentTaskId: null`):
- Main workspace task table query (`GET /tasks` controller hardcodes `parentTaskId: null`)
- Frontend defensive filter: `data.filter(t => t.parentTaskId === null)` in `loadTasks()`
- Global Tasks page (both `/tasks` and `/dashboard/my-tasks`)
- Task list sidebar count badges (`_count.tasks` uses Prisma filtered count: `{ where: { parentTaskId: null } }`)
- Workspace overview work counts (open/overdue/completed) and myWork counts
- Dashboard KPI counts, reports counts, Action Center detection rules
- All filter/count badges in the workspace task table
- Reorder validation (`reorderTasks` queries `{ taskListId, parentTaskId: null }`)

Subtasks appear only in:
- Parent-task detail: `findOne` includes `subtasks` relation
- `task._count.subtasks` informational badge in task rows

The task-list delete guard (`_count.tasks`) counts ALL tasks (root + subtasks) for safety. Subtask deletion is blocked at the root-task level.

## Task Ordering Model

Tasks within a task list are ordered by `sortOrder` (integer, 0-based). Root tasks and subtasks each have independent `sortOrder` values.

**Root task ordering** (`parentTaskId: null`):
- `PATCH /task-lists/:id/tasks/reorder` accepts `{ orderedIds: string[] }` — all root task IDs for the list, in the desired sequence.
- Backend validates: no duplicates, no foreign IDs, no child IDs, complete coverage of all root tasks.
- `sortOrder` is updated atomically in a single Prisma `$transaction`.
- Frontend `performReorder()` sends only `parentTaskId === null` IDs, ensuring the payload matches backend expectations exactly.
- Realtime event `task.reordered` is emitted after commit. The caller must NOT supply `eventId` — `RealtimeService.emit()` auto-injects `randomUUID()` via `{ eventId: randomUUID(), occurredAt, ...payload }` spread.

**Subtask ordering**: Subtasks are ordered within their parent task context. They are not included in root-task reorder requests and must not be sent in `orderedIds`.

**RealtimeService eventId convention**: Every event emitted via `RealtimeService.emit()` receives a `randomUUID()` event ID automatically. Callers must not supply `eventId` in the payload object because the `...payload` spread comes after the generated UUID — a caller-supplied `eventId` would override the project-standard UUID. The frontend deduplication layer (`use-realtime-invalidation.ts`) relies on proper UUID format for TTL-based dedup.

## Future Integration Notes

- The system is separate from the maintenance system in phase 1.
- Future integration may connect maintenance work orders, vehicle inspections, asset records, purchase records, supplier records, and calibration records as ISO audit evidence.
- MinIO should replace local file storage when deployed to company server.
- Redis + BullMQ should be introduced for robust scheduled reminders and background processing after MVP.
