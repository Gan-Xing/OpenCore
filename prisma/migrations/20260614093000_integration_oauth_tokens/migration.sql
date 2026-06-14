-- Round 92: manage OAuth token lifecycle separately from provider config.
CREATE TABLE "IntegrationOAuthToken" (
  "id" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "accessTokenRef" TEXT NOT NULL,
  "refreshTokenRef" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3),
  "lastRotatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationOAuthToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationOAuthToken_providerCode_idx"
  ON "IntegrationOAuthToken"("providerCode");

CREATE INDEX "IntegrationOAuthToken_status_idx"
  ON "IntegrationOAuthToken"("status");

CREATE UNIQUE INDEX "IntegrationOAuthToken_providerCode_subjectId_providerAccountId_key"
  ON "IntegrationOAuthToken"("providerCode", "subjectId", "providerAccountId");
