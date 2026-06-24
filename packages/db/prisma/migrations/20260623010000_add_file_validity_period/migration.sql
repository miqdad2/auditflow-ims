-- Unit 63.2: Standardized Document Validity
-- Adds validity_period and validity_start_date to file_attachments.
-- Existing expiryDate column is kept and reused (no rename, no drop).
-- Backfills validity_period for all pre-existing rows.

-- AddColumn
ALTER TABLE "file_attachments" ADD COLUMN "validity_period" TEXT;
ALTER TABLE "file_attachments" ADD COLUMN "validity_start_date" TIMESTAMP(3);

-- Backfill: rows with no expiry date → NONE (no validity tracking)
UPDATE "file_attachments"
SET "validity_period" = 'NONE'
WHERE "expiryDate" IS NULL AND "validity_period" IS NULL;

-- Backfill: rows with an existing expiry date but no validity period → CUSTOM_EXISTING
-- These are legacy rows uploaded before standardised validity was introduced.
UPDATE "file_attachments"
SET "validity_period" = 'CUSTOM_EXISTING'
WHERE "expiryDate" IS NOT NULL AND "validity_period" IS NULL;
