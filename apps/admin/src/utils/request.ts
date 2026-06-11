import { request } from '@umijs/max';
import { getAdminToken } from '@/services/opencore/token';

export type AdminApiError = {
  code: string;
  message: string;
  statusCode: number;
  requestId?: string;
  traceId?: string;
};

export class AdminRequestError extends Error {
  constructor(readonly error: AdminApiError) {
    super(error.message);
    this.name = 'AdminRequestError';
  }
}

export type RequestJsonOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  requestId?: string;
  traceId?: string;
};

const DEFAULT_API_BASE_URL = '/api';

function createBrowserRequestId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTraceHeaders(options: {
  requestId?: string;
  traceId?: string;
}): Record<string, string> {
  const requestId = options.requestId ?? createBrowserRequestId();

  return {
    'x-request-id': requestId,
    'x-trace-id': options.traceId ?? requestId,
  };
}

export async function requestJson<T>(
  path: `/${string}`,
  options: RequestJsonOptions = {},
): Promise<T> {
  const token = getAdminToken();

  return request<T>(`${DEFAULT_API_BASE_URL}${path}`, {
    method: options.method,
    data: options.body,
    headers: {
      Accept: 'application/json',
      ...createTraceHeaders(options),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
