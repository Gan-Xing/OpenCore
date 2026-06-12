import {
  assertSafeFileAssetInput,
  createFileAssetStorageKey,
} from '@opencore/file';
import type {
  CreateFileAssetDto,
  PageQueryDto,
  UpdateFileAssetDto,
} from './system-management.dto';
import type { FileAssetRecord } from './system-management.seed';

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemManagementExportResource = 'files';

export type NormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export abstract class SystemManagementRepository {
  abstract listFiles(
    query?: PageQueryDto,
  ): Promise<PageResult<FileAssetRecord>>;

  abstract getFile(id: string): Promise<FileAssetRecord>;

  abstract createFileAsset(body: CreateFileAssetDto): Promise<FileAssetRecord>;

  abstract updateFileAsset(
    id: string,
    body: UpdateFileAssetDto,
  ): Promise<FileAssetRecord>;

  abstract deleteFile(id: string): Promise<{ deleted: true }>;

  abstract createExportPreview(
    resource: SystemManagementExportResource,
    query?: PageQueryDto,
  ): Promise<ExportPreview>;
}

export function createPage<T>(
  rows: readonly T[],
  query: PageQueryDto = {},
): PageResult<T> {
  const pagination = normalizePageQuery(query, rows.length);
  const pageRows = rows.slice(
    pagination.skip,
    pagination.skip + pagination.take,
  );

  return createPageResult(
    pageRows.map((row) => clone(row)),
    pagination,
  );
}

export function normalizePageQuery(
  query: PageQueryDto = {},
  total: number,
): NormalizedPageQuery {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    skip,
    take: pageSize,
  };
}

export function createPageResult<T>(
  items: readonly T[],
  pagination: NormalizedPageQuery,
): PageResult<T> {
  return {
    items: [...items],
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
  };
}

export function createExportPreview(
  resource: SystemManagementExportResource,
  page: PageResult<unknown>,
): ExportPreview {
  return {
    filename: `opencore-${resource}.csv`,
    scope: 'current-page',
    columns: [...exportColumnsByResource[resource]],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function createStorageKey(
  body: CreateFileAssetDto,
  prefix = 'runtime/',
): string {
  return createFileAssetStorageKey(body, prefix);
}

export function assertSafeFileAsset(body: CreateFileAssetDto): void {
  assertSafeFileAssetInput(body);
}

function normalizePositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const exportColumnsByResource = {
  files: ['originalName', 'mimeType', 'sizeBytes', 'storageKey'],
} as const;
