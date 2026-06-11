import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { OperationsController } from './operations.controller';

describe('OperationsController permission matrix', () => {
  it('guards job, cache, online-user, report, and export-job routes', () => {
    const expected: Array<[keyof OperationsController, string[]]> = [
      ['listJobs', ['monitor:job:read']],
      ['getJob', ['monitor:job:read']],
      ['createJob', ['monitor:job:create']],
      ['updateJob', ['monitor:job:update']],
      ['enableJob', ['monitor:job:update']],
      ['disableJob', ['monitor:job:update']],
      ['triggerJob', ['monitor:job:manage']],
      ['listJobRuns', ['monitor:job:read']],
      ['getJobRun', ['monitor:job:read']],
      ['listCacheKeys', ['monitor:cache:read']],
      ['clearCache', ['monitor:cache:manage']],
      ['listOnlineUsers', ['monitor:online-user:read']],
      ['getOnlineUser', ['monitor:online-user:read']],
      ['kickOutSession', ['monitor:online-user:manage']],
      ['listReports', ['optional:report:read']],
      ['getReport', ['optional:report:read']],
      ['createReport', ['optional:report:create']],
      ['getExportJobDesign', ['optional:export-job:read']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          OperationsController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});
