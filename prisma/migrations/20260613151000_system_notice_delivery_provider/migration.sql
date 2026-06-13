ALTER TABLE "SystemNoticeDelivery"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'in_app.local',
  ADD COLUMN "providerStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

UPDATE "SystemNoticeDelivery"
SET
  "providerStatus" = 'sent',
  "attemptCount" = 1,
  "lastAttemptAt" = "deliveredAt",
  "sentAt" = "deliveredAt",
  "lastError" = NULL
WHERE "provider" = 'in_app.local';

CREATE INDEX "SystemNoticeDelivery_noticeId_providerStatus_idx"
  ON "SystemNoticeDelivery"("noticeId", "providerStatus");

CREATE INDEX "SystemNoticeDelivery_provider_providerStatus_idx"
  ON "SystemNoticeDelivery"("provider", "providerStatus");
