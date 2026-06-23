ALTER TABLE "IntegrationWebSocketRuntimeEvent" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_root';

DROP INDEX IF EXISTS "IntegrationWebSocketRuntimeEvent_room_createdAt_idx";
DROP INDEX IF EXISTS "IntegrationWebSocketRuntimeEvent_type_createdAt_idx";
DROP INDEX IF EXISTS "IntegrationWebSocketRuntimeEvent_createdAt_idx";

CREATE INDEX "IntegrationWebSocketRuntimeEvent_tenantId_room_createdAt_idx"
  ON "IntegrationWebSocketRuntimeEvent"("tenantId", "room", "createdAt");

CREATE INDEX "IntegrationWebSocketRuntimeEvent_tenantId_type_createdAt_idx"
  ON "IntegrationWebSocketRuntimeEvent"("tenantId", "type", "createdAt");

CREATE INDEX "IntegrationWebSocketRuntimeEvent_tenantId_createdAt_idx"
  ON "IntegrationWebSocketRuntimeEvent"("tenantId", "createdAt");

ALTER TABLE "IntegrationWebSocketRuntimeEvent"
  ADD CONSTRAINT "IntegrationWebSocketRuntimeEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
