import type { SdkRequest } from './rbac-client';
import type {
  AuditLogQueryRequest,
  AuditLogSummary,
  BatchDeleteLoginLogsRequest,
  BatchDeleteSystemConfigsRequest,
  BatchDeleteSystemPostsRequest,
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
  DictDataOptionQueryRequest,
  DictDataOptionSummary,
  DictItemSummary,
  DictTypeSummary,
  ExportPreview,
  FileAssetSummary,
  LoginLogQueryRequest,
  LoginLogBatchMutationSummary,
  LoginLogCleanSummary,
  LoginLogSummary,
  LoginUnlockSummary,
  MarkSystemNoticesReadRequest,
  PageRequest,
  PageResponse,
  RenderSystemNoticeTemplateRequest,
  SystemConfigBatchMutationSummary,
  SystemConfigCacheRefreshSummary,
  SystemConfigRuntimeSummary,
  SystemConfigSummary,
  SystemConfigValueSummary,
  SystemDeptOrderMutationSummary,
  SystemDeptOptionSummary,
  SystemDeptQueryRequest,
  SystemDeptSummary,
  SystemDeptTreeSummary,
  SystemNoticeInboxQueryRequest,
  SystemNoticeInboxSummary,
  SystemNoticeDeliveryQueryRequest,
  SystemNoticeDeliverySummary,
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
  SystemNoticeUnreadCountSummary,
  SystemPostBatchMutationSummary,
  SystemPostOrderMutationSummary,
  SystemPostOptionSummary,
  SystemPostQueryRequest,
  SystemPostSummary,
  UpdateDictItemRequest,
  UpdateDictTypeRequest,
  UpdateFileAssetRequest,
  UnlockLoginUserRequest,
  UploadFileAssetRequest,
  UpdateSystemDeptOrderRequest,
  UpdateSystemDeptRequest,
  UpdateSystemNoticeRequest,
  UpdateSystemNoticeTemplateRequest,
  UpdateSystemPostOrderRequest,
  UpdateSystemPostRequest,
  UpdateSystemConfigRequest,
} from './system-management-types';

type Token = string;

export type SystemManagementClient = {
  listDicts: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<DictTypeSummary>>;
  exportDicts: (token: Token, query?: PageRequest) => Promise<ExportPreview>;
  getDict: (token: Token, code: string) => Promise<DictTypeSummary>;
  listDictDataOptions: (
    token: Token,
    query?: DictDataOptionQueryRequest,
  ) => Promise<readonly DictDataOptionSummary[]>;
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
  listConfig: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<SystemConfigSummary>>;
  exportConfig: (token: Token, query?: PageRequest) => Promise<ExportPreview>;
  getConfig: (token: Token, key: string) => Promise<SystemConfigSummary>;
  getConfigRuntime: () => Promise<SystemConfigRuntimeSummary>;
  getConfigValueByKey: (
    token: Token,
    key: string,
  ) => Promise<SystemConfigValueSummary>;
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
  dispatchNotice: (
    token: Token,
    id: string,
  ) => Promise<SystemNoticeDispatchSummary>;
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
    getConfigRuntime: () =>
      request<SystemConfigRuntimeSummary>('/core/config/runtime'),
    getConfigValueByKey: (token, key) =>
      request<SystemConfigValueSummary>(
        withQuery('/core/config/get-value-by-key', { key }),
        {
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
    dispatchNotice: (token, id) =>
      request<SystemNoticeDispatchSummary>(
        `/core/notices/${encodeURIComponent(id)}/dispatch`,
        {
          method: 'POST',
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
