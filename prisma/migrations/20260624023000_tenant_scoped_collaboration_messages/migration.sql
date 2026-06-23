ALTER TABLE "CollaborationMessage" ADD COLUMN "tenantId" TEXT;

UPDATE "CollaborationMessage"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "CollaborationMessage"
  ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root',
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "CollaborationMessage_recipient_status_createdAt_idx";
DROP INDEX IF EXISTS "CollaborationMessage_sender_createdAt_idx";
DROP INDEX IF EXISTS "CollaborationMessage_businessType_businessId_idx";
DROP INDEX IF EXISTS "CollaborationMessage_deletedAt_idx";

CREATE INDEX "CollaborationMessage_tenantId_recipient_status_createdAt_idx"
  ON "CollaborationMessage"("tenantId", "recipient", "status", "createdAt");

CREATE INDEX "CollaborationMessage_tenantId_sender_createdAt_idx"
  ON "CollaborationMessage"("tenantId", "sender", "createdAt");

CREATE INDEX "CollaborationMessage_tenantId_businessType_businessId_idx"
  ON "CollaborationMessage"("tenantId", "businessType", "businessId");

CREATE INDEX "CollaborationMessage_tenantId_deletedAt_idx"
  ON "CollaborationMessage"("tenantId", "deletedAt");

ALTER TABLE "CollaborationMessage"
  ADD CONSTRAINT "CollaborationMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
