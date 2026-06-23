export const monitorQueueNames = ['maintenance', 'reports'] as const;

export type MonitorQueueName = (typeof monitorQueueNames)[number];

export type MonitorTenantQueueIdentity = {
  tenantId: string;
  name: MonitorQueueName;
  runtimeName: string;
};

export function createTenantMonitorQueueIdentity(
  tenantId: string,
  name: MonitorQueueName,
): MonitorTenantQueueIdentity {
  const normalizedTenantId = normalizeMonitorQueueTenantId(tenantId);

  return {
    tenantId: normalizedTenantId,
    name,
    runtimeName: `tenant:${normalizedTenantId}:${name}`,
  };
}

export function createTenantMonitorQueuePrefix(
  basePrefix: string,
  tenantId: string,
): string {
  const normalizedPrefix = basePrefix.trim().replace(/:+$/g, '');
  const normalizedTenantId = normalizeMonitorQueueTenantId(tenantId);

  return `${normalizedPrefix}:tenant:${normalizedTenantId}`;
}

export function stripTenantMonitorQueueName(value: string): string {
  const normalized = value.trim();
  if (!normalized.startsWith('tenant:')) {
    return normalized;
  }

  const match = /^tenant:([^:]+):(.+)$/.exec(normalized);
  return match?.[2] ?? normalized;
}

export function normalizeMonitorQueueTenantId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Monitor queue tenantId is required.');
  }

  const tenantId = value.trim();
  if (tenantId.length > 120 || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(tenantId)) {
    throw new Error('Monitor queue tenantId must be a safe identifier.');
  }

  return tenantId;
}

export const monitorDependencyNames = [
  'api',
  'database',
  'redis',
  'queue',
  's3',
  'file-assets',
] as const;

export type MonitorDependencyName = (typeof monitorDependencyNames)[number];
