import { BadRequestException } from '@nestjs/common';
import {
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
  UpdateSystemNoticeTemplateDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type {
  SystemNoticeAudience,
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
    throw new BadRequestException(
      'System notice unread limit must be an integer between 1 and 50.',
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
    throw new BadRequestException('System notice read ids must be an array.');
  }

  if (body.ids.length === 0) {
    throw new BadRequestException('System notice read ids must not be empty.');
  }

  const ids = body.ids.map((id) => normalizeRequiredText(id, 'id'));
  const duplicate = findFirstDuplicate(ids);

  if (duplicate) {
    throw new BadRequestException(
      `System notice read id is duplicated: ${duplicate}`,
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
    throw new BadRequestException(
      'System notice can only be published from draft.',
    );
  }
}

export function assertNoticeNotArchived(
  status: SystemNoticeStatus,
  action: string,
): void {
  if (status === 'archived') {
    throw new BadRequestException(
      `System notice cannot be ${action} after archive.`,
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

  throw new BadRequestException(`Invalid system notice type: ${value}`);
}

export function toSystemNoticeAudience(value: string): SystemNoticeAudience {
  if (isSystemNoticeAudience(value)) {
    return value;
  }

  throw new BadRequestException(`Invalid system notice audience: ${value}`);
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

  throw new BadRequestException(`Invalid system notice status: ${value}`);
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

  throw new BadRequestException(`Invalid system notice ${fieldName}: ${value}`);
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

function normalizeRequiredText(value: string, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      `System notice ${fieldName} must be a non-empty string.`,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System notice ${fieldName} is required.`);
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
    throw new BadRequestException(
      'System notice template code must use lowercase letters, numbers, dot, underscore or dash segments.',
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
    throw new BadRequestException(`Invalid system notice ${fieldName}.`);
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
    throw new BadRequestException(
      'System notice templateParams must be an object.',
    );
  }

  const expected = new Set(template.params);
  const actual = Object.keys(rawParams);
  const unexpected = actual.find((key) => !expected.has(key));

  if (unexpected) {
    throw new BadRequestException(
      `Unexpected system notice template param: ${unexpected}`,
    );
  }

  const missing = template.params.find((key) => !(key in rawParams));

  if (missing) {
    throw new BadRequestException(
      `Missing system notice template param: ${missing}`,
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
    throw new BadRequestException(
      `System notice template param must be a string, number or boolean: ${key}`,
    );
  }

  const normalized = String(value).trim();

  if (!normalized) {
    throw new BadRequestException(
      `System notice template param is required: ${key}`,
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
    throw new BadRequestException(
      `System notice template is disabled: ${template.code}`,
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
    throw new BadRequestException(
      'System notice validFrom must be before validTo.',
    );
  }
}
