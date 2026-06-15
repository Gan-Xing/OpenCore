export const API_QUERY_CONTRACT = {
  defaultPage: 1,
  defaultPageSize: 10,
  maxPageSize: 100,
  sortDirections: ['asc', 'desc'],
  filterOperators: ['contains', 'eq', 'gte', 'lte'],
} as const;

export type PageRequest = {
  page?: number;
  pageSize?: number;
};

export type SortDirection = (typeof API_QUERY_CONTRACT.sortDirections)[number];

export type SortDescriptor = {
  field: string;
  direction: SortDirection;
};

export type FilterOperator =
  (typeof API_QUERY_CONTRACT.filterOperators)[number];

export type FilterDescriptor = {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
};

export type QueryRequest = PageRequest & {
  filters?: readonly FilterDescriptor[];
  sort?: readonly SortDescriptor[];
};

export type PageResponse<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiErrorResponseContract = {
  success: false;
  error: {
    code: string;
    details?: unknown;
    issues?: readonly {
      code?: string;
      message: string;
      path?: string;
    }[];
    message: string;
    statusCode: number;
    path?: string;
    requestId?: string;
    traceId?: string;
    timestamp: string;
  };
};

export type ExportPreviewContract = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type FileUploadContract = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
};

export type FileDownloadContract = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  expiresAt?: string;
};

export function normalizePageRequest(
  query: PageRequest = {},
): Required<PageRequest> {
  const page =
    Number.isInteger(query.page) && Number(query.page) > 0
      ? Number(query.page)
      : API_QUERY_CONTRACT.defaultPage;
  const requestedPageSize =
    Number.isInteger(query.pageSize) && Number(query.pageSize) > 0
      ? Number(query.pageSize)
      : API_QUERY_CONTRACT.defaultPageSize;

  return {
    page,
    pageSize: Math.min(requestedPageSize, API_QUERY_CONTRACT.maxPageSize),
  };
}
