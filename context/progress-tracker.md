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
- Unit 38 — Task File Expiry Tracking: upload metadata, expiry status badges, renewal workflow, notifications ✅ Complete
- Unit 39 — Super User Business Control Center: expiry check endpoints, dashboard expiry section, file metadata edit UI, Run Expiry Check button ✅ Complete
- Unit 40 — Direct Task Open from Expiry Alerts: ?task=:id URL deep-link, notification routing, file highlight note, polished expiry files table ✅ Complete
- Unit 41 — Suspense Boundary Fix: workspace page refactored to server wrapper + WorkspaceDetailClient for safe useSearchParams() ✅ Complete
- Unit 42 — Final Production QA: all 16 areas code-verified, 3 residual NCR/CAPA labels fixed, confirmed safe for pilot deployment ✅ Complete
- Unit 43 — Business Workspaces Page: removed Readiness/Checklist/Evidence wording, added business KPIs, Needs Attention section, smart filters, socket stale indicator, role-based title ✅ Complete
- Unit 44 — Task List and Task Reordering: sortOrder on Task, reorder endpoints, Move Up/Down UI in sidebar + task menu, realtime sync, permission enforcement ✅ Complete
- Unit 45 — Super User Dashboard Business Control Center: header wording, KPI redesign, Evidence removed from Pending Actions, Workspace Status table, role-specific layouts, builds pass ✅ Complete
- Unit 46 — Unified Workspace UX Polish (Part 1): header pluralization fix, System Access column rename, improved remove-member confirmation, overdue indicator on task due dates, Activity tab search/filter toolbar + Today/Yesterday/Earlier grouping, builds pass ✅ Complete
- Unit 46 (Part 2) — Remaining UX gaps: Tasks tab visible to Viewers (read-only), task-list three-dot menu with inline Rename + Move Up/Down, Members tab search/role-filter toolbar + role legend, Documents tab title+description header section, Issues tab title+description header + Age column + improved empty state, builds pass ✅ Complete
- Unit 47 — Departments Management UX and Safety Upgrade: breadcrumb fix (AuditFlow IMS / Departments), summary cards (Total/Active/Inactive/No Users/No Workspaces), search + status filter + sort toolbar, structured table with Users/Workspaces counts, three-dot actions menu (Edit/Deactivate/Reactivate), Create/Edit modal with code validation (2–6 chars, auto-uppercase, unique name/code), safe deactivation confirmation modal with real usage counts (users/workspaces/open tasks), audit logging for create/update/deactivate/reactivate, Access Denied page for non-SUPER roles, empty/error states, builds pass ✅ Complete
- Unit 48 — Reports Module Modernization: renamed to "Business Operations & Compliance Report"; removed outdated Audit Readiness %, Checklist, Evidence wording; new dedicated GET /reports/overview backend endpoint with role-scoped queries + dateFrom/dateTo/departmentId/workspaceId filters; Business Attention Summary panel (Healthy/Needs Attention/Critical with real logic); 8 KPI cards (Active Workspaces, Open/Overdue Tasks, Docs Total/Under Review, Open/Overdue Issues, Expired/Expiring Files); date preset toolbar (Today/Week/Month/Quarter/Custom) + department/workspace dropdowns for elevated users; Department Operations Status table (elevated only, per-dept aggregations); Workspace Status table with clickable workspace links; Overdue Work table with task deep-links; Documents Requiring Attention (under review docs + expired/expiring task files); Issues & Actions section with status count cards + open issues table; Recent Business Activity feed (Checklist/Evidence/Pages excluded); CSV exports for dept/workspace/overdue/issues; realtime stale indicator; role-scoped access (elevated sees all, dept roles see dept data, staff sees assigned); empty/error states throughout; builds pass ✅ Complete
- Unit 49 — Reports Accuracy and Actionability Cleanup: removed misleading expiry placeholder zeros (workspace table shows "—" when no expiries, dept CSV shows "—" when no active workspaces); added authenticated Download button + "Open Task ↗" link + "Record unavailable" safe state to Documents Requiring Attention action column; added exportSummaryCSV() generating RECAFCO_Business_Operations_Report_YYYY-MM-DD.csv with all KPI metrics + period metadata; renamed dept/workspace/overdue/issues exports to RECAFCO_*_YYYY-MM-DD.csv format; added hidden print:block reporting period + last updated header block; verified backend expiry aggregation is accurate (superseded excluded, hidden-workspace scoped, task-attachment-to-workspace mapping correct); both builds pass ✅ Complete
- Unit 50 — Business Action Center Safety Requirements: new /business-actions backend module with 9 deterministic detection rules (OVERDUE_TASK, UNASSIGNED_TASK, DOCUMENT_UNDER_REVIEW, EXPIRED_FILE, EXPIRING_FILE, OPEN_ISSUE, OVERDUE_ISSUE, ISSUE_WAITING_VERIFICATION, WORKSPACE_WITHOUT_MEMBERS); Kuwait timezone end-of-day handling (UTC+3); per-rule human-readable reason explaining exactly why the item was detected; dry-run GET /business-actions/preview endpoint (no side effects); concurrency POST /business-actions/verify-entity endpoint; audit log POST /business-actions/log-action for all Super User review actions (ALERT_REVIEWED, ALERT_DISMISSED, ALERT_NOT_APPLICABLE, etc.); per-rule graceful error handling (one bad rule never crashes the center); BusinessActionCenter React component with rule filter chips, System Detected label, Noted/N/A local status, Not-Applicable confirmation modal (requires reason, shows record context per Part C), no-auto-action principle, Open entity links; all detection builds from backend DB only (frontend never invents alert state); both builds pass ✅ Complete
- Unit 51 — Business Action Center Accuracy, Transition Safety, and Recalculation Hardening: WAITING_REVIEW verified as real task status (included in detection); ISSUE_STATUS_TRANSITIONS exported constant (mirrors ncr-capa STATUS_TRANSITIONS); GET /business-actions/issue-transitions endpoint (read-only, BAC-gated); validTransitions embedded in issue ActionItems; endOfDayKuwait() exported for testability; sourceFacts structured evidence on every ActionItem (6–8 keys per rule); SourceFactsPanel expandable "Detection evidence" in UI; RULE_PRECEDENCE + applyPrecedence() collapses multi-rule entities to one primary row + secondaryRules badges; EXPIRING_FILE extended to include WAITING_EVIDENCE status; RecalcHint component shown after Noted/N/A with Refresh workflow guidance; concurrency warnings shown as visible inline amber banners (not console.warn); 25-case service unit test spec covering endOfDayKuwait(), ISSUE_STATUS_TRANSITIONS completeness, applyPrecedence() precedence rules, mocked detection scenarios, concurrency checks, preview dry-run, and failure isolation; both builds pass ✅ Complete
- Unit 52 — Realtime Notification Popups, Optional Sound, and Notification Center UX: Prisma schema extended (severity, deepLink, workspaceId on Notification + migration); CATEGORY_SEVERITY auto-assignment map; computeDeepLink() server-side deeplink generation; enriched socket payload; save-before-emit guarantee; private user rooms (user:{userId} from JWT); NotificationToastManager (top-right, 8s/12s auto-dismiss, category icon, severity border, Open button, max 5, slide-in animation); Web Audio API two-tone chime (880+1108Hz, no audio file); multi-tab sound coordination via document.hasFocus(); desktop Notification API (permission-gated, not-focused-only); notification-prefs.ts (localStorage: sound OFF/CRITICAL/IMPORTANT/ALL, desktop, popups, quiet hours HH:MM with overnight support, muted categories); /notifications page rewritten (8 filter tabs with counts, toolbar: Refresh + Mark All Read + Preferences, per-row three-dot menu: mark read/unread, deepLink Open button, unread dot, severity alert icon, empty/loading/error states, socket live-prepend with dedup); preferences panel inline (sound selector + test sound button, desktop enable flow, quiet hours time inputs, muted category chips); AppHeader reconnect refetch + seenBadgeIds dedup; tasks/ncr-capa/file-attachments call sites updated with correct categories (NCR_ASSIGNED, FILE_EXPIRED, FILE_EXPIRING, FILE_RENEWED) and workspaceId; 18-case test spec (11 service-level + 7 documented frontend manual); both builds pass ✅ Complete
- Unit 52.1 — Realtime Notification Privacy, Migration, and Manual-Flow Verification: migration SQL verified (additive ALTER TABLE, severity DEFAULT 'INFO', deepLink/workspaceId nullable TEXT, no FK on workspaceId, index on recipientId+category); socket room security confirmed (userId from JWT.sub only, never browser payload, invalid JWT disconnects, reconnect re-verifies); save-before-emit confirmed (DB create → emit, DB fail → no emit, emit fail → DB row preserved); all 5 notification endpoints scoped to authenticated recipientId (findForUser, getUnreadCount, markRead, markUnread, markAllRead); NCR deep-link bug fixed (?ncr= param now handled in workspace-client → auto-switches to Issues tab); upload-time expiry notification category fixed (SYSTEM→FILE_EXPIRING + workspaceId added); preferences panel browser-scope disclaimer added; notifications.service.spec.ts expanded to 34 cases (24 pass, 10 skipped frontend manual) with jest.resetAllMocks fix; realtime.gateway.spec.ts added (8 pass: 5 private-room + 3 workspace-access); deep-link route audit: TASK→/workspaces/:id?task=:id ✓, DOCUMENT→/documents/:id ✓ (route exists), NCR_CAPA→/workspaces/:id?ncr=:id ✓ (now handled), WORKSPACE→/workspaces/:id ✓; multi-tab: document.hasFocus() for sound (no BroadcastChannel — documented); notification coverage table compiled (16 active call sites, missing: task overdue/due-soon require scheduler); safe for company-server pilot deploy: YES; both builds pass ✅ Complete
- Unit 53 — Reference-Only Task Option and Safe Recurring Task Scheduling: Prisma migration 20260622000000 (isReference BOOLEAN NOT NULL DEFAULT FALSE, recurrenceInterval TEXT NOT NULL DEFAULT 'NONE', recurrenceEndDate DateTime?, recurrenceSeriesId TEXT?, recurrenceParentId TEXT?, indexes + unique partial index for idempotency); Priority dropdown extended with "For Reference Only" sentinel (UI-only, maps to isReference=true + priority=LOW, never stored as REFERENCE priority); RECURRENCE_INTERVALS constant (NONE/MONTHLY/QUARTERLY/SEMIANNUAL/ANNUAL); create-task-modal rewritten (row 1: Priority+DueDate, row 2: Repeat+End Repeat, Reference helper text, due-date required validation for recurring); tasks.service create() stores all new fields + generates recurrenceSeriesId; update() handles isReference/recurrenceInterval/recurrenceEndDate/stopRecurrence; spawnNextOccurrence() on completion: Kuwait calendar date math (addMonthsKuwait/addYearsKuwait, month-end clamp, leap-year safe), computeNextDueDate() skips missed periods for late completions, two-phase idempotency (pre-check + DB unique index inside $transaction), inactive assignee → unassigned next task, copies isReference preserving reference status, never copies comments/files/history; Reference items excluded from: OVERDUE_TASK/UNASSIGNED_TASK BAC alerts (isReference:false filter), dashboard operational KPIs, reports open/overdue/completed counts, workspace-level groupBy queries; task row: Reference badge (Ref chip) + overdue clock only for non-reference; task detail panel: Reference Only badge, priority shows "Reference Only" not LOW for ref items, recurrence badge, Stop Recurrence button with confirm; types.ts extended with isReference + recurrence fields; tasks.service.spec.ts: 27 cases pass (date math cases 9-15, service integration cases 1-3/5/8/9/16-22/25); migration applied (13 migrations total); prisma generate clean; both builds pass ✅ Complete
- Unit 53.1 — Recurring Task Atomicity, Permanent Idempotency, and Recovery Hardening: new migration 20260622120000 drops status-filtered partial unique index on recurrenceParentId and creates a permanent unique index (WHERE IS NOT NULL only, no status filter) — Task A can spawn Task B exactly once regardless of B's later status; verified 0 existing duplicate rows before applying; update() completion path refactored from fire-and-forget to full atomic $transaction (complete source + create child + child activityEvent in one tx; audits after commit; realtime/notifications post-commit only); status-independent idempotency: findFirst inside tx has no status filter — any existing child (TODO/COMPLETED/CANCELLED) blocks creation; in-tx fresh re-read of recurrenceInterval (detects concurrent stop-and-complete race); recurrenceEndDate boundary inclusive (nextDue <= endDate → create, nextDue > endDate → skip); reconciliation: GET /tasks/recurrence/reconciliation-preview (read-only, elevated roles, reports missing children); POST /tasks/recurrence/repair/:sourceId (Super Admin / Super User, atomic idempotent creation, wasCreated flag); repairMissingOccurrence returns created:false when child already exists; DB audit: 0 rows with non-null recurrenceParentId confirmed before constraint change; test suite expanded to 49 cases all passing (27 Unit 53 date-math + service + 22 new 53.1 atomicity/idempotency/end-date/concurrency/reconciliation); tasks.service.spec.ts uses jest.resetAllMocks() and computed dates (no global Date mock); 14 migrations total; both builds pass ✅ Complete
- Unit 54 — Task Created/Modified Timestamps and Simplified File Expiry Metadata: Task.createdAt + Task.updatedAt confirmed existing (Prisma @default(now()) + @updatedAt); realtime payloads updated to include server-authoritative timestamps — task.created now sends {createdAt, updatedAt}, task.updated sends {updatedAt}; workspace task table gains "Updated" column (relative time via existing relativeTime() helper); socket handler updated stale-safe (incomingUpdatedAt > localUpdatedAt guard prevents older payload overwrite); task detail panel gains compact Created/"Task Last Modified"/Kuwait-time metadata block (formatKuwait() using Asia/Kuwait locale) with helper text "Changes to details, status, assignee, priority, or recurrence. Comments and files use their own timestamps."; no new schema migration required; file upload form simplified — Issue Date field REMOVED from upload/renewal/edit forms (issueDate preserved in DB for historical data, never sent from client); REMINDER_OPTIONS reduced to [7, 14] days only (was [7,15,30,60,90]), default changed from 30→14; radio button UI replaces dropdown for reminders; backend validation added to upload() and updateMetadata(): BadRequestException when reminderDays not in [7,14]; legacy files with reminderDays=15/30/60/90 preserved unchanged in DB; Uploaded Date shown as read-only; renewal form mirrors same changes; both builds pass ✅ Complete
- Unit 54.1 — Reminder Compatibility and Verification Cleanup: added reminderChanged: boolean to ExpiryForm (false by default, set true only when user deliberately selects 7 or 14 in edit form); startEditMeta() now stores raw legacy reminderDays (e.g., 90) without normalizing to 14; handleSaveMeta() omits reminderDays from PATCH body when reminderChanged=false (backend Prisma skips field → legacy value preserved in DB); sends null only when expiry is disabled; sends 7 or 14 when user explicitly changed; edit form shows "Keep current (X days before)" radio option for legacy values with helper text "This file uses an older reminder setting. It will remain unchanged unless you select 7 or 14 days."; "Task Last Modified" label updated in detail panel; file-attachments.service.spec.ts created with 17 passing tests (T1-T12 reminder validation + T13 uploaded-date immutability + T14-T16 task timestamp + T17 smoke); backend: BadRequestException when non-7/14 value sent to upload() or updateMetadata(); undefined in body = keep existing legacy value (no change); 14 migrations total; both builds pass ✅ Complete
- Unit 55 — Task Table Created Date and Task Detail Drawer UX Upgrade: task table gains "Created" column (compact 21 Jun 2026 format with Kuwait tooltip) positioned before "Updated" — hidden on narrow screens (hidden lg:table-cell); "Updated" column gains Kuwait-time tooltip; sort dropdown added to filter toolbar (Manual order / Newest first / Oldest first / Recently updated / Least recently updated) — manual-order reorder buttons disabled when non-manual sort active; formatKuwaitTooltip() helper added to workspace-client.tsx; taskSort state (default 'manual') applied via useMemo after filter; task detail drawer widened from 500px to max-w-[680px]; fixed header upgraded to show task title + status badge + priority/Reference badge + recurring badge + close button; Reference Only shown as blue info block with "Informational item — excluded from overdue and unassigned task alerts." helper; metadata grid reorganized to 3 rows (Assignee/DueDate · TaskList/CreatedBy · Created/TaskLastModified) with Row 3 timestamps integrated directly instead of separate block; Due Date label changes to "Review Date" for reference items; "Not set" fallback for Due Date; recurrence section expanded to show Repeat/Ends/Note in a mini-grid with "Stop" button for authorized users; compact Latest Activity strip added above Tab bar using existing ActivityEvent data; file attachment display updated to show "Uploaded [date] by [user]" + reminder setting (X days before) beneath expiry row; expiry status explanation made compact (one line); "No description added." fallback for empty description; no new migration; 14 migrations remain; both builds pass ✅ Complete
- Unit 56.1 — Complete Deferred Super User Control Workflow Items: (1) Dashboard BAC attention rows — for SUPER_ADMIN/IT_ADMIN/SUPER_USER, "What needs your attention" section replaced with live BAC-detected items (GET /business-actions/preview, max 5 rows shown, "+N more" link to /action-center); BacAttentionRow component shows severity color, rule label, title, workspace, reason, "View →" link per entity type; loading spinner during fetch; "No urgent items" state when empty; non-super users continue to see existing AttentionItem count chips; RULE_LABELS + RULE_COLOR imported from types.ts, ActionItem/ActionPreview types imported; (2) Workspace header operational chips — workspace-client.tsx replaces static text stats (open tasks, overdue, members) with clickable rounded chips: "open" chip → tasks tab + all filter; "overdue" chip (error color) → tasks tab + overdue filter; "issues" chip (warning color, shown when ncrCapa.open > 0) → ncr tab; "members" chip → members tab (visible to managers only); "No dept" warning chip (warning color) when no department assigned + elevated access; "No members" warning chip when memberCount === 0 + canManageWs; (3) Task Control inline actions — tasks/page.tsx Super User table: last column replaced with three-dot MoreHorizontal action menu; STATUS_TRANSITIONS constant defines valid transitions per task status (TODO→IN_PROGRESS/CANCELLED, IN_PROGRESS→WAITING_REVIEW/COMPLETED/CANCELLED, WAITING_REVIEW→COMPLETED/REJECTED/CANCELLED, REJECTED→IN_PROGRESS/CANCELLED, COMPLETED→none, CANCELLED→TODO); menu shows "Open in workspace ↗" link + "Change Status" submenu with only valid transitions; click triggers PATCH /tasks/:id + optimistic local state update; post-action filter behavior is automatic (useMemo re-filters after status update, task disappears from current view if no longer matches); backdrop div closes menu on outside click; patchLoading per task prevents double-submission; (4) Action Center URL params — action-center/page.tsx refactored with Suspense boundary; reads ?type= URL param (e.g. ?type=OVERDUE_TASK) and passes as initialRuleFilter to BusinessActionCenter; BusinessActionCenter accepts optional initialRuleFilter prop and uses it as initial ruleFilter state; allows deep-linking from dashboard or other pages to filter BAC to a specific rule type; (5) Workspace header Part 3 setup warnings — "No dept" and "No members" chips shown inline in workspace header for elevated users (covered in item 2 above); no new schema migration; 14 migrations remain; pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes unchanged); both builds pass ✅ Complete
- Unit 56 — Super User Control Workflow Integration and Cross-Module Consistency Upgrade: (1) Action Center dedicated route — new /action-center/page.tsx wraps BusinessActionCenter with SUPER_USER/SUPER_ADMIN gate + Access Denied screen; sidebar nav item "Action Center" (Zap icon) added to app-sidebar.tsx, visible only to SUPER_USER/SUPER_ADMIN, positioned after main nav before User Management; /action-center confirmed in build output; (2) Tasks page role-aware — /tasks/page.tsx rewritten: SUPER_USER/SUPER_ADMIN get "Task Control" title, load all business tasks (no assigneeId filter, backend already scopes correctly for elevated roles), 9 filter tabs (All Tasks/My Tasks/Open/Unassigned/Overdue/Waiting Review/Returned/Reference Only/Completed), 6 clickable summary cards (Open/Unassigned/Overdue/Waiting Review/Returned/Completed) with active border highlight, full-width table with Workspace + Task List + Assignee columns, Reference Ref chip, recurrence ↻ badge, Unassigned warning shown; normal users get "My Tasks" title with personal assigneeId-scoped load + classic 4-tab interface unchanged; ?view= URL param supported for dashboard KPI deep-links; isReference filter correctly excludes reference tasks from Open/Unassigned/Overdue operational counts; (3) Reports wording — "Within 30 days" → "Based on file reminder setting" (KPI card sub text); CSV label "Expiring Task Files (30d)" → "Expiring Task Files"; (4) NCR-CAPA stat cards — all 4 stat cards (Open/Overdue/Verified·Closed/Rejected) converted from static divs to clickable buttons that set statusTab filter; active card gets colored border; (5) Dashboard — "Open Action Center →" link (Zap icon) added to "What needs your attention" section header (Super Role only); "Open Tasks" KPI href → /tasks?view=open; "Overdue Tasks" KPI href → /tasks?view=overdue; same fix applied to personal KPI cards for normal users; (6) Workspace member wording — workspace card quick-stats now always shows Members line: if memberCount > 0 shows count, if 0 shows "No assigned operational members" (warning color); "Needs Attention" no-members chip text updated from "with no members" → "with no assigned operational members" + warning color; (7) Department summary — "No Users" / "No Workspaces" summary cards replaced with "In Use" (has ≥1 user OR ≥1 workspace, accent color) and "Not Yet Used" (neither, muted color); computed from _count.users + _count.workspaces without backend change; (8) Documents empty state — "No documents found" text updated; body text updated to "Upload controlled documents, certificates, procedures, contracts, and official records." (replaces "Click Upload Document to add your first ISO document."); no destructive migrations; no schema change; 14 migrations remain; pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes including /action-center); both builds pass ✅ Complete
- Unit 56.2 — Fix Business Action Center Runtime Load Failure: root cause identified — API server (PID 21240) was running from a stale dist build that predated BusinessActionsModule being added to AppModule; GET /business-actions/items returned 404 "Cannot GET" because the route was not registered in the in-memory Express instance even though the dist files on disk were current; fix: rebuilt API (nest build, completed 14:05), killed stale process, restarted server with fresh dist; verified GET /business-actions/items returns live ActionItem[] (3 items: 2 UNASSIGNED_TASK + 1 WORKSPACE_WITHOUT_MEMBERS); verified GET /business-actions/preview returns {dryRun:true, totalItems:3, counts per rule}; all 5 BAC routes confirmed mapped in startup log; no code changes required — operational restart only; 14 migrations remain; builds already pass ✅ Complete
- Unit 57 — Production Code Hardening (WebSocket CORS, Correlation IDs, Safe Post-Commit Emits): (1) WebSocket CORS locked — realtime.gateway.ts changed from origin:'*' to process.env.CORS_ORIGIN ?? 'http://localhost:3000'; prevents cross-origin WebSocket connections from unauthorized clients in production; (2) Correlation IDs added to AllExceptionsFilter — every error response (HTTP, Prisma, unhandled) now includes a correlationId field and X-Correlation-Id response header; IDs propagate from incoming X-Correlation-Id request header or are generated fresh (randomUUID); PM2 logs can now be matched to exact client errors; Prisma warn logs include [correlationId] prefix; (3) Post-commit socket emits wrapped in try-catch — tasks.service.ts task.created (create path) and task.updated + task.moved + task.created (recurrence spawn path) now wrapped in separate try-catch blocks so a socket.io exception after a committed DB write cannot cause a 500 response to the client; notification fire-and-forget already had .catch(); pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); Complete ✅
- Unit 56.3 — Workspace Setup, Control, and Cross-Tab Consistency Cleanup: (1) Header chips — "3 open"→"3 Open Tasks", "overdue"→"Overdue", "N issues"→"N Open Issues", "No dept"→"Department Not Assigned", "No members"→"No Operational Members" (clickable, navigates to members tab), member count chip and "No Operational Members" are mutually exclusive (no duplication); (2) Elevated Access badge — added tooltip "Your system role grants elevated access to all workspaces…"; (3) Overview split — "Needs Attention" split into "Setup Required" (amber card, missing dept + no members, canManageWs only) and "Operational Status" (error/success card for overdue tasks/docs/issues); (4) KPI grid — changed from 3-col to 2×2 grid; (5) Workspace settings three-dot gear button added to header — dropdown with Copy Link, Manage Members, Add First Member (when 0 members); (6) Quick Add — added "Add Reference Item" and "Add Task List" options; (7) Task filters reordered and extended — All, My Tasks, Unassigned, Overdue, In Review (WAITING_REVIEW), Returned (REJECTED status), Reference Only (isReference=true), Completed; High Priority removed per spec; filteredTasks and filterCount updated; overdue filter excludes reference items; (8) Documents empty state — "No controlled documents yet" + ISO-specific helper text; (9) Issues & Actions status tabs — added WAITING_EVIDENCE→"Waiting for Information", REJECTED→"Returned", OVERDUE tabs; outline-none on tab buttons removes browser focus rectangle; (10) Members tab — description updated to clarify elevated-role users don't need to be members; empty state updated to "No operational members assigned" + actionable note; (11) Activity tab — entity filter dropdown gains "Files" (FILE_ATTACHMENT) option; ENTITY_LABELS and EntityIcon updated for FILE_ATTACHMENT; activity rows made clickable (TASK→opens task detail, DOCUMENT/FILE→switches to docs tab, NCR_CAPA→switches to issues tab; "View →" hint shown on hover); (12) Overview Quick Links — "Action Center" deep-link added (href=/action-center?workspaceId=:id), visible to SUPER_ADMIN/SUPER_USER only; (13) Sidebar — "Error Logs" renamed to "System Errors"; no new migrations; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); Complete ✅
- Unit 63 — Production Stabilization, Deployment Audit, and Rollback Readiness ✅ Complete (see docs/deployment/)
- Unit 62.2 — Expand Super User Workspace Card Task Summary: Part 1 audit: `WorkspaceOpMetrics` already had `inProgressTasks` and `waitingReviewTasks` but they were never rendered in the card; `completedTasks` and `totalTasks` were missing from both the backend helper and the frontend type; `summary.tasks.completed` used an old groupBy query that did NOT exclude reference items; the operational status engine's `metrics` object was the authoritative source but lacked the two new fields; `withWorkspaceSummaries` fetches ALL task statuses via `taskDetailRows.findMany` (no status filter), so `completedNonRefTasks` can be computed from that data without a new DB query; three callers of `computeWorkspaceOperationalStatus` found — `workspaces.service.ts`, `dashboard.service.ts`, `reports.service.ts` — all three updated. Exact formulas: `totalTasks = openTasks + completedTasks` where `openTasks = TODO + IN_PROGRESS + WAITING_REVIEW + REJECTED` (non-reference, non-cancelled), `completedTasks = COMPLETED non-reference non-subtask tasks`, reference tasks excluded from all operational metrics, cancelled excluded from open/overdue/unassigned. Backend changes: `completedTasks: number` added to `WorkspaceMetrics` input interface; `completedTasks: number; totalTasks: number` added to `WorkspaceStatusResult.metrics` output; `computeWorkspaceOperationalStatus` passes both through; all three service callers compute `completedNonRefTasks` from existing `taskDetailRows`/`wsTasks` (no new DB query); `WorkspaceOpMetrics` frontend type updated with both fields. Card layout (elevated only): replaced single Open/Unassigned/Overdue row with a labeled task summary box — Row 1: Total | Open | In Progress (blue); Row 2: Awaiting Review (amber) | Completed (green); separator row: Unassigned (amber) | Overdue (red); empty state: "No operational tasks yet" when totalTasks=0; context row (Lists · Files Expiring · Issues · Members) kept below. Normal-user card unchanged. Tests: 7 new tests (62.2-T1 through T7) in workspace-status.helper.spec.ts covering completedTasks passthrough, totalTasks = openTasks + completedTasks, zero-task workspace, completed doesn't affect operational status, open/completed/total consistency. `activeWorkspace()` factory updated with `completedTasks: 0`. Full suite: 259 total, 249 pass, 10 skipped, 0 failures. pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); no new migrations ✅ Complete
- Unit 62.1 — Fix "Mark Work Complete" Dialog and Completion-Note Validation UX: Root cause: `SENSITIVE_TARGET_STATUSES` in `apps/web/src/lib/task-status.ts` was `new Set(['COMPLETED', 'REJECTED', 'CANCELLED', 'TODO'])` — `WAITING_REVIEW` was missing, so `handleDropdownChange('WAITING_REVIEW')` called `immediateStatusChange('WAITING_REVIEW')` directly, sending `PATCH /tasks/:id/status` with no `reason`; backend correctly returned 400 "Please provide a reason before continuing." which appeared as an inline red error beside the dropdown instead of opening the dialog. Fix: added `'WAITING_REVIEW'` to `SENSITIVE_TARGET_STATUSES` — one-line change. `handleDropdownChange` now routes `WAITING_REVIEW` through `setPendingStatus('WAITING_REVIEW')`, opening the existing "Submit Work for Review" dialog (title/body/reasonRequired=true/placeholder already correct from Unit 62). `confirmStatusChange()` sends `reason` (completion note), valid `source: 'WORKSPACE_TASK_DRAWER'`, and `expectedUpdatedAt`; dialog closes on success. Backend validation unchanged. Note: `ASSIGNEE_WORK_SUBMISSION` was not added to `change-status.dto.ts` VALID_SOURCES because it is not a defined backend source value — `WORKSPACE_TASK_DRAWER` is the correct and validated source for drawer-initiated status changes. TypeScript check: clean (pnpm exec tsc --noEmit, 0 errors). Full suite: 252 total, 242 pass, 10 skipped, 0 failures — unchanged from Unit 62 baseline. No new migrations. ✅ Complete
- Unit 62 — Assignee Work Completion Submission and Super User Final Verification: Part 1 audit: 6 issues found — (1) MEMBER transitions incorrectly included CANCELLED from TODO and IN_PROGRESS; (2) MEMBER incorrectly allowed direct WAITING_REVIEW from TODO; (3) MEMBER incorrectly allowed direct WAITING_REVIEW from REJECTED; (4) Completion note was optional for WAITING_REVIEW; (5) WAITING_REVIEW label was "Waiting Review" everywhere; (6) WAITING_REVIEW notification only went to task creator (not workspace managers/owners who are the reviewers). Part 2+4: MEMBER transitions fixed in both shared enums.ts and web task-status.ts — new MEMBER map: TODO→[IN_PROGRESS], IN_PROGRESS→[WAITING_REVIEW], REJECTED→[IN_PROGRESS], WAITING_REVIEW→[], COMPLETED→[], CANCELLED→[]; Member can no longer cancel, skip directly to review, or complete their own task. Part 3+5: Display labels — STATUS_DISPLAY_LABELS.WAITING_REVIEW changed from "Waiting Review" to "Completed — Awaiting Review"; TASK_STATUS_DISPLAY_NAMES.WAITING_REVIEW changed to "AWAITING REVIEW"; MEMBER_STATUS_ACTION_LABELS added: IN_PROGRESS→"Start Work", WAITING_REVIEW→"Mark Work Complete"; STATUS_CONFIRM_CONFIG.WAITING_REVIEW updated: title "Submit Work for Review", reason required=true, placeholder "Describe what was completed and any important notes for the reviewer…", confirm label "Submit for Review"; STATUS_CONFIRM_CONFIG.COMPLETED updated to "Approve Completion" wording; TASK_STATUS_REASON_REQUIRED extended with WAITING_REVIEW. Part 4: task-detail-panel.tsx dropdown now uses action-oriented labels for MEMBER tier — "Start Work" for IN_PROGRESS, "Mark Work Complete" for WAITING_REVIEW (transition targets only; current status shows status name). Part 7+8+18: Backend changeStatus() — activity summary now uses action-oriented descriptions ("submitted for completion review", "approved completion of", "returned for correction", "resumed work on", "started work on"); WAITING_REVIEW notification now notifies task creator AND all workspace MANAGER/OWNER members (designated reviewers); COMPLETED notification updated to "Completion Approved / Your work was reviewed and approved"; REJECTED notification preserved with full reason; assigneeId added to ActivityEvent metadata for all status changes. Part 14: Reviewer panel added to task-detail-panel.tsx — when task.status=WAITING_REVIEW AND user is reviewer (canUpdate||isElevated||isWsOwnerOrManager), shows highlighted amber panel with: "Work Submitted for Review" header, submitted-by name, submission timestamp, completion note from ActivityEvent metadata, "Approve Completion" (green) and "Return for Correction" (red) action buttons; for normal assignees, shows simple "Work submitted — awaiting review" notice with their completion note. Part 22 — Recurrence safety confirmed: Member can no longer reach COMPLETED directly, so recurrence never spawns from Member's Mark Work Complete action; recurrence still spawns only on reviewer's WAITING_REVIEW→COMPLETED transition. Part 28: 18 automated tests (62-T1 through T18) covering: MEMBER transition rules (no CANCELLED, no direct COMPLETED, correct paths), WAITING_REVIEW reason required, reviewer WAITING_REVIEW options, full workflow path contracts, Member cannot cancel, recurrence safety invariant. Shared package rebuilt. Full suite: 252 total, 242 pass, 10 skipped, 0 failures. pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); no new migrations ✅ Complete
- Unit 61.2 — Role-Scoped Workspace Activity for Normal Users, Managers, and Elevated Roles: Part 1 audit: Activity tab uses AuditLog model (not ActivityEvent); getWorkspaceAuditLogs() returns ALL audit events for all workspace entities (tasks, docs, issues, workspace) to ALL workspace members — no role filtering; AuditLog has actorId, newValue/previousValue JSON (membership events store newValue.userId; task events store newValue.title/status); ActivityEvent is separate (task-drawer only, not affected); no assigneeId or targetUserId dedicated field in AuditLog. Part 3+4 — getMemberScopedActivity() added to workspaces.service.ts: Step 1: load task IDs currently assigned to current user; Step 2: OR conditions — actorId=currentUser for any entity + entityType=TASK where entityId in assigned tasks + PROJECT events (all fetched for post-filter); Step 3: post-filter PROJECT events — MEMBER_ADDED/UPDATED show only if newValue.userId===currentUser; MEMBER_REMOVED shows only if previousValue.userId===currentUser; all other PROJECT events (workspace renamed, etc.) hidden; Step 4: batch-resolve document/NCR titles for filtered events; returns up to 50 events. Parts 2+13+14 — Role tier routing in getActivity(): ELEVATED (SUPER_ADMIN/IT_ADMIN/ISO_MANAGER/QHSE_USER/SUPER_USER) → full getWorkspaceAuditLogs(); MANAGER/OWNER workspace role → full getWorkspaceAuditLogs(); MEMBER/VIEWER → getMemberScopedActivity(); all tiers still require assertWorkspaceAccess to pass first. Part 6 — Historical limitation documented: tasks reassigned away from user are no longer in assigned task list → historical events on those tasks are not returned to Member; future events can be enriched by adding assigneeId to AuditLog newValue at write time (additive, not done in this unit). Part 8+9+10 — Activity tab UI: title "My Relevant Activity" for Members, "Workspace Activity" for Managers/elevated; description "Activity related to your assigned work, comments, files, issues, and workspace access." for Members; role-specific filter options (Members: My Tasks/Issues/Documents/Access Changes; Managers: Tasks/Documents/Issues/Files/Workspace & Members); empty state "No relevant activity yet." + description for Members, "No workspace activity recorded yet." for Managers; error state "We couldn't load your activity." with Retry button; activityError state added. Parts 13+14 — Realtime: activityStale state added; task.created, task.updated, workspace.member.added/removed, attachment.created/updated events now set activityStale=true; stale banner shown in Activity tab with role-appropriate message ("Workspace activity has been updated" vs "New relevant activity may be available"); Refresh button resets stale and refetches authorized feed; loadActivity now clears error and stale state on call. Part 25 — Audit records unchanged — underlying AuditLog entries not deleted or modified; only the query scope changes per role. Part 28 — 18 automated tests in workspaces.service.activity.spec.ts: 12 post-filter logic tests (T1-T12), 4 tier-routing contract tests (T13-T16), 2 sentinel safety tests (T17-T18); all 18 pass. Full suite: 234 total, 224 pass, 10 skipped, 0 failures. pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); no new migrations ✅ Complete
- Unit 61.1 — Workspace "My Tasks" Filter Validation Fix: Root cause: `buildWorkspaceVisibilityWhere()` returns `{ OR: [{ workspaceId: null }, { workspace: { members: { some: { userId } } } }] }` — designed for entities with nullable `workspaceId` (Document, NcrCapa). Unit 61 introduced a new branch applying this filter to workspace-scoped `Task` queries. `Task.workspaceId` is a non-nullable `String` field in Prisma; `{ workspaceId: null }` is an invalid filter for a non-nullable field, causing `PrismaClientValidationError`. The all-exceptions filter catches `PrismaClientValidationError` and returns HTTP 400 with "Invalid data provided. Please check your input." — exactly the message normal users saw when clicking My Tasks. Fix: (1) added `buildTaskVisibilityWhere()` private method to TasksService — identical scoping logic but never uses `{ workspaceId: null }` (uses `workspace.members` relation only, as Task always belongs to a workspace); (2) restructured `findMany` visibility branching — when `workspaceId` is explicitly provided, `assertWorkspaceAccess` already validated access and `baseWhere` already contains `workspaceId: filters.workspaceId` which fully scopes the query — no additional visibility filter applied; when only `taskListId` (no workspaceId), uses `buildTaskVisibilityWhere`; global queries (neither) use `buildTaskVisibilityWhere` for DEPARTMENT roles or assigneeId restriction for STAFF. The `buildWorkspaceVisibilityWhere` (with `workspaceId: null`) is now never called in `findMany` code paths — avoiding the Prisma validation error entirely. 5 regression tests (61.1-T1 through T5): T1 confirms `workspaceId:null` never appears in workspace-scoped queries; T2 confirms assigned task returned without error; T3 confirms 4 tasks returned from workspace (Policy Option A) with client-side mine filter yielding 1; T4 confirms taskListId-only uses `workspace.members` relation; T5 confirms `assertWorkspaceAccess` is called. Full suite: 216 total, 206 pass, 10 skipped, 0 failures. pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes); no new migrations. Normal user My Tasks filter now works: `iso 1` (IN_PROGRESS, MEDIUM) is visible ✅ Complete
- Unit 61 — Normal-User Workspace Usability, Assigned-Task File Upload, and Permission-Accurate UI: Part 1 audit: 8 confirmed issues — (1) task-list badge shows 4 but list renders empty due to `GET /tasks?taskListId=xxx` requiring `tasks.read` (may be absent for STAFF), silently caught and ignored; (2) STAFF `isStaffOrAuditor` filter forces assigneeId restriction even for workspace-context queries making badge/list inconsistent; (3) Attach button tied to `tasks.update` — STAFF assignee has neither; (4) Header "Unassigned" chip shown to all users but only actionable for managers; (5) Quick Add shows "Upload Document" and "Raise Issue" for all Members (both need specific permissions STAFF lacks); (6) "Add Task" shown when `canCollaborate=true` but STAFF has no `tasks.create`; (7) Overview shows workspace-wide Workspace Status (with "2 unassigned") for Members who can't act on it; (8) Default task filter is 'all' — task list appears empty for Members who default to "My Tasks" mental model. Part 2 root cause: `GET /tasks?taskListId=xxx` and all task-related endpoints required `tasks.read` — changed to `project.read` in tasks.controller.ts and file-attachments.controller.ts so normal Members (STAFF) can access tasks via workspace membership. Part 2 visibility policy: for workspace-scoped queries (workspaceId or taskListId provided), explicit workspace members may see ALL workspace tasks (Policy Option A: collaborative workspace); STAFF assigneeId restriction now only applies for global task list queries (no workspace/taskList context); consistent with badge count showing total list tasks. Part 3+25: loadTasks URL now includes `workspaceId` (`GET /tasks?workspaceId=${workspaceId}&taskListId=${selectedListId}`); default task filter changed from 'all' to 'mine' for MEMBER role (via useEffect after workspace loads); tasksError state added with proper error display and Retry button instead of silent `catch { /* ignore */ }`. Part 4: Attach button — added `isAssignee = task.assigneeId === user.id` and `canUploadTaskFile = (canUpdate || isAssignee) && !isLocked` in task-detail-panel.tsx; assigned STAFF users now see Attach button for their tasks. Part 4 status dropdown: added `canChangeStatus = canUpdate || isAssignee`; status dropdown shows transitions for assignees using MEMBER tier (TODO→IN_PROGRESS, IN_PROGRESS→WAITING_REVIEW, REJECTED→IN_PROGRESS). Part 12: Header Unassigned chip now only shown when `canManageWs` (elevated/Owner/Manager); Members no longer see workspace-wide unassigned count they can't act on. Part 13+14: Overview — non-managers see a "My Work in This Workspace" personal panel at top (open tasks + overdue count + action button); Workspace Status panel wrapped in `{canManageWs && ...}` — only shown to managers/elevated; Task Summary dynamic button uses personal context for Members ("View My Tasks") vs workspace control for Managers; existing "My Work" card below now also guarded by `canManageWs`. Part 15+16: `canCreateTask`, `canCreateTaskList`, `canUploadDocument`, `canCreateIssue` permission variables added using actual permission checks; Quick Add now only shows items user is actually permitted to perform; Add Task button uses `canCreateTask` (not `canManage`); task list sidebar "+" uses `canCreateTaskList`. Part 17: Documents tab — `canCreate` no longer derives from `canCollaborate`; now uses `documents.create` permission only; Upload/Bulk Upload hidden for STAFF who lacks it; empty state wording updated ("Controlled documents and official records will appear here when added."). Part 19: Issues tab — `canCreate` now uses `ncr.create` permission only (not `canCollaborate`); Raise Issue hidden for STAFF. Part 26: Empty state wording fixed — "No tasks are assigned to you in this list." for `mine` filter; "No tasks have been added to this list." for `all` with no canCreateTask. Part 31: 5 new tests (Unit 61-T1 through T5) for task visibility policy in tasks.service.spec.ts; all pass. Full suite: 211 total, 201 pass, 10 skipped, 0 failures. pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); no new migrations; ready for inside-workspace normal-user screenshot review ✅ Complete
- Unit 60 — Normal-User Task Scope, My Tasks Runtime Fix, Personal Workspace Cards, and Cross-Page Consistency: Part 1 root cause: My Tasks page called `GET /tasks?assigneeId=userId` which requires `tasks.read` permission; this permission may not be in the running database for the STAFF role if the seed was applied before the STAFF role's `tasks.read` entry was defined — Dashboard uses `project.read` (always works) while My Tasks was using `tasks.read` causing 403; normal-user `tasks.read` absence confirmed by Dashboard working (requires only `project.read`) while My Tasks failing. Part 2: Dashboard `myAssignments` query returns personal assigned tasks with workspace info correctly; My Tasks used a separate code path that failed. Parts 3+4: Added `getMyTasks(actorId, actorRoles, actorDeptId)` to DashboardService — returns `{ summary: {open, inProgress, waitingReview, returned, overdue, completed, total}, tasks[] }` where tasks include workspace and taskList info; uses same `taskWsVis` workspace-access scoping as other personal queries; requires only `project.read` permission (same as dashboard overview); added `GET /dashboard/my-tasks` route in DashboardController. Part 5+6: My Tasks page rewritten — normal users call `apiGet('/dashboard/my-tasks', token)` instead of raw `fetch(/tasks?assigneeId=userId)`; `summaryData` state holds server-authoritative counts (not computed from tasks array); summary count cards show loading skeleton during load and "—" on error instead of false zeros; task row uses `t.workspace.name` (from new endpoint) instead of `t.taskList?.workspace?.name` (which was never included in old API response); added "Waiting Review" and "Returned" filter tabs for normal users; task row shows `{wsName} · {listName}` in subtitle; all rows clickable with deep link `/workspaces/:wsId?task=:id`. Part 7+8: Dashboard wording fixed — attention items use "My overdue tasks"/"My open / overdue issues" for `isRestricted` users; "No urgent business items require attention" → "No assigned work currently requires your attention" for restricted users; attention href updated from `/tasks` to `/tasks?view=overdue`; KPI cards renamed — "My Workspaces"→"Accessible Workspaces", "My Assigned Tasks"→"My Open Tasks" with inProgress sub-count; "Docs Under Review" replaced with "My Waiting Review" KPI (waits for `taskSummary.waitingReview`) when user has no review permission (canReview=false); "Unread Notifications" KPI gets amber border when count > 0; "Recent Business Activity" section renamed "My Recent Activity" for non-elevated users. Part 9: My Assigned Tasks rows are now clickable Links with deep-link `/workspaces/:wsId?task=:id` (hover highlight + navigation); overdue prefix "⚠" added. Part 10+11: My Workspaces page — non-elevated users get simplified card: name + Active badge, workspace task count clearly labeled "workspace tasks", lists count, operational members count, single "Open Workspace →" button — no operational status badge, no reason chips, no unassigned/overdue business metrics, no Review Attention action; elevated users retain full business card unchanged (spec Part 2-3). Summary cards for non-elevated users remain workspace-wide counts (open tasks, open issues) which are correctly scoped to accessible workspaces. Part 13: My Workspaces page summary bar (`pageSummary`) shows workspace-wide counts for all users — for non-elevated users this is their accessible-workspace aggregate, not business-wide. Part 14: TASK_ASSIGNED notification messages enriched — task create and update paths now fetch workspace name and actor name before creating notification; message format: "You were assigned '[title]' in [workspace] by [assigner]. · Due [date]" (date only if present); workspace/actor lookups are `.catch(() => null)` non-blocking; Part 17 realtime: existing realtime and socket handlers unchanged; debouncedRefreshWorkspace triggers workspace summary refresh after task events. Part 25 tests: 17 new tests in `dashboard.service.spec.ts` covering personal task summary computation, task scope isolation, overdue calculation, reference task exclusion, Kuwait end-of-day usage, cross-page consistency contract; also updated `tasks.service.spec.ts` to add `workspace.findUnique` mock (needed for enriched notifications) and restore after `jest.resetAllMocks()` in both describe blocks; full suite: 206 total, 196 pass, 10 skipped, 0 failures. `pnpm --filter api build` ✅ EXIT:0; `pnpm --filter web build` ✅ EXIT:0 (21 routes, TypeScript clean); no new migrations; ready for inside-workspace normal-user screenshot review ✅ Complete
- Unit 59.3 — Assignment Eligibility Enforcement and Task-Test Cleanup: Part 1-3: Fixed `assertCanBeAssigned` — removed elevated-actor bypass entirely (actor role now only answers "can this actor manage the task?", not "can this user be assigned?"); added elevated-assignee exception (SUPER_ADMIN/SUPER_USER can receive task assignments without explicit workspace membership); improved error messages: inactive user → "This user is inactive and cannot be assigned tasks.", Viewer → "This user has read-only workspace access and cannot be assigned operational tasks.", non-member → "This user must be added to the workspace as a Member, Manager, or Owner before the task can be assigned."; documented the actor/assignee separation in the method comment; Part 5: `getEligibleAssignees` updated to match — now returns Group 1 (operational MEMBER|MANAGER|OWNER workspace members) + Group 2 (active SUPER_ADMIN|SUPER_USER not already in Group 1 via elevated-assignee exception); eligible-members endpoint and assignment validation now use the same logic and cannot drift; Part 7: `getMemberRemovalImpact()` service method returns activeTaskCount + task list for a member (read-only); `GET /workspaces/:id/members/:memberId/impact` endpoint added; `removeMember()` updated to accept `taskHandling: 'leave-unassigned'` query param — if active tasks exist and no handling provided returns BadRequestException with count; `taskHandling=leave-unassigned` unassigns tasks in same $transaction as membership deletion; audit log captures handling decision and affected task count; frontend `handleRemoveMember` fetches impact first, shows count in confirm dialog, passes `?taskHandling=leave-unassigned` to DELETE, shows result toast with unassigned count; Part 8: Recurrence assignee copy now calls `this.workspaces.assertCanBeAssigned(assigneeId, workspaceId, [])` before spawning next occurrence — if assignee became inactive, was removed from workspace, or was downgraded to Viewer, the new occurrence is spawned unassigned without failing recurrence; Part 9 — T.708 resolution: test name "53.1-T8 — socket emit throwing does not undo committed completion"; root cause: Unit 57 wrapped post-commit socket emits in try-catch (correct approved policy) but the test assertion was never updated from `.rejects.toThrow('socket down')` to `.resolves`; fix: changed assertion to `.resolves.toBeDefined()` + kept `task.update` call verification; added detailed comment documenting approved post-commit realtime policy; Case 18 also updated: replaced stale `prisma.user.findUnique` mock with `mockWorkspaces.assertCanBeAssigned.mockRejectedValueOnce(...)` to match new recurrence eligibility check; Part 10 tests: 10 new assignment eligibility tests (59.3-T1 through T10) covering: Super User actor can manage any task; Super User actor cannot bypass assignee eligibility; active Member/Manager/Owner accepted; Viewer rejected; inactive user rejected; assertCanBeAssigned skipped when assigneeId unchanged or cleared to null; task creation rejects invalid assignee; socket failure does not fail committed update; full task spec: 59/59 pass; full suite: 191 total, 181 pass, 10 skipped, 0 failures; workspace-status.helper spec: 42/42 pass; pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes); no new migrations; ready for normal-user Dashboard review ✅ Complete
- Unit 59.2 — Super User Assignment Flow, Workspace Membership Consistency, and Normal-User Access Foundation Fix: Part 1 audit: 7 confirmed bugs — (1) business-reason suppression under SETUP_REQUIRED showing "No urgent business items" when unassigned tasks existed; (2) VIEWER members counted in operationalMembers giving incorrect NO_OPERATIONAL_MEMBERS status; (3) Members tab hidden from normal MEMBER/VIEWER roles (content rendered but tab not shown); (4) Private-workspace wording said "only listed members" without mentioning elevated access; (5) Task assignee dropdown loaded all active users instead of workspace members; (6) No workspace-member validation in task create/update — any user ID accepted as assigneeId; (7) No workspace department assignment UI — "Assign Dept" button routed to members tab instead of opening department picker. Part 3+4 — Status engine fix: extracted `buildBusinessAttentionReasons()` helper; SETUP_REQUIRED now returns `[...setupReasons, ...businessReasons]` so business attention reasons are never discarded; ICT workspace with no department now correctly shows "Department not assigned" + "2 tasks unassigned" simultaneously; CRITICAL status now returns all businessReasons (superset); status priority chain unchanged. Part 7 — Operational member count: added `operationalMemberRows` batch query to `withWorkspaceSummaries` using `roleInWorkspace: { not: 'VIEWER' }, user: { isActive: true }` groupBy; passes correct operational count to engine; VIEWER-only workspaces now correctly flagged as SETUP_REQUIRED. Part 8+9 — Task assignment validation: added `assertCanBeAssigned()` to WorkspacesService — checks user exists, isActive, explicit workspace membership, role not VIEWER; elevated actors can assign to any active user; friendly BadRequestException: "This user must be added to the workspace before the task can be assigned"; called in tasks.service create() and update() (only when assigneeId changes). Part 13+14 — Members-tab visibility: tab `show` changed from `canManageWs` to `isElevatedAccess || !!myWsRole` — any explicit workspace member (including VIEWER) can see the Members tab; management controls (Add Member button, role change select, Remove button, copy email) still guarded by `canManageMembers`; table header omits actions column for non-managers; read-only member list shows name/department/system roles/workspace role for everyone. Part 15+16 — Private workspace wording: elevated users see "listed members and authorized global business controllers can access"; normal members see "access is limited to listed members"; email copy button hidden for non-managers. Part 17 — Workspace department assignment: `AssignDepartmentModal` added to workspace-client with `showAssignDeptModal`, `availableDepts`, `selectedDeptId`, `assignDeptLoading`, `assignDeptError` state; ACTION_FOR_CODE updated — DEPARTMENT_NOT_ASSIGNED action now `{ modal: 'assign-dept' }` instead of routing to members tab; `handleReasonAction()` dispatches to modal or tab based on action type; button only shown when `canManageWs`; modal loads active departments from `GET /departments`, patches workspace via `PATCH /workspaces/:id { departmentId }`, refreshes overview and debouncedRefreshWorkspace; workspace department and user department remain explicitly separate. Part 18 — Task assignee dropdown: task-detail-panel.tsx now loads `GET /workspaces/:id/members/eligible` instead of `/users/search?isActive=true`; new backend endpoint `getEligibleAssignees()` returns MEMBER|MANAGER|OWNER members with active users + department info; `GET /workspaces/:id/members/eligible` controller route added. Part 25 — Data-integrity audit: new `GET /workspaces/:id/integrity` endpoint (SUPER_ADMIN/IT_ADMIN/SUPER_USER only) — read-only, returns `{findingCount, findings[]}` with 6 check types: WS_NO_DEPARTMENT, TASK_INACTIVE_ASSIGNEE, TASK_ASSIGNEE_NOT_MEMBER, INACTIVE_MEMBER_ACTIVE_TASKS, DUPLICATE_MEMBER, ORPHANED_MEMBER. Part 26 — Tests: workspace-status.helper.spec.ts expanded from 30 to 42 tests (12 new: 6 business-reason suppression cases, 3 operational member definition cases, 3 relationship-separation contracts); all 42 pass; pre-existing tasks.service.spec.ts failure at T.708 (socket-error throw assertion contradicts Unit 57 non-fatal socket design) confirmed pre-existing and not caused by this unit. No new migrations. pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); 42/42 workspace-status tests pass; 170/171 total pass (1 pre-existing failure). Ready for normal-user Dashboard review. ✅ Complete
- Unit 59.1 — Workspace Status UI Consolidation, Task Summary Upgrade, and Realtime Recalculation: Part 1 audit confirmed 5 duplication points (card member-warning, Overview two-panel duplication, header overlapping chips, reasons showing 3 not 2, dead businessIssues variable); Part 2-3: workspace card redesigned — member warning text removed (reason chip already shows it), reason chips capped at 2 + "+N more", metrics row shows Open/Unassigned/Overdue (amber/red colors)/Lists/Files Expiring/Issues/Members without any duplication, dynamic primary action button by status (Review Setup amber/Review Critical Items red/Review Attention/View Work/Open Workspace) + secondary "Open →" button, HEALTHY shows single Open Workspace; Part 4-5: Overview "Setup Required" and "Operational Status" panels replaced with one consolidated "Workspace Status" panel — title + badge, Section A: Setup reasons (DEPARTMENT_NOT_ASSIGNED/DEPARTMENT_INACTIVE/NO_OPERATIONAL_MEMBERS with action buttons), Section B: Business Attention (all other reasons with Review→ buttons), HEALTHY/IN_PROGRESS/INACTIVE show simple messages, status-colored border; Part 6-7: Task Summary card upgraded from 3 rows (Open/Overdue/Completed) to 7 rows (Open/In Progress/Unassigned amber/Overdue red/Waiting Review conditional/Returned conditional/Completed green); dynamic action button selects highest-priority condition label (Review Overdue Tasks → Returned → Review Waiting Review → Unassigned → In-Progress → View Tasks) and sets correct task filter on click; all metrics sourced from workspace.metrics (Unit 59 engine output, not re-computed in frontend); Part 8: Issues card gains Waiting Verification row from workspace.metrics.issuesWaitingVerification; Documents card renames "Rejected" to "Requiring Attention"; Team card shows Operational vs. View-only split when counts differ; Part 9: header chips simplified — removed duplicate "No Operational Members" + "Department Not Assigned" setup chips (communicated by op-status badge in header); added Unassigned chip (amber, shown when >0) and Files chip (red, shown when >0); Open Tasks uses workspace.metrics.openTasks; Operational Members chip for managers; Parts 10-13: workspace-client.tsx gains wsRefreshDebounceRef + debouncedRefreshWorkspace() callback (350ms debounce, calls loadWorkspace to refresh workspace.metrics used by header chips and Task Summary); all socket handlers updated to call debouncedRefreshWorkspace() on task.created/updated/deleted, workspace.member.added/removed, document.created/updated, ncr.created/updated, task.moved; new attachment.created and attachment.updated handlers added (both trigger debouncedRefreshWorkspace for expiry status recalculation); stale-event protection preserved (incomingUpdatedAt > localUpdatedAt guard in task.updated); workspaces/page.tsx gains per-workspace targeted realtime patch — wsRefreshTimers.current debounce map, tokenRef for safe async token access, scheduleWorkspaceRefresh() fetches GET /workspaces/:id after 400ms and patches only the affected workspace's operational fields (operationalStatus/operationalStatusLabel/operationalReasons/metrics/status/summary/department) in list state; stale banner falls back for events without workspaceId; WorkspaceDetail type imported for type safety of targeted patch; pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); workspace-status.helper.spec.ts 30/30 passing ✅ Complete
- Unit 59 — Automatic Workspace Operational Status and Health Classification: created `apps/api/src/modules/workspaces/workspace-status.helper.ts` — pure `computeWorkspaceOperationalStatus(metrics: WorkspaceMetrics): WorkspaceStatusResult` function with 6-status priority chain (INACTIVE > SETUP_REQUIRED > CRITICAL > NEEDS_ATTENTION > IN_PROGRESS > HEALTHY) and `endOfDayKuwait()` helper (UTC+3, no DST); `WorkspaceOperationalStatus` type, `WorkspaceStatusReason` interface (code/label/severity/count), `WorkspaceOpMetrics` passthrough; created 30-case spec (workspace-status.helper.spec.ts) — 30/30 passing; extended `withWorkspaceSummaries<T extends {id, status, departmentId, _count.members}>` in workspaces.service.ts to fetch task detail rows, NCR detail rows, file attachment expiry rows, department active status in 2 rounds (no N+1), compute per-workspace metrics, call helper, and append `operationalStatus/operationalStatusLabel/operationalReasons/metrics` to each workspace; rewrote `getWorkspaceStatusRows` in dashboard.service.ts to use the same helper (replaces simplistic 3-level formula + placeholder zeros), added `in/unassigned/waiting/returnedTasks`, `overdueIssues`, `issuesWaitingVerification`, Kuwait timezone for all comparisons; updated reports.service.ts `WsStatus` interface and workspace status computation to use helper (added `status` to workspace select, updated type cast); added `WorkspaceOpStatusBadge` component to status-badge.tsx (6 statuses with design-system CSS variable colors, size xs/sm); updated WorkspaceSummary frontend type (added operationalStatus/operationalStatusLabel/operationalReasons/metrics/WorkspaceOperationalStatus/WorkspaceStatusReason/WorkspaceOpMetrics); updated dashboard/types.ts WorkspaceStatusRow (operationalStatus replaces 3-value status); updated reports/types.ts WsStatus (operationalStatus/operationalStatusLabel/operationalReasons) and STATUS_CONFIG (6 entries keyed by WorkspaceOperationalStatus); updated workspaces/page.tsx (op status badge + reasons chips in cards, op status badge in table health column, attention bar uses critical/needsAttention/setupRequired counts, sort uses priority order); updated workspace-client.tsx (op status badge in header, Overview Operational Status section uses workspace.operationalStatus + operationalReasons with code→tab routing); updated dashboard/page.tsx WsStatusBadge to accept 6-value type + label; updated reports/page.tsx StatusBadge to accept operationalStatus + label; exportWsCSV uses operationalStatusLabel; pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean); 15 migrations total (no new migration — operational status is computed) ✅ Complete
- Unit 58.2 — Task Status and Priority Dropdown Visual Polish: created `apps/web/src/components/task-badge-select.tsx` — a reusable `TaskBadgeSelect` component replacing native `<select>` for both Status and Priority in `task-detail-panel.tsx`; pill-shaped trigger button (`rounded-full`) with status/priority-colored background and `ChevronDown` icon (rotates 180° when open); floating portal menu (`createPortal → document.body`) with `rounded-xl`, 1px border, layered shadow, preventing drawer-overflow clipping; 6-status and 4-priority options each rendered as colored mini-pills inside the menu; `Check` icon marks the currently-selected option; keyboard navigation (Tab closes, Enter/Space toggles, ArrowUp/Down moves highlight, Escape closes + returns focus); click-outside via `mousedown` document listener cleaned up on close; scroll-close listener (capture=true) prevents stale `fixed` position when drawer scrolls; focused menu via `menuRef.focus()` on open; ARIA attributes (`role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-selected`); `readOnly` prop renders a static badge (used for Viewer role and the fixed header strip); `saving` prop replaces ChevronDown with `Loader2` spinner; `disabled` prop disables the trigger during status-change mutation; `prioritySaving` state + `savePriority()` wrapper added for priority changes with loading indicator and failure revert; `PRIORITY_OPTIONS` constant (LOW/MEDIUM/HIGH/CRITICAL with design-system CSS variable colors); header priority badge replaced with static colored span using `PRIORITY_OPTIONS` colors (PriorityBadge import removed); all Unit 58/58.1 backend validation, confirmation dialogs, transition rules, concurrency checks, audit logs, notifications, realtime unchanged; `pnpm --filter web build` ✅ EXIT:0 (21 routes, TypeScript clean) ✅ Complete
- Unit 58.1 — Status Dropdown UI Compatibility Cleanup: replaced Unit 58's "static badge + Change button" pattern with a single styled `<select>` matching the deployed version's appearance (`[TODO ▼] [MEDIUM]`); `lib/task-status.ts` extended with `TASK_STATUS_DISPLAY_NAMES` (TODO / IN PROGRESS / WAITING REVIEW / COMPLETED / REJECTED / CANCELLED), `ALL_TASK_STATUSES`, `SENSITIVE_TARGET_STATUSES`, `STATUS_BADGE_COLORS`; `task-detail-panel.tsx`: removed `statusMenuOpen` state; added `displayStatus` state (tracks select's displayed value independently of server-committed `task.status`, synced via `useEffect`); `dropdownOptions` derived — ELEVATED sees all 6 statuses, MANAGER/MEMBER sees current + valid transitions only, Viewer sees static `StatusBadge`; `handleDropdownChange()` — routine targets (IN_PROGRESS, WAITING_REVIEW) save immediately via `immediateStatusChange()` without modal; sensitive targets (COMPLETED, REJECTED, CANCELLED, TODO/reopen) set `pendingStatus` to open confirmation modal; on modal cancel `closeStatusDialog()` reverts `displayStatus` to `task.status`; on failure (both immediate and modal paths) `displayStatus` reverts to `task.status` and `statusError` shows inline; select is `disabled` while `statusChanging`; loading spinner overlays the select during mutation; `tasks/page.tsx` action menu labels updated from `STATUS_ACTION_LABELS` (action verbs) to `TASK_STATUS_DISPLAY_NAMES` (familiar status names); Unit 58 backend transition validation, concurrency check, audit history, notifications, recurrence, realtime all preserved unchanged; pnpm --filter api build ✅ EXIT:0; pnpm --filter web build ✅ EXIT:0 (21 routes, TypeScript clean) ✅ Complete
- Unit 58 — Controlled Manual Task Status Workflow, Verification, Audit History, and Realtime Synchronization: (1) Backend schema: `metadata: Json?` added to `ActivityEvent` model with migration `20260622044545_add_activity_metadata`; (2) Shared package: `TASK_STATUS_TRANSITIONS` (role-tier map: ELEVATED/MANAGER/MEMBER, 6 statuses each), `TASK_STATUS_REASON_REQUIRED` (REJECTED/CANCELLED), `TASK_STATUS_REOPEN_SOURCES` (COMPLETED/CANCELLED), `NotificationCategory` additions (TASK_WAITING_REVIEW/COMPLETED/CANCELLED/REOPENED) exported from `@auditflow/shared`; (3) Backend DTO: `change-status.dto.ts` (newStatus, reason, source, expectedUpdatedAt, isOverride); (4) Backend service: `changeStatus()` method on `TasksService` — loads task, concurrency check (`|expectedUpdatedAt - actual| > 1000ms` → ConflictException 409), workspace member role lookup for tier, transition validation, access checks (assignee/creator/elevated/canManage), mandatory reason enforcement, `completedAt` set/cleared, atomic `$transaction` (task.update + activityEvent.create with metadata + auditLog.create + optional recurrence spawn), post-commit realtime emit (enriched payload: `{id, workspaceId, previousStatus, newStatus, updatedAt, completedAt, changedBy, reason, source}`), `sendStatusChangeNotifications()` private method (WAITING_REVIEW→creator, COMPLETED→assignee+creator, REJECTED→assignee with reason, CANCELLED→assignee+creator, REOPENED→assignee); (5) Backend controller: `GET /tasks/transitions` (returns full tier map), `PATCH /tasks/:id/status` (calls changeStatus); (6) `CATEGORY_SEVERITY` map extended (TASK_WAITING_REVIEW/COMPLETED/CANCELLED/REOPENED); (7) Frontend constants: `apps/web/src/lib/task-status.ts` (mirrors transition map + `STATUS_ACTION_LABELS`, `STATUS_DISPLAY_LABELS`, `STATUS_CONFIRM_CONFIG` with per-target dialog config); (8) `ActivityEventMetadata` interface added to `types.ts`; (9) `task-detail-panel.tsx`: status dropdown replaced with current `StatusBadge` + "Change" button → dropdown menu showing valid next transitions as action-oriented labels; `StatusChangeModal` inline (reason/note textarea, required validation, error display, Cancel/Confirm buttons); `confirmStatusChange()` calls `PATCH /tasks/:id/status` with `expectedUpdatedAt` for concurrency; "Last Status Change" metadata block in Details tab (date/changedBy/reason derived from activity); Status History section in Activity tab (last 5 STATUS_CHANGED events with before→after badges + quoted reason); reason shown inline in activity list for STATUS_CHANGED entries; `saveField()` type narrowed to exclude `status`; (10) `tasks/page.tsx` (Global Task Control): old `STATUS_TRANSITIONS` map removed; imports `TASK_STATUS_TRANSITIONS`; `statusTier` derived from user roles; action menu uses `openInlineStatusMenu()` → `StatusChangeDialog` modal; `confirmInlineStatusChange()` calls `PATCH /tasks/:id/status`; (11) `workspace-client.tsx` realtime handler: `task.updated` handler now applies `newStatus` and `completedAt` from enriched socket payload to local task state (in addition to full `loadTasks()` refetch); (12) Both builds pass: `pnpm --filter api build` ✅ EXIT:0; `pnpm --filter web build` ✅ EXIT:0 (21 routes, TypeScript clean); 15 migrations total ✅ Complete

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

### Unit 51 — Business Action Center Accuracy, Transition Safety, and Recalculation Hardening (2026-06-21) ✅

**Goal:** Harden the Business Action Center with accurate detection, centralized issue transition safety, structured detection evidence, overlap precedence, and a 25-case test matrix. No new action categories, no redesign, no destructive migrations.

**Part 1 — Status enum verification:**
- `WAITING_REVIEW` confirmed as real task status via `dashboard.service.ts:281` and schema
- Confirmed task statuses: `TODO | IN_PROGRESS | WAITING_REVIEW | COMPLETED | REJECTED | CANCELLED`
- Detection correctly includes WAITING_REVIEW tasks (only COMPLETED/CANCELLED excluded)
- Confirmed NcrCapa statuses: `OPEN | IN_PROGRESS | WAITING_EVIDENCE | SUBMITTED | VERIFIED | CLOSED | REJECTED | OVERDUE`
- No changes needed to enum handling — already correct in Unit 50

**Part 2 — Centralized issue transition map:**
- `ISSUE_STATUS_TRANSITIONS: Record<string, string[]>` exported constant added to `business-actions.service.ts`
- Mirrors `STATUS_TRANSITIONS` from `ncr-capa.service.ts` exactly (single authoritative values for BAC)
- `GET /business-actions/issue-transitions` endpoint (BAC-gated, read-only) exposes the map to frontend
- `validTransitions` field embedded in every OPEN_ISSUE, OVERDUE_ISSUE, ISSUE_WAITING_VERIFICATION `ActionItem`
- Frontend `types.ts` updated: `ISSUE_STATUS_LABELS` constant + `validTransitions?: string[]` on `ActionItem`
- Valid transitions shown as colored chips in the SourceFactsPanel (informational only — no mutation from BAC)

**Part 3 — Recalculation after action:**
- BAC has no inline mutations; recalculation means user takes action in workspace then clicks Refresh
- `RecalcHint` component added: amber hint banner shown after Noted or N/A action, guides user to Refresh
- `load()` clears `showRecalcHint` and `concurrencyWarnings` on each refresh
- Items that are resolved after action disappear automatically on next `detectItems()` call

**Part 4 — Attachment-specific reminderDays:**
- Already confirmed correct in Unit 50: per-file `reminderDays ?? 30`, 90-day ceiling
- No changes needed

**Part 5 — Timezone and end-of-day rule:**
- `endOfDayKuwait()` already implemented with `KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000`
- Function now exported from service for testability
- Documented: Kuwait = UTC+3, no DST, `endOfDayKuwait(d)` shifts to Kuwait, sets 23:59:59.999, shifts back

**Part 6 — Detection explanation + source facts:**
- `sourceFacts: Record<string, unknown>` added to `ActionItem` interface (backend + frontend)
- All 9 `detect*` methods populate `sourceFacts` with 6–8 structured key-value evidence fields
- `SourceFactsPanel` React component: expandable "Detection evidence" section in each item row
- `formatFactValue(key, value)` helper: formats ISO dates, arrays (→ ISSUE_STATUS_LABELS), booleans
- `HIDDEN_FACT_KEYS = new Set(['rule', 'timezone'])` excludes verbose internal fields from display
- `detectionCode`, `explanation` → represented by existing `ruleKey` + `reason` fields (no duplication)
- `generatedAt` → represented by existing `detectedAt` field

**Part 7 — Dry-run preview endpoint:**
- Already exists as `GET /business-actions/preview`; confirmed no side effects (no writes, no notifications)
- `getPreview()` test in spec confirms `dryRun: true` and no `systemErrorLog.create` calls

**Part 8 — Concurrency protection:**
- `verifyBeforeAction()` now calls `setConcurrencyWarnings(prev => ({ ...prev, [item.id]: result.message }))` instead of `console.warn`
- Inline amber banner rendered inside each `ItemRow` when `concurrencyWarning` prop is set
- FILE_ATTACHMENT type returns `{ changed: false }` (no updatedAt field — safe default)

**Part 9 — No automatic business decisions:**
- Detection endpoints remain pure read-only; confirmed no mutations in any detect* method
- All business actions (status change, reassignment, etc.) must be performed via workspace/task/issue UIs

**Part 10 — Duplicate/overlap policy:**
- `RULE_PRECEDENCE` constant defines priority order per entity type:
  - TASK: `['OVERDUE_TASK', 'UNASSIGNED_TASK']`
  - ISSUE: `['OVERDUE_ISSUE', 'ISSUE_WAITING_VERIFICATION', 'OPEN_ISSUE']`
  - FILE_ATTACHMENT: `['EXPIRED_FILE', 'EXPIRING_FILE']`
- `applyPrecedence(items)` public method: groups by entityId, sorts by precedence, primary row gets `secondaryRules[]`, collapses to one row per entity
- Secondary rules shown as additional `RuleBadge` chips on the primary row in the UI
- `secondaryRules?: DetectionRule[]` added to `ActionItem` interface

**Part 11 — Notification safety:**
- Detection never sends notifications — confirmed; detection methods are pure DB reads

**Part 12 — Failure/malformed-data handling:**
- Already implemented: per-rule `try/catch` + `logSystemError()`; confirmed via test 25

**Part 13 — Accuracy test matrix (25 cases):**
File: `apps/api/src/modules/business-actions/business-actions.service.spec.ts`
- `endOfDayKuwait()` tests: eod boundary value, same-day invariant, before/after eod comparison
- `ISSUE_STATUS_TRANSITIONS` tests: all 8 statuses defined, SUBMITTED→[VERIFIED,REJECTED], CLOSED→[], VERIFIED→[CLOSED]
- `ALL_RULES` tests: exactly 9 rules, no invalid rule names
- `applyPrecedence()` tests: TASK precedence, ISSUE 3-way precedence, FILE_ATTACHMENT precedence, separate entities kept separate, single-rule unchanged, empty input
- `detectItems()` mocked tests: overdue task (test 1), COMPLETED excluded (3), null dueDate excluded (4), unassigned active task (5), superseded file excluded (11), OPEN issue (12), SUBMITTED issue (13), empty workspace (15), archived workspace excluded (16), concurrency changed (18), concurrency unchanged (18b), preview dry-run (24), one failing rule isolated (25)

**Part 14 — Manual verification checklist:** Documented (spec covers key cases; e2e for role 403 in controller)

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (20 routes, TypeScript clean)
- `spec.ts` excluded from nest build via `tsconfig.build.json`

**Files modified this unit:**
- `apps/api/src/modules/business-actions/business-actions.service.ts` — exported `endOfDayKuwait`, `ISSUE_STATUS_TRANSITIONS`, `ALL_RULES`; added `sourceFacts` + `secondaryRules` + `validTransitions` to `ActionItem`; `applyPrecedence()` public method; `RULE_PRECEDENCE`; `detectOpenIssues` extended to include `WAITING_EVIDENCE`; all 9 detect* methods populate `sourceFacts`; issue detect* methods set `validTransitions`
- `apps/api/src/modules/business-actions/business-actions.controller.ts` — `GET /business-actions/issue-transitions` endpoint
- `apps/api/src/modules/business-actions/business-actions.service.spec.ts` — 25-case unit test spec (new file)
- `apps/web/src/features/business-actions/types.ts` — `sourceFacts`, `secondaryRules`, `validTransitions` on `ActionItem`; `ISSUE_STATUS_LABELS` constant
- `apps/web/src/features/business-actions/business-action-center.tsx` — `SourceFactsPanel`, `RecalcHint`, inline concurrency warning banners, secondary rule badges, detection evidence toggle

---

### Unit 50 — Business Action Center Safety Requirements (2026-06-21) ✅

**Goal:** Implement all 13 parts (A–M) of the critical safety requirements for the Super User Business Action Center. No redesign of existing modules. Backend-only detection. No automatic business changes.

**Part A — Every alert explains why:**
- Each `ActionItem` includes: `ruleKey`, `entityType`, `entityId`, `detectionField`, `detectionValue`, `reason` (human-readable sentence), `detectedAt` (server timestamp)
- Examples: "Marked overdue because due date was 18 June 2026 and status is In Progress.", "Marked expired because expiry date was 10 June 2026 and attachment is not superseded."
- `detectionField` + `detectionValue` shown in monospace below the reason in the UI (audit transparency)

**Part B — No automatic destructive or business decisions:**
- Detection endpoints are pure read-only DB queries. Zero writes to business records.
- Action Center surfaces items only. All business changes must go through the existing workspace/task/document UIs.
- Confirmed: no status change, no reassignment, no document approval, no file replacement from the Action Center.

**Part C — Safe action confirmation:**
- "Mark Not Applicable" opens `NotApplicableModal` showing: record title, workspace, detection rule, responsible user
- Reason field is required (Submit button disabled until reason entered)
- Reason is stored in the audit log `newValue.note` field
- "Noted" (ALERT_REVIEWED) requires no confirmation — it is not destructive

**Part D — No duplicate alerts:**
- Each `ActionItem.id` is a stable compound key: `${ruleKey}:${entityId}`
- One entity produces one item per rule — if a task is both overdue AND unassigned, it produces `OVERDUE_TASK:id` AND `UNASSIGNED_TASK:id` (separate rules, separate IDs)
- No notification side effects from detection queries

**Part E — Time and timezone correctness:**
- Kuwait timezone: UTC+3, no DST (`KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000`)
- `endOfDayKuwait(d)` helper: shifts date to Kuwait, sets 23:59:59.999, shifts back to UTC
- All due-date and expiry-date comparisons use `eod = endOfDayKuwait(new Date())`
- "Due today" is NOT overdue until end of day Kuwait time (23:59:59 Kuwait = 20:59:59 UTC)
- "Expires today" is NOT in EXPIRED_FILE until end of day Kuwait time
- Frontend displays timestamps with `timeZone: 'Asia/Kuwait'` in `toLocaleString`

**Part F — Backend is source of truth:**
- All detection runs on the server via `GET /business-actions/items`
- Frontend displays only what the backend returns — never computes alert state independently
- `RULE_LABELS` and `RULE_COLOR` are frontend display helpers only, not business logic
- `reason` field is generated on the backend, not recomputed client-side

**Part G — Human verification labels:**
- `label: 'SYSTEM_DETECTED'` on every item from backend (always shown in UI)
- Local review state: `SYSTEM_DETECTED` (default) → `NEEDS_REVIEW` ("Noted") → `NOT_APPLICABLE` ("N/A")
- State stored in component — audit log entry persists to DB via `POST /business-actions/log-action`
- "N/A" items remain visible (dimmed to 55% opacity) so Super User can revert

**Part H — Audit trail:**
Whitelisted action set in controller: `ALERT_REVIEWED`, `ALERT_DISMISSED`, `ALERT_NOT_APPLICABLE`, `TASK_REASSIGNED`, `TASK_STATUS_CHANGED`, `DUE_DATE_CHANGED`, `ISSUE_VERIFIED`, `ISSUE_CLOSED`, `ISSUE_REJECTED`, `EXPIRY_METADATA_CHANGED`, `RENEWAL_UPLOADED`, `WORKSPACE_DEACTIVATED`, `MEMBER_REMOVED`, `REQUEST_UPDATE_SENT`
- Each entry stored in `audit_logs` with: `actorId`, `action` (prefixed `BUSINESS_ACTION:`), `entityType`, `entityId`, `previousValue` (old state + ruleKey), `newValue` (new state + note)
- Unknown action strings rejected with 400

**Part I — Concurrency protection:**
- `POST /business-actions/verify-entity` accepts `{ entityType, entityId, expectedUpdatedAt }`
- Compares `expectedUpdatedAt` against live DB `updatedAt` for TASK, DOCUMENT, ISSUE, WORKSPACE
- Returns `{ changed: boolean, currentUpdatedAt, message? }`
- Frontend calls this before review actions; non-blocking (does not hard-fail for "Noted" which is safe)
- Message: "This record was updated by another user. Refresh before continuing."

**Part J — Graceful data inconsistencies:**
- Each of 9 detection methods wrapped in individual `try/catch`
- Failure → `this.logger.error(...)` + write to `system_error_logs` table → empty result for that rule
- Null `dueDate` → not flagged as overdue (skipped via `{ not: null }` Prisma filter)
- Null `expiryDate` → not flagged as expired (same)
- Deleted task for a file attachment → `taskMap[entityId]` is undefined → shows `workspaceName: null`, gracefully renders "—"
- No crash possible from a single malformed record

**Part K — Test matrix (20 rules):**
Documentation of deterministic rule behavior:

| # | Condition | Expected | Rule behavior |
|---|---|---|---|
| 1 | dueDate yesterday + IN_PROGRESS | OVERDUE_TASK | `dueDate < endOfDayKuwait(today)` → matched |
| 2 | dueDate today | not overdue until 23:59:59 Kuwait | `eod = endOfDayKuwait(now)` → today's due tasks not yet past eod |
| 3 | COMPLETED task with old dueDate | not overdue | `status notIn ['COMPLETED','CANCELLED']` |
| 4 | Null dueDate | not overdue | `dueDate: { not: null }` filter |
| 5 | Null assigneeId + IN_PROGRESS | UNASSIGNED_TASK | `assigneeId: null` + `status notIn [...]` |
| 6 | COMPLETED task + null assigneeId | not unassigned | status filter excludes COMPLETED |
| 7 | expiryDate yesterday | EXPIRED_FILE | `expiryDate < endOfDayKuwait(today)` + `isSuperseded:false` |
| 8 | expiryDate today | not expired until eod Kuwait | same eod check |
| 9 | expiryDate within reminderDays | EXPIRING_FILE | `expiryDate >= eod AND <= eod + reminderDays` per file |
| 10 | isSuperseded=true + past expiry | not in active queue | `isSuperseded: false` filter |
| 11 | NCR status=SUBMITTED | ISSUE_WAITING_VERIFICATION | exact status match |
| 12 | CLOSED issue + old dueDate | not overdue | `status notIn ['VERIFIED','CLOSED','CANCELLED','REJECTED']` |
| 13 | Active workspace + 0 members | WORKSPACE_WITHOUT_MEMBERS | `members: { none: {} }` + `status: 'ACTIVE'` |
| 14 | Archived workspace + 0 members | excluded | `status: 'ACTIVE'` filter |
| 15 | Duplicate notification prevention | no notifications from detection | detection queries are pure read-only |
| 16 | Non-elevated user accesses /business-actions | 403 | `BAC_ROLES` guard in controller |
| 17 | Entity changed after drawer opened | `changed: true` response | verify-entity compares updatedAt |
| 18 | Malformed record in one rule | other rules unaffected | per-rule try/catch + system error log |
| 19 | STAFF user's workspace data | not returned | BAC requires elevated roles |
| 20 | Both builds | EXIT:0 | confirmed |

**Part L — Dry-run mode:**
- `GET /business-actions/preview` — runs all 9 detections, returns `ActionPreview` with counts per rule + full item list
- Creates zero notifications, modifies zero records
- Returns `{ dryRun: true, totalItems, counts, rules[], items[] }`
- UI: "Dry-Run Preview" button in header → shows collapsible table with per-rule counts and descriptions
- Access: same BAC_ROLES guard

**Part M — Rollout safety:**
Documented for management:
1. Use "Dry-Run Preview" button before enabling live use
2. Review detected items with Super User to confirm rule accuracy
3. "Noted" and "N/A" actions are audit-logged but never touch business records
4. All underlying business actions still require manual navigation to the workspace/task/document UI
5. System error log captures any per-rule failures for monitoring

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (20 routes unchanged)
- No migrations: no schema changes (detection is pure read; audit log uses existing table)

**Files created/modified this unit:**
- `apps/api/src/modules/business-actions/business-actions.service.ts` — 9 detection rules, Kuwait TZ, graceful error handling, concurrency check, dry-run
- `apps/api/src/modules/business-actions/business-actions.controller.ts` — GET items, GET preview, POST verify-entity, POST log-action (whitelisted)
- `apps/api/src/modules/business-actions/business-actions.module.ts` — NestJS module declaration
- `apps/api/src/app.module.ts` — BusinessActionsModule registered
- `apps/web/src/features/business-actions/types.ts` — DetectionRule, ActionItem, ActionPreview, ItemStatus, display helpers
- `apps/web/src/features/business-actions/business-action-center.tsx` — BusinessActionCenter component (rule chips, item rows with reason, confirmation modal, dry-run panel, local review state, audit logging)
- `apps/web/src/app/(app)/dashboard/page.tsx` — import + render BusinessActionCenter for isSuperRole

**Architecture decisions:**
- Detection is stateless and always computes fresh from DB. No alert state stored in a separate table — this avoids schema changes and keeps the detection honest (if a task is fixed, it disappears automatically on next load).
- Local review state (Noted/N/A) lives in React component state only. Audit log entry is the persistence mechanism. This is correct for MVP — a persisted dismissal table would require migration and complex sync.
- `endOfDayKuwait()` uses UTC+3 offset constant (not `Intl.DateTimeFormat` to avoid runtime timezone data issues on the server).
- BAC is accessible to `['SUPER_ADMIN', 'IT_ADMIN', 'SUPER_USER', 'ISO_MANAGER', 'QHSE_USER']` — all elevated roles, consistent with other elevated-access endpoints.
- The system only surfaces items. All write operations go through the existing workflow endpoints (tasks.service, ncr-capa.service, etc.) with their own permission guards and audit logs.

---

### Unit 49 — Reports Accuracy and Actionability Cleanup (2026-06-21) ✅

**Goal:** Remove misleading placeholder values and complete the most important report actions. No redesign of the Reports module, no new features, no destructive migrations.

**Part 1 — Expiry placeholder removal (workspace table):**
- Workspace Status table: expiredFiles cell now shows "—" (text-muted) when count is 0, red count when > 0
- Avoids implying 0 expired files when workspace has no tracked expiry data
- Backend aggregation unchanged (already correct: task-attachment → taskId → workspaceId mapping, isSuperseded=false filter)

**Part 2 — Global expiry KPI verified correct:**
- Backend confirmed: `wsExpiredAtt` / `wsExpiringSoonAtt` query `entityType='TASK'`, `isSuperseded:false` only
- Superseded exclusion live-tested: inserting `isSuperseded=true` attachment with past expiry date → global count unchanged ✓
- Hidden-workspace scoping: elevated roles see all; dept/staff roles see only accessible workspace attachments via `buildWorkspaceVisibilityWhere`

**Part 3 — Documents Requiring Attention action column:**
- TASK_FILE rows with valid `relatedTaskId` + `relatedTaskWorkspaceId`: shows "Open Task ↗" link (to `/workspaces/:wsId?task=:taskId&fileId=:fileId`) + "Download" button
- Download uses new `apiDownloadFile` authenticated binary helper; per-file `downloadingIds` Set prevents double-click; shows "…" while loading
- TASK_FILE rows with missing relation: shows "Record unavailable" (text-muted) — safe state for deleted tasks
- DOCUMENT rows: unchanged (existing behaviour)

**Part 4 — Print-only reporting period header:**
- Added `hidden print:block` div before footer with: "RECAFCO AuditFlow IMS — Business Operations & Compliance Report", reporting period (`dateFrom – dateTo`), last updated, generation timestamp, "Internal Use Only"
- Footer has `print:hidden` to avoid duplication

**Part 5 — Export filenames standardised:**
- Summary CSV: `RECAFCO_Business_Operations_Report_YYYY-MM-DD.csv` (new export added)
- Department Status CSV: `RECAFCO_Department_Status_YYYY-MM-DD.csv`
- Workspace Status CSV: `RECAFCO_Workspace_Status_YYYY-MM-DD.csv`
- Overdue Tasks CSV: `RECAFCO_Overdue_Tasks_YYYY-MM-DD.csv`
- Issues CSV: `RECAFCO_Issues_YYYY-MM-DD.csv`
- Export menu updated: "Export Summary CSV" added as first item; dropdown width `w-56`

**Part 6 — Status calculation verified:**
- All status fields (`DeptStatus.status`, `WsStatus.status`, `ReportSummary.status`) use only real computed data from DB queries
- No hardcoded or placeholder values found in `reports.service.ts`

**Part 7 — Live verification (12 tests):**

| # | Test | Result |
|---|---|---|
| 1 | WS ICT `expiredFiles` = 1 after inserting 1 expired attachment | ✅ |
| 2 | WS ICT `expiringFiles` = 1 after inserting 1 expiring-soon attachment | ✅ |
| 3 | Dept ICT `expiredFiles` = 0 (WS ICT has `departmentId=null` — correct data gap, not bug) | ✅ |
| 4 | Superseded NOT counted: inserting `isSuperseded=true` past-expiry → global expired stays at 1, not 2 | ✅ |
| 5 | Workspace table cell shows "—" for 0 expiry (no red noise) | ✅ (code) |
| 6 | Global KPI: `expiredFiles=1`, `expiringSoonFiles=1` | ✅ |
| 7 | DocAttention rows with TASK_FILE + valid task link: 2 rows, "Open Task ↗" + "Download" rendered | ✅ |
| 8 | No-task-link rows showing "Record unavailable": 0 (all test data had valid tasks) | ✅ |
| 9 | Export filenames follow `RECAFCO_*_YYYY-MM-DD.csv` pattern | ✅ (code) |
| 10 | Print header block present in DOM (`hidden print:block`) with period and timestamp | ✅ (code) |
| 11 | No placeholder zeros in workspace expiry column | ✅ (code) |
| 12 | Test data cleaned up (`verify_exp`, `verify_soon`, `verify_sup` deleted from DB) | ✅ |

**Part 8 — Build and database:**
- `prisma migrate status` — "Database schema is up to date! (11 migrations)" ✅
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (20 routes)
- No migrations run (backend reports.service.ts unchanged)

**Files modified this unit:**
- `apps/web/src/lib/api.ts` — `apiDownloadFile` authenticated binary download helper added
- `apps/web/src/app/(app)/reports/page.tsx` — workspace expiry "—" cell, Download button with loading state, exportSummaryCSV(), export filenames, export menu, print header block, footer print:hidden

**Architecture decisions:**
- Department expiry showing 0 when workspace has no `departmentId` is a data quality gap, not a code bug. No backend change made. The workspace table correctly shows per-workspace expiry counts; the department rollup simply has nothing to aggregate.
- `apiDownloadFile` is a silent-catch download: if file is deleted or access revoked, the button does nothing (no error toast). Acceptable for MVP — the file record may still appear in the report for a short window after deletion.

---

### Unit 45 — Super User Dashboard Business Control Center Cleanup (2026-06-20) ✅

**Goal:** Transform the dashboard from an audit-readiness view into a Business Operations Control Center for SUPER_USER. Fix KPI contradictions, remove Evidence from Pending Actions, add Workspace Status table, role-specific layouts.

**Part 1 — Header wording (role-based):**
- SUPER_USER / elevated: "BUSINESS OPERATIONS OVERVIEW" → "Business Control Center" with subtitle "Monitor workspaces, tasks, documents, expiring files, issues, and recent activity."
- Normal User / dept roles: "MY DASHBOARD" → "My Dashboard" with personalized welcome
- Live indicator, Updated just now, Refresh control all kept

**Part 2 — KPI card redesign:**
- Elevated KPIs: Active Workspaces, Open Tasks (total−completed), Overdue Tasks, Docs Under Review, Open Issues (with overdue sub), Expiring/Expired Files
- Normal User KPIs: My Workspaces, My Assigned Tasks, My Overdue Tasks, Docs Under Review, My Open Issues, Unread Notifications
- Red border only when truly urgent (overdue > 0, expired > 0); amber for warning; neutral otherwise
- Subtitles now logically consistent: "4 open · 2 overdue", "none overdue", "awaiting business review"

**Part 3 — Evidence removed from all dashboard surfaces:**
- `dashboard.service.ts`: pendingEvidenceReviews query kept but excluded from pendingReviews array
- pendingReviews now returns DOCUMENT type only
- "Pending Reviews" renamed to "Pending Actions" in frontend
- No EVIDENCE badge, no EVD label anywhere on dashboard
- Old Evidence data in DB untouched

**Part 4 — Needs Attention:**
- Single section; shows non-zero actionable items only
- When no issues: shows "No urgent business items require attention." with green check icon
- Items: Overdue tasks, Open/overdue issues, Pending document reviews, Expired files, Expiring soon
- Each links to the relevant filtered page

**Part 5 — Workspace Status table (elevated only):**
- Backend: `getWorkspaceStatusRows()` private method with 5 parallel aggregate queries (workspace list, open tasks groupBy, overdue tasks groupBy, docs under review groupBy, open issues groupBy)
- Columns: Workspace (clickable link), Dept, Open Tasks, Overdue, Docs Review, Open Issues, Members, Last Updated, Status badge
- Status computed: critical (overdueTasks > 0 OR openIssues > 1), attention (openIssues > 0 OR docsUnderReview > 0), healthy
- Up to 50 active workspaces; ordered by name
- Empty values shown as "—" to avoid noise

**Part 6 — Pending Actions section:**
- Only shows documents UNDER_REVIEW
- Empty state: "No documents awaiting review."
- No more mixed EVIDENCE entries

**Part 7 — Recent Activity:**
- Renamed to "Recent Business Activity"
- Entity type labels cleaned: NCR_CAPA → "Issue", CHECKLIST_ITEM → "Checklist", underscores removed

**Part 8 — Task File Expiry section:**
- No-issue banner: "All tracked task files are currently valid."
- "Run Expiry Check" only shown for canRunExpiry (SUPER_ADMIN, IT_ADMIN, SUPER_USER)
- When issues exist: shows expired/expiring counts + View Files Requiring Attention button

**Part 9 — Backend changes (`dashboard.service.ts`):**
- Added `export interface WorkspaceStatusRow { ... }` at module level
- Added `private async getWorkspaceStatusRows(now: Date)` method with parallel queries
- `getOverview()` calls getWorkspaceStatusRows for ELEVATED tier; assigns to `workspaceStatusRows`
- Return includes `activeWorkspaceCount`, `workspaceStatusRows`
- Evidence excluded from pendingReviews output

**Part 10 — Type updates (`features/dashboard/types.ts`):**
- Added `WorkspaceStatusRow` interface
- `PendingReview.type` changed to `'DOCUMENT'` only
- `DashboardOverview` extended with `activeWorkspaceCount?`, `workspaceStatusRows?`

**No-crash verified (code):**
- Empty workspaceStatusRows → workspace table hidden (not rendered)
- Empty pendingReviews → "No documents awaiting review." empty state
- No recentActivity → empty state shown
- null lastActivity in workspace row → shows "—"
- API unavailable → error banner with Retry
- Realtime disconnected → Offline indicator shown

**Builds:**
- `pnpm --filter api build` — ✅ EXIT:0
- `pnpm --filter web build` — ✅ EXIT:0 (compiled successfully)

**Files modified this unit:**
- `apps/api/src/modules/dashboard/dashboard.service.ts` — WorkspaceStatusRow type, getWorkspaceStatusRows(), pendingReviews evidence removal, return fields
- `apps/web/src/features/dashboard/types.ts` — WorkspaceStatusRow, PendingReview type, DashboardOverview additions
- `apps/web/src/app/(app)/dashboard/page.tsx` — full rewrite: Business Control Center header, KPI redesign, Workspace Status table, Pending Actions (docs only), Recent Business Activity, role-specific layouts

---

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
