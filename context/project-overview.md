# RECAFCO AuditFlow IMS

## Overview

RECAFCO AuditFlow IMS is an internal ISO Audit Readiness, Document Control, Task Management, Evidence Tracking, and NCR/CAPA system for RECAFCO.

The system is for internal company use only. It is inspired by Teamwork-style project management, but customized for RECAFCO’s ISO/QHSE audit preparation, department-wise document control, audit evidence tracking, corrective actions, reminders, approvals, and internal collaboration.

It helps responsible staff, department users, ISO/QHSE users, managers, and auditors organize ISO documents, upload evidence, assign tasks, track completion, manage audit readiness, and prepare for ISO audits in a controlled and traceable way.

## Branding

- Company name: **RECAFCO**
- Company website: `https://recafco.com/`
- Full system name: **RECAFCO AuditFlow IMS**
- Short system name: **AuditFlow IMS**
- Tagline: **Internal ISO & QHSE Audit Readiness System**
- Logo path: `apps/web/public/brand/recafco-logo.png`

## Goals

1. Build a production-ready ISO audit readiness MVP within 3 days.
2. Allow users to create ISO projects, task lists, pages, sub-pages, tasks, subtasks, comments, and file attachments.
3. Provide a structured document library for ISO forms, policies, procedures, certificates, audit evidence, and departmental records.
4. Support bulk upload of PDF, Word, Excel, image, and other common business files.
5. Track audit preparation status by department, task list, checklist item, and uploaded evidence.
6. Provide notifications and reminders for assigned tasks, due dates, pending approvals, rejected evidence, and overdue items.
7. Maintain audit logs for important system actions such as uploads, approvals, edits, deletes, status changes, and comments.
8. Keep the system scalable, reliable, fast, secure, and fully open-source.
9. Keep the system separate from the maintenance system in phase 1, but allow future integration if management approves.

## Core User Flow

1. User signs in using company email/username and password.
2. User lands on their dashboard showing assigned tasks, pending uploads, overdue items, and recent activity.
3. ISO/QHSE user creates an ISO audit project.
4. ISO/QHSE user creates department/task lists such as HR, ICT, Maintenance, Purchase, QC, HSE, IMS, Production, Sales, Tender, and others.
5. Users create pages, sub-pages, tasks, and subtasks under each department/task list.
6. Responsible users upload documents, evidence files, forms, certificates, and records.
7. Department manager or ISO/QHSE user reviews the uploaded evidence.
8. Evidence is approved, rejected, or returned for correction.
9. Notifications are sent for assignments, reminders, rejected uploads, overdue tasks, and pending review actions.
10. ISO/QHSE user monitors audit readiness through dashboard KPIs.
11. Auditor/viewer can access approved documents and evidence without editing them.

## Features

### ISO Workspace / Projects

- Create ISO audit projects.
- Create task lists by department or ISO category.
- Create pages and sub-pages inside projects.
- Create tasks and subtasks.
- Assign users or responsible persons.
- Set due dates, priorities, and statuses.
- Add comments and activity updates.
- Attach files to tasks, pages, checklist items, and documents.
- Support Teamwork-style list view, table view, and board view.

### Document Library

- Upload PDF, Word, Excel, PowerPoint, images, and other business document formats.
- Bulk upload multiple files at once.
- Organize files by department, category, project, and document type.
- Store file metadata in PostgreSQL.
- Store physical files in local storage for MVP.
- Prepare storage model so files can later move to MinIO on company server.
- Track document title, category, department, owner, version, status, review date, and expiry date.
- Support statuses: Draft, Under Review, Approved, Rejected, Archived.
- Keep old versions when a document is replaced.
- Allow only permitted users to approve, reject, archive, or delete documents.

### Audit Checklist

- Create audit checklist items by department or ISO category.
- Each checklist item can have responsible person, due date, status, comments, and evidence files.
- Track whether evidence is missing, submitted, approved, or rejected.
- Allow ISO/QHSE users to review checklist completion.
- Show department-wise readiness percentage.

### NCR / Corrective Action

- Create non-conformity or corrective action records.
- Capture finding title, department, severity, root cause, correction, corrective action, responsible person, target date, evidence, verification notes, and closure status.
- Support statuses: Open, In Progress, Waiting Evidence, Submitted, Verified, Closed, Rejected, Overdue.
- Allow responsible users to upload proof of correction.
- Allow ISO/QHSE users to verify and close corrective actions.

### Notifications and Reminders

- Notify users when a task is assigned.
- Notify users when evidence is rejected.
- Notify reviewers when evidence is submitted.
- Notify users before due dates.
- Notify users and managers when tasks become overdue.
- Notify ISO/QHSE users about pending approvals and open NCR/CAPA items.
- Store notifications in the database.
- Show unread count in the app header.

### Dashboards

- Staff dashboard:
  - My tasks
  - My pending uploads
  - My overdue items
  - My recent activity

- Department dashboard:
  - Department task completion
  - Pending evidence
  - Rejected evidence
  - Overdue tasks
  - Documents pending review

- ISO/QHSE dashboard:
  - Overall audit readiness percentage
  - Department readiness percentage
  - Total documents
  - Approved documents
  - Pending review documents
  - Rejected evidence
  - Open corrective actions
  - Overdue corrective actions
  - Recently uploaded files
  - Audit activity timeline

- Auditor/viewer dashboard:
  - Approved documents
  - Approved evidence
  - Department-wise document view
  - Read-only checklist status

## Scope

### In Scope

- User authentication.
- Role-based access control.
- ISO projects/workspaces.
- Department/task-list sidebar.
- Task creation, assignment, status, priority, due date, comments, and attachments.
- Pages and sub-pages.
- Document upload and bulk upload.
- Document metadata and version tracking.
- Audit checklist.
- Evidence upload and review.
- NCR/CAPA module.
- Notifications and reminders.
- Audit logs.
- Dashboard KPIs.
- English-only UI.
- Local PostgreSQL database.
- Local file storage for MVP.
- RECAFCO branding and logo usage.
- Production-ready deployment structure.

### Out of Scope

- CEO-specific approval flow in phase 1.
- Integration with the maintenance system in phase 1.
- WhatsApp notifications in phase 1.
- Email notifications in phase 1 unless SMTP details are provided.
- Native mobile application.
- AI/ML features.
- Public/customer-facing access.
- Payment features.
- Multi-language Arabic UI in phase 1.
- Advanced Gantt/time-tracking features unless explicitly requested later.

## Success Criteria

1. A signed-in user can open the ISO dashboard and see assigned work.
2. ISO/QHSE user can create an ISO project and department/task lists.
3. Users can create tasks, subtasks, pages, and sub-pages.
4. Users can upload individual files and bulk files.
5. Uploaded files are stored locally and metadata is saved in PostgreSQL.
6. Users can submit evidence for audit checklist items.
7. ISO/QHSE user can approve or reject submitted evidence.
8. NCR/CAPA records can be created, assigned, updated, verified, and closed.
9. Notifications are created for task assignment, due reminders, overdue items, evidence submission, and rejection.
10. Dashboard shows audit readiness percentage, pending evidence, overdue tasks, documents pending approval, and open corrective actions.
11. Important actions are written to audit logs.
12. RECAFCO branding appears on login page, sidebar, header/system identity area, and loading screen.
13. `npm run build` passes before marking any implementation phase complete.
