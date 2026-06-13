CREATE TABLE "SystemNoticeDelivery" (
  "id" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "status" TEXT NOT NULL DEFAULT 'delivered',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemNoticeDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemNoticeDelivery_noticeId_userId_channel_key" ON "SystemNoticeDelivery"("noticeId", "userId", "channel");

CREATE INDEX "SystemNoticeDelivery_noticeId_status_idx" ON "SystemNoticeDelivery"("noticeId", "status");

CREATE INDEX "SystemNoticeDelivery_userId_status_idx" ON "SystemNoticeDelivery"("userId", "status");

CREATE INDEX "SystemNoticeDelivery_channel_status_idx" ON "SystemNoticeDelivery"("channel", "status");

ALTER TABLE "SystemNoticeDelivery" ADD CONSTRAINT "SystemNoticeDelivery_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "SystemNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SystemNoticeDelivery" ADD CONSTRAINT "SystemNoticeDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
