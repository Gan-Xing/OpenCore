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
      { path: '/business/core/summary' },
      { path: '/business/core/export?page=2&pageSize=20&resource=leads' },
      { path: '/business/core/tags?enabled=true' },
      { path: '/business/core/tags', method: 'POST' },
      { path: '/business/core/tags/tag%201', method: 'PATCH' },
      { path: '/business/core/leads?owner=admin&status=new' },
      { path: '/business/core/leads/lead%201' },
      { path: '/business/core/leads', method: 'POST' },
      { path: '/business/core/leads/lead%201', method: 'PATCH' },
      { path: '/business/core/leads/lead%201/convert', method: 'PATCH' },
      { path: '/business/core/leads/lead%201/transfer', method: 'PATCH' },
      { path: '/business/core/leads/lead%201', method: 'DELETE' },
      { path: '/business/core/customers?level=enterprise' },
      { path: '/business/core/customers/customer%201' },
      { path: '/business/core/customers', method: 'POST' },
      { path: '/business/core/customers/customer%201', method: 'PATCH' },
      {
        path: '/business/core/customers/customer%201/transfer',
        method: 'PATCH',
      },
      { path: '/business/core/customers/customer%201', method: 'DELETE' },
      { path: '/business/core/contacts?customerId=customer+1' },
      { path: '/business/core/contacts/contact%201' },
      { path: '/business/core/contacts', method: 'POST' },
      { path: '/business/core/contacts/contact%201', method: 'PATCH' },
      { path: '/business/core/contacts/contact%201', method: 'DELETE' },
      { path: '/business/core/opportunities?stage=proposal' },
      { path: '/business/core/activity?targetId=lead+1&targetType=lead' },
      { path: '/business/core/opportunities/opportunity%201' },
      { path: '/business/core/opportunities', method: 'POST' },
      { path: '/business/core/opportunities/opportunity%201', method: 'PATCH' },
      {
        path: '/business/core/opportunities/opportunity%201/stage',
        method: 'PATCH',
      },
      {
        path: '/business/core/opportunities/opportunity%201/transfer',
        method: 'PATCH',
      },
      {
        path: '/business/core/opportunities/opportunity%201',
        method: 'DELETE',
      },
      { path: '/business/core/follow-ups?targetId=lead+1&targetType=lead' },
      { path: '/business/core/follow-ups', method: 'POST' },
      { path: '/business/core/tasks?assignee=admin&status=open' },
      { path: '/business/core/tasks', method: 'POST' },
      { path: '/business/core/tasks/task%201/complete', method: 'PATCH' },
      { path: '/business/core/attachments?targetId=lead+1&targetType=lead' },
      { path: '/business/core/attachments', method: 'POST' },
      {
        path: '/business/core/owner-transfers?targetId=lead+1&targetType=lead',
      },
      { path: '/business/core/audit-events?targetId=lead+1&targetType=lead' },
    ]);
  });
});
