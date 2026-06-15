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
    assertOpenApiPath(openApi, '/api/integrations/websocket/runtime');
    assertOpenApiPath(openApi, '/api/integrations/websocket/runtime/events');
    assertOpenApiPath(openApi, '/api/integrations/websocket/runtime/stream');
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
    status: 'runtime-active',
    topic: 'websocket',
  });

  const beforeDiagnostics =
    await clients.integration.getWebSocketRuntimeDiagnostics(token);
  assertAtLeast(
    beforeDiagnostics.summary.totalConnections,
    0,
    'WebSocket runtime total connections',
  );

  const stream = await openRuntimeStream(token);
  try {
    const connectedChunk = await stream.readUntil('runtime.connected');
    assertTextIncludes(
      connectedChunk,
      'runtime.subscribed',
      'WebSocket runtime subscription event',
    );

    const connectedDiagnostics =
      await clients.integration.getWebSocketRuntimeDiagnostics(token);
    assertAtLeast(
      connectedDiagnostics.summary.activeConnections,
      1,
      'active WebSocket runtime connection',
    );
    assertAtLeast(
      connectedDiagnostics.summary.activeSubscriptions,
      1,
      'active WebSocket runtime subscription',
    );

    const published = await clients.integration.publishWebSocketRuntimeEvent(
      token,
      {
        payload: {
          clientSecret: 'unsafe',
          source: 'typed-smoke',
        },
        room: 'integration.diagnostics',
        traceId: 'typed-smoke-websocket-runtime',
        type: 'diagnostic.ping',
      },
    );
    assertEqual(
      published.status,
      'delivered',
      'WebSocket runtime event delivery status',
    );
    assertAtLeast(
      published.deliveredCount,
      1,
      'WebSocket runtime delivered count',
    );
    assertNoSecretLeak(published);

    const eventChunk = await stream.readUntil('typed-smoke-websocket-runtime');
    assertTextIncludes(
      eventChunk,
      'diagnostic.ping',
      'WebSocket runtime stream event type',
    );
    assertTextIncludes(
      eventChunk,
      'typed-smoke-websocket-runtime',
      'WebSocket runtime stream trace',
    );

    const rejected = await request(
      `${apiPrefix}/integrations/websocket/runtime/events`,
      {
        body: {
          room: 'integration.diagnostics',
          type: 'chat.message',
        },
        expected: [400],
        method: 'POST',
        token,
      },
    );
    assertTextIncludes(
      JSON.stringify(rejected),
      'diagnostic.*',
      'WebSocket runtime non-diagnostic rejection',
    );
  } finally {
    stream.close();
    await wait(100);
  }

  const afterDiagnostics =
    await clients.integration.getWebSocketRuntimeDiagnostics(token);
  assertAtLeast(
    afterDiagnostics.summary.recentEvents,
    1,
    'WebSocket runtime recent events',
  );
  assertIncludes(
    afterDiagnostics.events.map((event) => event.traceId ?? ''),
    'typed-smoke-websocket-runtime',
    'WebSocket runtime persisted event trace',
  );
  assertNoSecretLeak(afterDiagnostics);

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
              'openapi.integration-websocket-runtime',
            ]
          : []),
        'auth.login',
        'integration.designs.wechat',
        'integration.designs.websocket',
        'integration.websocket-runtime.stream-connect',
        'integration.websocket-runtime.publish-diagnostic',
        'integration.websocket-runtime.reject-non-diagnostic',
        'integration.websocket-runtime.diagnostics',
        'integration.websocket-runtime.persisted-events',
        'integration.websocket-runtime.secret-leak-guard',
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

async function openRuntimeStream(token: string) {
  const controller = new AbortController();
  const response = await fetch(
    `${baseUrl}${apiPrefix}/integrations/websocket/runtime/stream?room=integration.diagnostics&eventTypes=diagnostic.ping`,
    {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal,
    },
  );
  if (!response.ok || !response.body) {
    throw new Error(`WebSocket runtime stream failed: ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return {
    close() {
      controller.abort();
    },
    async readUntil(pattern: string) {
      const deadline = Date.now() + smoke.timeoutMs;
      while (!buffer.includes(pattern)) {
        if (Date.now() > deadline) {
          throw new Error(`Timed out waiting for WebSocket stream ${pattern}`);
        }
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
      }
      return buffer;
    },
  };
}

function assertTextIncludes(actual: string, expected: string, label: string) {
  if (!actual.includes(expected)) {
    throw new Error(`Expected ${label} to include ${expected}`);
  }
}

function assertNoSecretLeak(value: unknown) {
  const text = JSON.stringify(value);
  for (const marker of ['unsafe']) {
    if (text.includes(marker)) {
      throw new Error(
        `WebSocket runtime smoke leaked secret marker: ${marker}`,
      );
    }
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
