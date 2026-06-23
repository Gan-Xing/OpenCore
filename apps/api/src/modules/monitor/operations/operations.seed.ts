import type {
  CacheKeyDto,
  ExportJobDesignDto,
  ReportDefinitionDto,
} from './operations.dto';

export type CacheKeyRecord = CacheKeyDto;
export type ReportDefinitionRecord = ReportDefinitionDto;
export type ExportJobDesignRecord = ExportJobDesignDto;
export {
  seedSchedulerJobs as seedJobs,
  seedSchedulerRuns as seedJobRuns,
  type SchedulerJobDefinitionRecord as JobDefinitionRecord,
  type SchedulerJobRunLogRecord as JobRunLogRecord,
} from '@opencore/scheduler/records';
export {
  seedOnlineUserSessions as seedOnlineSessions,
  type OnlineUserSessionRecord,
} from '@opencore/online-user/records';

export const seedCacheKeys: readonly CacheKeyRecord[] = [
  {
    tenantId: 'tenant_root',
    key: 'opencore:tenant:tenant_root:admin:shell',
    name: 'admin',
    prefix: 'opencore:tenant:tenant_root:admin',
    ttlSeconds: 300,
    sizeBytes: 512,
    type: 'string',
  },
  {
    tenantId: 'tenant_root',
    key: 'opencore:tenant:tenant_root:openapi:snapshot',
    name: 'openapi',
    prefix: 'opencore:tenant:tenant_root:openapi',
    ttlSeconds: 900,
    sizeBytes: 4096,
    type: 'string',
  },
  {
    tenantId: 'tenant_foreign',
    key: 'opencore:tenant:tenant_foreign:admin:shell',
    name: 'admin',
    prefix: 'opencore:tenant:tenant_foreign:admin',
    ttlSeconds: 300,
    sizeBytes: 256,
    type: 'string',
  },
];

export const seedReports: readonly ReportDefinitionRecord[] = [
  {
    id: 'report_runtime_health',
    code: 'runtime.health',
    name: 'Runtime Health',
    description: 'Minimal report definition for runtime health snapshots.',
    querySchema: {
      source: 'monitor.status',
      dimensions: ['dependency'],
      measures: ['status'],
    },
    enabled: true,
    owner: 'admin',
  },
];

export const exportJobDesign: ExportJobDesignRecord = {
  resource: 'async-export-job',
  status: 'design-only',
  requiredBindings: [
    'file asset id',
    'job definition code',
    'permission code',
    'expiry timestamp',
    'audit log id',
  ],
  safetyChecks: [
    'current-page export remains synchronous',
    'large export requires async job',
    'download expires by policy',
    'job trigger and file access are audited',
  ],
  runbook: 'docs/development/export-upload-contract.md',
};
