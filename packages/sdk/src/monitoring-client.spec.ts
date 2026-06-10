import type { SdkRequest } from './rbac-client';
import { createMonitoringClient } from './monitoring-client';

describe('createMonitoringClient', () => {
  it('uses stable S8 monitor API paths', async () => {
    const calls: string[] = [];
    const request: SdkRequest = async (path) => {
      calls.push(path);
      return {} as never;
    };
    const client = createMonitoringClient(request);

    await client.getStatus('token');
    await client.getVersion('token');
    await client.listQueues('token');

    expect(calls).toEqual([
      '/monitor/status',
      '/monitor/version',
      '/monitor/queues',
    ]);
  });
});
