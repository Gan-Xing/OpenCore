import {
  createIntegrationClient,
  createMonitoringClient,
  createOperationsClient,
  createRbacClient,
  createSystemManagementClient,
  createToolingClient,
  type AssignRoleMenusRequest,
  type AssignRoleUsersRequest,
  type AssignUserRolesRequest,
  type AuditLogBatchMutationSummary,
  type AuditLogCleanSummary,
  type AuditLogQueryRequest,
  type AuditLogSummary,
  type BatchDeleteAuditLogsRequest,
  type BatchDeleteLoginLogsRequest,
  type BatchDeleteUsersRequest,
  type BatchDeleteSystemConfigsRequest,
  type BatchDeleteSystemPostsRequest,
  type BatchKickOutSessionsRequest,
  type BatchKickOutSessionsResult,
  type BatchSetUserStatusRequest,
  type BatchUserMutationSummary,
  type CleanAuditLogsRequest,
  type CreateDictItemRequest,
  type CreateDictTypeRequest,
  type CreateFileAssetRequest,
  type CreateMenuRequest,
  type CreatePermissionRequest,
  type CreateRoleRequest,
  type CreateSystemConfigRequest,
  type CreateUserRequest,
  type OpenForgeApplyDryRunRequest,
  type OpenForgeApplyDryRunSummary,
  type OpenForgeDiffSummary,
  type OpenForgeDoctorSummary,
  type OpenForgeManifestListSummary,
  type OpenForgePlanSummary,
  type OpenForgePreflightSummary,
  type OpenForgeRollbackDryRunRequest,
  type OpenForgeRollbackDryRunSummary,
  type OpenForgeSchemaRequest,
  type OpenForgeStatusSummary,
  type ImportUsersRequest,
  type CreateSystemDeptRequest,
  type CreateSystemNoticeFromTemplateRequest,
  type CreateSystemNoticeRequest,
  type CreateSystemNoticeTemplateRequest,
  type CreateSystemPostRequest,
  type MenuSummary,
  type PermissionSummary,
  type RbacExportPreview,
  type RbacDeleteResult,
  type RenderSystemNoticeTemplateRequest,
  type RotateSystemConfigSecretRequest,
  type RotateSystemConfigVaultKeyRequest,
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
  type ExportPreview,
  type SystemConfigSummary,
  type SystemConfigBatchMutationSummary,
  type SystemConfigCacheRefreshSummary,
  type SystemConfigEnvironmentOverrideSummary,
  type SystemConfigSecretVersionSummary,
  type SystemConfigVaultKeyRotationSummary,
  type SystemConfigVaultStatusSummary,
  type SystemConfigValueSummary,
  type SystemDeptOptionSummary,
  type SystemDeptOrderMutationSummary,
  type SystemDeptQueryRequest,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
  type FileAssetSummary,
  type FailOutboxMessageRequest,
  type IntegrationProviderHealthAuditSummary,
  type IntegrationOutboxSummary,
  type IntegrationOutboxProcessResult,
  type IntegrationOutboxScheduleResult,
  type JobDefinitionSummary,
  type JobQueryRequest,
  type JobRegistryEntrySummary,
  type JobRunLogSummary,
  type JobRunQueryRequest,
  type LoginLogQueryRequest,
  type LoginLogBatchMutationSummary,
  type LoginLogCleanSummary,
  type LoginLogSummary,
  type LoginUnlockSummary,
  type MarkSystemNoticesReadRequest,
  type KickOutSessionRequest,
  type ListUsersRequest,
  type OnlineUserQueryRequest,
  type OnlineUserSessionSummary,
  type OperationsSummary,
  type SystemNoticeQueryRequest,
  type SystemNoticeInboxQueryRequest,
  type SystemNoticeInboxSummary,
  type SystemNoticeDeliveryQueryRequest,
  type SystemNoticeDeliveryChannel,
  type SystemNoticeDeliveryExecutionSummary,
  type SystemNoticeDeliverySummary,
  type SystemNoticeDispatchSummary,
  type SystemNoticeReadMutationSummary,
  type SystemNoticeReadUserSummary,
  type SystemNoticeReadUsersQueryRequest,
  type SystemNoticeSummary,
  type SystemNoticeTemplateOptionSummary,
  type SystemNoticeTemplateQueryRequest,
  type SystemNoticeTemplateRenderSummary,
  type SystemNoticeTemplateSummary,
  type SystemNoticeUnreadCountSummary,
  type SystemPostBatchMutationSummary,
  type SystemPostOptionSummary,
  type SystemPostOrderMutationSummary,
  type SystemPostQueryRequest,
  type SystemPostSummary,
  type ResetUserPasswordRequest,
  type ScheduleOutboxRequest,
  type SetUserStatusRequest,
  type TriggerJobRequest,
  type UpdateSystemDeptRequest,
  type UpdateSystemDeptOrderRequest,
  type UpdateDictItemRequest,
  type UpdateDictTypeRequest,
  type UpdateFileAssetRequest,
  type UpdateSystemConfigRequest,
  type UpsertSystemConfigEnvironmentOverrideRequest,
  type UpdateSystemNoticeRequest,
  type UpdateSystemNoticeTemplateRequest,
  type UpdateSystemPostOrderRequest,
  type UpdateSystemPostRequest,
  type UploadFileAssetRequest,
  type UpdateMenuRequest,
  type UpdatePermissionRequest,
  type UpdateRoleRequest,
  type UserSummary,
  type UserOptionSummary,
  type UserMutationSummary,
  type UserRoleAssignmentSummary,
  type UpdateUserRequest,
  type UserImportResultSummary,
  type UserImportTemplateSummary,
} from '@opencore/sdk';
import { getRequiredAdminToken, opencoreSdkRequest } from './client';

const rbacClient = createRbacClient(opencoreSdkRequest);
const integrationClient = createIntegrationClient(opencoreSdkRequest);
const monitoringClient = createMonitoringClient(opencoreSdkRequest);
const operationsClient = createOperationsClient(opencoreSdkRequest);
const systemManagementClient = createSystemManagementClient(opencoreSdkRequest);
const toolingClient = createToolingClient(opencoreSdkRequest);

export function getOpenCoreOpenForgeStatus(): Promise<OpenForgeStatusSummary> {
  return toolingClient.getOpenForgeStatus(getRequiredAdminToken());
}

export function getOpenCoreOpenForgeDoctor(): Promise<OpenForgeDoctorSummary> {
  return toolingClient.getOpenForgeDoctor(getRequiredAdminToken());
}

export function createOpenCoreOpenForgePlan(
  body: OpenForgeSchemaRequest,
): Promise<OpenForgePlanSummary> {
  return toolingClient.createOpenForgePlan(getRequiredAdminToken(), body);
}

export function createOpenCoreOpenForgeDiff(
  body: OpenForgeSchemaRequest,
): Promise<OpenForgeDiffSummary> {
  return toolingClient.createOpenForgeDiff(getRequiredAdminToken(), body);
}

export function createOpenCoreOpenForgePreflight(
  body: OpenForgeSchemaRequest,
): Promise<OpenForgePreflightSummary> {
  return toolingClient.createOpenForgePreflight(getRequiredAdminToken(), body);
}

export function createOpenCoreOpenForgeApplyDryRun(
  body: OpenForgeApplyDryRunRequest,
): Promise<OpenForgeApplyDryRunSummary> {
  return toolingClient.createOpenForgeApplyDryRun(
    getRequiredAdminToken(),
    body,
  );
}

export function listOpenCoreOpenForgeManifests(): Promise<OpenForgeManifestListSummary> {
  return toolingClient.listOpenForgeManifests(getRequiredAdminToken());
}

export function createOpenCoreOpenForgeRollbackDryRun(
  body: OpenForgeRollbackDryRunRequest,
): Promise<OpenForgeRollbackDryRunSummary> {
  return toolingClient.createOpenForgeRollbackDryRun(
    getRequiredAdminToken(),
    body,
  );
}

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

export function getOpenCoreUserRoleAssignment(
  id: string,
): Promise<UserRoleAssignmentSummary> {
  return rbacClient.getUserRoleAssignment(getRequiredAdminToken(), id);
}

export function assignOpenCoreUserRoles(
  id: string,
  body: AssignUserRolesRequest,
): Promise<UserRoleAssignmentSummary> {
  return rbacClient.assignUserRoles(getRequiredAdminToken(), id, body);
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

export function setOpenCoreUsersStatus(
  body: BatchSetUserStatusRequest,
): Promise<BatchUserMutationSummary> {
  return rbacClient.setUsersStatus(getRequiredAdminToken(), body);
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

export function deleteOpenCoreUsers(
  body: BatchDeleteUsersRequest,
): Promise<BatchUserMutationSummary> {
  return rbacClient.deleteUsers(getRequiredAdminToken(), body);
}

export function getOpenCoreUserImportTemplate(): Promise<UserImportTemplateSummary> {
  return rbacClient.getUserImportTemplate(getRequiredAdminToken());
}

export function exportOpenCoreUsers(
  query?: ListUsersRequest,
): Promise<RbacExportPreview> {
  return rbacClient.exportUsers(getRequiredAdminToken(), query);
}

export function importOpenCoreUsers(
  body: ImportUsersRequest,
): Promise<UserImportResultSummary> {
  return rbacClient.importUsers(getRequiredAdminToken(), body);
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

export function getOpenCoreOperationsSummary(): Promise<OperationsSummary> {
  return operationsClient.getSummary(getRequiredAdminToken());
}

export async function listOpenCoreJobs(
  query?: JobQueryRequest,
): Promise<JobDefinitionSummary[]> {
  const page = await operationsClient.listJobs(getRequiredAdminToken(), {
    page: 1,
    pageSize: 100,
    ...query,
  });
  return [...page.items];
}

export function listOpenCoreJobRegistry(): Promise<
  readonly JobRegistryEntrySummary[]
> {
  return operationsClient.listJobRegistry(getRequiredAdminToken());
}

export function getOpenCoreJob(code: string): Promise<JobDefinitionSummary> {
  return operationsClient.getJob(getRequiredAdminToken(), code);
}

export function enableOpenCoreJob(code: string): Promise<JobDefinitionSummary> {
  return operationsClient.enableJob(getRequiredAdminToken(), code);
}

export function disableOpenCoreJob(
  code: string,
): Promise<JobDefinitionSummary> {
  return operationsClient.disableJob(getRequiredAdminToken(), code);
}

export function triggerOpenCoreJob(
  code: string,
  body: TriggerJobRequest,
): Promise<JobRunLogSummary> {
  return operationsClient.triggerJob(getRequiredAdminToken(), code, body);
}

export async function listOpenCoreJobRuns(
  code: string,
  query?: JobRunQueryRequest,
): Promise<JobRunLogSummary[]> {
  const page = await operationsClient.listJobRuns(
    getRequiredAdminToken(),
    code,
    {
      page: 1,
      pageSize: 20,
      ...query,
    },
  );
  return [...page.items];
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

export function exportOpenCoreSystemConfig(): Promise<ExportPreview> {
  return systemManagementClient.exportConfig(getRequiredAdminToken(), {
    page: 1,
    pageSize: 100,
  });
}

export function getOpenCoreSystemConfig(
  key: string,
): Promise<SystemConfigSummary> {
  return systemManagementClient.getConfig(getRequiredAdminToken(), key);
}

export function getOpenCoreSystemConfigValue(
  key: string,
  environment?: string,
): Promise<SystemConfigValueSummary> {
  return systemManagementClient.getConfigValueByKey(
    getRequiredAdminToken(),
    key,
    environment,
  );
}

export function listOpenCoreSystemConfigEnvironmentOverrides(
  key: string,
): Promise<readonly SystemConfigEnvironmentOverrideSummary[]> {
  return systemManagementClient.listConfigEnvironmentOverrides(
    getRequiredAdminToken(),
    key,
  );
}

export function upsertOpenCoreSystemConfigEnvironmentOverride(
  key: string,
  environment: string,
  body: UpsertSystemConfigEnvironmentOverrideRequest,
): Promise<SystemConfigEnvironmentOverrideSummary> {
  return systemManagementClient.upsertConfigEnvironmentOverride(
    getRequiredAdminToken(),
    key,
    environment,
    body,
  );
}

export function deleteOpenCoreSystemConfigEnvironmentOverride(
  key: string,
  environment: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deleteConfigEnvironmentOverride(
    getRequiredAdminToken(),
    key,
    environment,
  );
}

export function listOpenCoreSystemConfigSecretVersions(
  key: string,
): Promise<readonly SystemConfigSecretVersionSummary[]> {
  return systemManagementClient.listConfigSecretVersions(
    getRequiredAdminToken(),
    key,
  );
}

export function rotateOpenCoreSystemConfigSecret(
  key: string,
  body: RotateSystemConfigSecretRequest,
): Promise<SystemConfigSecretVersionSummary> {
  return systemManagementClient.rotateConfigSecret(
    getRequiredAdminToken(),
    key,
    body,
  );
}

export function getOpenCoreSystemConfigVaultStatus(): Promise<SystemConfigVaultStatusSummary> {
  return systemManagementClient.getConfigVaultStatus(getRequiredAdminToken());
}

export function rotateOpenCoreSystemConfigVaultKey(
  body: RotateSystemConfigVaultKeyRequest,
): Promise<SystemConfigVaultKeyRotationSummary> {
  return systemManagementClient.rotateConfigVaultKey(
    getRequiredAdminToken(),
    body,
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

export function deleteOpenCoreSystemConfigs(
  body: BatchDeleteSystemConfigsRequest,
): Promise<SystemConfigBatchMutationSummary> {
  return systemManagementClient.deleteConfigs(getRequiredAdminToken(), body);
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

export function deleteOpenCoreLoginLogs(
  body: BatchDeleteLoginLogsRequest,
): Promise<LoginLogBatchMutationSummary> {
  return systemManagementClient.deleteLoginLogs(getRequiredAdminToken(), body);
}

export function cleanOpenCoreLoginLogs(): Promise<LoginLogCleanSummary> {
  return systemManagementClient.cleanLoginLogs(getRequiredAdminToken());
}

export function unlockOpenCoreLoginUser(
  username: string,
): Promise<LoginUnlockSummary> {
  return systemManagementClient.unlockLoginUser(getRequiredAdminToken(), {
    username,
  });
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

export function deleteOpenCoreAuditLogs(
  body: BatchDeleteAuditLogsRequest,
): Promise<AuditLogBatchMutationSummary> {
  return systemManagementClient.deleteAuditLogs(getRequiredAdminToken(), body);
}

export function cleanOpenCoreAuditLogs(
  query?: CleanAuditLogsRequest,
): Promise<AuditLogCleanSummary> {
  return systemManagementClient.cleanAuditLogs(getRequiredAdminToken(), query);
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

export function updateOpenCoreSystemDeptOrder(
  body: UpdateSystemDeptOrderRequest,
): Promise<SystemDeptOrderMutationSummary> {
  return systemManagementClient.updateDeptOrder(getRequiredAdminToken(), body);
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

export function updateOpenCoreSystemPostOrder(
  body: UpdateSystemPostOrderRequest,
): Promise<SystemPostOrderMutationSummary> {
  return systemManagementClient.updatePostOrder(getRequiredAdminToken(), body);
}

export function deleteOpenCoreSystemPost(
  code: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deletePost(getRequiredAdminToken(), code);
}

export function deleteOpenCoreSystemPosts(
  body: BatchDeleteSystemPostsRequest,
): Promise<SystemPostBatchMutationSummary> {
  return systemManagementClient.deletePosts(getRequiredAdminToken(), body);
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

export async function listOpenCoreSystemNoticeInbox(
  query?: SystemNoticeInboxQueryRequest,
): Promise<SystemNoticeInboxSummary[]> {
  const page = await systemManagementClient.listNoticeInbox(
    getRequiredAdminToken(),
    query,
  );
  return [...page.items];
}

export function getOpenCoreSystemNoticeInboxItem(
  id: string,
): Promise<SystemNoticeInboxSummary> {
  return systemManagementClient.getNoticeInboxItem(getRequiredAdminToken(), id);
}

export function listOpenCoreUnreadSystemNotices(
  limit?: number,
): Promise<readonly SystemNoticeInboxSummary[]> {
  return systemManagementClient.listUnreadNotices(
    getRequiredAdminToken(),
    limit,
  );
}

export function getOpenCoreSystemNoticeUnreadCount(): Promise<SystemNoticeUnreadCountSummary> {
  return systemManagementClient.getNoticeUnreadCount(getRequiredAdminToken());
}

export function getOpenCoreSystemNoticeInboxEventsPath(): string {
  return systemManagementClient.getNoticeInboxEventsPath();
}

export function markOpenCoreSystemNoticesRead(
  body: MarkSystemNoticesReadRequest,
): Promise<SystemNoticeReadMutationSummary> {
  return systemManagementClient.markNoticesRead(getRequiredAdminToken(), body);
}

export function markAllOpenCoreSystemNoticesRead(): Promise<SystemNoticeReadMutationSummary> {
  return systemManagementClient.markAllNoticesRead(getRequiredAdminToken());
}

export async function listOpenCoreSystemNoticeReadUsers(
  id: string,
  query?: SystemNoticeReadUsersQueryRequest,
): Promise<SystemNoticeReadUserSummary[]> {
  const page = await systemManagementClient.listNoticeReadUsers(
    getRequiredAdminToken(),
    id,
    query,
  );
  return [...page.items];
}

export async function listOpenCoreSystemNoticeDeliveries(
  id: string,
  query?: SystemNoticeDeliveryQueryRequest,
): Promise<SystemNoticeDeliverySummary[]> {
  const page = await systemManagementClient.listNoticeDeliveries(
    getRequiredAdminToken(),
    id,
    query,
  );
  return [...page.items];
}

export function dispatchOpenCoreSystemNotice(
  id: string,
  channel: SystemNoticeDeliveryChannel = 'in_app',
): Promise<SystemNoticeDispatchSummary> {
  return systemManagementClient.dispatchNotice(getRequiredAdminToken(), id, {
    channel,
  });
}

export function executeOpenCoreSystemNoticeDeliveries(
  id: string,
  channel: SystemNoticeDeliveryChannel = 'in_app',
): Promise<SystemNoticeDeliveryExecutionSummary> {
  return systemManagementClient.executeNoticeDeliveries(
    getRequiredAdminToken(),
    id,
    { channel },
  );
}

type IntegrationOutboxChannel = 'mail' | 'sms';

export function markOpenCoreIntegrationOutboxFailed(
  channel: IntegrationOutboxChannel,
  id: string,
  body: FailOutboxMessageRequest,
): Promise<IntegrationOutboxSummary> {
  return channel === 'mail'
    ? integrationClient.markMailOutboxFailed(getRequiredAdminToken(), id, body)
    : integrationClient.markSmsOutboxFailed(getRequiredAdminToken(), id, body);
}

export function retryOpenCoreIntegrationOutbox(
  channel: IntegrationOutboxChannel,
  id: string,
): Promise<IntegrationOutboxSummary> {
  return channel === 'mail'
    ? integrationClient.retryMailOutbox(getRequiredAdminToken(), id)
    : integrationClient.retrySmsOutbox(getRequiredAdminToken(), id);
}

export function markOpenCoreIntegrationOutboxSent(
  channel: IntegrationOutboxChannel,
  id: string,
): Promise<IntegrationOutboxSummary> {
  return channel === 'mail'
    ? integrationClient.markMailOutboxSent(getRequiredAdminToken(), id)
    : integrationClient.markSmsOutboxSent(getRequiredAdminToken(), id);
}

export function processOpenCoreIntegrationOutbox(
  channel: IntegrationOutboxChannel,
  body?: { providerCode?: string; limit?: number },
): Promise<IntegrationOutboxProcessResult> {
  return channel === 'mail'
    ? integrationClient.processMailOutbox(getRequiredAdminToken(), body)
    : integrationClient.processSmsOutbox(getRequiredAdminToken(), body);
}

export function runOpenCoreIntegrationOutboxSchedule(
  body?: ScheduleOutboxRequest,
): Promise<IntegrationOutboxScheduleResult> {
  return integrationClient.runOutboxSchedule(getRequiredAdminToken(), body);
}

export function getOpenCoreIntegrationProviderHealthAudit(): Promise<IntegrationProviderHealthAuditSummary> {
  return integrationClient.getProviderHealthAudit(getRequiredAdminToken());
}

export async function listOpenCoreSystemNoticeTemplates(
  query?: SystemNoticeTemplateQueryRequest,
): Promise<SystemNoticeTemplateSummary[]> {
  const page = await systemManagementClient.listNoticeTemplates(
    getRequiredAdminToken(),
    query,
  );
  return [...page.items];
}

export function listOpenCoreSystemNoticeTemplateOptions(): Promise<
  readonly SystemNoticeTemplateOptionSummary[]
> {
  return systemManagementClient.listNoticeTemplateOptions(
    getRequiredAdminToken(),
  );
}

export function getOpenCoreSystemNoticeTemplate(
  code: string,
): Promise<SystemNoticeTemplateSummary> {
  return systemManagementClient.getNoticeTemplate(
    getRequiredAdminToken(),
    code,
  );
}

export function renderOpenCoreSystemNoticeTemplate(
  code: string,
  body: RenderSystemNoticeTemplateRequest,
): Promise<SystemNoticeTemplateRenderSummary> {
  return systemManagementClient.renderNoticeTemplate(
    getRequiredAdminToken(),
    code,
    body,
  );
}

export function createOpenCoreSystemNoticeFromTemplate(
  code: string,
  body: CreateSystemNoticeFromTemplateRequest,
): Promise<SystemNoticeSummary> {
  return systemManagementClient.createNoticeFromTemplate(
    getRequiredAdminToken(),
    code,
    body,
  );
}

export function createOpenCoreSystemNoticeTemplate(
  body: CreateSystemNoticeTemplateRequest,
): Promise<SystemNoticeTemplateSummary> {
  return systemManagementClient.createNoticeTemplate(
    getRequiredAdminToken(),
    body,
  );
}

export function updateOpenCoreSystemNoticeTemplate(
  code: string,
  body: UpdateSystemNoticeTemplateRequest,
): Promise<SystemNoticeTemplateSummary> {
  return systemManagementClient.updateNoticeTemplate(
    getRequiredAdminToken(),
    code,
    body,
  );
}

export function deleteOpenCoreSystemNoticeTemplate(
  code: string,
): Promise<{ deleted: true }> {
  return systemManagementClient.deleteNoticeTemplate(
    getRequiredAdminToken(),
    code,
  );
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
