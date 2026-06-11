import {
  createMonitoringClient,
  createRbacClient,
  type SystemStatusSummary,
  type UserSummary,
} from '@opencore/sdk';
import { getRequiredAdminToken, opencoreSdkRequest } from './client';

const rbacClient = createRbacClient(opencoreSdkRequest);
const monitoringClient = createMonitoringClient(opencoreSdkRequest);

export function listOpenCoreUsers(): Promise<UserSummary[]> {
  return rbacClient.listUsers(getRequiredAdminToken());
}

export function getOpenCoreSystemStatus(): Promise<SystemStatusSummary> {
  return monitoringClient.getStatus(getRequiredAdminToken());
}
