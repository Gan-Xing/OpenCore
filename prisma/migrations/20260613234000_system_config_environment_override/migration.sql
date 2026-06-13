CREATE TABLE "SystemConfigEnvironmentOverride" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "description" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfigEnvironmentOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemConfigEnvironmentOverride_key_environment_key" ON "SystemConfigEnvironmentOverride"("key", "environment");
CREATE INDEX "SystemConfigEnvironmentOverride_environment_idx" ON "SystemConfigEnvironmentOverride"("environment");

ALTER TABLE "SystemConfigEnvironmentOverride" ADD CONSTRAINT "SystemConfigEnvironmentOverride_key_fkey" FOREIGN KEY ("key") REFERENCES "SystemConfig"("key") ON DELETE CASCADE ON UPDATE CASCADE;
