# Production Data Baseline — Pre-Deployment Verification Queries

Generated: 2026-06-22  
Release: auditflow-ims-2026-06-22-r1

Purpose: Run these READ-ONLY queries against the production database BEFORE deployment to record
baseline counts. Run the same queries AFTER deployment to verify no unexpected data loss.

**IMPORTANT: These are read-only SELECT queries. Do not run any UPDATE/DELETE/INSERT/TRUNCATE.**

---

## Step 1 — Connect to Production PostgreSQL (read-only)

```cmd
REM On the production Windows server, open Command Prompt:
psql -U postgres -d auditflow_ims -h localhost
```

---

## Step 2 — Capture Baseline Counts (copy output to a text file)

Run these queries in sequence and save output:

```sql
-- Header
SELECT now() AS snapshot_time, current_database() AS db_name;

-- Users
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS active_users FROM users WHERE "isActive" = true;
SELECT COUNT(*) AS users_must_change_pw FROM users WHERE "mustChangePassword" = true;

-- Roles and Permissions
SELECT COUNT(*) AS total_roles FROM roles;
SELECT COUNT(*) AS total_permissions FROM permissions;
SELECT COUNT(*) AS role_permission_mappings FROM role_permissions;

-- Departments
SELECT COUNT(*) AS total_departments FROM departments;
SELECT COUNT(*) AS active_departments FROM departments WHERE "isActive" = true;

-- Workspaces
SELECT COUNT(*) AS total_workspaces FROM workspaces;
SELECT COUNT(*) AS active_workspaces FROM workspaces WHERE status = 'ACTIVE';
SELECT COUNT(*) AS archived_workspaces FROM workspaces WHERE status = 'ARCHIVED';

-- Workspace Members
SELECT COUNT(*) AS workspace_members FROM workspace_members;
SELECT "roleInWorkspace", COUNT(*) as count FROM workspace_members GROUP BY "roleInWorkspace" ORDER BY "roleInWorkspace";

-- Task Lists
SELECT COUNT(*) AS task_lists FROM task_lists;

-- Tasks
SELECT COUNT(*) AS total_tasks FROM tasks;
SELECT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY status;
SELECT COUNT(*) AS unassigned_tasks FROM tasks WHERE "assigneeId" IS NULL;
SELECT COUNT(*) AS reference_tasks FROM tasks WHERE "isReference" = true;
SELECT COUNT(*) AS recurring_tasks FROM tasks WHERE "recurrenceInterval" != 'NONE';

-- Task Comments
SELECT COUNT(*) AS task_comments FROM task_comments;

-- Activity Events
SELECT COUNT(*) AS activity_events FROM activity_events;

-- File Attachments
SELECT COUNT(*) AS total_attachments FROM file_attachments;
SELECT COUNT(*) AS active_attachments FROM file_attachments WHERE "isSuperseded" = false;
SELECT COUNT(*) AS superseded_attachments FROM file_attachments WHERE "isSuperseded" = true;
SELECT COUNT(*) AS attachments_with_expiry FROM file_attachments WHERE "expiryDate" IS NOT NULL;

-- Documents
SELECT COUNT(*) AS total_documents FROM documents;
SELECT status, COUNT(*) as count FROM documents GROUP BY status ORDER BY status;

-- Document Versions
SELECT COUNT(*) AS document_versions FROM document_versions;

-- Notifications
SELECT COUNT(*) AS total_notifications FROM notifications;
SELECT COUNT(*) AS unread_notifications FROM notifications WHERE "readAt" IS NULL;
SELECT category, COUNT(*) as count FROM notifications GROUP BY category ORDER BY category;

-- Audit Logs
SELECT COUNT(*) AS audit_log_entries FROM audit_logs;

-- NCR/CAPA
SELECT COUNT(*) AS total_ncr_capa FROM ncr_capa;
SELECT status, COUNT(*) as count FROM ncr_capa GROUP BY status ORDER BY status;

-- Audit Checklists
SELECT COUNT(*) AS audit_checklists FROM audit_checklists;
SELECT COUNT(*) AS checklist_items FROM audit_checklist_items;
SELECT COUNT(*) AS checklist_evidence FROM checklist_evidence;

-- Pages
SELECT COUNT(*) AS total_pages FROM pages;

-- Linked Records
SELECT COUNT(*) AS linked_records FROM linked_records;

-- Workspace Pinned Items
SELECT COUNT(*) AS pinned_items FROM workspace_pinned_items;

-- System Error Logs
SELECT COUNT(*) AS system_error_logs FROM system_error_logs;

-- Migration history (verify applied migrations)
SELECT id, "appliedAt" FROM "_prisma_migrations" ORDER BY "appliedAt";
```

---

## Step 3 — File-Reference Integrity Check (read-only)

```sql
-- Count attachments with physical-file path stored
SELECT COUNT(*) AS attachments_with_storage_path
FROM file_attachments
WHERE "storagePath" IS NOT NULL AND "storagePath" != '';

-- Check for duplicate storagePaths (should be zero)
SELECT "storagePath", COUNT(*) as count
FROM file_attachments
GROUP BY "storagePath"
HAVING COUNT(*) > 1;

-- Document versions with storage paths
SELECT COUNT(*) AS doc_versions_with_paths
FROM document_versions
WHERE "storagePath" IS NOT NULL;

-- Orphaned workspace members (user no longer exists)
SELECT COUNT(*) AS orphaned_members
FROM workspace_members wm
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = wm."userId");

-- Tasks assigned to inactive users
SELECT COUNT(*) AS tasks_assigned_to_inactive
FROM tasks t
JOIN users u ON t."assigneeId" = u.id
WHERE u."isActive" = false;

-- Duplicate recurrenceParentId check (must be zero — the unique index enforces this)
SELECT "recurrenceParentId", COUNT(*) as count
FROM tasks
WHERE "recurrenceParentId" IS NOT NULL
GROUP BY "recurrenceParentId"
HAVING COUNT(*) > 1;
```

---

## Step 4 — Post-Deployment Comparison

After deployment, re-run all Step 2 queries and compare:

| Metric | Pre-Deploy | Post-Deploy | Δ Expected |
|---|---|---|---|
| total_users | __ | __ | 0 |
| active_users | __ | __ | 0 |
| workspace_members | __ | __ | 0 |
| total_tasks | __ | __ | 0 |
| total_attachments | __ | __ | 0 |
| total_documents | __ | __ | 0 |
| total_notifications | __ | __ | 0 |
| audit_log_entries | __ | __ | ≥0 (new entries from migration itself are OK) |
| migration count | __ | __ | +new migrations only |

**Any unexpected reduction in user/task/document/attachment/notification counts is a NO-GO.**

---

## Step 5 — Unique Constraint Pre-Checks

Run before deployment. If any query returns rows, investigate before proceeding:

```sql
-- Duplicate workspace members (should be zero)
SELECT "workspaceId", "userId", COUNT(*)
FROM workspace_members
GROUP BY "workspaceId", "userId"
HAVING COUNT(*) > 1;

-- Duplicate role-permission pairs (should be zero)
SELECT "roleId", "permissionId", COUNT(*)
FROM role_permissions
GROUP BY "roleId", "permissionId"
HAVING COUNT(*) > 1;

-- Duplicate user emails (should be zero)
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Duplicate usernames (should be zero)
SELECT username, COUNT(*) FROM users GROUP BY username HAVING COUNT(*) > 1;

-- Duplicate recurrenceParentId (should be zero)
SELECT "recurrenceParentId", COUNT(*)
FROM tasks
WHERE "recurrenceParentId" IS NOT NULL
GROUP BY "recurrenceParentId"
HAVING COUNT(*) > 1;
```
