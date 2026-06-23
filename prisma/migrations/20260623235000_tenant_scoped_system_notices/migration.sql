-- Scope system notices, templates, receipts, and deliveries by tenant.

ALTER TABLE "SystemNoticeReadReceipt" DROP CONSTRAINT IF EXISTS "SystemNoticeReadReceipt_noticeId_fkey";
ALTER TABLE "SystemNoticeDelivery" DROP CONSTRAINT IF EXISTS "SystemNoticeDelivery_noticeId_fkey";

ALTER TABLE "SystemNotice" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SystemNoticeTemplate" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SystemNoticeReadReceipt" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SystemNoticeDelivery" ADD COLUMN "tenantId" TEXT;

UPDATE "SystemNotice" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;
UPDATE "SystemNoticeTemplate" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;
UPDATE "SystemNoticeReadReceipt" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;
UPDATE "SystemNoticeDelivery" SET "tenantId" = 'tenant_root' WHERE "tenantId" IS NULL;

ALTER TABLE "SystemNotice" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemNotice" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';
ALTER TABLE "SystemNoticeTemplate" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemNoticeTemplate" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';
ALTER TABLE "SystemNoticeReadReceipt" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemNoticeReadReceipt" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';
ALTER TABLE "SystemNoticeDelivery" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SystemNoticeDelivery" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "SystemNotice_status_type_idx";
DROP INDEX IF EXISTS "SystemNotice_audience_pinned_idx";
DROP INDEX IF EXISTS "SystemNoticeTemplate_code_key";
DROP INDEX IF EXISTS "SystemNoticeTemplate_enabled_type_idx";
DROP INDEX IF EXISTS "SystemNoticeReadReceipt_noticeId_userId_key";
DROP INDEX IF EXISTS "SystemNoticeReadReceipt_userId_readAt_idx";
DROP INDEX IF EXISTS "SystemNoticeReadReceipt_noticeId_readAt_idx";
DROP INDEX IF EXISTS "SystemNoticeDelivery_noticeId_userId_channel_key";
DROP INDEX IF EXISTS "SystemNoticeDelivery_noticeId_status_idx";
DROP INDEX IF EXISTS "SystemNoticeDelivery_noticeId_providerStatus_idx";
DROP INDEX IF EXISTS "SystemNoticeDelivery_userId_status_idx";
DROP INDEX IF EXISTS "SystemNoticeDelivery_channel_status_idx";
DROP INDEX IF EXISTS "SystemNoticeDelivery_provider_providerStatus_idx";
DROP INDEX IF EXISTS "SystemNoticeDelivery_providerMessageId_idx";

CREATE UNIQUE INDEX "SystemNotice_tenantId_id_key" ON "SystemNotice"("tenantId", "id");
CREATE INDEX "SystemNotice_tenantId_status_type_idx" ON "SystemNotice"("tenantId", "status", "type");
CREATE INDEX "SystemNotice_tenantId_audience_pinned_idx" ON "SystemNotice"("tenantId", "audience", "pinned");
CREATE UNIQUE INDEX "SystemNoticeTemplate_tenantId_code_key" ON "SystemNoticeTemplate"("tenantId", "code");
CREATE INDEX "SystemNoticeTemplate_tenantId_enabled_type_idx" ON "SystemNoticeTemplate"("tenantId", "enabled", "type");
CREATE UNIQUE INDEX "SystemNoticeReadReceipt_tenantId_noticeId_userId_key" ON "SystemNoticeReadReceipt"("tenantId", "noticeId", "userId");
CREATE INDEX "SystemNoticeReadReceipt_tenantId_userId_readAt_idx" ON "SystemNoticeReadReceipt"("tenantId", "userId", "readAt");
CREATE INDEX "SystemNoticeReadReceipt_tenantId_noticeId_readAt_idx" ON "SystemNoticeReadReceipt"("tenantId", "noticeId", "readAt");
CREATE UNIQUE INDEX "SystemNoticeDelivery_tenantId_noticeId_userId_channel_key" ON "SystemNoticeDelivery"("tenantId", "noticeId", "userId", "channel");
CREATE INDEX "SystemNoticeDelivery_tenantId_noticeId_status_idx" ON "SystemNoticeDelivery"("tenantId", "noticeId", "status");
CREATE INDEX "SystemNoticeDelivery_tenantId_noticeId_providerStatus_idx" ON "SystemNoticeDelivery"("tenantId", "noticeId", "providerStatus");
CREATE INDEX "SystemNoticeDelivery_tenantId_userId_status_idx" ON "SystemNoticeDelivery"("tenantId", "userId", "status");
CREATE INDEX "SystemNoticeDelivery_tenantId_channel_status_idx" ON "SystemNoticeDelivery"("tenantId", "channel", "status");
CREATE INDEX "SystemNoticeDelivery_tenantId_provider_providerStatus_idx" ON "SystemNoticeDelivery"("tenantId", "provider", "providerStatus");
CREATE INDEX "SystemNoticeDelivery_tenantId_providerMessageId_idx" ON "SystemNoticeDelivery"("tenantId", "providerMessageId");

ALTER TABLE "SystemNotice"
  ADD CONSTRAINT "SystemNotice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemNoticeTemplate"
  ADD CONSTRAINT "SystemNoticeTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemNoticeReadReceipt"
  ADD CONSTRAINT "SystemNoticeReadReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemNoticeReadReceipt"
  ADD CONSTRAINT "SystemNoticeReadReceipt_tenantId_noticeId_fkey" FOREIGN KEY ("tenantId", "noticeId") REFERENCES "SystemNotice"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemNoticeDelivery"
  ADD CONSTRAINT "SystemNoticeDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemNoticeDelivery"
  ADD CONSTRAINT "SystemNoticeDelivery_tenantId_noticeId_fkey" FOREIGN KEY ("tenantId", "noticeId") REFERENCES "SystemNotice"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
