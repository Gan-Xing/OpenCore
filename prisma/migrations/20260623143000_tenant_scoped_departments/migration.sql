-- Cycle-022 T3d: make system departments tenant-owned and tenant-code unique.

ALTER TABLE "SystemDept" ADD COLUMN "tenantId" TEXT;

UPDATE "SystemDept"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "SystemDept" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemDept" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "SystemDept_code_key";

CREATE INDEX "SystemDept_tenantId_idx" ON "SystemDept"("tenantId");
CREATE INDEX "SystemDept_tenantId_parentId_order_idx" ON "SystemDept"("tenantId", "parentId", "order");
CREATE UNIQUE INDEX "SystemDept_tenantId_code_key" ON "SystemDept"("tenantId", "code");
CREATE UNIQUE INDEX "SystemDept_tenantId_id_key" ON "SystemDept"("tenantId", "id");

ALTER TABLE "SystemDept"
ADD CONSTRAINT "SystemDept_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SystemDept"
ADD CONSTRAINT "SystemDept_tenantId_parentId_fkey"
FOREIGN KEY ("tenantId", "parentId") REFERENCES "SystemDept"("tenantId", "id")
ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "TenantMembership"
ADD CONSTRAINT "TenantMembership_tenantId_deptId_fkey"
FOREIGN KEY ("tenantId", "deptId") REFERENCES "SystemDept"("tenantId", "id")
ON DELETE NO ACTION ON UPDATE CASCADE;
