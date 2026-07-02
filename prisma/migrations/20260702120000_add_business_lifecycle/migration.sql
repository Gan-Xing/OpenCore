ALTER TABLE "BusinessCustomer"
  ADD COLUMN "lifecycleStage" TEXT NOT NULL DEFAULT 'potential',
  ADD COLUMN "lifecycleReason" TEXT,
  ADD COLUMN "lifecycleChangedAt" TIMESTAMP(3);

UPDATE "BusinessCustomer"
SET
  "lifecycleStage" = CASE
    WHEN "status" = 'churned' THEN 'lost'
    WHEN "status" = 'archived' THEN 'archived'
    ELSE 'in_progress'
  END,
  "lifecycleReason" = CASE
    WHEN "status" = 'churned' THEN 'Initialized from churned customer status.'
    WHEN "status" = 'archived' THEN 'Initialized from archived customer status.'
    ELSE 'Initialized from existing customer record.'
  END,
  "lifecycleChangedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "lifecycleChangedAt" IS NULL;

CREATE TABLE "BusinessPoolEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "owner" TEXT,
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3),
    "recycledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "reason" TEXT,
    "duplicateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessPoolEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessAssignmentEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromOwner" TEXT,
    "toOwner" TEXT,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "poolEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessAssignmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessLifecycleEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "customerId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "reason" TEXT,
    "actor" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessPoolEntry_tenantId_id_key" ON "BusinessPoolEntry"("tenantId", "id");
CREATE INDEX "BusinessPoolEntry_tenantId_status_createdAt_idx" ON "BusinessPoolEntry"("tenantId", "status", "createdAt");
CREATE INDEX "BusinessPoolEntry_tenantId_targetType_targetId_idx" ON "BusinessPoolEntry"("tenantId", "targetType", "targetId");
CREATE INDEX "BusinessPoolEntry_tenantId_duplicateKey_idx" ON "BusinessPoolEntry"("tenantId", "duplicateKey");
CREATE INDEX "BusinessPoolEntry_tenantId_assignedTo_status_idx" ON "BusinessPoolEntry"("tenantId", "assignedTo", "status");

CREATE UNIQUE INDEX "BusinessAssignmentEvent_tenantId_id_key" ON "BusinessAssignmentEvent"("tenantId", "id");
CREATE INDEX "BusinessAssignmentEvent_tenantId_targetType_targetId_createdAt_idx" ON "BusinessAssignmentEvent"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "BusinessAssignmentEvent_tenantId_action_createdAt_idx" ON "BusinessAssignmentEvent"("tenantId", "action", "createdAt");
CREATE INDEX "BusinessAssignmentEvent_tenantId_toOwner_createdAt_idx" ON "BusinessAssignmentEvent"("tenantId", "toOwner", "createdAt");
CREATE INDEX "BusinessAssignmentEvent_tenantId_poolEntryId_idx" ON "BusinessAssignmentEvent"("tenantId", "poolEntryId");

CREATE UNIQUE INDEX "BusinessLifecycleEvent_tenantId_id_key" ON "BusinessLifecycleEvent"("tenantId", "id");
CREATE INDEX "BusinessLifecycleEvent_tenantId_customerId_createdAt_idx" ON "BusinessLifecycleEvent"("tenantId", "customerId", "createdAt");
CREATE INDEX "BusinessLifecycleEvent_tenantId_toStage_createdAt_idx" ON "BusinessLifecycleEvent"("tenantId", "toStage", "createdAt");
CREATE INDEX "BusinessLifecycleEvent_tenantId_actor_createdAt_idx" ON "BusinessLifecycleEvent"("tenantId", "actor", "createdAt");

CREATE INDEX "BusinessCustomer_tenantId_lifecycleStage_lifecycleChangedAt_idx" ON "BusinessCustomer"("tenantId", "lifecycleStage", "lifecycleChangedAt");

ALTER TABLE "BusinessPoolEntry" ADD CONSTRAINT "BusinessPoolEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessAssignmentEvent" ADD CONSTRAINT "BusinessAssignmentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessLifecycleEvent" ADD CONSTRAINT "BusinessLifecycleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessLifecycleEvent" ADD CONSTRAINT "BusinessLifecycleEvent_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "BusinessCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
