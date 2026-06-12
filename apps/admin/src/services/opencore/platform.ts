import {
  createMonitoringClient,
  createRbacClient,
  createSystemManagementClient,
  type CreateDictTypeRequest,
  type CreateMenuRequest,
  type CreatePermissionRequest,
  type CreateRoleRequest,
  type CreateUserRequest,
  type CreateSystemDeptRequest,
  type CreateSystemNoticeRequest,
  type CreateSystemPostRequest,
  type MenuSummary,
  type PermissionSummary,
  type RoleSummary,
  type SystemStatusSummary,
  type DictTypeSummary,
  type SystemDeptQueryRequest,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
  type SystemNoticeQueryRequest,
  type SystemNoticeSummary,
  type SystemPostQueryRequest,
  type SystemPostSummary,
  type UpdateSystemDeptRequest,
  type UpdateDictTypeRequest,
  type UpdateSystemNoticeRequest,
  type UpdateSystemPostRequest,
  type UpdateMenuRequest,
  type UpdatePermissionRequest,
  type UpdateRoleRequest,
  type UserSummary,
  type UpdateUserRequest,
} from '@opencore/sdk';
import { getRequiredAdminToken, opencoreSdkRequest } from './client';

const rbacClient = createRbacClient(opencoreSdkRequest);
const monitoringClient = createMonitoringClient(opencoreSdkRequest);
const systemManagementClient = createSystemManagementClient(opencoreSdkRequest);

export function listOpenCoreUsers(): Promise<UserSummary[]> {
  return rbacClient.listUsers(getRequiredAdminToken());
}

export function getOpenCoreUser(id: string): Promise<UserSummary> {
  return rbacClient.getUser(getRequiredAdminToken(), id);
}

export function createOpenCoreUser(
  body: CreateUserRequest,
): Promise<UserSummary> {
  return rbacClient.createUser(getRequiredAdminToken(), body);
}

export function updateOpenCoreUser(
  id: string,
  body: UpdateUserRequest,
): Promise<UserSummary> {
  return rbacClient.updateUser(getRequiredAdminToken(), id, body);
}

export function deleteOpenCoreUser(id: string): Promise<{ deleted: true }> {
  return rbacClient.deleteUser(getRequiredAdminToken(), id);
}

export function listOpenCoreRoles(): Promise<RoleSummary[]> {
  return rbacClient.listRoles(getRequiredAdminToken());
}

export function getOpenCoreRole(code: string): Promise<RoleSummary> {
  return rbacClient.getRole(getRequiredAdminToken(), code);
}

export function createOpenCoreRole(
  body: CreateRoleRequest,
): Promise<RoleSummary> {
  return rbacClient.createRole(getRequiredAdminToken(), body);
}

export function updateOpenCoreRole(
  code: string,
  body: UpdateRoleRequest,
): Promise<RoleSummary> {
  return rbacClient.updateRole(getRequiredAdminToken(), code, body);
}

export function deleteOpenCoreRole(code: string): Promise<{ deleted: true }> {
  return rbacClient.deleteRole(getRequiredAdminToken(), code);
}

export function listOpenCorePermissions(): Promise<PermissionSummary[]> {
  return rbacClient.listPermissions(getRequiredAdminToken());
}

export function getOpenCorePermission(
  code: string,
): Promise<PermissionSummary> {
  return rbacClient.getPermission(getRequiredAdminToken(), code);
}

export function createOpenCorePermission(
  body: CreatePermissionRequest,
): Promise<PermissionSummary> {
  return rbacClient.createPermission(getRequiredAdminToken(), body);
}

export function updateOpenCorePermission(
  code: string,
  body: UpdatePermissionRequest,
): Promise<PermissionSummary> {
  return rbacClient.updatePermission(getRequiredAdminToken(), code, body);
}

export function deleteOpenCorePermission(
  code: string,
): Promise<{ deleted: true }> {
  return rbacClient.deletePermission(getRequiredAdminToken(), code);
}

export function getOpenCoreSystemStatus(): Promise<SystemStatusSummary> {
  return monitoringClient.getStatus(getRequiredAdminToken());
}

export async function listOpenCoreDicts(): Promise<DictTypeSummary[]> {
  const page = await systemManagementClient.listDicts(getRequiredAdminToken(), {
    page: 1,
    pageSize: 100,
  });
  return [...page.items];
}

export function getOpenCoreDict(code: string): Promise<DictTypeSummary> {
  return systemManagementClient.getDict(getRequiredAdminToken(), code);
}

export function createOpenCoreDict(
  body: CreateDictTypeRequest,
): Promise<DictTypeSummary> {
  return systemManagementClient.createDict(getRequiredAdminToken(), body);
}

export function updateOpenCoreDict(
  code: string,
  body: UpdateDictTypeRequest,
): Promise<DictTypeSummary> {
  return systemManagementClient.updateDict(getRequiredAdminToken(), code, body);
}

export function deleteOpenCoreDict(code: string): Promise<{ deleted: true }> {
  return systemManagementClient.deleteDict(getRequiredAdminToken(), code);
}

export function listOpenCoreMenus(): Promise<MenuSummary[]> {
  return rbacClient.listMenus(getRequiredAdminToken());
}

export function getOpenCoreMenu(key: string): Promise<MenuSummary> {
  return rbacClient.getMenu(getRequiredAdminToken(), key);
}

export function createOpenCoreMenu(
  body: CreateMenuRequest,
): Promise<MenuSummary> {
  return rbacClient.createMenu(getRequiredAdminToken(), body);
}

export function updateOpenCoreMenu(
  key: string,
  body: UpdateMenuRequest,
): Promise<MenuSummary> {
  return rbacClient.updateMenu(getRequiredAdminToken(), key, body);
}

export function deleteOpenCoreMenu(key: string): Promise<{ deleted: true }> {
  return rbacClient.deleteMenu(getRequiredAdminToken(), key);
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
