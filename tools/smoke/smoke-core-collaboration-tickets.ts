import { disconnectSmokePrisma, getSmokePrisma } from './prisma';
import {
  assertArray,
  assertEqual,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request, username } = smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const runSafeId = runId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_collaboration_ticket_smoke_foreign';
const FOREIGN_TICKET_ID = `ticket_foreign_${runSafeId}`;
const FOREIGN_CATEGORY_ID = `ticket_cat_foreign_${runSafeId}`;

async function main() {
  const createdTicketIds: string[] = [];

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiPath(openApi, '/api/collaboration/tickets');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/summary');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/export');
      assertOpenApiPath(
        openApi,
        '/api/collaboration/tickets/transitions/export',
      );
      assertOpenApiPath(openApi, '/api/collaboration/tickets/sla/reminders');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/batch/assign');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/batch/close');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/batch/archive');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}/assign');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}/status');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}/close');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}/reopen');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}/comments');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/{id}/attachments');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/categories');
      assertOpenApiPath(openApi, '/api/collaboration/tickets/categories/{id}');
    }

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    await seedForeignTenantTicket();
    await assertForeignTenantTicketHidden(token);

    const categories = await clients.collaboration.listTicketCategories(token);
    assertPageContainsId(
      categories,
      'ticket_cat_support',
      'seeded ticket categories',
    );

    const seededTickets = await clients.collaboration.listTickets(token, {
      status: 'processing',
    });
    assertPageContainsId(
      seededTickets,
      'ticket_onboarding_access',
      'seeded tickets',
    );

    const seededDetail = await clients.collaboration.getTicket(
      token,
      'ticket_onboarding_access',
    );
    assertEqual(
      seededDetail.tenantId,
      ROOT_TENANT_ID,
      'seeded ticket tenant id',
    );
    assertEqual(seededDetail.status, 'processing', 'seeded ticket status');
    assertArray(seededDetail.comments, 'seeded ticket comments');
    assertArray(seededDetail.attachments, 'seeded ticket attachments');
    assertArray(seededDetail.transitions, 'seeded ticket transitions');

    const created = await clients.collaboration.createTicket(token, {
      assignee: 'admin',
      categoryId: 'ticket_cat_support',
      createdBy: username,
      description: 'Collaboration tickets smoke description.',
      dueAt: '2026-07-01T00:00:00.000Z',
      priority: 'medium',
      title: `Smoke ticket ${runId}`,
    });
    const createdTicketId = assertString(created.id, 'created ticket id');
    createdTicketIds.push(createdTicketId);
    assertEqual(created.tenantId, ROOT_TENANT_ID, 'created ticket tenant id');
    assertEqual(created.status, 'new', 'created ticket status');
    assertEqual(created.priority, 'medium', 'created ticket priority');
    assertString(created.number, 'created ticket number');
    assertPageContainsStatus(created.transitions, 'new', 'created transition');

    const updated = await clients.collaboration.updateTicket(
      token,
      createdTicketId,
      {
        priority: 'high',
        title: `Smoke ticket updated ${runId}`,
      },
    );
    assertEqual(updated.priority, 'high', 'updated ticket priority');

    const assigned = await clients.collaboration.assignTicket(
      token,
      createdTicketId,
      {
        actor: username,
        assignee: username,
        comment: 'smoke assignment',
      },
    );
    assertEqual(assigned.assignee, username, 'assigned ticket assignee');

    const processing = await clients.collaboration.changeTicketStatus(
      token,
      createdTicketId,
      {
        actor: username,
        status: 'processing',
      },
    );
    assertEqual(processing.status, 'processing', 'processing ticket status');

    await smoke.apiRequest(
      `/collaboration/tickets/${encodeURIComponent(createdTicketId)}/close`,
      {
        body: { actor: username },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const pending = await clients.collaboration.changeTicketStatus(
      token,
      createdTicketId,
      {
        actor: username,
        status: 'pending_confirmation',
      },
    );
    assertEqual(
      pending.status,
      'pending_confirmation',
      'pending confirmation ticket status',
    );

    const resolved = await clients.collaboration.changeTicketStatus(
      token,
      createdTicketId,
      {
        actor: username,
        status: 'resolved',
      },
    );
    assertEqual(resolved.status, 'resolved', 'resolved ticket status');
    assertString(resolved.resolvedAt, 'resolved ticket resolvedAt');

    const closed = await clients.collaboration.closeTicket(
      token,
      createdTicketId,
      {
        actor: username,
      },
    );
    assertEqual(closed.status, 'closed', 'closed ticket status');
    assertString(closed.closedAt, 'closed ticket closedAt');

    const reopened = await clients.collaboration.reopenTicket(
      token,
      createdTicketId,
      {
        actor: username,
      },
    );
    assertEqual(reopened.status, 'processing', 'reopened ticket status');

    const commented = await clients.collaboration.addTicketComment(
      token,
      createdTicketId,
      {
        author: username,
        body: 'Smoke ticket comment.',
      },
    );
    if (!commented.comments.some((comment) => comment.body.includes('Smoke'))) {
      throw new Error('Created ticket comment was not returned');
    }
    await assertTicketNotificationDelivered(created.number, 'assigned');
    await assertTicketNotificationDelivered(
      created.number,
      'status-processing',
    );
    await assertTicketNotificationDelivered(created.number, 'commented');

    const attached = await clients.collaboration.addTicketAttachment(
      token,
      createdTicketId,
      {
        mimeType: 'text/plain',
        originalName: `ticket-${runSafeId}.txt`,
        sizeBytes: 64,
        storageKey: `tenant/${ROOT_TENANT_ID}/tickets/${runSafeId}.txt`,
        uploadedBy: username,
      },
    );
    if (
      !attached.attachments.some((attachment) =>
        attachment.storageKey.includes(runSafeId),
      )
    ) {
      throw new Error('Created ticket attachment was not returned');
    }

    const overdueTicket = await clients.collaboration.createTicket(token, {
      assignee: username,
      categoryId: 'ticket_cat_support',
      createdBy: username,
      description: 'Overdue collaboration ticket smoke description.',
      dueAt: '2026-06-01T00:00:00.000Z',
      priority: 'urgent',
      responseDueAt: '2026-06-01T00:00:00.000Z',
      resolutionDueAt: '2026-06-01T01:00:00.000Z',
      title: `Overdue smoke ticket ${runId}`,
    });
    createdTicketIds.push(assertString(overdueTicket.id, 'overdue ticket id'));
    assertEqual(overdueTicket.slaBreached, true, 'overdue ticket SLA marker');
    assertEqual(
      overdueTicket.responseOverdue,
      true,
      'overdue ticket response marker',
    );

    const overdueList = await clients.collaboration.listTickets(token, {
      keyword: 'Overdue smoke ticket',
      overdue: true,
    });
    assertPageContainsId(
      overdueList,
      overdueTicket.id,
      'overdue ticket filter',
    );

    const dashboard =
      await clients.collaboration.getTicketDashboardSummary(token);
    assertNumberAtLeast(dashboard.pending, 1, 'ticket dashboard pending');
    assertNumberAtLeast(dashboard.overdue, 1, 'ticket dashboard overdue');
    if (!dashboard.byAssignee.some((bucket) => bucket.key === username)) {
      throw new Error('Ticket dashboard assignee bucket is missing smoke user');
    }

    const reminders = await clients.collaboration.sendTicketSlaReminders(token);
    assertNumberAtLeast(reminders.markedOverdue, 1, 'SLA reminders marked');
    assertNumberAtLeast(reminders.notified, 1, 'SLA reminders notified');
    await assertTicketNotificationDelivered(
      overdueTicket.number,
      'sla-overdue',
    );

    const ticketExport = await clients.collaboration.exportTickets(token, {
      keyword: 'Overdue smoke ticket',
      overdue: true,
    });
    assertEqual(
      ticketExport.contentType,
      'text/csv;charset=utf-8',
      'ticket export content type',
    );
    assertString(ticketExport.contentBase64, 'ticket export body');
    assertDecodedExportIncludes(
      ticketExport.contentBase64,
      overdueTicket.number,
      'ticket export number',
    );

    const transitionExport =
      await clients.collaboration.exportTicketTransitions(token, {
        ticketId: createdTicketId,
      });
    assertDecodedExportIncludes(
      transitionExport.contentBase64,
      createdTicketId,
      'ticket transition export ticket id',
    );

    const batchAssign = await clients.collaboration.batchAssignTickets(token, {
      actor: username,
      assignee: username,
      ids: [createdTicketId, overdueTicket.id, FOREIGN_TICKET_ID],
    });
    assertEqual(batchAssign.updated, 2, 'batch assign updated count');
    assertEqual(batchAssign.skipped, 1, 'batch assign skipped count');

    await clients.collaboration.changeTicketStatus(token, createdTicketId, {
      actor: username,
      status: 'pending_confirmation',
    });
    await clients.collaboration.changeTicketStatus(token, createdTicketId, {
      actor: username,
      status: 'resolved',
    });
    const batchClose = await clients.collaboration.batchCloseTickets(token, {
      actor: username,
      ids: [createdTicketId, FOREIGN_TICKET_ID],
    });
    assertEqual(batchClose.updated, 1, 'batch close updated count');
    assertEqual(batchClose.skipped, 1, 'batch close skipped count');

    const batchArchiveTicketA = await clients.collaboration.createTicket(
      token,
      {
        assignee: username,
        createdBy: username,
        description: 'Batch archive smoke ticket A.',
        priority: 'low',
        title: `Batch archive A ${runId}`,
      },
    );
    const batchArchiveTicketB = await clients.collaboration.createTicket(
      token,
      {
        assignee: username,
        createdBy: username,
        description: 'Batch archive smoke ticket B.',
        priority: 'low',
        title: `Batch archive B ${runId}`,
      },
    );
    createdTicketIds.push(batchArchiveTicketA.id, batchArchiveTicketB.id);
    const batchArchive = await clients.collaboration.batchArchiveTickets(
      token,
      {
        actor: username,
        ids: [
          batchArchiveTicketA.id,
          batchArchiveTicketB.id,
          FOREIGN_TICKET_ID,
        ],
      },
    );
    assertEqual(batchArchive.updated, 2, 'batch archive updated count');
    assertEqual(batchArchive.skipped, 1, 'batch archive skipped count');
    await assertForeignTenantTicketPreserved();

    await assertTicketAuditRecorded('assign');

    await clients.collaboration.archiveTicket(token, createdTicketId);
    const hiddenAfterArchive = await clients.collaboration.listTickets(token, {
      keyword: runId,
    });
    assertPageExcludesId(
      hiddenAfterArchive,
      createdTicketId,
      'archived ticket default list',
    );
    const visibleArchived = await clients.collaboration.listTickets(token, {
      includeArchived: true,
      keyword: runId,
    });
    assertPageContainsId(
      visibleArchived,
      createdTicketId,
      'archived ticket includeArchived list',
    );

    await cleanupCreatedTickets(createdTicketIds);
    createdTicketIds.length = 0;

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs
            ? [
                'openapi.collaboration-ticket-list-path',
                'openapi.collaboration-ticket-summary-path',
                'openapi.collaboration-ticket-export-path',
                'openapi.collaboration-ticket-transition-export-path',
                'openapi.collaboration-ticket-sla-reminder-path',
                'openapi.collaboration-ticket-batch-paths',
                'openapi.collaboration-ticket-detail-path',
                'openapi.collaboration-ticket-assign-path',
                'openapi.collaboration-ticket-status-path',
                'openapi.collaboration-ticket-close-path',
                'openapi.collaboration-ticket-reopen-path',
                'openapi.collaboration-ticket-comments-path',
                'openapi.collaboration-ticket-attachments-path',
                'openapi.collaboration-ticket-categories-path',
              ]
            : []),
          'auth.login',
          'collaboration.tickets.foreign-hidden',
          'collaboration.tickets.seeded-list-detail',
          'collaboration.tickets.create',
          'collaboration.tickets.update',
          'collaboration.tickets.assign',
          'collaboration.tickets.invalid-close-guard',
          'collaboration.tickets.status-flow',
          'collaboration.tickets.close',
          'collaboration.tickets.reopen',
          'collaboration.tickets.comment',
          'collaboration.tickets.attachment',
          'collaboration.tickets.sla-overdue-filter',
          'collaboration.tickets.sla-reminder-notification',
          'collaboration.tickets.dashboard-summary',
          'collaboration.tickets.export',
          'collaboration.tickets.transition-export',
          'collaboration.tickets.batch-assign',
          'collaboration.tickets.batch-close',
          'collaboration.tickets.batch-archive',
          'collaboration.tickets.audit',
          'collaboration.tickets.archive',
        ],
      }),
    );
  } catch (error) {
    await cleanupCreatedTickets(createdTicketIds);
    throw error;
  } finally {
    await cleanupForeignTenantTicket().catch(() => undefined);
    await disconnectSmokePrisma();
  }
}

async function cleanupCreatedTickets(ids: readonly string[]) {
  if (ids.length === 0) {
    return;
  }

  await getSmokePrisma().ticket.deleteMany({
    where: { id: { in: [...ids] } },
  });
}

async function seedForeignTenantTicket() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantTicket();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'collab-ticket-smoke-foreign',
      slug: 'collab-ticket-smoke-foreign',
      name: 'Collaboration Ticket Smoke Foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'collab-ticket-smoke-foreign',
      slug: 'collab-ticket-smoke-foreign',
      name: 'Collaboration Ticket Smoke Foreign',
      status: 'active',
    },
  });
  await prisma.ticketCategory.create({
    data: {
      id: FOREIGN_CATEGORY_ID,
      tenantId: FOREIGN_TENANT_ID,
      code: `foreign-${runSafeId}`,
      name: 'Foreign Ticket Category',
    },
  });
  await prisma.ticket.create({
    data: {
      id: FOREIGN_TICKET_ID,
      tenantId: FOREIGN_TENANT_ID,
      number: `TCK-FOREIGN-${runSafeId}`,
      title: `Foreign smoke ticket ${runId}`,
      description: 'Foreign tenant ticket description.',
      status: 'new',
      priority: 'medium',
      categoryId: FOREIGN_CATEGORY_ID,
      createdBy: 'foreign-admin',
      assignee: 'foreign-admin',
    },
  });
  await prisma.ticketTransition.create({
    data: {
      tenantId: FOREIGN_TENANT_ID,
      ticketId: FOREIGN_TICKET_ID,
      toStatus: 'new',
      actor: 'foreign-admin',
      comment: 'created',
    },
  });
}

async function assertForeignTenantTicketHidden(rootToken: string) {
  const list = await clients.collaboration.listTickets(rootToken, {
    status: 'new',
  });
  assertPageExcludesId(list, FOREIGN_TICKET_ID, 'foreign ticket list');

  await smoke.apiRequest(
    `/collaboration/tickets/${encodeURIComponent(FOREIGN_TICKET_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/collaboration/tickets/${encodeURIComponent(FOREIGN_TICKET_ID)}/assign`,
    {
      body: { actor: username, assignee: 'admin' },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/collaboration/tickets/${encodeURIComponent(FOREIGN_TICKET_ID)}/status`,
    {
      body: { actor: username, status: 'processing' },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/collaboration/tickets/${encodeURIComponent(FOREIGN_TICKET_ID)}/comments`,
    {
      body: { author: username, body: 'cross tenant comment' },
      expected: [404],
      method: 'POST',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/collaboration/tickets/${encodeURIComponent(
      FOREIGN_TICKET_ID,
    )}/attachments`,
    {
      body: {
        mimeType: 'text/plain',
        originalName: 'foreign.txt',
        sizeBytes: 12,
        storageKey: `tenant/${FOREIGN_TENANT_ID}/tickets/foreign.txt`,
        uploadedBy: username,
      },
      expected: [404],
      method: 'POST',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/collaboration/tickets/${encodeURIComponent(FOREIGN_TICKET_ID)}`,
    {
      expected: [404],
      method: 'DELETE',
      token: rootToken,
    },
  );
  await assertForeignTenantTicketPreserved();
}

async function assertForeignTenantTicketPreserved() {
  const prisma = getSmokePrisma();
  const ticket = await prisma.ticket.findUnique({
    where: { id: FOREIGN_TICKET_ID },
  });
  const comments = await prisma.ticketComment.count({
    where: { ticketId: FOREIGN_TICKET_ID },
  });
  const attachments = await prisma.ticketAttachment.count({
    where: { ticketId: FOREIGN_TICKET_ID },
  });

  if (
    !ticket ||
    ticket.tenantId !== FOREIGN_TENANT_ID ||
    ticket.status !== 'new' ||
    ticket.archivedAt ||
    comments !== 0 ||
    attachments !== 0
  ) {
    throw new Error('Foreign tenant collaboration ticket was changed');
  }
}

function assertDecodedExportIncludes(
  contentBase64: string,
  expected: string,
  label: string,
) {
  const decoded = Buffer.from(contentBase64, 'base64').toString('utf8');

  if (!decoded.includes(expected)) {
    throw new Error(`${label} export must include ${expected}`);
  }
}

async function assertTicketNotificationDelivered(
  ticketNumber: string,
  action: string,
) {
  await retryUntil(
    async () =>
      (await getSmokePrisma().systemNoticeDelivery.count({
        where: {
          tenantId: ROOT_TENANT_ID,
          title: { contains: `Ticket ${action}` },
          content: { contains: ticketNumber },
        },
      })) > 0,
    `ticket notification ${action}`,
  );
}

async function assertTicketAuditRecorded(action: string) {
  await retryUntil(
    async () =>
      (await getSmokePrisma().auditLog.count({
        where: {
          tenantId: ROOT_TENANT_ID,
          action,
          resource: 'collaboration.ticket',
        },
      })) > 0,
    `ticket audit ${action}`,
  );
}

async function retryUntil(predicate: () => Promise<boolean>, label: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`${label} was not recorded`);
}

async function cleanupForeignTenantTicket() {
  const prisma = getSmokePrisma();

  await prisma.ticket.deleteMany({ where: { id: FOREIGN_TICKET_ID } });
  await prisma.ticketCategory.deleteMany({
    where: { id: FOREIGN_CATEGORY_ID },
  });
  await prisma.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
}

function assertPageContainsId(
  page: { items: readonly { id: string }[] },
  id: string,
  label: string,
) {
  assertArray(page.items, `${label} items`);
  if (!page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must contain ${id}`);
  }
}

function assertPageExcludesId(
  page: { items: readonly { id: string }[] },
  id: string,
  label: string,
) {
  assertArray(page.items, `${label} items`);
  if (page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must not contain ${id}`);
  }
}

function assertPageContainsStatus(
  rows: readonly { toStatus: string }[],
  status: string,
  label: string,
) {
  if (!rows.some((row) => row.toStatus === status)) {
    throw new Error(`${label} must contain status ${status}`);
  }
}

void main();
