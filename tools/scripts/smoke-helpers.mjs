#!/usr/bin/env node

export class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

export function createSmokeRuntime() {
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
  ].filter((candidate, index, candidates) => {
    return Boolean(candidate) && candidates.indexOf(candidate) === index;
  });
  const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);
  let token;

  async function request(pathOrUrl, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const expected = options.expected || [200];
    const url = /^https?:\/\//.test(pathOrUrl)
      ? pathOrUrl
      : `${baseUrl}${pathOrUrl}`;

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          ...(options.token
            ? { authorization: `Bearer ${options.token}` }
            : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
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
        );
      }

      return responseBody;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${options.method || 'GET'} ${pathOrUrl} timed out`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function login() {
    let lastError;

    for (const password of passwordCandidates) {
      try {
        return await request(`${apiPrefix}/auth/login`, {
          method: 'POST',
          expected: [200, 201],
          body: {
            username,
            password,
          },
        });
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

  async function apiRequest(path, options = {}) {
    return request(`${apiPrefix}${path}`, {
      ...options,
      token,
      expected: options.expected || [200, 201],
    });
  }

  return {
    apiPrefix,
    apiRequest,
    baseUrl,
    checkDocs,
    login,
    request,
    setToken(value) {
      token = value;
    },
  };
}

export function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
}

export function assertAtLeast(actual, expected, label) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(
      `Expected ${label} to be at least ${expected}, received ${formatBody(actual)}`,
    );
  }
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(expected)}, received ${formatBody(actual)}`,
    );
  }
}

export function assertIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}, received ${formatBody(values)}`,
    );
  }
}

export function assertNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${label} to be a finite number`);
  }
  return value;
}

export function assertNumberAtLeast(value, minimum, label) {
  assertAtLeast(value, minimum, label);
}

export function assertOpenApiPath(openApi, path) {
  if (!openApi || typeof openApi !== 'object' || !openApi.paths?.[path]) {
    throw new Error(`OpenAPI docs-json does not include ${path}`);
  }
}

export function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }
  return value;
}

export function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 1000);
  }

  return (JSON.stringify(body) ?? String(body)).slice(0, 1000);
}

export function normalizeApiPrefix(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
