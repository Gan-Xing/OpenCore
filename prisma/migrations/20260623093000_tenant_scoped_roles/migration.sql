-- Cycle-022 T3b: make system roles tenant-owned and tenant-code unique.

ALTER TABLE "Role" ADD COLUMN "tenantId" TEXT;

UPDATE "Role"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "Role" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

ALTER TABLE "TenantMembershipRole" DROP CONSTRAINT IF EXISTS "TenantMembershipRole_roleId_fkey";

DROP INDEX IF EXISTS "Role_code_key";

CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");
CREATE UNIQUE INDEX "Role_tenantId_code_key" ON "Role"("tenantId", "code");
CREATE UNIQUE INDEX "Role_tenantId_id_key" ON "Role"("tenantId", "id");

ALTER TABLE "Role"
ADD CONSTRAINT "Role_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantMembershipRole"
ADD CONSTRAINT "TenantMembershipRole_tenantId_roleId_fkey"
FOREIGN KEY ("tenantId", "roleId") REFERENCES "Role"("tenantId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;
