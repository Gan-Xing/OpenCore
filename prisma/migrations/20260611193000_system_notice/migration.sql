-- CreateTable
CREATE TABLE "SystemNotice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audience" TEXT NOT NULL DEFAULT 'all',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemNotice_status_type_idx" ON "SystemNotice"("status", "type");

-- CreateIndex
CREATE INDEX "SystemNotice_audience_pinned_idx" ON "SystemNotice"("audience", "pinned");
