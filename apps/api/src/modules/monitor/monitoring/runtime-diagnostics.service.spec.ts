import { PrismaService } from '@opencore/database';
import { RuntimeDiagnosticsService } from './runtime-diagnostics.service';

describe('RuntimeDiagnosticsService integration', () => {
  const prisma = new PrismaService();
  const diagnostics = new RuntimeDiagnosticsService(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('checks PostgreSQL, Redis, BullMQ, and S3 without leaking runtime values', async () => {
    const database = await diagnostics.checkDatabase();
    const redis = await diagnostics.checkRedis();
    const queues = await diagnostics.listQueues();
    const s3 = await diagnostics.checkS3();
    const payload = JSON.stringify({ database, redis, queues, s3 });

    expect(database.status).toBe('ok');
    expect(redis.status).toBe('ok');
    expect(queues.status).toBe('ok');
    expect(s3.status).toBe('ok');
    expect(queues.queues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'maintenance',
          driver: 'bullmq-redis-readonly',
          readOnly: true,
        }),
      ]),
    );
    expect(payload).not.toContain('postgresql://');
    expect(payload).not.toContain('redis://');
    expect(payload).not.toContain('S3_SECRET_ACCESS_KEY');
  });
});
