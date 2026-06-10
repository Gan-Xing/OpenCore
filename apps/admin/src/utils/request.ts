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

async function parseError(response: Response): Promise<AdminApiError> {
  const fallback: AdminApiError = {
    code: `HTTP_${response.status}`,
    message: response.statusText || 'Request failed',
    statusCode: response.status,
  };

  try {
    const body = (await response.json()) as {
      error?: Partial<AdminApiError>;
    };

    return {
      ...fallback,
      ...body.error,
      statusCode: body.error?.statusCode ?? response.status,
    };
  } catch {
    return fallback;
  }
}

export async function requestJson<T>(
  path: `/${string}`,
  options: RequestJsonOptions = {},
): Promise<T> {
  const response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...createTraceHeaders(options),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new AdminRequestError(await parseError(response));
  }

  return (await response.json()) as T;
}
