ALTER TABLE "ReportDefinition"
  ADD COLUMN "tenantId" TEXT;

UPDATE "ReportDefinition"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "ReportDefinition"
  ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root',
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "ReportDefinition_code_key";
DROP INDEX IF EXISTS "ReportDefinition_enabled_owner_idx";

CREATE UNIQUE INDEX "ReportDefinition_tenantId_code_key"
  ON "ReportDefinition"("tenantId", "code");

CREATE INDEX "ReportDefinition_tenantId_enabled_owner_idx"
  ON "ReportDefinition"("tenantId", "enabled", "owner");

ALTER TABLE "ReportDefinition"
  ADD CONSTRAINT "ReportDefinition_tenantId_fkey"
  FOREIGN KEY ("tenantId")
  REFERENCES "Tenant"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
