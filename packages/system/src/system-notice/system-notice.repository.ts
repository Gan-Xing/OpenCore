import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createApiErrorBody,
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  CreateSystemNoticeFromTemplateDto,
  MarkSystemNoticesReadDto,
  CreateSystemNoticeDto,
  CreateSystemNoticeTemplateDto,
  RenderSystemNoticeTemplateDto,
  SystemNoticeDeliveryExecuteDto,
  SystemNoticeDispatchDto,
  UpdateSystemNoticeTemplateDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type {
  SystemNoticeAudience,
  SystemNoticeDeliveryChannel,
  SystemNoticeDeliveryProvider,
  SystemNoticeDeliveryProviderStatus,
  SystemNoticeDeliveryRecord,
  SystemNoticeDeliveryStatus,
  SystemNoticeRecord,
  SystemNoticeTemplateRecord,
  SystemNoticeStatus,
  SystemNoticeType,
} from './system-notice.records';

export type SystemNoticeExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemNoticePageQuery = PageQueryInput & {
  audience?: string;
  status?: string;
  type?: string;
};

export type SystemNoticeInboxPageQuery = PageQueryInput & {
  readStatus?: boolean | string;
  type?: string;
};

export type SystemNoticeReadUsersPageQuery = PageQueryInput;

export type SystemNoticeDeliveryPageQuery = PageQueryInput & {
  channel?: string;
  providerStatus?: string;
  readStatus?: boolean | string;
  username?: string;
};

export type SystemNoticeTemplatePageQuery = PageQueryInput & {
  enabled?: boolean | string;
  type?: string;
};

export type SystemNoticeFilters = {
  audience?: SystemNoticeAudience;
  status?: SystemNoticeStatus;
  type?: SystemNoticeType;
};

export type SystemNoticeInboxFilters = {
  readStatus?: boolean;
  type?: SystemNoticeType;
};

export type SystemNoticeDeliveryFilters = {
  channel?: SystemNoticeDeliveryChannel;
  providerStatus?: SystemNoticeDeliveryProviderStatus;
  readStatus?: boolean;
  username?: string;
};

export type SystemNoticeInboxRecord = SystemNoticeRecord & {
  read: boolean;
  readAt?: string;
};

export type SystemNoticeReadMutationResult = {
  markedReadCount: number;
  ids: readonly string[];
  unreadCount: number;
};

export type SystemNoticeReadUserRecord = {
  userId: string;
  username: string;
  displayName: string;
  readAt: string;
};

export type SystemNoticeDeliveryMutationResult = {
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

export type SystemNoticeDeliveryExecutionResult = {
  noticeId: string;
  channel: SystemNoticeDeliveryChannel;
  provider: SystemNoticeDeliveryProvider;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  queuedOutboxCount: number;
};

export type SystemNoticeTemplateFilters = {
  enabled?: boolean;
  type?: SystemNoticeType;
};

export type SystemNoticeTemplateOptionRecord = Pick<
  SystemNoticeTemplateRecord,
  'code' | 'name' | 'params' | 'type'
>;

export type SystemNoticeTemplateRenderRecord = {
  code: string;
  title: string;
  content: string;
  params: readonly string[];
};

export type SystemNoticeNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export type NormalizedSystemNoticeCreateInput = {
  title: string;
  content: string;
  type: SystemNoticeType;
  audience: SystemNoticeAudience;
  pinned: boolean;
  validFrom?: string;
  validTo?: string;
  createdBy: string;
};

export type NormalizedSystemNoticeUpdateInput = {
  title: string;
  content: string;
  type: SystemNoticeType;
  audience: SystemNoticeAudience;
  pinned: boolean;
  validFrom?: string;
  validTo?: string;
};

export type NormalizedSystemNoticeTemplateCreateInput = {
  code: string;
  name: string;
  type: SystemNoticeType;
  titleTemplate: string;
  contentTemplate: string;
  params: readonly string[];
  enabled: boolean;
  remark?: string;
};

export type NormalizedSystemNoticeTemplateUpdateInput = {
  name: string;
  type: SystemNoticeType;
  titleTemplate: string;
  contentTemplate: string;
  params: readonly string[];
  enabled: boolean;
  remark?: string;
};

export type NormalizedSystemNoticeTemplateRenderInput = Record<string, string>;

export type NormalizedSystemNoticeFromTemplateInput = {
  templateParams: NormalizedSystemNoticeTemplateRenderInput;
  audience: SystemNoticeAudience;
  createdBy: string;
  pinned: boolean;
  validFrom?: string;
  validTo?: string;
};

const SYSTEM_NOTICE_STATUSES = ['draft', 'published', 'archived'] as const;
const SYSTEM_NOTICE_TYPES = [
  'announcement',
  'maintenance',
  'security',
] as const;
const SYSTEM_NOTICE_AUDIENCES = ['all', 'admin'] as const;
const SYSTEM_NOTICE_DELIVERY_CHANNELS = ['in_app', 'mail', 'sms'] as const;
const SYSTEM_NOTICE_DELIVERY_STATUSES = ['delivered', 'read'] as const;
const SYSTEM_NOTICE_DELIVERY_PROVIDERS = [
  'in_app.local',
  'mail.sandbox',
  'sms.sandbox',
] as const;
const SYSTEM_NOTICE_DELIVERY_PROVIDER_STATUSES = [
  'failed',
  'pending',
  'sent',
] as const;

export abstract class SystemNoticeRepository {
  abstract listNotices(
    query?: SystemNoticePageQuery,
  ): Promise<PageResult<SystemNoticeRecord>>;

  abstract listNoticeInbox(
    userId: string,
    query?: SystemNoticeInboxPageQuery,
  ): Promise<PageResult<SystemNoticeInboxRecord>>;

  abstract getNoticeInboxItem(
    userId: string,
    id: string,
  ): Promise<SystemNoticeInboxRecord>;

  abstract listUnreadNoticeInbox(
    userId: string,
    limit?: number | string,
  ): Promise<readonly SystemNoticeInboxRecord[]>;

  abstract countUnreadNoticeInbox(userId: string): Promise<number>;

  abstract markNoticesRead(
    userId: string,
    body: MarkSystemNoticesReadDto,
  ): Promise<SystemNoticeReadMutationResult>;

  abstract markAllNoticesRead(
    userId: string,
  ): Promise<SystemNoticeReadMutationResult>;

  abstract listNoticeReadUsers(
    id: string,
    query?: SystemNoticeReadUsersPageQuery,
  ): Promise<PageResult<SystemNoticeReadUserRecord>>;

  abstract listNoticeDeliveries(
    id: string,
    query?: SystemNoticeDeliveryPageQuery,
  ): Promise<PageResult<SystemNoticeDeliveryRecord>>;

  abstract dispatchNotice(
    id: string,
    body?: SystemNoticeDispatchDto,
  ): Promise<SystemNoticeDeliveryMutationResult>;

  abstract executeNoticeDeliveries(
    id: string,
    body?: SystemNoticeDeliveryExecuteDto,
  ): Promise<SystemNoticeDeliveryExecutionResult>;

  abstract listNoticeTemplates(
    query?: SystemNoticeTemplatePageQuery,
  ): Promise<PageResult<SystemNoticeTemplateRecord>>;

  abstract listNoticeTemplateOptions(): Promise<
    readonly SystemNoticeTemplateOptionRecord[]
  >;

  abstract getNoticeTemplate(code: string): Promise<SystemNoticeTemplateRecord>;

  abstract createNoticeTemplate(
    body: CreateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord>;

  abstract updateNoticeTemplate(
    code: string,
    body: UpdateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord>;

  abstract deleteNoticeTemplate(code: string): Promise<{ deleted: true }>;

  abstract createNoticeFromTemplate(
    code: string,
    body: CreateSystemNoticeFromTemplateDto,
  ): Promise<SystemNoticeRecord>;

  abstract getNotice(id: string): Promise<SystemNoticeRecord>;

  abstract createNotice(
    body: CreateSystemNoticeDto,
  ): Promise<SystemNoticeRecord>;

  abstract updateNotice(
    id: string,
    body: UpdateSystemNoticeDto,
  ): Promise<SystemNoticeRecord>;

  abstract publishNotice(id: string): Promise<SystemNoticeRecord>;

  abstract archiveNotice(id: string): Promise<SystemNoticeRecord>;

  abstract deleteNotice(id: string): Promise<{ deleted: true }>;
}

export function systemNoticeBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemNoticeConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemNoticeNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

export function normalizeSystemNoticeFilters(
  query: SystemNoticePageQuery = {},
): SystemNoticeFilters {
  return {
    audience: toOptionalSystemNoticeAudience(query.audience),
    status: toOptionalSystemNoticeStatus(query.status),
    type: toOptionalSystemNoticeType(query.type),
  };
}

export function normalizeSystemNoticeInboxFilters(
  query: SystemNoticeInboxPageQuery = {},
): SystemNoticeInboxFilters {
  return {
    readStatus: normalizeOptionalBoolean(query.readStatus, 'readStatus'),
    type: toOptionalSystemNoticeType(query.type),
  };
}

export function normalizeSystemNoticeDeliveryFilters(
  query: SystemNoticeDeliveryPageQuery = {},
): SystemNoticeDeliveryFilters {
  return {
    channel: toOptionalSystemNoticeDeliveryChannel(query.channel),
    providerStatus: toOptionalSystemNoticeDeliveryProviderStatus(
      query.providerStatus,
    ),
    readStatus: normalizeOptionalBoolean(query.readStatus, 'readStatus'),
    username: normalizeOptionalText(query.username, 'delivery username'),
  };
}

export function normalizeSystemNoticeDeliveryChannelInput(
  channel: string | undefined,
): SystemNoticeDeliveryChannel {
  return toSystemNoticeDeliveryChannel(channel ?? 'in_app');
}

export function getSystemNoticeDeliveryProvider(
  channel: SystemNoticeDeliveryChannel,
): SystemNoticeDeliveryProvider {
  if (channel === 'mail') {
    return 'mail.sandbox';
  }

  if (channel === 'sms') {
    return 'sms.sandbox';
  }

  return 'in_app.local';
}

export function normalizeSystemNoticeTemplateFilters(
  query: SystemNoticeTemplatePageQuery = {},
): SystemNoticeTemplateFilters {
  return {
    enabled: normalizeOptionalBoolean(query.enabled, 'template enabled'),
    type: toOptionalSystemNoticeType(query.type),
  };
}

export function normalizeSystemNoticePageQuery(
  query: SystemNoticePageQuery = {},
  total: number,
): SystemNoticeNormalizedPageQuery {
  const pagination = normalizePagination(query, { maxPageSize: 100 });
  const totalPages = Math.ceil(total / pagination.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(pagination.page, totalPages);

  return {
    page: safePage,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    skip: (safePage - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function normalizeUnreadNoticeLimit(
  limit: number | string = 10,
): number {
  const normalized =
    typeof limit === 'string' && limit.trim() !== ''
      ? Number(limit)
      : Number(limit);

  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 50) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_UNREAD_LIMIT_INVALID',
      'System notice unread limit must be an integer between 1 and 50.',
      { maximum: 50, minimum: 1, value: limit },
    );
  }

  return normalized;
}

export function createSystemNoticePageResult<T>(
  items: readonly T[],
  pagination: SystemNoticeNormalizedPageQuery,
): PageResult<T> {
  return createPageResult(
    [...items],
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    pagination.total,
  );
}

export function createSystemNoticeInboxRecord(
  notice: SystemNoticeRecord,
  readAt?: string,
): SystemNoticeInboxRecord {
  return {
    ...notice,
    read: Boolean(readAt),
    readAt,
  };
}

export function createSystemNoticeExportPreview(
  page: PageResult<unknown>,
): SystemNoticeExportPreview {
  return {
    filename: 'opencore-system-notices.csv',
    scope: 'current-page',
    columns: ['title', 'type', 'status', 'audience', 'pinned'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function isSystemNoticeVisibleInInbox(
  notice: SystemNoticeRecord,
  now: Date = new Date(),
): boolean {
  if (notice.status !== 'published') {
    return false;
  }

  if (notice.audience !== 'all' && notice.audience !== 'admin') {
    return false;
  }

  if (
    notice.validFrom &&
    new Date(notice.validFrom).getTime() > now.getTime()
  ) {
    return false;
  }

  if (notice.validTo && new Date(notice.validTo).getTime() < now.getTime()) {
    return false;
  }

  return true;
}

export function compareSystemNoticeInboxRecords(
  left: SystemNoticeInboxRecord,
  right: SystemNoticeInboxRecord,
): number {
  return (
    Number(right.pinned) - Number(left.pinned) ||
    compareNullableIsoDesc(left.publishedAt, right.publishedAt) ||
    compareNullableIsoDesc(left.createdAt, right.createdAt) ||
    left.title.localeCompare(right.title)
  );
}

export function normalizeMarkSystemNoticesReadInput(
  body: MarkSystemNoticesReadDto,
): readonly string[] {
  if (!Array.isArray(body?.ids)) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_READ_IDS_INVALID',
      'System notice read ids must be an array.',
      { field: 'ids' },
    );
  }

  if (body.ids.length === 0) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_READ_IDS_EMPTY',
      'System notice read ids must not be empty.',
      { field: 'ids' },
    );
  }

  const ids = body.ids.map((id) => normalizeRequiredText(id, 'id'));
  const duplicate = findFirstDuplicate(ids);

  if (duplicate) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_READ_ID_DUPLICATED',
      `System notice read id is duplicated: ${duplicate}`,
      { id: duplicate },
    );
  }

  return ids;
}

export function normalizeCreateSystemNoticeInput(
  body: CreateSystemNoticeDto,
): NormalizedSystemNoticeCreateInput {
  const normalized: NormalizedSystemNoticeCreateInput = {
    title: normalizeRequiredText(body.title, 'title'),
    content: normalizeRequiredText(body.content, 'content'),
    type: toSystemNoticeType(body.type),
    audience: toSystemNoticeAudience(body.audience ?? 'all'),
    pinned: body.pinned ?? false,
    validFrom: normalizeOptionalDateString(body.validFrom, 'validFrom'),
    validTo: normalizeOptionalDateString(body.validTo, 'validTo'),
    createdBy: normalizeRequiredText(body.createdBy, 'createdBy'),
  };

  assertValidNoticeSchedule(normalized.validFrom, normalized.validTo);
  return normalized;
}

export function normalizeCreateSystemNoticeTemplateInput(
  body: CreateSystemNoticeTemplateDto,
): NormalizedSystemNoticeTemplateCreateInput {
  const titleTemplate = normalizeRequiredText(
    body.titleTemplate,
    'titleTemplate',
  );
  const contentTemplate = normalizeRequiredText(
    body.contentTemplate,
    'contentTemplate',
  );
  const enabled = normalizeOptionalBoolean(body.enabled, 'template enabled');

  return {
    code: normalizeSystemNoticeTemplateCode(body.code),
    name: normalizeRequiredText(body.name, 'template name'),
    type: toSystemNoticeType(body.type),
    titleTemplate,
    contentTemplate,
    params: extractNoticeTemplateParams(titleTemplate, contentTemplate),
    enabled: enabled ?? true,
    remark: normalizeOptionalText(body.remark, 'template remark'),
  };
}

export function normalizeUpdateSystemNoticeTemplateInput(
  existing: SystemNoticeTemplateRecord,
  body: UpdateSystemNoticeTemplateDto,
): NormalizedSystemNoticeTemplateUpdateInput {
  const titleTemplate =
    body.titleTemplate === undefined
      ? existing.titleTemplate
      : normalizeRequiredText(body.titleTemplate, 'titleTemplate');
  const contentTemplate =
    body.contentTemplate === undefined
      ? existing.contentTemplate
      : normalizeRequiredText(body.contentTemplate, 'contentTemplate');
  const enabled = normalizeOptionalBoolean(body.enabled, 'template enabled');

  return {
    name:
      body.name === undefined
        ? existing.name
        : normalizeRequiredText(body.name, 'template name'),
    type:
      body.type === undefined ? existing.type : toSystemNoticeType(body.type),
    titleTemplate,
    contentTemplate,
    params: extractNoticeTemplateParams(titleTemplate, contentTemplate),
    enabled: enabled ?? existing.enabled,
    remark:
      body.remark === undefined
        ? existing.remark
        : normalizeOptionalText(body.remark, 'template remark'),
  };
}

export function renderSystemNoticeTemplate(
  template: SystemNoticeTemplateRecord,
  body: RenderSystemNoticeTemplateDto = {},
): SystemNoticeTemplateRenderRecord {
  assertSystemNoticeTemplateEnabled(template);
  const params = normalizeSystemNoticeTemplateParams(template, body);

  return {
    code: template.code,
    title: applySystemNoticeTemplateParams(template.titleTemplate, params),
    content: applySystemNoticeTemplateParams(template.contentTemplate, params),
    params: template.params,
  };
}

export function normalizeCreateSystemNoticeFromTemplateInput(
  template: SystemNoticeTemplateRecord,
  body: CreateSystemNoticeFromTemplateDto,
): NormalizedSystemNoticeFromTemplateInput {
  assertSystemNoticeTemplateEnabled(template);
  const pinned = normalizeOptionalBoolean(body.pinned, 'template pinned');
  const normalized: NormalizedSystemNoticeFromTemplateInput = {
    templateParams: normalizeSystemNoticeTemplateParams(template, body),
    audience: toSystemNoticeAudience(body.audience ?? 'all'),
    createdBy: normalizeRequiredText(body.createdBy, 'createdBy'),
    pinned: pinned ?? false,
    validFrom: normalizeOptionalDateString(body.validFrom, 'validFrom'),
    validTo: normalizeOptionalDateString(body.validTo, 'validTo'),
  };

  assertValidNoticeSchedule(normalized.validFrom, normalized.validTo);
  return normalized;
}

export function createSystemNoticeFromTemplateInput(
  template: SystemNoticeTemplateRecord,
  body: CreateSystemNoticeFromTemplateDto,
): NormalizedSystemNoticeCreateInput {
  const input = normalizeCreateSystemNoticeFromTemplateInput(template, body);

  return {
    title: applySystemNoticeTemplateParams(
      template.titleTemplate,
      input.templateParams,
    ),
    content: applySystemNoticeTemplateParams(
      template.contentTemplate,
      input.templateParams,
    ),
    type: template.type,
    audience: input.audience,
    pinned: input.pinned,
    validFrom: input.validFrom,
    validTo: input.validTo,
    createdBy: input.createdBy,
  };
}

export function normalizeUpdateSystemNoticeInput(
  existing: SystemNoticeRecord,
  body: UpdateSystemNoticeDto,
): NormalizedSystemNoticeUpdateInput {
  const normalized: NormalizedSystemNoticeUpdateInput = {
    title:
      body.title === undefined
        ? existing.title
        : normalizeRequiredText(body.title, 'title'),
    content:
      body.content === undefined
        ? existing.content
        : normalizeRequiredText(body.content, 'content'),
    type:
      body.type === undefined ? existing.type : toSystemNoticeType(body.type),
    audience:
      body.audience === undefined
        ? existing.audience
        : toSystemNoticeAudience(body.audience),
    pinned: body.pinned ?? existing.pinned,
    validFrom:
      body.validFrom === undefined
        ? existing.validFrom
        : normalizeOptionalDateString(body.validFrom, 'validFrom'),
    validTo:
      body.validTo === undefined
        ? existing.validTo
        : normalizeOptionalDateString(body.validTo, 'validTo'),
  };

  assertValidNoticeSchedule(normalized.validFrom, normalized.validTo);
  return normalized;
}

export function assertNoticeCanPublish(status: SystemNoticeStatus): void {
  if (status !== 'draft') {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_PUBLISH_STATUS_INVALID',
      'System notice can only be published from draft.',
      { status },
    );
  }
}

export function assertNoticeCanDispatch(status: SystemNoticeStatus): void {
  if (status !== 'published') {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_DISPATCH_STATUS_INVALID',
      'System notice deliveries can only be dispatched after publish.',
      { status },
    );
  }
}

export function assertNoticeNotArchived(
  status: SystemNoticeStatus,
  action: string,
): void {
  if (status === 'archived') {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_ARCHIVED_IMMUTABLE',
      `System notice cannot be ${action} after archive.`,
      { action, status },
    );
  }
}

export function toSystemNoticeStatus(value: string): SystemNoticeStatus {
  if (isSystemNoticeStatus(value)) {
    return value;
  }

  return 'draft';
}

export function toSystemNoticeType(value: string): SystemNoticeType {
  if (isSystemNoticeType(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_TYPE_INVALID',
    `Invalid system notice type: ${value}`,
    { value },
  );
}

export function toSystemNoticeAudience(value: string): SystemNoticeAudience {
  if (isSystemNoticeAudience(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_AUDIENCE_INVALID',
    `Invalid system notice audience: ${value}`,
    { value },
  );
}

export function toSystemNoticeDeliveryChannel(
  value: string,
): SystemNoticeDeliveryChannel {
  if (isSystemNoticeDeliveryChannel(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_DELIVERY_CHANNEL_INVALID',
    `Invalid system notice delivery channel: ${value}`,
    { value },
  );
}

export function toSystemNoticeDeliveryStatus(
  value: string,
): SystemNoticeDeliveryStatus {
  if (isSystemNoticeDeliveryStatus(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_DELIVERY_STATUS_INVALID',
    `Invalid system notice delivery status: ${value}`,
    { value },
  );
}

export function toSystemNoticeDeliveryProvider(
  value: string,
): SystemNoticeDeliveryProvider {
  if (isSystemNoticeDeliveryProvider(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_DELIVERY_PROVIDER_INVALID',
    `Invalid system notice delivery provider: ${value}`,
    { value },
  );
}

export function toSystemNoticeDeliveryProviderStatus(
  value: string,
): SystemNoticeDeliveryProviderStatus {
  if (isSystemNoticeDeliveryProviderStatus(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_DELIVERY_PROVIDER_STATUS_INVALID',
    `Invalid system notice delivery provider status: ${value}`,
    { value },
  );
}

function toOptionalSystemNoticeStatus(
  value: string | undefined,
): SystemNoticeStatus | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (isSystemNoticeStatus(value)) {
    return value;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_STATUS_INVALID',
    `Invalid system notice status: ${value}`,
    { value },
  );
}

function toOptionalSystemNoticeType(
  value: string | undefined,
): SystemNoticeType | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return toSystemNoticeType(value);
}

function toOptionalSystemNoticeAudience(
  value: string | undefined,
): SystemNoticeAudience | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return toSystemNoticeAudience(value);
}

function toOptionalSystemNoticeDeliveryChannel(
  value: string | undefined,
): SystemNoticeDeliveryChannel | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return toSystemNoticeDeliveryChannel(value);
}

function toOptionalSystemNoticeDeliveryProviderStatus(
  value: string | undefined,
): SystemNoticeDeliveryProviderStatus | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return toSystemNoticeDeliveryProviderStatus(value);
}

function normalizeOptionalBoolean(
  value: boolean | string | undefined,
  fieldName: string,
): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw systemNoticeBadRequest(
    'SYSTEM_NOTICE_BOOLEAN_INVALID',
    `Invalid system notice ${fieldName}: ${value}`,
    { field: fieldName, value },
  );
}

function isSystemNoticeStatus(value: string): value is SystemNoticeStatus {
  return (SYSTEM_NOTICE_STATUSES as readonly string[]).includes(value);
}

function isSystemNoticeType(value: string): value is SystemNoticeType {
  return (SYSTEM_NOTICE_TYPES as readonly string[]).includes(value);
}

function isSystemNoticeAudience(value: string): value is SystemNoticeAudience {
  return (SYSTEM_NOTICE_AUDIENCES as readonly string[]).includes(value);
}

function isSystemNoticeDeliveryChannel(
  value: string,
): value is SystemNoticeDeliveryChannel {
  return (SYSTEM_NOTICE_DELIVERY_CHANNELS as readonly string[]).includes(value);
}

function isSystemNoticeDeliveryStatus(
  value: string,
): value is SystemNoticeDeliveryStatus {
  return (SYSTEM_NOTICE_DELIVERY_STATUSES as readonly string[]).includes(value);
}

function isSystemNoticeDeliveryProvider(
  value: string,
): value is SystemNoticeDeliveryProvider {
  return (SYSTEM_NOTICE_DELIVERY_PROVIDERS as readonly string[]).includes(
    value,
  );
}

function isSystemNoticeDeliveryProviderStatus(
  value: string,
): value is SystemNoticeDeliveryProviderStatus {
  return (
    SYSTEM_NOTICE_DELIVERY_PROVIDER_STATUSES as readonly string[]
  ).includes(value);
}

function normalizeRequiredText(value: string, fieldName: string): string {
  if (typeof value !== 'string') {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEXT_INVALID_TYPE',
      `System notice ${fieldName} must be a non-empty string.`,
      { field: fieldName },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEXT_REQUIRED',
      `System notice ${fieldName} is required.`,
      { field: fieldName },
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | undefined,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return normalizeRequiredText(value, fieldName);
}

function normalizeSystemNoticeTemplateCode(value: string): string {
  const normalized = normalizeRequiredText(value, 'template code');

  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(normalized)) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_CODE_INVALID',
      'System notice template code must use lowercase letters, numbers, dot, underscore or dash segments.',
      { code: value },
    );
  }

  return normalized;
}

function normalizeOptionalDateString(
  value: string | undefined,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_DATE_INVALID',
      `Invalid system notice ${fieldName}.`,
      { field: fieldName, value },
    );
  }

  return date.toISOString();
}

function extractNoticeTemplateParams(
  titleTemplate: string,
  contentTemplate: string,
): readonly string[] {
  const params = new Set<string>();
  const pattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

  for (const template of [titleTemplate, contentTemplate]) {
    for (const match of template.matchAll(pattern)) {
      params.add(match[1]);
    }
  }

  return [...params].sort((left, right) => left.localeCompare(right));
}

function normalizeSystemNoticeTemplateParams(
  template: SystemNoticeTemplateRecord,
  body: RenderSystemNoticeTemplateDto,
): NormalizedSystemNoticeTemplateRenderInput {
  const rawParams = body.templateParams ?? {};

  if (!isPlainRecord(rawParams)) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_PARAMS_INVALID',
      'System notice templateParams must be an object.',
      { field: 'templateParams' },
    );
  }

  const expected = new Set(template.params);
  const actual = Object.keys(rawParams);
  const unexpected = actual.find((key) => !expected.has(key));

  if (unexpected) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_PARAM_UNEXPECTED',
      `Unexpected system notice template param: ${unexpected}`,
      { param: unexpected },
    );
  }

  const missing = template.params.find((key) => !(key in rawParams));

  if (missing) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_PARAM_MISSING',
      `Missing system notice template param: ${missing}`,
      { param: missing },
    );
  }

  return Object.fromEntries(
    template.params.map((key) => [
      key,
      normalizeTemplateParamValue(rawParams[key], key),
    ]),
  );
}

function normalizeTemplateParamValue(value: unknown, key: string): string {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_PARAM_VALUE_INVALID_TYPE',
      `System notice template param must be a string, number or boolean: ${key}`,
      { param: key },
    );
  }

  const normalized = String(value).trim();

  if (!normalized) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_PARAM_VALUE_REQUIRED',
      `System notice template param is required: ${key}`,
      { param: key },
    );
  }

  return normalized;
}

function applySystemNoticeTemplateParams(
  template: string,
  params: NormalizedSystemNoticeTemplateRenderInput,
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g,
    (_, key) => params[key] ?? '',
  );
}

function assertSystemNoticeTemplateEnabled(
  template: SystemNoticeTemplateRecord,
): void {
  if (!template.enabled) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_TEMPLATE_DISABLED',
      `System notice template is disabled: ${template.code}`,
      { code: template.code },
    );
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareNullableIsoDesc(
  left: string | undefined,
  right: string | undefined,
): number {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }

  return undefined;
}

function assertValidNoticeSchedule(
  validFrom: string | undefined,
  validTo: string | undefined,
): void {
  if (
    validFrom &&
    validTo &&
    new Date(validFrom).getTime() > new Date(validTo).getTime()
  ) {
    throw systemNoticeBadRequest(
      'SYSTEM_NOTICE_SCHEDULE_INVALID',
      'System notice validFrom must be before validTo.',
      { validFrom, validTo },
    );
  }
}
