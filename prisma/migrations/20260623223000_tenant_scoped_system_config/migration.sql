-- Cycle-022 T4e: make system config, overrides, and secret versions tenant-owned.

ALTER TABLE "SystemConfigEnvironmentOverride" DROP CONSTRAINT IF EXISTS "SystemConfigEnvironmentOverride_key_fkey";
ALTER TABLE "SystemConfigSecretVersion" DROP CONSTRAINT IF EXISTS "SystemConfigSecretVersion_key_fkey";

ALTER TABLE "SystemConfig" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SystemConfigEnvironmentOverride" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SystemConfigSecretVersion" ADD COLUMN "tenantId" TEXT;

UPDATE "SystemConfig" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;
UPDATE "SystemConfigEnvironmentOverride" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;
UPDATE "SystemConfigSecretVersion" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;

ALTER TABLE "SystemConfig" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemConfig" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';
ALTER TABLE "SystemConfigEnvironmentOverride" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemConfigEnvironmentOverride" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';
ALTER TABLE "SystemConfigSecretVersion" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemConfigSecretVersion" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "SystemConfig_key_key";
DROP INDEX IF EXISTS "SystemConfigEnvironmentOverride_key_environment_key";
DROP INDEX IF EXISTS "SystemConfigEnvironmentOverride_environment_idx";
DROP INDEX IF EXISTS "SystemConfigSecretVersion_key_version_key";
DROP INDEX IF EXISTS "SystemConfigSecretVersion_key_active_idx";
DROP INDEX IF EXISTS "SystemConfigSecretVersion_createdAt_idx";

CREATE UNIQUE INDEX "SystemConfig_tenantId_key_key" ON "SystemConfig"("tenantId", "key");
CREATE INDEX "SystemConfig_tenantId_category_createdAt_idx" ON "SystemConfig"("tenantId", "category", "createdAt");
CREATE UNIQUE INDEX "SystemConfigEnvironmentOverride_tenantId_key_environment_key" ON "SystemConfigEnvironmentOverride"("tenantId", "key", "environment");
CREATE INDEX "SystemConfigEnvironmentOverride_tenantId_environment_idx" ON "SystemConfigEnvironmentOverride"("tenantId", "environment");
CREATE UNIQUE INDEX "SystemConfigSecretVersion_tenantId_key_version_key" ON "SystemConfigSecretVersion"("tenantId", "key", "version");
CREATE INDEX "SystemConfigSecretVersion_tenantId_key_active_idx" ON "SystemConfigSecretVersion"("tenantId", "key", "active");
CREATE INDEX "SystemConfigSecretVersion_tenantId_createdAt_idx" ON "SystemConfigSecretVersion"("tenantId", "createdAt");

ALTER TABLE "SystemConfig"
ADD CONSTRAINT "SystemConfig_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SystemConfigEnvironmentOverride"
ADD CONSTRAINT "SystemConfigEnvironmentOverride_tenantId_key_fkey"
FOREIGN KEY ("tenantId", "key") REFERENCES "SystemConfig"("tenantId", "key")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SystemConfigSecretVersion"
ADD CONSTRAINT "SystemConfigSecretVersion_tenantId_key_fkey"
FOREIGN KEY ("tenantId", "key") REFERENCES "SystemConfig"("tenantId", "key")
ON DELETE CASCADE ON UPDATE CASCADE;
