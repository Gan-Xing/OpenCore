-- Cycle-022 T5a: scope scheduler job definitions and run logs by tenant.

ALTER TABLE "JobRunLog" DROP CONSTRAINT IF EXISTS "JobRunLog_jobCode_fkey";

ALTER TABLE "JobDefinition" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "JobRunLog" ADD COLUMN "tenantId" TEXT;

UPDATE "JobDefinition" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;
UPDATE "JobRunLog" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;

ALTER TABLE "JobDefinition" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "JobDefinition" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';
ALTER TABLE "JobRunLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "JobRunLog" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "JobDefinition_code_key";

CREATE UNIQUE INDEX "JobDefinition_tenantId_code_key" ON "JobDefinition"("tenantId", "code");
CREATE INDEX "JobDefinition_tenantId_queueName_enabled_idx" ON "JobDefinition"("tenantId", "queueName", "enabled");
CREATE INDEX "JobRunLog_tenantId_status_startedAt_idx" ON "JobRunLog"("tenantId", "status", "startedAt");
CREATE INDEX "JobRunLog_tenantId_jobCode_status_idx" ON "JobRunLog"("tenantId", "jobCode", "status");

ALTER TABLE "JobDefinition"
ADD CONSTRAINT "JobDefinition_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobRunLog"
ADD CONSTRAINT "JobRunLog_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobRunLog"
ADD CONSTRAINT "JobRunLog_tenantId_jobCode_fkey"
FOREIGN KEY ("tenantId", "jobCode") REFERENCES "JobDefinition"("tenantId", "code")
ON DELETE CASCADE ON UPDATE CASCADE;
