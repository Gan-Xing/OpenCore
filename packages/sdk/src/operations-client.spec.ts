import { createOperationsClient } from './operations-client';
import type { SdkRequest } from './rbac-client';

describe('createOperationsClient', () => {
  it('uses stable S11 operations API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ path, method: options?.method });
      return {} as never;
    };
    const client = createOperationsClient(request);

    await client.getSummary('token');
    await client.listJobs('token', {
      page: 1,
      pageSize: 5,
      enabled: true,
      queueName: 'maintenance',
    });
    await client.listJobRegistry('token');
    await client.getJob('token', 'openapi.drift-check');
    await client.createJob('token', {
      code: 'report.refresh',
      name: 'Refresh reports',
      queueName: 'reports',
      retryLimit: 3,
      timeoutSeconds: 90,
    });
    await client.updateJob('token', 'report.refresh', {
      enabled: false,
    });
    await client.enableJob('token', 'report.refresh');
    await client.disableJob('token', 'report.refresh');
    await client.triggerJob('token', 'openapi.drift-check', { actor: 'admin' });
    await client.dispatchDueJobs('token', {
      actor: 'scheduler-dispatcher',
      now: '2026-06-10T03:00:00.000Z',
    });
    await client.claimQueuedJobs('token', {
      actor: 'scheduler-worker',
      queueName: 'maintenance',
    });
    await client.listJobRuns('token', 'openapi.drift-check', {
      status: 'completed',
    });
    await client.getJobRun(
      'token',
      'openapi.drift-check',
      'run_openapi_drift_1',
    );
    await client.cleanJobRuns('token', 'openapi.drift-check', {
      retentionDays: 30,
      status: 'completed',
    });
    await client.listCacheKeys('token', { prefix: 'opencore:admin' });
    await client.listCacheNames('token');
    await client.getCacheValue('token', 'opencore:admin:shell');
    await client.clearCache('token', {
      prefix: 'opencore:admin',
      dryRun: true,
    });
    await client.deleteCacheKey('token', {
      key: 'opencore:admin:shell',
      dryRun: true,
    });
    await client.listOnlineUsers('token', { active: true });
    await client.getOnlineUserSummary('token');
    await client.cleanExpiredOnlineUserSessions('token', {
      expiredBefore: '2026-06-10T00:00:00.000Z',
    });
    await client.getOnlineUser('token', 'session_admin');
    await client.kickOutSession('token', 'session_admin', {
      actor: 'admin',
      reason: 'manual',
    });
    await client.kickOutSessions('token', {
      ids: ['session_admin', 'session_operator'],
      actor: 'admin',
      reason: 'bulk manual',
    });
    await client.listReports('token', { enabled: true, owner: 'admin' });
    await client.getReport('token', 'runtime.health');
    await client.createReport('token', {
      code: 'runtime.health',
      name: 'Runtime Health',
      querySchema: { source: 'monitor.status' },
      owner: 'admin',
    });
    await client.getExportJobDesign('token');

    expect(calls).toEqual([
      { path: '/monitor/operations/summary' },
      {
        path: '/monitor/jobs?page=1&pageSize=5&enabled=true&queueName=maintenance',
      },
      { path: '/monitor/jobs/registry' },
      { path: '/monitor/jobs/openapi.drift-check' },
      { path: '/monitor/jobs', method: 'POST' },
      { path: '/monitor/jobs/report.refresh', method: 'PATCH' },
      { path: '/monitor/jobs/report.refresh/enable', method: 'PATCH' },
      { path: '/monitor/jobs/report.refresh/disable', method: 'PATCH' },
      { path: '/monitor/jobs/openapi.drift-check/trigger', method: 'POST' },
      { path: '/monitor/jobs/dispatch-due', method: 'POST' },
      { path: '/monitor/jobs/worker/claim', method: 'POST' },
      {
        path: '/monitor/jobs/openapi.drift-check/runs?status=completed',
      },
      {
        path: '/monitor/jobs/openapi.drift-check/runs/run_openapi_drift_1',
      },
      {
        path: '/monitor/jobs/openapi.drift-check/runs?retentionDays=30&status=completed',
        method: 'DELETE',
      },
      { path: '/monitor/cache?prefix=opencore%3Aadmin' },
      { path: '/monitor/cache/names' },
      { path: '/monitor/cache/value?key=opencore%3Aadmin%3Ashell' },
      { path: '/monitor/cache/clear', method: 'POST' },
      { path: '/monitor/cache/key/delete', method: 'POST' },
      { path: '/monitor/online-users?active=true' },
      { path: '/monitor/online-users/summary' },
      {
        path: '/monitor/online-users/expired?expiredBefore=2026-06-10T00%3A00%3A00.000Z',
        method: 'DELETE',
      },
      { path: '/monitor/online-users/session_admin' },
      { path: '/monitor/online-users/session_admin/kick-out', method: 'POST' },
      { path: '/monitor/online-users/kick-out', method: 'POST' },
      { path: '/optional/reports?enabled=true&owner=admin' },
      { path: '/optional/reports/runtime.health' },
      { path: '/optional/reports', method: 'POST' },
      { path: '/optional/export-jobs/design' },
    ]);
  });
});
