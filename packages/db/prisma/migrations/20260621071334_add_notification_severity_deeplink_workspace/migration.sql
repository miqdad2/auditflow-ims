-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "deepLink" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'INFO',
ADD COLUMN     "workspaceId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_recipientId_category_idx" ON "notifications"("recipientId", "category");
