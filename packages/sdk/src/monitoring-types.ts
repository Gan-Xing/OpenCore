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
  dependencies: readonly DependencyStatusSummary[];
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
  readOnly: true;
};

export type QueueStatusList = {
  checkedAt: string;
  queues: readonly QueueStatusSummary[];
};
