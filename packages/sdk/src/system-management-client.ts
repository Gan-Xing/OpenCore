import type { SdkRequest } from './rbac-client';
import type {
  AuditLogSummary,
  CreateDictTypeRequest,
  CreateFileAssetRequest,
  CreateSystemConfigRequest,
  DeleteResult,
  DictTypeSummary,
  ExportPreview,
  FileAssetSummary,
  LoginLogSummary,
  PageRequest,
  PageResponse,
  SystemConfigSummary,
  UpdateDictTypeRequest,
  UpdateFileAssetRequest,
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

function withQuery(path: `/${string}`, query: PageRequest = {}): `/${string}` {
  const params = new URLSearchParams();

  if (query.page !== undefined) {
    params.set('page', String(query.page));
  }

  if (query.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
