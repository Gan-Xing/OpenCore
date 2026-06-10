import type { SdkRequest } from './rbac-client';
import { createToolingClient } from './tooling-client';

describe('createToolingClient', () => {
  it('uses stable S8 tool API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({
        path,
        method: options?.method,
      });
      return {} as never;
    };
    const client = createToolingClient(request);

    await client.getOpenApiDriftStatus('token');
    await client.getExportProtocol('token');
    await client.createExportPreview('token', {
      resource: 'dicts',
      columns: ['code', 'name'],
      rowCount: 2,
    });

    expect(calls).toEqual([
      {
        path: '/tools/openapi/drift',
      },
      {
        path: '/tools/export/protocol',
      },
      {
        path: '/tools/export/preview',
        method: 'POST',
      },
    ]);
  });
});
