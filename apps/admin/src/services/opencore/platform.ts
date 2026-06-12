import {
  createMonitoringClient,
  createRbacClient,
  createSystemManagementClient,
  type CreateSystemDeptRequest,
  type CreateSystemNoticeRequest,
  type CreateSystemPostRequest,
  type SystemStatusSummary,
  type SystemDeptQueryRequest,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
  type SystemNoticeQueryRequest,
  type SystemNoticeSummary,
  type SystemPostQueryRequest,
  type SystemPostSummary,
  type UpdateSystemDeptRequest,
  type UpdateSystemNoticeRequest,
  type UpdateSystemPostRequest,
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

export function listOpenCoreSystemDepts(
  query?: SystemDeptQueryRequest,
): Promise<readonly SystemDeptTreeSummary[]> {
  return systemManagementClient.listDepts(getRequiredAdminToken(), query);
}

export function getOpenCoreSystemDept(id: string): Promise<SystemDeptSummary> {
  return systemManagementClient.getDept(getRequiredAdminToken(), id);
}

export function createOpenCoreSystemDept(
  body: CreateSystemDeptRequest,
): Promise<SystemDeptSummary> {
  return systemManagementClient.createDept(getRequiredAdminToken(), body);
}

export function updateOpenCoreSystemDept(
  id: string,
  body: UpdateSystemDeptRequest,
): Promise<SystemDeptSummary> {
  return systemManagementClient.updateDept(getRequiredAdminToken(), id, body);
}

export function deleteOpenCoreSystemDept(
  id: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deleteDept(getRequiredAdminToken(), id);
}

export async function listOpenCoreSystemPosts(
  query?: SystemPostQueryRequest,
): Promise<SystemPostSummary[]> {
  const page = await systemManagementClient.listPosts(
    getRequiredAdminToken(),
    query,
  );
  return [...page.items];
}

export function getOpenCoreSystemPost(
  code: string,
): Promise<SystemPostSummary> {
  return systemManagementClient.getPost(getRequiredAdminToken(), code);
}

export function createOpenCoreSystemPost(
  body: CreateSystemPostRequest,
): Promise<SystemPostSummary> {
  return systemManagementClient.createPost(getRequiredAdminToken(), body);
}

export function updateOpenCoreSystemPost(
  code: string,
  body: UpdateSystemPostRequest,
): Promise<SystemPostSummary> {
  return systemManagementClient.updatePost(getRequiredAdminToken(), code, body);
}

export function deleteOpenCoreSystemPost(
  code: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deletePost(getRequiredAdminToken(), code);
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
