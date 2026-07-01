import {
  createBusinessCoreClient,
  createBusinessSalesClient,
  createCollaborationClient,
  createIntegrationClient,
  createMonitoringClient,
  createOperationsClient,
  createRbacClient,
  createSystemManagementClient,
  createTenancyClient,
  createToolingClient,
  type BusinessCoreClient,
  type BusinessSalesClient,
  type CollaborationClient,
  type IntegrationClient,
  type LoginResponse,
  type MonitoringClient,
  type OperationsClient,
  type RbacClient,
  type SdkRequest,
  type SystemManagementClient,
  type TenancyClient,
  type ToolingClient,
} from '@opencore/sdk';

type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST';

export type SmokeRequestOptions = {
  body?: unknown;
  expected?: readonly number[];
  headers?: Record<string, string>;
  method?: HttpMethod;
  token?: string;
};

export class HttpStatusError extends Error {
  readonly body: unknown;
  readonly status: number;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'HttpStatusError';
    this.body = body;
    this.status = status;
  }
}

export type TypedSmokeRuntime = ReturnType<typeof createTypedSmokeRuntime>;

export function createTypedSmokeRuntime() {
  const port = process.env.OPENCORE_SMOKE_PORT || '39173';
  const baseUrl = trimTrailingSlash(
    process.env.OPENCORE_SMOKE_BASE_URL || `http://127.0.0.1:${port}`,
  );
  const apiPrefix = normalizeApiPrefix(
    process.env.OPENCORE_SMOKE_API_PREFIX || '/api',
  );
  const checkDocs = parseBoolean(process.env.OPENCORE_SMOKE_CHECK_DOCS, true);
  const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
  const passwordCandidates = [
    process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
    process.env.BOOTSTRAP_ADMIN_PASSWORD,
    'admin123',
  ].filter((candidate, index, candidates): candidate is string => {
    return Boolean(candidate) && candidates.indexOf(candidate) === index;
  });
  const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);
  let token: string | undefined;

  const sdkRequest: SdkRequest = (path, options) => {
    return apiRequest(path, options);
  };
  const clients = {
    businessCore: createBusinessCoreClient(
      sdkRequest,
    ) satisfies BusinessCoreClient,
    businessSales: createBusinessSalesClient(
      sdkRequest,
    ) satisfies BusinessSalesClient,
    collaboration: createCollaborationClient(
      sdkRequest,
    ) satisfies CollaborationClient,
    integration: createIntegrationClient(
      sdkRequest,
    ) satisfies IntegrationClient,
    monitoring: createMonitoringClient(sdkRequest) satisfies MonitoringClient,
    operations: createOperationsClient(sdkRequest) satisfies OperationsClient,
    rbac: createRbacClient(sdkRequest) satisfies RbacClient,
    system: createSystemManagementClient(
      sdkRequest,
    ) satisfies SystemManagementClient,
    tenancy: createTenancyClient(sdkRequest) satisfies TenancyClient,
    tooling: createToolingClient(sdkRequest) satisfies ToolingClient,
  };

  async function request<T = unknown>(
    pathOrUrl: string,
    options: SmokeRequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const expected = options.expected || [200];
    const url = /^https?:\/\//.test(pathOrUrl)
      ? pathOrUrl
      : `${baseUrl}${pathOrUrl}`;

    try {
      const multipart =
        typeof FormData !== 'undefined' && options.body instanceof FormData;
      const response = await fetch(url, {
        body: multipart
          ? (options.body as BodyInit)
          : options.body
            ? JSON.stringify(options.body)
            : undefined,
        headers: {
          ...(options.headers || {}),
          ...(options.body && !multipart
            ? { 'content-type': 'application/json' }
            : {}),
          ...(options.token
            ? { authorization: `Bearer ${options.token}` }
            : {}),
        },
        method: options.method || 'GET',
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || '';
      const responseBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!expected.includes(response.status)) {
        throw new HttpStatusError(
          `${options.method || 'GET'} ${pathOrUrl} returned ${response.status}: ${formatBody(
            responseBody,
          )}`,
          response.status,
          responseBody,
        );
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${options.method || 'GET'} ${pathOrUrl} timed out`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function apiRequest<T = unknown>(
    path: `/${string}`,
    options: SmokeRequestOptions = {},
  ): Promise<T> {
    return request<T>(`${apiPrefix}${path}`, {
      ...options,
      token: options.token ?? token,
      expected: options.expected || [200, 201],
    });
  }

  async function login(): Promise<LoginResponse> {
    let lastError: unknown;

    for (const password of passwordCandidates) {
      try {
        const session = await clients.rbac.login({ password, username });

        if (session.status !== 'authenticated') {
          throw new Error(
            `Smoke admin ${username} requires tenant selection; set a tenantCode-capable smoke login.`,
          );
        }

        return session;
      } catch (error) {
        lastError = error;
        if (
          !(error instanceof HttpStatusError) ||
          ![401, 403].includes(error.status)
        ) {
          throw error;
        }
      }
    }

    throw new Error(
      `Unable to authenticate smoke admin ${username}. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
      { cause: lastError },
    );
  }

  return {
    apiPrefix,
    apiRequest,
    baseUrl,
    checkDocs,
    clients,
    login,
    request,
    setToken(value: string | undefined) {
      token = value;
    },
    timeoutMs,
    username,
  };
}

export function assertArray(
  value: unknown,
  label: string,
): asserts value is readonly any[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
}

export function assertAtLeast(
  actual: unknown,
  expected: number,
  label: string,
) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(
      `Expected ${label} to be at least ${expected}, received ${formatBody(actual)}`,
    );
  }
}

export function assertDefined<T>(
  value: T | null | undefined,
  label: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${label} to be defined`);
  }
  return value;
}

export function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(expected)}, received ${formatBody(actual)}`,
    );
  }
}

export function assertIncludes<T>(values: unknown, expected: T, label: string) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}, received ${formatBody(values)}`,
    );
  }
}

export function assertNotIncludes<T>(
  values: unknown,
  expected: T,
  label: string,
) {
  if (!Array.isArray(values) || values.includes(expected)) {
    throw new Error(
      `Expected ${label} not to include ${JSON.stringify(expected)}, received ${formatBody(values)}`,
    );
  }
}

export function assertNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${label} to be a finite number`);
  }
  return value;
}

export function assertNumberAtLeast(
  value: number,
  minimum: number,
  label: string,
) {
  assertAtLeast(value, minimum, label);
}

export function assertOpenApiPath(openApi: unknown, path: string) {
  if (
    !openApi ||
    typeof openApi !== 'object' ||
    !(path in ((openApi as { paths?: Record<string, unknown> }).paths ?? {}))
  ) {
    throw new Error(`OpenAPI docs-json does not include ${path}`);
  }
}

export function assertOpenApiSchema(openApi: unknown, schema: string) {
  if (
    !openApi ||
    typeof openApi !== 'object' ||
    !(
      schema in
      (((openApi as { components?: { schemas?: Record<string, unknown> } })
        .components?.schemas as Record<string, unknown> | undefined) ?? {})
    )
  ) {
    throw new Error(`OpenAPI docs-json does not include schema ${schema}`);
  }
}

export function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }
  return value;
}

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function formatBody(body: unknown) {
  if (typeof body === 'string') {
    return body.slice(0, 1000);
  }

  return (JSON.stringify(body) ?? String(body)).slice(0, 1000);
}

export function normalizeApiPrefix(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
