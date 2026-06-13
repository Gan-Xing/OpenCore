export type SchedulerJobRegistryEntry = {
  code: string;
  title: string;
  queueName: string;
  handlerKey: string;
  allowManualTrigger: boolean;
  defaultCron?: string;
  defaultPayload?: Record<string, unknown>;
};

export type SchedulerJobDefinitionRecord = {
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

export type SchedulerJobRunLogRecord = {
  id: string;
  jobCode: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  trigger: 'manual' | 'schedule';
  attempts: number;
  durationMs?: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export const schedulerJobRegistry: readonly SchedulerJobRegistryEntry[] = [
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
];

export const seedSchedulerJobs: readonly SchedulerJobDefinitionRecord[] = [
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

export const seedSchedulerRuns: readonly SchedulerJobRunLogRecord[] = [
  {
    id: 'run_openapi_drift_1',
    jobCode: 'openapi.drift-check',
    status: 'completed',
    trigger: 'manual',
    attempts: 1,
    durationMs: 1000,
    startedAt: '2026-06-10T00:00:00.000Z',
    finishedAt: '2026-06-10T00:00:01.000Z',
    metadata: {
      actor: 'admin',
      adapter: 'bullmq',
      attempts: 1,
      executionMode: 'in-process',
      handlerKey: 'maintenance.openapiDriftCheck',
      result: { driftCheck: 'configured' },
    },
  },
];

export function listSchedulerJobRegistry(): SchedulerJobRegistryEntry[] {
  return JSON.parse(
    JSON.stringify(schedulerJobRegistry),
  ) as SchedulerJobRegistryEntry[];
}
