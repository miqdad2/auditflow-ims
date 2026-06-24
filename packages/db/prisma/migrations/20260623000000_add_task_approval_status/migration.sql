-- Unit 63.1 — Private Member Task Approval Workflow
-- Additive migration: no existing column removed, no data deleted.
-- All existing tasks default to 'APPROVED' — they remain fully official.
-- New MEMBER-created tasks are set to 'PENDING' in service logic only.

ALTER TABLE "tasks"
  ADD COLUMN "approval_status"      TEXT        NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approval_note"        TEXT,
  ADD COLUMN "approval_review_note" TEXT,
  ADD COLUMN "approval_reviewed_at" TIMESTAMP(3),
  ADD COLUMN "approval_reviewed_by_id" TEXT;

-- Index for pending task queries (approval queue, BAC detection, metrics)
CREATE INDEX "tasks_approval_status_idx" ON "tasks" ("approval_status");
