-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'ORGANIZATION';

-- CreateIndex
CREATE INDEX "workspaces_visibility_idx" ON "workspaces"("visibility");

-- CreateIndex
CREATE INDEX "workspaces_departmentId_idx" ON "workspaces"("departmentId");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
