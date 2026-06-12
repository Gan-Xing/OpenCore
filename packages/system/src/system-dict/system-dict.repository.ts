import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  CreateDictItemDto,
  CreateDictTypeDto,
  DictDataOptionQueryDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
} from './system-dict.dto';
import type {
  DictDataOptionRecord,
  DictItemRecord,
  DictTypeRecord,
} from './system-dict.records';

export type SystemDictExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemDictPageQuery = PageQueryInput;

export type SystemDictNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export abstract class SystemDictRepository {
  abstract listDicts(
    query?: SystemDictPageQuery,
  ): Promise<PageResult<DictTypeRecord>>;

  abstract getDict(code: string): Promise<DictTypeRecord>;

  abstract listDictDataOptions(
    query?: DictDataOptionQueryDto,
  ): Promise<readonly DictDataOptionRecord[]>;

  abstract listDictItems(code: string): Promise<readonly DictItemRecord[]>;

  abstract getDictItem(code: string, itemId: string): Promise<DictItemRecord>;

  abstract createDict(body: CreateDictTypeDto): Promise<DictTypeRecord>;

  abstract createDictItem(
    code: string,
    body: CreateDictItemDto,
  ): Promise<DictItemRecord>;

  abstract updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord>;

  abstract updateDictItem(
    code: string,
    itemId: string,
    body: UpdateDictItemDto,
  ): Promise<DictItemRecord>;

  abstract deleteDictItem(
    code: string,
    itemId: string,
  ): Promise<{ deleted: true }>;

  abstract deleteDict(code: string): Promise<{ deleted: true }>;
}

export function normalizeSystemDictPageQuery(
  query: SystemDictPageQuery = {},
  total: number,
): SystemDictNormalizedPageQuery {
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

export function createSystemDictPageResult<T>(
  items: readonly T[],
  pagination: SystemDictNormalizedPageQuery,
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

export function createSystemDictExportPreview(
  page: PageResult<unknown>,
): SystemDictExportPreview {
  return {
    filename: 'opencore-dicts.csv',
    scope: 'current-page',
    columns: ['code', 'name', 'enabled'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function cloneDictType(dict: DictTypeRecord): DictTypeRecord {
  return {
    ...dict,
    items: dict.items.map((item) => ({ ...item })),
  };
}

export type NormalizedDictItemCreateInput = {
  enabled: boolean;
  id?: string;
  label: string;
  sort: number;
  value: string;
};

export type NormalizedDictItemUpdateInput = {
  enabled?: boolean;
  label?: string;
  sort?: number;
  value?: string;
};

export function normalizeCreateDictItemInput(
  body: CreateDictItemDto,
  index = 0,
): NormalizedDictItemCreateInput {
  return {
    id: normalizeOptionalText(body.id, 'id'),
    label: normalizeRequiredText(body.label, 'label'),
    value: normalizeRequiredText(body.value, 'value'),
    sort: normalizeOptionalInteger(body.sort, 'sort') ?? (index + 1) * 10,
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled') ?? true,
  };
}

export function normalizeUpdateDictItemInput(
  body: UpdateDictItemDto,
): NormalizedDictItemUpdateInput {
  return {
    label:
      body.label === undefined
        ? undefined
        : normalizeRequiredText(body.label, 'label'),
    value:
      body.value === undefined
        ? undefined
        : normalizeRequiredText(body.value, 'value'),
    sort: normalizeOptionalInteger(body.sort, 'sort'),
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled'),
  };
}

export function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${fieldName} must be a boolean.`);
  }

  return value;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeRequiredText(value, fieldName);
}

function normalizeOptionalInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BadRequestException(`${fieldName} must be an integer.`);
  }

  return value;
}
