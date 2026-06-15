CREATE TABLE "IntegrationOAuthFlow" (
  "id" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "redirectUri" TEXT,
  "authorizationUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "callbackCodeHash" TEXT,
  "callbackError" TEXT,
  "tokenId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationOAuthFlow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationOAuthFlow_state_key"
  ON "IntegrationOAuthFlow"("state");

CREATE INDEX "IntegrationOAuthFlow_providerCode_status_idx"
  ON "IntegrationOAuthFlow"("providerCode", "status");

CREATE INDEX "IntegrationOAuthFlow_subjectId_createdAt_idx"
  ON "IntegrationOAuthFlow"("subjectId", "createdAt");

CREATE TABLE "IntegrationOAuthCallbackAudit" (
  "id" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "flowId" TEXT,
  "state" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "callbackCodeHash" TEXT,
  "callbackError" TEXT,
  "providerAccountId" TEXT,
  "tokenId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationOAuthCallbackAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationOAuthCallbackAudit_providerCode_createdAt_idx"
  ON "IntegrationOAuthCallbackAudit"("providerCode", "createdAt");

CREATE INDEX "IntegrationOAuthCallbackAudit_state_idx"
  ON "IntegrationOAuthCallbackAudit"("state");

CREATE INDEX "IntegrationOAuthCallbackAudit_status_idx"
  ON "IntegrationOAuthCallbackAudit"("status");
