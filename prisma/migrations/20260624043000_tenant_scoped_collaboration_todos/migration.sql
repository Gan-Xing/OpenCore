ALTER TABLE "CollaborationTodo" ADD COLUMN "tenantId" TEXT;

UPDATE "CollaborationTodo"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "CollaborationTodo"
  ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root',
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "CollaborationTodo_assignee_status_createdAt_idx";
DROP INDEX IF EXISTS "CollaborationTodo_sourceType_status_idx";
DROP INDEX IF EXISTS "CollaborationTodo_businessType_businessId_idx";

CREATE INDEX "CollaborationTodo_tenantId_assignee_status_createdAt_idx"
  ON "CollaborationTodo"("tenantId", "assignee", "status", "createdAt");

CREATE INDEX "CollaborationTodo_tenantId_sourceType_status_idx"
  ON "CollaborationTodo"("tenantId", "sourceType", "status");

CREATE INDEX "CollaborationTodo_tenantId_businessType_businessId_idx"
  ON "CollaborationTodo"("tenantId", "businessType", "businessId");

ALTER TABLE "CollaborationTodo"
  ADD CONSTRAINT "CollaborationTodo_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
