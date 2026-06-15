import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import type { SystemConfigService } from '@opencore/system';
import { PrismaIntegrationRepository } from './prisma-integration.repository';

describe('PrismaIntegrationRepository WebSocket runtime persistence', () => {
  const prisma = new PrismaService();
  const systemConfig = {} as SystemConfigService;
  const repository = new PrismaIntegrationRepository(prisma, systemConfig);
  const traceId = `ws-runtime-${randomUUID().slice(0, 8)}`;

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
    const delivered: unknown[] = [];
    const handle = repository.openWebSocketRuntimeConnection({
      subjectId: 'user_admin',
      query: {
        eventTypes: 'diagnostic.ping',
        room: 'integration.diagnostics',
      },
      emit: (event) => delivered.push(event),
    });

    const published = await repository.publishWebSocketRuntimeEvent({
      room: 'integration.diagnostics',
      type: 'diagnostic.ping',
      payload: {
        clientSecret: 'unsafe',
        message: 'persisted runtime event',
      },
      traceId,
    });
    handle.close('test_complete');

    expect(published).toMatchObject({
      deliveredCount: 1,
      payloadPreview: {
        clientSecret: '[REDACTED]',
        message: 'persisted runtime event',
      },
      status: 'delivered',
      traceId,
    });
    expect(delivered).toHaveLength(1);

    const freshRepository = new PrismaIntegrationRepository(
      prisma,
      systemConfig,
    );
    const diagnostics = await freshRepository.getWebSocketRuntimeDiagnostics();

    expect(diagnostics.summary.recentEvents).toBeGreaterThanOrEqual(1);
    expect(diagnostics.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          payloadPreview: {
            clientSecret: '[REDACTED]',
            message: 'persisted runtime event',
          },
          traceId,
          type: 'diagnostic.ping',
        }),
      ]),
    );
    expect(JSON.stringify(diagnostics)).not.toContain('unsafe');
  });

  async function cleanup(): Promise<void> {
    await prisma.integrationWebSocketRuntimeEvent.deleteMany({
      where: { traceId },
    });
  }
});
