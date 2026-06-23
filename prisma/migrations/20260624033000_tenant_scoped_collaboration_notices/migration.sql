ALTER TABLE "CollaborationNotice" ADD COLUMN "tenantId" TEXT;

UPDATE "CollaborationNotice"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "CollaborationNotice"
  ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root',
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "CollaborationNotice_status_createdAt_idx";
DROP INDEX IF EXISTS "CollaborationNotice_createdBy_createdAt_idx";

CREATE INDEX "CollaborationNotice_tenantId_status_createdAt_idx"
  ON "CollaborationNotice"("tenantId", "status", "createdAt");

CREATE INDEX "CollaborationNotice_tenantId_createdBy_createdAt_idx"
  ON "CollaborationNotice"("tenantId", "createdBy", "createdAt");

ALTER TABLE "CollaborationNotice"
  ADD CONSTRAINT "CollaborationNotice_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
