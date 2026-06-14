import type { SdkRequest } from './rbac-client';
import type {
  QueueControlResultSummary,
  QueueStatusList,
  SystemStatusSummary,
  VersionInfoSummary,
} from './monitoring-types';

export type MonitoringClient = {
  getStatus: (token: string) => Promise<SystemStatusSummary>;
  getVersion: (token: string) => Promise<VersionInfoSummary>;
  listQueues: (token: string) => Promise<QueueStatusList>;
  pauseQueue: (
    token: string,
    name: string,
  ) => Promise<QueueControlResultSummary>;
  resumeQueue: (
    token: string,
    name: string,
  ) => Promise<QueueControlResultSummary>;
};

export function createMonitoringClient(request: SdkRequest): MonitoringClient {
  return {
    getStatus: (token) =>
      request<SystemStatusSummary>('/monitor/status', {
        token,
      }),
    getVersion: (token) =>
      request<VersionInfoSummary>('/monitor/version', {
        token,
      }),
    listQueues: (token) =>
      request<QueueStatusList>('/monitor/queues', {
        token,
      }),
    pauseQueue: (token, name) =>
      request<QueueControlResultSummary>(`/monitor/queues/${name}/pause`, {
        method: 'POST',
        token,
      }),
    resumeQueue: (token, name) =>
      request<QueueControlResultSummary>(`/monitor/queues/${name}/resume`, {
        method: 'POST',
        token,
      }),
  };
}
