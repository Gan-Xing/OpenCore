import type { SdkRequest } from './rbac-client';
import { createMonitoringClient } from './monitoring-client';

describe('createMonitoringClient', () => {
  it('uses stable S8 monitor API paths', async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ method: options?.method ?? 'GET', path });
      return {} as never;
    };
    const client = createMonitoringClient(request);

    await client.getStatus('token');
    await client.getVersion('token');
    await client.listQueues('token');
    await client.pauseQueue('token', 'maintenance');
    await client.resumeQueue('token', 'maintenance');

    expect(calls).toEqual([
      { method: 'GET', path: '/monitor/status' },
      { method: 'GET', path: '/monitor/version' },
      { method: 'GET', path: '/monitor/queues' },
      { method: 'POST', path: '/monitor/queues/maintenance/pause' },
      { method: 'POST', path: '/monitor/queues/maintenance/resume' },
    ]);
  });
});
