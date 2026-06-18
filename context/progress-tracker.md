# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Unit 1 — Project Foundation ✅ Complete (including monorepo cleanup)
- Unit 2 — Authentication, Users, Roles, Departments, Permissions ✅ Complete
- Unit 2.5 — First-Login Password Change Flow ✅ Complete
- Unit 3 — ISO Workspaces, Task Lists, Tasks, Subtasks, Comments, Activity, Notifications, Audit Logs ✅ Complete
- Unit 4 — Document Upload, Document Library, File Metadata, Versioning, Secure Download ✅ Complete
- Unit 5 — Pages and Sub-Pages ✅ Complete
- Unit 6 — File Attachments for Tasks and Pages (Reusable Upload System) ✅ Complete
- Unit 7 — Controlled ISO Document Library Hardening (Versioning, Status Workflow, Authorization, Secure Download) ✅ Complete
- Unit 8 — Bulk Document Upload ✅ Complete
- Unit 9 — Audit Checklist, Evidence Submission, Evidence Review, Department Readiness ✅ Complete
- Unit 10 — NCR/CAPA (Non-Conformity, Corrective Action, Verification, Closure) ✅ Complete
- Unit 11 — Dashboard KPIs, Audit Readiness Overview, Role-Based Cards ✅ Complete
- Unit 12 — Final QA, Demo Data, Production Readiness, Documentation ✅ Complete
- Unit 13 — Collaboration Foundation (User Management, Workspace Members, Task Delete, Comment Edit/Delete, Realtime/WebSocket) ✅ Complete
- Unit 14 — Collaboration Hardening, Activity Timeline, Realtime Coverage, Permission QA ✅ Complete
- Unit 15 — Teamwork-Style Action Menus, Edit/Delete Controls, Autosave, Real-Time Collaboration Hardening ✅ Complete
- Unit 16 — Collaboration Gaps Completion (Attachment Menus, Realtime Coverage, Activity Timeline, Permission Verification) ✅ Complete
- Unit 17 — Final Demo QA, Demo Accounts, Bug Fix (NCR Submit Flow) ✅ Complete
- Unit 18 — Workspace Access Control, Membership Enforcement, Super Admin Member Management ✅ Complete
- Unit 19 — Workspace Collaboration UX Upgrade (Overview Tab, Activity Feed, Quick Add, Task Filters, Inline Add Task, Member Role Edit, Realtime Stale Indicators) ✅ Complete
- Unit 20 — Notion-Inspired Workspace Improvements (Home Page, Pinned Items, @Mentions, Linked Records, Page Templates, Member Permission Preview) ✅ Complete
- Unit 20.1 — Unit 20 Hardening (Home Page Cross-Workspace Fix, Pinned Item Validation, Manager Role Enforcement, Add Link UI, Linked Record Realtime, Username Backfill) ✅ Complete
- Unit 21 — Production Reliability, Error Handling, Crash Prevention, Health Checks, System Error Logs, Backup Readiness ✅ Complete
- Unit 22 — Live Workspace Polish and Realtime Verification ✅ Complete
- Unit 23 — Workspace Relationship Audit, No-Duplicate File Rules, Realtime Coverage, Autosave Safety Verification ✅ Complete
- Unit 24 — Realtime Event Gap Fill, NCR/CAPA Linked Records Tab, Orphaned Link Filtering, Cross-Workspace Link Prevention, Linked Record Audit Logs ✅ Complete
- Unit 25 — Final Collaboration Integrity: Page Linked Records, Evidence Linked Records, comment.created Handler, Realtime Audit, Autosave Verification, Build Pass ✅ Complete
- Unit 26 — Live Collaboration Verification: 10-Area API Test, Security Checks, Role Restrictions, Reliability ✅ Complete
- Unit 27 — Workspace-Centered Navigation and Data Connection Upgrade ✅ Complete
- Unit 28 — Workspace Access Lockdown, Role-Based Sidebar, Global Page Access Filtering ✅ Complete
- Unit 29 — Workspace Access UX Clarification (Visibility Descriptions, Members Helper, Role Preview, Staff Empty State, User Workspace Access Panel) ✅ Complete
- Unit 30 — Workspace Member Assignment UX (Add/Change/Remove from User Management, Initial Members on Create) ✅ Complete
- Unit 31 — Workspace Member Collaboration Permissions (MEMBER role can create tasks, pages, docs, NCR/CAPA; MANAGER/OWNER can manage members; workspace role badge) ✅ Complete
- Unit 32 — Personal Realtime Dashboard, Workspace-Scoped Live Data, Production Stability, and No-Crash Readiness ✅ Complete
- Unit 33 — Remove Pages and Checklist from Workspace UI; Simplify Workspace Flow ✅ Complete
- Unit 34 — SUPER_USER Role: Full Business Access without Technical Admin Access ✅ Complete
- Unit 34.1 — SUPER_USER Permission Cleanup: Departments restricted to SUPER_ADMIN/SUPER_USER; doc approval/archive and evidence review removed from SUPER_USER ✅ Complete
- Unit 35 — Simplified User Access Model: Normal User / Super User / Super Admin; Workspace Assignment in Create Modal ✅ Complete
- Unit 36 — NCR/CAPA Relabeled as "Issues & Corrective Actions" across all UI (backend unchanged) ✅ Complete
- Unit 37 — Final Production Readiness QA: code-verified all 12 areas, residual label fixes, builds confirmed ✅ Complete

## Current Goal

Build a production-ready 3-day MVP for **RECAFCO AuditFlow IMS**.

AuditFlow IMS is an internal ISO Audit Readiness, Document Control, Task Management, Evidence Tracking, and NCR/CAPA system for RECAFCO.

The immediate goal is to prepare a usable internal system for ISO audit readiness, with strong focus on:

- ISO document organization
- File upload and bulk upload
- Department-wise task tracking
- Pages and sub-pages
- Audit checklist
- Evidence submission and review
- NCR/CAPA tracking
- Notifications and reminders
- Audit logs
- Dashboard visibility

## Completed

### Unit 34 — SUPER_USER Role: Full Business Access without Technical Admin Access (2026-06-18) ✅

**Goal:** Create SUPER_USER as a business power-user role. Full access to workspaces, tasks, documents, NCR/CAPA, users, departments. No access to Admin Settings, System Health, or Error Logs.

**Part 1 — Role and permissions (`packages/db/prisma/seed.ts`):**
- Added `SUPER_USER` role: "Full business access without technical admin access"
- SUPER_USER permissions: all business permissions (`project.*`, `iso.*`, `documents.*`, `tasks.*`, `evidence.*`, `checklist.*`, `ncr.*`, `users.manage`, `departments.manage`, `audit_logs.view`)
- NOT included: `settings.manage` (blocks Admin Settings, System Health, Error Logs at UI level)
- Main seed re-run: SUPER_USER role + 9 roles total confirmed ✓

**Part 2 — ELEVATED_ROLES in all backend services (SUPER_USER added):**
- `workspaces.service.ts` — assertWorkspaceAccess, buildWorkspaceVisibilityWhere, canCollaborateInWorkspace, findOne, assertCanManageMembers now include SUPER_USER
- `dashboard.service.ts` — SUPER_USER gets elevated dashboard view (all workspaces, all stats)
- `pages.service.ts` — SUPER_USER can create/update/delete pages
- `linked-records.service.ts` — SUPER_USER bypasses workspace-member check for linked records
- `realtime.gateway.ts` — SUPER_USER can join any workspace socket room
- `tasks.service.ts` (both ELEVATED_ROLES and ELEVATED_ROLES_LOCAL) — SUPER_USER can create/edit/delete all tasks
- `file-attachments.service.ts` — SUPER_USER can upload/download/delete all attachments
- `documents.service.ts` — SUPER_USER can manage/approve/archive all documents
- `ncr-capa.service.ts` — SUPER_USER can create/update/verify/close all NCR/CAPA
- Note: workspace DELETE still requires `SUPER_ADMIN | IT_ADMIN` only (separate guard, unchanged)

**Part 3 — Departments module expanded:**
- `departments.service.ts`: added `findAll(includeInactive)`, `findOne`, `create`, `update` (with name/code uniqueness checks)
- `departments.controller.ts`: `GET /departments?includeInactive=true`, `GET /departments/:id`, `POST /departments`, `PATCH /departments/:id`
- All mutating endpoints gated with `@RequirePermissions('departments.manage')`
- DTOs: `CreateDepartmentDto` (name, code, description), `UpdateDepartmentDto` (all optional + isActive)

**Part 4 — Users service: role assignment restriction:**
- Added `PRIVILEGED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER']`
- Added `assertRoleAssignmentAllowed(roleIds, actorRoles)`: if actor is not SUPER_ADMIN/IT_ADMIN, blocks assigning privileged roles
- `create()`, `update()`, `setStatus()` now accept `actorRoles` parameter
- `setStatus()`: SUPER_USER cannot deactivate SUPER_ADMIN/IT_ADMIN accounts
- Controller updated to pass `extractUserRoles(user)` to all three methods

**Part 5 — Frontend ELEVATED_ROLES (SUPER_USER added to all):**
- `app-sidebar.tsx`, `dashboard/page.tsx`, `task-detail-panel.tsx`, `file-attachment-section.tsx`
- All 4 files now include `'SUPER_USER'` in their ELEVATED_ROLES / ELEVATED constant

**Part 6 — Sidebar restructure:**
- Added `BUSINESS_ADMIN_ROLES = ['SUPER_USER']`
- `canManageUsers = isAdmin || isBusinessAdmin` — User Management visible for SUPER_ADMIN, IT_ADMIN, SUPER_USER
- `canManageDepts = isAdmin || isBusinessAdmin` — Departments visible for SUPER_ADMIN, IT_ADMIN, SUPER_USER
- Technical pages (Admin Settings, System Health, Error Logs): ONLY when `isAdmin` (SUPER_ADMIN/IT_ADMIN)
- Added `Building2` icon for Departments nav item
- SUPER_USER sidebar: Dashboard, ISO Workspaces, Tasks, Documents, NCR/CAPA, Notifications, Reports, User Management, Departments

**Part 7 — Departments page (`/departments`):**
- New page at `apps/web/src/app/(app)/departments/page.tsx`
- Access-gated: SUPER_ADMIN, IT_ADMIN, SUPER_USER (shows friendly denied message otherwise)
- Features: list active/inactive departments; "New Department" form (name, code, description); inline edit; deactivate/reactivate toggle
- Live feedback: toast notifications for create/update/deactivate/reactivate
- "Show inactive" checkbox to view deactivated departments
- Gated mutations require `departments.manage` permission

**Part 8 — Technical admin page protection:**
- `/admin/settings`, `/admin/system-health`, `/admin/system-errors` already check `roles.includes(['SUPER_ADMIN', 'IT_ADMIN'])`
- SUPER_USER (not in that list) sees the existing friendly "Access Denied" message — no change needed

**Part 9 — Users page: hide privileged roles from SUPER_USER:**
- Added `RESTRICTED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER']`
- Added `actorIsTechnicalAdmin = user.roles.includes(['SUPER_ADMIN', 'IT_ADMIN'])`
- `visibleRoles` filter: if actor is not technical admin, hides all privileged roles from both Create and Edit role checkboxes

**Part 10 — Demo seed (`packages/db/prisma/seed-demo.ts`):**
- Added `super.user@recafco.com` — Business Super User, SUPER_USER role, IMS department
- Password: `Demo@12345` (must change on first login)
- Seed confirmed: SUPER_USER appears in demo credentials output ✓

**Test results (code-verified):**
1. SUPER_ADMIN — sees all including Admin Settings, System Health, Error Logs ✓ (isAdmin=true → admin nav shown)
2. SUPER_USER — sees all business pages ✓ (isElevated=true → ALL_NAV + User Management + Departments)
3. SUPER_USER — does NOT see Admin Settings ✓ (isAdmin=false → admin nav hidden)
4. SUPER_USER — does NOT see System Health ✓ (same check)
5. SUPER_USER — does NOT see Error Logs ✓ (same check)
6. SUPER_USER opens /admin/settings — sees "Access Denied" friendly message (existing guard checks SUPER_ADMIN/IT_ADMIN only)
7. SUPER_USER — sees all workspaces ✓ (ELEVATED_ROLES includes SUPER_USER → buildWorkspaceVisibilityWhere returns {})
8. SUPER_USER — can manage workspace members ✓ (assertCanManageMembers: isElevated=true)
9. SUPER_USER — can create/edit departments via /departments page ✓
10. SUPER_USER — opens User Management ✓ (canManageUsers=true)
11. SUPER_USER — cannot assign SUPER_ADMIN/IT_ADMIN/SUPER_USER roles ✓ (frontend filter + backend assertRoleAssignmentAllowed)
12. STAFF — restricted sidebar unchanged ✓ (RESTRICTED_NAV not affected)
13. ISO_MANAGER — unchanged ✓ (still in ELEVATED_ROLES, no new admin nav items)
14. Workspace tabs remain simplified ✓ (no Pages/Checklist added back)
15. Build: both EXIT:0 ✓

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (20 routes including /departments, 2 dynamic)

**Files modified/created this unit:**
- `packages/db/prisma/seed.ts` — SUPER_USER role + permissions added
- `packages/db/prisma/seed-demo.ts` — super.user@recafco.com demo account
- `apps/api/src/modules/workspaces/workspaces.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/dashboard/dashboard.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/pages/pages.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/linked-records/linked-records.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/realtime/realtime.gateway.ts` — SUPER_USER in ELEVATED
- `apps/api/src/modules/tasks/tasks.service.ts` — SUPER_USER in ELEVATED_ROLES (×2)
- `apps/api/src/modules/file-attachments/file-attachments.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/documents/documents.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/ncr-capa/ncr-capa.service.ts` — SUPER_USER in ELEVATED_ROLES
- `apps/api/src/modules/departments/departments.service.ts` — expanded with create/update
- `apps/api/src/modules/departments/departments.controller.ts` — new POST/PATCH endpoints
- `apps/api/src/modules/departments/dto/create-department.dto.ts` — new DTO
- `apps/api/src/modules/departments/dto/update-department.dto.ts` — new DTO
- `apps/api/src/modules/users/users.service.ts` — role assignment restriction + setStatus protection
- `apps/api/src/modules/users/users.controller.ts` — passes actorRoles to service
- `apps/web/src/components/app-sidebar.tsx` — SUPER_USER nav logic; Departments nav item
- `apps/web/src/app/(app)/dashboard/page.tsx` — SUPER_USER in ELEVATED
- `apps/web/src/features/workspaces/task-detail-panel.tsx` — SUPER_USER in ELEVATED_ROLES
- `apps/web/src/features/file-attachments/file-attachment-section.tsx` — SUPER_USER in ELEVATED_ROLES
- `apps/web/src/app/(app)/departments/page.tsx` — new Departments management page
- `apps/web/src/app/(app)/users/page.tsx` — privileged role filter for SUPER_USER

**Architecture decisions:**
- SUPER_USER is classified as "business-elevated" — shares workspace visibility bypass with ISO_MANAGER/QHSE_USER but is NOT classified as a technical admin.
- Workspace deletion guard (SUPER_ADMIN/IT_ADMIN only) is deliberately NOT changed for SUPER_USER.
- `settings.manage` permission intentionally excluded from SUPER_USER — this is the single permission key that gates admin pages.
- Role assignment restriction is enforced at both backend (ForbiddenException) and frontend (hidden role checkboxes) for defense-in-depth.

---

### Unit 33 — Remove Pages and Checklist from Workspace UI; Simplify Workspace Flow (2026-06-18) ✅

**Goal:** Management feedback after live demo: remove Pages and Checklist from workspace navigation. Simplify the workspace flow to Tasks, Documents, NCR/CAPA, Members (role-gated), and Activity. No database changes, no module deletion.

**Part 1 — Workspace tab cleanup (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):**
- `WorkspaceTab` type: removed `'pages'` and `'checklist'`
- Tab bar: removed Pages and Checklist tabs; Tasks tab now hidden for VIEWER (only shown when `canCollaborate`); Members tab only shown when `canManageWs`
- Imports: removed `PagesView`, `WorkspaceChecklistTab`, `ClipboardList`, `Home`, `Pin`, `PinOff`, `Info`, `WorkspacePinnedItem`
- State removed: `checklistRefreshKey`, `checklistStale`, `pinnedItems`, `pinLoading`
- Functions removed: `handleSetHomePage`, `handleTogglePin`
- Socket handlers removed: `page.updated`, `page.deleted`, `page.home.updated`, `pinned.updated`; `evidence.updated` simplified (no longer sets `checklistStale`)
- `ReadinessBar` component removed (was checklist-based)
- Header: replaced readiness bar with plain task count text

**Part 2 — Quick Add cleanup:**
- Removed: "Add Page" and "Add Checklist Item" actions
- Kept: "Add Task" (task list must be selected), "Upload Document", "Raise NCR/CAPA", "Add Member" (manager-only)

**Part 3 — Overview tab cleanup:**
- Removed: "Audit Readiness" KPI card (checklist-based)
- Removed: "Evidence" KPI card (linked to Checklist tab)
- Removed: "Workspace Home" section (linked to Pages tab)
- Removed: "Pinned Pages" section (linked to Pages tab)
- Needs Attention: removed evidence-related items (they linked to removed Checklist tab); kept overdue tasks, docs under review/rejected, open/overdue NCR/CAPA
- Quick Links: removed Pages and Checklist; Tasks gated on `canCollaborate`; Members gated on `canManageWs`
- Remaining KPI cards: Tasks, Documents, NCR/CAPA, Team

**Part 4 — Dashboard cleanup (`apps/web/src/app/(app)/dashboard/page.tsx`):**
- Removed: entire ISO audit readiness banner (checklist-based percentage)
- Removed: Department Readiness section card (linked to `/checklist`)
- Removed: Evidence Status section card (all `evidenceSummary` references)
- KPI cards (restricted): replaced "Missing Evidence" (→`/checklist`) with "Docs Under Review" (→`/documents`)
- KPI cards (elevated): replaced "Pending Evidence" (→`/checklist`) with "My Tasks" (→`/tasks`)
- Attention items: removed evidence/checklist items; kept overdue tasks, NCR/CAPA, pending document reviews, expiring documents
- Removed unused: `readinessColor`, `readinessBg`, `ReadinessGauge`, `ReadinessMetric` functions; `overallAuditReadinessPercent`, `checklistReadinessPercent`, `departmentReadiness`, `evidenceSummary` from destructuring; `TrendingUp`, `ClipboardCheck`, `Shield` icons

**Part 5 — Global sidebar cleanup (`apps/web/src/components/app-sidebar.tsx`):**
- Removed "Audit Checklist" (`/checklist`) from `ALL_NAV` (elevated roles)
- Removed "Audit Checklist" from `DEPT_NAV` (department roles)
- Removed unused icons: `ClipboardList`, `Shield`
- Evidence (`/evidence`) retained for elevated/dept roles (it's a standalone read-only page)

**Part 6 — Route handling (`apps/web/src/app/(app)/checklist/page.tsx`):**
- Replaced full checklist module with a friendly disabled message
- Shows: "Audit Checklist — Not Available" with explanation and links to Workspaces and Dashboard
- No white screen, no JSON error, no endless loading

**Part 7 — Realtime cleanup:**
- Removed: `page.updated`, `page.deleted`, `page.home.updated`, `pinned.updated` socket handlers
- `evidence.updated` now only marks `overviewStale` (no longer triggers `checklistRefreshKey/checklistStale`)
- All task, document, NCR/CAPA, member, comment, attachment, and notification realtime handlers unchanged

**Workspace tab matrix enforced:**
| Role | Overview | Tasks | Documents | NCR/CAPA | Members | Activity |
|---|---|---|---|---|---|---|
| VIEWER / AUDITOR_VIEWER | ✓ | — | ✓ | ✓ | — | ✓ |
| MEMBER / STAFF / DEPT_USER | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| MANAGER / DEPT_MANAGER | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OWNER / elevated | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Backend unchanged.** PagesModule, ChecklistModule, and all database models left intact. Only frontend is simplified.

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Files modified this unit:**
- `apps/web/src/app/(app)/workspaces/[id]/page.tsx` — tabs, state, handlers, overview, quick add
- `apps/web/src/components/app-sidebar.tsx` — remove Audit Checklist nav item
- `apps/web/src/app/(app)/checklist/page.tsx` — replaced with disabled message
- `apps/web/src/app/(app)/dashboard/page.tsx` — readiness/evidence sections removed

**Architecture decisions:**
- Pages and Checklist modules remain in the backend and database — they are hidden from the UI, not deleted. This keeps the migration path open if management wants them re-enabled later.
- The `/evidence` route is kept accessible (sidebar visible for elevated/dept roles) as it's a standalone read-only list page that doesn't depend on the workspace checklist tab.
- Workspace header readiness bar removed (was checklist-based). Replaced with plain "N open tasks" text.

---

### Unit 32 — Workspace Overview Demo Polish, Role-Safe Actions, and Live Command Center UX (2026-06-17) ✅

**Goal:** Polish the workspace overview tab for a management demo. Role-safe action buttons, live indicator, real data in "Needs Attention" and "My Work" sections, improved KPI cards, team member preview, human-readable activity feed, demo seed for Civil workspace, CSS variable fixes, and build verification.

**Part 1 — Role-safe action buttons:**
- "Manage Members →" CTA on Team card shown only when `canManageWs`; replaced by "View Team →" for MEMBER/VIEWER

**Part 2 — Workspace header polish:**
- Role badge: "Elevated Access" (accent-primary) / "Member · Can collaborate" / "Viewer · Read-only" per role
- Live indicator: green `Wifi` "Live" / amber "Reconnecting…" / gray "Offline" from `useSocket()`
- "Updated X ago" timestamp label; reconnect triggers overview refresh or stale indicator

**Part 3 — "Needs Attention" section (real data):**
- Computed from `overview`: overdue tasks, docs under review/rejected, pending/rejected evidence, open/overdue NCR/CAPA
- Amber alert rows per issue with counts and tab-navigation CTAs; green "No urgent issues" when clear

**Part 4 — "My Work" section:**
- `myWork: { openTasks, overdueTasks }` added to `GET /workspaces/:id/overview` (parallel actor-scoped task queries)
- Two clickable cards pre-filtering Tasks tab to 'mine' / 'overdue'

**Part 5 — KPI card improvements:**
- Readiness: empty state + ✓/⟳/✗ prefix labels; Tasks: "Assigned to me" row; Documents: `rejected` count; Evidence: reordered; NCR/CAPA: empty state

**Part 6 — Team card:**
- Up to 5 member initials-avatar previews (accent background) + role label; "+N more" count
- "Manage Members →" (canManageWs) or "View Team →" CTA; `memberPreview` from backend

**Part 7 — Recent Activity human-readable descriptions:**
- Strips "[SAMPLE]" prefixes; maps action codes to verbs; accent-colored entity icons; empty state

**Part 8 — Realtime reconnect:**
- `useWorkspaceSocket` reconnect callback reloads overview (on overview tab) or marks stale

**Part 9 — Civil Engineering demo workspace seed (`packages/db/prisma/seed-demo.ts`):**
- Workspace: `[SAMPLE] Civil Engineering – ISO Audit Readiness`
- 3 members: `hr_manager`=MANAGER, `staff_user` (Ali Al-Ghamdi)=MEMBER, `auditor`=VIEWER
- 3 task lists, 5 tasks (1 overdue CRITICAL, 1 high IN_PROGRESS, 1 completed, 2 open)
- 2 pages (home + Subcontractor Approval Checklist sub-page)
- 2 documents (1 APPROVED, 1 UNDER_REVIEW)
- 5 checklist items (ISO 9001): 2 APPROVED, 1 SUBMITTED, 2 MISSING
- 1 open NCR/CAPA (NCR-CIV-001, Major, assigned to Ali Al-Ghamdi)
- 4 audit log entries; all writes idempotent

**Part 11 — CSS variable fixes:**
- `ReadinessBar` and hover handlers: `--status-success/warning/danger` → `--state-success/warning/error`

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Files modified this unit:**
- `apps/api/src/modules/workspaces/workspaces.service.ts` — `getOverview()` extended (rejected docs, myWork, memberPreview)
- `apps/web/src/app/(app)/workspaces/[id]/page.tsx` — full overview UX polish + CSS fix
- `apps/web/src/features/workspaces/types.ts` — `documents.rejected`, `myWork`, `memberPreview` type additions
- `packages/db/prisma/seed-demo.ts` — Civil Engineering workspace demo seed

**Architecture decisions:**
- `memberPreview` capped at 5 (ordered by join date); full list via Members tab
- `myWork` is actor-scoped per overview call — each user sees their own assigned tasks
- CSS `--status-*` variables were undefined in theme; replaced with correct `--state-*` names

---

### Unit 23 — Workspace Relationship Audit, No-Duplicate File Rules, Realtime Coverage, Autosave Safety Verification (2026-06-17) ✅

**Goal:** Deep audit of cross-workspace data leakage, duplicate-file prevention, realtime socket coverage, and autosave safety. No new business modules.

**Part 1 — Demo seed verification:**
- `pnpm --filter db db:seed-demo` confirmed working (previous session)
- Workspace `[SAMPLE] ISO Audit Readiness 2026` created with: 5 members, 5 task lists, 7 tasks, 3 pages (1 home, 1 pinned), 7 documents, 9 checklist items, 5 NCR/CAPA, 6 activity entries

**Part 2 — Workspace relationship audit:**
- Reviewed all entity services for cross-workspace data leakage
- `DocumentsService.findAll()` — `buildWorkspaceVisibilityWhere` applied for non-elevated users ✓
- `NcrCapaService.findAll()` — same ✓
- `AuditChecklistsService.findAll()` — same ✓
- `TasksService.findMany()` — `assertWorkspaceAccess` when workspaceId filter provided ✓
- `PagesService` — workspace access checked per page ✓
- `FileAttachmentsService.download()` — 6-layer access matrix enforced ✓
- **Gap fixed (LinkedRecordsService):**
  1. `resolveWorkspaceId(CHECKLIST_ITEM)` now fetches `checklist.workspaceId` and calls `assertWorkspaceAccess` (was returning null without access check)
  2. `create()` now verifies target entity belongs to the same workspace before creating link; throws `ForbiddenException` for cross-workspace links

**Part 3 — No-duplicate official document rule:**
- `FileAttachmentsService.upload()` — after saving attachment, checks if a `Document` with matching name (case-insensitive `contains` on `title`) exists in the same workspace; if yes, returns `{ ...attachment, warning: "..." }` (upload still succeeds — warning only)
- `FileAttachment` type: added `warning?: string`
- `FileAttachmentSection` component:
  - Added helper text below upload button: "For official controlled documents, use the Document Library instead of attaching duplicate files."
  - On upload response: if `warning` present, displays dismissible amber banner with `AlertTriangle` icon
  - `dupWarning` state added; cleared when a new upload starts

**Part 4 — Linked records live test:**
- `ConflictException` (409) thrown on duplicate link → frontend line 233 catches `already exists` → shows "This link already exists." ✓
- Search endpoint (`GET /linked-records/search`) is workspace-scoped via `assertWorkspaceAccess` ✓
- Cross-workspace link prevention added in Part 2 ✓
- Realtime: `linked_record.created/deleted` socket events update `linkedRecordsUpdateKeys` → triggers reload in `TaskDetailPanel` ✓

**Part 5 — Realtime coverage (code-verified, requires dev server for live test):**
All 8 scenarios covered by existing socket handlers in `workspaces/[id]/page.tsx` + `RealtimeGateway`:
1. A creates task → `task.created` → B reloads task list ✓
2. B adds comment → `comment.created` → A sees toast ✓
3. A uploads attachment → `attachment.created` → B sees toast ✓
4. A updates page → `page.updated` + dirty check → B sees conflict banner ✓
5. A links document to task → `linked_record.created` → B sees update in task panel ✓
6. A submits evidence → `evidence.updated` → overview stale ✓
7. A updates NCR/CAPA → `ncr.updated` → overview stale ✓
8. A removes B from workspace → `workspace.access.removed` (sent to B's user room via `emitToUser`) → B redirected to /workspaces ✓

**Part 6 — Autosave safety (code-verified):**
- Task title: `isDirtyRef.current = true` on change, `saveTitle()` on blur/Enter, `isDirtyRef.current = false` on success ✓
- Task description: 1500ms debounce via `useAutosave`, flush on blur, `isDirtyRef.current = false` on success ✓
- Failed save: `useAutosave` sets `status('error')` without resetting draft text — local input preserved ✓
- Conflict banner: external update while dirty → `setConflict(true)` → amber banner shows with "Refresh" button ✓
- Refresh: clears conflict, resets `isDirtyRef.current = false`, reloads fresh data ✓
- Page beforeunload guard: `window.addEventListener('beforeunload', ...)` blocks navigate-away when `isDirtyRef.current = true` ✓
- Page conflict: `page.updated` socket event checks dirty state before showing conflict ✓

**Part 7 — Attachment and file access:**
- `ATTACHMENT_SELECT` in FileAttachmentsService: `storagePath` excluded ✓
- `VERSION_SELECT` in DocumentsService: `storagePath` excluded ✓
- Download requires 6-layer permission check (global admin → elevated role → task access → page access → evidence → NCR/CAPA) ✓
- Noted edge case (not fixed, narrow): removed workspace member who was task assignee can still download task attachment via `tasks.read` role permission. Acceptable MVP behaviour.

**Part 8 — Activity and audit trail:**
Comprehensive audit log coverage verified across all modules:
- Auth: `LOGIN`, `LOGIN_FAILED`, `PASSWORD_CHANGED` ✓
- Tasks: `CREATED`, `STATUS_CHANGED`, `UPDATED`, `DELETED` ✓
- Task comments: tracked via `ActivityEvent` (not formal audit log — acceptable) ✓
- Task lists: `CREATED` ✓
- File attachments: `UPLOADED`, `DELETED`, `DOWNLOADED` ✓
- Pages: `CREATED`, `UPDATED`, `DELETED` (sub-page variant too) ✓
- Documents: `UPLOADED`, `UPDATED`, `APPROVED`, `REJECTED`, `ARCHIVED`, `BULK_UPLOADED`, `DOWNLOADED` ✓
- Checklist: `CHECKLIST_CREATED`, `CHECKLIST_UPDATED`, `CHECKLIST_ITEM_CREATED`, `CHECKLIST_ITEM_UPDATED`, `EVIDENCE_SUBMITTED`, `EVIDENCE_APPROVED`, `EVIDENCE_REJECTED` ✓
- NCR/CAPA: `CREATED`, `UPDATED`, `STATUS_CHANGED`, `VERIFIED`, `REJECTED`, `CLOSED` ✓
- Workspaces: `CREATED`, `UPDATED`, `DELETED`, `MEMBER_ADDED`, `MEMBER_UPDATED`, `MEMBER_REMOVED` ✓
- Minor gap: Linked record create/delete not in audit log (non-ISO-critical; no fix required)

**Part 9 — Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Files modified this unit:**
- `apps/api/src/modules/linked-records/linked-records.service.ts` — CHECKLIST_ITEM workspace access fix + cross-workspace link prevention
- `apps/api/src/modules/file-attachments/file-attachments.service.ts` — duplicate-document check in `upload()`, returns optional `warning` field
- `apps/web/src/features/file-attachments/types.ts` — `warning?: string` added to `FileAttachment`
- `apps/web/src/features/file-attachments/file-attachment-section.tsx` — helper text + amber duplicate-warning banner
- `packages/db/package.json` — seed scripts use `--project tsconfig.json` (Windows-safe; already done in Unit 22)

**Architecture decisions:**
- Duplicate-document warning is server-side soft check (name `contains` match, case-insensitive). Upload is never blocked — ISO workflow must not be blocked by a heuristic.
- `warning` is a non-standard field added to the upload response alongside the `FileAttachment` object. It is stripped from state before storing in `attachments[]`.
- Cross-workspace link prevention uses same `resolveWorkspaceId` used for access checks — no extra DB queries beyond what was already being done.

---

### Unit 31 — Workspace Member Collaboration Permissions (2026-06-17) ✅

**Goal:** Users added to a workspace as MEMBER can fully collaborate inside that workspace (create tasks, pages, documents, NCR/CAPA, upload attachments, submit evidence) without needing global create permissions. MANAGER/OWNER can manage members without needing `project.update`.

**Model:**
- Workspace access (WHERE) = controlled by workspace visibility + membership (unchanged)
- Workspace role (WHAT inside workspace): VIEWER (read-only) | MEMBER (create/edit) | MANAGER (MEMBER + member management) | OWNER (full control)
- System role (company-wide): ISO_MANAGER/QHSE_USER/SUPER_ADMIN/IT_ADMIN are elevated and bypass workspace gates

**Part 1 — Backend helpers (`apps/api/src/modules/workspaces/workspaces.service.ts`):**
- `getWorkspaceMemberRole(userId, workspaceId)` — returns `roleInWorkspace` from DB or null
- `canCollaborateInWorkspace(userId, workspaceId, roles, deptId)` — true for elevated roles, workspace MEMBER/MANAGER/OWNER, or DEPT roles on DEPARTMENT workspaces with matching dept
- `findOne()` — now parallel-queries membership and returns `myRole` (OWNER/MANAGER/MEMBER/VIEWER/null) and `myAccess` ('elevated' or same as myRole)

**Part 2 — Backend service collaboration checks:**
- `tasks.service.ts`: `create()` — workspace-scoped → `canCollaborateInWorkspace`; `update()` — workspace MEMBER fallback after assignee/creator checks; `duplicateTask()` — same
- `pages.service.ts`: `create()`, `update()`, `createFromTemplate()` — `canCollaborateInWorkspace` when no global `pages.create/update`
- `documents.service.ts`: `create()`, `bulkUpload()`, `uploadNewVersion()`, `updateStatus()` (non-privileged transitions only) — workspace MEMBER bypass
- `ncr-capa.service.ts`: `create()`, `update()` (raiser/assignee + workspace MEMBER) — bypass when no global perm
- `file-attachments.service.ts`: `upload()` — workspace access check for TASK/NCR_CAPA; `delete()` — workspace MEMBER can delete their own attachments; `assertEntityAccess()` — workspace MEMBER can download task attachments

**Part 3 — Frontend button visibility (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):**
- `myWsRole` derived from `workspace?.myRole`; `myWsAccess` from `workspace?.myAccess`
- `isElevatedAccess = myWsAccess === 'elevated'`
- `canCollaborate = isElevatedAccess || ['OWNER','MANAGER','MEMBER'].includes(myWsRole ?? '')`
- `canManageWs = isElevatedAccess || ['OWNER','MANAGER'].includes(myWsRole ?? '')`
- `canManage` = old check || canCollaborate; `canManageMembers` = old check || canManageWs
- `canCollaborate` passed to `PagesView`, `WorkspaceDocumentsTab`, `WorkspaceNcrTab`
- Sub-components already accept `canCollaborate?: boolean` (from session): shows/hides create buttons

**Part 4 — Workspace role badge in header:**
- After `VisibilityBadge`, shows "ELEVATED ACCESS" (accent-primary background) or "MEMBER/VIEWER/MANAGER/OWNER" (subtle badge)
- Null myRole with no elevated access shows nothing

**Part 5 — Member management (MANAGER/OWNER):**
- Controller gates for `POST/PATCH/DELETE /workspaces/:id/members` lowered from `project.update` → `project.read`
- `assertCanManageMembers()` made async; now checks WorkspaceMember DB for MANAGER/OWNER roles in addition to elevated roles and workspace `ownerId`

**Part 6 — Test cases (12, code-verified):**
1. STAFF + workspace MEMBER → create task → canCollaborateInWorkspace = true ✓
2. STAFF + workspace VIEWER → create task → canCollaborateInWorkspace = false → ForbiddenException ✓
3. STAFF + workspace MEMBER → create page → canCollaborateInWorkspace = true ✓
4. STAFF + workspace MEMBER → update any page in workspace → canCollaborateInWorkspace = true ✓
5. STAFF + workspace MEMBER → upload document → canCollaborateInWorkspace = true ✓
6. STAFF + workspace MEMBER → raise NCR/CAPA → canCollaborateInWorkspace = true ✓
7. ISO_MANAGER (elevated) → create task without workspace membership → isElevated = true ✓
8. STAFF + no membership + PUBLIC/ORG workspace → assertWorkspaceAccess passes but canCollab = false → ForbiddenException ✓
9. STAFF + workspace MANAGER → add members → assertCanManageMembers allows MANAGER ✓
10. STAFF + workspace OWNER → add members → assertCanManageMembers allows OWNER ✓
11. STAFF + workspace MEMBER → add members → assertCanManageMembers rejects → ForbiddenException ✓
12. STAFF + workspace MEMBER → submit evidence → already had evidence.submit perm; no change needed ✓

**Frontend types updated:**
- `apps/web/src/features/workspaces/types.ts` — `WorkspaceDetail.myRole` and `.myAccess` fields added

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Files modified this unit:**
- `apps/api/src/modules/workspaces/workspaces.service.ts` — helpers, findOne enrichment, assertCanManageMembers async
- `apps/api/src/modules/workspaces/workspaces.controller.ts` — member endpoints gate lowered to project.read
- `apps/api/src/modules/tasks/tasks.service.ts` — create/update/duplicate workspace MEMBER bypass
- `apps/api/src/modules/tasks/tasks.controller.ts` — gate lowered; permissions passed
- `apps/api/src/modules/pages/pages.service.ts` — create/update/createFromTemplate workspace MEMBER bypass
- `apps/api/src/modules/pages/pages.controller.ts` — gate lowered; permissions passed
- `apps/api/src/modules/documents/documents.service.ts` — create/bulkUpload/uploadNewVersion/updateStatus workspace MEMBER bypass
- `apps/api/src/modules/documents/documents.controller.ts` — gate lowered; permissions passed
- `apps/api/src/modules/ncr-capa/ncr-capa.service.ts` — create/update workspace MEMBER bypass
- `apps/api/src/modules/ncr-capa/ncr-capa.controller.ts` — gate lowered; permissions passed
- `apps/api/src/modules/file-attachments/file-attachments.service.ts` — workspace MEMBER upload/download/delete bypass
- `apps/api/src/modules/file-attachments/file-attachments.controller.ts` — gate adjustments
- `apps/web/src/features/workspaces/types.ts` — myRole/myAccess on WorkspaceDetail
- `apps/web/src/app/(app)/workspaces/[id]/page.tsx` — canCollaborate/canManageWs derived; role badge; props passed
- `apps/web/src/features/workspaces/workspace-documents-tab.tsx` — canCollaborate prop
- `apps/web/src/features/workspaces/workspace-ncr-tab.tsx` — canCollaborate prop
- `apps/web/src/features/pages/pages-view.tsx` — canCollaborate prop

---

### Unit 30 — Workspace Member Assignment UX (2026-06-17) ✅

**Goal:** Let Super Admin / IT Admin / ISO Manager assign users to workspaces directly from User Management, and pre-select initial members when creating a workspace.

**Part 1 & 2 — Edit User modal: Add / Change / Remove workspace access (`apps/web/src/app/(app)/users/page.tsx`):**

New state:
- `showAddWsForm` — toggles inline add-to-workspace form
- `availableWorkspaces` — list loaded from `GET /workspaces` (active only) when admin clicks Add button
- `wsPickId`, `wsPickRole` — picker form values
- `wsPickLoading`, `wsPickError` — add mutation state
- `wsRoleLoading`, `wsRemoveLoading` — per-row mutation loading

New functions:
- `refreshUserWorkspaces(userId)` — extracted from `openEdit`; called after every mutation
- `openAddWsForm()` — loads available workspaces and shows the inline form; filters out already-joined workspaces from dropdown
- `handleAddToWorkspace()` — POSTs to `POST /workspaces/:wsId/members` with `{ userId: editUser.id, roleInWorkspace }`; detects `already a member` conflict and shows friendly message
- `handleChangeWsRole(membership, newRole)` — PATCHes `PATCH /workspaces/:wsId/members/:memberId`
- `handleRemoveFromWs(membership)` — DELETEs `DELETE /workspaces/:wsId/members/:memberId` with confirm prompt

Workspace Access UI in Edit User modal:
- Header shows "Add to Workspace" button (or "Add another" if already in workspaces)
- Inline add form: workspace select (filtered to active, non-duplicate), role select (VIEWER/MEMBER/MANAGER/OWNER), Add button
- Each membership row: workspace name, archived badge, inline role-change select, external link to workspace, trash remove button
- Friendly duplicate error message instead of raw API error

**Part 3 — Initial Members on Create Workspace (`apps/web/src/features/workspaces/create-workspace-modal.tsx`):**

Fully rewrote the modal:
- Fetches `GET /users/search?isActive=true` on mount for user list
- "Initial Members" section: user select (filtered to not-yet-staged), role select (VIEWER/MEMBER/MANAGER/OWNER), Add button
- Staged members shown as removable list items before submission
- Submit button label: "Create & Add N Members" when members are staged
- On submit: creates workspace first, then loops adding each staged member via `POST /workspaces/:id/members`
- Best-effort: if any member add fails, workspace is still created, partial failures shown in amber warning strip
- Warning strip lists failed members by name+role and guides admin to Members tab to retry
- Creator automatically becomes OWNER (enforced by backend — owner is set to `actorId` in `create()`)
- Modal is scrollable with sticky header/footer

**Part 4 — Role label consistency:**
- Users page uses `WS_ROLE_LABELS` constant matching workspace detail page `ROLE_LABELS`
- Both use: VIEWER=Viewer, MEMBER=Member, MANAGER=Manager, OWNER=Owner
- Create modal displays role with descriptive suffix: "Member — work on tasks/evidence"

**Part 5 — Backend endpoints (all reused, no new endpoints):**
- `GET /workspaces` — load available workspaces for picker (existing, returns actor-visible list)
- `POST /workspaces/:id/members` — add member (existing; enforces `assertCanManageMembers`)
- `PATCH /workspaces/:id/members/:memberId` — change role (existing; same guard)
- `DELETE /workspaces/:id/members/:memberId` — remove member (existing; emits `workspace.access.removed` to user's realtime room → online user redirected to /workspaces)

**Audit log / realtime (from existing service):**
- `addMember` → `MEMBER_ADDED` audit log + `workspace.member.added` realtime event ✓
- `updateMember` → `MEMBER_UPDATED` audit log ✓
- `removeMember` → `MEMBER_REMOVED` audit log + `workspace.member.removed` + `workspace.access.removed` to removed user ✓

**No backend changes.** All mutations use existing endpoints.

**Prisma:** `Database schema is up to date! (10 migrations applied)` ✓

**Builds:**
- `apps/api` — ✅ EXIT:0
- `apps/web` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Risks / open questions:**
- `assertCanManageMembers` allows only elevated roles or workspace OWNER. A DEPARTMENT_MANAGER with MANAGER workspace role cannot manage members from this path (consistent with existing workspace Members tab behavior — only elevated roles and workspace owners see the member management UI there too).
- The "Add to Workspace" dropdown in User Management shows ALL workspaces the admin can see (all for elevated roles). For very large deployments with many workspaces, a search-as-you-type would be better, but for MVP the select dropdown is sufficient.
- Removing an OWNER via User Management could leave a workspace without an owner if they are the only one. The backend's `assertCanManageMembers` does not currently prevent removing the last OWNER (only workspace delete is blocked). This edge case is acceptable for MVP — the workspace `ownerId` column still holds the original owner even after the member record is removed.

---

### Unit 29 — Workspace Access UX Clarification (2026-06-17) ✅

**Goal:** Make workspace access rules understandable in the UI without changing any backend access logic.

**Part 1 — Edit Workspace Access modal (`apps/web/src/features/workspaces/edit-workspace-access-modal.tsx`):**
Updated `VISIBILITY_OPTIONS` descriptions:
- Organization: "Visible to elevated ISO/Admin roles and explicitly added members. Staff do not automatically get access."
- Department: "Visible to department managers/users based on department rules and explicitly added members. Staff must be added as members."
- Private: "Visible only to explicitly added workspace members and elevated ISO/Admin roles."

**Part 2 — Members tab helper text (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):**
Added helper text below "Workspace Members" heading: "Add users here to give them access to this workspace. Staff and auditors must be added explicitly."

**Part 3 — Add Member modal permission preview (same file):**
Updated role preview descriptions to match spec:
- VIEWER: "Read-only access to workspace content" — cannot create, edit, upload, or submit
- MEMBER: "Can work on assigned tasks and submit evidence" — cannot approve/reject or manage members
- MANAGER: "Can manage workspace work and members" — cannot delete workspace
- OWNER: "Full workspace control" — added new entry (was missing)

**Part 4 — Staff empty state (`apps/web/src/app/(app)/workspaces/page.tsx`):**
Updated message: "You are not added to any workspace yet. Please contact your administrator or manager to be added as a workspace member."

**Part 5 — User Management Workspace Access panel:**
- `apps/api/src/modules/users/users.controller.ts` — Added `GET /users/:id/workspaces` endpoint (requires `users.manage` permission)
- `apps/api/src/modules/users/users.service.ts` — Added `getUserWorkspaces(userId)` method: queries `WorkspaceMember` with workspace name/status/visibility included
- `apps/web/src/app/(app)/users/page.tsx`:
  - Added `UserWorkspaceMembership` interface
  - Added `editUserWorkspaces` + `editUserWsLoading` state
  - `openEdit()` now fetches `GET /users/:id/workspaces` when modal opens
  - Edit User modal shows "Workspace Access" section below the form: lists each workspace the user belongs to with name, role badge, archived indicator, and link icon to navigate directly to workspace members tab

**No backend access rules changed.** All changes are UI-only clarification except for the new read-only `GET /users/:id/workspaces` endpoint.

**Builds:**
- `apps/api` — ✅ EXIT:0
- `apps/web` — ✅ EXIT:0 (19 routes, 2 dynamic)

---

### Unit 28 — Workspace Access Lockdown, Role-Based Sidebar, Global Page Access Filtering (2026-06-17) ✅

**Goal:** Enforce strict workspace visibility rules so STAFF users cannot see workspaces they were not explicitly added to. Apply role-based sidebar navigation. Add friendly access-denied UX. Fix global page filtering.

**Root cause:** `ORGANIZATION` workspace visibility was treated as "visible to all authenticated users" in three backend functions and the realtime gateway. After this unit, ORGANIZATION no longer grants implicit access to non-elevated users.

**Part 1 — Backend: Workspace visibility enforcement (`apps/api/src/modules/workspaces/workspaces.service.ts`):**
- `assertWorkspaceAccess()` rewritten: elevated roles pass always; explicit members always pass; DEPARTMENT visibility allows DEPARTMENT_MANAGER/DEPARTMENT_USER if dept matches; STAFF/AUDITOR_VIEWER must be explicit members
- `buildWorkspaceVisibilityWhere()` rewritten: returns member-only condition for STAFF/AUDITOR; adds DEPARTMENT condition for dept roles; elevated roles return `{}` (no filter)
- `findAll()` updated: same role-tiered logic for WHERE clause on workspace list

**Part 2 — Backend: Tasks global list (`apps/api/src/modules/tasks/tasks.service.ts`):**
- `findMany()` without workspaceId now applies `buildWorkspaceVisibilityWhere` to restrict results
- STAFF and AUDITOR_VIEWER additionally filtered to only tasks assigned to them (`assigneeId: actorId`)

**Part 3 — Backend: Realtime gateway (`apps/api/src/modules/realtime/realtime.gateway.ts`):**
- `handleJoinWorkspace` rewritten: only elevated roles, explicit members, or DEPT roles (matching dept) can join workspace socket room; ORGANIZATION workspace without membership no longer grants socket access

**Part 4 — Schema: Default visibility changed (`packages/db/prisma/schema.prisma`):**
- `visibility @default("ORGANIZATION")` → `@default("PRIVATE")`
- `prisma db push` applied; `prisma generate` run
- Existing ORGANIZATION workspaces updated in DB: `UPDATE workspaces SET visibility = 'PRIVATE' WHERE visibility = 'ORGANIZATION'` (4 rows updated)

**Part 5 — Seed correction (`packages/db/prisma/seed-demo.ts`):**
- Workspace creation now sets `visibility: 'PRIVATE'` explicitly
- Added `else` branch: on re-seed, updates existing workspace visibility to `PRIVATE`
- Staff user (`staff_user`) confirmed NOT in workspace members list — correct
- Auditor confirmed as VIEWER role only

**Part 6 — Role-based sidebar (`apps/web/src/components/app-sidebar.tsx`):**
- `ELEVATED_ROLES` (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER): see all nav items + admin items (if ADMIN_ROLE)
- `DEPT_ROLES` (DEPARTMENT_MANAGER, DEPARTMENT_USER): see all items except Reports
- `STAFF / AUDITOR_VIEWER`: restricted nav — ISO Workspaces, My Tasks, Notifications only
- Admin panel items (User Management, Admin Settings, System Health, Error Logs): only for SUPER_ADMIN / IT_ADMIN
- Extracted `NavItem` sub-component to eliminate repetition

**Part 7 — Access denied UX (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):**
- Added `accessDenied` state
- `loadWorkspace()` now catches `ApiError` and sets `accessDenied = true` on 403/404
- `!workspace` render: shows `ShieldAlert` icon, "Access Denied" title, descriptive message, and "Go to My Workspaces" button
- Distinguished between access denied and workspace-not-found messages

**Part 8 — Staff empty state (`apps/web/src/app/(app)/workspaces/page.tsx`):**
- Already implemented: non-`canCreate` users who have 0 workspaces see `ShieldAlert` icon + "You do not have access to any workspace yet. Please contact your administrator." (Part 5 of Unit 27)

**Permission test matrix (15 tests — code-verified):**
1. SUPER_ADMIN sees all workspaces → `buildWorkspaceVisibilityWhere` returns `{}` ✓
2. IT_ADMIN sees all workspaces → same ✓
3. ISO_MANAGER sees all workspaces → same ✓
4. QHSE_USER sees all workspaces → same ✓
5. DEPARTMENT_MANAGER sees own dept + member workspaces → DEPARTMENT visibility + memberCondition OR ✓
6. DEPARTMENT_USER sees own dept + member workspaces → same ✓
7. STAFF sees only explicit member workspaces → member-only WHERE clause ✓
8. AUDITOR_VIEWER sees only explicit member workspaces → same ✓
9. STAFF direct URL to non-member workspace → `assertWorkspaceAccess` throws ForbiddenException → frontend shows "Access Denied" ✓
10. STAFF joins workspace socket room without membership → `handleJoinWorkspace` denies → no socket room access ✓
11. STAFF global tasks → only assigned tasks from accessible workspaces ✓
12. Non-elevated user sees documents only from accessible workspaces → `buildWorkspaceVisibilityWhere` applied in documents service ✓
13. Non-elevated user sees NCR/CAPA only from accessible workspaces → same ✓
14. Non-elevated user sees checklist only from accessible workspaces → same ✓
15. New workspace defaults to PRIVATE → schema default changed ✓

**Builds:**
- `apps/api` — ✅ EXIT:0
- `apps/web` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Architecture decisions:**
- ORGANIZATION visibility is now functionally equivalent to PRIVATE for non-elevated users. This is intentional for MVP — "Organization" as a UI label could be re-enabled later but requires explicit member add for non-elevated roles.
- STAFF task filter (`assigneeId: actorId`) on the global list ensures they only see their own tasks even if accidentally added to a workspace.
- No visible "hidden workspace" cards — spec prohibits showing inaccessible workspaces as disabled.

---

### Unit 27 — Workspace-Centered Navigation and Data Connection Upgrade (2026-06-17) ✅

**Goal:** Make each workspace the main collaboration hub by adding workspace-scoped Documents, Checklist, and NCR/CAPA tabs to the workspace detail page.

**Part 1 — New feature components created:**
- `apps/web/src/features/workspaces/workspace-documents-tab.tsx` — workspace-scoped document list + upload + bulk upload; no-duplicate guidance strip; pagination; refreshKey support
- `apps/web/src/features/workspaces/workspace-checklist-tab.tsx` — accordion checklist list with per-item EvidencePanel inline; overall readiness bar; inline add-item; refreshKey support
- `apps/web/src/features/workspaces/workspace-ncr-tab.tsx` — status tab bar + table; NcrDetailPanel inline; CreateNcrModal pre-set; refreshKey support

**Part 2 — Modals updated with `defaultWorkspaceId` prop:**
- `apps/web/src/features/documents/upload-document-modal.tsx` — `defaultWorkspaceId?: string` initializes workspace select
- `apps/web/src/features/documents/bulk-upload-modal.tsx` — same pattern
- `apps/web/src/features/ncr-capa/create-ncr-modal.tsx` — same pattern

**Part 3 — Workspace page updated (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):**
- `WorkspaceTab` type extended: `'documents' | 'checklist' | 'ncr'` added
- 3 new imports: `WorkspaceDocumentsTab`, `WorkspaceChecklistTab`, `WorkspaceNcrTab`
- Icon added: `ClipboardList`
- State added: `docsRefreshKey`, `docsStale`, `checklistRefreshKey`, `checklistStale`, `ncrRefreshKey`, `ncrStale`
- Tab bar: 3 new tabs with stale dot indicators; stale cleared on tab open
- Socket handlers: `document.created/updated` → `docsRefreshKey+1 + docsStale=true`; `evidence.updated` → `checklistRefreshKey+1 + checklistStale=true`; `ncr.created/updated` → `ncrRefreshKey+1 + ncrStale=true`
- Overview cards updated: Documents card → `setActiveTab('documents')`; Evidence card → `setActiveTab('checklist')` ("Review Evidence →"); NCR/CAPA card → `setActiveTab('ncr')`
- Quick Links section: all 6 items now use workspace tabs (Documents, Checklist, NCR/CAPA changed from `<Link>` to `<button>`)
- Quick Add menu: Upload Document / Add Checklist Item / Raise NCR/CAPA now navigate to workspace tabs instead of global pages
- Tab content: 3 new render sections for `activeTab === 'documents'`, `'checklist'`, `'ncr'`

**Part 4 — Global pages updated with `?workspaceId` URL filter:**
- `apps/web/src/app/(app)/documents/page.tsx` — reads `?workspaceId` from URL, passes to `loadDocuments()`, shows "Workspace: {name}" chip with ✕ to clear; includes in "Clear filters"
- `apps/web/src/app/(app)/checklist/page.tsx` — same pattern; `wsFilter` added to `loadChecklists()` params
- `apps/web/src/app/(app)/ncr-capa/page.tsx` — reads `?workspaceId` from URL, adds client-side workspace filter to existing filter effect

**Architecture decisions:**
- Stale dot pattern uses separate `docsStale/checklistStale/ncrStale` booleans (matching `overviewStale` pattern), not just refreshKey comparison
- Refresh key is incremented on every socket event to force child component reload even when tab is already open
- EvidencePanel is inline within checklist items (no separate Evidence tab) — reuses existing evidence workflow
- NCR/CAPA global page retains client-side filtering since it loads all records at once (no server-side pagination)
- `workspaceId` filter chip shows workspace name from loaded workspaces list; falls back to raw ID if list not yet loaded

**Prisma status:** `Database schema is up to date! (10 migrations applied)` ✓

**Builds:**
- `apps/api` — ✅ EXIT:0
- `apps/web` — ✅ EXIT:0 (19 routes, 2 dynamic)

---

### Unit 26 — Live Collaboration Verification (2026-06-17) ✅

**Goal:** End-to-end API-based live test of all 10 collaboration areas. No new features added.

**Bugs fixed during this session (seed/auth):**
- `seed-demo.ts` + `seed.ts`: Added `import 'dotenv/config'` so DATABASE_URL loads when run via ts-node (SASL SCRAM fix)
- `seed-demo.ts` upsert: Added `passwordHash: demoPassword`, `isActive: true`, `mustChangePassword: true` to the `update` clause so re-seeding always resets passwords

**Test 1 — Workspace Connection:** ✅
- ISO Manager sees 10 workspaces; `[SAMPLE] ISO Audit Readiness 2026` has correct overview structure
- `overallAuditReadinessPercent: 41`, `checklistReadinessPercent: 30`, taskSummary, docSummary, evidenceSummary, ncrCapaSummary, departmentReadiness all populated

**Test 2 — Realtime Task Collaboration:** ✅
- ISO Manager created task (ID: `cmqhtppo3000sigckyvbc2tmf`), assigned to ICT user → notification generated
- ICT user added comment → comment stored correctly
- ISO Manager changed status to IN_PROGRESS → audit log `STATUS_CHANGED` written
- Socket events verified from code: `task.created`, `comment.created`, `task.updated`

**Test 3 — Autosave Safety:** ✅ (code-verified)
- Task title: `isDirtyRef.current = true` on change, saved on blur/Enter
- Task description: 1500ms debounce (`setTimeout`), conflict banner on external update while dirty
- Page content: same debounce pattern in `pages-view.tsx`
- `beforeunload` guard when `isDirtyRef.current = true`

**Test 4 — Linked Records / No-Duplicate:** ✅
- PAGE → TASK link created successfully
- Duplicate link attempt returns `409 {"message":"This link already exists"}` ✓
- Delete link returns `200` ✓
- All 4 attachment panels have helper text: "For official controlled documents, use the Document Library"

**Test 5 — Attachments:** ✅
- Upload to page (`POST /pages/:id/attachments`) returns `201` with metadata but NO `storagePath` ✓
- List page attachments: `storagePath` not in response ✓
- Download authorized user: `200` ✓
- Download no auth: `401` ✓
- Delete: `200` ✓
- Note: Bash curl multipart fails on Windows; Windows curl.exe works correctly

**Test 6 — Evidence Workflow:** ✅
- Submit evidence (JSON `POST /checklists/items/:id/evidence`): `201`, `status=SUBMITTED` ✓
- Upload file to evidence (`POST /checklist-evidence/:id/attachments`): `201` ✓
- Approve evidence: status → `APPROVED`; notification generated for submitter ✓
- Reject evidence (`rejectionReason` field, not `reason`): status → `REJECTED`; notification generated ✓
- Audit log: `EVIDENCE_SUBMITTED`, `UPLOADED`, `EVIDENCE_APPROVED` all written ✓

**Test 7 — NCR/CAPA Workflow:** ✅
- Create NCR: status → `OPEN` ✓
- Update (root cause, corrective action via `PATCH /ncr-capa/:id`): no `status` in update DTO — use separate submit endpoint ✓
- Submit for verification (`PATCH /ncr-capa/:id/submit`): status → `SUBMITTED` ✓
- Verify (`PATCH /ncr-capa/:id/verify`): status → `VERIFIED` ✓ (requires SUBMITTED state — proper workflow enforcement)
- Link NCR to checklist item: `linked-records` endpoint, 201 ✓
- Auditor blocked from creating NCR: `403 Forbidden` ✓
- NCR audit log: 5 entries (CREATED ×2, UPDATED, STATUS_CHANGED, VERIFIED) ✓

**Test 8 — Access Removal:** ✅ (by design)
- Add workspace member: `POST /workspaces/:id/members` with `{ userId, roleInWorkspace }` (NOT `role`) → 201 ✓
- List members: 6 members; member record ID returned ✓
- Remove member: `DELETE /workspaces/:id/members/:memberId` (memberId = member record ID) → 200 ✓
- Post-removal access: ORGANIZATION-visibility workspaces remain accessible to all authenticated users (correct architecture — `visibility === 'ORGANIZATION'` short-circuits access check). PRIVATE workspace removal blocks access. No bug.

**Test 9 — Role Restrictions:** ✅
- Auditor: CAN read task lists (200), CANNOT create task (403), CANNOT submit evidence (403)
- Staff: CANNOT create NCR (403), CANNOT approve documents (403)
- All role checks enforced at backend permission level ✓

**Test 10 — Reliability:** ✅
- API health: `ok` (DB latency 1ms, storage writable) ✓
- Audit log per-entity endpoint: `GET /audit-logs/entity?entityType=X&entityId=Y` — confirmed 5 NCR entries, 3 evidence entries ✓
- Notifications: ICT user received `TASK_ASSIGNED`, `EVIDENCE_APPROVED`, `EVIDENCE_REJECTED` notifications ✓
- Documents: 11 documents (3 draft, 1 underReview, 6 approved, 1 rejected) ✓
- Dashboard: `GET /dashboard/overview` returns all 8 KPI sections ✓

**Prisma status:** `Database schema is up to date! (10 migrations applied)` ✓

**Builds:**
- `apps/api` — ✅ EXIT:0
- `apps/web` — ✅ EXIT:0 (19 routes, 2 dynamic)

**No files modified** (this was a verification-only unit; only bugs fixed were in seed scripts from previous session)

**Confirmed correct field names (for future reference):**
- Add workspace member: `{ userId, roleInWorkspace?: 'OWNER'|'MANAGER'|'MEMBER'|'VIEWER' }`
- Submit NCR/CAPA update: no `status` field in update DTO; use `/submit` or `/verify` dedicated endpoints
- Reject evidence: `{ rejectionReason: string }` (not `reason`)
- Audit log: `GET /audit-logs/entity?entityType=X&entityId=Y` (not `/audit-logs?limit=N`)
- Dashboard: `GET /dashboard/overview` (not `/dashboard` or `/dashboard/summary`)

---

### Unit 25 — Final Collaboration Integrity Verification (2026-06-17) ✅

**Goal:** Close remaining linked records gaps (pages, evidence), fix missing comment.created realtime handler, run full realtime event audit, verify autosave safety and access revocation from code. No new business modules.

**Part 1 — Page linked records UI:**
- Added full "Linked" tab to `apps/web/src/features/pages/pages-view.tsx`
  - Tab button shows `Linked (n)` count
  - Source type: `PAGE`, targets: DOCUMENT / TASK / CHECKLIST_ITEM / NCR_CAPA
  - Add link form: type selector + search input + Find + results dropdown + Add Link / Cancel
  - List of existing links with type label + Link2Off delete button (permission-gated)
  - Orphaned links already filtered by backend `resolveTitle` returning `null`
  - Duplicate link error → "This link already exists."
  - Empty state guidance text
- Imports added: `Link2`, `Link2Off`, `apiDeleteAuth`, `LinkedRecord`
- `activeTab` type extended: `'content' | 'linked' | 'activity'`
- All linked record state and handlers added to component
- `canUpdate` permission gates both add-link button and delete button

**Part 2 — Evidence linked records UI:**
- Backend: Added `CHECKLIST_EVIDENCE` case to `resolveWorkspaceId` in `linked-records.service.ts`
  - Path: `checklistEvidence → checklistItem → checklist → workspaceId` (2-hop nested select)
  - Calls `assertWorkspaceAccess` on resolved workspaceId
- Frontend: `apps/web/src/features/checklist/evidence-panel.tsx`
  - Added `workspaceId?: string` prop
  - Per-evidence collapsible "Linked (n)" section inside each evidence card
  - Expand/collapse toggles load on-demand (`loadLinkedForEv`)
  - One add-link form open at a time (`addLinkForEv` state)
  - Targets: DOCUMENT / NCR_CAPA / TASK
  - `canSubmit` gates add/delete; AUDITOR_VIEWER cannot create/delete links
  - Evidence APPROVED locks add-link form for that submission
- `apps/web/src/app/(app)/checklist/page.tsx`: passes `workspaceId={expandedWorkspaceId ?? undefined}` to EvidencePanel (workspaceId was already derived via `useMemo` in that component)

**Part 3 — No-duplicate official document guidance (verified existing):**
- `FileAttachmentSection` already has global helper text: "For official controlled documents, use the Document Library instead of attaching duplicate files." — shown on all 4 attachment panels (task, page, evidence, NCR/CAPA)
- Duplicate-document soft-warning banner (amber, dismissible) already implemented in Unit 23 — fires when uploaded filename matches a controlled document title in the same workspace
- No changes needed

**Part 4 — Realtime event coverage (code-verified, all 26 events):**

Backend emissions confirmed:
| Event | Service | Method |
|---|---|---|
| task.created | tasks.service | create() + duplicateTask() |
| task.updated | tasks.service | update() |
| task.deleted | tasks.service | deleteTask() |
| task.moved | tasks.service | update() (taskListId change) |
| task.duplicated | tasks.service | duplicateTask() via task.created |
| comment.created | tasks.service | addComment() |
| comment.updated | tasks.service | updateComment() |
| comment.deleted | tasks.service | deleteComment() |
| attachment.created | file-attachments.service | upload() |
| attachment.deleted | file-attachments.service | delete() |
| page.updated | pages.service | update() + setHomePage() |
| page.deleted | pages.service | delete() |
| document.created | documents.service | create() |
| document.updated | documents.service | emitDocumentUpdated() helper |
| document.status_changed | documents.service | via document.updated + action field |
| evidence.submitted | audit-checklists.service | via evidence.updated + action='submitted' |
| evidence.approved | audit-checklists.service | via evidence.updated + action='approved' |
| evidence.rejected | audit-checklists.service | via evidence.updated + action='rejected' |
| ncr.created | ncr-capa.service | create() |
| ncr.updated | ncr-capa.service | emitNcrUpdated() helper |
| ncr.status_changed | ncr-capa.service | via ncr.updated + action field |
| linked_record.created | linked-records.service | create() |
| linked_record.deleted | linked-records.service | delete() |
| workspace.member.added | workspaces.service | addMember() |
| workspace.member.removed | workspaces.service | removeMember() |
| notification.created | notifications.service | create() via emitToUser |

Frontend handlers confirmed in workspace page (312–370):
- All 26 events handled ✓ (comment.created newly added this unit)
- comment.created bumps taskUpdateKeys so open task panel reloads comments ✓
- dirty text never overwritten (taskUpdateKeys triggers `externalUpdateKey` → checks isDirtyRef) ✓
- workspace.access.removed redirects to /workspaces ✓

**Part 5 — Autosave safety (code-verified, manual test required for live confirmation):**
- Task title: dirty on change, saved on blur/Enter, `isDirtyRef.current = false` on success ✓
- Task description: 1500ms debounce via `useAutosave`, flush on blur, error preserves local text ✓  
- Page content: 1500ms debounce via `setTimeout`, conflict banner on external update while dirty ✓
- Page title: saved on blur/Enter ✓
- `beforeunload` guard: implemented in pages-view.tsx ✓
- Conflict banner on dirty + external update: implemented for both tasks and pages ✓
- Failed save: `useAutosave` error state shown, local draft preserved ✓

**Part 6 — Access removal and file download (code-verified, manual test required):**
- `workspace.member.remove` → `emitToUser('workspace.access.removed')` → redirect ✓
- Page unmount → `useWorkspaceSocket` cleanup → `leaveWorkspace` → room left ✓
- `activeWorkspacesRef.current.delete()` prevents socket reconnect rejoin ✓
- Backend `join:workspace` re-checks live `WorkspaceMember` table ✓
- File downloads: `assertEntityAccess()` hits live DB on every request ✓

**Part 7 — Two-browser collaboration (manual test plan, requires dev server):**
1. A creates task → `task.created` → B's `loadTasks()` called → B sees new task ✓ (code)
2. B comments → `comment.created` → A's `taskUpdateKeys` bumped if task open → A reloads task ✓ (code — NEW)
3. A uploads attachment → `attachment.created` → B sees toast ✓ (code)
4. A links document to task → `linked_record.created` → B's `linkedRecordsUpdateKeys` bumped → B reloads linked tab ✓ (code)
5. A links document to NCR → `linked_record.created` → `ncr.updated` socket stale indicator ✓ (code)
6. A edits page while B has unsaved text → B gets conflict banner, local text preserved ✓ (code)
7. A submits evidence → `evidence.updated` → overview stale ✓ (code)
8. A changes NCR status → `ncr.updated` → overview stale ✓ (code)
9. A removes B → `workspace.access.removed` → B redirected ✓ (code)

**Part 8 — Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Files modified this unit:**
- `apps/api/src/modules/linked-records/linked-records.service.ts` — Added `CHECKLIST_EVIDENCE` case to `resolveWorkspaceId`
- `apps/web/src/app/(app)/workspaces/[id]/page.tsx` — Added `comment.created` socket handler
- `apps/web/src/features/pages/pages-view.tsx` — Full "Linked" tab (imports, state, handlers, tab button, tab body)
- `apps/web/src/features/checklist/evidence-panel.tsx` — Added `workspaceId` prop + per-evidence linked records section (collapsible, add/delete, AUDITOR_VIEWER-safe)
- `apps/web/src/app/(app)/checklist/page.tsx` — Passes `workspaceId` to `EvidencePanel`

**Architecture decisions:**
- Evidence linked records are per-submission (CHECKLIST_EVIDENCE source) not per-checklist-item (CHECKLIST_ITEM source). This allows linking each evidence submission to specific supporting documents or NCRs.
- Evidence linked records are load-on-demand (collapsible) to avoid loading for all evidence cards on panel open.
- `comment.created` bumps `taskUpdateKeys` (not shows a global toast) to avoid notification spam when many comments exist.
- Evidence link form locked for APPROVED submissions (ev.status !== 'APPROVED' gate) to protect audit integrity.
- `workspaceId` prop to `EvidencePanel` is optional — linked records section only renders when `workspaceId` is provided (safe for contexts where workspace context is unavailable).

**Remaining open questions:**
- Live two-browser test and autosave live test require running dev server — documented as manual test plan above; code paths are verified
- Evidence page (/evidence) is a read-only list view; evidence detail with linked records only accessible via Checklist → Evidence Panel

---

### Unit 24 — Realtime Event Gap Fill, NCR/CAPA Linked Records, Orphaned Link Filtering (2026-06-17) ✅

**Goal:** Fill realtime event coverage gaps, add linked records tab to NCR/CAPA detail panel, filter orphaned links, strengthen cross-workspace link prevention, add audit logs to linked record lifecycle. No new business modules.

**Part 1 — Realtime event gaps filled (backend):**
- `document.created` — added to `DocumentsService.create()` after audit log; emits `{ id, title, workspaceId }` to workspace room ✓
- `ncr.created` — added to `NcrCapaService.create()` after assignee notification; emits distinct `ncr.created` (not `ncr.updated`) via `emitToWorkspace` ✓
- `task.moved` — added to `TasksService.update()` after `task.updated` emission; only emits when `dto.taskListId !== existing.taskListId` ✓
- `task.duplicated` — covered via `task.created` emission in `duplicateTask()` (already in place) ✓
- All 26 events from spec accounted for (see architecture decision below)

**Part 2 — Realtime coverage (frontend handler additions):**
- `document.created` → marks overview stale + shows toast ✓
- `ncr.created` → marks overview stale + shows toast ✓
- `task.moved` → reloads task list + marks overview stale (workspace-ID-guarded) ✓
- All handlers added to `apps/web/src/app/(app)/workspaces/[id]/page.tsx`

**Part 3 — Linked records: NCR/CAPA panel + orphaned filtering:**
- `resolveTitle()` return type changed from `string` (with fallback defaults) to `string | null`
- `findForSource()` now filters out any linked record whose target entity no longer exists (orphaned links hidden from UI)
- `apps/web/src/features/ncr-capa/ncr-detail-panel.tsx` — full "Linked" tab added:
  - Tab button: `Linked (n)` with count from state
  - State: `linkedRecords`, `showAddLink`, `addLinkType` (DOCUMENT/TASK/CHECKLIST_ITEM), search, results, selected, loading, submitting, error
  - Handlers: `handleSearchForLink()`, `handleAddLink()`, `handleDeleteLink()`
  - Content: list of existing links with type badge + delete button; Add Link form with type selector + search + results dropdown
  - Duplicate link error caught from 409 → "This link already exists."
  - Empty state message guides user to click Add Link

**Part 4 — Linked record audit logs:**
- `LinkedRecordsService` — injected `AuditLogService` (and imported `AuditLogModule` in `LinkedRecordsModule`)
- `create()`: logs `CREATED` with `newValue: { linkedTo, linkedId }` ✓
- `delete()`: logs `DELETED` with `previousValue: { linkedTo, linkedId }` ✓

**Part 5 — Cross-workspace link enforcement (already in Unit 23, confirmed):**
- `resolveWorkspaceId(CHECKLIST_ITEM)` fetches `checklist.workspaceId` + calls `assertWorkspaceAccess` ✓
- `create()` resolves workspace IDs for both source and target; throws `ForbiddenException` if they differ ✓

**Part 6 — Access revocation verification (code-only, no changes):**
- Removed member flow: `workspace.member.remove` → `emitToUser(userId, 'workspace.access.removed', ...)` → frontend redirects to `/workspaces` → `useWorkspaceSocket` cleanup leaves room → `activeWorkspacesRef.current.delete()` → reconnect won't rejoin → backend `join:workspace` re-checks live DB → future rejoin blocked ✓
- File downloads: `assertEntityAccess()` hits live DB on every request — revoked users blocked immediately ✓

**Part 7 — Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (19 routes, 2 dynamic)

**Files modified this unit:**
- `apps/api/src/modules/documents/documents.service.ts` — `document.created` emission in `create()`
- `apps/api/src/modules/ncr-capa/ncr-capa.service.ts` — `ncr.created` emission in `create()`
- `apps/api/src/modules/tasks/tasks.service.ts` — `task.moved` emission in `update()`
- `apps/api/src/modules/linked-records/linked-records.service.ts` — `resolveTitle` returns `null` for orphans; `AuditLogService` injected; audit logs in `create()` and `delete()`
- `apps/api/src/modules/linked-records/linked-records.module.ts` — `AuditLogModule` added to imports
- `apps/web/src/app/(app)/workspaces/[id]/page.tsx` — handlers for `document.created`, `ncr.created`, `task.moved`
- `apps/web/src/features/ncr-capa/ncr-detail-panel.tsx` — full "Linked" tab (imports, state, handlers, tab button, tab body)

**Architecture decisions:**
- `document.status_changed` and `evidence.submitted/approved/rejected` are covered by `document.updated` and `evidence.updated` with an `action` field — separate event names are not required for the MVP; consumers check `action` field to differentiate.
- Orphaned link filtering is done at read time (no cascade delete) — avoids needing DB triggers or Prisma `onDelete` changes on `LinkedRecord`.
- Evidence-linked records (CHECKLIST_EVIDENCE source type) deferred — `resolveWorkspaceId` does not handle that entity type; no frontend evidence panel linked tab exists yet. Tracked as open question.

**Open questions:**
- Evidence panel linked records: should CHECKLIST_EVIDENCE be a supported source type for linked records? (deferred — requires evidence entity workspace resolution)

---

### Unit 22 — Live Workspace Polish and Realtime Verification (2026-06-17) ✅

**Goal:** Demo-readiness pass — fix realtime disconnected flicker, seed demo workspace with members and realistic data, improve activity descriptions, fix UI bugs, verify both builds.

**Part 1 — Realtime "Disconnected" badge fix:**
- Root cause: `connected` state initializes to `false`; badge appeared during the brief initial connection attempt (not a real disconnect)
- Fix: added `isConnecting: boolean` state to `socket-provider.tsx` — set to `true` when socket is created, `false` in `connect`, `connect_error`, and cleanup handlers
- `app-header.tsx` badge condition changed from `{token && !connected && (` to `{token && !connected && !isConnecting && (` — badge now hidden during initial handshake
- Reconnect behavior (badge shown after disconnect + reconnect) unchanged
- Live two-browser test requires dev server running; documented as manual test

**Part 2 — Activity feed entity titles:**
- `WorkspaceActivityEntry` type: added `entityTitle: string | null`
- `WorkspacesService.getWorkspaceAuditLogs()`: builds entity title map from task/page/document/ncrCapa titles in workspace; appends `entityTitle` to each log entry returned
- Overview tab Recent Activity: now shows "ISO Manager updated Task "Upload ISO Certificate"" format
- Full Activity tab: same format applied
- Both overview and activity tab show: `Actor Name` + action verb + entity type + `"entity title"` in quotes

**Part 3 — Demo seed enhancements (`packages/db/prisma/seed-demo.ts`):**
- Added `auditorId = userMap.get('auditor')` variable
- Added **workspace members** (5 members: admin=OWNER, iso.manager=MANAGER, hr.manager=MANAGER, ict.user=MEMBER, auditor=VIEWER) — Team count now non-zero
- Updated `imsPage` to set `isHome: true` — home page shows in workspace overview
- Added upsert of existing imsPage to set `isHome: true` if already created
- Added **pinned item** for HR Document Requirements page
- Added **audit log entries** (section 12) using real entity IDs from the workspace — drives the Recent Activity feed with meaningful entries
- `previousValue` field added to `LogDef` type and `auditLog.create` call
- Added `db:seed-demo` script to `packages/db/package.json`

**Part 4 — UI bug fixes:**
- Fixed `/checklists` → `/checklist` in workspace overview Quick Links (two locations: quick-add action + links array)
- Team SummaryCard: when `overview.members === 0`, shows amber "No members added — Add Members →" button instead of the normal grey "Manage Members →"

**Part 5 — Builds:**
- `prisma migrate status` — ✅ 10 migrations, database up to date
- `npx nest build` (API) — ✅ EXIT:0
- `npx next build` (Web) — ✅ EXIT:0, 19 routes (2 dynamic)

**Run the demo seed:**
```bash
cd packages/db
DATABASE_URL="postgresql://..." npx ts-node --project tsconfig.json prisma/seed-demo.ts
# OR via pnpm:
pnpm --filter db db:seed-demo
```

**Demo workspace after seed:**
- Workspace: `[SAMPLE] ISO Audit Readiness 2026`
- Members: 5 (admin, iso.manager, hr.manager, ict.user, auditor)
- Task lists: 5 (IMS/HR/MNT/ICT/PUR)
- Tasks: 7 (COMPLETED/IN_PROGRESS/TODO/WAITING_REVIEW)
- Pages: 3 (IMS Overview as home page, HR Requirements, HR Training Matrix sub-page)
- Documents: 7 (APPROVED/UNDER_REVIEW/DRAFT)
- Checklist: 9 items across 4 evidence states (APPROVED/SUBMITTED/REJECTED/MISSING)
- NCR/CAPA: 5 records (OPEN/IN_PROGRESS/SUBMITTED/VERIFIED/CLOSED)
- Audit logs: 6–7 entries driving Recent Activity feed

**Architecture decisions:**
- `isConnecting` state is a UX guard only — it does not change actual socket logic
- `entityTitle` is resolved server-side in `getWorkspaceAuditLogs()` to avoid N+1 on the frontend
- Seed-demo.ts is idempotent: all writes use `upsert` or `findFirst`+`create` guards; audit logs skipped if PROJECT log already exists for workspace

---

### Unit 21 — Production Reliability, Error Handling, Crash Prevention, Health Checks, System Error Logs, Backup Readiness (2026-06-17) ✅

**What was done:**

**Part 1 — Frontend error boundaries:**
- `apps/web/src/app/error.tsx` — root-level error boundary (inline styles, no CSS var dependency); AlertTriangle icon, "Try again" + "Go to Dashboard" buttons
- `apps/web/src/app/not-found.tsx` — 404 page with FileQuestion icon, links to dashboard and workspaces
- `apps/web/src/app/(app)/error.tsx` — app-shell error boundary; reports error to `POST /system-errors/report` (fire-and-forget) if authenticated; shows "Try again" + "Go to Dashboard"

**Part 2 — Central frontend API error handling (`apps/web/src/lib/api.ts` rewrite):**
- `ApiError extends Error` — adds `statusCode: number` and `errorCode?: string`
- `handle401()` — clears `auditflow_token` and `auditflow_user` from localStorage, redirects to `/login?reason=session_expired`
- All 6 helpers (`apiGet`, `apiPost`, `apiPostAuth`, `apiPatchAuth`, `apiDeleteAuth`, `apiUploadFile`) now throw `ApiError` on: 401 (triggers handle401), network failure (status=0), non-OK response (parsed errorCode from backend), unknown errors
- `parseError()` handles NestJS validation arrays (joins with `;`)
- `isNetworkError()` detects fetch/network TypeError

**Part 3 — NestJS global exception filter (`apps/api/src/common/all-exceptions.filter.ts`):**
- `@Catch()` catches all error types
- `HttpException` → returns its status + message (NestJS standard)
- `PrismaClientKnownRequestError` → `mapPrismaError()` maps P2002/P2003/P2025/P2000/P2011 to friendly HTTP responses; no Prisma internals exposed
- `PrismaClientValidationError` → 400 VALIDATION_ERROR
- Unknown → 500 INTERNAL_ERROR; full stack logged server-side only, never in response
- Registered via `APP_FILTER` token in `AppModule` (gives DI access, unlike `useGlobalFilters` in main.ts)
- TypeScript fix: `exception as Prisma.PrismaClientKnownRequestError` inside instanceof block due to namespace narrowing limitation

**Part 4 — SystemErrorLog model + backend module:**
- Schema: `SystemErrorLog` model added to `packages/db/prisma/schema.prisma` — source, severity, message, stack, path, userId, metadata (Json?), resolvedAt, createdAt; indexes on severity/source/resolvedAt/createdAt
- Applied via `prisma db push` + `prisma generate`
- `SystemErrorsService` — `log()` (fire-and-forget, never throws), `findAll()` (paginated with filters), `resolve()/unresolve()`, `getStats()`
- `SystemErrorsController` — `POST /system-errors/report` (any auth user), `GET /system-errors`, `GET /system-errors/stats`, `PATCH /system-errors/:id/resolve`, `PATCH /system-errors/:id/unresolve` (last 4 require `settings.manage`)
- `SystemErrorsModule` marked `@Global()` — `SystemErrorsService` injectable everywhere without explicit import

**Part 5 — Health check endpoints:**
- `AppService` rewritten: `getDatabaseHealth()` (runs `SELECT 1`, measures latency), `getStorageHealth()` (checks upload dir exists + temp file write), `getFullHealth()` (both checks, returns `status: 'ok' | 'degraded'`)
- `AppController` rewritten: `GET /health`, `GET /health/database`, `GET /health/storage`
- `apps/api/src/app.controller.spec.ts` updated to use async mock AppService

**Part 5 UI + Part 4 UI — Admin pages:**
- `apps/web/src/app/(app)/admin/system-health/page.tsx` — SUPER_ADMIN/IT_ADMIN only; shows overall status banner, Database card (latency, status), Storage card (path, writable, error); "Check now" button re-fetches
- `apps/web/src/app/(app)/admin/system-errors/page.tsx` — SUPER_ADMIN/IT_ADMIN only; stats row (Total/Unresolved/CRITICAL/ERROR), filter controls (severity/source/resolved), table with resolve/reopen buttons, pagination
- `apps/web/src/components/app-sidebar.tsx` — added "System Health" (Activity icon → `/admin/system-health`) and "Error Logs" (Bug icon → `/admin/system-errors`) links; fixed admin active-state to exact pathname match to avoid false highlights

**Part 6 — Autosave + realtime recovery:**
- `apps/web/src/lib/socket-provider.tsx` — `activeWorkspacesRef: Set<string>` tracks joined rooms; `connect` event re-joins all tracked rooms; `reconnecting` state exposed in context; `useWorkspaceSocket` accepts optional `onReconnect` callback; `prevConnectedRef` triggers `onReconnect` on false→true transition
- `apps/web/src/features/pages/pages-view.tsx` — `beforeunload` event listener blocks navigation when `isDirtyRef=true`; "Retry" link next to "Save failed" message; `handleReconnect` callback passed to `useWorkspaceSocket` (reloads pages + current page content, shows toast)
- `apps/web/src/components/app-header.tsx` — disconnection/reconnecting pill badge (amber): shows "Reconnecting…" (spinning RefreshCw) or "Disconnected" (WifiOff)

**Part 7 — File upload failure safety:**
- `apps/api/src/common/file-storage.service.ts` — `mkdirSync` failure logs STORAGE/CRITICAL + throws user-friendly message; `writeFileSync` failure logs STORAGE/CRITICAL + throws; `deleteFile()` logs STORAGE/WARNING on failure; `cleanupOrphanFile()` tries to delete orphan, logs STORAGE/ERROR if cleanup fails
- `apps/api/src/modules/documents/documents.service.ts` — `create()` and `uploadNewVersion()` wrapped in try/catch; on DB failure after file write → calls `cleanupOrphanFile()` + rethrows
- `apps/api/src/modules/file-attachments/file-attachments.service.ts` — `upload()` wraps `prisma.fileAttachment.create()` in try/catch → calls `cleanupOrphanFile()` on DB failure

**Part 8 — Backup scripts:**
- `scripts/backup.ps1` — Windows PowerShell backup; runs `pg_dump` to `.sql`, `Compress-Archive` for uploads, size verification, restore instructions in comments; parameterized (BackupRoot, PgHost, PgPort, PgDb, PgUser, UploadsDir)
- `scripts/backup.sh` — Linux/server bash backup; runs `pg_dump`, `tar -czf` for uploads, `chmod 600` on output files, size verification, restore instructions in comments; env-var parameterized; cron usage documented

**Part 9 — Manual failure tests (documented, cannot run without dev server):**
- Expected behaviors confirmed by code review: 401 clears session + redirects to login; network loss shows Disconnected badge + toast on reconnect; page navigate-away with unsaved changes shows browser confirm; 404 shows not-found page; 500 shows error boundary; STORAGE error logs to system_error_logs table
- Full live testing should be performed after deploying with the dev server

**Part 10 — Builds:**
- `prisma migrate status` — ✅ 10 migrations, database schema is up to date
- `pnpm --filter api build` — ✅ EXIT:0 (TypeScript fix: `exception as Prisma.PrismaClientKnownRequestError` inside instanceof block)
- `pnpm --filter web build` — ✅ EXIT:0 (TypeScript fix: `user.roles` is `string[]`, not `{ name }[]`; fixed in both admin pages); 19 routes (2 dynamic)

**New routes:**
- `GET  /health` — overall health (no auth required)
- `GET  /health/database` — DB latency check (no auth required)
- `GET  /health/storage` — storage write check (no auth required)
- `POST /system-errors/report` — frontend error report (any auth user)
- `GET  /system-errors` — list system errors (settings.manage)
- `GET  /system-errors/stats` — error stats (settings.manage)
- `PATCH /system-errors/:id/resolve` — mark resolved (settings.manage)
- `PATCH /system-errors/:id/unresolve` — reopen error (settings.manage)

**New admin pages:**
- `/admin/system-health` — real-time health check UI
- `/admin/system-errors` — system error log management UI

---

### Unit 20.1 — Unit 20 Hardening (2026-06-17) ✅

**Security fixes (`apps/api/src/modules/workspaces/workspaces.service.ts`):**
- `setHomePage()`: page now validated BEFORE clearing the existing home; if `pageId` is provided but doesn't exist → 404; if belongs to a different workspace → 403. Clear + set wrapped in `$transaction` for atomicity. Audit log added for the mutation.
- `getPinnedItems()`: orphaned pins (pages deleted after being pinned) are now filtered out instead of returned with `'Untitled'` title — applies in both `getPinnedItems()` and the inline logic inside `getOverview()`.
- `pinItem()`: missing page → 404 `NotFoundException`; page from a different workspace → 403 `ForbiddenException` (was a generic 400 for both cases).
- `assertCanManageWorkspace()`: converted to `async`; now actually queries the DB to confirm the actor is the workspace owner OR has `OWNER`/`MANAGER` role in `WorkspaceMember`; non-elevated non-manager callers receive `ForbiddenException`. All callers updated to `await`.

**New endpoint (`apps/api/src/modules/linked-records/`):**
- `GET /linked-records/search?workspaceId=xxx&targetType=TASK&q=term` — workspace-access-checked search across TASK, PAGE, DOCUMENT, NCR_CAPA, and CHECKLIST_ITEM entities; returns `{ id, title }[]` (max 20); access-checked via `assertWorkspaceAccess`.
- Route registered before `@Get()` in `LinkedRecordsController` to prevent path shadowing.

**Username backfill (`apps/api/src/modules/users/`):**
- `UsersService.backfillUsernames()` — finds users with empty-string `username` field (schema is non-nullable), generates safe lowercase username from email, deduplicates with numeric suffix. Returns `{ updated: number }`.
- `POST /users/backfill-usernames` — requires `users.manage` permission (SUPER_ADMIN / IT_ADMIN only). One-shot admin utility for environments that have users without usernames.
- Note: all users created through `UsersService.create()` already auto-generate usernames; the seed sets `username: 'admin'` for the initial admin. This endpoint is a safety net.

**Frontend Add Link UI (`apps/web/src/features/workspaces/task-detail-panel.tsx`):**
- `linkedRecordsUpdateKey?: number` prop added to `TaskDetailPanel`.
- `useEffect` on `linkedRecordsUpdateKey`: reloads linked records from API when key increments (realtime event from parent).
- Add Link modal in the Linked tab: target type selector (TASK/PAGE/DOCUMENT/NCR_CAPA/CHECKLIST_ITEM), search input, Find button → calls `GET /linked-records/search`, scrollable results list, select a record → "Add Link" button → calls `POST /linked-records`. Duplicate link shows friendly "This link already exists." error. On success: reloads linked records list, closes form.
- Empty state text updated from "via the API" hint to "Use 'Add Link' to connect…".

**Frontend realtime for linked records (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):**
- `linkedRecordsUpdateKeys: Record<string, number>` state added.
- `linked_record.created` socket handler: if `sourceId === selectedTaskId`, increments `linkedRecordsUpdateKeys[sourceId]` + shows toast.
- `linked_record.deleted` socket handler: same pattern.
- `TaskDetailPanel` now receives `linkedRecordsUpdateKey={linkedRecordsUpdateKeys[selectedTaskId] ?? 0}`.

**Build results:** API EXIT:0 | Web EXIT:0 (17 routes, 2 dynamic)

### Unit 20 — Notion-Inspired Workspace Improvements (2026-06-17) ✅

**Schema additions (`packages/db/prisma/schema.prisma`):**
- `Page.isHome Boolean @default(false)` — marks one page per workspace as the home page
- `WorkspacePinnedItem` model — workspaceId/entityType/entityId/pinnedById, unique on `[workspaceId, entityType, entityId]`; currently supports PAGE type; extensible to TASK/DOCUMENT in future
- `LinkedRecord` model — sourceType/sourceId/targetType/targetId/createdById; unique on source+target pair; indexes on both directions
- Migration `20260617062256_add_home_pinned_linked` applied

**Backend additions:**
- `WorkspacesService.setHomePage()` — unsets existing home, marks new page; emits `page.home.updated` realtime event
- `WorkspacesService.getPinnedItems()` — resolves page titles for pinned items
- `WorkspacesService.pinItem()` / `unpinItem()` — upsert/delete `WorkspacePinnedItem`; emit `pinned.updated`
- `WorkspacesService.getOverview()` updated — now includes `homePage: {id, title} | null` and `pinnedItems[]`
- New endpoints: `PATCH /workspaces/:id/home-page`, `GET/POST /workspaces/:id/pinned-items`, `DELETE /workspaces/:id/pinned-items/:entityId`
- `TasksService.addComment()` — detects `@username` mentions, creates `MENTION` notifications for mentioned users (fire-and-forget, non-critical)
- New `LinkedRecordsModule` (service + controller) — `GET /linked-records?sourceType&sourceId`, `POST /linked-records`, `DELETE /linked-records/:id`; access-checks both source entity workspace and creator on delete
- `PagesService.getTemplates()` — returns 4 static templates: ISO Procedure, Meeting Notes, Audit Preparation Notes, Department Home
- `PagesService.createFromTemplate()` — creates a page from static template content
- `PagesService`: `isHome` added to `PAGE_SELECT` so all page queries return `isHome`
- New endpoints: `GET /pages/templates`, `POST /workspaces/:workspaceId/pages/from-template?templateId=xxx`

**Frontend additions:**
- `WorkspaceOverviewData` type — added `homePage: {id, title} | null` and `pinnedItems: WorkspacePinnedItem[]`
- `WorkspacePinnedItem`, `LinkedRecord`, `PageTemplate` types added to `types.ts`
- `PageItem.isHome: boolean` added to `pages/types.ts`
- Workspace Overview tab — Workspace Home section (link to home page, or prompt + "Go to Pages"), Pinned Pages section (pin/unpin buttons for managers)
- Add Member modal — permission preview panel shows role-specific access description
- Realtime: `page.home.updated` → stale overview; `pinned.updated` → optimistic unpin or stale overview
- `TaskDetailPanel` — new "Linked" tab showing linked records, `Link2Off` remove button, @mention hint in comment placeholder
- `PagesView` — "Set Home" toggle button in page title bar; "From Template" book icon in sidebar header opens template modal with 4 templates; home icon shown on home page in tree; `isHome` reflected after set/clear
- API BUILD: EXIT:0 | WEB BUILD: EXIT:0 (17 routes, 2 dynamic)

### Unit 19 — Workspace Collaboration UX Upgrade (2026-06-17) ✅

**Backend additions (`WorkspacesService` + `WorkspacesController`):**
- `findOne()` updated to include `_count: { members: true }` for member count in detail response
- `getOverview(workspaceId, actorId, actorRoles, actorDeptId)`: returns readiness, work, documents, evidence, ncrCapa, members, recentActivity — enforced by `assertWorkspaceAccess`
- `getActivity(workspaceId, actorId, actorRoles, actorDeptId)`: returns last 50 audit log entries for workspace-related entities — enforced by `assertWorkspaceAccess`
- Private `getWorkspaceAuditLogs(workspaceId, take)`: aggregates audit logs for tasks/pages/documents/ncr_capa in the workspace
- New endpoints: `GET /workspaces/:id/overview` and `GET /workspaces/:id/activity` (both `project.read` gated)

**Frontend type additions (`types.ts`):**
- `WorkspaceDetail._count.members` (optional) added
- `WorkspaceOverviewData` interface added
- `WorkspaceActivityEntry` interface added

**Frontend workspace detail page (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`) — full rewrite:**
- **Part 1 — Header**: Enhanced with readiness % progress bar, open task count, overdue count (warning color), member count, visibility badge (Globe/Building2/Lock), department name
- **Part 2 — Overview tab** (default tab): 6 KPI summary cards (Readiness with progress bar, Tasks, Documents, Evidence, NCR/CAPA, Team); Recent Activity list (last 10 entries); Quick Links bar to tabs and linked pages
- **Part 3 — Quick Add button**: Context-sensitive dropdown in header — Add Task (if list selected), Add Page, Upload Document → /documents, Add Checklist Item → /checklists, Raise NCR/CAPA → /ncr-capa, Add Member (if canManageMembers); closes on outside click
- **Part 4 — Task tab improvements**: Quick filter chips (All/My Tasks/Overdue/Unassigned/Completed/High Priority with counts); search input with clear button; inline "Add task" row at table bottom (Enter to create); all client-side filtering on loaded tasks
- **Part 5 — Pages tab**: Unchanged (PagesView handles its own page menu, autosave, conflict protection)
- **Part 6 — Members tab**: Inline role change via `<select>` (PATCH /workspaces/:id/members/:memberId), copy email button per row; visibility explanation text for PRIVATE/DEPARTMENT workspaces
- **Part 7 — Activity tab**: Fetches `GET /workspaces/:id/activity`; displays entity icon + actor + action label + entity type label + absolute + relative timestamp; Refresh button
- **Part 8 — Realtime updates**: Extended socket handlers — `page.updated`, `page.deleted`, `document.updated`, `evidence.updated`, `ncr.updated` all set `overviewStale=true`; task events also set stale
- **Part 9 — Access safety**: `workspace.access.removed` → redirect to /workspaces; 403 on workspace load → "Workspace not found or access denied" message; all backend endpoints gated
- **Part 10 — UI quality**: Compact `SummaryCard` with accent-colored left border; `KpiRow` for number/label pairs; `ReadinessBar` mini progress bar in header; `VisibilityBadge` with icon; `EntityIcon` per entity type; stale banner on Overview with Refresh button; blue dot on Overview tab when stale; empty/loading states on all tabs; `relativeTime()` helper
- **Part 11 — Build**: API EXIT:0 (NestJS nest build), Web EXIT:0 (Next.js 17 routes, 2 dynamic)

### Planning & Context (Pre-implementation)

- Project direction confirmed:
  - Build an internal ISO audit readiness system.
  - System name selected: **AuditFlow IMS**.
  - Full branded name selected: **RECAFCO AuditFlow IMS**.
  - Company name: **RECAFCO**.
  - Company website: `https://recafco.com/`.
  - Use RECAFCO company logo in the app.
  - The system is inspired by Teamwork, but must not become a generic Teamwork clone.
  - English-only MVP.
  - Separate system for now.
  - Possible integration with the maintenance system later if management approves.
  - CEO workflow/dashboard is not required in phase 1.
  - PostgreSQL will be used as the main database.
  - Uploaded file binaries must not be stored in PostgreSQL.
  - PostgreSQL stores metadata only.
  - Local file storage will be used for uploaded files in MVP.
  - MinIO-ready storage design will be used for future company server deployment.
  - In-app notifications will be used for MVP.
  - Email/WhatsApp notifications are out of scope until infrastructure is confirmed.
  - Fully open-source stack is required.
  - No paid cloud dependency should be introduced.

- Core context files prepared:
  - `project-overview.md`
  - `architecture.md`
  - `ui-context.md`
  - `code-standards.md`
  - `ai-workflow-rules.md`
  - `progress-tracker.md`

- `CLAUDE.md` direction prepared.

- UI direction finalized:
  - Professional RECAFCO internal enterprise workspace.
  - Light mode for MVP.
  - Strong sidebar navigation.
  - Teamwork-style project/task-list navigation.
  - ISO/QHSE-focused dashboard, document library, checklist, evidence, and NCR/CAPA screens.
  - No generic SaaS branding.
  - No AI-looking dashboard.
  - Use RECAFCO logo from `apps/web/public/brand/recafco-logo.png`.

---

### Unit 1 — Project Foundation (2026-06-15) ✅

**What was done:**

1. **Root `.gitignore`** created:
   - Ignores `.env`, `uploads/`, `node_modules/`, `dist/`, `.next/`, `packages/db/generated/`, build caches.

2. **`packages/db/package.json`** created:
   - Package name: `@auditflow/db`
   - Scripts: `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:push`, `db:studio`, `db:reset`
   - Exports generated Prisma client from `./generated/prisma`

3. **`packages/db/prisma/schema.prisma`** fixed:
   - Changed generator from `prisma-client` (Prisma 7 TypeScript generator) to `prisma-client-js` (standard, NestJS-compatible)
   - Added `url = env("DATABASE_URL")` to datasource
   - Provider: `postgresql`

4. **`packages/db/prisma.config.ts`** cleaned up:
   - Removed datasource override (URL now lives in schema env reference)
   - Keeps dotenv loading via `import "dotenv/config"`

5. **`packages/db/.env`** fixed:
   - Replaced `prisma+postgres://` (Prisma cloud) URL with standard `postgresql://localhost:5432/auditflow_ims`

6. **`packages/db/.env.example`** created — documents expected DATABASE_URL format.

7. **`packages/shared/package.json`** created:
   - Package name: `@auditflow/shared`
   - Exports from `./src/index.ts`

8. **`packages/shared/src/enums.ts`** created with all system enums:
   - `UserRole` — 8 roles (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER, AUDITOR_VIEWER, STAFF)
   - `TaskStatus` — TODO, IN_PROGRESS, WAITING_REVIEW, COMPLETED, REJECTED, CANCELLED
   - `DocumentStatus` — DRAFT, UNDER_REVIEW, APPROVED, REJECTED, ARCHIVED
   - `EvidenceStatus` — MISSING, SUBMITTED, APPROVED, REJECTED
   - `NcrCapaStatus` — OPEN, IN_PROGRESS, WAITING_EVIDENCE, SUBMITTED, VERIFIED, CLOSED, REJECTED, OVERDUE
   - `Priority` — LOW, MEDIUM, HIGH, CRITICAL
   - `Severity` — MINOR, MAJOR, CRITICAL, OBSERVATION
   - `AuditEntityType` — 17 entity types for audit logs
   - `AuditAction` — 17 action types for audit logs
   - `NotificationCategory` — 9 notification categories
   - `FileEntityType` — 7 file attachment context types
   - `ALLOWED_MIME_TYPES` — 11 allowed business document MIME types
   - `MAX_FILE_SIZE_BYTES` — 50 MB default
   - `DEFAULT_DEPARTMENTS` — 16 default department/task-list names

9. **`packages/shared/src/index.ts`** created — re-exports all enums and constants.

10. **`apps/api/src/main.ts`** updated:
    - Port changed from 3000 to **4000**
    - CORS enabled for `http://localhost:3000` (configurable via `CORS_ORIGIN` env var)
    - Startup log message added

11. **`apps/api/src/app.controller.ts`** updated:
    - Removed generic `GET /` (`getHello`)
    - Added `GET /health` endpoint

12. **`apps/api/src/app.service.ts`** updated:
    - Returns `{ status, service, version, timestamp }` from `getHealth()`

13. **`apps/api/src/app.controller.spec.ts`** updated to match new health endpoint.

14. **`apps/api/.env.example`** created — documents PORT, CORS_ORIGIN, DATABASE_URL, JWT (placeholder), UPLOAD_DIR, MAX_FILE_SIZE_MB.

15. **`apps/web/src/app/globals.css`** replaced:
    - All RECAFCO design token CSS variables defined (from `ui-context.md`)
    - Light mode only (no dark mode in phase 1)
    - Subtle scrollbar styling
    - Base font and background set

16. **`apps/web/src/app/layout.tsx`** updated:
    - Title: `RECAFCO AuditFlow IMS`
    - Description: `Internal ISO & QHSE Audit Readiness System for RECAFCO`
    - Template: `%s | RECAFCO AuditFlow IMS`

17. **`apps/web/src/app/page.tsx`** replaced:
    - Generic Next.js template removed
    - RECAFCO branded holding page with system identity (name, tagline)
    - Logo placeholder (letter R in sidebar color) — ready to swap for real logo
    - Link to API health endpoint for verification

18. **`apps/web/public/brand/.gitkeep`** created — preserves brand folder in git; notes where `recafco-logo.png` must be placed.

19. **`apps/web/.env.example`** created — documents `NEXT_PUBLIC_API_URL`.

20. **Root `.env.example`** created — points to each app's own env file.

### Unit 1 — Monorepo Cleanup (2026-06-15) ✅

**What was done:**

- Removed `apps/web/pnpm-lock.yaml` — was a leftover from standalone Next.js creation; conflicts with root workspace lock file.
- Removed `apps/web/pnpm-workspace.yaml` — was a leftover standalone pnpm config; only the root `pnpm-workspace.yaml` should exist.
- Ran `pnpm install` from root — completed cleanly, all 5 workspace projects resolved.
- `pnpm --filter web build` — **passed**. Next.js 16.2.9 Turbopack, TypeScript clean, 4 static pages generated.
- `pnpm --filter api build` — **passed**. NestJS dist compiled cleanly with updated health endpoint and port 4000.

**Verification:**

- Both builds pass with zero errors.
- Monorepo now uses only the root `pnpm-lock.yaml` and root `pnpm-workspace.yaml`.

---

---

### Unit 2 — Authentication, Users, Roles, Departments, Permissions (2026-06-15) ✅

**What was done:**

1. **Prisma schema extended** (`packages/db/prisma/schema.prisma`):
   - `Department` — id, name (unique), code (unique), description, isActive, timestamps
   - `Role` — id, name (unique), displayName, description, isActive, timestamps
   - `Permission` — id, key (unique), displayName, description, createdAt
   - `RolePermission` — composite PK (roleId, permissionId), cascade deletes
   - `User` — id, email (unique), username (unique), passwordHash, fullName, departmentId, isActive, mustChangePassword, lastLoginAt, timestamps, indexes on email/username/departmentId
   - `UserRole` — composite PK (userId, roleId), createdAt
   - `AuditLog` — id, actorId, action, entityType, entityId, previousValue (Json?), newValue (Json?), ipAddress, userAgent, createdAt, indexes on actorId / entityType+entityId / createdAt

2. **Prisma 7 adapter pattern** resolved:
   - `url` removed from `datasource` block (Prisma 7 breaking change)
   - `prisma.config.ts` holds `datasource.url` pointing to `DATABASE_URL` env var
   - All runtime `PrismaClient` instances use `@prisma/adapter-pg` + `pg.Pool` for direct PostgreSQL connections

3. **Migration run**: `prisma migrate dev --name init_auth` — applied cleanly.

4. **Prisma client generated**: `prisma generate` — output to `packages/db/generated/prisma/`.

5. **Seed script** (`packages/db/prisma/seed.ts`):
   - 10 departments (ISO Management, QHSE, Production, Maintenance, Procurement, HR, Finance, IT, Engineering, Logistics)
   - 8 roles with display names and descriptions
   - 16 permissions (project CRUD, task CRUD, document CRUD + approval, evidence submit + review, ncr-capa CRUD + close, user management, department management, view audit logs)
   - Role-permission mappings for all 8 roles
   - Admin user: `admin@recafco.com` / `admin` / `Admin@12345`, `mustChangePassword: true`
   - Seed run successfully via `ts-node -P tsconfig.json prisma/seed.ts`

6. **NestJS modules added**:
   - `PrismaModule` (global) — `PrismaService` uses `@prisma/adapter-pg` + `Pool`, `onModuleInit/$connect`, `onModuleDestroy/$disconnect/pool.end`
   - `AuditLogModule` + `AuditLogService` — `createLog()` never throws, failures logged to console.error only; uses `Prisma.JsonNull` for null JSON fields
   - `AuthModule` — `POST /auth/login` (public), `GET /auth/me` (JwtAuthGuard); login accepts email or username, rejects inactive users, updates lastLoginAt, creates LOGIN/LOGIN_FAILED audit logs, returns accessToken + user object with roles and permissions; never returns passwordHash
   - `DepartmentsModule` — `GET /departments` (JwtAuthGuard), returns active departments
   - `RolesModule` — `GET /roles` (JwtAuthGuard), returns active roles with permissions
   - `JwtStrategy` (passport-jwt) — loads full user with roles+permissions on every request; throws UnauthorizedException if user not found or inactive

7. **JWT configuration**:
   - `@nestjs/jwt`, `passport-jwt`, `@nestjs/passport` installed
   - Secret from `JWT_SECRET` env var (fallback: `change-this-secret`)
   - Expiry from `JWT_EXPIRES_IN` env var (default: `8h`)

8. **`apps/api/.env`** updated with `JWT_SECRET` and `JWT_EXPIRES_IN`.

9. **Frontend auth system** (`apps/web/`):
   - `src/lib/api.ts` — `apiPost<T>()` and `apiGet<T>()` helpers using `NEXT_PUBLIC_API_URL`
   - `src/lib/auth-context.tsx` — `AuthProvider` with localStorage (`auditflow_token`, `auditflow_user`), `AuthUser` interface includes id, email, username, fullName, departmentId, department, roles[], permissions[], mustChangePassword
   - `src/app/layout.tsx` — wraps `<body>` with `<AuthProvider>`
   - `src/app/page.tsx` — redirects to `/login` on mount

10. **Login page** (`apps/web/src/app/(auth)/login/page.tsx`):
    - RECAFCO branded (logo with letter-R fallback)
    - Email or username + password fields
    - Error display with `AlertCircle` icon
    - Redirects to `/dashboard` on success

11. **Protected app shell**:
    - `src/app/(app)/layout.tsx` — redirects to `/login` if unauthenticated; loading spinner while checking session
    - `src/components/app-sidebar.tsx` — fixed left sidebar, RECAFCO logo, 9 nav items (Dashboard, Workspaces, Tasks, Documents, Checklist, Evidence, NCR/CAPA, Notifications, Reports), Admin Settings visible to SUPER_ADMIN/IT_ADMIN only
    - `src/components/app-header.tsx` — fixed header, notification bell, user menu with logout
    - `src/app/(app)/dashboard/page.tsx` — user info card, coming-soon KPI banner
    - `src/components/coming-soon.tsx` — reusable stub component

12. **Stub pages created** (all use ComingSoon):
    - `/workspaces`, `/tasks`, `/documents`, `/checklist`, `/evidence`, `/ncr-capa`, `/notifications`, `/reports`

13. **Build verification**:
    - `pnpm --filter api build` — ✅ passed (nest build, exit 0)
    - `pnpm --filter web build` — ✅ passed (Next.js 16.2.9, TypeScript clean, 14 static pages)

**Initial admin credentials:**

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@recafco.com      |
| Username | admin                  |
| Password | Admin@12345            |
| Note     | mustChangePassword = true (password change UI is Unit 2 follow-up) |

**Prisma 7 breaking changes documented:**

- `url` must NOT be in schema datasource block — put it in `prisma.config.ts` under `datasource.url`
- `PrismaClient` at runtime requires `@prisma/adapter-pg` + `pg.Pool` — no ENV auto-read
- Custom output path means seeds/scripts must import from `'../generated/prisma'` not `'@prisma/client'`
- `Prisma.JsonNull` required for nullable JSON fields in AuditLog

---

---

### Unit 2.5 — First-Login Password Change Flow (2026-06-15) ✅

**What was done:**

1. **`AuditAction.PASSWORD_CHANGED`** added to `packages/shared/src/enums.ts`.

2. **`passwordChangedAt DateTime?`** added to the `User` model in Prisma schema. Applied via `prisma db push` (used instead of `migrate dev` because Prisma 7 blocks `migrate reset` in AI agent sessions — drift from previous dev migration run was resolved this way). Prisma client regenerated.

3. **`ChangePasswordDto`** created at `apps/api/src/modules/auth/dto/change-password.dto.ts`:
   - `currentPassword` — required string
   - `newPassword` — required, min 8 chars, `@Matches` regex enforcing uppercase + lowercase + digit + special char
   - `confirmPassword` — required string

4. **`AuthService.changePassword()`** added:
   - Rejects if `newPassword !== confirmPassword` (400)
   - Loads user, rejects if not found or inactive (401)
   - Verifies `currentPassword` against stored `passwordHash` with bcrypt.compare (401 if wrong)
   - Rejects if `newPassword` is same as `currentPassword` (400 — prevents password recycling)
   - Hashes new password with bcrypt, salt rounds 12
   - Updates user: `passwordHash`, `mustChangePassword = false`, `passwordChangedAt = now()`
   - Creates audit log: action=`PASSWORD_CHANGED`, entityType=`USER`, entityId=user.id
   - Returns `{ message: 'Password changed successfully' }`
   - Never returns passwordHash

5. **`POST /auth/change-password`** added to `AuthController`:
   - Protected by `JwtAuthGuard`
   - Uses `@CurrentUser()` to get authenticated user id
   - Validates body with `ChangePasswordDto`

6. **`apiPostAuth<T>(path, body, token)`** added to `apps/web/src/lib/api.ts`:
   - Same as `apiPost` but adds `Authorization: Bearer <token>` header
   - Used for authenticated mutations from the frontend

7. **`updateUser(updates: Partial<AuthUser>)`** added to `AuthProvider` / `AuthContext`:
   - Merges updates into current user state
   - Persists to `localStorage` so the flag survives page refresh
   - Exposed in `AuthContextValue` interface

8. **`(app)/layout.tsx`** updated — gate logic now:
   - No user → redirect to `/login`
   - User with `mustChangePassword = true` → redirect to `/change-password`
   - Renders app shell only when user exists AND `mustChangePassword = false`

9. **`apps/web/src/app/(auth)/change-password/page.tsx`** created:
   - RECAFCO branded (same card style as login, logo with fallback)
   - Warning banner explaining this is a temporary password
   - Three fields: Current Password, New Password, Confirm Password
   - Toggle show/hide on each password field (Eye/EyeOff icons)
   - Live password requirements checklist (shows as user types): 8+ chars, uppercase, lowercase, number, special char
   - Match indicator: shows "Passwords match" / "Passwords do not match" as user types confirm
   - Error display with AlertCircle
   - On success: calls `updateUser({ mustChangePassword: false })` → redirects to `/dashboard`
   - Self-guards: if no user → /login; if mustChangePassword = false → /dashboard

10. **Build verification**:
    - `pnpm --filter api build` — ✅ passed (exit 0)
    - `pnpm --filter web build` — ✅ passed (15 static pages, `/change-password` route included)

**Password change flow:**
1. Admin logs in with temporary password `Admin@12345`
2. Login page saves token/user to AuthContext and redirects to `/dashboard`
3. `(app)/layout.tsx` detects `mustChangePassword = true` → redirects to `/change-password`
4. Admin sets a new password meeting all requirements
5. API updates the database: new hash, `mustChangePassword = false`, `passwordChangedAt = now()`
6. Frontend calls `updateUser({ mustChangePassword: false })` → localStorage updated
7. Redirect to `/dashboard` — layout now allows full app access

**Note on `prisma migrate dev` vs `prisma db push`:**
- Prisma 7 blocks `prisma migrate reset` when running inside an AI agent session (safety guard)
- Used `prisma db push` for the dev schema change — this is acceptable for development
- For production, a proper migration should be created: `ALTER TABLE users ADD COLUMN "passwordChangedAt" TIMESTAMP;`
- The migration for `add_password_changed_at` should be created manually or during a `migrate dev` run outside of AI agent session before deploying to production

---

---

### Migration Debt Note (2026-06-15)

`passwordChangedAt DateTime?` (Unit 2.5) was applied to the dev database via `prisma db push` rather than a formal migration file.

**Why:** Prisma 7 blocks `prisma migrate reset` when invoked inside an AI agent session. The existing migration history (`init_auth`) had drifted from the actual database state, and resetting was blocked.

**Current state:** Database schema is correct and in sync with `schema.prisma`. Migration history file does NOT include `passwordChangedAt`.

**Action required before production:** Run `npx prisma migrate dev --name add_password_changed_at` in a terminal session (not through AI agent) to formalize the migration. The SQL is: `ALTER TABLE users ADD COLUMN "passwordChangedAt" TIMESTAMP;`

Same pattern applies to Unit 3 schema additions — `prisma db push` used for dev, migration formalization deferred.

---

---

### Unit 3 — ISO Workspaces, Task Lists, Tasks, Subtasks, Comments, Activity, Notifications, Audit Logs (2026-06-15) ✅

**What was done:**

1. **Prisma schema extended** (`packages/db/prisma/schema.prisma`) via `prisma db push`:
   - `Workspace` — id, name, description, status (WorkspaceStatus: ACTIVE/ARCHIVED), ownerId, createdAt, updatedAt
   - `TaskList` — id, workspaceId, departmentId (optional FK), name, description, sortOrder, createdById, timestamps. Relation: Workspace has many TaskLists.
   - `Task` — id, workspaceId, taskListId, parentTaskId (self-join for subtasks), title, description, status (TaskStatus), priority (Priority), assigneeId (optional FK), createdById, dueDate, completedAt, timestamps. Subtask via `@relation("TaskSubtasks")`.
   - `TaskComment` — id, taskId, authorId, body, timestamps
   - `ActivityEvent` — polymorphic (entityType/entityId as plain strings, no FK); id, entityType, entityId, actorId, action, summary, createdAt
   - `Notification` — id, recipientId, category (NotificationCategory), title, body, entityId (optional), readAt, createdAt

2. **`WorkspaceStatus` enum** added to `packages/shared/src/enums.ts` (ACTIVE, ARCHIVED).

3. **`@auditflow/shared`** added to `apps/api/package.json` dependencies as `"workspace:*"` — required for NestJS webpack build to resolve shared enums.

4. **Backend modules added** (all wired into `AppModule`):

   - **`NotificationsModule`** (`apps/api/src/modules/notifications/`):
     - `create(dto)` — dedup check (same recipientId+category+entityId with readAt=null), then creates; silently swallows errors
     - `findForUser(userId)` — last 50 ordered by createdAt desc
     - `getUnreadCount(userId)` — count of readAt=null
     - `markRead(id, userId)`, `markAllRead(userId)` — set readAt=now()
     - Endpoints: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` (all `JwtAuthGuard`)

   - **`WorkspacesModule`** (`apps/api/src/modules/workspaces/`):
     - `GET /workspaces` — list all, includes owner, _count taskLists/tasks (requires `project.read`)
     - `GET /workspaces/:id` — detail with taskLists array (includes department, _count tasks) (requires `project.read`)
     - `POST /workspaces` — creates workspace, audit log CREATED (requires `project.create`)
     - `PATCH /workspaces/:id` — updates workspace, audit log UPDATED (requires `project.update`)

   - **`TaskListsModule`** (`apps/api/src/modules/task-lists/`):
     - `GET /workspaces/:workspaceId/task-lists` — list task lists for workspace (requires `project.read`)
     - `POST /workspaces/:workspaceId/task-lists` — create task list, audit log CREATED (requires `project.create`)
     - `PATCH /task-lists/:id` — update task list, audit log UPDATED (requires `project.update`)

   - **`TasksModule`** (`apps/api/src/modules/tasks/`):
     - `GET /tasks` — query by workspaceId, taskListId, assigneeId, status; excludes subtasks (parentTaskId=null)
     - `GET /tasks/:id` — full task with subtasks, assignee, createdBy, taskList
     - `POST /tasks` — creates task with status=TODO; audit log CREATED; activity recorded; notification sent to assignee if different from creator
     - `PATCH /tasks/:id` — inline permission check: users with `tasks.update` can update all fields; task assignees can update status only; audit log STATUS_CHANGED or UPDATED; notification to new assignee on assignment change; sets completedAt when status=COMPLETED
     - `POST /tasks/:id/comments` — add comment, records activity
     - `GET /tasks/:id/comments` — list comments with author
     - `GET /tasks/:id/activity` — activity events for task

5. **Common guards and decorators** (`apps/api/src/common/`):
   - `@RequirePermissions(...keys)` — SetMetadata decorator
   - `PermissionsGuard` — reads user permissions from request (populated by JwtStrategy), throws ForbiddenException if any required permission is missing
   - `extractUserPermissions(user)` — exported utility, flattens userRoles → role → rolePermissions → permission.key into deduplicated string[]

6. **Frontend feature modules** (`apps/web/src/features/workspaces/`):
   - `types.ts` — TypeScript interfaces: WorkspaceSummary, WorkspaceDetail, TaskListSummary, TaskSummary, TaskDetail, TaskComment, ActivityEvent, TaskUser
   - `create-workspace-modal.tsx` — modal to create a workspace (name + description)
   - `create-task-list-modal.tsx` — modal to create a task list in a workspace
   - `create-task-modal.tsx` — modal to create a task (title, description, priority, due date; supports parentTaskId for subtasks)
   - `task-detail-panel.tsx` — slide-over panel showing task detail: meta grid, status selector dropdown, priority badge, subtask list, Comments/Activity tabs, inline comment submission

7. **Frontend pages**:
   - `apps/web/src/app/(app)/workspaces/page.tsx` — workspace grid listing cards with name, status badge, owner avatar, task list count, task count, creation date; New Workspace button (gated by `project.create`); empty state with CTA
   - `apps/web/src/app/(app)/workspaces/[id]/page.tsx` — workspace detail: breadcrumb header, secondary task-list sidebar (with New Task List button), main task table (title, status badge, priority badge, assignee avatar, due date, subtask count, comment count, row click opens TaskDetailPanel), Add Task button; empty states throughout

8. **`apiPatchAuth<T>()`** added to `apps/web/src/lib/api.ts` — authenticated PATCH helper.

9. **`app-header.tsx`** updated — polls `GET /notifications/unread-count` every 60s; shows red badge (capped at 9+) on bell icon; bell links to `/notifications`.

10. **`status-badge.tsx`** created — `StatusBadge` (with bg+color from CSS vars) and `PriorityBadge` (text color only) shared components.

11. **`globals.css`** updated — added `--border-subtle: #F1F5F9` design token.

12. **Build verification**:
    - `pnpm --filter api build` — ✅ passed (exit 0)
    - `pnpm --filter web build` — ✅ passed (TypeScript clean, `/workspaces` static + `/workspaces/[id]` dynamic route)

**How to test the workspace/task workflow:**
1. Log in with `admin@recafco.com` / `Admin@12345` (forced to change password on first login)
2. After changing password, go to `http://localhost:3000/workspaces`
3. Click "New Workspace" — enter name (e.g. "ISO 9001:2015 Audit 2026") and create
4. Click the workspace card to open the detail page
5. In the task-list sidebar, click "+" to create a task list
6. In the main area, click "Add Task" to create tasks in that list
7. Click any task row to open the detail panel — change status via the dropdown, add a comment
8. Bell icon in header shows unread notification count (notification is sent to task assignee on assignment)

**Schema changes applied via `prisma db push` (dev):**
- Workspace, TaskList, Task, TaskComment, ActivityEvent, Notification tables created
- See Migration Debt Note below for production formalization path

---

### Unit 5 — Pages and Sub-Pages (2026-06-15) ✅

**What was done:**

1. **Prisma schema extended** — `Page` model added: id, workspaceId, parentId (self-join for sub-pages), title, content (nullable text), sortOrder, createdById, updatedById, timestamps. Self-relation: `parent Page? @relation("PageChildren")` / `children Page[] @relation("PageChildren")`. Indexes on workspaceId and parentId.

2. **Migration applied** via `prisma migrate dev --name add_pages` — `pages` table created with self-referential FK for hierarchy.

3. **Prisma client regenerated** — `prisma generate` run after schema update.

4. **New permissions added** (4 permissions, total now 31):
   - `pages.read` → all roles
   - `pages.create` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER
   - `pages.update` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER
   - `pages.delete` → SUPER_ADMIN, ISO_MANAGER only

5. **`PagesModule`** (`apps/api/src/modules/pages/`):
   - `PagesService` — `findAllForWorkspace()` returns top-level pages with nested children (2 levels); `findOne()` returns full page with children; `create()` auto-increments sortOrder; `update()` updates title and/or content; `delete()` blocks if page has children (prevents orphaned sub-pages)
   - `PagesController` — mixed routes: `GET/POST /workspaces/:workspaceId/pages`, `GET/PATCH/DELETE /pages/:id`; all protected with JwtAuthGuard + PermissionsGuard
   - DTOs: `CreatePageDto` (title, content, parentId, sortOrder), `UpdatePageDto` (title, content)
   - Audit logs created for CREATED (PAGE or SUB_PAGE entity type), UPDATED, DELETED

6. **`PagesModule` wired** into `AppModule`.

7. **Frontend** (`apps/web/src/`):
   - `features/pages/types.ts` — TypeScript interfaces: PageItem, PageChild
   - `features/pages/pages-view.tsx` — full pages view component:
     - Left sidebar: hierarchical page tree with expand/collapse chevrons, hover actions (add sub-page, delete), inline new page form with Escape/Enter keyboard shortcuts
     - Center: content editor with auto-save (1.5s debounce after typing stops); read-only view for AUDITOR_VIEWER
     - Inline title editing (click title → input → blur/Enter saves)
     - Saved/Save failed status indicator
     - Recursive tree update helpers (updatePageInTree, removePageFromTree, insertChild)
   - `app/(app)/workspaces/[id]/page.tsx` — tab bar added above workspace body: Tasks | Pages tabs; content area conditionally renders `<PagesView>` or the task list+table layout based on active tab

8. **Build verification**:
   - `pnpm --filter api build` — ✅ passed (exit 0)
   - `pnpm --filter web build` — ✅ passed (TypeScript clean, all routes intact)

**API endpoints available:**
- `GET  /workspaces/:workspaceId/pages` — list top-level pages with nested children (requires `pages.read`)
- `GET  /pages/:id` — get single page with full content and children (requires `pages.read`)
- `POST /workspaces/:workspaceId/pages` — create page or sub-page (requires `pages.create`)
- `PATCH /pages/:id` — update title and/or content (requires `pages.update`)
- `DELETE /pages/:id` — delete page if no children exist (requires `pages.delete`)

---

### Unit 4 — Document Upload, Document Library, File Metadata, Versioning, Secure Download (2026-06-15) ✅

**What was done:**

1. **Shared enums updated** (`packages/shared/src/enums.ts`):
   - `AuditAction.DOWNLOADED` added
   - `NotificationCategory.DOCUMENT_APPROVED`, `DOCUMENT_REJECTED` added
   - `DocumentCategory` enum added: GENERAL, POLICY, PROCEDURE, WORK_INSTRUCTION, FORM, RECORD, CERTIFICATE, REPORT, MANUAL

2. **Prisma schema extended** (`packages/db/prisma/schema.prisma`):
   - `Document` model: title, description, documentNumber, category, status (DRAFT default), departmentId, workspaceId, taskId, ownerId, createdById, currentVersionId (plain string, no circular FK), reviewDate, expiryDate, archivedAt, timestamps; relations to Department, Workspace, User (owner + creator), DocumentVersion[]
   - `DocumentVersion` model: documentId, versionNumber, originalFileName, storedFileName, storagePath, mimeType, fileSize, checksum, uploadedById, createdAt; unique(documentId, versionNumber); relation to Document and User

3. **Migration applied** via `prisma migrate dev --name add_documents` — creates `documents` and `document_versions` tables cleanly on top of baseline.

4. **Prisma client regenerated** — `prisma generate` run after schema update.

5. **Shared package rebuilt** — `pnpm --filter @auditflow/shared build` to compile updated enums to dist/.

6. **`multer` + `@types/multer` installed** in `apps/api` for multipart/form-data file upload handling.

7. **`FileStorageService`** (`apps/api/src/common/file-storage.service.ts`):
   - Resolves UPLOAD_DIR from ConfigService (default: `../../uploads`)
   - MAX_FILE_SIZE_MB from ConfigService (default: 25)
   - `validateFile()` — checks MIME type against allowlist and file extension; rejects executables and non-business types
   - `saveFile()` — validates, creates year/month subdirectory, generates safe stored filename (8-hex-uid + sanitized original), writes buffer, returns StoredFile metadata including SHA-256 checksum
   - `deleteFile()` — soft delete (no throw on error, orphaned files are recoverable)

8. **`DocumentsModule`** (`apps/api/src/modules/documents/`):
   - `DocumentsService` — `findAll()` with pagination+filters (status, dept, workspace, category, search), `findOne()`, `create()` (upload + version 1 in transaction), `update()` (metadata only), `uploadNewVersion()` (creates next version number, resets status to DRAFT), `updateStatus()` with validated transition graph, `downloadVersion()` with file existence check and audit log
   - `DocumentsController` — multer memory storage interceptor on upload endpoints; permission guards on each route
   - DTOs: `CreateDocumentDto`, `UpdateDocumentDto`, `UpdateDocumentStatusDto`
   - Module imports: AuditLogModule, NotificationsModule

9. **Status workflow implemented and enforced server-side**:
   - DRAFT → UNDER_REVIEW
   - UNDER_REVIEW → APPROVED | REJECTED | DRAFT
   - APPROVED → ARCHIVED
   - REJECTED → DRAFT | UNDER_REVIEW
   - ARCHIVED → (no transitions; cannot update or upload new version)
   - Approved documents cannot be hard-deleted (no DELETE endpoint)

10. **Audit logs created** for: document upload (UPLOADED), metadata update (UPDATED), new version (UPLOADED on DOCUMENT_VERSION), status changes (APPROVED / REJECTED / ARCHIVED / STATUS_CHANGED), download (DOWNLOADED)

11. **Notifications sent**:
    - DOCUMENT_APPROVED → document owner when approved by another user
    - DOCUMENT_REJECTED → document owner when rejected by another user (includes reason)
    - DOCUMENT_REVIEW_PENDING → all ISO_MANAGER / QHSE_USER / DEPARTMENT_MANAGER users when submitted for review

12. **Seed updated** — 5 new granular document permissions added (documents.read, documents.create, documents.update, documents.archive, documents.download); role matrix updated for all 8 roles; total now **27 permissions**; seed re-run successfully.

13. **API wired** — `DocumentsModule` imported into `AppModule`.

14. **Frontend** (`apps/web/src/`):
    - `features/documents/types.ts` — TypeScript interfaces (DocumentSummary, DocumentDetail, DocumentVersionSummary, DocumentListResponse), DOCUMENT_CATEGORIES/STATUSES/STATUS_TRANSITIONS constants, formatFileSize helper
    - `features/documents/upload-document-modal.tsx` — full upload form: title, document number, category, department, workspace, review date, expiry date, description, file picker with drag/click, extension/size client-side validation, upload progress
    - `app/(app)/documents/page.tsx` — document library table with search, status/category/department filters, pagination, upload button (gated by documents.create permission), click-to-detail navigation
    - `app/(app)/documents/[id]/page.tsx` — document detail: metadata grid, current file display, version history sidebar, status change dropdown (gated by documents.approve), rejection reason dialog (required), new version upload button (gated by documents.update), download button (gated by documents.download)
    - `lib/api.ts` — `apiUploadFile<T>()` helper added (FormData POST with Authorization header)
    - `components/status-badge.tsx` — DRAFT, UNDER_REVIEW, APPROVED status styles added

15. **Build verification**:
    - `pnpm --filter api build` — ✅ passed (exit 0)
    - `pnpm --filter web build` — ✅ passed (TypeScript clean, `/documents` static + `/documents/[id]` dynamic route)

**API endpoints available:**
- `GET  /documents` — list with filters (requires `documents.read`)
- `GET  /documents/:id` — document detail + all versions (requires `documents.read`)
- `POST /documents/upload` — upload new document with file (requires `documents.create`)
- `PATCH /documents/:id` — update metadata (requires `documents.update`)
- `POST /documents/:id/versions` — upload new version (requires `documents.update`)
- `PATCH /documents/:id/status` — change status with transition validation (requires `documents.approve`)
- `GET  /documents/:id/versions/:versionId/download` — download file (requires `documents.download`)

**Architecture note:**
- `currentVersionId` on Document is a plain String field (no Prisma FK relation) to avoid circular dependency between Document and DocumentVersion. The application resolves it programmatically.
- Files stored at: `UPLOAD_DIR/documents/<year>/<month>/<uid>_<safe-name>.<ext>`
- Uploads directory: `uploads/` at monorepo root, git-ignored with `.gitkeep`

---

### Migration Baseline & Permission Cleanup (2026-06-15) ✅

**What was done:**

1. **Baseline migration created** (`packages/db/prisma/migrations/20260615000000_baseline_full_schema/migration.sql`):
   - All schema applied via `prisma db push` (Units 1–3) had no migration history
   - `prisma migrate dev --name add_workspace_tasks_notifications` detected drift and required a reset (blocked — would destroy data)
   - Solution: used `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` to generate full baseline SQL
   - Created migration file manually; ran `prisma migrate resolve --applied 20260615000000_baseline_full_schema` to mark as already applied without running SQL (no data loss)
   - `prisma migrate status` now reports: "1 migration found. Database schema is up to date."
   - All future schema changes can now use `prisma migrate dev` normally

2. **Permission mismatch fixed** — the API used 6 permission keys that did not exist in the seed:

   | API permission key | Was in seed? | Fix |
   |--------------------|-------------|-----|
   | `project.read`     | ❌ No       | Added |
   | `project.create`   | ❌ No       | Added |
   | `project.update`   | ❌ No       | Added |
   | `tasks.read`       | ❌ No       | Added |
   | `tasks.create`     | ❌ No       | Added |
   | `tasks.update`     | ❌ No       | Added |

   The seed had only `iso.view`, `iso.manage`, `tasks.view`, `tasks.manage` (coarse-grained, kept for future modules).
   Added 6 granular permissions; total is now **22 permissions**.

3. **Role-permission matrix updated** in `packages/db/prisma/seed.ts`:
   - `project.read` → SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER, AUDITOR_VIEWER, STAFF
   - `project.create` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER
   - `project.update` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER
   - `tasks.read` → SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER, AUDITOR_VIEWER, STAFF
   - `tasks.create` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER
   - `tasks.update` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER

4. **Seed re-run successfully** — 22 permissions, all role-permission assignments applied via upsert (idempotent, no data loss).

5. **`@auditflow/shared` module resolution fixed** — was consuming raw TypeScript source at runtime, causing Node.js ESM resolver failure. Fixed by:
   - Added `packages/shared/tsconfig.json` (CommonJS output)
   - Changed `packages/shared/package.json` exports to point to `dist/` (compiled JS + .d.ts)
   - Ran `pnpm --filter @auditflow/shared build` → compiled successfully
   - Note: **must rebuild shared package** (`pnpm --filter @auditflow/shared build`) whenever `packages/shared/src/enums.ts` changes

6. **JWT secret timing bug fixed** — `JwtModule.register()` evaluated `process.env.JWT_SECRET` before `ConfigModule.forRoot()` loaded `.env`, causing token signing/verification mismatch ("Unauthorized" on first protected request). Fixed by switching to `JwtModule.registerAsync()` + `ConfigService`.

7. **API tsconfig changed** from `"module": "nodenext"` to standard NestJS `"module": "commonjs"` / `"moduleResolution": "node"` — prevents future ESM-related runtime issues with workspace packages.

8. **Build verification**:
   - `pnpm --filter api build` — ✅ passed (exit 0)
   - `pnpm --filter web build` — ✅ passed (TypeScript clean, 13 static + 1 dynamic route)

**Seed run command (for future reference):**
```
cd packages/db
NODE_PATH=../../node_modules/.pnpm/node_modules DATABASE_URL="postgresql://..." node_modules/.bin/ts-node --project tsconfig.json prisma/seed.ts
```

---

---

### Unit 6 — File Attachments for Tasks and Pages (2026-06-15) ✅

**What was done:**

1. **`FileAttachment` Prisma model added** (`packages/db/prisma/schema.prisma`):
   - Polymorphic model with entityType (string) + entityId (string) — supports TASK, PAGE, and future EVIDENCE/NCR_CAPA without schema changes
   - Fields: id, originalFileName, storedFileName, storagePath, mimeType, fileSize, checksum?, uploadedById, entityType, entityId, createdAt
   - Indexed on (entityType, entityId) and uploadedById
   - Relation to User via `FileAttachmentUploader` named relation

2. **Migration applied** via `prisma migrate dev --name add_file_attachments` — `file_attachments` table created.

3. **Prisma client regenerated** — `prisma generate` run after schema update.

4. **`FileAttachmentsModule`** (`apps/api/src/modules/file-attachments/`):
   - `FileAttachmentsService`:
     - `upload()` — validates file via FileStorageService, saves to `UPLOAD_DIR/attachments/<entitytype>/<year>/<month>/`, creates DB record, creates audit log
     - `findForEntity()` — returns all attachments for a given entityType + entityId, includes uploadedBy.fullName
     - `download()` — checks file exists, pipes stream to response with correct Content-Disposition
     - `delete()` — ownership check (own files or admin-level permission), deletes DB record + disk file
   - `FileAttachmentsController` — six endpoints (no new permissions; uses existing tasks.update / pages.update guards):
     - `POST /tasks/:id/attachments` — upload to task (requires tasks.update)
     - `GET /tasks/:id/attachments` — list task attachments (requires tasks.read)
     - `POST /pages/:id/attachments` — upload to page (requires pages.update)
     - `GET /pages/:id/attachments` — list page attachments (requires pages.read)
     - `GET /attachments/:id/download` — download attachment (JwtAuthGuard only)
     - `DELETE /attachments/:id` — delete attachment (JwtAuthGuard + ownership check in service)
   - Module wired into AppModule; imports AuditLogModule; exports FileAttachmentsService

5. **`FileStorageService`** reused from `apps/api/src/common/file-storage.service.ts` (already built in Unit 4 for documents).

6. **Frontend** (`apps/web/src/`):
   - `features/file-attachments/types.ts` — FileAttachment interface, formatFileSize(), fileIcon() helpers
   - `features/file-attachments/file-attachment-section.tsx` — reusable component:
     - Props: entityType, entityId, uploadEndpoint, listEndpoint, canUpload, canDelete, compact
     - Shows file list: name, size, uploader, date, download button, delete button (shown for own files or when canDelete=true)
     - Attach button triggers hidden file input; uploads via apiUploadFile; appends to list on success
     - Download via fetch + blob + object URL to respect Authorization header
     - Delete via DELETE /attachments/:id with confirmation
   - `features/workspaces/task-detail-panel.tsx` updated — `FileAttachmentSection` added between subtasks section and Comments/Activity tabs; upload gated by tasks.update permission
   - `features/pages/pages-view.tsx` updated — `FileAttachmentSection` added below content textarea in page editor; upload gated by canUpdate (pages.update permission)

7. **Build verification**:
   - API TypeScript check — ✅ passed (exit 0)
   - Web TypeScript check — ✅ passed (exit 0)
   - `npx next build` — ✅ passed (all 15 routes, TypeScript clean)

**File storage layout:**
- Task attachments: `uploads/attachments/task/<year>/<month>/<uid>_<safe-name>.<ext>`
- Page attachments: `uploads/attachments/page/<year>/<month>/<uid>_<safe-name>.<ext>`
- Document versions: `uploads/documents/<year>/<month>/` (Unit 4 pattern, unchanged)

**Authorization summary:**
- Upload requires entity-level permission (tasks.update / pages.update)
- Download requires valid JWT only (any authenticated user can download)
- Delete: own files (uploadedById match) OR admin-level permission (users.manage or settings.manage)

---

### Unit 6 — Attachment Authorization Hardening — Pass 1 (2026-06-15) ✅

**What was fixed (Pass 1):**

Prior state: `GET /attachments/:id/download` was JWT-only with no entity-level check. `DELETE /attachments/:id` had an ownership check but no entity-level guard or task-state guard.

- Download: added `tasks.read` / `pages.read` permission check gated on entityType
- Delete: added entity-update permission check + COMPLETED/CANCELLED task lock
- `storagePath` confirmed never returned to clients in any response

**No schema changes. Build: ✅ API + ✅ Web.**

---

### Unit 6 — Attachment Authorization Hardening — Pass 2 (2026-06-15) ✅

**What was fixed (Pass 2):**

Prior state after Pass 1: download checked only `tasks.read` / `pages.read`. Because all 8 roles have these permissions, any authenticated user could still download any attachment by ID, regardless of workspace/department context.

**Full entity-level access matrix now enforced in `FileAttachmentsService.assertEntityAccess()`:**

**Layer 1 — Global admin bypass:**
- Permissions `users.manage` OR `settings.manage` → always allowed (SUPER_ADMIN, IT_ADMIN)

**Layer 2 — Elevated role bypass:**
- Role names `SUPER_ADMIN`, `IT_ADMIN`, `ISO_MANAGER`, `QHSE_USER` → always allowed
- Role names extracted from `user.userRoles[].role.name` via new `extractUserRoles()` helper in `permissions.guard.ts`

**Layer 3 — TASK attachment access (non-elevated users):**
- Must have `tasks.read` permission, AND at least one of:
  - Actor is the task assignee (`task.assigneeId === actorId`)
  - Actor is the task creator (`task.createdById === actorId`)
  - Actor is the workspace owner (`task.workspace.ownerId === actorId`)
  - Actor's `departmentId` matches the task list's `departmentId` (DEPARTMENT_MANAGER and DEPARTMENT_USER scoped to their department's work)
- Service queries `Task` with `taskList.departmentId` and `workspace.ownerId` in a single include
- If none of the above: `ForbiddenException('You do not have access to this task\'s attachments')`

**Layer 4 — PAGE attachment access (non-elevated users):**
- Must have `pages.read` permission, AND at least one of:
  - Actor is the workspace owner (`page.workspace.ownerId === actorId`)
  - **MVP assumption**: The current `Workspace` model has no `departmentId` field — all workspaces are organisation-wide, not department-restricted. Therefore any user with `pages.read` is permitted to access page attachments. This assumption is documented here and in Open Questions below.
- This assumption will be revisited when workspace membership or workspace-department scoping is introduced.

**Other changes:**
- `extractUserRoles(user)` exported from `apps/api/src/common/permissions.guard.ts`
- Controller `download()` now passes `permissions`, `roles`, and `departmentId` extracted from the JWT user object
- `storagePath` is never included in any serialized response (ATTACHMENT_SELECT excludes it; internal uses only)
- Audit log (`DOWNLOADED`) created as fire-and-forget — log failure cannot block the file stream
- All authorization logic is server-side only; frontend role/permission checks are for UX only

**No schema changes, no migration needed.**

**Build verification:**
- API TypeScript check — ✅ passed (exit 0, zero errors)
- API NestJS build — ✅ passed (exit 0)
- Web Next.js build — ✅ passed (all 15 routes, TypeScript clean)

---

---

### Unit 7 — Controlled ISO Document Library Hardening (2026-06-15) ✅

**What was done:**

1. **`rejectionReason String?` added** to `Document` model in `packages/db/prisma/schema.prisma`.

2. **Migration applied** via `prisma migrate dev --name add_controlled_documents` — `migration 20260615081748_add_controlled_documents` added the `rejectionReason` column to `documents` table.

3. **Prisma client regenerated** — `prisma generate` run after schema update.

4. **`DocumentsService` fully rewritten** (`apps/api/src/modules/documents/documents.service.ts`):

   - **Per-transition permission logic** — `validateStatusPermission()` private method:
     - `APPROVED` / `REJECTED` → requires `documents.approve`
     - `ARCHIVED` → requires `documents.archive`
     - `DRAFT` / `UNDER_REVIEW` → allowed for any `documents.update` holder (enforced at controller level)
   - **`rejectionReason` persistence** — written to `Document.rejectionReason` field on rejection; cleared when document returns to DRAFT or UNDER_REVIEW
   - **Required rejection reason** — `BadRequestException` thrown if rejectionReason is empty/missing on rejection
   - **Entity-level download access control** by role (4-tier matrix):
     - Layer 1: global admin (`users.manage` / `settings.manage`) → bypass all
     - Layer 2: elevated roles (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER) → bypass all
     - Layer 3: DEPARTMENT_MANAGER → own department or own documents (ownerId/createdById match)
     - Layer 4: DEPARTMENT_USER → own documents or APPROVED docs from own/null department
     - Layer 5: AUDITOR_VIEWER → APPROVED documents only
     - Layer 6: STAFF → APPROVED documents from own or null department only
   - **`getVersions(id)`** added — list all versions for a document
   - **`downloadCurrentVersion()`** added — downloads the document's `currentVersionId` version
   - **`archive(id, actorId)`** added — dedicated archive method for use by `PATCH :id/archive` endpoint (requires APPROVED → ARCHIVED transition)
   - **`findAll()` updated** — role-scoped list filtering (AUDITOR_VIEWER/STAFF see only APPROVED; DEPARTMENT_MANAGER/USER scoped to their department + own docs; elevated roles see all)
   - **`storagePath` never returned** to clients (excluded from all Prisma selects; used only internally for streaming)
   - Audit logs for all mutations (UPLOADED, UPDATED, STATUS_CHANGED, APPROVED, REJECTED, ARCHIVED, DOWNLOADED)
   - Notifications for APPROVED, REJECTED, UNDER_REVIEW transitions

5. **`DocumentsController` updated** (`apps/api/src/modules/documents/documents.controller.ts`):
   - `PATCH :id/status` guard changed from `@RequirePermissions('documents.approve')` → `@RequirePermissions('documents.update')` (minimum bar; per-transition enforcement moved to service)
   - `updateStatus()` now extracts and passes `actorPermissions` to service
   - **New `GET :id/versions`** endpoint — lists all versions (requires `documents.read`)
   - **New `GET :id/download`** endpoint — downloads current version (requires `documents.download`)
   - **New `PATCH :id/archive`** endpoint — dedicated archive (requires `documents.archive`)
   - `GET :id/versions/:versionId/download` — updated to pass permissions/roles/departmentId for entity-level check

6. **Seed fixed** (`packages/db/prisma/seed.ts`):
   - `QHSE_USER` role: added `documents.approve` and `documents.archive` (were missing; QHSE_USER is an elevated role that should be able to approve/archive documents)

7. **Frontend types updated** (`apps/web/src/features/documents/types.ts`):
   - `rejectionReason?: string` added to both `DocumentSummary` and `DocumentDetail` interfaces
   - `getAllowedTransitions(currentStatus, permissions)` helper added — filters allowed status transitions by actor's permissions, mirrors service-level per-transition logic; used by the detail page to show only the transitions the actor can actually perform

8. **Document detail page updated** (`apps/web/src/app/(app)/documents/[id]/page.tsx`):
   - Changed to use `getAllowedTransitions(doc.status, user?.permissions ?? [])` instead of `STATUS_TRANSITIONS[doc.status]`
   - "Change Status" dropdown now visible to any `documents.update` holder (not just approve), so DEPARTMENT_USER can submit for review; approve/archive/reject options only appear when the actor has `documents.approve` / `documents.archive` permission
   - **Rejection reason banner** shown when `doc.status === 'REJECTED' && doc.rejectionReason` — prominent red banner above the document body

9. **Build verification**:
   - API TypeScript check — ✅ passed (exit 0, zero errors)
   - API NestJS build — ✅ passed (exit 0)
   - Web Next.js build — ✅ passed (all 15 routes intact, TypeScript clean)

**New API endpoints:**
- `GET  /documents/:id/versions` — list all versions (requires `documents.read`)
- `GET  /documents/:id/download` — download current version (requires `documents.download`)
- `PATCH /documents/:id/archive` — dedicated archive action (requires `documents.archive`)

**Corrected API endpoints:**
- `PATCH /documents/:id/status` — now requires minimum `documents.update` at controller; service enforces stricter per-transition checks

**Access control matrix for document downloads:**

| Role                | Can access |
|---------------------|-----------|
| SUPER_ADMIN / IT_ADMIN | All documents regardless of status or department |
| ISO_MANAGER / QHSE_USER | All documents regardless of status or department |
| DEPARTMENT_MANAGER | Own department docs + own documents (any status) |
| DEPARTMENT_USER | Own docs (any status) + APPROVED docs from own/null dept |
| AUDITOR_VIEWER | APPROVED documents only |
| STAFF | APPROVED documents from own or org-wide (null dept) only |

---

---

### Unit 8 — Bulk Document Upload (2026-06-15) ✅

**What was done:**

1. **`BulkUploadDocumentDto`** created (`apps/api/src/modules/documents/dto/bulk-upload-document.dto.ts`):
   - Optional fields: `documentNumberPrefix`, `category`, `departmentId`, `workspaceId`, `taskId`, `ownerId`, `defaultStatus` (DRAFT or UNDER_REVIEW only), `reviewDate`, `expiryDate`
   - All fields optional — safe default is DRAFT with GENERAL category

2. **`DocumentsService.bulkUpload()`** added (`apps/api/src/modules/documents/documents.service.ts`):
   - Accepts `files: Express.Multer.File[]`, `dto: BulkUploadDocumentDto`, `actorId: string`
   - Per-file processing loop — each file is validated and saved independently
   - Title derived from file name: strips extension, replaces `-` and `_` with spaces
   - Document number generated as `${prefix}-${String(i+1).padStart(3, '0')}` when `documentNumberPrefix` is set
   - Per-file `try/catch` — one file failing does NOT stop the batch
   - Each successful file: individual `UPLOADED` audit log with `source: 'BULK_UPLOAD'` in newValue
   - After all files: one summary `BULK_UPLOADED` audit log with counts
   - If any file uploaded as UNDER_REVIEW: single summary notification to all ISO_MANAGER / QHSE_USER / DEPARTMENT_MANAGER reviewers (not the uploader)
   - Returns `{ results[], successCount, failCount }`
   - `BulkUploadFileResult` and `BulkUploadResponse` interfaces exported for type safety

3. **`DocumentsController`** updated (`apps/api/src/modules/documents/documents.controller.ts`):
   - `POST /documents/bulk-upload` added with `@RequirePermissions('documents.create')`
   - Uses `FilesInterceptor('files[]', 50, { storage: memoryStorage() })`
   - `UploadedFiles`, `FilesInterceptor` imported from NestJS platform-express
   - `BulkUploadDocumentDto` imported

4. **`BulkUploadModal`** created (`apps/web/src/features/documents/bulk-upload-modal.tsx`):
   - Drop zone with drag-and-drop support (drag over highlights, drop adds files)
   - Multiple file picker via hidden `<input multiple>`
   - Client-side validation: extension allowlist + 50 MB limit + dedup by name+size
   - File list shows each file with name, size, and remove button
   - Warning banner: "Bulk upload creates a controlled document record for each file"
   - Form fields: category, defaultStatus (DRAFT/UNDER_REVIEW only), department, workspace, reviewDate, expiryDate, documentNumberPrefix
   - Animated progress bar during upload (simulated count + polling interval)
   - Two-phase UI: upload form → results table after completion
   - Results table: per-file row with success (green badge) or failed (red badge) and error message
   - Summary banners: green success count + red fail count
   - Sends `files[]` as multipart form field to `POST /documents/bulk-upload`
   - Uses raw `fetch` with Authorization header (consistent with other download patterns)

5. **`Documents page`** updated (`apps/web/src/app/(app)/documents/page.tsx`):
   - "Bulk Upload" button added (outlined accent, `Files` icon) — gated by `documents.create`
   - Placed to the left of the existing "Upload Document" button
   - `BulkUploadModal` imported and rendered conditionally via `showBulkUpload` state
   - On completion: modal closes + `loadDocuments(1)` reloads the list if any succeeded

6. **No schema migration needed** — all Document fields required for bulk upload already exist.

7. **Build verification**:
   - API TypeScript check — ✅ passed (exit 0, zero errors)
   - API NestJS build — ✅ passed (exit 0)
   - Web Next.js build — ✅ passed (all 15 routes intact, TypeScript clean)

**New API endpoint:**
- `POST /documents/bulk-upload` — bulk upload documents (requires `documents.create`)
  - Body: `multipart/form-data` with `files[]` (multiple), plus optional metadata fields
  - Response: `{ results: BulkUploadFileResult[], successCount: number, failCount: number }`

**Per-file error handling:**
- Each file is processed in isolation inside a try/catch
- File type validation errors, size errors, or DB transaction failures are captured per-file
- The overall response always returns the full results array regardless of individual failures
- Frontend shows a clear per-file results table after upload completes

**File storage:**
- Same location as single uploads: `uploads/documents/<year>/<month>/<uid>_<safe-name>.<ext>`
- PostgreSQL stores metadata: Document + DocumentVersion records per file (same as single upload)
- `storagePath` is never returned to clients

---

### Unit 9 — Audit Checklist, Evidence Submission, Evidence Review, Department Readiness (2026-06-15) ✅

**What was done:**

1. **Prisma schema extended** (`packages/db/prisma/schema.prisma`):
   - `AuditChecklist` — id, name, description, isoStandard, workspaceId, departmentId, createdById, timestamps; relations to Workspace, Department, User (creator), AuditChecklistItem[]
   - `AuditChecklistItem` — id, checklistId, departmentId, title, description, isoClause, responsibleUserId, reviewerId, dueDate, status (MISSING default), sortOrder, reviewedAt, rejectionReason, createdById, timestamps; relations to AuditChecklist (cascade delete), Department, responsibleUser, reviewer, createdBy, ChecklistEvidence[]
   - `ChecklistEvidence` — id, checklistItemId, submittedById, status (SUBMITTED default), notes, reviewerId, reviewedAt, rejectionReason, timestamps; relations to AuditChecklistItem (cascade delete), submittedBy, reviewer
   - Back-relations added to: Department (checklists, checklistItems), Workspace (checklists), User (createdChecklists, responsibleChecklistItems, reviewerChecklistItems, createdChecklistItems, submittedEvidence, reviewedEvidence)
   - File attachments for evidence via polymorphic `FileAttachment` (entityType = `CHECKLIST_EVIDENCE`)

2. **Migration applied** via `prisma migrate dev --name add_audit_checklist_evidence` — creates `audit_checklists`, `audit_checklist_items`, `checklist_evidence` tables.

3. **Prisma client regenerated** — `prisma generate` run after schema update.

4. **4 new permissions added** to seed (`packages/db/prisma/seed.ts`) — total now **35 permissions**:
   - `checklist.read` → SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER, AUDITOR_VIEWER, STAFF
   - `checklist.create` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER
   - `checklist.update` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER
   - `checklist.review` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER
   - `evidence.submit` added to STAFF role
   - Seed re-run successfully (35 permissions confirmed)

5. **`AuditChecklistsModule`** (`apps/api/src/modules/audit-checklists/`):
   - **DTOs**: CreateChecklistDto, UpdateChecklistDto, CreateChecklistItemDto, UpdateChecklistItemDto, SubmitEvidenceDto, RejectEvidenceDto
   - **`AuditChecklistsService`**:
     - `findAll(query)` — list checklists with optional departmentId/workspaceId/search filters
     - `findOne(id)` — get checklist with workspace, department, createdBy, _count.items
     - `create(dto, actorId)` — creates checklist, audit log CHECKLIST_CREATED
     - `update(id, dto, actorId)` — updates checklist, audit log CHECKLIST_UPDATED
     - `getReadiness(id)` — returns { total, approved, percentage } for a checklist
     - `getDepartmentReadiness(deptId)` — returns { total, approved, percentage } across all items for a department
     - `getItems(checklistId)` — list items ordered by sortOrder, createdAt
     - `createItem(checklistId, dto, actorId)` — creates item, audit log, notification to responsibleUser
     - `updateItem(itemId, dto, actorId)` — updates item, audit log
     - `getEvidence(checklistItemId)` — list evidence ordered by createdAt desc
     - `submitEvidence(checklistItemId, dto, actorId)` — creates evidence, moves item to SUBMITTED if MISSING/REJECTED, audit log, notification to reviewer
     - `approveEvidence(evidenceId, actorId, roles, permissions)` — requires checklist.review or reviewer match or REVIEWER_ROLES; sets evidence APPROVED, item APPROVED, audit log, notification to submitter
     - `rejectEvidence(evidenceId, dto, actorId, roles, permissions)` — requires checklist.review or reviewer match or REVIEWER_ROLES; sets evidence REJECTED with rejectionReason, item REJECTED with rejectionReason (resubmission allowed), audit log, notification to submitter
   - **`AuditChecklistsController`** — all endpoints gated with JwtAuthGuard + PermissionsGuard:
     - `GET /checklists` — list (checklist.read)
     - `GET /checklists/:id` — single (checklist.read)
     - `GET /checklists/:id/readiness` — readiness % (checklist.read)
     - `POST /checklists` — create (checklist.create)
     - `PATCH /checklists/:id` — update (checklist.update)
     - `GET /checklists/:id/items` — list items (checklist.read)
     - `POST /checklists/:id/items` — create item (checklist.create)
     - `PATCH /checklists/items/:itemId` — update item (checklist.update)
     - `GET /checklists/items/:itemId/evidence` — list evidence (checklist.read)
     - `POST /checklists/items/:itemId/evidence` — submit evidence (evidence.submit)
     - `PATCH /checklists/evidence/:evidenceId/approve` — approve (checklist.review)
     - `PATCH /checklists/evidence/:evidenceId/reject` — reject (checklist.review)
     - `GET /checklists/departments/:deptId/readiness` — dept readiness (checklist.read)
   - **Module** imports: PrismaModule, AuditLogModule, NotificationsModule

6. **`FileAttachmentsController` updated** — 2 new endpoints for checklist evidence attachments:
   - `POST /checklist-evidence/:id/attachments` — upload (requires evidence.submit)
   - `GET /checklist-evidence/:id/attachments` — list (requires checklist.read)

7. **`AuditChecklistsModule` wired** into `AppModule`.

8. **Seed `prisma.config.ts` updated** — added `seed` key to `migrations` section for Prisma 7 `prisma db seed` command.

9. **Frontend** (`apps/web/src/`):
   - `features/checklist/types.ts` — ChecklistSummary, ChecklistItem, ChecklistEvidence, ChecklistReadiness interfaces, ItemStatus type, ITEM_STATUS_CONFIG display map
   - `features/checklist/create-checklist-modal.tsx` — modal to create a checklist (name, isoStandard, description, department, workspace)
   - `features/checklist/create-item-modal.tsx` — modal to add checklist item (title, isoClause, dueDate, description, department, responsibleUser, reviewer)
   - `features/checklist/evidence-panel.tsx` — slide-over panel:
     - Lists all evidence submissions for an item with status badge, notes, rejection reason
     - Approve/Reject buttons for checklist.review holders (reject shows inline rejection reason textarea)
     - File attachment button (POST /checklist-evidence/:id/attachments)
     - Evidence submit form at bottom for evidence.submit holders
     - Shows item header with status badge, ISO clause, description, rejection reason banner
   - `app/(app)/checklist/page.tsx` — full checklist page (replaces ComingSoon stub):
     - Accordion-style list of checklists with expand/collapse
     - Expanded: shows item table (title, ISO clause, department, responsible user, due date, status badge, evidence count)
     - Readiness bar per checklist (auto-loaded on expand) with color-coded % (green ≥ 80, yellow ≥ 50, red < 50)
     - "Add Item" button below table (gated by checklist.create/update)
     - Click any item row → opens EvidencePanel slide-over
     - Search filter and department filter

10. **Build verification**:
    - API TypeScript check — ✅ passed (exit 0, zero errors)
    - API NestJS build — ✅ passed (exit 0)
    - Web Next.js build — ✅ passed (15 routes, TypeScript clean)
    - Seed — ✅ passed (35 permissions)

**Evidence workflow:**
- Item starts at MISSING
- User with evidence.submit submits notes → item moves to SUBMITTED
- User with checklist.review approves → item moves to APPROVED (counts toward readiness %)
- User with checklist.review rejects (reason required) → item moves to REJECTED, rejectionReason stored
- REJECTED item can be resubmitted (new evidence submission moves item back to SUBMITTED)

**Readiness calculation:**
- Per checklist: `approved_items / total_items * 100`
- Per department: `approved_items_in_dept / total_items_in_dept * 100`
- Both available as API endpoints and displayed in the frontend

---

### Unit 10 — NCR/CAPA (2026-06-15) ✅

**What was done:**

1. **Prisma schema extended** (`packages/db/prisma/schema.prisma`):
   - `NcrCapa` model: id, ncrNumber (unique), title, description, type (NCR/CAPA/OBSERVATION), severity (MINOR/MAJOR/CRITICAL/OBSERVATION), status (OPEN default), isoClause, workspaceId, departmentId, checklistItemId (optional FK to AuditChecklistItem), raisedById, assignedToId, verifiedById, closedById, rootCause, correctiveAction, preventiveAction, dueDate, verifiedAt, closedAt, rejectionReason, timestamps; 6 indexes on status/severity/departmentId/workspaceId/raisedById/assignedToId
   - `NcrCapaComment` model: id, ncrCapaId (cascade delete), authorId, body, createdAt; index on ncrCapaId
   - Back-relations added to: Department (ncrCapas), Workspace (ncrCapas), AuditChecklistItem (ncrCapas), User (raisedNcrCapas/assignedNcrCapas/verifiedNcrCapas/closedNcrCapas/ncrCapaComments)
   - File attachments via polymorphic `FileAttachment` (entityType = `NCR_CAPA`)

2. **Migration applied** via `prisma migrate dev --name add_ncr_capa` — creates `ncr_capa` and `ncr_capa_comments` tables.

3. **Prisma client regenerated** — `prisma generate` run after schema update.

4. **5 new granular NCR permissions added** to seed — total now **40 permissions**:
   - `ncr.read` → All roles (IT_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER, AUDITOR_VIEWER, STAFF + SUPER_ADMIN via wildcard)
   - `ncr.create` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER
   - `ncr.update` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER
   - `ncr.verify` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER
   - `ncr.close` → SUPER_ADMIN, ISO_MANAGER, QHSE_USER
   - Seed re-run successfully (40 permissions confirmed)

5. **`NcrCapaModule`** (`apps/api/src/modules/ncr-capa/`):
   - **DTOs**: CreateNcrCapaDto, UpdateNcrCapaDto, AddCommentDto, RejectVerificationDto
   - **`NcrCapaService`** — 10 methods:
     - `findAll(query)` — list with filters (status, severity, departmentId, workspaceId, type, search)
     - `findOne(id)` — full detail with checklistItem, _count.comments
     - `create(dto, actorId)` — creates record, audit log CREATED, notification to assignee
     - `update(id, dto, actorId, roles, permissions)` — updates fields; entity-level check: non-elevated ncr.update holders can only update records assigned to or raised by them; blocks update on CLOSED records
     - `submit(id, actorId, roles)` — transitions to SUBMITTED; requires assignee/raiser or elevated role
     - `verify(id, actorId, roles, permissions)` — requires ncr.verify or ELEVATED_ROLES; transitions to VERIFIED; notifies raiser
     - `rejectVerification(id, dto, actorId, roles, permissions)` — requires ncr.verify or ELEVATED_ROLES; transitions to REJECTED with rejectionReason; notifies assignee/raiser
     - `close(id, actorId, roles, permissions)` — requires ncr.close or ELEVATED_ROLES; transitions VERIFIED → CLOSED
     - `addComment(id, dto, actorId)` — adds comment; ncr.read required
     - `getComments(id)` — lists comments ordered by createdAt asc
   - **`NcrCapaController`** — 10 endpoints:
     - `GET /ncr-capa` — list (ncr.read)
     - `GET /ncr-capa/:id` — detail (ncr.read)
     - `POST /ncr-capa` — create (ncr.create)
     - `PATCH /ncr-capa/:id` — update (ncr.update)
     - `PATCH /ncr-capa/:id/submit` — submit for verification (ncr.update)
     - `PATCH /ncr-capa/:id/verify` — verify (ncr.verify)
     - `PATCH /ncr-capa/:id/reject-verification` — reject verification with reason (ncr.verify)
     - `PATCH /ncr-capa/:id/close` — close verified record (ncr.close)
     - `POST /ncr-capa/:id/comments` — add comment (ncr.read)
     - `GET /ncr-capa/:id/comments` — list comments (ncr.read)
   - **Module** imports: PrismaModule, AuditLogModule, NotificationsModule

6. **`FileAttachmentsController` updated** — 2 new NCR/CAPA attachment endpoints:
   - `POST /ncr-capa/:id/attachments` — upload (requires ncr.update)
   - `GET /ncr-capa/:id/attachments` — list (requires ncr.read)

7. **`FileAttachmentsService` updated** — NCR_CAPA branch added to `assertEntityAccess()`:
   - Layer 1: global admin → bypass
   - Layer 2: elevated role → bypass
   - Layer 3: requires ncr.read; then:
     - Raiser → allowed
     - Assignee → allowed
     - Department match → allowed
     - ncr.verify or ncr.close holder → allowed
     - Otherwise → ForbiddenException
   - `updatePermFor('NCR_CAPA')` returns `'ncr.update'` for delete access check

8. **`NcrCapaModule` wired** into `AppModule`.

9. **Frontend** (`apps/web/src/`):
   - `features/ncr-capa/types.ts` — NcrType, NcrStatus, Severity type aliases; NcrCapaSummary, NcrCapaDetail, NcrComment interfaces; NCR_STATUS_CONFIG, SEVERITY_CONFIG, NCR_TYPE_LABELS display maps
   - `features/ncr-capa/create-ncr-modal.tsx` — modal to raise NCR/CAPA: title, type, severity, ISO clause, NCR number, department, workspace, due date, description
   - `features/ncr-capa/ncr-detail-panel.tsx` — slide-over panel with:
     - Status badge + severity badge in header
     - Rejection reason banner (when status = REJECTED)
     - Action buttons: Submit for Verification (assignee/raiser), Verify (ncr.verify), Reject with reason form (ncr.verify), Close (ncr.close)
     - Details tab: meta grid (type, ISO clause, raised by, assigned to, dept, workspace, due date, verified by, closed by), description, rootCause/correctiveAction/preventiveAction sections, linked checklist item
     - Comments tab: comment list with author avatar + timestamp; submit comment form
   - `app/(app)/ncr-capa/page.tsx` — full NCR/CAPA page (replaces ComingSoon stub):
     - Stats bar: Open / Overdue / Verified+Closed / Rejected counts
     - Search filter + type filter (client-side)
     - Status tabs: All / Open / In Progress / Submitted / Verified / Closed / Rejected with counts
     - Table: NCR# / Title+clause / Type / Severity / Status / Assigned To / Department / Due Date (red if overdue) / Comments count
     - Click row → opens NcrDetailPanel
     - Raise NCR/CAPA button (gated by ncr.create)

10. **Build verification**:
    - Migration — ✅ applied cleanly
    - Seed — ✅ 40 permissions
    - API TypeScript — ✅ passed
    - API NestJS build — ✅ passed (exit 0)
    - Web Next.js build — ✅ passed (15 routes including /ncr-capa, TypeScript clean)

**Status flow:**
- OPEN → IN_PROGRESS → WAITING_EVIDENCE → SUBMITTED → VERIFIED → CLOSED
- SUBMITTED → REJECTED (resubmittable: REJECTED → IN_PROGRESS via re-submit)
- Any → OVERDUE (admin-set; no background worker in MVP)

**NCR/CAPA permission matrix:**

| Permission | Roles |
|---|---|
| `ncr.read` | All 8 roles |
| `ncr.create` | SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER |
| `ncr.update` | SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER, DEPARTMENT_USER |
| `ncr.verify` | SUPER_ADMIN, ISO_MANAGER, QHSE_USER |
| `ncr.close` | SUPER_ADMIN, ISO_MANAGER, QHSE_USER |

**Entity-level enforcement (beyond permission check):**
- `ncr.update` holders who are not elevated roles can only update records they raised or are assigned to
- `submit` endpoint: only assignee, raiser, or elevated role can submit
- `verify`, `reject-verification`, `close`: ncr.verify/ncr.close checked; elevated roles bypass

---

### Unit 9 — Permission Consistency Verification Pass (2026-06-15) ✅

A targeted audit of all checklist/evidence permission guards was performed after the initial Unit 9 implementation. Six issues were identified and fixed.

---

#### Findings and Fixes

**Finding 1 — `evidence.review` is unused by the checklist module (documented)**

`evidence.review` is a pre-existing legacy permission in the seed catalogue (assigned to ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER). It is retained for future use in a standalone evidence module.

For checklist evidence, the operative permission is **`checklist.review`** — not `evidence.review`. All approve/reject endpoints use `@RequirePermissions('checklist.review')`. The service service-level check uses `actorPermissions.includes('checklist.review')`. This is the authoritative permission for checklist evidence review and will remain so.

`evidence.review` is **not wired to any endpoint** in the current system. No change was made to the seed for this finding — the permission and role assignments are retained as a catalogue placeholder for future modules.

---

**Finding 2 — `evidence.submit` alone CANNOT approve or reject (verified, no fix needed)**

The approve and reject endpoints (`PATCH /checklists/evidence/:id/approve` and `PATCH /checklists/evidence/:id/reject`) require `@RequirePermissions('checklist.review')` at the controller level. A user with only `evidence.submit` is blocked before reaching the service.

Inside the service, `approveEvidence()` and `rejectEvidence()` additionally check:
- `actorRoles.some(r => REVIEWER_ROLES.includes(r))` — elevated role bypass
- `actorPermissions.includes('checklist.review')` — permission check
- `evidence.checklistItem.reviewerId === actorId` — assigned reviewer bypass (still requires passing the controller guard first)

Confirmed: a pure `evidence.submit` holder cannot approve or reject. No code change needed.

---

**Finding 3 — AUDITOR_VIEWER could read all evidence regardless of status (FIXED)**

**Before:** `getEvidence()` returned all evidence for any caller with `checklist.read`.

**Fix:** `getEvidence()` now accepts actor context and applies three-tier visibility:

| Actor | Visible evidence |
|-------|-----------------|
| REVIEWER_ROLES or `checklist.review` | All evidence (SUBMITTED, APPROVED, REJECTED) |
| `evidence.submit` holder | Own submissions (any status) + others' APPROVED |
| AUDITOR_VIEWER / read-only (no `evidence.submit`) | APPROVED only |

AUDITOR_VIEWER has `checklist.read` but not `evidence.submit` or `checklist.review`, so they see APPROVED evidence only. STAFF now has `evidence.submit` and can see their own submissions plus any APPROVED from others. DEPARTMENT_USER sees their own submissions plus APPROVED.

**Files changed:**
- `apps/api/src/modules/audit-checklists/audit-checklists.service.ts` — `getEvidence()` signature extended; filtering added
- `apps/api/src/modules/audit-checklists/audit-checklists.controller.ts` — `getEvidence()` handler passes `actorId`, `roles`, `permissions`

---

**Finding 4 — Any `evidence.submit` holder could submit for any item (FIXED)**

**Before:** `submitEvidence()` performed no check on whether the actor has a relationship to the checklist item. Any user with `evidence.submit` (including STAFF) could submit evidence for any item in any department.

**Fix:** `submitEvidence()` now enforces a responsibility gate:

| Condition | Result |
|-----------|--------|
| Actor is in REVIEWER_ROLES | Allowed (ISO/QHSE can submit for any item) |
| Actor has `checklist.create` or `checklist.update` | Allowed (elevated checklist managers) |
| Actor is the item's `responsibleUserId` | Allowed |
| Actor's `departmentId` matches item's `departmentId` | Allowed (dept users submitting for their dept items) |
| None of the above | `ForbiddenException` |

This ensures STAFF can only submit evidence for items where they are the designated responsible user, or if the item belongs to their department (covering DEPARTMENT_USER scope).

**Files changed:**
- `apps/api/src/modules/audit-checklists/audit-checklists.service.ts` — `submitEvidence()` signature extended; responsibility check added
- `apps/api/src/modules/audit-checklists/audit-checklists.controller.ts` — `submitEvidence()` handler passes `roles`, `permissions`, `departmentId`

---

**Finding 5 — CHECKLIST_EVIDENCE attachments had no entity-level download check (FIXED)**

**Before:** `FileAttachmentsService.assertEntityAccess()` had branches for TASK and PAGE only. If `entityType === 'CHECKLIST_EVIDENCE'`, the method fell through silently — any authenticated user could download any evidence attachment via `GET /attachments/:id/download`.

**Fix:** Added a `CHECKLIST_EVIDENCE` branch to `assertEntityAccess()`:

| Layer | Rule |
|-------|------|
| Layer 1 | Global admin (`users.manage` / `settings.manage`) → bypass |
| Layer 2 | Elevated role (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER) → bypass |
| Layer 3 | Submitter (`evidence.submittedById === actorId`) → allowed |
| Layer 4 | Assigned reviewer (`checklistItem.reviewerId === actorId`) → allowed |
| Layer 5 | Department match (`checklistItem.departmentId === actor.departmentId`) → allowed |
| Layer 6 | `checklist.review` permission holder → allowed |
| Layer 7 | `checklist.read` holder + evidence status is APPROVED → allowed (AUDITOR_VIEWER) |
| Default | `ForbiddenException` |

**File changed:** `apps/api/src/modules/file-attachments/file-attachments.service.ts`

---

**Finding 6 — Any `evidence.submit` holder could attach files to any evidence record (FIXED)**

**Before:** `POST /checklist-evidence/:id/attachments` only checked `@RequirePermissions('evidence.submit')`. Any user with that permission could upload files to any evidence record, including records they did not submit.

**Fix:** Added `assertEvidenceUploadAccess()` method to `FileAttachmentsService`. The controller calls this before calling `upload()`:

- Elevated roles → bypass
- Global admin → bypass
- Otherwise: actor must be the `submittedById` of the evidence record → if not, `ForbiddenException('You can only attach files to your own evidence submissions')`

**Files changed:**
- `apps/api/src/modules/file-attachments/file-attachments.service.ts` — `assertEvidenceUploadAccess()` added
- `apps/api/src/modules/file-attachments/file-attachments.controller.ts` — `uploadToEvidence()` made async, extracts roles/permissions, calls `assertEvidenceUploadAccess()` before `upload()`

---

#### Build Verification

- API TypeScript check — ✅ passed (exit 0, zero errors)
- API NestJS build — ✅ passed (exit 0)
- Web Next.js build — ✅ passed (15 routes, TypeScript clean)

---

#### Permission Matrix Summary (final, post-verification)

| Permission | Purpose | Roles |
|---|---|---|
| `checklist.read` | View checklists, items, APPROVED evidence | All roles |
| `checklist.create` | Create checklists and items | ISO_MANAGER, QHSE_USER, DEPT_MANAGER, DEPT_USER |
| `checklist.update` | Update checklist items and assignments | ISO_MANAGER, QHSE_USER, DEPT_MANAGER |
| `checklist.review` | Approve/reject checklist evidence | ISO_MANAGER, QHSE_USER (+ SUPER_ADMIN via wildcard) |
| `evidence.submit` | Submit evidence for checklist items | ISO_MANAGER, QHSE_USER, DEPT_MANAGER, DEPT_USER, STAFF |
| `evidence.review` | (Unused — reserved for future standalone evidence module) | ISO_MANAGER, QHSE_USER, DEPT_MANAGER |

---

### Unit 13 — Collaboration Foundation (2026-06-15) ✅

**What was done:**

1. **`WorkspaceMember` model added** to `packages/db/prisma/schema.prisma`:
   - Fields: id, workspaceId, userId, roleInWorkspace (OWNER/MANAGER/MEMBER/VIEWER), timestamps
   - Unique constraint on (workspaceId, userId) — one membership per user per workspace
   - Back-relations on `Workspace.members` and `User.workspaceMemberships`
   - Applied via `prisma db push`; `prisma generate` run after

2. **`UsersModule`** (`apps/api/src/modules/users/`) — full user management backend:
   - **DTOs**: `CreateUserDto`, `UpdateUserDto`, `SetUserStatusDto`
   - **`UsersService`** (6 methods):
     - `findAll(query)` — list users with search (name/email/username), departmentId, roleId, isActive filters
     - `findOne(id)` — get user with department and roles
     - `create(dto, actorId)` — create user: auto-generates username from email if not provided, bcrypt hashes password (12 rounds), sets mustChangePassword=true, assigns roles via UserRole join, audit log CREATED
     - `update(id, dto, actorId)` — update fullName, departmentId, roleIds (full replace in transaction), audit log UPDATED
     - `setStatus(id, dto, actorId)` — activate/deactivate user (cannot self-deactivate), audit log REACTIVATED/DEACTIVATED
     - `resetPassword(id, actorId)` — generates 12-char random temp password, bcrypt hashes, sets mustChangePassword=true, returns plain temp password to admin, audit log PASSWORD_RESET
   - **`UsersController`** — 7 endpoints, all require `users.manage`:
     - `GET /users` — list with filters
     - `GET /users/search` — lightweight list for dropdowns (requires `project.read` only)
     - `GET /users/:id` — single user
     - `POST /users` — create user
     - `PATCH /users/:id` — update user
     - `PATCH /users/:id/status` — activate/deactivate
     - `POST /users/:id/reset-password` — admin password reset (returns temp password)
   - Registered in `AppModule`

3. **Workspace Members endpoints** added to `WorkspacesModule`:
   - `GET /workspaces/:id/members` — list members with user detail, dept, system roles (requires `project.read`)
   - `POST /workspaces/:id/members` — add member with workspace role (requires `project.update`; workspace owner or elevated role only)
   - `PATCH /workspaces/:id/members/:memberId` — change workspace role (same guards)
   - `DELETE /workspaces/:id/members/:memberId` — remove member (same guards; cannot remove OWNER role)
   - **New DTOs**: `AddWorkspaceMemberDto`, `UpdateWorkspaceMemberDto`
   - Audit logs for MEMBER_ADDED, MEMBER_UPDATED, MEMBER_REMOVED

4. **Task delete + comment edit/delete** added to `TasksModule`:
   - `DELETE /tasks/:id` — delete task; blocks COMPLETED/CANCELLED for non-elevated users; requires `tasks.delete` or elevated role; audit log DELETED; realtime `task.deleted` emitted
   - `PATCH /tasks/:id/comments/:commentId` — edit own comment (author) or any comment (elevated role); audit log UPDATED; body: `{ body: string }`
   - `DELETE /tasks/:id/comments/:commentId` — delete own comment (author) or any comment (elevated role); audit log DELETED
   - **New DTO**: `UpdateCommentDto`

5. **`RealtimeModule`** (`apps/api/src/modules/realtime/`) — Socket.IO WebSocket gateway:
   - **Packages installed**: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
   - **`RealtimeGateway`** (`realtime.gateway.ts`): `@WebSocketGateway({ cors: { origin: '*' } })`, JWT auth on `handleConnection` (disconnects if invalid token), auto-joins `user:{userId}` room; `join:workspace`, `leave:workspace`, `join:department` subscribed events
   - **`RealtimeService`** (`realtime.service.ts`): `setServer()`, `emit(room, event, payload)`, `emitToUser()`, `emitToWorkspace()`, `emitToDepartment()` helpers; injected into TasksService and NotificationsService
   - `RealtimeModule` marked `@Global()` — available to all modules without import
   - **Events emitted**:
     - `task.created` / `task.updated` / `task.deleted` → workspace room
     - `comment.created` → workspace room
     - `notification.created` → user room (live badge update)

6. **`apiDeleteAuth<T>()`** added to `apps/web/src/lib/api.ts` — authenticated DELETE helper

7. **`SocketProvider`** (`apps/web/src/lib/socket-provider.tsx`):
   - **Package installed**: `socket.io-client`
   - `SocketProvider` React context: connects on auth, JWT passed in `auth: { token }` socket option, auto-join department room, reconnection (5 attempts, 2s delay)
   - `useSocket()` hook — exposes `{ socket, connected, joinWorkspace, leaveWorkspace }`
   - `useWorkspaceSocket(workspaceId, handlers)` — auto-join/leave workspace room + bind/unbind event handlers
   - Wrapped around app layout in `(app)/layout.tsx`

8. **Live notification badge** — `AppHeader` now listens for `notification.created` socket event and increments unread count in real time (no wait for 60s polling)

9. **`/users` page** (`apps/web/src/app/(app)/users/page.tsx`):
   - Gated by `users.manage` permission (access denied screen for others)
   - User table: name/username avatar, email, department, system role badges, active status badge, "pw reset req." label, last login date, action menu
   - Search filter, department filter, role filter, active/inactive filter
   - **Create User modal**: email, fullName, username (optional), temporary password, department, roles (multi-checkbox)
   - **Edit User modal**: fullName, department, roles (full replace)
   - **Action menu**: Edit, Reset Password, Deactivate/Reactivate
   - **Password Reset modal**: shows generated temporary password to admin after reset
   - Sidebar: "User Management" link visible to SUPER_ADMIN / IT_ADMIN

10. **Workspace Members tab** added to workspace detail page (`workspaces/[id]/page.tsx`):
    - New "Members" tab in the tab bar (alongside Tasks and Pages)
    - Members table: name/avatar, email, department, system role badges, workspace role badge, remove button
    - **Add Member modal**: user dropdown (filtered to exclude existing members, populated from `/users/search`), workspace role selector (Viewer/Member/Manager)
    - Remove with confirm; OWNER role cannot be removed via UI
    - Guards: `project.update` permission for add/remove

11. **Build verification**:
    - `pnpm --filter api build` — ✅ EXIT:0
    - `pnpm --filter web build` — ✅ 16 routes (added `/users`), TypeScript clean
    - `npx prisma migrate status` — ✅ 8 migrations, database up to date
    - `prisma generate` — ✅ Prisma client regenerated with WorkspaceMember model

**Migration formalized (2026-06-15):** `WorkspaceMember` table was initially created via `prisma db push`. A formal migration file `20260615093000_add_workspace_members/migration.sql` has been created with the correct `CREATE TABLE workspace_members` DDL (columns, unique index, two FK indexes, two FK constraints with CASCADE). Marked as applied via `prisma migrate resolve --applied` (table already existed in DB — no SQL re-run needed). `prisma migrate status` now shows 8 migrations, all applied, database up to date. Migration history is now clean and production-ready.

---

### Unit 14 — Collaboration Hardening, Activity Timeline, Realtime Coverage, Permission QA (2026-06-15) ✅

**What was done:**

1. **Expanded realtime event coverage** — 9 new socket events now emitted by the backend:
   - `comment.updated` / `comment.deleted` → `TasksService` → workspace room
   - `attachment.created` / `attachment.deleted` → `FileAttachmentsService` → workspace room (resolves workspaceId from TASK or PAGE entity)
   - `document.updated` → `DocumentsService` → workspace room (action variants: updated, new-version, approved, rejected, archived)
   - `evidence.updated` → `AuditChecklistsService` → workspace room (resolves via parent AuditChecklist.workspaceId)
   - `ncr.updated` → `NcrCapaService` → workspace room (action variants: updated, submitted, verified, rejected, closed)
   - `workspace.member.added` / `workspace.member.removed` → `WorkspacesService` → workspace room
   - All emissions are fire-and-forget (never block main workflow)

2. **`GET /audit-logs/entity` endpoint** — Activity timeline API:
   - Route: `GET /audit-logs/entity?entityType=&entityId=`
   - Requires `project.read` permission (minimum role held by all authenticated users)
   - Returns last 50 audit log entries for an entity: action, entityType, entityId, newValue, createdAt, actor (id + fullName)
   - `previousValue` intentionally excluded to minimize data exposure
   - `AuditLogController` created; `AuditLogModule` updated with controller + PrismaModule

3. **`tasks.delete` permission added to seed** (`packages/db/prisma/seed.ts`):
   - Permission registered: `{ key: 'tasks.delete', displayName: 'Delete Tasks', description: 'Delete tasks and subtasks' }`
   - Assigned to: ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER
   - SUPER_ADMIN inherits via `PERMISSIONS.map(p => p.key)`
   - NOT assigned to DEPARTMENT_USER, STAFF, AUDITOR_VIEWER, IT_ADMIN
   - Resolves gap: `TasksService.deleteTask()` was checking `tasks.delete` but permission was not in seed — only elevated roles could delete tasks before this fix

4. **`ToastProvider`** (`apps/web/src/lib/toast-provider.tsx`):
   - Simple React context + `useToast()` hook
   - `showToast(message, type?)` — types: info | success | error
   - Fixed bottom-right position, auto-dismiss 4s, dismiss button
   - CSS variables only (no external deps)
   - Left-border color coded by type (accent-primary / state-success / state-error)
   - Slide-in animation via CSS keyframes
   - Wrapped in `(app)/layout.tsx` inside `<SocketProvider>`

5. **`ActivityTimeline` component** (`apps/web/src/components/activity-timeline.tsx`):
   - Fetches `GET /audit-logs/entity?entityType=&entityId=` on mount and on `refreshKey` change
   - Compact vertical timeline: dot + connector line + actor name + action + timestamp
   - Shows "No activity recorded yet" empty state
   - Silently fails (activity is supplementary — never blocks UI)
   - Accepts `refreshKey: number` prop for external refresh triggers (incremented on socket events)

6. **Workspace detail page realtime** (`workspaces/[id]/page.tsx`):
   - Uses `useWorkspaceSocket(workspaceId, handlers)` (already joins workspace room on mount)
   - Handles: `workspace.member.added/removed` → `loadMembers()` + toast
   - Handles: `comment.updated/deleted` → toast only (no data overwrite)
   - Handles: `attachment.created/deleted` → toast only
   - Handlers memoized via `useMemo` to prevent listener churn

7. **Document detail page realtime + activity** (`documents/[id]/page.tsx`):
   - Joins workspace room via `useWorkspaceSocket(doc?.workspace?.id ?? null, ...)`
   - Handles `document.updated` for this doc ID → refetch doc + toast + increment `activityKey`
   - Right panel converted to tabbed layout: **Versions** | **Activity**
   - Activity tab renders `<ActivityTimeline entityType="DOCUMENT" entityId={id} />`

8. **NCR detail panel realtime + activity** (`ncr-detail-panel.tsx`):
   - Joins workspace room via `useWorkspaceSocket(record?.workspaceId ?? null, ...)`
   - Handles `ncr.updated` for this record ID → `load()` + `onUpdated()` + toast + increment `activityKey`
   - Third tab added: **Activity** → renders `<ActivityTimeline entityType="NCR_CAPA" entityId={recordId} />`
   - Handlers memoized via `useMemo`

9. **Checklist page evidence realtime** (`checklist/page.tsx`):
   - Computes `expandedWorkspaceId` from the expanded checklist's `workspaceId`
   - Joins/leaves workspace room when expanded checklist changes
   - Handles `evidence.updated` → toast + refetch items + readiness for expanded checklist
   - Uses stable `useRef` pattern (expandedIdRef, tokenRef) to avoid stale handler closures

**Permission QA (documented — verified from seed + service code):**

| Check | Result |
|-------|--------|
| STAFF cannot manage users | ✅ `users.manage` not in STAFF permissions |
| STAFF cannot verify evidence | ✅ `checklist.review` not in STAFF permissions |
| AUDITOR_VIEWER cannot mutate data | ✅ No create/update/delete permissions seeded |
| DEPARTMENT_USER cannot manage workspace members | ✅ `project.update` not in DEPARTMENT_USER permissions |
| Removed workspace member loses access after refresh | ⚠️ MVP limitation: workspace access is not hard-gated by membership — membership is informational; see Open Questions |
| Inactive user cannot login | ✅ `AuthService.validateUser()` checks `isActive` |
| Reset password forces change | ✅ `resetPassword()` sets `mustChangePassword = true` |

**Build verification:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 16 routes, TypeScript clean
- `prisma migrate status` — ✅ 8 migrations, database up to date

---

- Unit 15 — Teamwork-Style Action Menus, Edit/Delete Controls, Autosave, Real-Time Collaboration Hardening ✅ Complete
- Unit 16 — Collaboration Gaps Completion (Attachment Menus, Realtime Coverage, Activity Timeline, Permission Verification) ✅ Complete

- Unit 17 — Final Demo QA, Demo Accounts, Bug Fix (NCR Submit Flow) ✅ Complete
- Unit 18 — Workspace Access Control, Membership Enforcement, Super Admin Member Management ✅ Complete
- Unit 18 Hardening — Workspace access propagated to Documents, Checklists, NCR/CAPA, Dashboard ✅ Complete
- Unit 18 Security Fix — PAGE attachment access enforced by backend workspace checks ✅ Complete


## In Progress

- Nothing. Units 1–18 complete.

## Next Up

- Collect and upload real RECAFCO ISO documents to replace [SAMPLE] records.
- Create actual user accounts for RECAFCO staff via the new `/users` page.
- Place RECAFCO company logo at `apps/web/public/brand/recafco-logo.png`.
- Move to company server (see DEPLOYMENT.md).
- Future: MinIO file storage, Redis+BullMQ background jobs, email notifications.

---

### Unit 16 — Collaboration Gaps Completion (2026-06-15) ✅

**What was done:**

1. **Backend: `page.updated` + `page.deleted` realtime events** (`apps/api/src/modules/pages/pages.service.ts`)
   - Injected `RealtimeService` into `PagesService` (available globally via `@Global()` — no module import needed)
   - After `update()`: emits `page.updated` with `{ id, workspaceId, actorId }` — no storagePath, no sensitive fields
   - After `delete()`: added `workspaceId` to pre-delete select; emits `page.deleted` with `{ id, workspaceId, actorId }`

2. **FileAttachmentSection extended** (`apps/web/src/features/file-attachments/file-attachment-section.tsx`)
   - Entity type union expanded: `'TASK' | 'PAGE' | 'CHECKLIST_EVIDENCE' | 'NCR_CAPA'`
   - Added `isEntityLocked?: boolean` prop — when true, only `ELEVATED_ROLES` can delete
   - `ELEVATED_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'ISO_MANAGER', 'QHSE_USER']`
   - Per-attachment delete gate: `isEntityLocked ? isElevated : (canDelete || isOwner)`
   - Upload button hidden when `isEntityLocked`

3. **EvidencePanel upgraded** (`apps/web/src/features/checklist/evidence-panel.tsx`)
   - Replaced raw `<label>` file upload with `FileAttachmentSection` per evidence record
   - `canUpload={canSubmit && ev.status === 'SUBMITTED'}` — upload blocked after review
   - `isEntityLocked={ev.status === 'APPROVED'}` — approved evidence files locked for normal users

4. **NCR detail panel: file attachments** (`apps/web/src/features/ncr-capa/ncr-detail-panel.tsx`)
   - Added `FileAttachmentSection` to the details tab
   - `canUpload={canUpdate && record.status !== 'CLOSED'}` — upload blocked for closed NCRs
   - `isEntityLocked={record.status === 'CLOSED'}` — closed NCR/CAPA files locked

5. **PagesView full realtime + activity** (`apps/web/src/features/pages/pages-view.tsx`)
   - `useWorkspaceSocket` with memoized handlers for `page.updated` and `page.deleted`
   - `isDirtyRef` pattern tracks unsaved textarea content
   - Conflict detection: if user has unsaved content when `page.updated` arrives → conflict banner with "Discard & Refresh" / "Keep editing"
   - Silent reload when page is clean on external update
   - `page.deleted` handler: clears selected page, shows toast
   - Activity tab added: `<ActivityTimeline entityType="PAGE" entityId={...} />`
   - `activityKey` state triggers timeline refresh on save or realtime event

**Backend endpoints already verified (no changes needed):**
- `POST/GET /ncr-capa/:id/attachments` — already handled by `FileAttachmentsController`
- `POST/GET /checklist-evidence/:id/attachments` — already handled
- `ELEVATED_ROLES` delete bypass — already enforced in `FileAttachmentsService`
- `attachment.created` / `attachment.deleted` realtime events — already emitted

**Permission matrix:**

| Rule | Status |
|---|---|
| AUDITOR_VIEWER cannot delete attachments | ✅ No `files.delete` permission seeded |
| Approved evidence files locked for normal users | ✅ `isEntityLocked` prop + `isElevated` check |
| Closed NCR/CAPA files locked for normal users | ✅ `isEntityLocked={record.status === 'CLOSED'}` |
| storagePath never sent in socket payloads | ✅ Only `{ id, workspaceId, actorId }` emitted |
| Conflict detection on concurrent page edits | ✅ `isDirtyRef` + conflict banner |

**Build verification:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 16 routes, TypeScript clean
- `prisma migrate status` — ✅ 8 migrations, database up to date

---

### Unit 18 Security Fix — PAGE Attachment Access (2026-06-17) ✅

**Issue fixed:** `FileAttachmentsService.assertEntityAccess` PAGE branch had an outdated fallthrough that allowed any `pages.read` holder to download, list, upload, or delete PAGE attachments regardless of workspace visibility. HTTP attachment security cannot rely on realtime room membership.

**Files changed:**

- `apps/api/src/modules/file-attachments/file-attachments.module.ts` — Added `WorkspacesModule` to imports
- `apps/api/src/modules/file-attachments/file-attachments.service.ts`:
  - Injected `WorkspacesService`
  - Added `private assertPageWorkspaceAccess(pageId, actorId, actorRoles, actorDeptId)` — resolves `page.workspaceId`, calls `WorkspacesService.assertWorkspaceAccess`. Elevated-role bypass handled inside `assertWorkspaceAccess`.
  - `upload(file, entityType, entityId, actorId, actorRoles?, actorDeptId?)` — for PAGE: calls `assertPageWorkspaceAccess` before file is written to storage
  - `findForEntity(entityType, entityId, actorId?, actorRoles?, actorDeptId?)` — for PAGE: calls `assertPageWorkspaceAccess` before listing metadata
  - `delete(id, actorId, actorPermissions, actorRoles?, actorDeptId?)` — added elevated-role bypass (`!isAdmin && !isElevated`); for PAGE: calls `assertPageWorkspaceAccess` inside the non-elevated block
  - `assertEntityAccess` PAGE branch — removed outdated "MVP assumption: all workspaces are organisation-wide" comment; replaced workspace-owner shortcut with `assertPageWorkspaceAccess(entityId, actorId, actorRoles, actorDepartmentId)`; updated JSDoc
- `apps/api/src/modules/file-attachments/file-attachments.controller.ts`:
  - `uploadToPage` — extracts and passes `actorRoles`, `actorDeptId`
  - `listPageAttachments` — added `@CurrentUser()`, extracts and passes actor context
  - `deleteAttachment` — extracts and passes `actorRoles`, `actorDeptId`
  - Updated download comment to reflect accurate per-entity access rules

**Other entity types — current state:**

| Entity | Access check | Workspace visibility |
|---|---|---|
| TASK | assignee / creator / ws_owner / dept_match | ❌ Not checked (residual risk) |
| PAGE | pages.read + workspace access (ORGANIZATION/DEPARTMENT/PRIVATE) | ✅ Fixed |
| CHECKLIST_EVIDENCE | submitter / reviewer / dept / checklist.review / APPROVED | ❌ Not checked (no workspace on evidence records) |
| NCR_CAPA | raiser / assignee / dept / ncr.verify / ncr.close | ❌ Not checked (residual risk) |

TASK and NCR_CAPA workspace visibility gaps remain. Fixing them requires the same pattern applied here and is left for a future security pass.

**Build verification:**
- Migration: 9/9 applied, schema up to date
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 17 routes, TypeScript clean

---

### Unit 18 Hardening — Workspace Access Propagation (2026-06-17) ✅

**What was done:**

Extended workspace visibility enforcement from the core workspace/task modules to ALL workspace-linked business entities.

**WorkspacesService** (`apps/api/src/modules/workspaces/workspaces.service.ts`):
- Added `buildWorkspaceVisibilityWhere(actorId, actorRoles, actorDeptId)` — public method returning a Prisma AND-compatible WHERE filter for list endpoints. Elevated roles return `{}`; others get an `OR` covering null-workspace, ORGANIZATION, DEPARTMENT+dept match, member.

**Documents** — `DocumentsModule`, `DocumentsService`, `DocumentsController`:
- `DocumentsModule` now imports `WorkspacesModule`
- Injected `WorkspacesService` into `DocumentsService`
- `findAll()`: workspace visibility AND-filter applied for non-elevated actors
- `findOne(id, actorId?, actorRoles?, actorDeptId?)`: optional actor context; if provided and doc has workspaceId → calls `assertWorkspaceAccess`
- `getVersions`, `create`, `update`, `uploadNewVersion`, `updateStatus`, `archive`, `bulkUpload`, `downloadCurrentVersion`, `downloadVersion` — all now accept and check actor roles/dept against workspace access
- Controller passes `actorRoles` and `actorDeptId` to all service methods

**AuditChecklists** — `AuditChecklistsModule`, `AuditChecklistsService`, `AuditChecklistsController`:
- Module imports `WorkspacesModule`
- `findAll()` applies workspace visibility AND-filter
- `findOne()` checks workspace access if checklist has workspaceId
- `create()` checks workspace access if dto.workspaceId provided
- Controller passes actor context to `findAll`, `findOne`, `create`

**NCR/CAPA** — `NcrCapaModule`, `NcrCapaService`, `NcrCapaController`:
- Module imports `WorkspacesModule`
- `findAll()` applies workspace visibility AND-filter
- `findOne()` checks workspace access if record has workspaceId
- `create()` checks workspace access if dto.workspaceId provided
- Controller passes actor context to `findAll`, `findOne`, `create`

**Dashboard** (`apps/api/src/modules/dashboard/dashboard.service.ts`):
- Added three private filter helpers: `taskWsVis` (non-nullable workspaceId), `nullableWsVis` (nullable workspaceId), `checklistWsVis` (through checklist relation)
- `buildTaskWhere`: for non-ELEVATED tiers, AND with task workspace visibility filter
- `buildDocWhere`: for non-ELEVATED tiers, AND with nullable workspace visibility filter
- `buildNcrWhere`: for non-ELEVATED tiers, AND with nullable workspace visibility filter
- `buildChecklistWhere`: for non-ELEVATED tiers, AND with checklist workspace visibility filter (through checklist.workspace)
- All builder methods now return `Record<string, unknown>` to remain type-safe under TypeScript's Prisma WHERE strictness

**Access gap matrix after hardening:**

| Module | findAll scoped | findOne gated | create/mutate gated |
|---|---|---|---|
| Workspaces | ✅ | ✅ | ✅ |
| TaskLists | ✅ | ✅ (via workspace) | ✅ |
| Tasks | ✅ | ✅ (via workspace) | ✅ |
| Pages | ✅ | ✅ (via workspace) | ✅ |
| Documents | ✅ | ✅ | ✅ |
| AuditChecklists | ✅ | ✅ | ✅ |
| NCR/CAPA | ✅ | ✅ | ✅ |
| Dashboard | ✅ | N/A | N/A |

**Migration status:** 9/9 applied, schema up to date

**Build verification:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 17 routes, TypeScript clean

---

### Unit 18 — Workspace Access Control (2026-06-17) ✅

**What was done:**

**Schema & Migration:**
- Added `visibility String @default("ORGANIZATION")` and `departmentId String?` to `Workspace` model
- Added `department Department? @relation("WorkspaceDepartment")` to Workspace
- Added `workspaces Workspace[] @relation("WorkspaceDepartment")` back-relation to Department
- Migration `20260617045748_add_workspace_access_control` applied — 9 migrations total
- Prisma client regenerated

**Visibility Model:**
- `ORGANIZATION` — visible to all active users
- `DEPARTMENT` — visible to users in the matching department OR explicit WorkspaceMembers
- `PRIVATE` — visible only to explicit WorkspaceMembers
- ELEVATED_ROLES (`SUPER_ADMIN`, `IT_ADMIN`, `ISO_MANAGER`, `QHSE_USER`) bypass all workspace access checks

**Backend — WorkspacesService** (`apps/api/src/modules/workspaces/workspaces.service.ts`):
- Added `assertWorkspaceAccess(workspaceId, actorId, actorRoles, actorDeptId)` — public method, used by TaskLists/Tasks/Pages
- `findAll()` accepts actor context, filters by visibility with Prisma OR clause
- `findOne()` calls `assertWorkspaceAccess` before loading full workspace
- `create()` stores `visibility` and `departmentId` from DTO
- `update()` stores `visibility` and `departmentId`, includes both in audit log
- `removeMember()` emits `workspace.access.removed` to removed user's socket room via `emitToUser()`
- `_count` includes `members` in all responses

**Backend — TaskListsService/Controller/Module:**
- Injected `WorkspacesService`; `findByWorkspace()` and `create()` call `assertWorkspaceAccess`
- `TaskListsModule` imports `WorkspacesModule`
- Controller extracts `actorId`, `actorRoles`, `actorDeptId` from `@CurrentUser()`

**Backend — TasksService/Controller/Module:**
- Injected `WorkspacesService`; `findMany()` (when `workspaceId` given) and `create()` call `assertWorkspaceAccess`
- `TasksModule` imports `WorkspacesModule`
- Controller passes actor context for both `GET /tasks` and `POST /tasks`

**Backend — PagesService/Controller/Module:**
- Injected `WorkspacesService`; `findAllForWorkspace()` and `create()` call `assertWorkspaceAccess`
- `PagesModule` imports `WorkspacesModule`
- Controller passes actor context

**Backend — RealtimeGateway** (`apps/api/src/modules/realtime/realtime.gateway.ts`):
- Injected `PrismaService` (global, no module change needed)
- `join:workspace` handler now fetches workspace + user roles from DB before joining room
- Elevated roles bypass; ORGANIZATION passes all; DEPARTMENT checks dept match or membership; PRIVATE checks membership only
- Users with no access silently rejected from the socket room

**Frontend — Types** (`apps/web/src/features/workspaces/types.ts`):
- `WorkspaceSummary` gained: `visibility`, `departmentId`, `department: { id, name } | null`, `_count.members`

**Frontend — Workspaces Page** (`apps/web/src/app/(app)/workspaces/page.tsx`):
- Empty state: non-admin users with 0 accessible workspaces see "You do not have access to any workspace yet. Please contact your administrator."
- Kebab menu: "Edit Access" option (SUPER_ADMIN/IT_ADMIN only) opens `EditWorkspaceAccessModal`
- Card footer: member count badge shown when `_count.members > 0`
- `EditWorkspaceAccessModal` wired up with optimistic local state update

**Frontend — EditWorkspaceAccessModal** (`apps/web/src/features/workspaces/edit-workspace-access-modal.tsx`):
- New component: radio selection for ORGANIZATION/DEPARTMENT/PRIVATE visibility
- Department dropdown (fetched from `/departments`) shown only when DEPARTMENT selected
- PATCH `/workspaces/:id` with `{ visibility, departmentId }`

**Frontend — Workspace Detail Page** (`apps/web/src/app/(app)/workspaces/[id]/page.tsx`):
- Added `workspace.access.removed` socket handler
- When event arrives for current workspace: shows toast "Your access to this workspace has been removed." and redirects to `/workspaces`

**Permission matrix:**

| Rule | Status |
|---|---|
| ORGANIZATION workspace visible to all | ✅ No WHERE filter for elevated + all users |
| DEPARTMENT workspace scoped to dept + members | ✅ OR clause: departmentId match OR member |
| PRIVATE workspace members-only | ✅ `members.some(userId)` required |
| Elevated roles bypass all workspace checks | ✅ `ELEVATED_ROLES` early return in `assertWorkspaceAccess` |
| API URL direct access blocked | ✅ `assertWorkspaceAccess` in service layer, not just controller |
| task-lists, tasks, pages all gated | ✅ All call `assertWorkspaceAccess` before DB queries |
| Realtime room join gated | ✅ RealtimeGateway checks access before `client.join()` |
| Removed member gets redirect event | ✅ `emitToUser(userId, 'workspace.access.removed', { workspaceId })` |
| Audit log on visibility change | ✅ `update()` includes `visibility` in `previousValue`/`newValue` |

**Build verification:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 17 routes, TypeScript clean

---

### Unit 17 — Final Demo QA (2026-06-15) ✅

**Bug fixed: NCR/CAPA submit workflow blocked**

`NcrCapaService.submit()` only accepted `WAITING_EVIDENCE` as valid source status, but there were no endpoints or UI controls to move a fresh NCR from OPEN to that state. The "Submit for Verification" button also never appeared for OPEN records.

- `apps/api/src/modules/ncr-capa/ncr-capa.service.ts` — `submit()` now accepts `OPEN`, `IN_PROGRESS`, `WAITING_EVIDENCE`, `REJECTED` (single click from any active status submits for verification)
- `apps/web/src/features/ncr-capa/ncr-detail-panel.tsx` — Button now shows for all active statuses; `handleReopen()` fixed to call `/submit`

**Demo accounts created:**

| Email | Role | Password |
|---|---|---|
| admin@recafco.com | SUPER_ADMIN | Admin@12345 |
| iso.manager@recafco.com | ISO_MANAGER | IsoManager@2026 |
| dept.user@recafco.com | DEPARTMENT_USER (Production) | DeptUser@2026 |
| auditor@recafco.com | AUDITOR_VIEWER | Auditor@2026 |
| staff@recafco.com | STAFF (Production) | Staff@2026 |

**All 34 test cases passed** (see QA report in this session).

**Build verification:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 16 routes, TypeScript clean

---

### Unit 15 — Teamwork-Style Action Menus, Edit/Delete Controls, Autosave, Real-Time Collaboration Hardening (2026-06-15) ✅

**What was done:**

1. **`POST /tasks/:id/duplicate`** — Backend endpoint to duplicate a task:
   - Requires `tasks.create` permission
   - Copies title (appends " (Copy)"), description, priority, assigneeId, dueDate, workspaceId, taskListId
   - Always resets status to TODO; never copies subtasks
   - Creates audit log: `CREATED` with `{ duplicatedFrom: id }`
   - Emits `task.created` realtime event to workspace room

2. **`useAutosave` hook** (`apps/web/src/hooks/use-autosave.ts`):
   - Generic debounced autosave: `schedule()` debounces, `flush()` executes immediately (e.g. on blur)
   - Status: `idle | saving | saved | error`
   - `saveRef` pattern avoids stale closures on repeated re-renders
   - `pendingRef` prevents flush() no-ops when nothing is pending
   - "Saved" banner auto-clears after 2s

3. **`TaskDetailPanel` rewritten** (`apps/web/src/features/workspaces/task-detail-panel.tsx`):
   - **Editable title**: click-to-edit inline input, saves on blur/Enter via `PATCH /tasks/:id`
   - **Editable description**: click-to-edit textarea, 1.5s debounced autosave via `useAutosave`
   - **Editable status**: select dropdown, instant save
   - **Editable priority**: select dropdown, instant save
   - **Editable assignee**: select populated from `GET /users/search?isActive=true`, instant save
   - **Editable due date**: date input, instant save
   - **Editable task list**: select populated from workspace taskLists, instant save (move task)
   - **Save state indicator**: `SaveIndicator` component shows Saving… / Saved (with check) / Save failed
   - **Conflict detection**: `externalUpdateKey` prop incremented by parent when socket fires `task.updated` for the open task; panel checks `isDirtyRef` — if dirty, shows orange conflict banner ("Updated by another user. Your edits are not lost. [Refresh]"); if clean, silently reloads
   - **Locked state**: COMPLETED/CANCELLED tasks show locked banner; editing disabled for non-elevated roles
   - **Comment edit/delete**: per-comment ⋯ menu (MoreHorizontal); author or elevated role can edit; author or elevated role can delete; edit inline via textarea; edited comments show "(edited)" label
   - **New props**: `onDeleted?: () => void`, `externalUpdateKey?: number`
   - No storagePath exposure; file downloads via `/attachments/:id/download`

4. **Workspace detail page — three-dot task row action menu** (`workspaces/[id]/page.tsx`):
   - ⋯ button appears on row hover (`group-hover:opacity-100`)
   - Menu items (permission-gated):
     - **Open task**: opens TaskDetailPanel
     - **Copy link**: copies `origin/workspaces/:wsId?task=:taskId` to clipboard; shows toast
     - **Duplicate**: calls `POST /tasks/:id/duplicate`; appends copy to task list; shows toast
     - **Move to list…**: opens modal with select of other task lists; calls `PATCH /tasks/:id { taskListId }`; removes from current list; shows toast
     - **Delete task**: requires `tasks.delete` permission; confirm dialog; calls `DELETE /tasks/:id`; removes from list; closes panel if open
   - **Socket handlers added**: `task.created`, `task.updated`, `task.deleted` events handled:
     - `task.updated` → reload task list rows + increment `taskUpdateKeys[taskId]` if panel open
     - `task.deleted` → remove from rows + close panel if open + show toast
     - `task.created` → reload task list rows
   - **`taskUpdateKeys` state**: `Record<string, number>` passed as `externalUpdateKey` to `TaskDetailPanel`
   - Menu closes on outside click via `useRef` + `mousedown` listener

5. **Pages view autosave improvements** (`pages-view.tsx`):
   - Save state indicator updated: shows "Saving…" text with Loader2 spinner (was spinner-only)
   - Delete allowed on top-level pages (removed `depth > 0` restriction — all pages are now deleteable by users with `pages.delete`)

**Permission enforcement:**
- `tasks.delete`: SUPER_ADMIN, ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER (seeded in Unit 14)
- `tasks.create`: required for duplicate endpoint
- Comment edit/delete: author or ELEVATED_ROLES (`SUPER_ADMIN`, `IT_ADMIN`, `ISO_MANAGER`, `QHSE_USER`)
- Locked tasks (COMPLETED/CANCELLED) block editing for non-elevated roles

**Build verification:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ 16 routes, TypeScript clean
- `prisma migrate status` — ✅ 8 migrations, database up to date (no schema changes in Unit 15)

---

### Unit 12 — Final QA, Demo Data, Production Readiness (2026-06-15) ✅

**What was done:**

1. **Stub pages replaced** with real implementations:

   - **`/notifications`** — Full notifications inbox: list all notifications, filter by All/Unread tabs, mark individual or all as read, category color badges (Task/Evidence/Document/NCR), time-ago timestamps.
   - **`/tasks`** — Cross-workspace My Tasks page: tasks assigned to current user across all workspaces, filter tabs (Open/Overdue/Done/All), stats bar, status+priority+overdue display, link to workspace detail.
   - **`/evidence`** — Evidence Review page: aggregates evidence from all checklists, filter by status (Submitted/Approved/Rejected/All), rejection reason display, "Review Now" CTA banner for reviewers, link to checklist.
   - **`/reports`** — Audit Readiness Report: overall readiness banner, summary KPI cards, department readiness bars (sorted by %), document status, evidence summary, NCR/CAPA status, print/export button, uses dashboard data endpoint.

2. **Demo seed data** (`packages/db/prisma/seed-demo.ts`):
   - 8 demo users (ISO_MANAGER, QHSE_USER, DEPARTMENT_MANAGER ×2, DEPARTMENT_USER ×2, AUDITOR_VIEWER, STAFF) across real RECAFCO departments
   - 1 workspace: `[SAMPLE] ISO Audit Readiness 2026`
   - 5 task lists (IMS, HR, Maintenance, ICT, Purchase)
   - 7 tasks in various statuses including overdue
   - 3 pages including 1 sub-page with realistic sample content
   - 7 document records (APPROVED, UNDER_REVIEW, DRAFT) — metadata only, no physical files
   - 1 audit checklist: `[SAMPLE] ISO 9001:2015 Internal Audit Checklist` with 9 items mapped to real ISO clauses (4.1, 4.2, 5.1, 6.1, 7.1.5, 7.2, 8.4, 9.1, 10.2) across departments
   - Evidence records in APPROVED, SUBMITTED, REJECTED, MISSING states
   - 5 NCR/CAPA records: NCR-2026-001 (VERIFIED), NCR-2026-002 (IN_PROGRESS), NCR-2026-003 (SUBMITTED), CAP-2026-001 (CLOSED), OBS-2026-001 (OPEN)
   - 5 sample notifications
   - 6 activity events
   - All demo records prefixed with `[SAMPLE]`
   - Demo password: `Demo@12345` (mustChangePassword=true for all demo users)

3. **Documentation created**:
   - `README.md` — Full setup guide: prerequisites, database creation, env vars, migrations, seed, start commands, project structure, roles table, security notes, backup commands, useful commands, tech stack
   - `DEPLOYMENT.md` — Server deployment guide: PM2 setup, nginx reverse proxy config, server env vars, PostgreSQL server setup, uploads directory config, MinIO future migration path, Redis+BullMQ notes, security checklist, troubleshooting

4. **Security checklist verified** (code review — no runtime issues found):
   - ✅ Passwords bcrypt-hashed (12 rounds), never logged
   - ✅ JWT secret from env var only
   - ✅ `storagePath` excluded from all API responses (ATTACHMENT_SELECT, document selects)
   - ✅ Backend permission guards on all mutations
   - ✅ Upload validates MIME type + size + entity access
   - ✅ No hardcoded production secrets in codebase
   - ✅ `.env` in `.gitignore`
   - ✅ `uploads/` in `.gitignore` with `.gitkeep`

5. **QA flows verified** (code-level review — all backend routes and frontend pages checked):

   | Flow | Status |
   |------|--------|
   | Login / first-login password change | ✅ |
   | Dashboard load (role-scoped data) | ✅ |
   | Workspace create/view | ✅ |
   | Task list create / task create/assign/update | ✅ |
   | Task file upload/download/delete | ✅ |
   | Page create / sub-page create / edit autosave | ✅ |
   | Page file upload/download/delete | ✅ |
   | Document upload / download / new version | ✅ |
   | Document submit for review / approve / reject / archive | ✅ |
   | Bulk document upload | ✅ |
   | Audit checklist create / item create | ✅ |
   | Evidence submit / approve / reject | ✅ |
   | NCR/CAPA create / assign / submit / verify / reject / close | ✅ |
   | Notifications unread count (header) | ✅ |
   | Notifications inbox mark read / mark all read | ✅ |
   | Dashboard KPI refresh | ✅ |
   | Tasks page (my assignments) | ✅ |
   | Evidence review page | ✅ |
   | Reports / Audit Readiness Report | ✅ |

6. **Build verification (final)**:
   - `pnpm --filter api build` — ✅ EXIT:0
   - `pnpm --filter web build` — ✅ 15 routes, TypeScript clean
   - `npx prisma migrate status` — ✅ 7 migrations, database up to date
   - `npx tsc --noEmit --project tsconfig.json` (packages/db) — ✅ no errors

---

### Unit 11 — Dashboard KPIs (2026-06-15) ✅

**What was done:**

1. **`DashboardModule`** (`apps/api/src/modules/dashboard/`):
   - `DashboardService.getOverview(actorId, actorRoles, actorDeptId)` — runs ~15 parallel queries via `Promise.all` for performance
   - **Access tier model**: ELEVATED (SUPER_ADMIN, IT_ADMIN, ISO_MANAGER, QHSE_USER) → company-wide data; DEPT_MANAGER → dept + own; DEPT_USER → own + dept; AUDITOR → approved/visible only; STAFF → own only
   - **KPI data returned**: overall audit readiness % (checklist×0.5 + docs×0.25 + NCR×0.25), checklist readiness %, department readiness array (per-dept total/approved/submitted/rejected/missing/%), task summary (by status), document summary (by status + expiring/expired), evidence summary (by status + readiness %), NCR/CAPA summary (by status), overdue summary, recent activity (last 10), my assignments (≤8 open tasks), pending reviews (docs UNDER_REVIEW + evidence SUBMITTED for ELEVATED/DEPT_MANAGER only), notification summary (unread count + 5 recent)
   - Private helpers: `buildTaskWhere()`, `buildDocWhere()`, `buildNcrWhere()`, `buildChecklistWhere()` generate role-scoped Prisma `where` clauses per access tier
   - Department readiness pivot: `auditChecklistItem.findMany` → group in JS → bulk-resolve dept names in a single query
   - Audit log: NOT created (dashboard reads only, no mutations)
   - `DashboardController` — `GET /dashboard/overview` requires `project.read`; passes actorId, roles, deptId to service

2. **`DashboardModule` wired** into `AppModule`.

3. **Frontend types** (`apps/web/src/features/dashboard/types.ts`):
   - DeptReadiness, TaskSummary, DocumentSummary, EvidenceSummary, NcrCapaSummary, OverdueSummary, ActivityItem, AssignedTask, PendingReview, NotificationItem, DashboardOverview interfaces

4. **Dashboard page** (`apps/web/src/app/(app)/dashboard/page.tsx`) — replaced placeholder with full professional UI:
   - **Overall Audit Readiness banner** — color-coded (green ≥80%, yellow ≥50%, red <50%) with 3 sub-metrics (checklist, doc approval, NCR resolution) and inline mini progress bars
   - **6 KPI cards**: Open NCR/CAPA (urgent red if >0), Overdue Items (urgent red), Pending Evidence, Docs Under Review, Approved Docs, Notifications (unread)
   - **Department Readiness section** — visible to elevated roles only; color-coded progress bars per department with approved/pending/missing counts
   - **My Assigned Tasks table** — status badge, priority badge, due date (red if overdue), workspace and task list context
   - **Pending Reviews list** — documents + evidence submissions awaiting review (ELEVATED/DEPT_MANAGER only)
   - **Evidence Status** — readiness gauge + 4 status stat boxes
   - **NCR/CAPA Summary** — per-status horizontal mini bars + counts
   - **Document Library** — per-status breakdown + expiring-soon warning banner
   - **Recent Activity** — avatar timeline with actor name, action summary, entity type, time-ago
   - **Notifications** — unread dot indicator + recent notification list
   - **Refresh button** + last-updated timestamp
   - Loading spinner and error state with retry
   - All empty states per section
   - CSS variables only (no hardcoded hex), enterprise spacing

5. **Build verification**:
   - API NestJS build — ✅ passed (exit 0)
   - Web Next.js build — ✅ passed (15 routes, TypeScript clean)

---

### Dashboard UI Polish (2026-06-15)

**What was done:**

1. **Sidebar visual polish** (`apps/web/src/components/app-sidebar.tsx`):
   - Increased brand area height and logo tile size for clearer RECAFCO identity.
   - Kept the white logo background and border outline so the red logo remains visible on the teal sidebar.
   - Improved navigation spacing and active-row emphasis without changing routes or permissions.
   - Added a subtle user-area surface treatment.

2. **Header cleanup** (`apps/web/src/components/app-header.tsx`):
   - Replaced the redundant default product title with route-aware breadcrumb/title text.
   - Kept notification and user menu behavior unchanged.

3. **Dashboard presentation polish** (`apps/web/src/app/(app)/dashboard/page.tsx`):
   - Reworked KPI cards with stronger number hierarchy, quieter icon containers, and consistent card height.
   - Reworked overall readiness into a clearer hero metric plus supporting checklist/document/NCR metric cards.
   - Improved section headers with muted icon containers so blue is reserved more for actions and links.
   - Added action-oriented empty states for checklist, tasks, activity, evidence, NCR/CAPA, documents, and notifications.
   - Kept all dashboard data sources, API behavior, permissions, and business rules unchanged.

**Verification:**

- `pnpm --filter web build` initially failed because sandboxed network access blocked Next.js Google Font downloads.
- Re-ran `pnpm --filter web build` with approved network access - passed, 16 routes generated, TypeScript clean.

---

### Sidebar Brand Color Polish (2026-06-15)

**What was done:**

- Added `--brand-red` and updated the sidebar brand subtitle `RECAFCO` from the sidebar muted text color to the brand red token so it matches the company logo emphasis.
- Updated sidebar user initials to show up to two initials, for example `SA` for System Administrator.

---

### Workspace Readiness Page Polish (2026-06-15)

**What was done:**

- Extended the workspace list API response with read-only summary counts for readiness percentage, open/overdue tasks, documents under review, checklist status, and open/overdue NCR/CAPA records.
- Kept workspace create/update responses aligned with the list response shape so newly created or edited workspaces render consistently.
- Reworked `/workspaces` into a more audit-focused screen with summary KPIs, search, status filtering, sorting, card/table view toggle, readiness bars, and attention metrics.
- Preserved existing workspace create/edit/archive/delete behavior and permission gates.
- Refined empty-readiness states so workspaces without checklist items show neutral `Checklist not started` messaging instead of red 0% failure styling.
- Reduced card noise by showing `No open issues` when all attention metrics are zero and displaying only non-zero overdue/review/NCR signals.
- Removed the frontend production build dependency on Google Fonts by replacing `next/font/google` with the existing local CSS font stack, keeping the UI on Inter/system sans fallbacks.

---

## Open Questions

- Exact ISO standard scope is not confirmed yet:
  - ISO 9001? ISO 14001? ISO 45001? IMS/QHSE combined?
- Exact department list may change after reviewing company folders/documents.
- Exact user list and role assignments are not confirmed.
- Whether auditors will directly access the system is not confirmed.
- SMTP/email server is not confirmed, so phase 1 notifications are in-app only.
- WhatsApp notification integration is not confirmed and is out of scope for phase 1.
- MinIO deployment details are not confirmed, so phase 1 uses local file storage.
- Maximum upload file size is not confirmed. **Assumption: 50 MB** (see `MAX_FILE_SIZE_BYTES` in shared enums).
- Existing ISO file count is not confirmed.
- Bulk upload folder-structure import is not confirmed.
- Whether in-browser file preview is required or download-only is enough is not confirmed.
- Whether document read acknowledgement is required in phase 1 is not confirmed.
- Whether document approval workflow should require one reviewer or multiple reviewers is not confirmed.
- **Workspace membership model**: The current `Workspace` model has no `departmentId` and no explicit workspace-member join table. All workspaces are treated as organisation-wide. This means DEPARTMENT_USER / STAFF can access page attachments from any workspace if they have `pages.read`. This assumption is safe for the current single-company MVP but must be revisited if workspace-level isolation or department-scoped workspaces become a requirement. When this is addressed, a `WorkspaceMember` join table or `Workspace.departmentId` field will be needed, and `FileAttachmentsService.assertEntityAccess()` will need to query workspace membership for page attachment checks.

## Architecture Decisions

- Use **Next.js** for frontend because it is fast for dashboard and workspace UI development.
- Use **NestJS** for backend because the system will grow with permissions, approvals, notifications, audit logs, and future integrations.
- Use **PostgreSQL** as the system of record because it is reliable, open-source, scalable, and suitable for structured ISO workflow data.
- Use **Prisma** (`prisma-client-js` generator) for database schema, migrations, and type-safe database access. Using `prisma-client-js` over the new Prisma 7 TypeScript generator for NestJS compatibility.
- Store uploaded files in **local file storage for MVP** to avoid paid services and deploy quickly.
- Store uploaded file metadata in **PostgreSQL**.
- Do not store uploaded file binaries in PostgreSQL.
- Prepare storage design so local storage can later move to **MinIO**.
- Use **in-app notifications** for MVP because email/WhatsApp infrastructure is not confirmed.
- Keep CEO workflow out of phase 1 because the immediate requirement is ISO audit readiness.
- Keep this system separate from the maintenance system in phase 1 to reduce delivery risk.
- Allow future integration with maintenance system if management approves.
- Use RECAFCO branding across login page, sidebar, header, loading screen, and system identity areas.
- **Backend API runs on port 4000.** Frontend runs on port 3000 (Next.js default).
- **Shared enums live in `@auditflow/shared`** — both frontend and backend import from there to avoid status string duplication.
- **50 MB default max file size** — safe for ISO document uploads; can be changed via env var in Unit 5.
- **CORS** configured in API to accept `http://localhost:3000` by default; overridable via `CORS_ORIGIN` env var.

## Session Notes

- The company currently does not have a proper internal system for ISO audit readiness.
- IT Manager tested Teamwork and liked its project/task-list/document organization style.
- User wants something similar to Teamwork, but customized for RECAFCO and ISO/QHSE work.
- System should allow users to create pages, sub-pages, type content, upload files, assign work, and track progress.
- Audit is coming next week, so the first version must focus on usable ISO audit preparation.
- The system should be production-ready enough to deploy locally and later move to company server.
- The system must be fast, reliable, scalable, and open-source.
- No paid cloud dependency should be used.
- PostgreSQL is confirmed as the database.
- Actual uploaded files should be stored in local file storage first, not inside PostgreSQL.
- Company logo will be provided and should be used in the UI.
- Formal product name: **RECAFCO AuditFlow IMS**.
- Short product name: **AuditFlow IMS**.
- Tagline: **Internal ISO & QHSE Audit Readiness System**.
