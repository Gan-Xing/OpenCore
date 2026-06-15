ALTER TABLE "IntegrationProvider"
  ADD COLUMN "secretRefStatus" TEXT NOT NULL DEFAULT 'unchecked',
  ADD COLUMN "configVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastTestStatus" TEXT,
  ADD COLUMN "lastTestMessage" TEXT,
  ADD COLUMN "lastTestedAt" TIMESTAMP(3);

CREATE TABLE "IntegrationProviderAuditLog" (
  "id" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL DEFAULT 'admin',
  "reason" TEXT,
  "beforeConfigVersion" INTEGER,
  "afterConfigVersion" INTEGER,
  "beforeSecretRefStatus" TEXT,
  "afterSecretRefStatus" TEXT,
  "testStatus" TEXT,
  "message" TEXT,
  "summary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationProviderAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationProviderAuditLog_providerCode_createdAt_idx"
  ON "IntegrationProviderAuditLog"("providerCode", "createdAt");

CREATE INDEX "IntegrationProviderAuditLog_action_idx"
  ON "IntegrationProviderAuditLog"("action");
