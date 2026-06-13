ALTER TABLE "SystemConfig" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "SystemConfig" ADD COLUMN "name" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "remark" TEXT;

UPDATE "SystemConfig"
SET "name" = "key"
WHERE "name" IS NULL;

ALTER TABLE "SystemConfig" ALTER COLUMN "name" SET NOT NULL;
