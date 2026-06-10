export type PageRequest = {
  page?: number;
  pageSize?: number;
};

export type PageResponse<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DeleteResult = {
  deleted: true;
};

export type DictItemSummary = {
  id: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
};

export type DictTypeSummary = {
  id: string;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  items: readonly DictItemSummary[];
};

export type CreateDictTypeRequest = {
  code: string;
  name: string;
  description?: string;
  enabled?: boolean;
  items?: readonly DictItemSummary[];
};

export type UpdateDictTypeRequest = Partial<
  Pick<DictTypeSummary, 'description' | 'enabled' | 'items' | 'name'>
>;

export type SystemConfigSummary = {
  id: string;
  key: string;
  value: string;
  valueType: 'boolean' | 'number' | 'string';
  description?: string;
  public: boolean;
};

export type CreateSystemConfigRequest = {
  key: string;
  value: string;
  valueType: SystemConfigSummary['valueType'];
  description?: string;
  public?: boolean;
};

export type UpdateSystemConfigRequest = Partial<
  Pick<SystemConfigSummary, 'description' | 'public' | 'value' | 'valueType'>
>;

export type FileAssetSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum?: string;
  uploadedBy: string;
  createdAt: string;
};

export type CreateFileAssetRequest = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  uploadedBy: string;
};

export type AuditLogSummary = {
  id: string;
  actorUsername: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  requestId: string;
  metadata?: unknown;
  createdAt: string;
};

export type LoginLogSummary = {
  id: string;
  username: string;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  requestId: string;
  createdAt: string;
};

export type ExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};
