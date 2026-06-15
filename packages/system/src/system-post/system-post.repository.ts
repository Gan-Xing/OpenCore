import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createPageResult,
  createApiErrorBody,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  BatchDeleteSystemPostsDto,
  CreateSystemPostDto,
  UpdateSystemPostOrderDto,
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

export type SystemPostOptionRecord = Pick<
  SystemPostRecord,
  'code' | 'name' | 'order'
>;

export type SystemPostBatchMutationRecord = {
  deleted: true;
  affected: number;
  codes: readonly string[];
};

export type NormalizedSystemPostOrderItem = {
  code: string;
  order: number;
};

export type SystemPostOrderMutationResult = {
  updatedCount: number;
  items: SystemPostRecord[];
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

  abstract listPostOptions(): Promise<readonly SystemPostOptionRecord[]>;

  abstract getPost(code: string): Promise<SystemPostRecord>;

  abstract createPost(body: CreateSystemPostDto): Promise<SystemPostRecord>;

  abstract updatePost(
    code: string,
    body: UpdateSystemPostDto,
  ): Promise<SystemPostRecord>;

  abstract deletePost(code: string): Promise<{ deleted: true }>;

  abstract deletePosts(
    body: BatchDeleteSystemPostsDto,
  ): Promise<SystemPostBatchMutationRecord>;

  abstract updatePostOrder(
    body: UpdateSystemPostOrderDto,
  ): Promise<SystemPostOrderMutationResult>;
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

export function toSystemPostOptionRecord(
  post: SystemPostRecord,
): SystemPostOptionRecord {
  return {
    code: post.code,
    name: post.name,
    order: post.order,
  };
}

export function normalizeBatchDeleteSystemPostsInput(
  body: BatchDeleteSystemPostsDto,
): readonly string[] {
  if (!Array.isArray(body?.codes)) {
    throw systemPostBadRequest(
      'SYSTEM_POST_CODES_INVALID',
      'System post codes must be an array.',
      { field: 'codes' },
    );
  }

  if (body.codes.length === 0) {
    throw systemPostBadRequest(
      'SYSTEM_POST_CODES_EMPTY',
      'System post codes must not be empty.',
      { field: 'codes' },
    );
  }

  const codes = body.codes.map(normalizePostCode);
  const duplicate = findFirstDuplicate(codes);

  if (duplicate) {
    throw systemPostBadRequest(
      'SYSTEM_POST_CODE_DUPLICATED',
      `System post code is duplicated: ${duplicate}`,
      { duplicate },
    );
  }

  return [...codes].sort();
}

export function normalizeUpdateSystemPostOrderInput(
  body: UpdateSystemPostOrderDto,
): NormalizedSystemPostOrderItem[] {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw systemPostBadRequest(
      'SYSTEM_POST_ORDER_ITEMS_INVALID',
      'System post order update requires at least one item.',
      { field: 'items' },
    );
  }

  const seenCodes = new Set<string>();
  return body.items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw systemPostBadRequest(
        'SYSTEM_POST_ORDER_ITEM_INVALID',
        `System post order item ${index + 1} must be an object.`,
        { index },
      );
    }

    const code = normalizePostCode(item.code);
    if (seenCodes.has(code)) {
      throw systemPostBadRequest(
        'SYSTEM_POST_ORDER_ITEM_CODE_DUPLICATED',
        `Duplicate system post order item code: ${code}`,
        { code },
      );
    }
    seenCodes.add(code);

    return {
      code,
      order: normalizeOrder(item.order),
    };
  });
}

export function normalizePostCode(value: string): string {
  if (typeof value !== 'string') {
    throw systemPostBadRequest(
      'SYSTEM_POST_CODE_INVALID_TYPE',
      'System post code must be a string.',
      { field: 'code' },
    );
  }

  const code = normalizeRequiredText(value, 'code');

  if (!POST_CODE_PATTERN.test(code)) {
    throw systemPostBadRequest(
      'SYSTEM_POST_CODE_INVALID',
      'System post code must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
      { field: 'code' },
    );
  }

  return code;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw systemPostBadRequest(
      'SYSTEM_POST_FIELD_REQUIRED',
      `System post ${fieldName} is required.`,
      { field: fieldName },
    );
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

  throw systemPostBadRequest(
    'SYSTEM_POST_ENABLED_FILTER_INVALID',
    `Invalid system post enabled filter: ${value}`,
    { value },
  );
}

function normalizeOrder(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw systemPostBadRequest(
      'SYSTEM_POST_ORDER_INVALID',
      'System post order must be a non-negative integer.',
      { field: 'order' },
    );
  }

  return value;
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

export function systemPostBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemPostConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(createApiErrorBody({ code, message, details }));
}

export function systemPostNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}
