import type { SdkRequest } from './rbac-client';
import { createSystemManagementClient } from './system-management-client';

describe('createSystemManagementClient', () => {
  it('uses stable S7 system-management API paths', async () => {
    const calls: Array<{
      path: string;
      method?: string;
      token?: string;
    }> = [];
    const request: SdkRequest = async (path, options) => {
      const call: {
        path: string;
        method?: string;
        token?: string;
      } = {
        path,
      };
      if (options?.method !== undefined) {
        call.method = options.method;
      }
      if (options?.token !== undefined) {
        call.token = options.token;
      }

      calls.push(call);
      return {} as never;
    };
    const client = createSystemManagementClient(request);

    await client.listDicts('token', { page: 2, pageSize: 20 });
    await client.getDict('token', 'system.status');
    await client.listDictDataOptions('token', { dictCode: 'system.status' });
    await client.listDictItems('token', 'system.status');
    await client.getDictItem('token', 'system.status', 'dict_item_enabled');
    await client.createDictItem('token', 'system.status', {
      label: 'Archived',
      value: 'archived',
    });
    await client.updateDictItem('token', 'system.status', 'dict_item_enabled', {
      sort: 30,
    });
    await client.deleteDictItem('token', 'system.status', 'dict_item_disabled');
    await client.listConfig('token', { page: 1, pageSize: 10 });
    await client.getConfig('token', 'opencore.admin.title');
    await client.getConfigRuntime();
    await client.evaluateFeatureFlag('notice.inbox', 'user_admin');
    await client.getConfigValueByKey('token', 'opencore.admin.title');
    await client.refreshConfigCache('token');
    await client.exportConfig('token', { page: 1, pageSize: 10 });
    await client.createConfig('token', {
      key: 'opencore.sample.enabled',
      value: 'true',
      valueType: 'boolean',
    });
    await client.updateConfig('token', 'opencore.sample.enabled', {
      value: 'false',
    });
    await client.listAuditLogs('token', {
      action: 'POST',
      page: 1,
      pageSize: 10,
      resource: '/api/core/config',
    });
    await client.getAuditLog('token', 'audit_config_create');
    await client.exportAuditLogs('token', { action: 'POST' });
    await client.listLoginLogs('token', {
      actorUsername: 'admin',
      createdFrom: '2026-06-10T00:00:00.000Z',
      createdTo: '2026-06-10T23:59:59.999Z',
      ip: '127.0.0.1',
      location: 'Loopback',
      logType: 'login.username',
      page: 1,
      pageSize: 10,
      result: 'bad_credentials',
      success: false,
      username: 'unknown',
    });
    await client.getLoginLog('token', 'login_failure_unknown');
    await client.exportLoginLogs('token', {
      createdFrom: '2026-06-10T00:00:00.000Z',
      ip: '127.0.0.1',
      location: 'Loopback',
      logType: 'login.username',
      result: 'bad_credentials',
      success: false,
    });
    await client.deleteLoginLogs('token', { ids: ['login_failure_unknown'] });
    await client.cleanLoginLogs('token');
    await client.unlockLoginUser('token', { username: 'operator' });
    await client.listFiles('token', { page: 1, pageSize: 10 });
    await client.getFile('token', 'file_1');
    expect(client.getFileDownloadPath('file_1')).toBe(
      '/core/files/file_1/download',
    );
    await client.exportFiles('token', { page: 1, pageSize: 10 });
    await client.createFileAsset('token', {
      originalName: 'handbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedBy: 'admin',
    });
    await client.uploadFileAsset('token', {
      originalName: 'handbook.pdf',
      mimeType: 'application/pdf',
      contentBase64: 'SGVsbG8=',
      uploadedBy: 'admin',
    });
    await client.updateFileAsset('token', 'file_1', {
      checksum: 'sha256:updated',
    });
    await client.listDepts('token', { enabled: true });
    await client.listDeptOptions('token');
    await client.getDept('token', 'dept_engineering');
    await client.createDept('token', {
      code: 'qa',
      name: 'Quality Assurance',
      parentId: 'dept_engineering',
    });
    await client.updateDept('token', 'dept_qa', { name: 'Quality Platform' });
    await client.updateDeptOrder('token', {
      items: [
        { id: 'dept_engineering', order: 10 },
        { id: 'dept_operations', order: 20 },
      ],
    });
    await client.deleteDept('token', 'dept_qa');
    await client.listPosts('token', { page: 1, pageSize: 20, enabled: true });
    await client.listPostOptions('token');
    await client.getPost('token', 'engineer');
    await client.exportPosts('token', { enabled: true });
    await client.createPost('token', {
      code: 'qa',
      name: 'Quality Assurance',
      order: 30,
    });
    await client.updatePost('token', 'qa', { name: 'Quality Platform' });
    await client.updatePostOrder('token', {
      items: [
        { code: 'engineer', order: 10 },
        { code: 'admin', order: 20 },
      ],
    });
    await client.deletePosts('token', { codes: ['qa_batch_a', 'qa_batch_b'] });
    await client.deletePost('token', 'qa');
    await client.listNotices('token', {
      page: 1,
      pageSize: 10,
      status: 'draft',
      type: 'maintenance',
    });
    await client.listNoticeInbox('token', {
      page: 1,
      pageSize: 5,
      readStatus: false,
    });
    await client.getNoticeInboxItem('token', 'notice_welcome');
    await client.listUnreadNotices('token', 10);
    await client.getNoticeUnreadCount('token');
    await client.markNoticesRead('token', { ids: ['notice_welcome'] });
    await client.markAllNoticesRead('token');
    await client.listNoticeReadUsers('token', 'notice_welcome', {
      page: 1,
      pageSize: 20,
    });
    await client.listNoticeDeliveries('token', 'notice_welcome', {
      channel: 'in_app',
      page: 1,
      pageSize: 20,
      providerStatus: 'pending',
      readStatus: false,
      username: 'admin',
    });
    await client.dispatchNotice('token', 'notice_welcome');
    await client.executeNoticeDeliveries('token', 'notice_welcome');
    await client.listNoticeTemplates('token', {
      enabled: true,
      page: 1,
      pageSize: 10,
      type: 'maintenance',
    });
    await client.listNoticeTemplateOptions('token');
    await client.getNoticeTemplate('token', 'release.window');
    await client.renderNoticeTemplate('token', 'release.window', {
      templateParams: {
        owner: 'Ops',
        version: '2026.6',
        window: '02:00 UTC',
      },
    });
    await client.createNoticeFromTemplate('token', 'release.window', {
      audience: 'admin',
      createdBy: 'admin',
      templateParams: {
        owner: 'Ops',
        version: '2026.6',
        window: '02:00 UTC',
      },
    });
    await client.createNoticeTemplate('token', {
      code: 'release.window',
      name: 'Release Window',
      type: 'maintenance',
      titleTemplate: 'Release {{version}}',
      contentTemplate: 'Release {{version}} at {{window}} by {{owner}}.',
    });
    await client.updateNoticeTemplate('token', 'release.window', {
      enabled: false,
    });
    await client.deleteNoticeTemplate('token', 'release.window');
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
    await client.deleteConfigs('token', {
      keys: ['opencore.admin.title', 'opencore.sample.enabled'],
    });
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
        path: '/core/dict-data/simple-list?dictCode=system.status',
        token: 'token',
      },
      {
        path: '/core/dicts/system.status/items',
        token: 'token',
      },
      {
        path: '/core/dicts/system.status/items/dict_item_enabled',
        token: 'token',
      },
      {
        path: '/core/dicts/system.status/items',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/dicts/system.status/items/dict_item_enabled',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/dicts/system.status/items/dict_item_disabled',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/config?page=1&pageSize=10',
        token: 'token',
      },
      {
        path: '/core/config/opencore.admin.title',
        token: 'token',
      },
      {
        path: '/core/config/runtime',
      },
      {
        path: '/core/config/feature-flags/evaluate?flag=notice.inbox&subjectKey=user_admin',
      },
      {
        path: '/core/config/get-value-by-key?key=opencore.admin.title',
        token: 'token',
      },
      {
        path: '/core/config/refresh-cache',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/config/export?page=1&pageSize=10',
        token: 'token',
      },
      {
        path: '/core/config',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/config/opencore.sample.enabled',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/audit-logs?action=POST&page=1&pageSize=10&resource=%2Fapi%2Fcore%2Fconfig',
        token: 'token',
      },
      {
        path: '/core/audit-logs/audit_config_create',
        token: 'token',
      },
      {
        path: '/core/audit-logs/export?action=POST',
        token: 'token',
      },
      {
        path: '/core/login-logs?actorUsername=admin&createdFrom=2026-06-10T00%3A00%3A00.000Z&createdTo=2026-06-10T23%3A59%3A59.999Z&ip=127.0.0.1&location=Loopback&logType=login.username&page=1&pageSize=10&result=bad_credentials&success=false&username=unknown',
        token: 'token',
      },
      {
        path: '/core/login-logs/login_failure_unknown',
        token: 'token',
      },
      {
        path: '/core/login-logs/export?createdFrom=2026-06-10T00%3A00%3A00.000Z&ip=127.0.0.1&location=Loopback&logType=login.username&result=bad_credentials&success=false',
        token: 'token',
      },
      {
        path: '/core/login-logs/batch',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/login-logs/clean',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/login-logs/unlock',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/files?page=1&pageSize=10',
        token: 'token',
      },
      {
        path: '/core/files/file_1',
        token: 'token',
      },
      {
        path: '/core/files/export?page=1&pageSize=10',
        token: 'token',
      },
      {
        path: '/core/files',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/files/upload',
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
        path: '/core/depts/simple-list',
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
        path: '/core/depts/order',
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
        path: '/core/posts/simple-list',
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
        path: '/core/posts/order',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/posts/batch',
        method: 'DELETE',
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
        path: '/core/notices/inbox?page=1&pageSize=5&readStatus=false',
        token: 'token',
      },
      {
        path: '/core/notices/inbox/notice_welcome',
        token: 'token',
      },
      {
        path: '/core/notices/inbox/unread-list?limit=10',
        token: 'token',
      },
      {
        path: '/core/notices/inbox/unread-count',
        token: 'token',
      },
      {
        path: '/core/notices/inbox/read',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/inbox/read-all',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/notice_welcome/read-users?page=1&pageSize=20',
        token: 'token',
      },
      {
        path: '/core/notices/notice_welcome/deliveries?channel=in_app&page=1&pageSize=20&providerStatus=pending&readStatus=false&username=admin',
        token: 'token',
      },
      {
        path: '/core/notices/notice_welcome/dispatch',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/notice_welcome/deliveries/execute',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/templates?enabled=true&page=1&pageSize=10&type=maintenance',
        token: 'token',
      },
      {
        path: '/core/notices/templates/simple-list',
        token: 'token',
      },
      {
        path: '/core/notices/templates/release.window',
        token: 'token',
      },
      {
        path: '/core/notices/templates/release.window/render',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/templates/release.window/create-notice',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/templates',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/notices/templates/release.window',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/notices/templates/release.window',
        method: 'DELETE',
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
        path: '/core/config/batch',
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
