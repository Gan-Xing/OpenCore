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

export type DictDataOptionSummary = DictItemSummary & {
  dictCode: string;
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

export type DictDataOptionQueryRequest = {
  dictCode?: string;
};

export type CreateDictItemRequest = {
  enabled?: boolean;
  id?: string;
  label: string;
  sort?: number;
  value: string;
};

export type UpdateDictItemRequest = Partial<
  Pick<DictItemSummary, 'enabled' | 'label' | 'sort' | 'value'>
>;

export type SystemConfigSummary = {
  id: string;
  key: string;
  value: string;
  valueType: 'boolean' | 'number' | 'string';
  description?: string;
  public: boolean;
  visibility: 'private' | 'public' | 'secret';
};

export type CreateSystemConfigRequest = {
  key: string;
  value: string;
  valueType: SystemConfigSummary['valueType'];
  description?: string;
  public?: boolean;
  visibility?: SystemConfigSummary['visibility'];
};

export type UpdateSystemConfigRequest = Partial<
  Pick<
    SystemConfigSummary,
    'description' | 'public' | 'value' | 'valueType' | 'visibility'
  >
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

export type UploadFileAssetRequest = {
  originalName: string;
  mimeType: string;
  contentBase64: string;
  checksum?: string;
  uploadedBy: string;
};

export type UpdateFileAssetRequest = Partial<
  Pick<
    FileAssetSummary,
    'checksum' | 'mimeType' | 'originalName' | 'uploadedBy'
  >
>;

export type SystemDeptSummary = {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  order: number;
  leader?: string;
  phone?: string;
  email?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemDeptTreeSummary = SystemDeptSummary & {
  children: readonly SystemDeptTreeSummary[];
};

export type SystemDeptQueryRequest = {
  enabled?: boolean;
  parentId?: string;
};

export type CreateSystemDeptRequest = {
  code: string;
  name: string;
  parentId?: string;
  order?: number;
  leader?: string;
  phone?: string;
  email?: string;
  enabled?: boolean;
};

export type UpdateSystemDeptRequest = Partial<
  Pick<
    SystemDeptSummary,
    'email' | 'enabled' | 'leader' | 'name' | 'order' | 'phone'
  >
> & {
  parentId?: string | null;
};

export type SystemPostSummary = {
  id: string;
  code: string;
  name: string;
  order: number;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemPostQueryRequest = PageRequest & {
  enabled?: boolean;
};

export type CreateSystemPostRequest = {
  code: string;
  name: string;
  order?: number;
  description?: string;
  enabled?: boolean;
};

export type UpdateSystemPostRequest = Partial<
  Pick<SystemPostSummary, 'description' | 'enabled' | 'name' | 'order'>
>;

export type SystemNoticeStatus = 'archived' | 'draft' | 'published';

export type SystemNoticeType = 'announcement' | 'maintenance' | 'security';

export type SystemNoticeAudience = 'admin' | 'all';

export type SystemNoticeSummary = {
  id: string;
  title: string;
  content: string;
  type: SystemNoticeType;
  status: SystemNoticeStatus;
  audience: SystemNoticeAudience;
  pinned: boolean;
  validFrom?: string;
  validTo?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemNoticeQueryRequest = PageRequest & {
  audience?: SystemNoticeAudience;
  status?: SystemNoticeStatus;
  type?: SystemNoticeType;
};

export type CreateSystemNoticeRequest = {
  title: string;
  content: string;
  type: SystemNoticeType;
  audience?: SystemNoticeAudience;
  pinned?: boolean;
  validFrom?: string;
  validTo?: string;
  createdBy: string;
};

export type UpdateSystemNoticeRequest = Partial<
  Pick<
    SystemNoticeSummary,
    | 'audience'
    | 'content'
    | 'pinned'
    | 'title'
    | 'type'
    | 'validFrom'
    | 'validTo'
  >
>;

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

export type AuditLogQueryRequest = PageRequest & {
  actorUsername?: string;
  action?: string;
  resource?: string;
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

export type LoginLogQueryRequest = PageRequest & {
  success?: boolean;
  username?: string;
};

export type ExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};
