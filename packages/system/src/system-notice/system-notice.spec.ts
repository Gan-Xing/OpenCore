import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemNoticeRepository } from './system-notice.prisma-repository';
import { SystemNoticeRealtimeService } from './system-notice.realtime';
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
    await expect(service.dispatchNotice(notice.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.publishNotice(notice.id)).resolves.toMatchObject({
      status: 'published',
      publishedAt: expect.any(String),
    });
    await expect(
      service.listNoticeDeliveries(notice.id, { readStatus: false }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            noticeId: notice.id,
            username: 'admin',
            channel: 'in_app',
            status: 'delivered',
            provider: 'in_app.local',
            providerStatus: 'pending',
            attemptCount: 0,
          }),
        ],
        total: 1,
      }),
    );
    await expect(service.dispatchNotice(notice.id)).resolves.toMatchObject({
      noticeId: notice.id,
      channel: 'in_app',
      provider: 'in_app.local',
      deliveredCount: 0,
      skippedCount: 1,
      totalRecipientCount: 1,
      attemptedCount: 0,
      sentCount: 0,
      pendingCount: 1,
    });
    await expect(service.executeNoticeDeliveries(notice.id)).resolves.toEqual({
      noticeId: notice.id,
      channel: 'in_app',
      provider: 'in_app.local',
      attemptedCount: 1,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 0,
      pendingCount: 0,
      queuedOutboxCount: 0,
    });
    await expect(
      service.listNoticeDeliveries(notice.id, { providerStatus: 'sent' }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          noticeId: notice.id,
          providerStatus: 'sent',
          attemptCount: 1,
          sentAt: expect.any(String),
        }),
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    await expect(
      service.listAllNoticeDeliveries({
        providerStatus: 'sent',
        username: 'admin',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            noticeId: notice.id,
            providerStatus: 'sent',
            username: 'admin',
          }),
        ]),
      }),
    );
    await expect(
      service.dispatchNotice(notice.id, { channel: 'mail' }),
    ).resolves.toMatchObject({
      noticeId: notice.id,
      channel: 'mail',
      provider: 'mail.sandbox',
      deliveredCount: 1,
      pendingCount: 1,
    });
    await expect(
      service.executeNoticeDeliveries(notice.id, { channel: 'mail' }),
    ).resolves.toEqual({
      noticeId: notice.id,
      channel: 'mail',
      provider: 'mail.sandbox',
      attemptedCount: 1,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      pendingCount: 1,
      queuedOutboxCount: 1,
    });
    await expect(
      service.listNoticeDeliveries(notice.id, { channel: 'mail' }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            channel: 'mail',
            provider: 'mail.sandbox',
            providerStatus: 'pending',
            attemptCount: 0,
            providerMessageId: expect.stringContaining('outbox_'),
            recipient: 'admin@opencore.local',
            sentAt: undefined,
          }),
        ],
      }),
    );
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

  it('returns stable error codes for system-notice guards', async () => {
    const service = new SystemNoticeService(new SeedSystemNoticeRepository());
    const notice = await service.createNotice({
      title: 'Stable notice codes',
      content: 'Stable notice code assertions.',
      type: 'announcement',
      audience: 'admin',
      createdBy: 'admin',
    });

    await expectHttpExceptionCode(
      service.dispatchNotice(notice.id),
      'SYSTEM_NOTICE_DISPATCH_STATUS_INVALID',
    );
    await expectHttpExceptionCode(
      service.createNotice({
        title: 'Invalid schedule code',
        content: 'validFrom must not be after validTo.',
        type: 'maintenance',
        validFrom: '2026-06-12T04:00:00.000Z',
        validTo: '2026-06-12T03:00:00.000Z',
        createdBy: 'admin',
      }),
      'SYSTEM_NOTICE_SCHEDULE_INVALID',
    );
    await expectHttpExceptionCode(
      service.markNoticesRead('user_operator', { ids: [] }),
      'SYSTEM_NOTICE_READ_IDS_EMPTY',
    );
    await expectHttpExceptionCode(
      service.markNoticesRead('user_operator', {
        ids: ['notice_welcome', 'notice_welcome'],
      }),
      'SYSTEM_NOTICE_READ_ID_DUPLICATED',
    );
    await expectHttpExceptionCode(
      service.markNoticesRead('user_operator', {
        ids: ['notice_maintenance_window'],
      }),
      'SYSTEM_NOTICE_INBOX_NOT_FOUND',
    );

    const template = await service.createNoticeTemplate({
      code: 'stable.notice.codes',
      name: 'Stable Notice Codes',
      type: 'security',
      titleTemplate: 'Security {{service}}',
      contentTemplate: 'Owner {{owner}} rotates {{service}}.',
    });
    await expectHttpExceptionCode(
      service.renderNoticeTemplate(template.code, {
        templateParams: { service: 'API' },
      }),
      'SYSTEM_NOTICE_TEMPLATE_PARAM_MISSING',
    );
    await service.updateNoticeTemplate(template.code, { enabled: false });
    await expectHttpExceptionCode(
      service.renderNoticeTemplate(template.code, {
        templateParams: { owner: 'Platform', service: 'API' },
      }),
      'SYSTEM_NOTICE_TEMPLATE_DISABLED',
    );
  });

  it('supports notice templates, strict rendering and notice creation', async () => {
    const service = new SystemNoticeService(new SeedSystemNoticeRepository());

    await expect(
      service.listNoticeTemplates({ page: 1, pageSize: 10, enabled: true }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            code: 'release.window',
            params: ['owner', 'version', 'window'],
          }),
        ],
      }),
    );
    await expect(service.listNoticeTemplateOptions()).resolves.toEqual([
      expect.objectContaining({
        code: 'release.window',
        params: ['owner', 'version', 'window'],
      }),
    ]);

    const template = await service.createNoticeTemplate({
      code: 'security.rotation',
      name: 'Security Rotation',
      type: 'security',
      titleTemplate: 'Security rotation for {{service}}',
      contentTemplate:
        '{{service}} credentials rotate at {{time}} by {{owner}}.',
      remark: 'Strict parameter rendering test.',
    });

    expect(template.params).toEqual(['owner', 'service', 'time']);
    await expect(
      service.renderNoticeTemplate(template.code, {
        templateParams: { owner: 'Platform', service: 'API', time: '09:00' },
      }),
    ).resolves.toEqual({
      code: template.code,
      title: 'Security rotation for API',
      content: 'API credentials rotate at 09:00 by Platform.',
      params: ['owner', 'service', 'time'],
    });
    await expect(
      service.renderNoticeTemplate(template.code, {
        templateParams: { service: 'API', time: '09:00' },
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.renderNoticeTemplate(template.code, {
        templateParams: {
          owner: 'Platform',
          service: 'API',
          time: '09:00',
          extra: 'blocked',
        },
      }),
    ).rejects.toThrow(BadRequestException);

    const notice = await service.createNoticeFromTemplate(template.code, {
      audience: 'admin',
      createdBy: 'admin',
      pinned: true,
      templateParams: { owner: 'Platform', service: 'API', time: '09:00' },
    });

    expect(notice).toMatchObject({
      title: 'Security rotation for API',
      content: 'API credentials rotate at 09:00 by Platform.',
      type: 'security',
      audience: 'admin',
      pinned: true,
      status: 'draft',
    });

    await expect(
      service.testSendNoticeTemplate(template.code, {
        createdBy: 'admin',
        recipientUserId: 'user_admin',
        templateParams: { owner: 'Platform', service: 'API', time: '09:00' },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        delivery: expect.objectContaining({
          channel: 'in_app',
          providerStatus: 'sent',
          userId: 'user_admin',
          username: 'admin',
        }),
        notice: expect.objectContaining({
          status: 'published',
          title: 'Security rotation for API',
        }),
        rendered: expect.objectContaining({
          content: 'API credentials rotate at 09:00 by Platform.',
        }),
      }),
    );
    await expect(
      service.listAllNoticeDeliveries({ username: 'admin' }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            title: 'Security rotation for API',
            userId: 'user_admin',
          }),
        ]),
      }),
    );

    await expect(
      service.updateNoticeTemplate(template.code, { enabled: false }),
    ).resolves.toMatchObject({ enabled: false });
    await expect(
      service.renderNoticeTemplate(template.code, {
        templateParams: { owner: 'Platform', service: 'API', time: '09:00' },
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.deleteNoticeTemplate(template.code)).resolves.toEqual({
      deleted: true,
    });
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
      service.listNoticeReadUsers('notice_welcome', { page: 1, pageSize: 5 }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            userId,
            username: userId,
            displayName: userId,
            readAt: expect.any(String),
          }),
        ],
        total: 1,
      }),
    );
    await expect(
      service.markNoticesRead('user_admin', { ids: ['notice_welcome'] }),
    ).resolves.toEqual(
      expect.objectContaining({
        ids: ['notice_welcome'],
        markedReadCount: 1,
      }),
    );
    await expect(
      service.listNoticeDeliveries('notice_welcome', { readStatus: true }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            noticeId: 'notice_welcome',
            username: 'admin',
            status: 'read',
            readAt: expect.any(String),
          }),
        ],
        total: 1,
      }),
    );
    await expect(
      service.listNoticeReadUsers('missing_notice', { page: 1, pageSize: 5 }),
    ).rejects.toThrow('System notice not found');
    await expect(
      service.listNoticeInbox(userId, { readStatus: false }),
    ).resolves.toEqual(expect.objectContaining({ total: 0 }));
  });

  it('publishes notice inbox realtime snapshot, publish and read events', async () => {
    const realtime = new SystemNoticeRealtimeService();
    const service = new SystemNoticeService(
      new SeedSystemNoticeRepository(),
      realtime,
    );
    const userId = 'user_operator';
    const events: string[] = [];
    const unsubscribe = service.subscribeNoticeInboxEvents(userId, (event) => {
      events.push(event.type);
    });

    await expect(service.createNoticeRealtimeSnapshot(userId)).resolves.toEqual(
      expect.objectContaining({
        type: 'snapshot',
        userId,
        unreadCount: 1,
        notices: [expect.objectContaining({ id: 'notice_welcome' })],
      }),
    );

    const notice = await service.createNotice({
      title: 'Realtime notice',
      content: 'Realtime notice content.',
      type: 'announcement',
      audience: 'admin',
      createdBy: 'admin',
    });
    await expect(service.publishNotice(notice.id)).resolves.toMatchObject({
      status: 'published',
    });
    await expect(
      service.markNoticesRead(userId, { ids: ['notice_welcome'] }),
    ).resolves.toMatchObject({
      unreadCount: 1,
    });
    unsubscribe();
    await service.markAllNoticesRead(userId);

    expect(events).toEqual(['notice.published', 'notice.read']);
  });

  describe('PrismaSystemNoticeRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemNoticeService(
      new PrismaSystemNoticeRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const title = `System notice ${testRunId}`;
    const inboxTitle = `System notice inbox ${testRunId}`;
    const templateCode = `notice.template.${testRunId}`;
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

    it('persists notice templates and creates notices from templates through Prisma', async () => {
      const template = await service.createNoticeTemplate({
        code: templateCode,
        name: 'Prisma Notice Template',
        type: 'maintenance',
        titleTemplate: 'Maintenance {{window}}',
        contentTemplate: 'Maintenance owner {{owner}} starts {{window}}.',
      });

      expect(template.params).toEqual(['owner', 'window']);
      await expect(
        service.listNoticeTemplates({ type: 'maintenance', enabled: true }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ code: templateCode }),
          ]),
        }),
      );
      await expect(
        service.renderNoticeTemplate(templateCode, {
          templateParams: { owner: 'Ops', window: '02:00 UTC' },
        }),
      ).resolves.toMatchObject({
        title: 'Maintenance 02:00 UTC',
        content: 'Maintenance owner Ops starts 02:00 UTC.',
      });
      await expect(
        service.createNoticeFromTemplate(templateCode, {
          audience: 'admin',
          createdBy: 'admin',
          templateParams: { owner: 'Ops', window: '02:00 UTC' },
        }),
      ).resolves.toMatchObject({
        title: 'Maintenance 02:00 UTC',
        content: 'Maintenance owner Ops starts 02:00 UTC.',
        type: 'maintenance',
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
        service.listNoticeDeliveries(notice.id, {
          readStatus: false,
          username: `notice_inbox_${testRunId}`,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              noticeId: notice.id,
              username: `notice_inbox_${testRunId}`,
              status: 'delivered',
              channel: 'in_app',
              providerStatus: 'pending',
            }),
          ],
          total: 1,
        }),
      );
      await expect(
        service.listNoticeDeliveries(notice.id, {
          providerStatus: 'not-provider-status',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.dispatchNotice(notice.id)).resolves.toMatchObject({
        noticeId: notice.id,
        channel: 'in_app',
        deliveredCount: 0,
        pendingCount: expect.any(Number),
      });
      await expect(service.executeNoticeDeliveries(notice.id)).resolves.toEqual(
        expect.objectContaining({
          noticeId: notice.id,
          provider: 'in_app.local',
          attemptedCount: expect.any(Number),
          sentCount: expect.any(Number),
          pendingCount: 0,
          queuedOutboxCount: 0,
        }),
      );
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
        service.listNoticeDeliveries(notice.id, {
          readStatus: true,
          username: `notice_inbox_${testRunId}`,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              noticeId: notice.id,
              username: `notice_inbox_${testRunId}`,
              status: 'read',
              readAt: expect.any(String),
            }),
          ],
          total: 1,
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
      await expect(
        service.listNoticeReadUsers(notice.id, { page: 1, pageSize: 5 }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              userId: inboxUserId,
              username: `notice_inbox_${testRunId}`,
              displayName: 'Notice Inbox Test User',
              readAt: expect.any(String),
            }),
          ],
          total: 1,
        }),
      );
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemNoticeDelivery.deleteMany({
        where: { userId: inboxUserId },
      });
      await prisma.systemNoticeReadReceipt.deleteMany({
        where: { userId: inboxUserId },
      });
      await prisma.systemNoticeTemplate.deleteMany({
        where: { code: templateCode },
      });
      await prisma.systemNotice.deleteMany({
        where: { title: { in: [title, inboxTitle, 'Maintenance 02:00 UTC'] } },
      });
      await prisma.user.deleteMany({
        where: { id: inboxUserId },
      });
    }
  });
});

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
