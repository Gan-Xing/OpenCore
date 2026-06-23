ALTER TABLE "LoginLockout" ADD COLUMN "tenantId" TEXT;

UPDATE "LoginLockout"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "LoginLockout"
  ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root',
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "LoginLockout_username_key";

CREATE UNIQUE INDEX "LoginLockout_tenantId_username_key"
  ON "LoginLockout"("tenantId", "username");

CREATE INDEX "LoginLockout_tenantId_updatedAt_idx"
  ON "LoginLockout"("tenantId", "updatedAt");

ALTER TABLE "LoginLockout"
  ADD CONSTRAINT "LoginLockout_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
