import { createBusinessCoreClient } from './business-core-client';
import type { SdkRequest } from './rbac-client';

describe('createBusinessCoreClient', () => {
  it('exposes business core methods over the business API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ method: options?.method, path });
      return {} as never;
    };
    const client = createBusinessCoreClient(request);

    expect('exportCrm' in client).toBe(false);

    await client.getSummary('token');
    await client.exportBusinessCore('token', {
      page: 1,
      pageSize: 20,
      resource: 'customers',
    });
    await client.createFollowUp('token', {
      content: 'Called.',
      createdBy: 'admin',
      method: 'call',
      targetId: 'customer 1',
      targetType: 'customer',
    });
    await client.listAuditEvents('token', {
      targetId: 'customer 1',
      targetType: 'customer',
    });

    expect(calls).toEqual([
      { path: '/business/core/summary' },
      { path: '/business/core/export?page=1&pageSize=20&resource=customers' },
      { path: '/business/core/follow-ups', method: 'POST' },
      {
        path: '/business/core/audit-events?targetId=customer+1&targetType=customer',
      },
    ]);
  });
});
