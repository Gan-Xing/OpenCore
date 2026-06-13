-- Round 66: track notice provider outbox bridge messages.
ALTER TABLE "SystemNoticeDelivery"
  ADD COLUMN "recipient" TEXT,
  ADD COLUMN "providerMessageId" TEXT;

CREATE INDEX "SystemNoticeDelivery_providerMessageId_idx"
  ON "SystemNoticeDelivery"("providerMessageId");
