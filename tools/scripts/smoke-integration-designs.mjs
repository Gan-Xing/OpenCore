#!/usr/bin/env node

import {
  assertArray,
  assertAtLeast,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;
let token;

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/integrations/designs/wechat');
    assertOpenApiPath(openApi, '/api/integrations/designs/websocket');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const wechat = await apiRequest('/integrations/designs/wechat');
  assertIntegrationDesign(wechat, {
    topic: 'wechat',
    status: 'design-only',
    documentPath: 'docs/development/integration-wechat-design.md',
    boundary: 'provider config and health check only',
  });

  const websocket = await apiRequest('/integrations/designs/websocket');
  assertIntegrationDesign(websocket, {
    topic: 'websocket',
    status: 'design-only',
    documentPath: 'docs/development/integration-websocket-design.md',
    boundary: 'auth required during connection upgrade',
  });

  const summary = await apiRequest('/integrations/summary');
  assertAtLeast(summary.designs?.designOnlyTopics, 2, 'design-only topics');
  assertIncludes(summary.designs?.topics ?? [], 'wechat', 'design topics');
  assertIncludes(summary.designs?.topics ?? [], 'websocket', 'design topics');

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs
          ? [
              'openapi.integration-design-wechat',
              'openapi.integration-design-websocket',
            ]
          : []),
        'auth.login',
        'integration.designs.wechat',
        'integration.designs.websocket',
        'integration.designs.summary-topics',
      ],
    }),
  );
} catch (error) {
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

function assertIntegrationDesign(actual, expected) {
  assertEqual(actual.topic, expected.topic, `${expected.topic} design topic`);
  assertEqual(
    actual.status,
    expected.status,
    `${expected.topic} design status`,
  );
  assertEqual(
    actual.documentPath,
    expected.documentPath,
    `${expected.topic} design document path`,
  );
  assertArray(actual.boundaries, `${expected.topic} design boundaries`);
  assertIncludes(
    actual.boundaries,
    expected.boundary,
    `${expected.topic} design boundaries`,
  );
}
