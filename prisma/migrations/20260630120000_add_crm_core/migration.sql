CREATE TABLE "CrmTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmLead" (
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

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmCustomer" (
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

    CONSTRAINT "CrmCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmContact" (
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

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmOpportunity" (
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

    CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmFollowUp" (
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

    CONSTRAINT "CrmFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmTask" (
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

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmAttachment" (
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

    CONSTRAINT "CrmAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmOwnerTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fromOwner" TEXT,
    "toOwner" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmOwnerTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmAuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmTag_tenantId_code_key" ON "CrmTag"("tenantId", "code");
CREATE UNIQUE INDEX "CrmTag_tenantId_id_key" ON "CrmTag"("tenantId", "id");
CREATE INDEX "CrmTag_tenantId_enabled_name_idx" ON "CrmTag"("tenantId", "enabled", "name");

CREATE UNIQUE INDEX "CrmLead_tenantId_number_key" ON "CrmLead"("tenantId", "number");
CREATE UNIQUE INDEX "CrmLead_tenantId_id_key" ON "CrmLead"("tenantId", "id");
CREATE INDEX "CrmLead_tenantId_status_owner_createdAt_idx" ON "CrmLead"("tenantId", "status", "owner", "createdAt");
CREATE INDEX "CrmLead_tenantId_source_createdAt_idx" ON "CrmLead"("tenantId", "source", "createdAt");
CREATE INDEX "CrmLead_tenantId_nextContactAt_idx" ON "CrmLead"("tenantId", "nextContactAt");
CREATE INDEX "CrmLead_tenantId_archivedAt_idx" ON "CrmLead"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "CrmCustomer_tenantId_number_key" ON "CrmCustomer"("tenantId", "number");
CREATE UNIQUE INDEX "CrmCustomer_tenantId_id_key" ON "CrmCustomer"("tenantId", "id");
CREATE INDEX "CrmCustomer_tenantId_status_owner_createdAt_idx" ON "CrmCustomer"("tenantId", "status", "owner", "createdAt");
CREATE INDEX "CrmCustomer_tenantId_level_source_createdAt_idx" ON "CrmCustomer"("tenantId", "level", "source", "createdAt");
CREATE INDEX "CrmCustomer_tenantId_nextContactAt_idx" ON "CrmCustomer"("tenantId", "nextContactAt");
CREATE INDEX "CrmCustomer_tenantId_archivedAt_idx" ON "CrmCustomer"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "CrmContact_tenantId_id_key" ON "CrmContact"("tenantId", "id");
CREATE INDEX "CrmContact_tenantId_customerId_primary_idx" ON "CrmContact"("tenantId", "customerId", "primary");
CREATE INDEX "CrmContact_tenantId_owner_createdAt_idx" ON "CrmContact"("tenantId", "owner", "createdAt");
CREATE INDEX "CrmContact_tenantId_nextContactAt_idx" ON "CrmContact"("tenantId", "nextContactAt");
CREATE INDEX "CrmContact_tenantId_archivedAt_idx" ON "CrmContact"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "CrmOpportunity_tenantId_number_key" ON "CrmOpportunity"("tenantId", "number");
CREATE UNIQUE INDEX "CrmOpportunity_tenantId_id_key" ON "CrmOpportunity"("tenantId", "id");
CREATE INDEX "CrmOpportunity_tenantId_customerId_stage_idx" ON "CrmOpportunity"("tenantId", "customerId", "stage");
CREATE INDEX "CrmOpportunity_tenantId_owner_stage_createdAt_idx" ON "CrmOpportunity"("tenantId", "owner", "stage", "createdAt");
CREATE INDEX "CrmOpportunity_tenantId_expectedCloseAt_idx" ON "CrmOpportunity"("tenantId", "expectedCloseAt");
CREATE INDEX "CrmOpportunity_tenantId_archivedAt_idx" ON "CrmOpportunity"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "CrmFollowUp_tenantId_id_key" ON "CrmFollowUp"("tenantId", "id");
CREATE INDEX "CrmFollowUp_tenantId_targetType_targetId_createdAt_idx" ON "CrmFollowUp"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "CrmFollowUp_tenantId_createdBy_createdAt_idx" ON "CrmFollowUp"("tenantId", "createdBy", "createdAt");
CREATE INDEX "CrmFollowUp_tenantId_nextContactAt_idx" ON "CrmFollowUp"("tenantId", "nextContactAt");

CREATE UNIQUE INDEX "CrmTask_tenantId_id_key" ON "CrmTask"("tenantId", "id");
CREATE INDEX "CrmTask_tenantId_assignee_status_dueAt_idx" ON "CrmTask"("tenantId", "assignee", "status", "dueAt");
CREATE INDEX "CrmTask_tenantId_targetType_targetId_idx" ON "CrmTask"("tenantId", "targetType", "targetId");

CREATE UNIQUE INDEX "CrmAttachment_tenantId_storageKey_key" ON "CrmAttachment"("tenantId", "storageKey");
CREATE UNIQUE INDEX "CrmAttachment_tenantId_id_key" ON "CrmAttachment"("tenantId", "id");
CREATE INDEX "CrmAttachment_tenantId_targetType_targetId_createdAt_idx" ON "CrmAttachment"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "CrmAttachment_tenantId_uploadedBy_createdAt_idx" ON "CrmAttachment"("tenantId", "uploadedBy", "createdAt");

CREATE UNIQUE INDEX "CrmOwnerTransfer_tenantId_id_key" ON "CrmOwnerTransfer"("tenantId", "id");
CREATE INDEX "CrmOwnerTransfer_tenantId_targetType_targetId_createdAt_idx" ON "CrmOwnerTransfer"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "CrmOwnerTransfer_tenantId_toOwner_createdAt_idx" ON "CrmOwnerTransfer"("tenantId", "toOwner", "createdAt");

CREATE UNIQUE INDEX "CrmAuditEvent_tenantId_id_key" ON "CrmAuditEvent"("tenantId", "id");
CREATE INDEX "CrmAuditEvent_tenantId_targetType_targetId_createdAt_idx" ON "CrmAuditEvent"("tenantId", "targetType", "targetId", "createdAt");
CREATE INDEX "CrmAuditEvent_tenantId_actor_createdAt_idx" ON "CrmAuditEvent"("tenantId", "actor", "createdAt");
CREATE INDEX "CrmAuditEvent_tenantId_action_createdAt_idx" ON "CrmAuditEvent"("tenantId", "action", "createdAt");

ALTER TABLE "CrmTag" ADD CONSTRAINT "CrmTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "CrmCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "CrmCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOwnerTransfer" ADD CONSTRAINT "CrmOwnerTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmAuditEvent" ADD CONSTRAINT "CrmAuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
