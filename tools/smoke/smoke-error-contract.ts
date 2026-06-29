#!/usr/bin/env node

import {
  assertEqual,
  assertOpenApiSchema,
  assertString,
  createTypedSmokeRuntime,
  formatBody,
} from './runtime';

type ApiErrorEnvelope = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
    path?: string;
    requestId?: string;
    traceId?: string;
    timestamp?: string;
  };
};

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const permissionCode = `core:error-contract-${runId}:read`;
const noRoleUsername = `error_contract_${runId.replace(/-/g, '_')}`;
const noRolePassword = `ErrorContract-${runId}`;
let adminToken: string | undefined;
let createdPermission = false;
let noRoleUserId: string | undefined;

async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiSchema(openApi, 'ApiErrorResponse');
      assertOpenApiSchema(openApi, 'ApiErrorDetail');
    }

    assertApiError(
      await request<ApiErrorEnvelope>(`${apiPrefix}/auth/login`, {
        body: {
          password: 'wrong-password',
          username: `missing_${noRoleUsername}`,
        },
        expected: [401],
        method: 'POST',
      }),
      {
        code: 'AUTH_INVALID_CREDENTIALS',
        label: 'auth.login.failure',
        statusCode: 401,
      },
    );

    assertApiError(
      await request<ApiErrorEnvelope>(`${apiPrefix}/auth/me`, {
        expected: [401],
      }),
      {
        code: 'AUTH_BEARER_TOKEN_MISSING',
        label: 'auth.me.unauthenticated',
        statusCode: 401,
      },
    );

    const loginResponse = await smoke.login();
    adminToken = assertString(loginResponse.accessToken, 'admin accessToken');
    smoke.setToken(adminToken);

    const noRoleUser = await smoke.apiRequest<{ id?: unknown }>('/core/users', {
      body: {
        displayName: 'Error Contract Smoke',
        enabled: true,
        password: noRolePassword,
        postCodes: [],
        roleCodes: [],
        username: noRoleUsername,
      },
      method: 'POST',
      token: adminToken,
    });
    noRoleUserId = assertString(noRoleUser.id, 'no-role user id');

    const noRoleLogin = await request<{ accessToken?: unknown }>(
      `${apiPrefix}/auth/login`,
      {
        body: {
          password: noRolePassword,
          username: noRoleUsername,
        },
        expected: [200, 201],
        method: 'POST',
      },
    );
    const noRoleToken = assertString(
      noRoleLogin.accessToken,
      'no-role accessToken',
    );

    assertApiError(
      await request<ApiErrorEnvelope>(`${apiPrefix}/core/permissions`, {
        expected: [403],
        token: noRoleToken,
      }),
      {
        code: 'RBAC_PERMISSION_MISSING',
        label: 'rbac.permission.missing',
        statusCode: 403,
      },
    );

    assertApiError(
      await smoke.apiRequest<ApiErrorEnvelope>('/core/permissions', {
        body: {
          code: 'invalid-permission-code',
          title: 'Invalid Permission',
        },
        expected: [400],
        method: 'POST',
        token: adminToken,
      }),
      {
        code: 'RBAC_PERMISSION_CODE_INVALID',
        label: 'rbac.permission.validation',
        statusCode: 400,
      },
    );

    await smoke.apiRequest('/core/permissions', {
      body: {
        code: permissionCode,
        title: 'Error Contract Smoke',
      },
      method: 'POST',
      token: adminToken,
    });
    createdPermission = true;

    assertApiError(
      await smoke.apiRequest<ApiErrorEnvelope>('/core/permissions', {
        body: {
          code: permissionCode,
          title: 'Error Contract Smoke Duplicate',
        },
        expected: [409],
        method: 'POST',
        token: adminToken,
      }),
      {
        code: 'RBAC_PERMISSION_ALREADY_EXISTS',
        label: 'rbac.permission.conflict',
        statusCode: 409,
      },
    );

    assertApiError(
      await smoke.apiRequest<ApiErrorEnvelope>(
        `/core/permissions/${encodeURIComponent(
          `core:error-contract-missing-${runId}:read`,
        )}`,
        {
          expected: [404],
          token: adminToken,
        },
      ),
      {
        code: 'RBAC_PERMISSION_NOT_FOUND',
        label: 'rbac.permission.not-found',
        statusCode: 404,
      },
    );

    await cleanup();

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs
            ? ['openapi.error-response', 'openapi.error-detail']
            : []),
          'auth.login.failure',
          'auth.me.unauthenticated',
          'rbac.permission.missing',
          'rbac.permission.validation',
          'rbac.permission.conflict',
          'rbac.permission.not-found',
        ],
      }),
    );
  } catch (error) {
    await cleanup().catch(() => undefined);
    console.error(
      JSON.stringify({
        status: 'fail',
        baseUrl,
        apiPrefix,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  }
}

function assertApiError(
  body: ApiErrorEnvelope,
  expected: { code: string; label: string; statusCode: number },
) {
  if (!body || typeof body !== 'object' || body.success !== false) {
    throw new Error(
      `Expected ${expected.label} to return success=false, received ${formatBody(
        body,
      )}`,
    );
  }

  const error = body.error;

  if (!error || typeof error !== 'object') {
    throw new Error(
      `Expected ${expected.label} to return an error object, received ${formatBody(
        body,
      )}`,
    );
  }

  assertEqual(error.code, expected.code, `${expected.label} error code`);
  assertEqual(
    error.statusCode,
    expected.statusCode,
    `${expected.label} statusCode`,
  );
  assertString(error.message, `${expected.label} message`);
  assertString(error.path, `${expected.label} path`);
  assertString(error.requestId, `${expected.label} requestId`);
  assertString(error.traceId, `${expected.label} traceId`);
  assertString(error.timestamp, `${expected.label} timestamp`);
}

async function cleanup() {
  if (!adminToken) {
    return;
  }

  if (createdPermission) {
    await smoke
      .apiRequest(`/core/permissions/${encodeURIComponent(permissionCode)}`, {
        expected: [200, 404],
        method: 'DELETE',
        token: adminToken,
      })
      .catch(() => undefined);
    createdPermission = false;
  }

  if (noRoleUserId) {
    await smoke
      .apiRequest(`/core/users/${encodeURIComponent(noRoleUserId)}`, {
        expected: [200, 404],
        method: 'DELETE',
        token: adminToken,
      })
      .catch(() => undefined);
    noRoleUserId = undefined;
  }
}

void main();
