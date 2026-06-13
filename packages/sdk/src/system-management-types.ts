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

export type BatchDeleteLoginLogsRequest = {
  ids: readonly string[];
};

export type LoginLogBatchMutationSummary = {
  deleted: true;
  affected: number;
  ids: readonly string[];
};

export type LoginLogCleanSummary = {
  deleted: true;
  affected: number;
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
  category: string;
  name: string;
  key: string;
  value: string;
  valueType: 'boolean' | 'number' | 'string';
  description?: string;
  remark?: string;
  public: boolean;
  system: boolean;
  visibility: 'private' | 'public' | 'secret';
};

export type SystemConfigValueSummary = {
  key: string;
  value: string;
  valueType: SystemConfigSummary['valueType'];
};

export type SystemConfigRuntimeSummary = {
  adminTitle: string;
  loginLockoutMinutes: number;
  loginMaxFailedAttempts: number;
};

export type SystemConfigCacheRefreshSummary = {
  refreshed: true;
  cachedKeys: number;
  refreshedAt: string;
};

export type BatchDeleteSystemConfigsRequest = {
  keys: readonly string[];
};

export type SystemConfigBatchMutationSummary = {
  deleted: true;
  affected: number;
  keys: readonly string[];
};

export type CreateSystemConfigRequest = {
  category?: string;
  key: string;
  name?: string;
  value: string;
  valueType: SystemConfigSummary['valueType'];
  description?: string;
  remark?: string;
  public?: boolean;
  visibility?: SystemConfigSummary['visibility'];
};

export type UpdateSystemConfigRequest = Partial<
  Pick<
    SystemConfigSummary,
    | 'category'
    | 'description'
    | 'name'
    | 'public'
    | 'remark'
    | 'value'
    | 'valueType'
    | 'visibility'
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

export type SystemDeptOptionSummary = {
  id: string;
  name: string;
  parentId?: string;
  order: number;
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

export type UpdateSystemDeptOrderRequest = {
  items: readonly {
    id: string;
    order: number;
  }[];
};

export type SystemDeptOrderMutationSummary = {
  updatedCount: number;
  items: readonly SystemDeptSummary[];
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

export type SystemPostOptionSummary = Pick<
  SystemPostSummary,
  'code' | 'name' | 'order'
>;

export type SystemPostQueryRequest = PageRequest & {
  enabled?: boolean;
};

export type BatchDeleteSystemPostsRequest = {
  codes: readonly string[];
};

export type SystemPostBatchMutationSummary = {
  deleted: true;
  affected: number;
  codes: readonly string[];
};

export type UpdateSystemPostOrderRequest = {
  items: readonly {
    code: string;
    order: number;
  }[];
};

export type SystemPostOrderMutationSummary = {
  updatedCount: number;
  items: readonly SystemPostSummary[];
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
  logType: LoginLogType;
  result: LoginLogResult;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  requestId: string;
  createdAt: string;
};

export type LoginLogType =
  | 'login.mobile'
  | 'login.sms'
  | 'login.social'
  | 'login.username'
  | 'logout.force'
  | 'logout.self';

export type LoginLogResult =
  | 'account_locked'
  | 'bad_credentials'
  | 'captcha_code_error'
  | 'captcha_not_found'
  | 'success'
  | 'user_disabled';

export type LoginLogQueryRequest = PageRequest & {
  createdFrom?: string;
  createdTo?: string;
  ip?: string;
  logType?: LoginLogType;
  result?: LoginLogResult;
  success?: boolean;
  username?: string;
};

export type UnlockLoginUserRequest = {
  username: string;
};

export type LoginUnlockSummary = {
  username: string;
  unlocked: boolean;
  failedAttempts: number;
  lockedUntil?: string;
};

export type ExportPreview = {
  filename: string;
  contentType?: string;
  contentBase64?: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};
