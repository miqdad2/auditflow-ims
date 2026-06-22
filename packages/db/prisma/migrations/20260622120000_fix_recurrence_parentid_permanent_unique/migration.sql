-- Unit 53.1: Replace status-filtered partial unique index with a
-- permanent, status-independent unique index on "recurrenceParentId".
--
-- PROBLEM with the old partial index (Unit 53 migration):
--   CREATE UNIQUE INDEX ... WHERE "recurrenceParentId" IS NOT NULL
--     AND "status" NOT IN ('COMPLETED', 'CANCELLED');
--   Once a child task is completed or cancelled, the partial index drops
--   its row, allowing the same source parent to spawn a second child.
--
-- SOLUTION: Remove the status filter entirely.
--   The new index covers ALL rows where "recurrenceParentId" IS NOT NULL,
--   regardless of the child's current status.
--   PostgreSQL UNIQUE indexes treat each NULL value as distinct (NULL ≠ NULL),
--   so root tasks ("recurrenceParentId" IS NULL) remain unconstrained.
--
-- INVARIANT AFTER THIS MIGRATION:
--   Task A may have at most one direct child (recurrenceParentId = A.id).
--   Completing or cancelling that child does NOT allow A to spawn another.
--   Each recurrence generation chains: A → B → C → … never branching.
--
-- DATA SAFETY: 0 rows with non-null "recurrenceParentId" confirmed before
--   this migration. No constraint violations possible.
--
-- Forward-only. Applied by: prisma migrate deploy (never migrate reset/push).

DROP INDEX IF EXISTS "tasks_recurrenceParentId_unique";

-- Permanent unique index — no status filter, no partial clause
CREATE UNIQUE INDEX "tasks_recurrenceParentId_unique"
  ON "tasks"("recurrenceParentId")
  WHERE "recurrenceParentId" IS NOT NULL;
