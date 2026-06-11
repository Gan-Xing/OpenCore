import type { SdkRequest } from './rbac-client';
import { createSystemManagementClient } from './system-management-client';

describe('createSystemManagementClient', () => {
  it('uses stable S7 system-management API paths', async () => {
    const calls: Array<{ path: string; method?: string; token?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({
        path,
        method: options?.method,
        token: options?.token,
      });
      return {} as never;
    };
    const client = createSystemManagementClient(request);

    await client.listDicts('token', { page: 2, pageSize: 20 });
    await client.exportAuditLogs('token');
    await client.createFileAsset('token', {
      originalName: 'handbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedBy: 'admin',
    });
    await client.updateFileAsset('token', 'file_1', {
      checksum: 'sha256:updated',
    });
    await client.deleteConfig('token', 'opencore.admin.title');

    expect(calls).toEqual([
      {
        path: '/core/dicts?page=2&pageSize=20',
        token: 'token',
      },
      {
        path: '/core/audit-logs/export',
        token: 'token',
      },
      {
        path: '/core/files',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/files/file_1',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/config/opencore.admin.title',
        method: 'DELETE',
        token: 'token',
      },
    ]);
  });
});
