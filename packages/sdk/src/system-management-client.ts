import type { SdkRequest } from './rbac-client';
import type {
  AuditLogQueryRequest,
  AuditLogSummary,
  CreateDictItemRequest,
  CreateDictTypeRequest,
  CreateFileAssetRequest,
  CreateSystemDeptRequest,
  CreateSystemNoticeRequest,
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
  LoginLogSummary,
  PageRequest,
  PageResponse,
  SystemConfigCacheRefreshSummary,
  SystemConfigSummary,
  SystemConfigValueSummary,
  SystemDeptQueryRequest,
  SystemDeptSummary,
  SystemDeptTreeSummary,
  SystemNoticeQueryRequest,
  SystemNoticeSummary,
  SystemPostOptionSummary,
  SystemPostQueryRequest,
  SystemPostSummary,
  UpdateDictItemRequest,
  UpdateDictTypeRequest,
  UpdateFileAssetRequest,
  UploadFileAssetRequest,
  UpdateSystemDeptRequest,
  UpdateSystemNoticeRequest,
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
  deletePost: (token: Token, code: string) => Promise<DeleteResult>;
  listNotices: (
    token: Token,
    query?: SystemNoticeQueryRequest,
  ) => Promise<PageResponse<SystemNoticeSummary>>;
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
    deletePost: (token, code) =>
      request<DeleteResult>(`/core/posts/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      }),
    listNotices: (token, query) =>
      request<PageResponse<SystemNoticeSummary>>(
        withQuery('/core/notices', query),
        {
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
