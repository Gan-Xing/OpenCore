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
const FOREIGN_TENANT_ID = 'tenant_crm_smoke_foreign';
const FOREIGN_LEAD_ID = `crm_foreign_lead_${runSafeId}`;
const FOREIGN_CUSTOMER_ID = `crm_foreign_customer_${runSafeId}`;

type CreatedCrmIds = {
  contacts: string[];
  customers: string[];
  leads: string[];
  opportunities: string[];
  tags: string[];
};

async function main() {
  const created: CreatedCrmIds = {
    contacts: [],
    customers: [],
    leads: [],
    opportunities: [],
    tags: [],
  };
  let token: string | undefined;

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      for (const path of [
        '/api/industry/crm/summary',
        '/api/industry/crm/export',
        '/api/industry/crm/tags',
        '/api/industry/crm/leads',
        '/api/industry/crm/leads/{id}',
        '/api/industry/crm/leads/{id}/convert',
        '/api/industry/crm/leads/{id}/transfer',
        '/api/industry/crm/customers',
        '/api/industry/crm/customers/{id}',
        '/api/industry/crm/contacts',
        '/api/industry/crm/opportunities',
        '/api/industry/crm/opportunities/{id}/stage',
        '/api/industry/crm/follow-ups',
        '/api/industry/crm/tasks',
        '/api/industry/crm/tasks/{id}/complete',
        '/api/industry/crm/attachments',
        '/api/industry/crm/owner-transfers',
        '/api/industry/crm/audit-events',
      ]) {
        assertOpenApiPath(openApi, path);
      }
      for (const schemaName of [
        'CrmLeadPageDto',
        'CrmCustomerPageDto',
        'CrmContactPageDto',
        'CrmOpportunityPageDto',
        'CrmTaskPageDto',
      ]) {
        assertOpenApiSchemaProperties(openApi, schemaName, [
          'items',
          'page',
          'pageSize',
          'total',
          'totalPages',
        ]);
      }
      assertOpenApiSchemaProperties(openApi, 'CrmDeleteResultDto', ['deleted']);
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    await seedForeignTenantCrm();
    await assertForeignTenantCrmHidden(token);

    const seededTags = await clients.crm.listTags(token);
    assertPageContainsId(seededTags, 'crm_tag_key_account', 'seeded CRM tags');
    const seededCustomers = await clients.crm.listCustomers(token);
    assertPageContainsId(
      seededCustomers,
      'crm_customer_northstar',
      'seeded CRM customers',
    );

    const tag = await clients.crm.createTag(token, {
      code: `smoke-${runSafeId}`,
      color: 'cyan',
      name: `Smoke ${runId}`,
    });
    created.tags.push(assertString(tag.id, 'created CRM tag id'));

    const lead = await clients.crm.createLead(token, {
      company: `Smoke Co ${runId}`,
      email: `lead-${runSafeId}@example.com`,
      mobile: '+1-555-0300',
      name: `Smoke Lead ${runId}`,
      nextContactAt: '2026-07-04T09:00:00.000Z',
      owner: username,
      rating: 'warm',
      source: 'website',
      tags: ['key-account', tag.code],
    });
    created.leads.push(assertString(lead.id, 'created CRM lead id'));
    assertEqual(lead.tenantId, ROOT_TENANT_ID, 'created CRM lead tenant id');
    assertEqual(lead.status, 'new', 'created CRM lead status');

    const updatedLead = await clients.crm.updateLead(token, lead.id, {
      rating: 'hot',
      status: 'qualified',
    });
    assertEqual(updatedLead.status, 'qualified', 'updated CRM lead status');

    const leadFollowUp = await clients.crm.createFollowUp(token, {
      content: 'CRM smoke follow-up.',
      createdBy: username,
      method: 'call',
      nextContactAt: '2026-07-05T10:00:00.000Z',
      outcome: 'Qualified for rollout.',
      targetId: lead.id,
      targetType: 'lead',
    });
    assertEqual(leadFollowUp.targetId, lead.id, 'lead follow-up target id');

    const leadTask = await clients.crm.createTask(token, {
      assignee: username,
      createdBy: username,
      dueAt: '2026-07-05T11:00:00.000Z',
      priority: 'high',
      targetId: lead.id,
      targetType: 'lead',
      title: `Qualify lead ${runId}`,
    });
    const completedLeadTask = await clients.crm.completeTask(
      token,
      leadTask.id,
      { actor: username },
    );
    assertEqual(completedLeadTask.status, 'done', 'completed CRM task status');

    const leadAttachment = await clients.crm.createAttachment(token, {
      mimeType: 'text/plain',
      originalName: `lead-${runSafeId}.txt`,
      sizeBytes: 128,
      storageKey: `tenant/${ROOT_TENANT_ID}/crm/${runSafeId}/lead.txt`,
      targetId: lead.id,
      targetType: 'lead',
      uploadedBy: username,
    });
    assertEqual(leadAttachment.targetId, lead.id, 'lead attachment target id');

    const transferredLead = await clients.crm.transferLeadOwner(
      token,
      lead.id,
      {
        actor: username,
        reason: 'CRM smoke reassignment.',
        toOwner: 'sales-admin',
      },
    );
    assertEqual(
      transferredLead.owner,
      'sales-admin',
      'transferred CRM lead owner',
    );

    const converted = await clients.crm.convertLead(token, lead.id, {
      actor: username,
      amount: '25000.00',
      customerName: `Smoke Customer ${runId}`,
      opportunityName: `Smoke Opportunity ${runId}`,
    });
    created.customers.push(
      assertString(converted.customer.id, 'converted customer id'),
    );
    assertEqual(
      converted.lead.status,
      'converted',
      'converted CRM lead status',
    );
    assertEqual(
      converted.customer.tenantId,
      ROOT_TENANT_ID,
      'converted CRM customer tenant id',
    );
    if (!converted.opportunity) {
      throw new Error('CRM lead conversion did not create an opportunity');
    }
    created.opportunities.push(converted.opportunity.id);
    await smoke.apiRequest(
      `/industry/crm/leads/${encodeURIComponent(lead.id)}/convert`,
      {
        body: { actor: username },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const customer = await clients.crm.getCustomer(
      token,
      converted.customer.id,
    );
    assertEqual(customer.name, converted.customer.name, 'converted customer');

    const contact = await clients.crm.createContact(token, {
      customerId: customer.id,
      decisionRole: 'decision-maker',
      email: `buyer-${runSafeId}@example.com`,
      mobile: '+1-555-0400',
      name: `Smoke Buyer ${runId}`,
      owner: username,
      primary: true,
      title: 'VP Operations',
    });
    created.contacts.push(assertString(contact.id, 'created CRM contact id'));
    assertEqual(
      contact.customerId,
      customer.id,
      'created CRM contact customer',
    );

    const opportunity = await clients.crm.createOpportunity(token, {
      amount: '42000.00',
      customerId: customer.id,
      expectedCloseAt: '2026-08-15T00:00:00.000Z',
      name: `Smoke Expansion ${runId}`,
      owner: username,
      probability: 40,
      stage: 'qualification',
      tags: [tag.code],
    });
    created.opportunities.push(
      assertString(opportunity.id, 'created CRM opportunity id'),
    );

    const proposal = await clients.crm.changeOpportunityStage(
      token,
      opportunity.id,
      {
        actor: username,
        stage: 'proposal',
      },
    );
    assertEqual(proposal.stage, 'proposal', 'proposal opportunity stage');
    const won = await clients.crm.changeOpportunityStage(
      token,
      opportunity.id,
      {
        actor: username,
        closeReason: 'CRM smoke won.',
        stage: 'won',
      },
    );
    assertEqual(won.stage, 'won', 'won opportunity stage');

    const transferredCustomer = await clients.crm.transferCustomerOwner(
      token,
      customer.id,
      {
        actor: username,
        reason: 'CRM smoke customer owner handoff.',
        toOwner: 'account-admin',
      },
    );
    assertEqual(
      transferredCustomer.owner,
      'account-admin',
      'transferred CRM customer owner',
    );

    const transferredOpportunity = await clients.crm.transferOpportunityOwner(
      token,
      opportunity.id,
      {
        actor: username,
        reason: 'CRM smoke opportunity owner handoff.',
        toOwner: 'sales-admin',
      },
    );
    assertEqual(
      transferredOpportunity.owner,
      'sales-admin',
      'transferred CRM opportunity owner',
    );

    const summary = await clients.crm.getSummary(token);
    assertNumberAtLeast(summary.leads, 1, 'CRM summary leads');
    assertNumberAtLeast(summary.customers, 1, 'CRM summary customers');
    assertNumberAtLeast(summary.opportunities, 1, 'CRM summary opportunities');

    const exported = await clients.crm.exportCrm(token, {
      page: 1,
      pageSize: 50,
      resource: 'leads',
    });
    assertEqual(exported.scope, 'current-page', 'CRM export scope');
    assertDecodedExportIncludes(exported.contentBase64, lead.name, 'CRM leads');

    const transfers = await clients.crm.listOwnerTransfers(token, {
      targetId: customer.id,
      targetType: 'customer',
    });
    assertNumberAtLeast(transfers.items.length, 1, 'CRM owner transfer ledger');
    const auditEvents = await clients.crm.listAuditEvents(token, {
      targetId: lead.id,
      targetType: 'lead',
    });
    assertArray(auditEvents.items, 'CRM audit event items');
    if (
      !auditEvents.items.some((event) => event.action === 'create-follow-up')
    ) {
      throw new Error('CRM audit events did not include create-follow-up');
    }

    const archivedContact = await clients.crm.archiveContact(token, contact.id);
    assertEqual(archivedContact.deleted, true, 'archived CRM contact');
    assertPageExcludesId(
      await clients.crm.listContacts(token, {
        customerId: customer.id,
        page: 1,
        pageSize: 50,
      }),
      contact.id,
      'archived CRM contact list',
    );
    const archivedOpportunity = await clients.crm.archiveOpportunity(
      token,
      opportunity.id,
    );
    assertEqual(archivedOpportunity.deleted, true, 'archived CRM opportunity');
    assertPageExcludesId(
      await clients.crm.listOpportunities(token, {
        customerId: customer.id,
        page: 1,
        pageSize: 50,
      }),
      opportunity.id,
      'archived CRM opportunity list',
    );
    const archivedLead = await clients.crm.archiveLead(token, lead.id);
    assertEqual(archivedLead.deleted, true, 'archived CRM lead');
    assertPageExcludesId(
      await clients.crm.listLeads(token, { page: 1, pageSize: 50 }),
      lead.id,
      'archived CRM lead list',
    );
    await smoke.apiRequest('/industry/crm/tasks', {
      body: {
        assignee: username,
        createdBy: username,
        targetId: lead.id,
        targetType: 'lead',
        title: `Archived target task ${runId}`,
      },
      expected: [404],
      method: 'POST',
      token,
    });
    await clients.crm.archiveCustomer(token, customer.id);
    assertPageExcludesId(
      await clients.crm.listCustomers(token, { page: 1, pageSize: 50 }),
      customer.id,
      'archived CRM customer list',
    );
    const customerContacts = await clients.crm.listContacts(token, {
      customerId: customer.id,
      page: 1,
      pageSize: 50,
    });
    assertEqual(
      customerContacts.items.length,
      0,
      'archived customer contact list',
    );
    const customerOpportunities = await clients.crm.listOpportunities(token, {
      customerId: customer.id,
      page: 1,
      pageSize: 50,
    });
    assertEqual(
      customerOpportunities.items.length,
      0,
      'archived customer opportunity list',
    );
    await smoke.apiRequest('/industry/crm/follow-ups', {
      body: {
        content: 'Archived target follow-up.',
        createdBy: username,
        method: 'call',
        targetId: customer.id,
        targetType: 'customer',
      },
      expected: [404],
      method: 'POST',
      token,
    });

    console.log('crm.foreign-hidden');
    console.log('crm.lead-conversion');
    console.log('crm.follow-up-task-attachment');
    console.log('crm.owner-transfer');
    console.log('crm.export');
    console.log('crm.audit');
    console.log('crm.archive');
    console.log(`OpenCore CRM smoke passed on ${baseUrl}`);
  } finally {
    await cleanupCreatedCrm(created);
    await cleanupForeignTenantCrm();
    smoke.setToken(undefined);
    await disconnectSmokePrisma();
  }
}

async function seedForeignTenantCrm() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantCrm();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'crm-smoke-foreign',
      name: 'CRM Smoke Foreign',
      slug: 'crm-smoke-foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'crm-smoke-foreign',
      name: 'CRM Smoke Foreign',
      slug: 'crm-smoke-foreign',
      status: 'active',
    },
  });
  await prisma.crmLead.create({
    data: {
      id: FOREIGN_LEAD_ID,
      tenantId: FOREIGN_TENANT_ID,
      company: 'Foreign CRM Co',
      name: `Foreign CRM lead ${runId}`,
      number: `LEAD-FOREIGN-${runSafeId}`,
      owner: 'foreign-admin',
      rating: 'warm',
      source: 'partner',
      status: 'new',
    },
  });
  await prisma.crmCustomer.create({
    data: {
      id: FOREIGN_CUSTOMER_ID,
      tenantId: FOREIGN_TENANT_ID,
      level: 'standard',
      name: `Foreign CRM customer ${runId}`,
      number: `CUS-FOREIGN-${runSafeId}`,
      owner: 'foreign-admin',
      source: 'partner',
      status: 'active',
    },
  });
}

async function assertForeignTenantCrmHidden(rootToken: string) {
  const leads = await clients.crm.listLeads(rootToken, { status: 'new' });
  assertPageExcludesId(leads, FOREIGN_LEAD_ID, 'foreign CRM lead list');
  const customers = await clients.crm.listCustomers(rootToken, {
    status: 'active',
  });
  assertPageExcludesId(
    customers,
    FOREIGN_CUSTOMER_ID,
    'foreign CRM customer list',
  );

  await smoke.apiRequest(
    `/industry/crm/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/industry/crm/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}`,
    {
      body: { owner: username },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/industry/crm/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}/transfer`,
    {
      body: { actor: username, toOwner: username },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/industry/crm/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}`,
    {
      expected: [404],
      method: 'DELETE',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/industry/crm/customers/${encodeURIComponent(FOREIGN_CUSTOMER_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/industry/crm/customers/${encodeURIComponent(FOREIGN_CUSTOMER_ID)}`,
    {
      body: { name: 'cross tenant write' },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await assertForeignTenantCrmPreserved();
}

async function assertForeignTenantCrmPreserved() {
  const prisma = getSmokePrisma();
  const lead = await prisma.crmLead.findUnique({
    where: { id: FOREIGN_LEAD_ID },
  });
  const customer = await prisma.crmCustomer.findUnique({
    where: { id: FOREIGN_CUSTOMER_ID },
  });

  if (
    !lead ||
    lead.tenantId !== FOREIGN_TENANT_ID ||
    lead.owner !== 'foreign-admin' ||
    lead.archivedAt ||
    !customer ||
    customer.tenantId !== FOREIGN_TENANT_ID ||
    customer.owner !== 'foreign-admin' ||
    customer.archivedAt
  ) {
    throw new Error('Foreign tenant CRM rows were changed');
  }
}

async function cleanupCreatedCrm(created: CreatedCrmIds) {
  const prisma = getSmokePrisma();
  const targetIds = [
    ...created.leads,
    ...created.customers,
    ...created.contacts,
    ...created.opportunities,
  ];

  if (targetIds.length > 0) {
    await prisma.crmAuditEvent.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.crmOwnerTransfer.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.crmAttachment.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.crmTask.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.crmFollowUp.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
  }

  if (created.customers.length > 0) {
    await prisma.crmOpportunity.deleteMany({
      where: {
        tenantId: ROOT_TENANT_ID,
        customerId: { in: created.customers },
      },
    });
    await prisma.crmContact.deleteMany({
      where: {
        tenantId: ROOT_TENANT_ID,
        customerId: { in: created.customers },
      },
    });
    await prisma.crmCustomer.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, id: { in: created.customers } },
    });
  }

  if (created.leads.length > 0) {
    await prisma.crmLead.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, id: { in: created.leads } },
    });
  }

  if (created.tags.length > 0) {
    await prisma.crmTag.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, id: { in: created.tags } },
    });
  }
}

async function cleanupForeignTenantCrm() {
  const prisma = getSmokePrisma();

  await prisma.crmAuditEvent.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmOwnerTransfer.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmAttachment.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmTask.deleteMany({ where: { tenantId: FOREIGN_TENANT_ID } });
  await prisma.crmFollowUp.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmOpportunity.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmContact.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmCustomer.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.crmLead.deleteMany({ where: { tenantId: FOREIGN_TENANT_ID } });
  await prisma.crmTag.deleteMany({ where: { tenantId: FOREIGN_TENANT_ID } });
  await prisma.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
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

function assertOpenApiSchemaProperties(
  openApi: unknown,
  schemaName: string,
  properties: readonly string[],
) {
  const schemas = (
    openApi as {
      components?: {
        schemas?: Record<string, { properties?: Record<string, unknown> }>;
      };
    }
  ).components?.schemas;
  const schema = schemas?.[schemaName];
  if (!schema) {
    throw new Error(`OpenAPI schema missing ${schemaName}`);
  }
  for (const property of properties) {
    if (!schema.properties || !(property in schema.properties)) {
      throw new Error(`OpenAPI schema ${schemaName} missing ${property}`);
    }
  }
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

void main();
