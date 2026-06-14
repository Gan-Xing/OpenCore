export const monitorQueueNames = ['maintenance', 'reports'] as const;

export type MonitorQueueName = (typeof monitorQueueNames)[number];

export const monitorDependencyNames = [
  'api',
  'database',
  'redis',
  'queue',
  's3',
  'file-assets',
] as const;

export type MonitorDependencyName = (typeof monitorDependencyNames)[number];
