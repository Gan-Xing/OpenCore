-- CreateTable
CREATE TABLE "SystemNoticeReadReceipt" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemNoticeReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemNoticeReadReceipt_noticeId_userId_key" ON "SystemNoticeReadReceipt"("noticeId", "userId");

-- CreateIndex
CREATE INDEX "SystemNoticeReadReceipt_userId_readAt_idx" ON "SystemNoticeReadReceipt"("userId", "readAt");

-- CreateIndex
CREATE INDEX "SystemNoticeReadReceipt_noticeId_readAt_idx" ON "SystemNoticeReadReceipt"("noticeId", "readAt");

-- AddForeignKey
ALTER TABLE "SystemNoticeReadReceipt" ADD CONSTRAINT "SystemNoticeReadReceipt_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "SystemNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNoticeReadReceipt" ADD CONSTRAINT "SystemNoticeReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
