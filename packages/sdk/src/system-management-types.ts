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
  valueType: 'boolean' | 'json' | 'number' | 'string';
  encrypted: boolean;
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
  featureFlags: Record<string, boolean>;
  featureFlagRules: Record<
    string,
    {
      audienceRules: {
        mode: 'all' | 'any';
        rules: readonly {
          attribute: string;
          operator: 'equals' | 'in' | 'not_equals' | 'not_in';
          values: readonly string[];
        }[];
      };
      enabled: boolean;
      rolloutPercentage: number;
    }
  >;
  loginLockoutMinutes: number;
  loginMaxFailedAttempts: number;
};

export type SystemConfigFeatureFlagEvaluationSummary = {
  flag: string;
  subjectKey: string;
  enabled: boolean;
  rolloutPercentage: number;
  bucket: number;
  audienceMatched: boolean;
  reason:
    | 'audience-mismatch'
    | 'global-disabled'
    | 'matched-rollout'
    | 'outside-rollout';
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

export type SystemNoticeInboxSummary = SystemNoticeSummary & {
  read: boolean;
  readAt?: string;
};

export type SystemNoticeReadUserSummary = {
  userId: string;
  username: string;
  displayName: string;
  readAt: string;
};

export type SystemNoticeDeliveryChannel = 'in_app';

export type SystemNoticeDeliveryStatus = 'delivered' | 'read';

export type SystemNoticeDeliveryProvider = 'in_app.local';

export type SystemNoticeDeliveryProviderStatus = 'failed' | 'pending' | 'sent';

export type SystemNoticeDeliverySummary = {
  id: string;
  noticeId: string;
  userId: string;
  username: string;
  displayName: string;
  channel: SystemNoticeDeliveryChannel;
  status: SystemNoticeDeliveryStatus;
  provider: SystemNoticeDeliveryProvider;
  providerStatus: SystemNoticeDeliveryProviderStatus;
  attemptCount: number;
  title: string;
  content: string;
  type: SystemNoticeType;
  audience: SystemNoticeAudience;
  deliveredAt: string;
  lastAttemptAt?: string;
  sentAt?: string;
  lastError?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemNoticeTemplateSummary = {
  id: string;
  code: string;
  name: string;
  type: SystemNoticeType;
  titleTemplate: string;
  contentTemplate: string;
  params: readonly string[];
  enabled: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemNoticeTemplateOptionSummary = Pick<
  SystemNoticeTemplateSummary,
  'code' | 'name' | 'params' | 'type'
>;

export type SystemNoticeTemplateRenderSummary = {
  code: string;
  title: string;
  content: string;
  params: readonly string[];
};

export type SystemNoticeQueryRequest = PageRequest & {
  audience?: SystemNoticeAudience;
  status?: SystemNoticeStatus;
  type?: SystemNoticeType;
};

export type SystemNoticeInboxQueryRequest = PageRequest & {
  readStatus?: boolean;
  type?: SystemNoticeType;
};

export type SystemNoticeReadUsersQueryRequest = PageRequest;

export type SystemNoticeDeliveryQueryRequest = PageRequest & {
  channel?: SystemNoticeDeliveryChannel;
  providerStatus?: SystemNoticeDeliveryProviderStatus;
  readStatus?: boolean;
  username?: string;
};

export type SystemNoticeTemplateQueryRequest = PageRequest & {
  enabled?: boolean;
  type?: SystemNoticeType;
};

export type MarkSystemNoticesReadRequest = {
  ids: readonly string[];
};

export type SystemNoticeReadMutationSummary = {
  markedReadCount: number;
  ids: readonly string[];
  unreadCount: number;
};

export type SystemNoticeUnreadCountSummary = {
  unreadCount: number;
};

export type SystemNoticeDispatchSummary = {
  noticeId: string;
  channel: SystemNoticeDeliveryChannel;
  provider: SystemNoticeDeliveryProvider;
  deliveredCount: number;
  skippedCount: number;
  totalRecipientCount: number;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
};

export type SystemNoticeDeliveryExecutionSummary = {
  noticeId: string;
  channel: SystemNoticeDeliveryChannel;
  provider: SystemNoticeDeliveryProvider;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
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

export type CreateSystemNoticeTemplateRequest = {
  code: string;
  name: string;
  type: SystemNoticeType;
  titleTemplate: string;
  contentTemplate: string;
  enabled?: boolean;
  remark?: string;
};

export type UpdateSystemNoticeTemplateRequest = Partial<
  Pick<
    SystemNoticeTemplateSummary,
    'contentTemplate' | 'enabled' | 'name' | 'remark' | 'titleTemplate' | 'type'
  >
>;

export type RenderSystemNoticeTemplateRequest = {
  templateParams?: Record<string, string | number | boolean>;
};

export type CreateSystemNoticeFromTemplateRequest =
  RenderSystemNoticeTemplateRequest & {
    audience?: SystemNoticeAudience;
    createdBy: string;
    pinned?: boolean;
    validFrom?: string;
    validTo?: string;
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
  actorUsername?: string;
  reason?: string;
  ip: string;
  location: string;
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
  actorUsername?: string;
  createdFrom?: string;
  createdTo?: string;
  ip?: string;
  location?: string;
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
