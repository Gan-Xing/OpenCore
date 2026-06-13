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
    await expect(service.getNotice(notice.id)).resolves.toMatchObject({
      id: notice.id,
      title: 'Release Reminder',
    });
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

  it('supports per-user notice inbox read state', async () => {
    const service = new SystemNoticeService(new SeedSystemNoticeRepository());
    const userId = 'user_operator';

    await expect(
      service.listNoticeInbox(userId, { page: 1, pageSize: 10 }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 'notice_welcome',
            read: false,
            readAt: undefined,
          }),
        ],
        total: 1,
      }),
    );
    await expect(service.countUnreadNoticeInbox(userId)).resolves.toBe(1);
    await expect(service.listUnreadNoticeInbox(userId, 5)).resolves.toEqual([
      expect.objectContaining({ id: 'notice_welcome', read: false }),
    ]);
    await expect(
      service.listNoticeInbox(userId, { readStatus: 'not-boolean' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.markNoticesRead(userId, { ids: [] })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.markNoticesRead(userId, {
        ids: ['notice_welcome', 'notice_welcome'],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.markNoticesRead(userId, { ids: ['notice_maintenance_window'] }),
    ).rejects.toThrow('System notice not found in inbox');

    await expect(
      service.markNoticesRead(userId, { ids: ['notice_welcome'] }),
    ).resolves.toEqual({
      ids: ['notice_welcome'],
      markedReadCount: 1,
      unreadCount: 0,
    });
    await expect(
      service.markNoticesRead(userId, { ids: ['notice_welcome'] }),
    ).resolves.toEqual({
      ids: ['notice_welcome'],
      markedReadCount: 0,
      unreadCount: 0,
    });
    await expect(
      service.getNoticeInboxItem(userId, 'notice_welcome'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'notice_welcome',
        read: true,
        readAt: expect.any(String),
      }),
    );
    await expect(
      service.listNoticeInbox(userId, { readStatus: false }),
    ).resolves.toEqual(expect.objectContaining({ total: 0 }));
  });

  describe('PrismaSystemNoticeRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemNoticeService(
      new PrismaSystemNoticeRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const title = `System notice ${testRunId}`;
    const inboxTitle = `System notice inbox ${testRunId}`;
    const inboxUserId = `notice_inbox_user_${testRunId}`;

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
      await expect(service.getNotice(notice.id)).resolves.toMatchObject({
        id: notice.id,
        title,
      });
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

    it('persists notice inbox read receipts through Prisma', async () => {
      await prisma.user.create({
        data: {
          id: inboxUserId,
          username: `notice_inbox_${testRunId}`,
          displayName: 'Notice Inbox Test User',
          passwordHash: 'not-used-by-notice-tests',
          enabled: true,
        },
      });
      const notice = await service.createNotice({
        title: inboxTitle,
        content: 'Created by package inbox integration test.',
        type: 'announcement',
        audience: 'admin',
        createdBy: 'admin',
      });
      await service.publishNotice(notice.id);

      await expect(
        service.getNoticeInboxItem(inboxUserId, notice.id),
      ).resolves.toEqual(
        expect.objectContaining({
          id: notice.id,
          read: false,
          readAt: undefined,
        }),
      );
      await expect(
        service.markNoticesRead(inboxUserId, { ids: [notice.id] }),
      ).resolves.toEqual(
        expect.objectContaining({
          ids: [notice.id],
          markedReadCount: 1,
        }),
      );
      await expect(
        service.getNoticeInboxItem(inboxUserId, notice.id),
      ).resolves.toEqual(
        expect.objectContaining({
          id: notice.id,
          read: true,
          readAt: expect.any(String),
        }),
      );
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemNoticeReadReceipt.deleteMany({
        where: { userId: inboxUserId },
      });
      await prisma.systemNotice.deleteMany({
        where: { title: { in: [title, inboxTitle] } },
      });
      await prisma.user.deleteMany({
        where: { id: inboxUserId },
      });
    }
  });
});
