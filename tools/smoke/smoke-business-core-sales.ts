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
const FOREIGN_TENANT_ID = 'tenant_business_smoke_foreign';
const FOREIGN_LEAD_ID = `business_foreign_lead_${runSafeId}`;
const FOREIGN_CUSTOMER_ID = `business_foreign_customer_${runSafeId}`;

type CreatedBusinessIds = {
  contacts: string[];
  customers: string[];
  leads: string[];
  opportunities: string[];
  tags: string[];
};

async function main() {
  const created: CreatedBusinessIds = {
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
        '/api/business/sales/summary',
        '/api/business/core/export',
        '/api/business/core/tags',
        '/api/business/sales/leads',
        '/api/business/sales/leads/{id}',
        '/api/business/sales/leads/{id}/convert',
        '/api/business/sales/leads/{id}/transfer',
        '/api/business/core/customers',
        '/api/business/core/customers/{id}',
        '/api/business/core/contacts',
        '/api/business/sales/opportunities',
        '/api/business/sales/opportunities/{id}/stage',
        '/api/business/core/activity',
        '/api/business/core/follow-ups',
        '/api/business/core/tasks',
        '/api/business/core/tasks/{id}/complete',
        '/api/business/core/attachments',
        '/api/business/core/owner-transfers',
        '/api/business/core/audit-events',
      ]) {
        assertOpenApiPath(openApi, path);
      }
      for (const schemaName of [
        'BusinessLeadPageDto',
        'BusinessCustomerPageDto',
        'BusinessContactPageDto',
        'BusinessOpportunityPageDto',
        'BusinessActivityPageDto',
        'BusinessTaskPageDto',
      ]) {
        assertOpenApiSchemaProperties(openApi, schemaName, [
          'items',
          'page',
          'pageSize',
          'total',
          'totalPages',
        ]);
      }
      assertOpenApiSchemaProperties(openApi, 'ConvertBusinessLeadResultDto', [
        'lead',
        'customer',
      ]);
      assertOpenApiSchemaProperties(openApi, 'BusinessDeleteResultDto', [
        'deleted',
      ]);
      assertOpenApiOperationResponseSchema(
        openApi,
        '/api/business/sales/leads/{id}/convert',
        'patch',
      );
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    await seedForeignTenantBusiness();
    await assertForeignTenantBusinessHidden(token);

    const seededTags = await clients.businessCore.listTags(token);
    assertPageContainsId(
      seededTags,
      'business_tag_key_account',
      'seeded business tags',
    );
    const seededCustomers = await clients.businessCore.listCustomers(token);
    assertPageContainsId(
      seededCustomers,
      'business_customer_northstar',
      'seeded business customers',
    );

    const tag = await clients.businessCore.createTag(token, {
      code: `smoke-${runSafeId}`,
      color: 'cyan',
      name: `Smoke ${runId}`,
    });
    created.tags.push(assertString(tag.id, 'created business tag id'));

    await smoke.apiRequest('/business/sales/leads', {
      body: {
        name: `Invalid Tags Lead ${runId}`,
        owner: username,
        source: 'website',
        tags: 'not-array',
      },
      expected: [400],
      method: 'POST',
      token,
    });
    await smoke.apiRequest('/business/core/customers', {
      body: {
        name: `Invalid Archived Customer ${runId}`,
        owner: username,
        source: 'website',
        status: 'archived',
      },
      expected: [400],
      method: 'POST',
      token,
    });

    const lead = await clients.businessSales.createLead(token, {
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
    created.leads.push(assertString(lead.id, 'created business lead id'));
    assertEqual(
      lead.tenantId,
      ROOT_TENANT_ID,
      'created business lead tenant id',
    );
    assertEqual(lead.status, 'new', 'created business lead status');

    const updatedLead = await clients.businessSales.updateLead(token, lead.id, {
      rating: 'hot',
      status: 'qualified',
    });
    assertEqual(
      updatedLead.status,
      'qualified',
      'updated business lead status',
    );
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}`,
      {
        body: { status: 'archived' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}`,
      {
        body: { status: 'converted' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const leadFollowUp = await clients.businessCore.createFollowUp(token, {
      content: 'business smoke follow-up.',
      createdBy: username,
      method: 'call',
      nextContactAt: '2026-07-05T10:00:00.000Z',
      outcome: 'Qualified for rollout.',
      targetId: lead.id,
      targetType: 'lead',
    });
    assertEqual(leadFollowUp.targetId, lead.id, 'lead follow-up target id');

    const leadTask = await clients.businessCore.createTask(token, {
      assignee: username,
      createdBy: username,
      dueAt: '2026-07-05T11:00:00.000Z',
      priority: 'high',
      targetId: lead.id,
      targetType: 'lead',
      title: `Qualify lead ${runId}`,
    });
    const completedLeadTask = await clients.businessCore.completeTask(
      token,
      leadTask.id,
      { actor: username },
    );
    assertEqual(
      completedLeadTask.status,
      'done',
      'completed business task status',
    );

    const leadAttachment = await clients.businessCore.createAttachment(token, {
      mimeType: 'text/plain',
      originalName: `lead-${runSafeId}.txt`,
      sizeBytes: 128,
      storageKey: `tenant//business/${runSafeId}/lead.txt`,
      targetId: lead.id,
      targetType: 'lead',
      uploadedBy: username,
    });
    assertEqual(leadAttachment.targetId, lead.id, 'lead attachment target id');

    const transferredLead = await clients.businessSales.transferLeadOwner(
      token,
      lead.id,
      {
        actor: username,
        reason: 'business smoke reassignment.',
        toOwner: 'sales-admin',
      },
    );
    assertEqual(
      transferredLead.owner,
      'sales-admin',
      'transferred business lead owner',
    );
    const leadActivities = await clients.businessCore.listActivities(token, {
      page: 1,
      pageSize: 20,
      targetId: lead.id,
      targetType: 'lead',
    });
    assertNumberAtLeast(
      leadActivities.total,
      4,
      'business unified activity feed total',
    );
    for (const activityType of [
      'attachment',
      'audit',
      'follow-up',
      'transfer',
    ]) {
      if (
        !leadActivities.items.some((activity) => {
          return activity.activityType === activityType;
        })
      ) {
        throw new Error(`business activity feed missing ${activityType}`);
      }
    }

    const converted = await clients.businessSales.convertLead(token, lead.id, {
      actor: username,
      amount: '25000.00',
      customerName: `Smoke Customer ${runId}`,
      opportunityName: `Smoke Opportunity ${runId}`,
    });
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}`,
      {
        body: { status: 'lost' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}`,
      {
        body: { rating: 'cold' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}/transfer`,
      {
        body: { actor: username, toOwner: username },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest('/business/core/follow-ups', {
      body: {
        content: 'Converted target follow-up.',
        createdBy: username,
        method: 'call',
        targetId: lead.id,
        targetType: 'lead',
      },
      expected: [400],
      method: 'POST',
      token,
    });
    await smoke.apiRequest('/business/core/tasks', {
      body: {
        assignee: username,
        createdBy: username,
        targetId: lead.id,
        targetType: 'lead',
        title: `Converted target task ${runId}`,
      },
      expected: [400],
      method: 'POST',
      token,
    });
    await smoke.apiRequest('/business/core/attachments', {
      body: {
        mimeType: 'text/plain',
        originalName: 'converted-lead.txt',
        sizeBytes: 1,
        storageKey: `tenant//business/${runSafeId}/converted.txt`,
        targetId: lead.id,
        targetType: 'lead',
        uploadedBy: username,
      },
      expected: [400],
      method: 'POST',
      token,
    });
    created.customers.push(
      assertString(converted.customer.id, 'converted customer id'),
    );
    assertEqual(
      converted.lead.status,
      'converted',
      'converted business lead status',
    );
    assertEqual(
      converted.customer.tenantId,
      ROOT_TENANT_ID,
      'converted business customer tenant id',
    );
    if (!converted.opportunity) {
      throw new Error('business lead conversion did not create an opportunity');
    }
    created.opportunities.push(converted.opportunity.id);
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}/convert`,
      {
        body: { actor: username },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const customer = await clients.businessCore.getCustomer(
      token,
      converted.customer.id,
    );
    assertEqual(customer.name, converted.customer.name, 'converted customer');
    await smoke.apiRequest(
      `/business/core/customers/${encodeURIComponent(customer.id)}`,
      {
        body: { status: 'archived' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest('/business/sales/opportunities', {
      body: {
        customerId: customer.id,
        name: `Invalid Closed Opportunity ${runId}`,
        owner: username,
        stage: 'won',
      },
      expected: [400],
      method: 'POST',
      token,
    });

    const contact = await clients.businessCore.createContact(token, {
      customerId: customer.id,
      decisionRole: 'decision-maker',
      email: `buyer-${runSafeId}@example.com`,
      mobile: '+1-555-0400',
      name: `Smoke Buyer ${runId}`,
      owner: username,
      primary: true,
      title: 'VP Operations',
    });
    created.contacts.push(
      assertString(contact.id, 'created business contact id'),
    );
    assertEqual(
      contact.customerId,
      customer.id,
      'created business contact customer',
    );

    const opportunity = await clients.businessSales.createOpportunity(token, {
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
      assertString(opportunity.id, 'created business opportunity id'),
    );
    await smoke.apiRequest(
      `/business/sales/opportunities/${encodeURIComponent(opportunity.id)}`,
      {
        body: { stage: 'won' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/sales/opportunities/${encodeURIComponent(opportunity.id)}`,
      {
        body: { closeReason: 'Direct close reason is not allowed.' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const proposal = await clients.businessSales.changeOpportunityStage(
      token,
      opportunity.id,
      {
        actor: username,
        stage: 'proposal',
      },
    );
    assertEqual(proposal.stage, 'proposal', 'proposal opportunity stage');
    const won = await clients.businessSales.changeOpportunityStage(
      token,
      opportunity.id,
      {
        actor: username,
        closeReason: 'business smoke won.',
        stage: 'won',
      },
    );
    assertEqual(won.stage, 'won', 'won opportunity stage');
    assertPageContainsId(
      await clients.businessSales.listOpportunities(token, {
        page: 1,
        pageSize: 50,
        stage: 'won',
      }),
      opportunity.id,
      'won business opportunity list',
    );

    const transferredCustomer =
      await clients.businessCore.transferCustomerOwner(token, customer.id, {
        actor: username,
        reason: 'business smoke customer owner handoff.',
        toOwner: 'account-admin',
      });
    assertEqual(
      transferredCustomer.owner,
      'account-admin',
      'transferred business customer owner',
    );

    const transferredOpportunity =
      await clients.businessSales.transferOpportunityOwner(
        token,
        opportunity.id,
        {
          actor: username,
          reason: 'business smoke opportunity owner handoff.',
          toOwner: 'sales-admin',
        },
      );
    assertEqual(
      transferredOpportunity.owner,
      'sales-admin',
      'transferred business opportunity owner',
    );

    const summary = await clients.businessSales.getSummary(token);
    assertNumberAtLeast(summary.leads, 1, 'business summary leads');
    assertNumberAtLeast(summary.customers, 1, 'business summary customers');
    assertNumberAtLeast(
      summary.opportunities,
      1,
      'business summary opportunities',
    );

    const exported = await clients.businessSales.exportBusinessSales(token, {
      page: 1,
      pageSize: 50,
      resource: 'leads',
    });
    assertEqual(exported.scope, 'current-page', 'business export scope');
    assertDecodedExportIncludes(
      exported.contentBase64,
      lead.name,
      'business leads',
    );

    const transfers = await clients.businessCore.listOwnerTransfers(token, {
      targetId: customer.id,
      targetType: 'customer',
    });
    assertNumberAtLeast(
      transfers.items.length,
      1,
      'business owner transfer ledger',
    );
    const auditEvents = await clients.businessCore.listAuditEvents(token, {
      targetId: lead.id,
      targetType: 'lead',
    });
    assertArray(auditEvents.items, 'business audit event items');
    if (
      !auditEvents.items.some((event) => event.action === 'create-follow-up')
    ) {
      throw new Error('business audit events did not include create-follow-up');
    }

    const archivedContact = await clients.businessCore.archiveContact(
      token,
      contact.id,
    );
    assertEqual(archivedContact.deleted, true, 'archived business contact');
    await smoke.apiRequest(
      `/business/core/contacts/${encodeURIComponent(contact.id)}`,
      { expected: [404], token },
    );
    await smoke.apiRequest(
      `/business/core/contacts/${encodeURIComponent(contact.id)}`,
      {
        body: { title: 'archived contact update' },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    assertPageExcludesId(
      await clients.businessCore.listContacts(token, {
        customerId: customer.id,
        page: 1,
        pageSize: 50,
      }),
      contact.id,
      'archived business contact list',
    );
    const archivedOpportunity = await clients.businessSales.archiveOpportunity(
      token,
      opportunity.id,
    );
    assertEqual(
      archivedOpportunity.deleted,
      true,
      'archived business opportunity',
    );
    await smoke.apiRequest(
      `/business/sales/opportunities/${encodeURIComponent(opportunity.id)}`,
      { expected: [404], token },
    );
    await smoke.apiRequest(
      `/business/sales/opportunities/${encodeURIComponent(opportunity.id)}/stage`,
      {
        body: { actor: username, stage: 'lost' },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/sales/opportunities/${encodeURIComponent(opportunity.id)}/transfer`,
      {
        body: { actor: username, toOwner: username },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    assertPageExcludesId(
      await clients.businessSales.listOpportunities(token, {
        customerId: customer.id,
        page: 1,
        pageSize: 50,
      }),
      opportunity.id,
      'archived business opportunity list',
    );
    const archivedLead = await clients.businessSales.archiveLead(
      token,
      lead.id,
    );
    assertEqual(archivedLead.deleted, true, 'archived business lead');
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}`,
      { expected: [404], token },
    );
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}`,
      {
        body: { rating: 'cold' },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/sales/leads/${encodeURIComponent(lead.id)}/transfer`,
      {
        body: { actor: username, toOwner: username },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    assertPageExcludesId(
      await clients.businessSales.listLeads(token, { page: 1, pageSize: 50 }),
      lead.id,
      'archived business lead list',
    );
    await smoke.apiRequest('/business/core/tasks', {
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
    await clients.businessCore.archiveCustomer(token, customer.id);
    await smoke.apiRequest(
      `/business/core/customers/${encodeURIComponent(customer.id)}`,
      { expected: [404], token },
    );
    await smoke.apiRequest(
      `/business/core/customers/${encodeURIComponent(customer.id)}`,
      {
        body: { name: 'archived customer update' },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    await smoke.apiRequest(
      `/business/core/customers/${encodeURIComponent(customer.id)}/transfer`,
      {
        body: { actor: username, toOwner: username },
        expected: [404],
        method: 'PATCH',
        token,
      },
    );
    assertPageExcludesId(
      await clients.businessCore.listCustomers(token, {
        page: 1,
        pageSize: 50,
      }),
      customer.id,
      'archived business customer list',
    );
    const customerContacts = await clients.businessCore.listContacts(token, {
      customerId: customer.id,
      page: 1,
      pageSize: 50,
    });
    assertEqual(
      customerContacts.items.length,
      0,
      'archived customer contact list',
    );
    const customerOpportunities = await clients.businessSales.listOpportunities(
      token,
      {
        customerId: customer.id,
        page: 1,
        pageSize: 50,
      },
    );
    assertEqual(
      customerOpportunities.items.length,
      0,
      'archived customer opportunity list',
    );
    await smoke.apiRequest('/business/core/follow-ups', {
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
    await smoke.apiRequest('/business/core/attachments', {
      body: {
        mimeType: 'text/plain',
        originalName: 'archived-customer.txt',
        sizeBytes: 1,
        storageKey: `tenant//business/${runSafeId}/archived.txt`,
        targetId: customer.id,
        targetType: 'customer',
        uploadedBy: username,
      },
      expected: [404],
      method: 'POST',
      token,
    });

    console.log('business.foreign-hidden');
    console.log('business.lead-conversion');
    console.log('business.follow-up-task-attachment');
    console.log('business.owner-transfer');
    console.log('business.export');
    console.log('business.audit');
    console.log('business.archive');
    console.log(`OpenCore business platform smoke passed on ${baseUrl}`);
  } finally {
    await cleanupCreatedBusiness(created);
    await cleanupForeignTenantBusiness();
    smoke.setToken(undefined);
    await disconnectSmokePrisma();
  }
}

async function seedForeignTenantBusiness() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantBusiness();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'business-smoke-foreign',
      name: 'business Smoke Foreign',
      slug: 'business-smoke-foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'business-smoke-foreign',
      name: 'business Smoke Foreign',
      slug: 'business-smoke-foreign',
      status: 'active',
    },
  });
  await prisma.salesLead.create({
    data: {
      id: FOREIGN_LEAD_ID,
      tenantId: FOREIGN_TENANT_ID,
      company: 'Foreign business Co',
      name: `Foreign business lead ${runId}`,
      number: `LEAD-FOREIGN-${runSafeId}`,
      owner: 'foreign-admin',
      rating: 'warm',
      source: 'partner',
      status: 'new',
    },
  });
  await prisma.businessCustomer.create({
    data: {
      id: FOREIGN_CUSTOMER_ID,
      tenantId: FOREIGN_TENANT_ID,
      level: 'standard',
      name: `Foreign business customer ${runId}`,
      number: `CUS-FOREIGN-${runSafeId}`,
      owner: 'foreign-admin',
      source: 'partner',
      status: 'active',
    },
  });
}

async function assertForeignTenantBusinessHidden(rootToken: string) {
  const leads = await clients.businessSales.listLeads(rootToken, {
    status: 'new',
  });
  assertPageExcludesId(leads, FOREIGN_LEAD_ID, 'foreign business lead list');
  const customers = await clients.businessCore.listCustomers(rootToken, {
    status: 'active',
  });
  assertPageExcludesId(
    customers,
    FOREIGN_CUSTOMER_ID,
    'foreign business customer list',
  );

  await smoke.apiRequest(
    `/business/sales/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/business/sales/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}`,
    {
      body: { owner: username },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/business/sales/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}/transfer`,
    {
      body: { actor: username, toOwner: username },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/business/sales/leads/${encodeURIComponent(FOREIGN_LEAD_ID)}`,
    {
      expected: [404],
      method: 'DELETE',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/business/core/customers/${encodeURIComponent(FOREIGN_CUSTOMER_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/business/core/customers/${encodeURIComponent(FOREIGN_CUSTOMER_ID)}`,
    {
      body: { name: 'cross tenant write' },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await assertForeignTenantBusinessPreserved();
}

async function assertForeignTenantBusinessPreserved() {
  const prisma = getSmokePrisma();
  const lead = await prisma.salesLead.findUnique({
    where: { id: FOREIGN_LEAD_ID },
  });
  const customer = await prisma.businessCustomer.findUnique({
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
    throw new Error('Foreign tenant business rows were changed');
  }
}

async function cleanupCreatedBusiness(created: CreatedBusinessIds) {
  const prisma = getSmokePrisma();
  const targetIds = [
    ...created.leads,
    ...created.customers,
    ...created.contacts,
    ...created.opportunities,
  ];

  if (targetIds.length > 0) {
    await prisma.businessAuditEvent.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessOwnerTransfer.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessAttachment.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessTask.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessFollowUp.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
  }

  if (created.customers.length > 0) {
    await prisma.salesOpportunity.deleteMany({
      where: {
        tenantId: ROOT_TENANT_ID,
        customerId: { in: created.customers },
      },
    });
    await prisma.businessContact.deleteMany({
      where: {
        tenantId: ROOT_TENANT_ID,
        customerId: { in: created.customers },
      },
    });
    await prisma.businessCustomer.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, id: { in: created.customers } },
    });
  }

  if (created.leads.length > 0) {
    await prisma.salesLead.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, id: { in: created.leads } },
    });
  }

  if (created.tags.length > 0) {
    await prisma.businessTag.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, id: { in: created.tags } },
    });
  }
}

async function cleanupForeignTenantBusiness() {
  const prisma = getSmokePrisma();

  await prisma.businessAuditEvent.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.businessOwnerTransfer.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.businessAttachment.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.businessTask.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.businessFollowUp.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.salesOpportunity.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.businessContact.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.businessCustomer.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
  await prisma.salesLead.deleteMany({ where: { tenantId: FOREIGN_TENANT_ID } });
  await prisma.businessTag.deleteMany({
    where: { tenantId: FOREIGN_TENANT_ID },
  });
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

function assertOpenApiOperationResponseSchema(
  openApi: unknown,
  path: string,
  method: string,
) {
  const operation = (
    openApi as {
      paths?: Record<
        string,
        Record<
          string,
          {
            responses?: Record<
              string,
              { content?: Record<string, { schema?: unknown }> }
            >;
          }
        >
      >;
    }
  ).paths?.[path]?.[method];
  const schema =
    operation?.responses?.['200']?.content?.['application/json']?.schema;

  if (!schema) {
    throw new Error(
      `OpenAPI ${method.toUpperCase()} ${path} missing 200 schema`,
    );
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
