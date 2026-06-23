import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type { SystemConfigService } from '@opencore/system';
import { PrismaIntegrationRepository } from './prisma-integration.repository';

describe('PrismaIntegrationRepository WebSocket runtime persistence', () => {
  const prisma = new PrismaService();
  const systemConfig = {} as SystemConfigService;
  const repository = new PrismaIntegrationRepository(prisma, systemConfig);
  const testRunId = randomUUID().slice(0, 8);
  const rootTraceId = `ws-runtime-root-${testRunId}`;
  const rootRewrappedTraceId = `ws-runtime-root-rewrapped-${testRunId}`;
  const foreignTraceId = `ws-runtime-foreign-${testRunId}`;
  const foreignTenantId = `tenant_ws_${testRunId}`;

  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists diagnostic runtime events for later diagnostics reads', async () => {
    await ensureForeignTenant();
    const delivered: unknown[] = [];
    const handle = runInTenant('tenant_root', () =>
      repository.openWebSocketRuntimeConnection({
        subjectId: 'user_admin',
        query: {
          eventTypes: 'diagnostic.ping',
          room: 'integration.diagnostics',
        },
        emit: (event) => delivered.push(event),
      }),
    );

    const published = await runInTenant('tenant_root', () =>
      repository.publishWebSocketRuntimeEvent({
        room: 'integration.diagnostics',
        type: 'diagnostic.ping',
        payload: {
          clientSecret: 'unsafe',
          message: 'persisted runtime event',
        },
        traceId: rootTraceId,
      }),
    );
    const rewrapped = await runInTenant('tenant_root', () =>
      repository.publishWebSocketRuntimeEvent({
        room: `tenant:${foreignTenantId}:integration.diagnostics`,
        type: 'diagnostic.ping',
        traceId: rootRewrappedTraceId,
      }),
    );
    const foreignPublished = await runInTenant(foreignTenantId, () =>
      repository.publishWebSocketRuntimeEvent({
        room: 'integration.diagnostics',
        type: 'diagnostic.ping',
        traceId: foreignTraceId,
      }),
    );
    handle.close('test_complete');

    expect(published).toMatchObject({
      deliveredCount: 1,
      payloadPreview: {
        clientSecret: '[REDACTED]',
        message: 'persisted runtime event',
      },
      room: 'tenant:tenant_root:integration.diagnostics',
      status: 'delivered',
      tenantId: 'tenant_root',
      traceId: rootTraceId,
    });
    expect(rewrapped).toMatchObject({
      room: 'tenant:tenant_root:integration.diagnostics',
      tenantId: 'tenant_root',
      traceId: rootRewrappedTraceId,
    });
    expect(foreignPublished).toMatchObject({
      room: `tenant:${foreignTenantId}:integration.diagnostics`,
      status: 'no_subscribers',
      tenantId: foreignTenantId,
      traceId: foreignTraceId,
    });
    expect(delivered).toHaveLength(2);

    const freshRepository = new PrismaIntegrationRepository(
      prisma,
      systemConfig,
    );
    const diagnostics = await runInTenant('tenant_root', () =>
      freshRepository.getWebSocketRuntimeDiagnostics(),
    );
    const foreignDiagnostics = await runInTenant(foreignTenantId, () =>
      freshRepository.getWebSocketRuntimeDiagnostics(),
    );

    expect(diagnostics.summary.recentEvents).toBeGreaterThanOrEqual(1);
    expect(diagnostics.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          payloadPreview: {
            clientSecret: '[REDACTED]',
            message: 'persisted runtime event',
          },
          tenantId: 'tenant_root',
          traceId: rootTraceId,
          type: 'diagnostic.ping',
        }),
      ]),
    );
    expect(diagnostics.events.map((event) => event.traceId)).not.toContain(
      foreignTraceId,
    );
    expect(foreignDiagnostics.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenantId: foreignTenantId,
          traceId: foreignTraceId,
          type: 'diagnostic.ping',
        }),
      ]),
    );
    expect(
      foreignDiagnostics.events.map((event) => event.traceId),
    ).not.toContain(rootTraceId);
    expect(JSON.stringify(diagnostics)).not.toContain('unsafe');
  });

  async function ensureForeignTenant(): Promise<void> {
    await prisma.tenant.upsert({
      where: { id: foreignTenantId },
      update: {
        status: 'active',
      },
      create: {
        id: foreignTenantId,
        code: foreignTenantId,
        slug: foreignTenantId,
        name: 'Tenant WebSocket Runtime Test',
        status: 'active',
      },
    });
  }

  async function cleanup(): Promise<void> {
    await prisma.integrationWebSocketRuntimeEvent.deleteMany({
      where: {
        traceId: {
          in: [rootTraceId, rootRewrappedTraceId, foreignTraceId],
        },
      },
    });
    await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
  }
});

function runInTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `test-${tenantId}`,
      tenantId,
      traceId: `test-${tenantId}`,
    },
    callback,
  );
}
