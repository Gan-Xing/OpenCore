import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'packages/monitor/src/monitor/monitor.records.ts',
    markers: [
      'createTenantMonitorQueueIdentity',
      'createTenantMonitorQueuePrefix',
      'stripTenantMonitorQueueName',
      'runtimeName: `tenant:${normalizedTenantId}:${name}`',
    ],
  },
  {
    file: 'packages/monitor/src/monitor/monitor.repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'stripTenantMonitorQueueName',
      'this.diagnostics.listQueues(tenantId)',
      'this.diagnostics.pauseQueue(tenantId, name)',
      'this.diagnostics.resumeQueue(tenantId, name)',
    ],
  },
  {
    file: 'packages/monitor/src/monitor/monitor.runtime-diagnostics.service.ts',
    markers: [
      'createTenantMonitorQueueIdentity',
      'createTenantMonitorQueuePrefix',
      'new Queue(identity.name',
      'tenantId: identity.tenantId',
      'runtimeName: identity.runtimeName',
    ],
  },
  {
    file: 'packages/monitor/src/monitor/monitor.spec.ts',
    markers: [
      'tenant:tenant_root:maintenance',
      'tenant:tenant_foreign:maintenance',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-monitor-jobs.ts',
    markers: [
      'tenant_queue_foreign',
      'monitor.queue.tenant-runtime-name',
      'maintenance queue runtime name',
    ],
  },
  {
    file: 'packages/sdk/src/monitoring-types.ts',
    markers: ['tenantId: string', 'runtimeName: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-queue-scope', 'smoke:core-monitor-jobs'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T5d', 'BullMQ monitor queue namespace scoped by active tenant'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant queue marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant queue scope guard passed.');
