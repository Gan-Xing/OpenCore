CREATE TABLE "SystemNoticeTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "titleTemplate" TEXT NOT NULL,
  "contentTemplate" TEXT NOT NULL,
  "params" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemNoticeTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemNoticeTemplate_code_key" ON "SystemNoticeTemplate"("code");

CREATE INDEX "SystemNoticeTemplate_enabled_type_idx" ON "SystemNoticeTemplate"("enabled", "type");
