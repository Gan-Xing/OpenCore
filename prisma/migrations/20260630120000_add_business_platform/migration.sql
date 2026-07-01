CREATE TABLE "BusinessTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "rating" TEXT NOT NULL DEFAULT 'warm',
    "owner" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "nextContactAt" TIMESTAMP(3),
    "lastFollowedAt" TIMESTAMP(3),
    "convertedCustomerId" TEXT,
    "convertedOpportunityId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "level" TEXT NOT NULL DEFAULT 'standard',
    "source" TEXT NOT NULL,
    "industry" TEXT,
    "region" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "nextContactAt" TIMESTAMP(3),
    "lastFollowedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "owner" TEXT NOT NULL,
    "decisionRole" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "nextContactAt" TIMESTAMP(3),
    "lastFollowedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesOpportunity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "customerId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'qualification',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expectedCloseAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessFollowUp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "outcome" TEXT,
    "nextContactAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessOwnerTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fromOwner" TEXT,
    "toOwner" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessOwnerTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessAuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessTag_tenantId_code_key" ON "BusinessTag"("tenantId", "code");
CREATE UNIQUE INDEX "BusinessTag_tenantId_id_key" ON "BusinessTag"("tenantId", "id");
CREATE INDEX "BusinessTag_tenantId_enabled_name_idx" ON "BusinessTag"("tenantId", "enabled", "name");

CREATE UNIQUE INDEX "SalesLead_tenantId_number_key" ON "SalesLead"("tenantId", "number");
CREATE UNIQUE INDEX "SalesLead_tenantId_id_key" ON "SalesLead"("tenantId", "id");
CREATE INDEX "SalesLead_tenantId_status_owner_createdAt_idx" ON "SalesLead"("tenantId", "status", "owner", "createdAt");
CREATE INDEX "SalesLead_tenantId_source_createdAt_idx" ON "SalesLead"("tenantId", "source", "createdAt");
CREATE INDEX "SalesLead_tenantId_nextContactAt_idx" ON "SalesLead"("tenantId", "nextContactAt");
CREATE INDEX "SalesLead_tenantId_archivedAt_idx" ON "SalesLead"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "BusinessCustomer_tenantId_number_key" ON "BusinessCustomer"("tenantId", "number");
CREATE UNIQUE INDEX "BusinessCustomer_tenantId_id_key" ON "BusinessCustomer"("tenantId", "id");
CREATE INDEX "BusinessCustomer_tenantId_status_owner_createdAt_idx" ON "BusinessCustomer"("tenantId", "status", "owner", "createdAt");
CREATE INDEX "BusinessCustomer_tenantId_level_source_createdAt_idx" ON "BusinessCustomer"("tenantId", "level", "source", "createdAt");
CREATE INDEX "BusinessCustomer_tenantId_nextContactAt_idx" ON "BusinessCustomer"("tenantId", "nextContactAt");
CREATE INDEX "BusinessCustomer_tenantId_archivedAt_idx" ON "BusinessCustomer"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "BusinessContact_tenantId_id_key" ON "BusinessContact"("tenantId", "id");
CREATE INDEX "BusinessContact_tenantId_customerId_primary_idx" ON "BusinessContact"("tenantId", "customerId", "primary");
CREATE INDEX "BusinessContact_tenantId_owner_createdAt_idx" ON "BusinessContact"("tenantId", "owner", "createdAt");
CREATE INDEX "BusinessContact_tenantId_nextContactAt_idx" ON "BusinessContact"("tenantId", "nextContactAt");
CREATE INDEX "BusinessContact_tenantId_archivedAt_idx" ON "BusinessContact"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "SalesOpportunity_tenantId_number_key" ON "SalesOpportunity"("tenantId", "number");
CREATE UNIQUE INDEX "SalesOpportunity_tenantId_id_key" ON "SalesOpportunity"("tenantId", "id");
CREATE INDEX "SalesOpportunity_tenantId_customerId_stage_idx" ON "SalesOpportunity"("tenantId", "customerId", "stage");
CREATE INDEX "SalesOpportunity_tenantId_owner_stage_createdAt_idx" ON "SalesOpportunity"("tenantId", "owner", "stage", "createdAt");
CREATE INDEX "SalesOpportunity_tenantId_expectedCloseAt_idx" ON "SalesOpportunity"("tenantId", "expectedCloseAt");
CREATE INDEX "SalesOpportunity_tenantId_archivedAt_idx" ON "SalesOpportunity"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "BusinessFollowUp_tenantId_id_key" ON "BusinessFollowUp"("tenantId", "id");
CREATE INDEX "BusinessFollowUp_tenantId_targetType_targetId_createdAt_idx" ON "BusinessFollowUp"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "BusinessFollowUp_tenantId_createdBy_createdAt_idx" ON "BusinessFollowUp"("tenantId", "createdBy", "createdAt");
CREATE INDEX "BusinessFollowUp_tenantId_nextContactAt_idx" ON "BusinessFollowUp"("tenantId", "nextContactAt");

CREATE UNIQUE INDEX "BusinessTask_tenantId_id_key" ON "BusinessTask"("tenantId", "id");
CREATE INDEX "BusinessTask_tenantId_assignee_status_dueAt_idx" ON "BusinessTask"("tenantId", "assignee", "status", "dueAt");
CREATE INDEX "BusinessTask_tenantId_targetType_targetId_idx" ON "BusinessTask"("tenantId", "targetType", "targetId");

CREATE UNIQUE INDEX "BusinessAttachment_tenantId_storageKey_key" ON "BusinessAttachment"("tenantId", "storageKey");
CREATE UNIQUE INDEX "BusinessAttachment_tenantId_id_key" ON "BusinessAttachment"("tenantId", "id");
CREATE INDEX "BusinessAttachment_tenantId_targetType_targetId_createdAt_idx" ON "BusinessAttachment"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "BusinessAttachment_tenantId_uploadedBy_createdAt_idx" ON "BusinessAttachment"("tenantId", "uploadedBy", "createdAt");

CREATE UNIQUE INDEX "BusinessOwnerTransfer_tenantId_id_key" ON "BusinessOwnerTransfer"("tenantId", "id");
CREATE INDEX "BusinessOwnerTransfer_tenantId_targetType_targetId_createdAt_idx" ON "BusinessOwnerTransfer"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "BusinessOwnerTransfer_tenantId_toOwner_createdAt_idx" ON "BusinessOwnerTransfer"("tenantId", "toOwner", "createdAt");

CREATE UNIQUE INDEX "BusinessAuditEvent_tenantId_id_key" ON "BusinessAuditEvent"("tenantId", "id");
CREATE INDEX "BusinessAuditEvent_tenantId_targetType_targetId_createdAt_idx" ON "BusinessAuditEvent"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "BusinessAuditEvent_tenantId_actor_createdAt_idx" ON "BusinessAuditEvent"("tenantId", "actor", "createdAt");
CREATE INDEX "BusinessAuditEvent_tenantId_action_createdAt_idx" ON "BusinessAuditEvent"("tenantId", "action", "createdAt");

ALTER TABLE "BusinessTag" ADD CONSTRAINT "BusinessTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessContact" ADD CONSTRAINT "BusinessContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessContact" ADD CONSTRAINT "BusinessContact_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "BusinessCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "BusinessCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessFollowUp" ADD CONSTRAINT "BusinessFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessTask" ADD CONSTRAINT "BusinessTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessAttachment" ADD CONSTRAINT "BusinessAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessOwnerTransfer" ADD CONSTRAINT "BusinessOwnerTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessAuditEvent" ADD CONSTRAINT "BusinessAuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
