import type { SdkRequest } from './rbac-client';
import type {
  AuditLogSummary,
  CreateDictTypeRequest,
  CreateFileAssetRequest,
  CreateSystemNoticeRequest,
  CreateSystemConfigRequest,
  DeleteResult,
  DictTypeSummary,
  ExportPreview,
  FileAssetSummary,
  LoginLogSummary,
  PageRequest,
  PageResponse,
  SystemConfigSummary,
  SystemNoticeQueryRequest,
  SystemNoticeSummary,
  UpdateDictTypeRequest,
  UpdateFileAssetRequest,
  UpdateSystemNoticeRequest,
  UpdateSystemConfigRequest,
} from './system-management-types';

type Token = string;

export type SystemManagementClient = {
  listDicts: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<DictTypeSummary>>;
  exportDicts: (token: Token, query?: PageRequest) => Promise<ExportPreview>;
  createDict: (
    token: Token,
    body: CreateDictTypeRequest,
  ) => Promise<DictTypeSummary>;
  updateDict: (
    token: Token,
    code: string,
    body: UpdateDictTypeRequest,
  ) => Promise<DictTypeSummary>;
  deleteDict: (token: Token, code: string) => Promise<DeleteResult>;
  listConfig: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<SystemConfigSummary>>;
  exportConfig: (token: Token, query?: PageRequest) => Promise<ExportPreview>;
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
  createFileAsset: (
    token: Token,
    body: CreateFileAssetRequest,
  ) => Promise<FileAssetSummary>;
  updateFileAsset: (
    token: Token,
    id: string,
    body: UpdateFileAssetRequest,
  ) => Promise<FileAssetSummary>;
  deleteFile: (token: Token, id: string) => Promise<DeleteResult>;
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
    query?: PageRequest,
  ) => Promise<PageResponse<AuditLogSummary>>;
  exportAuditLogs: (
    token: Token,
    query?: PageRequest,
  ) => Promise<ExportPreview>;
  listLoginLogs: (
    token: Token,
    query?: PageRequest,
  ) => Promise<PageResponse<LoginLogSummary>>;
  exportLoginLogs: (
    token: Token,
    query?: PageRequest,
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
    createDict: (token, body) =>
      request<DictTypeSummary>('/core/dicts', {
        method: 'POST',
        body,
        token,
      }),
    updateDict: (token, code, body) =>
      request<DictTypeSummary>(`/core/dicts/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body,
        token,
      }),
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
    createFileAsset: (token, body) =>
      request<FileAssetSummary>('/core/files', {
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
