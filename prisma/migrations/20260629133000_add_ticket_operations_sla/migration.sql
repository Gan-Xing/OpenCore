-- C025 ticket operations loop: SLA markers and reminder state.
ALTER TABLE "Ticket" ADD COLUMN "firstRespondedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "responseDueAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "resolutionDueAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "slaBreached" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ticket" ADD COLUMN "slaNotifiedAt" TIMESTAMP(3);

CREATE INDEX "Ticket_tenantId_slaBreached_responseDueAt_idx" ON "Ticket"("tenantId", "slaBreached", "responseDueAt");
CREATE INDEX "Ticket_tenantId_slaBreached_resolutionDueAt_idx" ON "Ticket"("tenantId", "slaBreached", "resolutionDueAt");
