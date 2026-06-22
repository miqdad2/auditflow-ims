-- AlterTable
ALTER TABLE "file_attachments" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "isSuperseded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issueDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reminderDays" INTEGER,
ADD COLUMN     "renewedFromId" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "system_error_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_error_logs_severity_idx" ON "system_error_logs"("severity");

-- CreateIndex
CREATE INDEX "system_error_logs_source_idx" ON "system_error_logs"("source");

-- CreateIndex
CREATE INDEX "system_error_logs_resolvedAt_idx" ON "system_error_logs"("resolvedAt");

-- CreateIndex
CREATE INDEX "system_error_logs_createdAt_idx" ON "system_error_logs"("createdAt");

-- CreateIndex
CREATE INDEX "file_attachments_expiryDate_idx" ON "file_attachments"("expiryDate");

-- CreateIndex
CREATE INDEX "tasks_taskListId_sortOrder_idx" ON "tasks"("taskListId", "sortOrder");

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "file_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
