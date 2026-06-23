ALTER TABLE "IntegrationProvider" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "IntegrationProviderAuditLog" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "IntegrationTemplate" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "IntegrationOutbox" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "IntegrationOAuthToken" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "IntegrationOAuthFlow" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';
ALTER TABLE "IntegrationOAuthCallbackAudit" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "IntegrationProvider_code_key";
DROP INDEX IF EXISTS "IntegrationTemplate_code_key";
DROP INDEX IF EXISTS "IntegrationOAuthToken_providerCode_subjectId_providerAccountId_key";
DROP INDEX IF EXISTS "IntegrationOAuthToken_providerCode_idx";
DROP INDEX IF EXISTS "IntegrationOAuthToken_status_idx";
DROP INDEX IF EXISTS "IntegrationOAuthFlow_providerCode_status_idx";
DROP INDEX IF EXISTS "IntegrationOAuthFlow_subjectId_createdAt_idx";
DROP INDEX IF EXISTS "IntegrationOAuthCallbackAudit_providerCode_createdAt_idx";
DROP INDEX IF EXISTS "IntegrationOAuthCallbackAudit_state_idx";
DROP INDEX IF EXISTS "IntegrationOAuthCallbackAudit_status_idx";
DROP INDEX IF EXISTS "IntegrationProviderAuditLog_providerCode_createdAt_idx";
DROP INDEX IF EXISTS "IntegrationProviderAuditLog_action_idx";

CREATE UNIQUE INDEX "IntegrationProvider_tenantId_code_key"
  ON "IntegrationProvider"("tenantId", "code");
CREATE INDEX "IntegrationProvider_tenantId_type_code_idx"
  ON "IntegrationProvider"("tenantId", "type", "code");
CREATE INDEX "IntegrationProvider_tenantId_healthStatus_idx"
  ON "IntegrationProvider"("tenantId", "healthStatus");

CREATE INDEX "IntegrationProviderAuditLog_tenantId_providerCode_createdAt_idx"
  ON "IntegrationProviderAuditLog"("tenantId", "providerCode", "createdAt");
CREATE INDEX "IntegrationProviderAuditLog_tenantId_action_idx"
  ON "IntegrationProviderAuditLog"("tenantId", "action");

CREATE UNIQUE INDEX "IntegrationTemplate_tenantId_code_key"
  ON "IntegrationTemplate"("tenantId", "code");
CREATE INDEX "IntegrationTemplate_tenantId_channel_code_idx"
  ON "IntegrationTemplate"("tenantId", "channel", "code");

CREATE INDEX "IntegrationOutbox_tenantId_channel_status_idx"
  ON "IntegrationOutbox"("tenantId", "channel", "status");
CREATE INDEX "IntegrationOutbox_tenantId_providerCode_status_idx"
  ON "IntegrationOutbox"("tenantId", "providerCode", "status");

CREATE UNIQUE INDEX "IntegrationOAuthToken_tenantId_providerCode_subjectId_providerAccountId_key"
  ON "IntegrationOAuthToken"("tenantId", "providerCode", "subjectId", "providerAccountId");
CREATE INDEX "IntegrationOAuthToken_tenantId_providerCode_idx"
  ON "IntegrationOAuthToken"("tenantId", "providerCode");
CREATE INDEX "IntegrationOAuthToken_tenantId_status_idx"
  ON "IntegrationOAuthToken"("tenantId", "status");
CREATE INDEX "IntegrationOAuthToken_tenantId_subjectType_subjectId_idx"
  ON "IntegrationOAuthToken"("tenantId", "subjectType", "subjectId");

CREATE INDEX "IntegrationOAuthFlow_tenantId_providerCode_status_idx"
  ON "IntegrationOAuthFlow"("tenantId", "providerCode", "status");
CREATE INDEX "IntegrationOAuthFlow_tenantId_subjectId_createdAt_idx"
  ON "IntegrationOAuthFlow"("tenantId", "subjectId", "createdAt");

CREATE INDEX "IntegrationOAuthCallbackAudit_tenantId_providerCode_createdAt_idx"
  ON "IntegrationOAuthCallbackAudit"("tenantId", "providerCode", "createdAt");
CREATE INDEX "IntegrationOAuthCallbackAudit_tenantId_state_idx"
  ON "IntegrationOAuthCallbackAudit"("tenantId", "state");
CREATE INDEX "IntegrationOAuthCallbackAudit_tenantId_status_idx"
  ON "IntegrationOAuthCallbackAudit"("tenantId", "status");

ALTER TABLE "IntegrationProvider"
  ADD CONSTRAINT "IntegrationProvider_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationProviderAuditLog"
  ADD CONSTRAINT "IntegrationProviderAuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationTemplate"
  ADD CONSTRAINT "IntegrationTemplate_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationOutbox"
  ADD CONSTRAINT "IntegrationOutbox_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationOAuthToken"
  ADD CONSTRAINT "IntegrationOAuthToken_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationOAuthFlow"
  ADD CONSTRAINT "IntegrationOAuthFlow_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationOAuthCallbackAudit"
  ADD CONSTRAINT "IntegrationOAuthCallbackAudit_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
