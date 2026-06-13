CREATE TABLE "ReportDefinition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "querySchema" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "owner" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReportDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportDefinition_code_key"
  ON "ReportDefinition"("code");

CREATE INDEX "ReportDefinition_enabled_owner_idx"
  ON "ReportDefinition"("enabled", "owner");
