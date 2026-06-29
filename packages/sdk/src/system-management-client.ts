import type { SdkRequest } from './rbac-client';
import type {
  AuditLogQueryRequest,
  AuditLogBatchMutationSummary,
  AuditLogCleanSummary,
  AuditLogSummary,
  BatchDeleteAuditLogsRequest,
  BatchDeleteDictItemsRequest,
  BatchDeleteDictTypesRequest,
  BatchDeleteLoginLogsRequest,
  BatchDeleteSystemConfigsRequest,
  BatchDeleteSystemPostsRequest,
  BatchUpdateDictItemStatusRequest,
  BatchUpdateDictStatusRequest,
  CleanAuditLogsRequest,
  CreateDictItemRequest,
  CreateDictTypeRequest,
  CreateFileAssetRequest,
  CreateSystemDeptRequest,
  CreateSystemNoticeFromTemplateRequest,
  CreateSystemNoticeRequest,
  CreateSystemNoticeTemplateRequest,
  CreateSystemPostRequest,
  CreateSystemConfigRequest,
  DeleteResult,
  DictBatchMutationSummary,
  DictCacheRefreshSummary,
  DictDataOptionQueryRequest,
  DictDataOptionSummary,
  DictDeleteMutationSummary,
  DictImportResultSummary,
  DictImportTemplateSummary,
  DictItemBatchMutationSummary,
  DictItemDeleteMutationSummary,
  DictItemQueryRequest,
  DictItemSummary,
  DictTranslationResultSummary,
  DictTypeQueryRequest,
  DictTypeSummary,
  ExportPreview,
  FileAssetSummary,
  IpLocationLookupRequest,
  IpLocationLookupSummary,
  IpLocationProviderStatusSummary,
  ImportDictsRequest,
  LoginLogQueryRequest,
  LoginLogBatchMutationSummary,
  LoginLogCleanSummary,
  LoginLogSummary,
  LoginUnlockSummary,
  MarkSystemNoticesReadRequest,
  PageRequest,
  PageResponse,
  RenderSystemNoticeTemplateRequest,
  RotateSystemConfigSecretRequest,
  RotateSystemConfigVaultKeyRequest,
  SystemConfigBatchMutationSummary,
  SystemConfigCacheRefreshSummary,
  SystemConfigEnvironmentOverrideSummary,
  SystemConfigFeatureFlagEvaluationSummary,
  SystemConfigRuntimeSummary,
  SystemConfigSecretVersionSummary,
  SystemConfigSummary,
  SystemConfigVaultKeyRotationSummary,
  SystemConfigVaultStatusSummary,
  SystemConfigValueSummary,
  SystemDeptOrderMutationSummary,
  SystemDeptOptionSummary,
  SystemDeptQueryRequest,
  SystemDeptSummary,
  SystemDeptTreeSummary,
  SystemNoticeInboxQueryRequest,
  SystemNoticeInboxSummary,
  SystemNoticeDeliveryExecutionRequest,
  SystemNoticeDeliveryExecutionSummary,
  SystemNoticeDeliveryQueryRequest,
  SystemNoticeDeliverySummary,
  SystemNoticeDispatchRequest,
  SystemNoticeDispatchSummary,
  SystemNoticeQueryRequest,
  SystemNoticeReadMutationSummary,
  SystemNoticeReadUserSummary,
  SystemNoticeReadUsersQueryRequest,
  SystemNoticeSummary,
  SystemNoticeTemplateOptionSummary,
  SystemNoticeTemplateQueryRequest,
  SystemNoticeTemplateRenderSummary,
  SystemNoticeTemplateSummary,
  SystemNoticeTemplateTestSendSummary,
  SystemNoticeUnreadCountSummary,
  SystemPostBatchMutationSummary,
  SystemPostOrderMutationSummary,
  SystemPostOptionSummary,
  SystemPostQueryRequest,
  SystemPostSummary,
  TranslateDictValuesRequest,
  UpdateDictItemRequest,
  UpdateDictTypeRequest,
  UpdateFileAssetRequest,
  UnlockLoginUserRequest,
  UploadFileAssetRequest,
  TestSystemNoticeTemplateRequest,
  UpdateSystemDeptOrderRequest,
  UpdateSystemDeptRequest,
  UpdateSystemNoticeRequest,
  UpdateSystemNoticeTemplateRequest,
  UpdateSystemPostOrderRequest,
  UpdateSystemPostRequest,
  UpdateSystemConfigRequest,
  UpsertSystemConfigEnvironmentOverrideRequest,
} from './system-management-types';

type Token = string;

export type SystemManagementClient = {
  listDicts: (
    token: Token,
    query?: DictTypeQueryRequest,
  ) => Promise<PageResponse<DictTypeSummary>>;
  exportDicts: (
    token: Token,
    query?: DictTypeQueryRequest,
  ) => Promise<ExportPreview>;
  listDeletedDicts: (
    token: Token,
    query?: DictTypeQueryRequest,
  ) => Promise<PageResponse<DictTypeSummary>>;
  getDictImportTemplate: (token: Token) => Promise<DictImportTemplateSummary>;
  previewImportDicts: (
    token: Token,
    body: ImportDictsRequest,
  ) => Promise<DictImportResultSummary>;
  importDicts: (
    token: Token,
    body: ImportDictsRequest,
  ) => Promise<DictImportResultSummary>;
  getDict: (token: Token, code: string) => Promise<DictTypeSummary>;
  listDictDataOptions: (
    token: Token,
    query?: DictDataOptionQueryRequest,
  ) => Promise<readonly DictDataOptionSummary[]>;
  listDictItemsPage: (
    token: Token,
    query?: DictItemQueryRequest,
  ) => Promise<PageResponse<DictItemSummary>>;
  exportDictItems: (
    token: Token,
    query?: DictItemQueryRequest,
  ) => Promise<ExportPreview>;
  listDeletedDictItemsPage: (
    token: Token,
    query?: DictItemQueryRequest,
  ) => Promise<PageResponse<DictItemSummary>>;
  listDictItems: (
    token: Token,
    code: string,
  ) => Promise<readonly DictItemSummary[]>;
  getDictItem: (
    token: Token,
    code: string,
    itemId: string,
  ) => Promise<DictItemSummary>;
  createDict: (
    token: Token,
    body: CreateDictTypeRequest,
  ) => Promise<DictTypeSummary>;
  createDictItem: (
    token: Token,
    code: string,
    body: CreateDictItemRequest,
  ) => Promise<DictItemSummary>;
  updateDict: (
    token: Token,
    code: string,
    body: UpdateDictTypeRequest,
  ) => Promise<DictTypeSummary>;
  updateDictItem: (
    token: Token,
    code: string,
    itemId: string,
    body: UpdateDictItemRequest,
  ) => Promise<DictItemSummary>;
  deleteDictItem: (
    token: Token,
    code: string,
    itemId: string,
  ) => Promise<DeleteResult>;
  deleteDict: (token: Token, code: string) => Promise<DeleteResult>;
  restoreDict: (token: Token, code: string) => Promise<DictTypeSummary>;
  restoreDictItem: (token: Token, itemId: string) => Promise<DictItemSummary>;
  hardDeleteDict: (token: Token, code: string) => Promise<DeleteResult>;
  hardDeleteDictItem: (token: Token, itemId: string) => Promise<DeleteResult>;
  deleteDicts: (
    token: Token,
    body: BatchDeleteDictTypesRequest,
  ) => Promise<DictDeleteMutationSummary>;
  updateDictStatus: (
    token: Token,
    body: BatchUpdateDictStatusRequest,
  ) => Promise<DictBatchMutationSummary>;
  deleteDictItems: (
    token: Token,
    body: BatchDeleteDictItemsRequest,
  ) => Promise<DictItemDeleteMutationSummary>;
  updateDictItemStatus: (
    token: Token,
    body: BatchUpdateDictItemStatusRequest,
  ) => Promise<DictItemBatchMutationSummary>;
  refreshDictCache: (token: Token) => Promise<DictCacheRefreshSummary>;
  translateDictValues: (
    token: Token,
    body: TranslateDictValuesRequest,
  ) => Promise<DictTranslationResultSummary>;
  listConfig: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<SystemConfigSummary>>;
  exportConfig: (token: Token, query?: PageRequest) => Promise<ExportPreview>;
  getConfig: (token: Token, key: string) => Promise<SystemConfigSummary>;
  getConfigRuntime: (
    environment?: string,
  ) => Promise<SystemConfigRuntimeSummary>;
  evaluateFeatureFlag: (
    flag: string,
    subjectKey: string,
    attributes?: Record<string, boolean | number | string>,
    environment?: string,
  ) => Promise<SystemConfigFeatureFlagEvaluationSummary>;
  getConfigValueByKey: (
    token: Token,
    key: string,
    environment?: string,
  ) => Promise<SystemConfigValueSummary>;
  listConfigEnvironmentOverrides: (
    token: Token,
    key: string,
  ) => Promise<readonly SystemConfigEnvironmentOverrideSummary[]>;
  upsertConfigEnvironmentOverride: (
    token: Token,
    key: string,
    environment: string,
    body: UpsertSystemConfigEnvironmentOverrideRequest,
  ) => Promise<SystemConfigEnvironmentOverrideSummary>;
  deleteConfigEnvironmentOverride: (
    token: Token,
    key: string,
    environment: string,
  ) => Promise<DeleteResult>;
  listConfigSecretVersions: (
    token: Token,
    key: string,
  ) => Promise<readonly SystemConfigSecretVersionSummary[]>;
  rotateConfigSecret: (
    token: Token,
    key: string,
    body: RotateSystemConfigSecretRequest,
  ) => Promise<SystemConfigSecretVersionSummary>;
  getConfigVaultStatus: (
    token: Token,
  ) => Promise<SystemConfigVaultStatusSummary>;
  rotateConfigVaultKey: (
    token: Token,
    body: RotateSystemConfigVaultKeyRequest,
  ) => Promise<SystemConfigVaultKeyRotationSummary>;
  refreshConfigCache: (
    token: Token,
  ) => Promise<SystemConfigCacheRefreshSummary>;
  createConfig: (
    token: Token,
    body: CreateSystemConfigRequest,
  ) => Promise<SystemConfigSummary>;
  updateConfig: (
    token: Token,
    key: string,
    body: UpdateSystemConfigRequest,
  ) => Promise<SystemConfigSummary>;
  deleteConfig: (token: Token, key: string) => Promise<DeleteResult>;
  deleteConfigs: (
    token: Token,
    body: BatchDeleteSystemConfigsRequest,
  ) => Promise<SystemConfigBatchMutationSummary>;
  listFiles: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<FileAssetSummary>>;
  exportFiles: (token: Token, query?: PageRequest) => Promise<ExportPreview>;
  getFile: (token: Token, id: string) => Promise<FileAssetSummary>;
  getFileDownloadPath: (id: string) => `/core/files/${string}/download`;
  createFileAsset: (
    token: Token,
    body: CreateFileAssetRequest,
  ) => Promise<FileAssetSummary>;
  uploadFileAsset: (
    token: Token,
    body: UploadFileAssetRequest,
  ) => Promise<FileAssetSummary>;
  updateFileAsset: (
    token: Token,
    id: string,
    body: UpdateFileAssetRequest,
  ) => Promise<FileAssetSummary>;
  deleteFile: (token: Token, id: string) => Promise<DeleteResult>;
  listDepts: (
    token: Token,
    query?: SystemDeptQueryRequest,
  ) => Promise<readonly SystemDeptTreeSummary[]>;
  listDeptOptions: (
    token: Token,
  ) => Promise<readonly SystemDeptOptionSummary[]>;
  getDept: (token: Token, id: string) => Promise<SystemDeptSummary>;
  exportDepts: (
    token: Token,
    query?: SystemDeptQueryRequest,
  ) => Promise<ExportPreview>;
  createDept: (
    token: Token,
    body: CreateSystemDeptRequest,
  ) => Promise<SystemDeptSummary>;
  updateDept: (
    token: Token,
    id: string,
    body: UpdateSystemDeptRequest,
  ) => Promise<SystemDeptSummary>;
  updateDeptOrder: (
    token: Token,
    body: UpdateSystemDeptOrderRequest,
  ) => Promise<SystemDeptOrderMutationSummary>;
  deleteDept: (token: Token, id: string) => Promise<DeleteResult>;
  listPosts: (
    token: Token,
    query?: SystemPostQueryRequest,
  ) => Promise<PageResponse<SystemPostSummary>>;
  listPostOptions: (
    token: Token,
  ) => Promise<readonly SystemPostOptionSummary[]>;
  getPost: (token: Token, code: string) => Promise<SystemPostSummary>;
  exportPosts: (
    token: Token,
    query?: SystemPostQueryRequest,
  ) => Promise<ExportPreview>;
  createPost: (
    token: Token,
    body: CreateSystemPostRequest,
  ) => Promise<SystemPostSummary>;
  updatePost: (
    token: Token,
    code: string,
    body: UpdateSystemPostRequest,
  ) => Promise<SystemPostSummary>;
  updatePostOrder: (
    token: Token,
    body: UpdateSystemPostOrderRequest,
  ) => Promise<SystemPostOrderMutationSummary>;
  deletePost: (token: Token, code: string) => Promise<DeleteResult>;
  deletePosts: (
    token: Token,
    body: BatchDeleteSystemPostsRequest,
  ) => Promise<SystemPostBatchMutationSummary>;
  listNotices: (
    token: Token,
    query?: SystemNoticeQueryRequest,
  ) => Promise<PageResponse<SystemNoticeSummary>>;
  listNoticeInbox: (
    token: Token,
    query?: SystemNoticeInboxQueryRequest,
  ) => Promise<PageResponse<SystemNoticeInboxSummary>>;
  getNoticeInboxItem: (
    token: Token,
    id: string,
  ) => Promise<SystemNoticeInboxSummary>;
  listUnreadNotices: (
    token: Token,
    limit?: number,
  ) => Promise<readonly SystemNoticeInboxSummary[]>;
  getNoticeUnreadCount: (
    token: Token,
  ) => Promise<SystemNoticeUnreadCountSummary>;
  getNoticeInboxEventsPath: () => string;
  markNoticesRead: (
    token: Token,
    body: MarkSystemNoticesReadRequest,
  ) => Promise<SystemNoticeReadMutationSummary>;
  markAllNoticesRead: (
    token: Token,
  ) => Promise<SystemNoticeReadMutationSummary>;
  listNoticeReadUsers: (
    token: Token,
    id: string,
    query?: SystemNoticeReadUsersQueryRequest,
  ) => Promise<PageResponse<SystemNoticeReadUserSummary>>;
  listNoticeDeliveries: (
    token: Token,
    id: string,
    query?: SystemNoticeDeliveryQueryRequest,
  ) => Promise<PageResponse<SystemNoticeDeliverySummary>>;
  listAllNoticeDeliveries: (
    token: Token,
    query?: SystemNoticeDeliveryQueryRequest,
  ) => Promise<PageResponse<SystemNoticeDeliverySummary>>;
  dispatchNotice: (
    token: Token,
    id: string,
    body?: SystemNoticeDispatchRequest,
  ) => Promise<SystemNoticeDispatchSummary>;
  executeNoticeDeliveries: (
    token: Token,
    id: string,
    body?: SystemNoticeDeliveryExecutionRequest,
  ) => Promise<SystemNoticeDeliveryExecutionSummary>;
  listNoticeTemplates: (
    token: Token,
    query?: SystemNoticeTemplateQueryRequest,
  ) => Promise<PageResponse<SystemNoticeTemplateSummary>>;
  listNoticeTemplateOptions: (
    token: Token,
  ) => Promise<readonly SystemNoticeTemplateOptionSummary[]>;
  getNoticeTemplate: (
    token: Token,
    code: string,
  ) => Promise<SystemNoticeTemplateSummary>;
  renderNoticeTemplate: (
    token: Token,
    code: string,
    body: RenderSystemNoticeTemplateRequest,
  ) => Promise<SystemNoticeTemplateRenderSummary>;
  createNoticeFromTemplate: (
    token: Token,
    code: string,
    body: CreateSystemNoticeFromTemplateRequest,
  ) => Promise<SystemNoticeSummary>;
  testSendNoticeTemplate: (
    token: Token,
    code: string,
    body: TestSystemNoticeTemplateRequest,
  ) => Promise<SystemNoticeTemplateTestSendSummary>;
  createNoticeTemplate: (
    token: Token,
    body: CreateSystemNoticeTemplateRequest,
  ) => Promise<SystemNoticeTemplateSummary>;
  updateNoticeTemplate: (
    token: Token,
    code: string,
    body: UpdateSystemNoticeTemplateRequest,
  ) => Promise<SystemNoticeTemplateSummary>;
  deleteNoticeTemplate: (token: Token, code: string) => Promise<DeleteResult>;
  getNotice: (token: Token, id: string) => Promise<SystemNoticeSummary>;
  exportNotices: (
    token: Token,
    query?: SystemNoticeQueryRequest,
  ) => Promise<ExportPreview>;
  createNotice: (
    token: Token,
    body: CreateSystemNoticeRequest,
  ) => Promise<SystemNoticeSummary>;
  updateNotice: (
    token: Token,
    id: string,
    body: UpdateSystemNoticeRequest,
  ) => Promise<SystemNoticeSummary>;
  publishNotice: (token: Token, id: string) => Promise<SystemNoticeSummary>;
  archiveNotice: (token: Token, id: string) => Promise<SystemNoticeSummary>;
  deleteNotice: (token: Token, id: string) => Promise<DeleteResult>;
  listAuditLogs: (
    token: Token,
    query?: AuditLogQueryRequest,
  ) => Promise<PageResponse<AuditLogSummary>>;
  getAuditLog: (token: Token, id: string) => Promise<AuditLogSummary>;
  exportAuditLogs: (
    token: Token,
    query?: AuditLogQueryRequest,
  ) => Promise<ExportPreview>;
  deleteAuditLogs: (
    token: Token,
    body: BatchDeleteAuditLogsRequest,
  ) => Promise<AuditLogBatchMutationSummary>;
  cleanAuditLogs: (
    token: Token,
    query?: CleanAuditLogsRequest,
  ) => Promise<AuditLogCleanSummary>;
  getIpLocationProviderStatus: (
    token: Token,
  ) => Promise<IpLocationProviderStatusSummary>;
  lookupIpLocation: (
    token: Token,
    query: IpLocationLookupRequest,
  ) => Promise<IpLocationLookupSummary>;
  listLoginLogs: (
    token: Token,
    query?: LoginLogQueryRequest,
  ) => Promise<PageResponse<LoginLogSummary>>;
  getLoginLog: (token: Token, id: string) => Promise<LoginLogSummary>;
  exportLoginLogs: (
    token: Token,
    query?: LoginLogQueryRequest,
  ) => Promise<ExportPreview>;
  deleteLoginLogs: (
    token: Token,
    body: BatchDeleteLoginLogsRequest,
  ) => Promise<LoginLogBatchMutationSummary>;
  cleanLoginLogs: (token: Token) => Promise<LoginLogCleanSummary>;
  unlockLoginUser: (
    token: Token,
    body: UnlockLoginUserRequest,
  ) => Promise<LoginUnlockSummary>;
};

export function createSystemManagementClient(
  request: SdkRequest,
): SystemManagementClient {
  return {
    listDicts: (token, query) =>
      request<PageResponse<DictTypeSummary>>(withQuery('/core/dicts', query), {
        token,
      }),
    exportDicts: (token, query) =>
      request<ExportPreview>(withQuery('/core/dicts/export', query), {
        token,
      }),
    listDeletedDicts: (token, query) =>
      request<PageResponse<DictTypeSummary>>(
        withQuery('/core/dicts/recycle-bin', query),
        { token },
      ),
    getDictImportTemplate: (token) =>
      request<DictImportTemplateSummary>('/core/dicts/import-template', {
        token,
      }),
    previewImportDicts: (token, body) =>
      request<DictImportResultSummary>('/core/dicts/import/preview', {
        method: 'POST',
        body,
        token,
      }),
    importDicts: (token, body) =>
      request<DictImportResultSummary>('/core/dicts/import', {
        method: 'POST',
        body,
        token,
      }),
    getDict: (token, code) =>
      request<DictTypeSummary>(`/core/dicts/${encodeURIComponent(code)}`, {
        token,
      }),
    listDictDataOptions: (token, query) =>
      request<readonly DictDataOptionSummary[]>(
        withQuery('/core/dict-data/simple-list', query),
        {
          token,
        },
      ),
    listDictItemsPage: (token, query) =>
      request<PageResponse<DictItemSummary>>(
        withQuery('/core/dict-items', query),
        {
          token,
        },
      ),
    exportDictItems: (token, query) =>
      request<ExportPreview>(withQuery('/core/dict-items/export', query), {
        token,
      }),
    listDeletedDictItemsPage: (token, query) =>
      request<PageResponse<DictItemSummary>>(
        withQuery('/core/dict-items/recycle-bin', query),
        { token },
      ),
    listDictItems: (token, code) =>
      request<readonly DictItemSummary[]>(
        `/core/dicts/${encodeURIComponent(code)}/items`,
        {
          token,
        },
      ),
    getDictItem: (token, code, itemId) =>
      request<DictItemSummary>(
        `/core/dicts/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}`,
        {
          token,
        },
      ),
    createDict: (token, body) =>
      request<DictTypeSummary>('/core/dicts', {
        method: 'POST',
        body,
        token,
      }),
    createDictItem: (token, code, body) =>
      request<DictItemSummary>(
        `/core/dicts/${encodeURIComponent(code)}/items`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    updateDict: (token, code, body) =>
      request<DictTypeSummary>(`/core/dicts/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    updateDictItem: (token, code, itemId, body) =>
      request<DictItemSummary>(
        `/core/dicts/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    deleteDictItem: (token, code, itemId) =>
      request<DeleteResult>(
        `/core/dicts/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}`,
        {
          method: 'DELETE',
          token,
        },
      ),
    deleteDict: (token, code) =>
      request<DeleteResult>(`/core/dicts/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      }),
    restoreDict: (token, code) =>
      request<DictTypeSummary>(
        `/core/dicts/${encodeURIComponent(code)}/restore`,
        {
          method: 'PATCH',
          token,
        },
      ),
    restoreDictItem: (token, itemId) =>
      request<DictItemSummary>(
        `/core/dict-items/${encodeURIComponent(itemId)}/restore`,
        {
          method: 'PATCH',
          token,
        },
      ),
    hardDeleteDict: (token, code) =>
      request<DeleteResult>(`/core/dicts/${encodeURIComponent(code)}/hard`, {
        method: 'DELETE',
        token,
      }),
    hardDeleteDictItem: (token, itemId) =>
      request<DeleteResult>(
        `/core/dict-items/${encodeURIComponent(itemId)}/hard`,
        {
          method: 'DELETE',
          token,
        },
      ),
    deleteDicts: (token, body) =>
      request<DictDeleteMutationSummary>('/core/dicts/batch', {
        method: 'DELETE',
        body,
        token,
      }),
    updateDictStatus: (token, body) =>
      request<DictBatchMutationSummary>('/core/dicts/status', {
        method: 'PATCH',
        body,
        token,
      }),
    deleteDictItems: (token, body) =>
      request<DictItemDeleteMutationSummary>('/core/dict-items/batch', {
        method: 'DELETE',
        body,
        token,
      }),
    updateDictItemStatus: (token, body) =>
      request<DictItemBatchMutationSummary>('/core/dict-items/status', {
        method: 'PATCH',
        body,
        token,
      }),
    refreshDictCache: (token) =>
      request<DictCacheRefreshSummary>('/core/dicts/refresh-cache', {
        method: 'POST',
        token,
      }),
    translateDictValues: (token, body) =>
      request<DictTranslationResultSummary>('/core/dict-data/translate', {
        method: 'POST',
        body,
        token,
      }),
    listConfig: (token, query) =>
      request<PageResponse<SystemConfigSummary>>(
        withQuery('/core/config', query),
        {
          token,
        },
      ),
    exportConfig: (token, query) =>
      request<ExportPreview>(withQuery('/core/config/export', query), {
        token,
      }),
    getConfig: (token, key) =>
      request<SystemConfigSummary>(`/core/config/${encodeURIComponent(key)}`, {
        token,
      }),
    getConfigRuntime: (environment) =>
      request<SystemConfigRuntimeSummary>(
        withQuery('/core/config/runtime', { environment }),
      ),
    evaluateFeatureFlag: (flag, subjectKey, attributes, environment) =>
      request<SystemConfigFeatureFlagEvaluationSummary>(
        withQuery('/core/config/feature-flags/evaluate', {
          attributes:
            attributes === undefined ? undefined : JSON.stringify(attributes),
          environment,
          flag,
          subjectKey,
        }),
      ),
    getConfigValueByKey: (token, key, environment) =>
      request<SystemConfigValueSummary>(
        withQuery('/core/config/get-value-by-key', { environment, key }),
        {
          token,
        },
      ),
    listConfigEnvironmentOverrides: (token, key) =>
      request<readonly SystemConfigEnvironmentOverrideSummary[]>(
        `/core/config/${encodeURIComponent(key)}/environments`,
        { token },
      ),
    upsertConfigEnvironmentOverride: (token, key, environment, body) =>
      request<SystemConfigEnvironmentOverrideSummary>(
        `/core/config/${encodeURIComponent(key)}/environments/${encodeURIComponent(environment)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    deleteConfigEnvironmentOverride: (token, key, environment) =>
      request<DeleteResult>(
        `/core/config/${encodeURIComponent(key)}/environments/${encodeURIComponent(environment)}`,
        {
          method: 'DELETE',
          token,
        },
      ),
    listConfigSecretVersions: (token, key) =>
      request<readonly SystemConfigSecretVersionSummary[]>(
        `/core/config/${encodeURIComponent(key)}/secret-versions`,
        { token },
      ),
    rotateConfigSecret: (token, key, body) =>
      request<SystemConfigSecretVersionSummary>(
        `/core/config/${encodeURIComponent(key)}/rotate-secret`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    getConfigVaultStatus: (token) =>
      request<SystemConfigVaultStatusSummary>('/core/config/vault/status', {
        token,
      }),
    rotateConfigVaultKey: (token, body) =>
      request<SystemConfigVaultKeyRotationSummary>(
        '/core/config/vault/rotate-key',
        {
          method: 'POST',
          body,
          token,
        },
      ),
    refreshConfigCache: (token) =>
      request<SystemConfigCacheRefreshSummary>('/core/config/refresh-cache', {
        method: 'POST',
        token,
      }),
    createConfig: (token, body) =>
      request<SystemConfigSummary>('/core/config', {
        method: 'POST',
        body,
        token,
      }),
    updateConfig: (token, key, body) =>
      request<SystemConfigSummary>(`/core/config/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    deleteConfig: (token, key) =>
      request<DeleteResult>(`/core/config/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        token,
      }),
    deleteConfigs: (token, body) =>
      request<SystemConfigBatchMutationSummary>('/core/config/batch', {
        method: 'DELETE',
        body,
        token,
      }),
    listFiles: (token, query) =>
      request<PageResponse<FileAssetSummary>>(withQuery('/core/files', query), {
        token,
      }),
    exportFiles: (token, query) =>
      request<ExportPreview>(withQuery('/core/files/export', query), {
        token,
      }),
    getFile: (token, id) =>
      request<FileAssetSummary>(`/core/files/${encodeURIComponent(id)}`, {
        token,
      }),
    getFileDownloadPath: (id) =>
      `/core/files/${encodeURIComponent(id)}/download`,
    createFileAsset: (token, body) =>
      request<FileAssetSummary>('/core/files', {
        method: 'POST',
        body,
        token,
      }),
    uploadFileAsset: (token, body) =>
      request<FileAssetSummary>('/core/files/upload', {
        method: 'POST',
        body,
        token,
      }),
    updateFileAsset: (token, id, body) =>
      request<FileAssetSummary>(`/core/files/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    deleteFile: (token, id) =>
      request<DeleteResult>(`/core/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }),
    listDepts: (token, query) =>
      request<readonly SystemDeptTreeSummary[]>(
        withQuery('/core/depts', query),
        {
          token,
        },
      ),
    listDeptOptions: (token) =>
      request<readonly SystemDeptOptionSummary[]>('/core/depts/simple-list', {
        token,
      }),
    getDept: (token, id) =>
      request<SystemDeptSummary>(`/core/depts/${encodeURIComponent(id)}`, {
        token,
      }),
    exportDepts: (token, query) =>
      request<ExportPreview>(withQuery('/core/depts/export', query), {
        token,
      }),
    createDept: (token, body) =>
      request<SystemDeptSummary>('/core/depts', {
        method: 'POST',
        body,
        token,
      }),
    updateDept: (token, id, body) =>
      request<SystemDeptSummary>(`/core/depts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    updateDeptOrder: (token, body) =>
      request<SystemDeptOrderMutationSummary>('/core/depts/order', {
        method: 'PATCH',
        body,
        token,
      }),
    deleteDept: (token, id) =>
      request<DeleteResult>(`/core/depts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }),
    listPosts: (token, query) =>
      request<PageResponse<SystemPostSummary>>(
        withQuery('/core/posts', query),
        {
          token,
        },
      ),
    listPostOptions: (token) =>
      request<readonly SystemPostOptionSummary[]>('/core/posts/simple-list', {
        token,
      }),
    getPost: (token, code) =>
      request<SystemPostSummary>(`/core/posts/${encodeURIComponent(code)}`, {
        token,
      }),
    exportPosts: (token, query) =>
      request<ExportPreview>(withQuery('/core/posts/export', query), {
        token,
      }),
    createPost: (token, body) =>
      request<SystemPostSummary>('/core/posts', {
        method: 'POST',
        body,
        token,
      }),
    updatePost: (token, code, body) =>
      request<SystemPostSummary>(`/core/posts/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    updatePostOrder: (token, body) =>
      request<SystemPostOrderMutationSummary>('/core/posts/order', {
        method: 'PATCH',
        body,
        token,
      }),
    deletePost: (token, code) =>
      request<DeleteResult>(`/core/posts/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      }),
    deletePosts: (token, body) =>
      request<SystemPostBatchMutationSummary>('/core/posts/batch', {
        method: 'DELETE',
        body,
        token,
      }),
    listNotices: (token, query) =>
      request<PageResponse<SystemNoticeSummary>>(
        withQuery('/core/notices', query),
        {
          token,
        },
      ),
    listNoticeInbox: (token, query) =>
      request<PageResponse<SystemNoticeInboxSummary>>(
        withQuery('/core/notices/inbox', query),
        {
          token,
        },
      ),
    getNoticeInboxItem: (token, id) =>
      request<SystemNoticeInboxSummary>(
        `/core/notices/inbox/${encodeURIComponent(id)}`,
        {
          token,
        },
      ),
    listUnreadNotices: (token, limit) =>
      request<readonly SystemNoticeInboxSummary[]>(
        withQuery('/core/notices/inbox/unread-list', { limit }),
        {
          token,
        },
      ),
    getNoticeUnreadCount: (token) =>
      request<SystemNoticeUnreadCountSummary>(
        '/core/notices/inbox/unread-count',
        {
          token,
        },
      ),
    getNoticeInboxEventsPath: () => '/core/notices/inbox/events',
    markNoticesRead: (token, body) =>
      request<SystemNoticeReadMutationSummary>('/core/notices/inbox/read', {
        method: 'POST',
        body,
        token,
      }),
    markAllNoticesRead: (token) =>
      request<SystemNoticeReadMutationSummary>('/core/notices/inbox/read-all', {
        method: 'POST',
        token,
      }),
    listNoticeReadUsers: (token, id, query) =>
      request<PageResponse<SystemNoticeReadUserSummary>>(
        withQuery(`/core/notices/${encodeURIComponent(id)}/read-users`, query),
        {
          token,
        },
      ),
    listNoticeDeliveries: (token, id, query) =>
      request<PageResponse<SystemNoticeDeliverySummary>>(
        withQuery(`/core/notices/${encodeURIComponent(id)}/deliveries`, query),
        {
          token,
        },
      ),
    listAllNoticeDeliveries: (token, query) =>
      request<PageResponse<SystemNoticeDeliverySummary>>(
        withQuery('/core/notices/deliveries', query),
        {
          token,
        },
      ),
    dispatchNotice: (token, id, body = {}) =>
      request<SystemNoticeDispatchSummary>(
        `/core/notices/${encodeURIComponent(id)}/dispatch`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    executeNoticeDeliveries: (token, id, body = {}) =>
      request<SystemNoticeDeliveryExecutionSummary>(
        `/core/notices/${encodeURIComponent(id)}/deliveries/execute`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    listNoticeTemplates: (token, query) =>
      request<PageResponse<SystemNoticeTemplateSummary>>(
        withQuery('/core/notices/templates', query),
        {
          token,
        },
      ),
    listNoticeTemplateOptions: (token) =>
      request<readonly SystemNoticeTemplateOptionSummary[]>(
        '/core/notices/templates/simple-list',
        {
          token,
        },
      ),
    getNoticeTemplate: (token, code) =>
      request<SystemNoticeTemplateSummary>(
        `/core/notices/templates/${encodeURIComponent(code)}`,
        {
          token,
        },
      ),
    renderNoticeTemplate: (token, code, body) =>
      request<SystemNoticeTemplateRenderSummary>(
        `/core/notices/templates/${encodeURIComponent(code)}/render`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    createNoticeFromTemplate: (token, code, body) =>
      request<SystemNoticeSummary>(
        `/core/notices/templates/${encodeURIComponent(code)}/create-notice`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    testSendNoticeTemplate: (token, code, body) =>
      request<SystemNoticeTemplateTestSendSummary>(
        `/core/notices/templates/${encodeURIComponent(code)}/test-send`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    createNoticeTemplate: (token, body) =>
      request<SystemNoticeTemplateSummary>('/core/notices/templates', {
        method: 'POST',
        body,
        token,
      }),
    updateNoticeTemplate: (token, code, body) =>
      request<SystemNoticeTemplateSummary>(
        `/core/notices/templates/${encodeURIComponent(code)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    deleteNoticeTemplate: (token, code) =>
      request<DeleteResult>(
        `/core/notices/templates/${encodeURIComponent(code)}`,
        {
          method: 'DELETE',
          token,
        },
      ),
    getNotice: (token, id) =>
      request<SystemNoticeSummary>(`/core/notices/${encodeURIComponent(id)}`, {
        token,
      }),
    exportNotices: (token, query) =>
      request<ExportPreview>(withQuery('/core/notices/export', query), {
        token,
      }),
    createNotice: (token, body) =>
      request<SystemNoticeSummary>('/core/notices', {
        method: 'POST',
        body,
        token,
      }),
    updateNotice: (token, id, body) =>
      request<SystemNoticeSummary>(`/core/notices/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    publishNotice: (token, id) =>
      request<SystemNoticeSummary>(
        `/core/notices/${encodeURIComponent(id)}/publish`,
        {
          method: 'PATCH',
          token,
        },
      ),
    archiveNotice: (token, id) =>
      request<SystemNoticeSummary>(
        `/core/notices/${encodeURIComponent(id)}/archive`,
        {
          method: 'PATCH',
          token,
        },
      ),
    deleteNotice: (token, id) =>
      request<DeleteResult>(`/core/notices/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }),
    listAuditLogs: (token, query) =>
      request<PageResponse<AuditLogSummary>>(
        withQuery('/core/audit-logs', query),
        {
          token,
        },
      ),
    getAuditLog: (token, id) =>
      request<AuditLogSummary>(`/core/audit-logs/${encodeURIComponent(id)}`, {
        token,
      }),
    exportAuditLogs: (token, query) =>
      request<ExportPreview>(withQuery('/core/audit-logs/export', query), {
        token,
      }),
    deleteAuditLogs: (token, body) =>
      request<AuditLogBatchMutationSummary>('/core/audit-logs/batch', {
        method: 'DELETE',
        body,
        token,
      }),
    cleanAuditLogs: (token, query) =>
      request<AuditLogCleanSummary>(
        withQuery('/core/audit-logs/clean', query),
        {
          method: 'DELETE',
          token,
        },
      ),
    getIpLocationProviderStatus: (token) =>
      request<IpLocationProviderStatusSummary>('/core/ip-location/status', {
        token,
      }),
    lookupIpLocation: (token, query) =>
      request<IpLocationLookupSummary>(
        withQuery('/core/ip-location/lookup', query),
        {
          token,
        },
      ),
    listLoginLogs: (token, query) =>
      request<PageResponse<LoginLogSummary>>(
        withQuery('/core/login-logs', query),
        {
          token,
        },
      ),
    getLoginLog: (token, id) =>
      request<LoginLogSummary>(`/core/login-logs/${encodeURIComponent(id)}`, {
        token,
      }),
    exportLoginLogs: (token, query) =>
      request<ExportPreview>(withQuery('/core/login-logs/export', query), {
        token,
      }),
    deleteLoginLogs: (token, body) =>
      request<LoginLogBatchMutationSummary>('/core/login-logs/batch', {
        method: 'DELETE',
        body,
        token,
      }),
    cleanLoginLogs: (token) =>
      request<LoginLogCleanSummary>('/core/login-logs/clean', {
        method: 'DELETE',
        token,
      }),
    unlockLoginUser: (token, body) =>
      request<LoginUnlockSummary>('/core/login-logs/unlock', {
        method: 'POST',
        body,
        token,
      }),
  };
}

function withQuery(path: `/${string}`, query: object = {}): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
