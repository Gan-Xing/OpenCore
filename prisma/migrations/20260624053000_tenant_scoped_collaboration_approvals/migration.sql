ALTER TABLE "CollaborationApprovalLite" ADD COLUMN "tenantId" TEXT;

UPDATE "CollaborationApprovalLite"
SET "tenantId" = 'tenant_root'
WHERE "tenantId" IS NULL;

ALTER TABLE "CollaborationApprovalLite"
  ALTER COLUMN "tenantId" SET DEFAULT 'tenant_root',
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "CollaborationApprovalLite_requester_status_createdAt_idx";
DROP INDEX IF EXISTS "CollaborationApprovalLite_approver_status_createdAt_idx";
DROP INDEX IF EXISTS "CollaborationApprovalLite_businessType_businessId_idx";

CREATE INDEX "CollaborationApprovalLite_tenantId_requester_status_createdAt_idx"
  ON "CollaborationApprovalLite"("tenantId", "requester", "status", "createdAt");

CREATE INDEX "CollaborationApprovalLite_tenantId_approver_status_createdAt_idx"
  ON "CollaborationApprovalLite"("tenantId", "approver", "status", "createdAt");

CREATE INDEX "CollaborationApprovalLite_tenantId_businessType_businessId_idx"
  ON "CollaborationApprovalLite"("tenantId", "businessType", "businessId");

ALTER TABLE "CollaborationApprovalLite"
  ADD CONSTRAINT "CollaborationApprovalLite_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
