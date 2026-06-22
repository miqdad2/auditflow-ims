-- AddColumns: Reference flag and recurrence scheduling fields on tasks
-- Forward-only, non-destructive. All existing rows keep default values.
-- isReference: false (existing tasks remain operational Action items)
-- recurrenceInterval: NONE (existing tasks are one-time, no recurrence)
-- recurrenceEndDate, recurrenceSeriesId, recurrenceParentId: null

ALTER TABLE "tasks"
  ADD COLUMN "isReference"          BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN "recurrenceInterval"   TEXT     NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recurrenceEndDate"    TIMESTAMP(3),
  ADD COLUMN "recurrenceSeriesId"   TEXT,
  ADD COLUMN "recurrenceParentId"   TEXT;

-- Index for efficient reference-task exclusion in BAC/dashboard queries
CREATE INDEX "tasks_isReference_idx" ON "tasks"("isReference");
-- Index for grouping recurrence series
CREATE INDEX "tasks_recurrenceSeriesId_idx" ON "tasks"("recurrenceSeriesId");
-- Idempotency: only one pending occurrence per source task
CREATE UNIQUE INDEX "tasks_recurrenceParentId_unique"
  ON "tasks"("recurrenceParentId")
  WHERE "recurrenceParentId" IS NOT NULL
    AND "status" NOT IN ('COMPLETED', 'CANCELLED');
