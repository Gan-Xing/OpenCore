import { createCrmClient } from './crm-client';
import type { SdkRequest } from './rbac-client';

describe('createCrmClient', () => {
  it('uses stable C027 CRM API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ method: options?.method, path });
      return {} as never;
    };
    const client = createCrmClient(request);

    await client.getSummary('token');
    await client.exportCrm('token', {
      page: 2,
      pageSize: 20,
      resource: 'leads',
    });
    await client.listTags('token', { enabled: true });
    await client.createTag('token', { code: 'vip', name: 'VIP' });
    await client.updateTag('token', 'tag 1', { name: 'VIP+' });
    await client.listLeads('token', { owner: 'admin', status: 'new' });
    await client.getLead('token', 'lead 1');
    await client.createLead('token', {
      name: 'Lead',
      owner: 'admin',
      source: 'website',
    });
    await client.updateLead('token', 'lead 1', { status: 'qualified' });
    await client.convertLead('token', 'lead 1', { actor: 'admin' });
    await client.transferLeadOwner('token', 'lead 1', {
      actor: 'admin',
      toOwner: 'sales',
    });
    await client.archiveLead('token', 'lead 1');
    await client.listCustomers('token', { level: 'enterprise' });
    await client.getCustomer('token', 'customer 1');
    await client.createCustomer('token', {
      name: 'Customer',
      owner: 'admin',
      source: 'partner',
    });
    await client.updateCustomer('token', 'customer 1', { level: 'enterprise' });
    await client.transferCustomerOwner('token', 'customer 1', {
      actor: 'admin',
      toOwner: 'account',
    });
    await client.archiveCustomer('token', 'customer 1');
    await client.listContacts('token', { customerId: 'customer 1' });
    await client.getContact('token', 'contact 1');
    await client.createContact('token', {
      customerId: 'customer 1',
      name: 'Buyer',
    });
    await client.updateContact('token', 'contact 1', { title: 'VP' });
    await client.archiveContact('token', 'contact 1');
    await client.listOpportunities('token', { stage: 'proposal' });
    await client.listActivities('token', {
      targetId: 'lead 1',
      targetType: 'lead',
    });
    await client.getOpportunity('token', 'opportunity 1');
    await client.createOpportunity('token', {
      customerId: 'customer 1',
      name: 'Deal',
      owner: 'admin',
    });
    await client.updateOpportunity('token', 'opportunity 1', {
      probability: 50,
    });
    await client.changeOpportunityStage('token', 'opportunity 1', {
      actor: 'admin',
      stage: 'won',
    });
    await client.transferOpportunityOwner('token', 'opportunity 1', {
      actor: 'admin',
      toOwner: 'sales',
    });
    await client.archiveOpportunity('token', 'opportunity 1');
    await client.listFollowUps('token', {
      targetId: 'lead 1',
      targetType: 'lead',
    });
    await client.createFollowUp('token', {
      content: 'Called.',
      createdBy: 'admin',
      method: 'call',
      targetId: 'lead 1',
      targetType: 'lead',
    });
    await client.listTasks('token', { assignee: 'admin', status: 'open' });
    await client.createTask('token', {
      assignee: 'admin',
      createdBy: 'admin',
      targetId: 'lead 1',
      targetType: 'lead',
      title: 'Follow up',
    });
    await client.completeTask('token', 'task 1', { actor: 'admin' });
    await client.listAttachments('token', {
      targetId: 'lead 1',
      targetType: 'lead',
    });
    await client.createAttachment('token', {
      mimeType: 'text/plain',
      originalName: 'note.txt',
      sizeBytes: 12,
      storageKey: 'tenant/tenant_root/crm/note.txt',
      targetId: 'lead 1',
      targetType: 'lead',
      uploadedBy: 'admin',
    });
    await client.listOwnerTransfers('token', {
      targetId: 'lead 1',
      targetType: 'lead',
    });
    await client.listAuditEvents('token', {
      targetId: 'lead 1',
      targetType: 'lead',
    });

    expect(calls).toEqual([
      { path: '/industry/crm/summary' },
      { path: '/industry/crm/export?page=2&pageSize=20&resource=leads' },
      { path: '/industry/crm/tags?enabled=true' },
      { path: '/industry/crm/tags', method: 'POST' },
      { path: '/industry/crm/tags/tag%201', method: 'PATCH' },
      { path: '/industry/crm/leads?owner=admin&status=new' },
      { path: '/industry/crm/leads/lead%201' },
      { path: '/industry/crm/leads', method: 'POST' },
      { path: '/industry/crm/leads/lead%201', method: 'PATCH' },
      { path: '/industry/crm/leads/lead%201/convert', method: 'PATCH' },
      { path: '/industry/crm/leads/lead%201/transfer', method: 'PATCH' },
      { path: '/industry/crm/leads/lead%201', method: 'DELETE' },
      { path: '/industry/crm/customers?level=enterprise' },
      { path: '/industry/crm/customers/customer%201' },
      { path: '/industry/crm/customers', method: 'POST' },
      { path: '/industry/crm/customers/customer%201', method: 'PATCH' },
      {
        path: '/industry/crm/customers/customer%201/transfer',
        method: 'PATCH',
      },
      { path: '/industry/crm/customers/customer%201', method: 'DELETE' },
      { path: '/industry/crm/contacts?customerId=customer+1' },
      { path: '/industry/crm/contacts/contact%201' },
      { path: '/industry/crm/contacts', method: 'POST' },
      { path: '/industry/crm/contacts/contact%201', method: 'PATCH' },
      { path: '/industry/crm/contacts/contact%201', method: 'DELETE' },
      { path: '/industry/crm/opportunities?stage=proposal' },
      { path: '/industry/crm/activity?targetId=lead+1&targetType=lead' },
      { path: '/industry/crm/opportunities/opportunity%201' },
      { path: '/industry/crm/opportunities', method: 'POST' },
      { path: '/industry/crm/opportunities/opportunity%201', method: 'PATCH' },
      {
        path: '/industry/crm/opportunities/opportunity%201/stage',
        method: 'PATCH',
      },
      {
        path: '/industry/crm/opportunities/opportunity%201/transfer',
        method: 'PATCH',
      },
      { path: '/industry/crm/opportunities/opportunity%201', method: 'DELETE' },
      { path: '/industry/crm/follow-ups?targetId=lead+1&targetType=lead' },
      { path: '/industry/crm/follow-ups', method: 'POST' },
      { path: '/industry/crm/tasks?assignee=admin&status=open' },
      { path: '/industry/crm/tasks', method: 'POST' },
      { path: '/industry/crm/tasks/task%201/complete', method: 'PATCH' },
      { path: '/industry/crm/attachments?targetId=lead+1&targetType=lead' },
      { path: '/industry/crm/attachments', method: 'POST' },
      { path: '/industry/crm/owner-transfers?targetId=lead+1&targetType=lead' },
      { path: '/industry/crm/audit-events?targetId=lead+1&targetType=lead' },
    ]);
  });
});
