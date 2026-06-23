-- Cycle-022 T4f: make file assets tenant-owned and tenant-keyed in object storage.

ALTER TABLE "FileAsset" ADD COLUMN "tenantId" TEXT;

UPDATE "FileAsset" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;

ALTER TABLE "FileAsset" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FileAsset" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "FileAsset_storageKey_key";

CREATE UNIQUE INDEX "FileAsset_tenantId_storageKey_key" ON "FileAsset"("tenantId", "storageKey");
CREATE INDEX "FileAsset_tenantId_createdAt_idx" ON "FileAsset"("tenantId", "createdAt");

ALTER TABLE "FileAsset"
ADD CONSTRAINT "FileAsset_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
