import {
  createMonitoringClient,
  createRbacClient,
  createSystemManagementClient,
  type CreateSystemNoticeRequest,
  type SystemStatusSummary,
  type SystemNoticeQueryRequest,
  type SystemNoticeSummary,
  type UpdateSystemNoticeRequest,
  type UserSummary,
} from '@opencore/sdk';
import { getRequiredAdminToken, opencoreSdkRequest } from './client';

const rbacClient = createRbacClient(opencoreSdkRequest);
const monitoringClient = createMonitoringClient(opencoreSdkRequest);
const systemManagementClient = createSystemManagementClient(opencoreSdkRequest);

export function listOpenCoreUsers(): Promise<UserSummary[]> {
  return rbacClient.listUsers(getRequiredAdminToken());
}

export function getOpenCoreSystemStatus(): Promise<SystemStatusSummary> {
  return monitoringClient.getStatus(getRequiredAdminToken());
}

export async function listOpenCoreSystemNotices(
  query?: SystemNoticeQueryRequest,
): Promise<SystemNoticeSummary[]> {
  const page = await systemManagementClient.listNotices(
    getRequiredAdminToken(),
    query,
  );
  return [...page.items];
}

export function getOpenCoreSystemNotice(
  id: string,
): Promise<SystemNoticeSummary> {
  return systemManagementClient.getNotice(getRequiredAdminToken(), id);
}

export function createOpenCoreSystemNotice(
  body: CreateSystemNoticeRequest,
): Promise<SystemNoticeSummary> {
  return systemManagementClient.createNotice(getRequiredAdminToken(), body);
}

export function updateOpenCoreSystemNotice(
  id: string,
  body: UpdateSystemNoticeRequest,
): Promise<SystemNoticeSummary> {
  return systemManagementClient.updateNotice(getRequiredAdminToken(), id, body);
}

export function publishOpenCoreSystemNotice(
  id: string,
): Promise<SystemNoticeSummary> {
  return systemManagementClient.publishNotice(getRequiredAdminToken(), id);
}

export function archiveOpenCoreSystemNotice(
  id: string,
): Promise<SystemNoticeSummary> {
  return systemManagementClient.archiveNotice(getRequiredAdminToken(), id);
}

export function deleteOpenCoreSystemNotice(
  id: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deleteNotice(getRequiredAdminToken(), id);
}
