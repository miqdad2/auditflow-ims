-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "isHome" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "workspace_pinned_items" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_pinned_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_records" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_pinned_items_workspaceId_idx" ON "workspace_pinned_items"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_pinned_items_workspaceId_entityType_entityId_key" ON "workspace_pinned_items"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "linked_records_sourceType_sourceId_idx" ON "linked_records"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "linked_records_targetType_targetId_idx" ON "linked_records"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "linked_records_sourceType_sourceId_targetType_targetId_key" ON "linked_records"("sourceType", "sourceId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "workspace_pinned_items" ADD CONSTRAINT "workspace_pinned_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_pinned_items" ADD CONSTRAINT "workspace_pinned_items_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_records" ADD CONSTRAINT "linked_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
