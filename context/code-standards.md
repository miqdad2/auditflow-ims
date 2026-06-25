# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component, service, or route.
- Prefer clear business names over generic names.
- Do not silently swallow errors.
- Keep business rules in backend services, not frontend components.
- Keep shared enums and permission constants in a shared package.
- Avoid duplicating status strings across frontend and backend.
- Always implement against the context files.
- Do not invent product behavior without updating the relevant context file first.
- Keep RECAFCO branding consistent and do not replace it with generic placeholders.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`.
- Use explicit interfaces, DTOs, or narrowly scoped types.
- Validate unknown external input at system boundaries.
- Use shared enums for statuses, roles, priorities, and entity types.
- Use discriminated unions where helpful for workflow states.
- Avoid large untyped JSON blobs unless there is a clear reason.

## Next.js

- Use App Router.
- Default to server components.
- Add `use client` only when browser interactivity requires it.
- Keep page files focused on layout and composition.
- Move reusable feature UI into feature folders.
- Do not put complex business logic inside React components.
- Use server actions only when they do not bypass backend business rules.
- For core mutations, call the NestJS API.

## NestJS

- Organize backend by domain modules.
- Each module should contain controller, service, DTOs, guards/policies where needed.
- Controllers handle request/response only.
- Services contain business logic.
- Guards enforce authentication and authorization.
- Use DTO validation before service logic.
- Do not let controllers directly access Prisma unless there is a strong reason.
- All important mutations must create audit logs.
- File upload logic must validate file type, size, owner, and target entity.

## Prisma / Database

- Metadata belongs in PostgreSQL.
- Large file binaries belong in file storage, not the database.
- Use migrations for schema changes.
- Use indexes for common filtering fields such as status, assignee, department, project, due date, created_at, and updated_at.
- Use transactions for multi-step workflows such as document upload + metadata save, evidence approval, and NCR closure.
- Use soft archive for important ISO records instead of hard delete.
- Keep status history where state transitions matter.

## API Routes

- Validate and parse request input before any business logic runs.
- Enforce authentication before reading private data.
- Enforce authorization before mutations.
- Return consistent response shapes.
- Return clear error codes/messages.
- Do not leak file paths, internal stack traces, password hashes, or server secrets.
- Pagination is required for list endpoints.
- Filtering and search should be implemented server-side for large lists.

## File Uploads

- Allow common business document formats:
  - PDF
  - DOC/DOCX
  - XLS/XLSX
  - PPT/PPTX
  - JPG/JPEG
  - PNG
  - TXT
  - CSV

- Reject unsafe or executable files.
- Store original file name, stored file name/key, MIME type, size, checksum if available, uploader, entity type, entity ID, created_at.
- Keep uploaded files outside the git repository.
- Never trust client-provided file extensions alone.
- File download/view endpoints must check permission before returning the file.
- Bulk upload must handle partial failures and report which files succeeded or failed.

## Auth and Security

- Passwords must be hashed securely.
- Do not log passwords or tokens.
- Backend permission checks are mandatory.
- Frontend role checks are not enough.
- Implement rate limiting for login and sensitive endpoints.
- Audit important security events.
- Users must only access documents, tasks, and evidence allowed by their role/department/project permissions.
- Auditor/viewer users must not mutate ISO records.

## Executive Workspace Visibility Rules

- `workspaceVisibilityMode = 'ALL'` extends read access to all workspaces for executive users.
- `WorkspacesService.assertWorkspaceAccess()` accepts an optional `visibilityMode?` parameter. When not provided, the service looks up the user's `workspaceVisibilityMode` from the DB (single PK lookup, only runs for non-elevated non-member users).
- `WorkspacesService.findAll()` accepts a `visibilityMode` parameter; the controller must pass `user.workspaceVisibilityMode` to enable ALL scope for the workspace list.
- ALL visibility must NOT grant elevated roles, write permissions, or admin authority.
- Backend authorization is always enforced — ALL visibility is not a bypass; it only grants the equivalent of VIEWER-level access.
- `DashboardService.getExecutiveSummary()` already accepts and respects `visibilityMode` — no changes needed there.
- Never hardcode a specific user ID into executive visibility logic. The behavior must work for any future executive user with `workspaceVisibilityMode = 'ALL'`.

## Stable Callback Pattern for Socket Handlers

Socket event handlers in `useWorkspaceSocket` are registered **once** at socket connect time. The `handlers` object is intentionally excluded from the effect's dependency array (see socket-provider.tsx comment). This means handler closures capture their initial values and are never updated on re-render.

**Required pattern** when a handler needs current state that changes over the component lifetime:

1. Use a `useRef` that is assigned on every render:
   ```typescript
   const selectedListIdRef = useRef<string | null>(null);
   selectedListIdRef.current = selectedListId; // updated every render
   ```
2. Inside the handler, read `selectedListIdRef.current` instead of `selectedListId`.
3. For callbacks (loadWorkspace, loadTasks, etc.), remove mutable state from their deps so they are stable and can be safely captured by the initial closure.
4. For callbacks that read state, use functional updaters (`setState(prev => ...)`) so the update reads the current state at apply time, not the stale closure value.

**Never** add `selectedListId` or `selectedTaskId` to `loadWorkspace` or `loadTasks` deps — this causes unnecessary recreation, stale socket handler closures, and loading spinner disruptions on every state change.

## Task Reorder Contract

- **DTO**: `ReorderTasksDto` must use `@IsArray() @ArrayNotEmpty() @IsString({ each: true })` decorators. The global `ValidationPipe` uses `{ whitelist: true, forbidNonWhitelisted: true }` — any undecorated property is rejected with HTTP 400 before reaching the service.
- **Scope**: Reorder applies only to root-level tasks (`parentTaskId: null`). Subtasks have their own independent `sortOrder` within their parent context and must not be included in reorder payloads.
- **Frontend payload**: `performReorder()` must filter `newTasks.filter((t) => t.parentTaskId === null).map((t) => t.id)` before sending `orderedIds` — even if the `tasks` array contains subtasks returned by the backend.
- **Backend validation**: `reorderTasks()` must validate against `{ taskListId, parentTaskId: null }` (root tasks only). It must reject: empty array, duplicate IDs, foreign IDs, missing IDs (completeness check).
- **Atomic persistence**: All `sortOrder` updates must run inside a single `$transaction`. Only `sortOrder` changes — no other task fields.
- **Realtime emit**: After commit, emit `task.reordered` via `RealtimeService.emitToWorkspace()`. Do NOT include `eventId` in the caller payload — `RealtimeService.emit()` auto-injects `randomUUID()` via `{ eventId: randomUUID(), occurredAt, ...payload }`. A caller-supplied `eventId` overrides the UUID.
- **Optimistic rollback**: Frontend saves `previousTasks` before `setTasks(newTasks)`. On API failure, restores `previousTasks` immediately and shows toast: `"Task order could not be saved. The previous order has been restored."`
- **Availability guard**: Reorder is enabled only when `taskFilter === 'all' && taskSort === 'manual' && !taskSearch.trim() && canCollaborate`.

## RealtimeService EventId Convention

- Every event emitted via `RealtimeService.emit()` / `emitToWorkspace()` / `emitToUser()` automatically receives a project-standard `randomUUID()` event ID via `{ eventId: randomUUID(), occurredAt, ...callerPayload }`.
- Callers must **not** include `eventId` in their payload. Because `...callerPayload` comes after the generated UUID in the spread, a caller-supplied `eventId` would override the UUID.
- The frontend deduplication layer (`use-realtime-invalidation.ts`) uses `seenEventIds` (Map with 60s TTL) and relies on proper unique UUID format per event.
- Use `randomUUID` from `'crypto'` (already imported in `tasks.service.ts` for `recurrenceSeriesId`). Do not use `Date.now().toString()` as an event identifier.

## Permanent Deletion Rules

- **Only SUPER_ADMIN can permanently delete tasks or task lists.** All other roles (SUPER_USER, ISO_MANAGER, QHSE_USER, IT_ADMIN, DEPARTMENT_MANAGER, STAFF) are denied with HTTP 403.
- The backend must explicitly check `actorRoles.includes('SUPER_ADMIN')` — relying on a broad ELEVATED_ROLES bypass is not sufficient.
- Before deleting a task, the service must count subtasks, file attachments, and linked records and throw `ConflictException` if any exist.
- Tasks in COMPLETED or WAITING_REVIEW status cannot be permanently deleted (throw ForbiddenException).
- Before deleting a task list, the service must count tasks in the list and throw `ConflictException` if any exist.
- Permanent deletion audit logs must use specific action names: `TASK_PERMANENTLY_DELETED` and `TASK_LIST_PERMANENTLY_DELETED` — not the generic `DELETED`.
- Realtime emits after permanent deletion must be wrapped in try-catch so a socket failure does not undo the committed deletion.
- Frontend delete UI for permanent deletion must use a confirmation modal that requires the user to type "DELETE" — not a browser `confirm()` dialog.
- Frontend `canDeleteTask` and task-list delete menu items must be gated by the SUPER_ADMIN role check, not by `tasks.delete` permission.

## Notifications

- Notifications must be stored in the database.
- Notification creation should not break the main workflow if non-critical.
- Critical notification failures should be logged.
- Avoid duplicate notifications for the same event and recipient.
- Each notification should include category, title, message, recipient, entity type, entity ID, read status, and created_at.

## Audit Logs

- Create audit logs for:
  - Login/security-relevant events where useful
  - Project creation/update/delete
  - Task creation/update/status change/delete
  - Page and sub-page creation/update/delete
  - Document upload/update/version change/approval/rejection/archive
  - Evidence submission/approval/rejection
  - NCR/CAPA creation/update/verification/closure
  - Permission or role changes

- Audit logs must include:
  - Actor user ID
  - Action
  - Entity type
  - Entity ID
  - Previous value where useful
  - New value where useful
  - Timestamp

## Styling

- Use CSS custom property tokens from `ui-context.md`.
- Do not hardcode hex values in components.
- Follow the border radius scale defined in `ui-context.md`.
- Prefer clean enterprise spacing.
- Avoid excessive gradients, glassmorphism, and decorative effects.
- Keep table/list rows readable and compact.
- Use status badges consistently.
- Use the RECAFCO logo only from the approved brand asset path.

## File Organization

- `apps/web/app/` — Next.js routes and layouts.
- `apps/web/components/` — shared UI composition components.
- `apps/web/features/` — feature-specific frontend components and hooks.
- `apps/web/public/brand/` — RECAFCO logo and approved brand assets.
- `apps/api/src/modules/` — NestJS domain modules.
- `apps/api/src/common/` — common guards, decorators, filters, interceptors, utilities.
- `packages/db/` — Prisma schema, migrations, and database client.
- `packages/shared/` — shared types, enums, validation schemas, permissions.
- `context/` — context files and implementation notes.
- `uploads/` — local uploaded files; must be ignored by git.

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*`
- Generated Prisma client files
- Third-party library internals
- Lock files unless dependency changes are intentional
- Uploaded file storage contents except through application logic
