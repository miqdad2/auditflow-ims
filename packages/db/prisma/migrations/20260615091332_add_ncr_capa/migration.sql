-- CreateTable
CREATE TABLE "ncr_capa" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'NCR',
    "severity" TEXT NOT NULL DEFAULT 'MINOR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "isoClause" TEXT,
    "workspaceId" TEXT,
    "departmentId" TEXT,
    "checklistItemId" TEXT,
    "raisedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "verifiedById" TEXT,
    "closedById" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "dueDate" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ncr_capa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncr_capa_comments" (
    "id" TEXT NOT NULL,
    "ncrCapaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ncr_capa_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ncr_capa_ncrNumber_key" ON "ncr_capa"("ncrNumber");

-- CreateIndex
CREATE INDEX "ncr_capa_status_idx" ON "ncr_capa"("status");

-- CreateIndex
CREATE INDEX "ncr_capa_severity_idx" ON "ncr_capa"("severity");

-- CreateIndex
CREATE INDEX "ncr_capa_departmentId_idx" ON "ncr_capa"("departmentId");

-- CreateIndex
CREATE INDEX "ncr_capa_workspaceId_idx" ON "ncr_capa"("workspaceId");

-- CreateIndex
CREATE INDEX "ncr_capa_raisedById_idx" ON "ncr_capa"("raisedById");

-- CreateIndex
CREATE INDEX "ncr_capa_assignedToId_idx" ON "ncr_capa"("assignedToId");

-- CreateIndex
CREATE INDEX "ncr_capa_comments_ncrCapaId_idx" ON "ncr_capa_comments"("ncrCapaId");

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "audit_checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa" ADD CONSTRAINT "ncr_capa_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa_comments" ADD CONSTRAINT "ncr_capa_comments_ncrCapaId_fkey" FOREIGN KEY ("ncrCapaId") REFERENCES "ncr_capa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr_capa_comments" ADD CONSTRAINT "ncr_capa_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
