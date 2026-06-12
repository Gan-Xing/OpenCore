ALTER TABLE "Role" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Role_enabled_idx" ON "Role"("enabled");
