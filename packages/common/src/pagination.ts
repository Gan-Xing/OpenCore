import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from './constants';

export type PageQueryInput = {
  page?: number | string;
  pageSize?: number | string;
};

export type NormalizedPagination = {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PageResult<T> = PageMeta & {
  items: readonly T[];
};

export type SortDirection = 'asc' | 'desc';

export type SortQueryInput<Field extends string = string> = {
  sortBy?: Field | string;
  sortDirection?: SortDirection | string;
};

export type NormalizedSort<Field extends string> = {
  sortBy: Field;
  sortDirection: SortDirection;
};

export function normalizePagination(
  input: PageQueryInput = {},
  options: {
    defaultPageSize?: number;
    maxPageSize?: number;
  } = {},
): NormalizedPagination {
  const defaultPageSize = clampInteger(
    options.defaultPageSize ?? DEFAULT_PAGE_SIZE,
    MIN_PAGE_SIZE,
    options.maxPageSize ?? MAX_PAGE_SIZE,
  );
  const maxPageSize = Math.max(
    MIN_PAGE_SIZE,
    Math.floor(options.maxPageSize ?? MAX_PAGE_SIZE),
  );
  const page = Math.max(
    DEFAULT_PAGE,
    parsePositiveInteger(input.page) ?? DEFAULT_PAGE,
  );
  const pageSize = clampInteger(
    parsePositiveInteger(input.pageSize) ?? defaultPageSize,
    MIN_PAGE_SIZE,
    maxPageSize,
  );

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

export function createPageResult<T>(
  items: readonly T[],
  pagination: Pick<NormalizedPagination, 'page' | 'pageSize'>,
  total: number,
): PageResult<T> {
  const normalizedTotal = Math.max(0, Math.floor(total));

  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: normalizedTotal,
    totalPages: Math.ceil(normalizedTotal / pagination.pageSize),
  };
}

export function normalizeSort<Field extends string>(
  input: SortQueryInput<Field>,
  allowedFields: readonly Field[],
  defaultSort: NormalizedSort<Field>,
): NormalizedSort<Field> {
  const sortBy = allowedFields.includes(input.sortBy as Field)
    ? (input.sortBy as Field)
    : defaultSort.sortBy;
  const sortDirection =
    typeof input.sortDirection === 'string' &&
    input.sortDirection.toLowerCase() === 'desc'
      ? 'desc'
      : (defaultSort.sortDirection ?? DEFAULT_SORT_DIRECTION);

  return {
    sortBy,
    sortDirection,
  };
}

function parsePositiveInteger(
  value: number | string | undefined,
): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}
