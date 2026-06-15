import type { IntegrationDesignSummary } from '@opencore/sdk';

import {
  assertArray,
  assertAtLeast,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

async function main() {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/integrations/designs/wechat');
    assertOpenApiPath(openApi, '/api/integrations/designs/websocket');
  }

  const loginResponse = await smoke.login();
  const token = assertString(loginResponse.accessToken, 'login accessToken');

  const wechat = await clients.integration.getWeChatDesign(token);
  assertIntegrationDesign(wechat, {
    boundary: 'provider config and health check only',
    documentPath: 'docs/development/integration-wechat-design.md',
    status: 'design-only',
    topic: 'wechat',
  });

  const websocket = await clients.integration.getWebSocketDesign(token);
  assertIntegrationDesign(websocket, {
    boundary: 'auth required during connection upgrade',
    documentPath: 'docs/development/integration-websocket-design.md',
    status: 'design-only',
    topic: 'websocket',
  });

  const summary = await clients.integration.getSummary(token);
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
}

function assertIntegrationDesign(
  actual: IntegrationDesignSummary,
  expected: Pick<
    IntegrationDesignSummary,
    'documentPath' | 'status' | 'topic'
  > & {
    boundary: string;
  },
) {
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

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
