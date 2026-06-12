import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  CreateSystemPostDto,
  UpdateSystemPostDto,
} from './system-post.dto';
import type { SystemPostRecord } from './system-post.records';

export type SystemPostExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemPostPageQuery = PageQueryInput & {
  enabled?: boolean | string;
};

export type SystemPostFilters = {
  enabled?: boolean;
};

export type SystemPostNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export type NormalizedSystemPostCreateInput = {
  code: string;
  name: string;
  order: number;
  description?: string;
  enabled: boolean;
};

export type NormalizedSystemPostUpdateInput = {
  name: string;
  order: number;
  description?: string;
  enabled: boolean;
};

const POST_CODE_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemPostRepository {
  abstract listPosts(
    query?: SystemPostPageQuery,
  ): Promise<PageResult<SystemPostRecord>>;

  abstract createPost(body: CreateSystemPostDto): Promise<SystemPostRecord>;

  abstract updatePost(
    code: string,
    body: UpdateSystemPostDto,
  ): Promise<SystemPostRecord>;

  abstract deletePost(code: string): Promise<{ deleted: true }>;
}

export function normalizeSystemPostFilters(
  query: SystemPostPageQuery = {},
): SystemPostFilters {
  return {
    enabled: normalizeOptionalBoolean(query.enabled),
  };
}

export function normalizeSystemPostPageQuery(
  query: SystemPostPageQuery = {},
  total: number,
): SystemPostNormalizedPageQuery {
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

export function createSystemPostPageResult<T>(
  items: readonly T[],
  pagination: SystemPostNormalizedPageQuery,
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

export function createSystemPostExportPreview(
  page: PageResult<unknown>,
): SystemPostExportPreview {
  return {
    filename: 'opencore-system-posts.csv',
    scope: 'current-page',
    columns: ['code', 'name', 'order', 'enabled'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeCreateSystemPostInput(
  body: CreateSystemPostDto,
): NormalizedSystemPostCreateInput {
  return {
    code: normalizePostCode(body.code),
    name: normalizeRequiredText(body.name, 'name'),
    order: normalizeOrder(body.order),
    description: normalizeOptionalText(body.description),
    enabled: body.enabled ?? true,
  };
}

export function normalizeUpdateSystemPostInput(
  existing: SystemPostRecord,
  body: UpdateSystemPostDto,
): NormalizedSystemPostUpdateInput {
  return {
    name:
      body.name === undefined
        ? existing.name
        : normalizeRequiredText(body.name, 'name'),
    order:
      body.order === undefined ? existing.order : normalizeOrder(body.order),
    description:
      body.description === undefined
        ? existing.description
        : normalizeOptionalText(body.description),
    enabled: body.enabled ?? existing.enabled,
  };
}

export function compareSystemPostRecords(
  left: SystemPostRecord,
  right: SystemPostRecord,
): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

function normalizePostCode(value: string): string {
  const code = normalizeRequiredText(value, 'code');

  if (!POST_CODE_PATTERN.test(code)) {
    throw new BadRequestException(
      'System post code must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
    );
  }

  return code;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System post ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalBoolean(
  value: boolean | string | undefined,
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

  throw new BadRequestException(`Invalid system post enabled filter: ${value}`);
}

function normalizeOrder(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(
      'System post order must be a non-negative integer.',
    );
  }

  return value;
}
