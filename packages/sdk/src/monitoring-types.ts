export type DependencyStatusSummary = {
  name: string;
  status: 'degraded' | 'ok';
  latencyMs: number;
  message: string;
};

export type SystemStatusSummary = {
  status: 'degraded' | 'ok';
  checkedAt: string;
  uptimeSeconds: number;
  runtime: RuntimeResourceSummary;
  dependencies: readonly DependencyStatusSummary[];
};

export type RuntimeCpuSummary = {
  logicalCores: number;
  loadAverage1m: number;
  loadAverage5m: number;
  loadAverage15m: number;
  processUserMicros: number;
  processSystemMicros: number;
};

export type RuntimeMemorySummary = {
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  systemTotalBytes: number;
  systemFreeBytes: number;
  processRssRatio: number;
  systemUsedRatio: number;
};

export type RuntimeDiskSummary = {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedRatio: number;
};

export type RuntimeProcessSummary = {
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  startedAt: string;
};

export type RuntimeResourceSummary = {
  sampledAt: string;
  process: RuntimeProcessSummary;
  cpu: RuntimeCpuSummary;
  memory: RuntimeMemorySummary;
  disk: RuntimeDiskSummary;
};

export type VersionInfoSummary = {
  name: string;
  version: string;
  commit: string;
  buildTime: string;
  nodeVersion: string;
  runtime: string;
  environment: string;
  platform: string;
  arch: string;
  processId: number;
  uptimeSeconds: number;
  startedAt: string;
  timezone: string;
  deploymentId: string;
};

export type QueueStatusSummary = {
  name: string;
  driver: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  paused: boolean;
  controlMode: 'managed' | 'unavailable';
};

export type QueueStatusList = {
  checkedAt: string;
  queues: readonly QueueStatusSummary[];
};

export type QueueControlResultSummary = {
  name: string;
  action: 'pause' | 'resume';
  appliedAt: string;
  queue: QueueStatusSummary;
};
