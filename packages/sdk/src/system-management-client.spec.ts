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
    await client.getDict('token', 'system.status');
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
    await client.listDepts('token', { enabled: true });
    await client.getDept('token', 'dept_engineering');
    await client.createDept('token', {
      code: 'qa',
      name: 'Quality Assurance',
      parentId: 'dept_engineering',
    });
    await client.updateDept('token', 'dept_qa', { name: 'Quality Platform' });
    await client.deleteDept('token', 'dept_qa');
    await client.listPosts('token', { page: 1, pageSize: 20, enabled: true });
    await client.getPost('token', 'engineer');
    await client.exportPosts('token', { enabled: true });
    await client.createPost('token', {
      code: 'qa',
      name: 'Quality Assurance',
      order: 30,
    });
    await client.updatePost('token', 'qa', { name: 'Quality Platform' });
    await client.deletePost('token', 'qa');
    await client.listNotices('token', {
      page: 1,
      pageSize: 10,
      status: 'draft',
      type: 'maintenance',
    });
    await client.getNotice('token', 'notice_1');
    await client.createNotice('token', {
      title: 'Maintenance',
      content: 'Maintenance window.',
      type: 'maintenance',
      createdBy: 'admin',
    });
    await client.updateNotice('token', 'notice_1', { pinned: true });
    await client.publishNotice('token', 'notice_1');
    await client.archiveNotice('token', 'notice_1');
    await client.deleteNotice('token', 'notice_1');
    await client.deleteConfig('token', 'opencore.admin.title');

    expect(calls).toEqual([
      {
        path: '/core/dicts?page=2&pageSize=20',
        token: 'token',
      },
      {
        path: '/core/dicts/system.status',
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
        path: '/core/depts?enabled=true',
        token: 'token',
      },
      {
        path: '/core/depts/dept_engineering',
        token: 'token',
      },
      {
        path: '/core/depts',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/depts/dept_qa',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/depts/dept_qa',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/posts?page=1&pageSize=20&enabled=true',
        token: 'token',
      },
      {
        path: '/core/posts/engineer',
        token: 'token',
      },
      {
        path: '/core/posts/export?enabled=true',
        token: 'token',
      },
      {
        path: '/core/posts',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/posts/qa',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/posts/qa',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/notices?page=1&pageSize=10&status=draft&type=maintenance',
        token: 'token',
      },
      {
        path: '/core/notices/notice_1',
        token: 'token',
      },
      {
        path: '/core/notices',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/notice_1',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/notices/notice_1/publish',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/notices/notice_1/archive',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/notices/notice_1',
        method: 'DELETE',
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
