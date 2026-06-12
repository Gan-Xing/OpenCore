import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemNoticeRepository } from './system-notice.prisma-repository';
import { SeedSystemNoticeRepository } from './system-notice.seed-repository';
import { SystemNoticeService } from './system-notice.service';

describe('@opencore/system system-notice', () => {
  it('supports seeded notice CRUD, filtering, export previews and lifecycle', async () => {
    const service = new SystemNoticeService(new SeedSystemNoticeRepository());

    await expect(
      service.listNotices({ page: 1, pageSize: 1, status: 'published' }),
    ).resolves.toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 1,
        totalPages: 1,
      }),
    );

    const notice = await service.createNotice({
      title: 'Release Reminder',
      content: 'Remember to review release notes before publishing.',
      type: 'announcement',
      audience: 'admin',
      createdBy: 'admin',
    });

    expect(notice.status).toBe('draft');
    expect(
      (await service.updateNotice(notice.id, { pinned: true })).pinned,
    ).toBe(true);
    await expect(service.publishNotice(notice.id)).resolves.toMatchObject({
      status: 'published',
      publishedAt: expect.any(String),
    });
    await expect(service.archiveNotice(notice.id)).resolves.toMatchObject({
      status: 'archived',
      archivedAt: expect.any(String),
    });
    await expect(service.publishNotice(notice.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-notices.csv',
      scope: 'current-page',
      columns: ['title', 'type', 'status', 'audience', 'pinned'],
    });
    await expect(service.deleteNotice(notice.id)).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects invalid notice schedules', async () => {
    const service = new SystemNoticeService(new SeedSystemNoticeRepository());

    await expect(
      service.createNotice({
        title: 'Invalid Window',
        content: 'validFrom must not be after validTo.',
        type: 'maintenance',
        validFrom: '2026-06-12T04:00:00.000Z',
        validTo: '2026-06-12T03:00:00.000Z',
        createdBy: 'admin',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSystemNoticeRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemNoticeService(
      new PrismaSystemNoticeRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const title = `System notice ${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded system notices from PostgreSQL', async () => {
      await expect(
        service.listNotices({ page: 1, pageSize: 20 }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ id: 'notice_welcome' }),
          ]),
        }),
      );
    });

    it('persists notice lifecycle through Prisma', async () => {
      const notice = await service.createNotice({
        title,
        content: 'Created by package integration test.',
        type: 'security',
        audience: 'admin',
        validFrom: '2026-06-12T01:00:00.000Z',
        validTo: '2026-06-12T02:00:00.000Z',
        createdBy: 'admin',
      });

      expect(notice.status).toBe('draft');
      await expect(
        service.listNotices({ type: 'security', audience: 'admin' }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ id: notice.id }),
          ]),
        }),
      );
      await expect(service.publishNotice(notice.id)).resolves.toMatchObject({
        status: 'published',
        publishedAt: expect.any(String),
      });
      await expect(service.archiveNotice(notice.id)).resolves.toMatchObject({
        status: 'archived',
        archivedAt: expect.any(String),
      });
      await expect(service.deleteNotice(notice.id)).resolves.toEqual({
        deleted: true,
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemNotice.deleteMany({
        where: { title },
      });
    }
  });
});
