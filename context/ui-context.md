# UI Context

## Theme

The UI must feel like a professional internal enterprise workspace for **RECAFCO AuditFlow ISO**.

This is not a public SaaS product and must not look like an AI-generated dashboard. It is an internal ISO/QHSE audit readiness, document control, task management, evidence tracking, and NCR/CAPA system for RECAFCO staff.

The visual language should be clean, calm, reliable, and suitable for a large industrial/construction company preparing for ISO audit.

Default theme for MVP: **Light mode**.

Dark mode is out of scope for phase 1 unless explicitly requested later.

## Branding

The application is branded for RECAFCO.

- Company name: RECAFCO
- Company website: https://recafco.com/
- Full system name: RECAFCO AuditFlow ISO
- Short system name: AuditFlow ISO
- Tagline: Internal ISO Audit System
- Company logo path: `apps/web/public/brand/recafco-logo.png`

Logo usage:

- Login page: large RECAFCO logo above system name
- Sidebar: compact RECAFCO logo with `AuditFlow ISO`
- App header: optional small logo or text identity
- Loading screen: centered logo with system name
- Empty states: logo may be used lightly, but do not overuse it

Do not use placeholder logos, generic SaaS branding, random icons, or unrelated illustrations as the main product identity.

The app should feel like a RECAFCO internal system, not a commercial product being sold to the public.

## Visual Direction

- Professional enterprise SaaS workspace
- ISO/QHSE and document-control focused
- Inspired by Teamwork-style project navigation
- Clean white and soft-gray surfaces
- Strong left navigation
- Department/task-list secondary sidebar
- Large central workspace
- Optional right-side detail drawer
- Clear status badges
- Compact readable tables and task rows
- Subtle borders and shadows
- Minimal gradients
- No glassmorphism
- No childish illustrations
- No excessive animation
- No overuse of bright colors
- No AI-looking decorative dashboard cards

The design should support heavy daily use by ISO/QHSE users, department managers, staff, and auditors/viewers.

## Colors

All components must use CSS variables. Do not hardcode hex values inside components.

| Role | CSS Variable | Value |
| --- | --- | --- |
| Page background | `--bg-base` | `#F8FAFC` |
| Surface | `--bg-surface` | `#FFFFFF` |
| Surface muted | `--bg-muted` | `#F1F5F9` |
| Surface subtle | `--bg-subtle` | `#F8FAFC` |
| Primary text | `--text-primary` | `#0F172A` |
| Secondary text | `--text-secondary` | `#334155` |
| Muted text | `--text-muted` | `#64748B` |
| Disabled text | `--text-disabled` | `#94A3B8` |
| Brand red | `--brand-red` | `#DC2626` |
| Primary accent | `--accent-primary` | `#2563EB` |
| Accent hover | `--accent-hover` | `#1D4ED8` |
| Accent soft | `--accent-soft` | `#DBEAFE` |
| Sidebar background | `--sidebar-bg` | `#064E5F` |
| Sidebar active | `--sidebar-active` | `#0E7490` |
| Sidebar text | `--sidebar-text` | `#ECFEFF` |
| Sidebar muted text | `--sidebar-muted` | `#A5F3FC` |
| Border | `--border-default` | `#E2E8F0` |
| Border strong | `--border-strong` | `#CBD5E1` |
| Error | `--state-error` | `#DC2626` |
| Error soft | `--state-error-soft` | `#FEE2E2` |
| Warning | `--state-warning` | `#D97706` |
| Warning soft | `--state-warning-soft` | `#FEF3C7` |
| Success | `--state-success` | `#16A34A` |
| Success soft | `--state-success-soft` | `#DCFCE7` |
| Info | `--state-info` | `#2563EB` |
| Info soft | `--state-info-soft` | `#DBEAFE` |

## Status Badge Colors

Use consistent badge styles across tasks, documents, evidence, checklist items, and NCR/CAPA.

| Status Type | Visual Style |
| --- | --- |
| Draft / Not Started | Gray badge |
| In Progress | Blue badge |
| Under Review / Submitted | Amber badge |
| Approved / Completed / Closed | Green badge |
| Rejected | Red badge |
| Overdue / Critical | Red badge with stronger emphasis |
| Archived / Cancelled | Muted gray badge |

Do not create random colors for each page. Status colors must remain consistent across the system.

## Typography

| Role | Font | Variable |
| --- | --- | --- |
| UI text | Geist Sans or Inter | `--font-sans` |
| Code/mono | Geist Mono | `--font-mono` |

Typography rules:

- Use clear enterprise typography.
- Page titles should be strong but not oversized.
- Tables and task rows should be compact and readable.
- Avoid decorative fonts.
- Avoid large marketing-style hero typography inside the app.

## Border Radius

| Context | Class |
| --- | --- |
| Inline / small UI | `rounded-md` |
| Buttons | `rounded-lg` |
| Cards / panels | `rounded-xl` |
| Modals / overlays | `rounded-2xl` |
| Pills / badges | `rounded-full` |

## Component Library

Use shadcn/ui on top of Tailwind CSS.

Use Lucide React icons.

Components from `components/ui/` are protected generated UI primitives.

Do not directly modify generated shadcn/ui primitive files unless explicitly instructed.

Build feature-specific components outside `components/ui/`.

Prefer composition over modifying base UI primitives.

## Main App Layout

The main authenticated app should use a professional enterprise workspace layout:

- Fixed left primary sidebar
- Top header
- Optional secondary sidebar for project/task-list navigation
- Large central workspace
- Optional right drawer for details, comments, file metadata, or activity

### Left Primary Sidebar

Contains:

- RECAFCO logo
- AuditFlow ISO short name
- Dashboard
- ISO Workspaces
- Tasks
- Documents
- Audit Checklist
- Evidence
- NCR/CAPA
- Notifications
- Reports
- Settings/Admin, only for authorized roles

Sidebar behavior:

- Fixed on desktop
- Collapsible on smaller screens
- Active item clearly highlighted
- Use Lucide icons only
- Keep labels short and professional

### Top Header

Contains:

- Breadcrumbs
- Current page/project title
- Global search
- Quick create button
- Notification bell with unread count
- User profile menu

Header must remain clean. Do not overload it with too many actions.

### Secondary Sidebar

Used inside ISO workspace/project pages.

Contains department/task-list sections such as:

- All Lists
- ISO Certificates
- MR/ER Appointment
- QHSE Policy
- Quality Objectives
- MR ISO Files
- QHSE Management System
- HR
- ICT
- Estimation & Tendering
- Purchasing & Stores
- Civil Engineering Contracts
- Operation/RMC Production
- Maintenance
- Technical Design & QC
- Project Site
- ISO Forms

The secondary sidebar should feel similar to Teamwork-style task-list navigation but customized for ISO document and audit readiness structure.

## Page Layout Patterns

### Dashboard Layout

Dashboard should show:

- Overall audit readiness percentage
- Department readiness cards
- My assigned tasks
- Pending evidence
- Overdue tasks
- Documents pending review
- Open NCR/CAPA
- Recent activity timeline

Dashboard design rules:

- Use compact KPI cards
- Use readable charts only if useful
- Avoid decorative graphs that do not help audit readiness
- Use clear drill-down links
- Show urgent/overdue items clearly

### ISO Workspace Layout

Header:

- Workspace/project name
- Status
- View tabs:
  - Overview
  - List
  - Table
  - Board
  - Pages
  - Documents
  - Checklist
  - Evidence
  - NCR/CAPA
  - Activity

Main content:

- Task rows (root tasks only — subtasks rendered inside task detail panel)
- Drag handle (`⠿`, `ChevronsUp`/`ChevronUp`/`ChevronDown`/`ChevronsDown` icons) — visible only in manual-order / All / no-search mode
- Assignee pill
- Status badge
- Priority badge
- Attachment count
- Comment count
- Subtask count
- Due date
- Add task row

### Active Task List Selection Rule

The selected task list is preserved across all workspace operations. Selection changes only occur when:
- **No list has ever been selected** (initial workspace load): fall back to the first available list.
- **The selected list was deleted**: fall back to the next available list.
- **The workspace changed**: reset selection for the new workspace.
- **User explicitly clicks a different list**: switch to that list.

**Never reset the selection** on background refresh, realtime events, task creation, task updates, or task reorder. The authoritative rule is implemented via functional `setSelectedListId((currentId) => ...)` in `loadWorkspace` / `refreshWorkspaceQuiet`: if `currentId` exists and is still in the refreshed task list array, return `currentId`; otherwise fall back to `taskLists[0]?.id`.

### Task Reorder UX

Manual drag-and-drop ordering uses the HTML5 drag API:
- A `⠿` drag handle column appears at the left of each row when reorder is available.
- Dragging starts only from the handle cell; clicking the row still opens the task.
- The dragged row is visually faded (opacity 0.4). The drop target row shows a blue outline.
- On drop, `performReorder()` is called — one atomic request, optimistic update, instant rollback on failure.

Fallback three-dot menu actions (all four available when applicable):
- **Move to top** (`ChevronsUp`) — hidden for first row
- **Move up** (`ChevronUp`) — hidden for first row
- **Move down** (`ChevronDown`) — hidden for last row
- **Move to bottom** (`ChevronsDown`) — hidden for last row

Reorder is enabled only when: `taskFilter === 'all'`, `taskSort === 'manual'`, no active search, `canCollaborate`. A hint banner appears for collaborators when any of these conditions is not met.

### Pages and Sub-Pages Layout

Use a clean document editor style:

- Left tree for pages/sub-pages
- Center content editor/viewer
- Right metadata panel when needed

Each page should support:

- Title
- Content/body text
- Attachments
- Linked tasks
- Comments
- Activity history

### Document Library Layout

Use a professional file-management layout:

- Folder/category sidebar
- Document table/list
- Upload button
- Bulk upload button
- Search and filters

Document table columns:

- Document title
- Department
- Category
- Version
- Status
- Owner
- Uploaded by
- Review date
- Expiry date
- Last updated
- Actions

Actions:

- Preview/view if supported
- Download
- Upload new version
- Submit for review
- Approve/reject, only authorized users
- Archive, only authorized users

### Audit Checklist Layout

Use checklist/table layout:

- Department/category filter
- Checklist item title
- Responsible person
- Due date
- Evidence status
- Attached evidence count
- Reviewer
- Status
- Actions

Each checklist item should allow:

- Evidence upload
- Comment
- Submit for review
- Approve/reject
- Mark complete

### Evidence Review Layout

Use review-focused layout:

- Submitted evidence list
- Related checklist item
- Department
- Submitted by
- Submitted date
- File attachments
- Reviewer action
- Approval/rejection comment

Rejection should require a reason.

### NCR/CAPA Layout

Use action-tracking layout:

Tabs:

- Open
- In Progress
- Waiting Evidence
- Submitted
- Verified
- Closed
- Overdue

Table columns:

- Finding title
- Department
- Severity
- Responsible person
- Target date
- Status
- Evidence
- Verification
- Actions

NCR/CAPA detail page should show:

- Finding details
- Root cause
- Correction
- Corrective action
- Responsible user
- Target date
- Evidence attachments
- Verification notes
- Closure status
- Activity history

## Icons

Use Lucide React only.

Icon sizing:

- Inline icons: `h-4 w-4`
- Button icons: `h-5 w-5`
- Sidebar icons: `h-6 w-6`
- Empty state icons: `h-10 w-10` maximum

Do not mix filled icons, emoji icons, or unrelated icon libraries.

## Interaction Rules

- All destructive actions require confirmation.
- Upload progress must be visible.
- Failed upload must show a clear retry option.
- Bulk upload must show success/failure per file.
- Validation errors must be shown near the relevant field.
- Status changes must be clear and traceable.
- Approval/rejection actions must show confirmation.
- Rejection actions must require a comment/reason.
- Empty states must explain what to do next.
- Long lists must support search, filter, and pagination.
- Important actions must show success/error toast feedback.

## Responsive Rules

Desktop-first for MVP.

Must work properly on:

- Desktop monitor
- Laptop screen
- Tablet/basic mobile browser access

On smaller screens:

- Collapse primary sidebar
- Convert secondary sidebar into drawer
- Keep upload and task actions accessible
- Avoid horizontal overflow where possible
- Tables may switch to card-style rows where needed

## Accessibility Rules

- Maintain readable contrast.
- Buttons must have clear labels or accessible labels.
- Form inputs must have labels.
- Status should not depend on color alone.
- Keyboard navigation should work for core forms and modals.
- Avoid tiny click targets.

## Executive Dashboard Layout

For users with `dashboardExperience = EXECUTIVE`, the dashboard uses a simplified focused layout.

### Executive Sidebar

```
Dashboard (→ /executive-dashboard)
ISO Workspaces
Reports
Notifications
```

Hidden from Executive sidebar: My Tasks, Admin Settings, System Health, System Errors, User Management, Departments (unless the account also holds a qualifying system-access role).

### Executive Dashboard Sections (Unit 66.2)

**Primary KPI grid** — 4 cards in `grid-cols-2 lg:grid-cols-4`:
- Active Workspaces
- Critical Issues
- Overdue Actions
- Expiring Files

**Secondary performance strip** (compact, 3-column):
- Awaiting Review
- Completion Rate
- Completed This Week

**Below the KPIs:**
- Organization Health (workspace-level health table)
- Compliance & Risk Summary + Department Performance (2-col grid)
- Recent Significant Activity

**Removed sections** (not shown in Executive Dashboard):
- Compliance Health KPI card
- Pending Decisions KPI card
- Executive Summary strip
- Requires Executive Attention panel
- Decisions Awaiting You panel

Backend API still returns these fields — they are simply not rendered in the UI.

## What Not To Build

Do not build:

- Public marketing homepage
- Public signup/pricing page
- Generic SaaS landing page
- Decorative AI-style analytics page
- CEO approval workflow in phase 1
- Arabic UI in phase 1
- Dark mode in phase 1 unless explicitly requested
- Overcomplicated animation-heavy interface
- Random placeholder brand identity
