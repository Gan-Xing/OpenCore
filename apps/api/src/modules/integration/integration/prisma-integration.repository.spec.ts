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

describe('PrismaIntegrationRepository tenant-scoped integration persistence', () => {
  const prisma = new PrismaService();
  const systemConfig = {} as SystemConfigService;
  const repository = new PrismaIntegrationRepository(prisma, systemConfig);
  const testRunId = randomUUID().slice(0, 8);
  const foreignTenantId = `tenant_integration_${testRunId}`;
  const providerCode = `oauth.tenant_${testRunId}`;
  const mailProviderCode = `mail.tenant_${testRunId}`;
  const templateCode = `mail.tenant_${testRunId}`;
  const rootOutboxId = `outbox_integration_root_${testRunId}`;
  const foreignOutboxId = `outbox_integration_foreign_${testRunId}`;
  const rootTokenId = `oauth_token_root_${testRunId}`;
  const foreignTokenId = `oauth_token_foreign_${testRunId}`;
  const subjectId = `subject_${testRunId}`;
  const providerAccountId = `provider:acct:${testRunId}`;

  beforeEach(async () => {
    await cleanup();
    await seedRows();
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('scopes providers, templates, outbox, OAuth tokens, and OAuth callbacks by tenant', async () => {
    const rootProviders = await runInTenant('tenant_root', () =>
      repository.listProviders({ type: 'oauth', pageSize: 100 }),
    );
    const foreignProviders = await runInTenant(foreignTenantId, () =>
      repository.listProviders({ type: 'oauth', pageSize: 100 }),
    );

    expect(
      rootProviders.items.find((provider) => provider.code === providerCode),
    ).toMatchObject({ tenantId: 'tenant_root' });
    expect(
      foreignProviders.items.find((provider) => provider.code === providerCode),
    ).toMatchObject({ tenantId: foreignTenantId });

    await expect(
      runInTenant('tenant_root', () =>
        repository.getOutboxMessage('mail', foreignOutboxId),
      ),
    ).rejects.toMatchObject({});
    await expect(
      runInTenant(foreignTenantId, () =>
        repository.getOutboxMessage('mail', foreignOutboxId),
      ),
    ).resolves.toMatchObject({
      id: foreignOutboxId,
      tenantId: foreignTenantId,
    });

    await expect(
      runInTenant('tenant_root', () =>
        repository.getOAuthToken(foreignTokenId),
      ),
    ).rejects.toMatchObject({});
    await expect(
      runInTenant(foreignTenantId, () =>
        repository.getOAuthToken(foreignTokenId),
      ),
    ).resolves.toMatchObject({
      id: foreignTokenId,
      tenantId: foreignTenantId,
    });

    const rootTemplates = await runInTenant('tenant_root', () =>
      repository.listTemplates('mail', { pageSize: 100 }),
    );
    const foreignTemplates = await runInTenant(foreignTenantId, () =>
      repository.listTemplates('mail', { pageSize: 100 }),
    );
    expect(
      rootTemplates.items.find((template) => template.code === templateCode),
    ).toMatchObject({ tenantId: 'tenant_root' });
    expect(
      foreignTemplates.items.find((template) => template.code === templateCode),
    ).toMatchObject({ tenantId: foreignTenantId });

    const flow = await runInTenant(foreignTenantId, () =>
      repository.startOAuthFlow({
        providerCode,
        subjectId: `callback_subject_${testRunId}`,
      }),
    );
    const callback = await runInTenant('tenant_root', () =>
      repository.callbackOAuthProvider(providerCode, {
        state: flow.state,
        code: `callback-code-${testRunId}`,
        providerAccountId: `callback-account-${testRunId}`,
        expiresInSeconds: null,
      }),
    );

    expect(callback).toMatchObject({
      audit: { tenantId: foreignTenantId },
      status: 'accepted',
      token: { tenantId: foreignTenantId },
    });
    await expect(
      runInTenant('tenant_root', () =>
        repository.listOAuthCallbackAudits({
          providerCode,
          status: 'accepted',
        }),
      ),
    ).resolves.toMatchObject({ total: 0 });
    await expect(
      runInTenant(foreignTenantId, () =>
        repository.listOAuthCallbackAudits({
          providerCode,
          status: 'accepted',
        }),
      ),
    ).resolves.toMatchObject({ total: 1 });
  });

  async function seedRows(): Promise<void> {
    await prisma.tenant.upsert({
      where: { id: foreignTenantId },
      update: { status: 'active' },
      create: {
        id: foreignTenantId,
        code: foreignTenantId,
        slug: foreignTenantId,
        name: 'Tenant Integration Persistence Test',
        status: 'active',
      },
    });
    await prisma.integrationProvider.createMany({
      data: [
        buildProviderRow('tenant_root', providerCode, 'oauth'),
        buildProviderRow(foreignTenantId, providerCode, 'oauth'),
        buildProviderRow('tenant_root', mailProviderCode, 'mail'),
        buildProviderRow(foreignTenantId, mailProviderCode, 'mail'),
      ],
    });
    await prisma.integrationTemplate.createMany({
      data: [
        buildTemplateRow('tenant_root'),
        buildTemplateRow(foreignTenantId),
      ],
    });
    await prisma.integrationOutbox.createMany({
      data: [
        buildOutboxRow('tenant_root', rootOutboxId),
        buildOutboxRow(foreignTenantId, foreignOutboxId),
      ],
    });
    await prisma.integrationOAuthToken.createMany({
      data: [
        buildTokenRow('tenant_root', rootTokenId),
        buildTokenRow(foreignTenantId, foreignTokenId),
      ],
    });
  }

  async function cleanup(): Promise<void> {
    await prisma.integrationOAuthCallbackAudit.deleteMany({
      where: {
        tenantId: { in: ['tenant_root', foreignTenantId] },
        providerCode,
      },
    });
    await prisma.integrationOAuthFlow.deleteMany({
      where: {
        tenantId: { in: ['tenant_root', foreignTenantId] },
        providerCode,
      },
    });
    await prisma.integrationOAuthToken.deleteMany({
      where: {
        tenantId: { in: ['tenant_root', foreignTenantId] },
        providerCode,
      },
    });
    await prisma.integrationOutbox.deleteMany({
      where: { id: { in: [rootOutboxId, foreignOutboxId] } },
    });
    await prisma.integrationTemplate.deleteMany({
      where: {
        tenantId: { in: ['tenant_root', foreignTenantId] },
        code: templateCode,
      },
    });
    await prisma.integrationProvider.deleteMany({
      where: {
        tenantId: { in: ['tenant_root', foreignTenantId] },
        code: { in: [providerCode, mailProviderCode] },
      },
    });
    await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
  }

  function buildProviderRow(
    tenantId: string,
    code: string,
    type: 'mail' | 'oauth',
  ) {
    return {
      id: `provider_${tenantId}_${code}`.replace(/[^a-zA-Z0-9_]+/g, '_'),
      tenantId,
      code,
      type,
      name: `${tenantId} ${code}`,
      enabled: true,
      secretRef: `secret://config/${code}.secret`,
      secretRefStatus: 'unchecked',
      config:
        type === 'oauth'
          ? {
              adapter: 'oauth2',
              authorizationUrl: 'https://oauth.example.test/authorize',
              callbackPath: '/api/integrations/oauth/callback/tenant-test',
              clientId: `${tenantId}-client`,
              scopes: ['read:user'],
            }
          : {
              adapter: 'sandbox',
            },
      configVersion: 1,
      healthStatus: 'healthy',
    };
  }

  function buildTemplateRow(tenantId: string) {
    return {
      id: `template_${tenantId}_${testRunId}`.replace(/[^a-zA-Z0-9_]+/g, '_'),
      tenantId,
      code: templateCode,
      channel: 'mail',
      name: `${tenantId} Mail Template`,
      subject: 'Tenant {{name}}',
      body: 'Hello {{name}}',
      enabled: true,
    };
  }

  function buildOutboxRow(tenantId: string, id: string) {
    return {
      id,
      tenantId,
      channel: 'mail',
      providerCode: mailProviderCode,
      templateCode,
      recipient: 'tenant@example.test',
      subject: 'Tenant message',
      payload: { name: tenantId },
      status: 'queued',
      retryCount: 0,
      preview: `Hello ${tenantId}`,
    };
  }

  function buildTokenRow(tenantId: string, id: string) {
    return {
      id,
      tenantId,
      providerCode,
      subjectType: 'system-user',
      subjectId,
      providerAccountId,
      scopes: ['read:user'],
      accessTokenRef: `secret://config/${tenantId}.${providerCode}.access-token`,
      refreshTokenRef: `secret://config/${tenantId}.${providerCode}.refresh-token`,
      status: 'active',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      lastRotatedAt: new Date(),
    };
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
