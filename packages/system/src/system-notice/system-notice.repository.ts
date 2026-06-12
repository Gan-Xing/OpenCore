import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
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

export type SystemNoticeFilters = {
  audience?: SystemNoticeAudience;
  status?: SystemNoticeStatus;
  type?: SystemNoticeType;
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
