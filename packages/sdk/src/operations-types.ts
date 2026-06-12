import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type JobDefinitionSummary = {
  id: string;
  code: string;
  name: string;
  queueName: string;
  cron?: string;
  enabled: boolean;
  retryLimit: number;
  timeoutSeconds: number;
  adapter: 'bullmq';
  payload?: Record<string, unknown>;
};

export type JobRunLogSummary = {
  id: string;
  jobCode: string;
  status: 'completed' | 'failed' | 'queued' | 'running';
  trigger: 'manual' | 'schedule';
  attempts: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type CacheKeySummary = {
  key: string;
  prefix: string;
  ttlSeconds: number;
  sizeBytes: number;
};

export type CacheClearResultSummary = {
  prefix: string;
  dryRun: boolean;
  matchedKeys: number;
  clearedKeys: number;
  policy: string;
};

export type OnlineUserSessionSummary = {
  id: string;
  username: string;
  tokenId: string;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
};

export type ReportDefinitionSummary = {
  id: string;
  code: string;
  name: string;
  description?: string;
  querySchema: Record<string, unknown>;
  enabled: boolean;
  owner: string;
};

export type ExportJobDesignSummary = {
  resource: string;
  status: 'design-only';
  requiredBindings: readonly string[];
  safetyChecks: readonly string[];
  runbook: string;
};

export type OperationsSummary = {
  jobs: {
    total: number;
    enabled: number;
    disabled: number;
  };
  jobRuns: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    latestStartedAt?: string;
  };
  cache: {
    keyCount: number;
    totalSizeBytes: number;
  };
  onlineUsers: {
    total: number;
    active: number;
    revoked: number;
  };
  reports: {
    total: number;
    enabled: number;
    disabled: number;
  };
  exportJobStatus: 'design-only';
};

export type CreateJobDefinitionRequest = Omit<
  JobDefinitionSummary,
  'adapter' | 'enabled' | 'id'
> & {
  enabled?: boolean;
};

export type UpdateJobDefinitionRequest = Partial<
  Omit<JobDefinitionSummary, 'adapter' | 'code' | 'id'>
>;

export type TriggerJobRequest = {
  actor: string;
  metadata?: Record<string, unknown>;
};

export type ClearCacheRequest = {
  prefix: string;
  dryRun: boolean;
  confirmed?: boolean;
};

export type KickOutSessionRequest = {
  actor: string;
  reason: string;
};

export type BatchKickOutSessionsRequest = KickOutSessionRequest & {
  ids: readonly string[];
};

export type BatchKickOutSessionsResult = {
  requested: number;
  kicked: number;
  skipped: number;
  items: readonly OnlineUserSessionSummary[];
};

export type CreateReportDefinitionRequest = Omit<
  ReportDefinitionSummary,
  'enabled' | 'id'
> & {
  enabled?: boolean;
};

export type JobQueryRequest = PageRequest & {
  enabled?: boolean;
  queueName?: string;
};

export type JobRunQueryRequest = PageRequest & {
  status?: 'completed' | 'failed' | 'queued' | 'running';
};

export type CacheKeyQueryRequest = PageRequest & {
  prefix?: string;
};

export type OnlineUserQueryRequest = PageRequest & {
  active?: boolean;
  username?: string;
};

export type ReportQueryRequest = PageRequest & {
  enabled?: boolean;
  owner?: string;
};

export type OperationsFixtures = {
  summary: OperationsSummary;
  jobs: readonly JobDefinitionSummary[];
  jobRuns: readonly JobRunLogSummary[];
  cacheKeys: readonly CacheKeySummary[];
  onlineUsers: readonly OnlineUserSessionSummary[];
  reports: readonly ReportDefinitionSummary[];
  exportJobDesign: ExportJobDesignSummary;
};

export function createOperationsFixtures(): OperationsFixtures {
  const jobs: readonly JobDefinitionSummary[] = [
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
  const jobRuns: readonly JobRunLogSummary[] = [
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
  const cacheKeys: readonly CacheKeySummary[] = [
    {
      key: 'opencore:admin:shell',
      prefix: 'opencore:admin',
      ttlSeconds: 300,
      sizeBytes: 512,
    },
  ];
  const onlineUsers: readonly OnlineUserSessionSummary[] = [
    {
      id: 'session_admin',
      username: 'admin',
      tokenId: 'token_admin_1',
      ip: '127.0.0.1',
      userAgent: 'OpenCore Admin',
      browser: 'OpenCore Admin',
      os: 'Unknown',
      lastSeenAt: '2026-06-10T00:00:00.000Z',
      expiresAt: '2026-06-10T01:00:00.000Z',
    },
    {
      id: 'session_operator',
      username: 'operator',
      tokenId: 'token_operator_1',
      ip: '127.0.0.2',
      userAgent: 'OpenCore Smoke Operator',
      browser: 'OpenCore Smoke',
      os: 'Unknown',
      lastSeenAt: '2026-06-10T00:05:00.000Z',
      expiresAt: '2026-06-10T01:05:00.000Z',
    },
  ];
  const reports: readonly ReportDefinitionSummary[] = [
    {
      id: 'report_runtime_health',
      code: 'runtime.health',
      name: 'Runtime Health',
      querySchema: { source: 'monitor.status' },
      enabled: true,
      owner: 'admin',
    },
  ];
  const exportJobDesign: ExportJobDesignSummary = {
    resource: 'async-export-job',
    status: 'design-only',
    requiredBindings: [
      'file asset id',
      'job definition code',
      'permission code',
      'expiry timestamp',
      'audit log id',
    ],
    safetyChecks: ['download expires by policy'],
    runbook: 'docs/development/export-upload-contract.md',
  };

  return {
    summary: {
      jobs: {
        total: jobs.length,
        enabled: jobs.filter((job) => job.enabled).length,
        disabled: jobs.filter((job) => !job.enabled).length,
      },
      jobRuns: {
        total: jobRuns.length,
        queued: countByStatus(jobRuns, 'queued'),
        running: countByStatus(jobRuns, 'running'),
        completed: countByStatus(jobRuns, 'completed'),
        failed: countByStatus(jobRuns, 'failed'),
        latestStartedAt: jobRuns[0]?.startedAt,
      },
      cache: {
        keyCount: cacheKeys.length,
        totalSizeBytes: cacheKeys.reduce(
          (total, key) => total + key.sizeBytes,
          0,
        ),
      },
      onlineUsers: {
        total: onlineUsers.length,
        active: onlineUsers.filter((session) => !session.revokedAt).length,
        revoked: onlineUsers.filter((session) => session.revokedAt).length,
      },
      reports: {
        total: reports.length,
        enabled: reports.filter((report) => report.enabled).length,
        disabled: reports.filter((report) => !report.enabled).length,
      },
      exportJobStatus: exportJobDesign.status,
    },
    jobs,
    jobRuns,
    cacheKeys,
    onlineUsers,
    reports,
    exportJobDesign,
  };
}

export function findJobFixture(code: string): JobDefinitionSummary | undefined {
  return createOperationsFixtures().jobs.find((job) => job.code === code);
}

export function findJobRunFixture(
  jobCode: string,
  id: string,
): JobRunLogSummary | undefined {
  return createOperationsFixtures().jobRuns.find(
    (run) => run.jobCode === jobCode && run.id === id,
  );
}

export function findOnlineUserFixture(
  id: string,
): OnlineUserSessionSummary | undefined {
  return createOperationsFixtures().onlineUsers.find(
    (session) => session.id === id,
  );
}

export function findReportFixture(
  code: string,
): ReportDefinitionSummary | undefined {
  return createOperationsFixtures().reports.find(
    (report) => report.code === code,
  );
}

export function findExportJobDesignFixture(
  resource: string,
): ExportJobDesignSummary | undefined {
  const fixture = createOperationsFixtures().exportJobDesign;
  return fixture.resource === resource ? fixture : undefined;
}

export type JobDefinitionPage = PageResponse<JobDefinitionSummary>;
export type JobRunLogPage = PageResponse<JobRunLogSummary>;
export type CacheKeyPage = PageResponse<CacheKeySummary>;
export type OnlineUserSessionPage = PageResponse<OnlineUserSessionSummary>;
export type ReportDefinitionPage = PageResponse<ReportDefinitionSummary>;

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}
