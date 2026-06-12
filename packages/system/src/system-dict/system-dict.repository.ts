import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type { CreateDictTypeDto, UpdateDictTypeDto } from './system-dict.dto';
import type { DictTypeRecord } from './system-dict.records';

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

  abstract createDict(body: CreateDictTypeDto): Promise<DictTypeRecord>;

  abstract updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord>;

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
