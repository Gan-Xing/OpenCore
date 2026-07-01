import { createBusinessSalesClient } from './business-sales-client';
import type { SdkRequest } from './rbac-client';

describe('createBusinessSalesClient', () => {
  it('exposes sales methods over the business sales API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ method: options?.method, path });
      return {} as never;
    };
    const client = createBusinessSalesClient(request);

    await client.getSummary('token');
    await client.exportBusinessSales('token', {
      page: 2,
      pageSize: 20,
      resource: 'leads',
    });
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
    await client.listOpportunities('token', { stage: 'proposal' });
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

    expect(calls).toEqual([
      { path: '/business/sales/summary' },
      { path: '/business/sales/export?page=2&pageSize=20&resource=leads' },
      { path: '/business/sales/leads?owner=admin&status=new' },
      { path: '/business/sales/leads/lead%201' },
      { path: '/business/sales/leads', method: 'POST' },
      { path: '/business/sales/leads/lead%201', method: 'PATCH' },
      { path: '/business/sales/leads/lead%201/convert', method: 'PATCH' },
      { path: '/business/sales/leads/lead%201/transfer', method: 'PATCH' },
      { path: '/business/sales/leads/lead%201', method: 'DELETE' },
      { path: '/business/sales/opportunities?stage=proposal' },
      { path: '/business/sales/opportunities/opportunity%201' },
      { path: '/business/sales/opportunities', method: 'POST' },
      {
        path: '/business/sales/opportunities/opportunity%201',
        method: 'PATCH',
      },
      {
        path: '/business/sales/opportunities/opportunity%201/stage',
        method: 'PATCH',
      },
      {
        path: '/business/sales/opportunities/opportunity%201/transfer',
        method: 'PATCH',
      },
      {
        path: '/business/sales/opportunities/opportunity%201',
        method: 'DELETE',
      },
    ]);
  });
});
