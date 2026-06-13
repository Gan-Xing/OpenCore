import {
  createMonitoringClient,
  createOperationsClient,
  createRbacClient,
  createSystemManagementClient,
  type AssignRoleMenusRequest,
  type AssignRoleUsersRequest,
  type AuditLogQueryRequest,
  type AuditLogSummary,
  type BatchKickOutSessionsRequest,
  type BatchKickOutSessionsResult,
  type CreateDictItemRequest,
  type CreateDictTypeRequest,
  type CreateFileAssetRequest,
  type CreateMenuRequest,
  type CreatePermissionRequest,
  type CreateRoleRequest,
  type CreateSystemConfigRequest,
  type CreateUserRequest,
  type CreateSystemDeptRequest,
  type CreateSystemNoticeRequest,
  type CreateSystemPostRequest,
  type MenuSummary,
  type PermissionSummary,
  type RbacDeleteResult,
  type RoleMenuAssignmentSummary,
  type RoleMutationSummary,
  type RoleUserAssignmentSummary,
  type RoleSummary,
  type SetRoleStatusRequest,
  type SystemStatusSummary,
  type DictDataOptionQueryRequest,
  type DictDataOptionSummary,
  type DictItemSummary,
  type DictTypeSummary,
  type SystemConfigSummary,
  type SystemConfigCacheRefreshSummary,
  type SystemConfigValueSummary,
  type SystemDeptOptionSummary,
  type SystemDeptQueryRequest,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
  type FileAssetSummary,
  type LoginLogQueryRequest,
  type LoginLogSummary,
  type KickOutSessionRequest,
  type ListUsersRequest,
  type OnlineUserQueryRequest,
  type OnlineUserSessionSummary,
  type SystemNoticeQueryRequest,
  type SystemNoticeSummary,
  type SystemPostOptionSummary,
  type SystemPostQueryRequest,
  type SystemPostSummary,
  type ResetUserPasswordRequest,
  type SetUserStatusRequest,
  type UpdateSystemDeptRequest,
  type UpdateDictItemRequest,
  type UpdateDictTypeRequest,
  type UpdateFileAssetRequest,
  type UpdateSystemConfigRequest,
  type UpdateSystemNoticeRequest,
  type UpdateSystemPostRequest,
  type UploadFileAssetRequest,
  type UpdateMenuRequest,
  type UpdatePermissionRequest,
  type UpdateRoleRequest,
  type UserSummary,
  type UserOptionSummary,
  type UserMutationSummary,
  type UpdateUserRequest,
} from '@opencore/sdk';
import { getRequiredAdminToken, opencoreSdkRequest } from './client';

const rbacClient = createRbacClient(opencoreSdkRequest);
const monitoringClient = createMonitoringClient(opencoreSdkRequest);
const operationsClient = createOperationsClient(opencoreSdkRequest);
const systemManagementClient = createSystemManagementClient(opencoreSdkRequest);

export function listOpenCoreUsers(
  query?: ListUsersRequest,
): Promise<UserSummary[]> {
  return rbacClient.listUsers(getRequiredAdminToken(), query);
}

export function listOpenCoreUserOptions(
  query?: ListUsersRequest,
): Promise<readonly UserOptionSummary[]> {
  return rbacClient.listUserOptions(getRequiredAdminToken(), query);
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
): Promise<UserMutationSummary> {
  return rbacClient.updateUser(getRequiredAdminToken(), id, body);
}

export function setOpenCoreUserStatus(
  id: string,
  body: SetUserStatusRequest,
): Promise<UserMutationSummary> {
  return rbacClient.setUserStatus(getRequiredAdminToken(), id, body);
}

export function resetOpenCoreUserPassword(
  id: string,
  body: ResetUserPasswordRequest,
): Promise<UserMutationSummary> {
  return rbacClient.resetUserPassword(getRequiredAdminToken(), id, body);
}

export function deleteOpenCoreUser(id: string): Promise<RbacDeleteResult> {
  return rbacClient.deleteUser(getRequiredAdminToken(), id);
}

export function listOpenCoreRoles(): Promise<RoleSummary[]> {
  return rbacClient.listRoles(getRequiredAdminToken());
}

export function getOpenCoreRole(code: string): Promise<RoleSummary> {
  return rbacClient.getRole(getRequiredAdminToken(), code);
}

export function getOpenCoreRoleMenuAssignment(
  code: string,
): Promise<RoleMenuAssignmentSummary> {
  return rbacClient.getRoleMenuAssignment(getRequiredAdminToken(), code);
}

export function assignOpenCoreRoleMenus(
  code: string,
  body: AssignRoleMenusRequest,
): Promise<RoleMenuAssignmentSummary> {
  return rbacClient.assignRoleMenus(getRequiredAdminToken(), code, body);
}

export function getOpenCoreRoleUserAssignment(
  code: string,
): Promise<RoleUserAssignmentSummary> {
  return rbacClient.getRoleUserAssignment(getRequiredAdminToken(), code);
}

export function assignOpenCoreRoleUsers(
  code: string,
  body: AssignRoleUsersRequest,
): Promise<RoleUserAssignmentSummary> {
  return rbacClient.assignRoleUsers(getRequiredAdminToken(), code, body);
}

export function createOpenCoreRole(
  body: CreateRoleRequest,
): Promise<RoleSummary> {
  return rbacClient.createRole(getRequiredAdminToken(), body);
}

export function updateOpenCoreRole(
  code: string,
  body: UpdateRoleRequest,
): Promise<RoleMutationSummary> {
  return rbacClient.updateRole(getRequiredAdminToken(), code, body);
}

export function setOpenCoreRoleStatus(
  code: string,
  body: SetRoleStatusRequest,
): Promise<RoleMutationSummary> {
  return rbacClient.setRoleStatus(getRequiredAdminToken(), code, body);
}

export function deleteOpenCoreRole(code: string): Promise<RbacDeleteResult> {
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

export async function listOpenCoreOnlineUsers(
  query?: OnlineUserQueryRequest,
): Promise<OnlineUserSessionSummary[]> {
  const page = await operationsClient.listOnlineUsers(getRequiredAdminToken(), {
    page: 1,
    pageSize: 100,
    ...query,
  });
  return [...page.items];
}

export function getOpenCoreOnlineUser(
  id: string,
): Promise<OnlineUserSessionSummary> {
  return operationsClient.getOnlineUser(getRequiredAdminToken(), id);
}

export function kickOutOpenCoreOnlineUser(
  id: string,
  body: KickOutSessionRequest,
): Promise<OnlineUserSessionSummary> {
  return operationsClient.kickOutSession(getRequiredAdminToken(), id, body);
}

export function kickOutOpenCoreOnlineUsers(
  body: BatchKickOutSessionsRequest,
): Promise<BatchKickOutSessionsResult> {
  return operationsClient.kickOutSessions(getRequiredAdminToken(), body);
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

export function listOpenCoreDictDataOptions(
  query?: DictDataOptionQueryRequest,
): Promise<readonly DictDataOptionSummary[]> {
  return systemManagementClient.listDictDataOptions(
    getRequiredAdminToken(),
    query,
  );
}

export function listOpenCoreDictItems(
  code: string,
): Promise<readonly DictItemSummary[]> {
  return systemManagementClient.listDictItems(getRequiredAdminToken(), code);
}

export function createOpenCoreDictItem(
  code: string,
  body: CreateDictItemRequest,
): Promise<DictItemSummary> {
  return systemManagementClient.createDictItem(
    getRequiredAdminToken(),
    code,
    body,
  );
}

export function updateOpenCoreDictItem(
  code: string,
  itemId: string,
  body: UpdateDictItemRequest,
): Promise<DictItemSummary> {
  return systemManagementClient.updateDictItem(
    getRequiredAdminToken(),
    code,
    itemId,
    body,
  );
}

export function deleteOpenCoreDictItem(
  code: string,
  itemId: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deleteDictItem(
    getRequiredAdminToken(),
    code,
    itemId,
  );
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

export async function listOpenCoreSystemConfig(): Promise<
  SystemConfigSummary[]
> {
  const page = await systemManagementClient.listConfig(
    getRequiredAdminToken(),
    {
      page: 1,
      pageSize: 100,
    },
  );
  return [...page.items];
}

export function getOpenCoreSystemConfig(
  key: string,
): Promise<SystemConfigSummary> {
  return systemManagementClient.getConfig(getRequiredAdminToken(), key);
}

export function getOpenCoreSystemConfigValue(
  key: string,
): Promise<SystemConfigValueSummary> {
  return systemManagementClient.getConfigValueByKey(
    getRequiredAdminToken(),
    key,
  );
}

export function refreshOpenCoreSystemConfigCache(): Promise<SystemConfigCacheRefreshSummary> {
  return systemManagementClient.refreshConfigCache(getRequiredAdminToken());
}

export function createOpenCoreSystemConfig(
  body: CreateSystemConfigRequest,
): Promise<SystemConfigSummary> {
  return systemManagementClient.createConfig(getRequiredAdminToken(), body);
}

export function updateOpenCoreSystemConfig(
  key: string,
  body: UpdateSystemConfigRequest,
): Promise<SystemConfigSummary> {
  return systemManagementClient.updateConfig(
    getRequiredAdminToken(),
    key,
    body,
  );
}

export function deleteOpenCoreSystemConfig(
  key: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deleteConfig(getRequiredAdminToken(), key);
}

export async function listOpenCoreFiles(): Promise<FileAssetSummary[]> {
  const page = await systemManagementClient.listFiles(getRequiredAdminToken(), {
    page: 1,
    pageSize: 100,
  });
  return [...page.items];
}

export function getOpenCoreFile(id: string): Promise<FileAssetSummary> {
  return systemManagementClient.getFile(getRequiredAdminToken(), id);
}

export function createOpenCoreFile(
  body: CreateFileAssetRequest,
): Promise<FileAssetSummary> {
  return systemManagementClient.createFileAsset(getRequiredAdminToken(), body);
}

export function uploadOpenCoreFile(
  body: UploadFileAssetRequest,
): Promise<FileAssetSummary> {
  return systemManagementClient.uploadFileAsset(getRequiredAdminToken(), body);
}

export type DownloadedOpenCoreFile = {
  blob: Blob;
  filename?: string;
};

export async function downloadOpenCoreFile(
  id: string,
): Promise<DownloadedOpenCoreFile> {
  const response = await fetch(
    `/api${systemManagementClient.getFileDownloadPath(id)}`,
    {
      headers: {
        Authorization: `Bearer ${getRequiredAdminToken()}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to download file ${id}: HTTP ${response.status}`);
  }

  return {
    blob: await response.blob(),
    filename: parseContentDispositionFilename(
      response.headers.get('content-disposition'),
    ),
  };
}

export function updateOpenCoreFile(
  id: string,
  body: UpdateFileAssetRequest,
): Promise<FileAssetSummary> {
  return systemManagementClient.updateFileAsset(
    getRequiredAdminToken(),
    id,
    body,
  );
}

export function deleteOpenCoreFile(id: string): Promise<{ deleted: true }> {
  return systemManagementClient.deleteFile(getRequiredAdminToken(), id);
}

function parseContentDispositionFilename(
  contentDisposition: string | null,
): string | undefined {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition?.match(/filename="([^"]+)"/i);
  return plainMatch?.[1];
}

export async function listOpenCoreLoginLogs(
  query?: LoginLogQueryRequest,
): Promise<LoginLogSummary[]> {
  const page = await systemManagementClient.listLoginLogs(
    getRequiredAdminToken(),
    {
      page: 1,
      pageSize: 100,
      ...query,
    },
  );
  return [...page.items];
}

export function getOpenCoreLoginLog(id: string): Promise<LoginLogSummary> {
  return systemManagementClient.getLoginLog(getRequiredAdminToken(), id);
}

export async function listOpenCoreAuditLogs(
  query?: AuditLogQueryRequest,
): Promise<AuditLogSummary[]> {
  const page = await systemManagementClient.listAuditLogs(
    getRequiredAdminToken(),
    {
      page: 1,
      pageSize: 100,
      ...query,
    },
  );
  return [...page.items];
}

export function getOpenCoreAuditLog(id: string): Promise<AuditLogSummary> {
  return systemManagementClient.getAuditLog(getRequiredAdminToken(), id);
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

export function listOpenCoreSystemDeptOptions(): Promise<
  readonly SystemDeptOptionSummary[]
> {
  return systemManagementClient.listDeptOptions(getRequiredAdminToken());
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

export function listOpenCoreSystemPostOptions(): Promise<
  readonly SystemPostOptionSummary[]
> {
  return systemManagementClient.listPostOptions(getRequiredAdminToken());
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
