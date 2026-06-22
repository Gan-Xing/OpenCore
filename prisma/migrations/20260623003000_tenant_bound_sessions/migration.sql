-- Cycle-022 T2: tenant-bound auth session context.

ALTER TABLE "OnlineUserSession"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "membershipId" TEXT,
  ADD COLUMN "accessMode" TEXT NOT NULL DEFAULT 'tenant';

UPDATE "OnlineUserSession"
SET
  "tenantId" = "TenantMembership"."tenantId",
  "membershipId" = "TenantMembership"."id",
  "accessMode" = 'tenant'
FROM "User"
JOIN "TenantMembership"
  ON "TenantMembership"."userId" = "User"."id"
 AND "TenantMembership"."tenantId" = 'tenant_root'
WHERE "OnlineUserSession"."username" = "User"."username"
  AND "OnlineUserSession"."tenantId" IS NULL;

CREATE INDEX "OnlineUserSession_tenantId_idx" ON "OnlineUserSession"("tenantId");
CREATE INDEX "OnlineUserSession_membershipId_idx" ON "OnlineUserSession"("membershipId");

ALTER TABLE "OnlineUserSession" ADD CONSTRAINT "OnlineUserSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineUserSession" ADD CONSTRAINT "OnlineUserSession_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
