import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'prisma/schema.prisma',
    markers: [
      'schedulerJobs',
      'schedulerRuns',
      '@@unique([tenantId, code])',
      '@@index([tenantId, jobCode, status])',
    ],
  },
  {
    file: 'prisma/migrations/20260624001000_tenant_scoped_scheduler/migration.sql',
    markers: [
      'UPDATE "JobDefinition"',
      'JobDefinition_tenantId_code_key',
      'JobRunLog_tenantId_jobCode_fkey',
    ],
  },
  {
    file: 'packages/scheduler/src/scheduler/scheduler.prisma-repository.ts',
    markers: [
      'resolveCurrentTenantId',
      'tenantId_code',
      'tenantId: job.tenantId',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'packages/scheduler/src/scheduler/scheduler.executor.ts',
    markers: [
      'runWithRequestContext',
      'tenantId: input.tenantId',
      'where: { createdAt: { lt: cutoffBefore }, tenantId }',
    ],
  },
  {
    file: 'packages/scheduler/src/scheduler/scheduler.spec.ts',
    markers: [
      'scopes persisted scheduler jobs and worker claims by tenant',
      'runAsTenant',
      'FOREIGN_TENANT_ID',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-monitor-jobs.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'seedForeignTenantSchedulerRun',
      'assertForeignTenantSchedulerHidden',
      'monitor.job.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/Monitor/Jobs.tsx',
    markers: ['tenantId', 'pages.monitor.jobs.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/operations-types.ts',
    markers: ['tenantId: string', "tenantId: 'tenant_root'"],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-scheduler-scope', 'smoke:core-monitor-jobs'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T5a', 'Scheduler jobs scoped by active tenant'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant scheduler marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant scheduler scope guard passed.');
