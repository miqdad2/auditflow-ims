# CLAUDE.md

## Application Building Context

This project is **RECAFCO AuditFlow ISO** — an internal ISO Audit Readiness, Document Control, Task Management, Evidence Tracking, and NCR/CAPA system for RECAFCO.

The system is inspired by Teamwork-style project management, but it must **not** become a generic Teamwork clone. It must be built specifically for ISO/QHSE audit readiness, document control, evidence submission, approval/rejection, audit checklist tracking, corrective actions, notifications, reminders, and dashboards.

The immediate target is a **production-ready 3-day MVP** that can be deployed locally first and later moved to the company server.

## Company Branding

Company name: **RECAFCO**
Company website: `https://recafco.com/`
System name: **AuditFlow ISO**
Full product name: **RECAFCO AuditFlow ISO**
Tagline: **Internal ISO Audit System**

Use the RECAFCO company logo throughout the application where appropriate:

* Login page
* Sidebar
* App header
* Loading screen
* System identity area

Expected logo path:

```txt
apps/web/public/brand/recafco-logo.png
```

Do not use placeholder logos, generic SaaS branding, or unrelated icons as the main product identity.

The UI should feel like an internal enterprise system for RECAFCO, not a public commercial SaaS product.

## Read Context First

Before implementing, editing, refactoring, or making any architectural decision, read the following files in order:

1. `context/project-overview.md` — product definition, goals, features, scope, success criteria
2. `context/architecture.md` — stack, system boundaries, storage model, roles, invariants
3. `context/ui-context.md` — theme, colors, typography, layout patterns, component conventions
4. `context/code-standards.md` — implementation rules, security rules, API rules, file upload rules
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, delivery approach, MVP priority
6. `context/progress-tracker.md` — current phase, completed work, open questions, next steps

Do not start implementation until the relevant context files have been reviewed.

## Product Direction

Build a production-ready MVP for ISO audit preparation.

The MVP must support:

* Authentication
* Users, roles, departments, and permissions
* ISO projects/workspaces
* Department/task-list structure
* Pages and sub-pages
* Tasks and subtasks
* Comments and activity history
* File upload and bulk upload
* Document library
* Document metadata and version tracking
* Audit checklist
* Evidence submission
* Evidence review and approval/rejection
* NCR/CAPA records
* In-app notifications and reminders
* Audit logs
* Dashboard KPIs

The system must be English-only for phase 1.

CEO-specific workflow is out of scope for phase 1.

Integration with the maintenance system is out of scope for phase 1, but the architecture should allow future integration.

## Technical Direction

Use the approved open-source stack:

* Frontend: Next.js + TypeScript
* Backend: NestJS + TypeScript
* Database: PostgreSQL
* ORM: Prisma
* UI: Tailwind CSS + shadcn/ui + Lucide React
* File storage for MVP: Local server storage
* Future file storage: MinIO
* Future background jobs: Redis + BullMQ

The MVP must run locally with PostgreSQL and local file storage.

Do not introduce paid cloud dependencies.

## PostgreSQL Rule

Use PostgreSQL as the main system database.

PostgreSQL must store:

* Users
* Roles
* Permissions
* Departments
* ISO projects
* Pages and sub-pages metadata
* Tasks and subtasks
* Comments
* Document metadata
* Document version history
* Audit checklist items
* Evidence records and statuses
* NCR/CAPA records
* Notifications
* Audit logs
* Dashboard data

PostgreSQL must **not** store uploaded file binaries.

Actual uploaded files such as PDF, Word, Excel, PowerPoint, images, and evidence attachments must be stored in local file storage for the MVP.

PostgreSQL stores only file metadata such as:

* Original file name
* Stored file name/key
* File path or storage key
* MIME type
* File size
* Uploader
* Related entity type
* Related entity ID
* Version
* Status
* Created date

Future server deployment should allow moving file storage from local disk to MinIO without changing the main business workflow.

## Non-Negotiable Architecture Rules

1. Backend permission checks are mandatory for every mutation.
2. Frontend role checks are only for user experience and must not be trusted for security.
3. Uploaded file binaries must not be stored in PostgreSQL.
4. PostgreSQL stores file metadata only.
5. Every uploaded file must have a database metadata record.
6. Approved ISO documents must not be hard-deleted by normal users.
7. Evidence approval/rejection must create an audit log entry.
8. NCR/CAPA closure must require verification by an authorized role.
9. Shared enums must be used for statuses, roles, priorities, and entity types.
10. Do not invent statuses or business rules outside the context files.
11. Every important ISO-related mutation must create an audit log.
12. The project must not require paid SaaS services for the MVP.

## MVP Priority Order

Build in this order unless explicitly instructed otherwise:

1. Project setup and base architecture
2. PostgreSQL and Prisma setup
3. Authentication and user model
4. Roles, departments, and permissions
5. ISO project/workspace model
6. Task lists and tasks
7. Pages and sub-pages
8. File upload and local storage
9. Document library
10. Bulk upload
11. Audit checklist
12. Evidence submission and review
13. Notifications
14. Audit logs
15. NCR/CAPA
16. Dashboards
17. Production build and deployment readiness

Do not jump ahead to later modules before the foundation is working.

## Implementation Rules

Work on one feature unit at a time.

Prefer small, verifiable increments over large speculative changes.

Do not combine unrelated system boundaries in one implementation step.

Split the work if it combines:

* Authentication and document approval workflow
* File upload and dashboard reporting
* Task management and NCR/CAPA workflow
* Notification engine and unrelated UI redesign
* Multiple unrelated API modules
* Large database changes across unrelated domains

If a change cannot be verified end to end quickly, the scope is too broad and must be split.

## Handling Missing Requirements

Do not invent product behavior that is not defined in the context files.

If a requirement is missing or ambiguous:

1. Add it to `context/progress-tracker.md` under Open Questions.
2. Continue only if there is a safe, simple MVP behavior.
3. Document any safe assumption under Architecture Decisions.
4. Ask for confirmation only when the decision could cause rework, data loss, security issues, or incorrect ISO workflow behavior.

## Documentation Sync Rules

Update `context/progress-tracker.md` after every meaningful implementation change.

If implementation changes the architecture, update:

* `context/architecture.md`

If implementation changes product scope, update:

* `context/project-overview.md`

If implementation changes UI patterns, update:

* `context/ui-context.md`

If implementation changes implementation rules or conventions, update:

* `context/code-standards.md`

If implementation changes workflow or build sequence, update:

* `context/ai-workflow-rules.md`

## Protected Files

Do not modify the following unless explicitly instructed:

* `components/ui/*`
* Generated Prisma client files
* Third-party library internals
* Existing applied migration files
* Uploaded file storage contents outside application logic
* Lock files unless dependency changes are intentional

## Security Rules

Passwords must be securely hashed.

Do not log passwords, tokens, secrets, private file paths, or internal stack traces.

All private file download/view endpoints must check permissions.

All upload endpoints must validate:

* File type
* File size
* Target entity
* User permission
* Entity ownership/access

Reject unsafe or executable files.

## Audit Log Rules

Create audit logs for:

* Project creation/update/delete
* Task creation/update/status change/delete
* Page and sub-page creation/update/delete
* Document upload/update/version change/approval/rejection/archive
* Evidence submission/approval/rejection
* NCR/CAPA creation/update/verification/closure
* Role or permission changes
* Important security-related events where useful

Audit logs must include:

* Actor user ID
* Action
* Entity type
* Entity ID
* Previous value where useful
* New value where useful
* Timestamp

## Notification Rules

Create in-app notifications for:

* Task assignment
* Due date reminders
* Overdue tasks
* Evidence submission
* Evidence rejection
* Document review pending
* NCR/CAPA assignment
* NCR/CAPA overdue

Notification failures must not break the main workflow unless the notification is critical.

Critical notification failures should be logged.

Avoid duplicate notifications for the same event and recipient.

## UI Rules

The UI must feel like a professional internal enterprise workspace.

Use the visual direction from `context/ui-context.md`.

Do not create an AI-looking dashboard.

Do not use excessive gradients, glassmorphism, childish icons, or decorative illustrations.

Use:

* Clean white/gray surfaces
* Strong left navigation
* Project/task-list sidebar
* Central workspace
* Clear status badges
* Compact readable rows
* Professional enterprise spacing

The layout should feel close to Teamwork in usability, but the product must remain ISO-focused.

## Build and Verification Rules

Before marking any feature unit complete:

1. The feature works end to end within its defined scope.
2. Backend permission checks are implemented.
3. Required audit logs are implemented.
4. Required notifications are implemented where applicable.
5. No architecture invariant is violated.
6. `context/progress-tracker.md` is updated.
7. `npm run build` passes.

If build fails, fix the root cause before moving to the next unit.

## Final Reminder

RECAFCO AuditFlow ISO is being built for a real company ISO audit timeline.

Prioritize:

* Reliability
* Traceability
* Security
* PostgreSQL-backed structured workflow
* Proper file metadata tracking
* Document control
* Evidence readiness
* Fast internal use
* Clear dashboards
* Production readiness

Do not overbuild non-MVP features before the audit-readiness workflow is complete.
