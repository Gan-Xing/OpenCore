ALTER TABLE "User"
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "avatarStorageKey" TEXT,
ADD COLUMN "avatarMimeType" TEXT,
ADD COLUMN "avatarSizeBytes" INTEGER,
ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_avatarStorageKey_key" ON "User"("avatarStorageKey");
