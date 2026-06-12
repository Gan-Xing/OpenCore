-- Create the online-user runtime table when older local databases were created
-- before operations tables were tracked in migrations.
CREATE TABLE IF NOT EXISTS "OnlineUserSession" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "userAgent" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revokedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnlineUserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OnlineUserSession_tokenId_key"
ON "OnlineUserSession"("tokenId");

-- Persist online-user force logout audit context for databases where the table
-- already existed before this package extraction.
ALTER TABLE "OnlineUserSession"
ADD COLUMN IF NOT EXISTS "revokedBy" TEXT,
ADD COLUMN IF NOT EXISTS "revokedReason" TEXT;
