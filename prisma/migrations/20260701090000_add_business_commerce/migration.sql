CREATE TABLE "BusinessProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "status" TEXT NOT NULL DEFAULT 'active',
    "listPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "customerId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "owner" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessQuoteLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "productSku" TEXT,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessQuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "opportunityId" TEXT,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "owner" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "signedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessReceivable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
    "contractId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessReceivable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessProduct_tenantId_sku_key" ON "BusinessProduct"("tenantId", "sku");
CREATE UNIQUE INDEX "BusinessProduct_tenantId_id_key" ON "BusinessProduct"("tenantId", "id");
CREATE INDEX "BusinessProduct_tenantId_status_category_createdAt_idx" ON "BusinessProduct"("tenantId", "status", "category", "createdAt");
CREATE INDEX "BusinessProduct_tenantId_archivedAt_idx" ON "BusinessProduct"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "BusinessQuote_tenantId_number_key" ON "BusinessQuote"("tenantId", "number");
CREATE UNIQUE INDEX "BusinessQuote_tenantId_id_key" ON "BusinessQuote"("tenantId", "id");
CREATE INDEX "BusinessQuote_tenantId_customerId_status_idx" ON "BusinessQuote"("tenantId", "customerId", "status");
CREATE INDEX "BusinessQuote_tenantId_owner_status_createdAt_idx" ON "BusinessQuote"("tenantId", "owner", "status", "createdAt");
CREATE INDEX "BusinessQuote_tenantId_opportunityId_idx" ON "BusinessQuote"("tenantId", "opportunityId");
CREATE INDEX "BusinessQuote_tenantId_validUntil_idx" ON "BusinessQuote"("tenantId", "validUntil");
CREATE INDEX "BusinessQuote_tenantId_archivedAt_idx" ON "BusinessQuote"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "BusinessQuoteLine_tenantId_id_key" ON "BusinessQuoteLine"("tenantId", "id");
CREATE INDEX "BusinessQuoteLine_tenantId_quoteId_createdAt_idx" ON "BusinessQuoteLine"("tenantId", "quoteId", "createdAt");
CREATE INDEX "BusinessQuoteLine_tenantId_productId_idx" ON "BusinessQuoteLine"("tenantId", "productId");

CREATE UNIQUE INDEX "BusinessContract_tenantId_number_key" ON "BusinessContract"("tenantId", "number");
CREATE UNIQUE INDEX "BusinessContract_tenantId_id_key" ON "BusinessContract"("tenantId", "id");
CREATE INDEX "BusinessContract_tenantId_customerId_status_idx" ON "BusinessContract"("tenantId", "customerId", "status");
CREATE INDEX "BusinessContract_tenantId_owner_status_createdAt_idx" ON "BusinessContract"("tenantId", "owner", "status", "createdAt");
CREATE INDEX "BusinessContract_tenantId_quoteId_idx" ON "BusinessContract"("tenantId", "quoteId");
CREATE INDEX "BusinessContract_tenantId_opportunityId_idx" ON "BusinessContract"("tenantId", "opportunityId");
CREATE INDEX "BusinessContract_tenantId_effectiveTo_idx" ON "BusinessContract"("tenantId", "effectiveTo");
CREATE INDEX "BusinessContract_tenantId_archivedAt_idx" ON "BusinessContract"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "BusinessReceivable_tenantId_number_key" ON "BusinessReceivable"("tenantId", "number");
CREATE UNIQUE INDEX "BusinessReceivable_tenantId_id_key" ON "BusinessReceivable"("tenantId", "id");
CREATE INDEX "BusinessReceivable_tenantId_contractId_status_idx" ON "BusinessReceivable"("tenantId", "contractId", "status");
CREATE INDEX "BusinessReceivable_tenantId_customerId_status_idx" ON "BusinessReceivable"("tenantId", "customerId", "status");
CREATE INDEX "BusinessReceivable_tenantId_status_dueAt_idx" ON "BusinessReceivable"("tenantId", "status", "dueAt");

ALTER TABLE "BusinessProduct" ADD CONSTRAINT "BusinessProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessQuote" ADD CONSTRAINT "BusinessQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessQuote" ADD CONSTRAINT "BusinessQuote_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "BusinessCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessQuoteLine" ADD CONSTRAINT "BusinessQuoteLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessQuoteLine" ADD CONSTRAINT "BusinessQuoteLine_tenantId_quoteId_fkey" FOREIGN KEY ("tenantId", "quoteId") REFERENCES "BusinessQuote"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessContract" ADD CONSTRAINT "BusinessContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessContract" ADD CONSTRAINT "BusinessContract_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "BusinessCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReceivable" ADD CONSTRAINT "BusinessReceivable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReceivable" ADD CONSTRAINT "BusinessReceivable_tenantId_contractId_fkey" FOREIGN KEY ("tenantId", "contractId") REFERENCES "BusinessContract"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReceivable" ADD CONSTRAINT "BusinessReceivable_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "BusinessCustomer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
