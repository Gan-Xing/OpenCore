CREATE TABLE "SystemConfigSecretVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "rotatedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfigSecretVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemConfigSecretVersion_key_version_key" ON "SystemConfigSecretVersion"("key", "version");
CREATE INDEX "SystemConfigSecretVersion_key_active_idx" ON "SystemConfigSecretVersion"("key", "active");
CREATE INDEX "SystemConfigSecretVersion_createdAt_idx" ON "SystemConfigSecretVersion"("createdAt");

ALTER TABLE "SystemConfigSecretVersion" ADD CONSTRAINT "SystemConfigSecretVersion_key_fkey" FOREIGN KEY ("key") REFERENCES "SystemConfig"("key") ON DELETE CASCADE ON UPDATE CASCADE;
