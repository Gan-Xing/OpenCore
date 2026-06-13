-- Round 66: create integration runtime tables used by notice provider bridge.
CREATE TABLE "IntegrationProvider" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "secretRef" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationProvider_code_key"
  ON "IntegrationProvider"("code");

CREATE TABLE "IntegrationTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationTemplate_code_key"
  ON "IntegrationTemplate"("code");

CREATE TABLE "IntegrationOutbox" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "templateCode" TEXT,
  "recipient" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "preview" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationOutbox_pkey" PRIMARY KEY ("id")
);
