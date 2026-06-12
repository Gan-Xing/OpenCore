import { BadRequestException } from '@nestjs/common';
import {
  OnlineUserService,
  SeedOnlineUserRepository,
} from '@opencore/online-user';
import { SchedulerService, SeedSchedulerRepository } from '@opencore/scheduler';
import { SeedOperationsRepository } from './seed-operations.repository';

describe('OperationsRepository', () => {
  it('builds a bounded operations center summary', async () => {
    const repository = new SeedOperationsRepository();
    const scheduler = await createSeedSchedulerSummary();
    const onlineUsers = await createSeedOnlineUserSummary();

    expect(await repository.getSummary(scheduler, onlineUsers)).toMatchObject({
      jobs: { total: 1, enabled: 1, disabled: 0 },
      jobRuns: { total: 1, completed: 1, failed: 0 },
      cache: { keyCount: 2, totalSizeBytes: 4608 },
      onlineUsers: { total: 1, active: 1, revoked: 0 },
      reports: { total: 1, enabled: 1, disabled: 0 },
      exportJobStatus: 'design-only',
    });
  });

  it('filters operations lists by bounded query fields', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.listCacheKeys({ prefix: 'opencore:admin' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listReports({ enabled: true, owner: 'admin' }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('supports read-only cache listing and confirmed prefix clear policy', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.clearCache({ prefix: 'opencore:admin', dryRun: true }),
    ).resolves.toMatchObject({
      dryRun: true,
      matchedKeys: 1,
      clearedKeys: 0,
    });
    await expect(
      repository.clearCache({ prefix: 'opencore:admin', dryRun: false }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.clearCache({
        prefix: 'opencore:admin',
        dryRun: false,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      dryRun: false,
      clearedKeys: 1,
    });
  });

  it('creates report definitions and exposes async export job design', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.createReport({
        code: 'jobs.summary',
        name: 'Jobs Summary',
        querySchema: { source: 'monitor.job' },
        owner: 'admin',
      }),
    ).resolves.toMatchObject({
      code: 'jobs.summary',
      querySchema: { source: 'monitor.job' },
    });
    await expect(repository.getReport('jobs.summary')).resolves.toMatchObject({
      code: 'jobs.summary',
      owner: 'admin',
    });
    expect(repository.getExportJobDesign()).toMatchObject({
      status: 'design-only',
      requiredBindings: expect.arrayContaining(['file asset id']),
    });
  });
});

async function createSeedSchedulerSummary() {
  return new SchedulerService(new SeedSchedulerRepository()).getSummary();
}

async function createSeedOnlineUserSummary() {
  return new OnlineUserService(new SeedOnlineUserRepository()).getSummary();
}
