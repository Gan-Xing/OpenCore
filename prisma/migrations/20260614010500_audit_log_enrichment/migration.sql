ALTER TABLE "AuditLog"
  ADD COLUMN "location" TEXT NOT NULL DEFAULT 'Unknown',
  ADD COLUMN "durationMs" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_resource_createdAt_idx" ON "AuditLog"("resource", "createdAt");
CREATE INDEX "AuditLog_location_idx" ON "AuditLog"("location");
