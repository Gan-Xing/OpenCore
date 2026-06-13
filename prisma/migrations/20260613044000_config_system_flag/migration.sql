ALTER TABLE "SystemConfig" ADD COLUMN "system" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SystemConfig"
SET "system" = true
WHERE "key" IN ('opencore.admin.title', 'auth.login.lockoutMinutes');
