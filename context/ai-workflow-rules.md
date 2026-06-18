# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow.

The context files define what to build, how to build it, what the UI should look like, and the current implementation state. Always implement against these specs. Do not infer, invent, or silently change business behavior without updating the relevant context file.

This project is **RECAFCO AuditFlow IMS**, an internal ISO Audit Readiness & Document Control System for RECAFCO. The immediate goal is a production-ready MVP within 3 days for ISO audit preparation. Prioritize reliability, traceability, upload workflow, document control, audit checklist, task management, notifications, and dashboard visibility.

## Primary Rule

Do not build a generic Teamwork clone.

Build an ISO-focused internal system inspired by Teamwork-style project/task management.

The system must support:

- RECAFCO branding
- ISO projects/workspaces
- Department/task-list structure
- Pages and sub-pages
- Tasks and subtasks
- Document uploads and bulk uploads
- Evidence submission
- Evidence review
- Document statuses and versions
- Audit checklist
- NCR/CAPA
- Notifications/reminders
- Audit logs
- Department-wise readiness dashboard

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.
- Every meaningful change must be reflected in `progress-tracker.md`.
- If a requirement is ambiguous, add it to Open Questions before continuing.
- If the implementation changes architecture, update `architecture.md`.
- If the implementation changes UI patterns, update `ui-context.md`.
- If the implementation changes coding conventions, update `code-standards.md`.

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

## When to Split Work

Split an implementation step if it combines:

- Frontend UI and unrelated backend workflow logic.
- Multiple unrelated API modules.
- File upload/storage and dashboard reporting.
- Authentication and document approval workflow.
- Task management and NCR/CAPA workflow.
- Notification engine and unrelated UI redesign.
- Database schema changes across unrelated domains.
- Behavior not clearly defined in the context files.

If a change cannot be verified end to end quickly, the scope is too broad. Split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is missing, add it as an open question in `progress-tracker.md`.
- If a requirement is ambiguous but implementation can proceed safely, choose the simplest ISO-audit-ready behavior and document the decision under Architecture Decisions.
- Ask for confirmation only when the missing decision could cause rework, data loss, or incorrect security behavior.

## Implementation Discipline

For every feature unit:

1. Read the relevant context files.
2. Identify the smallest useful implementation unit.
3. Update or create database schema if needed.
4. Implement backend logic.
5. Implement frontend UI.
6. Add validation and permission checks.
7. Add audit logs where required.
8. Add notifications where required.
9. Test the flow manually.
10. Run build.
11. Update `progress-tracker.md`.

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*`
- Generated Prisma client files
- Third-party library internals
- Uploaded file storage contents outside application logic
- Existing migration files after they have been applied
- Lock files unless dependencies are intentionally changed

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model decisions
- Auth or permission model
- Code conventions or standards
- Feature scope
- UI layout or theme
- Database model
- Notification rules
- Audit log rules
- RECAFCO branding usage

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture.md` was violated.
3. `progress-tracker.md` reflects the completed work.
4. `npm run build` passes.
5. Important mutations have permission checks.
6. Important mutations create audit logs.
7. File upload/download endpoints enforce access control.
8. No paid cloud dependency is required for the MVP.

## Quality Bar

The project must be:

- Production-ready for internal company use.
- Fast enough for daily use.
- Reliable and recoverable.
- Easy to continue after handoff.
- Clear enough for another developer or AI coding agent to resume.
- Professional enough to show IT manager and management.
- Focused enough to be completed within the 3-day MVP window.
- Consistently branded as RECAFCO AuditFlow IMS.
