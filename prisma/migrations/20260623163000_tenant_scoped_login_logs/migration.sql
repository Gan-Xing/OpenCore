-- Cycle-022 T4b: make login logs tenant-owned and tenant-scoped.

ALTER TABLE "LoginLog" ADD COLUMN "tenantId" TEXT;

UPDATE "LoginLog"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "LoginLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "LoginLog" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

CREATE INDEX "LoginLog_tenantId_createdAt_idx" ON "LoginLog"("tenantId", "createdAt");
CREATE INDEX "LoginLog_tenantId_username_createdAt_idx" ON "LoginLog"("tenantId", "username", "createdAt");

ALTER TABLE "LoginLog"
ADD CONSTRAINT "LoginLog_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
