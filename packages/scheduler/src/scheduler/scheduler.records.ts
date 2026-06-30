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

export type SchedulerJobRunLogRecord = {
  id: string;
  tenantId: string;
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
    code: 'audit-log.retention-clean',
    title: 'Audit log retention clean',
    queueName: 'maintenance',
    handlerKey: 'maintenance.auditLogRetention',
    allowManualTrigger: true,
    defaultCron: '0 3 * * *',
    defaultPayload: { retentionDays: 90 },
  },
  {
    code: 'collaboration.ticket-sla-reminders',
    title: 'Collaboration ticket SLA reminders',
    queueName: 'collaboration',
    handlerKey: 'collaboration.ticketSlaReminders',
    allowManualTrigger: true,
    defaultCron: '30 * * * *',
    defaultPayload: { source: 'collaboration.tickets.sla' },
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
  {
    id: 'job_collaboration_ticket_sla_reminders',
    tenantId: 'tenant_root',
    code: 'collaboration.ticket-sla-reminders',
    name: 'Collaboration ticket SLA reminders',
    queueName: 'collaboration',
    cron: '30 * * * *',
    enabled: true,
    retryLimit: 1,
    timeoutSeconds: 60,
    adapter: 'bullmq',
    payload: { source: 'collaboration.tickets.sla' },
  },
];

export const seedSchedulerRuns: readonly SchedulerJobRunLogRecord[] = [
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
      adapter: 'bullmq',
      attempts: 1,
      executionMode: 'in-process',
      handlerKey: 'maintenance.openapiDriftCheck',
      tenantId: 'tenant_root',
      result: { driftCheck: 'configured' },
    },
  },
];

export function listSchedulerJobRegistry(): SchedulerJobRegistryEntry[] {
  return JSON.parse(
    JSON.stringify(schedulerJobRegistry),
  ) as SchedulerJobRegistryEntry[];
}
