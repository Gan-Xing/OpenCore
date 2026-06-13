import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  MarkSystemNoticesReadDto,
  CreateSystemNoticeDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type {
  SystemNoticeAudience,
  SystemNoticeRecord,
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
