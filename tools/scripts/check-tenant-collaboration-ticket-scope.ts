import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'prisma/schema.prisma',
    markers: [
      'ticketCategories       TicketCategory[]',
      'tickets                Ticket[]',
      'ticketComments         TicketComment[]',
      'ticketTransitions      TicketTransition[]',
      'ticketAttachments      TicketAttachment[]',
      'model TicketCategory',
      'model Ticket',
      'model TicketComment',
      'model TicketTransition',
      'model TicketAttachment',
      '@@unique([tenantId, number])',
      '@@unique([tenantId, id])',
      '@@index([tenantId, status, priority, createdAt])',
      '@@index([tenantId, slaBreached, responseDueAt])',
      '@@index([tenantId, slaBreached, resolutionDueAt])',
      '@@index([tenantId, ticketId, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260629123000_add_ticket_module/migration.sql',
    markers: [
      'CREATE TABLE "TicketCategory"',
      'CREATE TABLE "Ticket"',
      'CREATE TABLE "TicketComment"',
      'CREATE TABLE "TicketTransition"',
      'CREATE TABLE "TicketAttachment"',
      'Ticket_tenantId_id_key',
      'Ticket_tenantId_number_key',
      'Ticket_tenantId_fkey',
      'TicketComment_tenantId_ticketId_fkey',
      'TicketTransition_tenantId_ticketId_fkey',
      'TicketAttachment_tenantId_ticketId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/ticket/prisma-ticket.repository.ts',
    markers: [
      'resolveCurrentTenantId',
      'const tenantId = resolveCurrentTenantId();',
      'ticket.findMany({',
      'where: { tenantId_id: { tenantId, id } }',
      'ticketComment.create({',
      'ticketAttachment.create({',
      'ticketTransition.create({',
      'tenantId,',
      'ticketId: id',
      'sendSlaReminders',
      'batchAssignTickets',
      'exportTicketTransitions',
      'systemNoticeDelivery.create',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/ticket/ticket.controller.ts',
    markers: [
      "RequirePermission('collaboration:ticket:read')",
      "RequirePermission('collaboration:ticket:create')",
      "RequirePermission('collaboration:ticket:update')",
      "RequirePermission('collaboration:ticket:assign')",
      "RequirePermission('collaboration:ticket:comment')",
      "RequirePermission('collaboration:ticket:close')",
      "RequirePermission('collaboration:ticket:delete')",
    ],
  },
  {
    file: 'packages/module-registry/src/modules.ts',
    markers: [
      "code: 'collaboration.ticket'",
      "'collaboration'",
      "'ticket'",
      "'collaboration.tickets'",
      "'collaboration:ticket:read'",
      "{ action: 'assign', title: 'Assign' }",
      "{ action: 'comment', title: 'Comment' }",
      "{ action: 'close', title: 'Close', dangerous: true }",
    ],
  },
  {
    file: 'tools/smoke/smoke-core-collaboration-tickets.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'TICKET_SLA_JOB_CODE',
      'assertForeignTenantTicketHidden',
      'assertForeignTenantTicketPreserved',
      'collaboration.tickets.foreign-hidden',
      'collaboration.tickets.sla-reminder-notification',
      'collaboration.tickets.sla-scheduler-dispatch-worker',
      'collaboration.tickets.batch-assign',
      'collaboration.tickets.export',
      'collaboration.tickets.status-flow',
      'collaboration.tickets.archive',
    ],
  },
  {
    file: 'apps/admin/src/pages/Collaboration/Tickets.tsx',
    markers: [
      'tenantId',
      'pages.collaboration.tickets.fields.tenantId',
      'listOpenCoreTickets',
      'getOpenCoreTicket',
      'createOpenCoreTicket',
      'assignOpenCoreTicket',
      'addOpenCoreTicketComment',
      'addOpenCoreTicketAttachment',
      'collaboration:ticket:create',
      'collaboration:ticket:assign',
      'collaboration:ticket:comment',
      'collaboration:ticket:close',
      'collaboration:ticket:delete',
    ],
  },
  {
    file: 'packages/scheduler/src/scheduler/scheduler.records.ts',
    markers: [
      "code: 'collaboration.ticket-sla-reminders'",
      "queueName: 'collaboration'",
      "handlerKey: 'collaboration.ticketSlaReminders'",
      "cron: '30 * * * *'",
    ],
  },
  {
    file: 'packages/scheduler/src/scheduler/scheduler.executor.ts',
    markers: [
      "'collaboration.ticketSlaReminders'",
      'sendTicketSlaRemindersForTenant',
      'systemNoticeDelivery.create',
      'slaNotifiedAt: null',
    ],
  },
  {
    file: 'packages/scheduler/src/scheduler/scheduler.runtime.ts',
    markers: [
      "DEFAULT_RUNTIME_QUEUE_NAMES = ['collaboration']",
      'dispatchDueJobs',
      'claimQueuedJobs',
      'runWithRequestContext',
    ],
  },
  {
    file: 'packages/sdk/src/collaboration-client.ts',
    markers: [
      'listTickets',
      'getTicket',
      'createTicket',
      'assignTicket',
      'changeTicketStatus',
      'addTicketComment',
      'addTicketAttachment',
      'archiveTicket',
    ],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-collaboration-ticket-scope',
      'smoke:core-collaboration-tickets',
    ],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant collaboration ticket marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant collaboration ticket scope guard passed.');
