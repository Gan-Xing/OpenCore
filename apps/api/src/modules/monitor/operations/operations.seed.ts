import type {
  CacheKeyDto,
  ExportJobDesignDto,
  JobDefinitionDto,
  JobRunLogDto,
  OnlineUserSessionDto,
  ReportDefinitionDto,
} from './operations.dto';

export type JobDefinitionRecord = JobDefinitionDto;
export type JobRunLogRecord = JobRunLogDto;
export type CacheKeyRecord = CacheKeyDto;
export type OnlineUserSessionRecord = OnlineUserSessionDto;
export type ReportDefinitionRecord = ReportDefinitionDto;
export type ExportJobDesignRecord = ExportJobDesignDto;

export const seedJobs: readonly JobDefinitionRecord[] = [
  {
    id: 'job_openapi_drift',
    code: 'openapi.drift-check',
    name: 'OpenAPI drift check',
    queueName: 'maintenance',
    cron: '0 * * * *',
    enabled: true,
    retryLimit: 2,
    timeoutSeconds: 120,
    adapter: 'bullmq',
    payload: { command: 'pnpm openapi:check' },
  },
];

export const seedJobRuns: readonly JobRunLogRecord[] = [
  {
    id: 'run_openapi_drift_1',
    jobCode: 'openapi.drift-check',
    status: 'completed',
    trigger: 'manual',
    attempts: 1,
    startedAt: '2026-06-10T00:00:00.000Z',
    finishedAt: '2026-06-10T00:00:01.000Z',
    metadata: { actor: 'admin' },
  },
];

export const seedCacheKeys: readonly CacheKeyRecord[] = [
  {
    key: 'opencore:admin:shell',
    prefix: 'opencore:admin',
    ttlSeconds: 300,
    sizeBytes: 512,
  },
  {
    key: 'opencore:openapi:snapshot',
    prefix: 'opencore:openapi',
    ttlSeconds: 900,
    sizeBytes: 4096,
  },
];

export const seedOnlineSessions: readonly OnlineUserSessionRecord[] = [
  {
    id: 'session_admin',
    username: 'admin',
    tokenId: 'token_admin_1',
    ip: '127.0.0.1',
    userAgent: 'OpenCore Admin',
    lastSeenAt: '2026-06-10T00:00:00.000Z',
    expiresAt: '2026-06-10T01:00:00.000Z',
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
