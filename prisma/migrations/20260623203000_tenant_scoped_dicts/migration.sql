-- Cycle-022 T4d: make system dictionaries tenant-owned and tenant-code unique.

ALTER TABLE "DictType" ADD COLUMN "tenantId" TEXT;

UPDATE "DictType"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "DictType" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DictType" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "DictType_code_key";
DROP INDEX IF EXISTS "DictType_enabled_createdAt_idx";
DROP INDEX IF EXISTS "DictType_deletedAt_createdAt_idx";

CREATE INDEX "DictType_tenantId_enabled_createdAt_idx" ON "DictType"("tenantId", "enabled", "createdAt");
CREATE INDEX "DictType_tenantId_deletedAt_createdAt_idx" ON "DictType"("tenantId", "deletedAt", "createdAt");
CREATE UNIQUE INDEX "DictType_tenantId_code_key" ON "DictType"("tenantId", "code");
CREATE UNIQUE INDEX "DictType_tenantId_id_key" ON "DictType"("tenantId", "id");

ALTER TABLE "DictType"
ADD CONSTRAINT "DictType_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
