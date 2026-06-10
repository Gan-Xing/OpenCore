import type { SdkRequest } from './rbac-client';
import type {
  QueueStatusList,
  SystemStatusSummary,
  VersionInfoSummary,
} from './monitoring-types';

export type MonitoringClient = {
  getStatus: (token: string) => Promise<SystemStatusSummary>;
  getVersion: (token: string) => Promise<VersionInfoSummary>;
  listQueues: (token: string) => Promise<QueueStatusList>;
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
  };
}
