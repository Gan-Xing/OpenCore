CREATE TABLE "TicketCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
  "number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "categoryId" TEXT,
  "createdBy" TEXT NOT NULL,
  "assignee" TEXT,
  "dueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketComment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
  "ticketId" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketTransition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
  "ticketId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TicketTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'tenant_root',
  "ticketId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketCategory_tenantId_enabled_order_idx"
  ON "TicketCategory"("tenantId", "enabled", "order");

CREATE UNIQUE INDEX "TicketCategory_tenantId_code_key"
  ON "TicketCategory"("tenantId", "code");

CREATE UNIQUE INDEX "TicketCategory_tenantId_id_key"
  ON "TicketCategory"("tenantId", "id");

CREATE INDEX "Ticket_tenantId_status_priority_createdAt_idx"
  ON "Ticket"("tenantId", "status", "priority", "createdAt");

CREATE INDEX "Ticket_tenantId_assignee_status_idx"
  ON "Ticket"("tenantId", "assignee", "status");

CREATE INDEX "Ticket_tenantId_categoryId_status_idx"
  ON "Ticket"("tenantId", "categoryId", "status");

CREATE INDEX "Ticket_tenantId_archivedAt_idx"
  ON "Ticket"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "Ticket_tenantId_number_key"
  ON "Ticket"("tenantId", "number");

CREATE UNIQUE INDEX "Ticket_tenantId_id_key"
  ON "Ticket"("tenantId", "id");

CREATE INDEX "TicketComment_tenantId_ticketId_createdAt_idx"
  ON "TicketComment"("tenantId", "ticketId", "createdAt");

CREATE INDEX "TicketComment_tenantId_author_createdAt_idx"
  ON "TicketComment"("tenantId", "author", "createdAt");

CREATE INDEX "TicketTransition_tenantId_ticketId_createdAt_idx"
  ON "TicketTransition"("tenantId", "ticketId", "createdAt");

CREATE INDEX "TicketTransition_tenantId_actor_createdAt_idx"
  ON "TicketTransition"("tenantId", "actor", "createdAt");

CREATE INDEX "TicketAttachment_tenantId_ticketId_createdAt_idx"
  ON "TicketAttachment"("tenantId", "ticketId", "createdAt");

CREATE INDEX "TicketAttachment_tenantId_uploadedBy_createdAt_idx"
  ON "TicketAttachment"("tenantId", "uploadedBy", "createdAt");

CREATE UNIQUE INDEX "TicketAttachment_tenantId_storageKey_key"
  ON "TicketAttachment"("tenantId", "storageKey");

ALTER TABLE "TicketCategory"
  ADD CONSTRAINT "TicketCategory_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_tenantId_categoryId_fkey"
  FOREIGN KEY ("tenantId", "categoryId") REFERENCES "TicketCategory"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketComment"
  ADD CONSTRAINT "TicketComment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketComment"
  ADD CONSTRAINT "TicketComment_tenantId_ticketId_fkey"
  FOREIGN KEY ("tenantId", "ticketId") REFERENCES "Ticket"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketTransition"
  ADD CONSTRAINT "TicketTransition_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketTransition"
  ADD CONSTRAINT "TicketTransition_tenantId_ticketId_fkey"
  FOREIGN KEY ("tenantId", "ticketId") REFERENCES "Ticket"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketAttachment"
  ADD CONSTRAINT "TicketAttachment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketAttachment"
  ADD CONSTRAINT "TicketAttachment_tenantId_ticketId_fkey"
  FOREIGN KEY ("tenantId", "ticketId") REFERENCES "Ticket"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
