import { createBusinessLifecycleClient } from './business-lifecycle-client';
import type { SdkRequest } from './rbac-client';

describe('createBusinessLifecycleClient', () => {
  it('maps lifecycle requests to business lifecycle endpoints', async () => {
    const calls: Array<{
      path: string;
      options: Parameters<SdkRequest>[1];
    }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ path, options });

      return {} as never;
    };
    const client = createBusinessLifecycleClient(request);

    await client.getSummary('token');
    await client.listPoolEntries('token', { page: 2, status: 'available' });
    await client.enterPool('token', {
      actor: 'admin',
      targetId: 'lead_1',
      targetType: 'lead',
    });
    await client.claimPoolEntry('token', 'entry_1', { actor: 'admin' });
    await client.assignPoolEntry('token', 'entry_1', {
      actor: 'admin',
      toOwner: 'sales',
    });
    await client.transferPoolEntry('token', 'entry_1', {
      actor: 'admin',
      toOwner: 'sales2',
    });
    await client.recyclePoolEntry('token', 'entry_1', { actor: 'admin' });
    await client.listCustomers('token', { lifecycleStage: 'in_progress' });
    await client.changeCustomerStage('token', 'customer_1', {
      actor: 'admin',
      toStage: 'fulfillment',
    });
    await client.listCustomerTimeline('token', 'customer_1', { page: 1 });
    await client.listAssignmentEvents('token', { targetType: 'customer' });
    await client.listLifecycleEvents('token', { toStage: 'renewal' });
    await client.listDuplicateGroups('token', { targetType: 'lead' });
    await client.exportBusinessLifecycle('token', { resource: 'pool' });

    expect(calls.map((call) => call.path)).toEqual([
      '/business/lifecycle/summary',
      '/business/lifecycle/pool?page=2&status=available',
      '/business/lifecycle/pool',
      '/business/lifecycle/pool/entry_1/claim',
      '/business/lifecycle/pool/entry_1/assign',
      '/business/lifecycle/pool/entry_1/transfer',
      '/business/lifecycle/pool/entry_1/recycle',
      '/business/lifecycle/customers?lifecycleStage=in_progress',
      '/business/lifecycle/customers/customer_1/stage',
      '/business/lifecycle/customers/customer_1/timeline?page=1',
      '/business/lifecycle/assignment-events?targetType=customer',
      '/business/lifecycle/events?toStage=renewal',
      '/business/lifecycle/duplicates?targetType=lead',
      '/business/lifecycle/export?resource=pool',
    ]);
    expect(calls[2]?.options).toMatchObject({ method: 'POST', token: 'token' });
    expect(calls[3]?.options).toMatchObject({ method: 'PATCH' });
    expect(calls[4]?.options).toMatchObject({ method: 'PATCH' });
    expect(calls[5]?.options).toMatchObject({ method: 'PATCH' });
    expect(calls[6]?.options).toMatchObject({ method: 'PATCH' });
    expect(calls[8]?.options).toMatchObject({ method: 'PATCH' });
  });
});
