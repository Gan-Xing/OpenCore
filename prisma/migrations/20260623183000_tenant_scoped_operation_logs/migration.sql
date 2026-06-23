-- Cycle-022 T4c: make operation audit logs tenant-owned and tenant-scoped.

ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT;

UPDATE "AuditLog"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_tenantId_resource_createdAt_idx" ON "AuditLog"("tenantId", "resource", "createdAt");

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
