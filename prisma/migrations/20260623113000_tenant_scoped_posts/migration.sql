-- Cycle-022 T3c: make system posts tenant-owned and tenant-code unique.

ALTER TABLE "SystemPost" ADD COLUMN "tenantId" TEXT;

UPDATE "SystemPost"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "SystemPost" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemPost" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

ALTER TABLE "TenantMembershipPost" DROP CONSTRAINT IF EXISTS "TenantMembershipPost_postId_fkey";

DROP INDEX IF EXISTS "SystemPost_code_key";

CREATE INDEX "SystemPost_tenantId_idx" ON "SystemPost"("tenantId");
CREATE UNIQUE INDEX "SystemPost_tenantId_code_key" ON "SystemPost"("tenantId", "code");
CREATE UNIQUE INDEX "SystemPost_tenantId_id_key" ON "SystemPost"("tenantId", "id");

ALTER TABLE "SystemPost"
ADD CONSTRAINT "SystemPost_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantMembershipPost"
ADD CONSTRAINT "TenantMembershipPost_tenantId_postId_fkey"
FOREIGN KEY ("tenantId", "postId") REFERENCES "SystemPost"("tenantId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;
