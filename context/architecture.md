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

## Future Integration Notes

- The system is separate from the maintenance system in phase 1.
- Future integration may connect maintenance work orders, vehicle inspections, asset records, purchase records, supplier records, and calibration records as ISO audit evidence.
- MinIO should replace local file storage when deployed to company server.
- Redis + BullMQ should be introduced for robust scheduled reminders and background processing after MVP.
