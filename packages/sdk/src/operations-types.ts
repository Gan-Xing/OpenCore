import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type JobDefinitionSummary = {
  id: string;
  tenantId: string;
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
  tenantId: string;
  jobCode: string;
  status: 'completed' | 'failed' | 'queued' | 'running';
  trigger: 'manual' | 'schedule';
  attempts: number;
  durationMs?: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type JobRegistryEntrySummary = {
  code: string;
  title: string;
  queueName: string;
  handlerKey: string;
  allowManualTrigger: boolean;
  defaultCron?: string;
  defaultPayload?: Record<string, unknown>;
};

export type CacheKeySummary = {
  tenantId: string;
  key: string;
  name: string;
  prefix: string;
  ttlSeconds: number;
  sizeBytes: number;
  type: string;
};

export type CacheNameSummary = {
  tenantId: string;
  name: string;
  prefix: string;
  keyCount: number;
  totalSizeBytes: number;
  expiringKeys: number;
  persistentKeys: number;
  sampleKey: string;
};

export type CacheNameList = {
  items: readonly CacheNameSummary[];
  total: number;
  scanLimit: number;
  scanComplete: boolean;
};

export type CacheValueSummary = CacheKeySummary & {
  valuePreview: string;
  encoding: 'string' | 'non-string' | 'missing';
  sensitive: boolean;
  truncated: boolean;
};

export type CacheClearResultSummary = {
  prefix: string;
  dryRun: boolean;
  matchedKeys: number;
  clearedKeys: number;
  policy: string;
};

export type CacheKeyDeleteResultSummary = {
  key: string;
  dryRun: boolean;
  existed: boolean;
  deleted: boolean;
  policy: string;
};

export type OnlineUserSessionSummary = {
  id: string;
  username: string;
  tokenId: string;
  tenantId?: string;
  membershipId?: string;
  accessMode?: 'platform' | 'platform-visit' | 'tenant';
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
  tenantId: string;
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
    provider: 'redis';
    scanLimit: number;
    scanComplete: boolean;
  };
  onlineUsers: {
    total: number;
    active: number;
    activeUsers: number;
    revoked: number;
    expired: number;
    cleanupEligible: number;
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
  'adapter' | 'enabled' | 'id' | 'tenantId'
> & {
  enabled?: boolean;
};

export type UpdateJobDefinitionRequest = Partial<
  Omit<JobDefinitionSummary, 'adapter' | 'code' | 'id' | 'tenantId'>
>;

export type TriggerJobRequest = {
  actor: string;
  metadata?: Record<string, unknown>;
};

export type DispatchDueJobsRequest = {
  actor: string;
  now?: string;
  queueName?: string;
  limit?: number;
  metadata?: Record<string, unknown>;
};

export type ClaimQueuedJobsRequest = {
  actor: string;
  queueName?: string;
  limit?: number;
  metadata?: Record<string, unknown>;
};

export type SchedulerDispatchResultSummary = {
  checkedAt: string;
  dispatchedCount: number;
  skippedCount: number;
  queuedRuns: readonly JobRunLogSummary[];
};

export type SchedulerWorkerResultSummary = {
  checkedAt: string;
  claimedCount: number;
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  runs: readonly JobRunLogSummary[];
};

export type ClearCacheRequest = {
  prefix: string;
  dryRun: boolean;
  confirmed?: boolean;
};

export type DeleteCacheKeyRequest = {
  key: string;
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

export type OnlineUserSummary = OperationsSummary['onlineUsers'];

export type CleanExpiredOnlineUserSessionsRequest = {
  expiredBefore?: string;
};

export type CleanExpiredOnlineUserSessionsResult = {
  deleted: true;
  affected: number;
  expiredBefore: string;
};

export type CreateReportDefinitionRequest = Omit<
  ReportDefinitionSummary,
  'enabled' | 'id' | 'tenantId'
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

export type JobRunCleanStatus = 'completed' | 'failed';

export type CleanJobRunLogsRequest = {
  retentionDays?: number;
  status?: JobRunCleanStatus;
};

export type JobRunCleanSummary = {
  deleted: true;
  jobCode: string;
  affected: number;
  retentionDays: number;
  cutoffBefore: string;
  statuses: readonly JobRunCleanStatus[];
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
  jobRegistry: readonly JobRegistryEntrySummary[];
  jobs: readonly JobDefinitionSummary[];
  jobRuns: readonly JobRunLogSummary[];
  cacheKeys: readonly CacheKeySummary[];
  onlineUsers: readonly OnlineUserSessionSummary[];
  reports: readonly ReportDefinitionSummary[];
  exportJobDesign: ExportJobDesignSummary;
};

export function createOperationsFixtures(): OperationsFixtures {
  const jobRegistry: readonly JobRegistryEntrySummary[] = [
    {
      code: 'openapi.drift-check',
      title: 'OpenAPI drift check',
      queueName: 'maintenance',
      handlerKey: 'maintenance.openapiDriftCheck',
      allowManualTrigger: true,
      defaultCron: '0 * * * *',
      defaultPayload: { command: 'pnpm openapi:check' },
    },
    {
      code: 'report.refresh',
      title: 'Refresh reports',
      queueName: 'reports',
      handlerKey: 'reports.refresh',
      allowManualTrigger: true,
      defaultPayload: { source: 'monitor.status' },
    },
    {
      code: 'audit-log.retention-clean',
      title: 'Audit log retention clean',
      queueName: 'maintenance',
      handlerKey: 'maintenance.auditLogRetention',
      allowManualTrigger: true,
      defaultCron: '0 3 * * *',
      defaultPayload: { retentionDays: 90 },
    },
  ];
  const jobs: readonly JobDefinitionSummary[] = [
    {
      id: 'job_openapi_drift',
      tenantId: 'tenant_root',
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
    {
      id: 'job_audit_log_retention_clean',
      tenantId: 'tenant_root',
      code: 'audit-log.retention-clean',
      name: 'Audit log retention clean',
      queueName: 'maintenance',
      cron: '0 3 * * *',
      enabled: true,
      retryLimit: 1,
      timeoutSeconds: 60,
      adapter: 'bullmq',
      payload: { retentionDays: 90 },
    },
  ];
  const jobRuns: readonly JobRunLogSummary[] = [
    {
      id: 'run_openapi_drift_1',
      tenantId: 'tenant_root',
      jobCode: 'openapi.drift-check',
      status: 'completed',
      trigger: 'manual',
      attempts: 1,
      durationMs: 1000,
      startedAt: '2026-06-10T00:00:00.000Z',
      finishedAt: '2026-06-10T00:00:01.000Z',
      metadata: {
        actor: 'admin',
        attempts: 1,
        executionMode: 'in-process',
        handlerKey: 'maintenance.openapiDriftCheck',
        tenantId: 'tenant_root',
        result: { driftCheck: 'configured' },
      },
    },
    {
      id: 'run_audit_retention_worker_1',
      tenantId: 'tenant_root',
      jobCode: 'audit-log.retention-clean',
      status: 'completed',
      trigger: 'schedule',
      attempts: 1,
      durationMs: 250,
      startedAt: '2026-06-10T03:00:00.000Z',
      finishedAt: '2026-06-10T03:00:00.250Z',
      metadata: {
        actor: 'scheduler-worker',
        attempts: 1,
        executionMode: 'worker',
        handlerKey: 'maintenance.auditLogRetention',
        queuedRunId: 'run_audit_retention_queued_1',
        tenantId: 'tenant_root',
        result: {
          affected: 0,
          dryRun: true,
          retentionDays: 90,
        },
      },
    },
  ];
  const cacheKeys: readonly CacheKeySummary[] = [
    {
      tenantId: 'tenant_root',
      key: 'opencore:tenant:tenant_root:admin:shell',
      name: 'admin',
      prefix: 'opencore:tenant:tenant_root:admin',
      ttlSeconds: 300,
      sizeBytes: 512,
      type: 'string',
    },
  ];
  const onlineUsers: readonly OnlineUserSessionSummary[] = [
    {
      id: 'session_admin',
      username: 'admin',
      tokenId: 'token_admin_1',
      tenantId: 'tenant_root',
      membershipId: 'tenant_membership_root_user_admin',
      accessMode: 'tenant',
      ip: '127.0.0.1',
      userAgent: 'OpenCore Admin',
      browser: 'OpenCore Admin',
      os: 'Unknown',
      lastSeenAt: '2026-06-10T00:00:00.000Z',
      expiresAt: '2099-06-10T01:00:00.000Z',
    },
    {
      id: 'session_operator',
      username: 'operator',
      tokenId: 'token_operator_1',
      tenantId: 'tenant_root',
      accessMode: 'tenant',
      ip: '127.0.0.2',
      userAgent: 'OpenCore Smoke Operator',
      browser: 'OpenCore Smoke',
      os: 'Unknown',
      lastSeenAt: '2026-06-10T00:05:00.000Z',
      expiresAt: '2099-06-10T01:05:00.000Z',
    },
  ];
  const reports: readonly ReportDefinitionSummary[] = [
    {
      id: 'report_runtime_health',
      tenantId: 'tenant_root',
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
        latestStartedAt: [...jobRuns]
          .map((run) => run.startedAt)
          .sort((left, right) => right.localeCompare(left))[0],
      },
      cache: {
        keyCount: cacheKeys.length,
        totalSizeBytes: cacheKeys.reduce(
          (total, key) => total + key.sizeBytes,
          0,
        ),
        provider: 'redis',
        scanLimit: 2_000,
        scanComplete: true,
      },
      onlineUsers: {
        total: onlineUsers.length,
        active: onlineUsers.filter((session) => !session.revokedAt).length,
        activeUsers: new Set(
          onlineUsers
            .filter((session) => !session.revokedAt)
            .map((session) => session.username),
        ).size,
        revoked: onlineUsers.filter((session) => session.revokedAt).length,
        expired: 0,
        cleanupEligible: 0,
      },
      reports: {
        total: reports.length,
        enabled: reports.filter((report) => report.enabled).length,
        disabled: reports.filter((report) => !report.enabled).length,
      },
      exportJobStatus: exportJobDesign.status,
    },
    jobRegistry,
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

export function listJobRegistryFixtures(): readonly JobRegistryEntrySummary[] {
  return [...createOperationsFixtures().jobRegistry];
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
export type CacheKeyPage = PageResponse<CacheKeySummary> & {
  scanLimit: number;
  scanComplete: boolean;
};
export type OnlineUserSessionPage = PageResponse<OnlineUserSessionSummary>;
export type ReportDefinitionPage = PageResponse<ReportDefinitionSummary>;

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}
