import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type { Prisma } from '@prisma/client';
import type {
  CreateSystemNoticeFromTemplateDto,
  CreateSystemNoticeDto,
  CreateSystemNoticeTemplateDto,
  MarkSystemNoticesReadDto,
  SystemNoticeDeliveryExecuteDto,
  SystemNoticeDispatchDto,
  UpdateSystemNoticeTemplateDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type {
  SystemNoticeDeliveryChannel,
  SystemNoticeDeliveryProvider,
  SystemNoticeDeliveryRecord,
  SystemNoticeRecord,
  SystemNoticeTemplateRecord,
} from './system-notice.records';
import {
  assertNoticeCanDispatch,
  assertNoticeCanPublish,
  assertNoticeNotArchived,
  createSystemNoticeInboxRecord,
  createSystemNoticePageResult,
  createSystemNoticeFromTemplateInput,
  normalizeCreateSystemNoticeInput,
  normalizeCreateSystemNoticeTemplateInput,
  normalizeMarkSystemNoticesReadInput,
  normalizeSystemNoticeDeliveryChannelInput,
  normalizeSystemNoticeDeliveryFilters,
  normalizeSystemNoticeInboxFilters,
  normalizeSystemNoticeFilters,
  normalizeSystemNoticePageQuery,
  normalizeSystemNoticeTemplateFilters,
  normalizeUnreadNoticeLimit,
  normalizeUpdateSystemNoticeTemplateInput,
  normalizeUpdateSystemNoticeInput,
  getSystemNoticeDeliveryProvider,
  SystemNoticeRepository,
  toSystemNoticeDeliveryChannel,
  toSystemNoticeDeliveryProvider,
  toSystemNoticeDeliveryProviderStatus,
  toSystemNoticeDeliveryStatus,
  toSystemNoticeAudience,
  toSystemNoticeStatus,
  toSystemNoticeType,
  type SystemNoticeDeliveryMutationResult,
  type SystemNoticeDeliveryExecutionResult,
  type SystemNoticeDeliveryPageQuery,
  type SystemNoticeInboxPageQuery,
  type SystemNoticeInboxRecord,
  type SystemNoticeReadUserRecord,
  type SystemNoticeReadUsersPageQuery,
  type SystemNoticeReadMutationResult,
  type SystemNoticePageQuery,
  type SystemNoticeTemplateOptionRecord,
  type SystemNoticeTemplatePageQuery,
} from './system-notice.repository';

type PrismaSystemNotice = {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  audience: string;
  pinned: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaSystemNoticeWithReadReceipt = PrismaSystemNotice & {
  readReceipts: readonly {
    readAt: Date;
  }[];
};

type PrismaSystemNoticeReadReceiptWithUser = {
  readAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
};

type PrismaSystemNoticeDelivery = {
  id: string;
  noticeId: string;
  userId: string;
  username: string;
  displayName: string;
  channel: string;
  status: string;
  provider: string;
  providerStatus: string;
  recipient: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  title: string;
  content: string;
  type: string;
  audience: string;
  deliveredAt: Date;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  lastError: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaSystemNoticeTemplate = {
  id: string;
  code: string;
  name: string;
  type: string;
  titleTemplate: string;
  contentTemplate: string;
  params: Prisma.JsonValue;
  enabled: boolean;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaNoticeDeliveryRecipient = {
  id: string;
  username: string;
  displayName: string;
};

@Injectable()
export class PrismaSystemNoticeRepository extends SystemNoticeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listNotices(
    query: SystemNoticePageQuery = {},
  ): Promise<PageResult<SystemNoticeRecord>> {
    const filters = normalizeSystemNoticeFilters(query);
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.audience ? { audience: filters.audience } : {}),
    };
    const total = await this.prisma.systemNotice.count({ where });
    const pagination = normalizeSystemNoticePageQuery(query, total);
    const rows = await this.prisma.systemNotice.findMany({
      where,
      orderBy: [
        { pinned: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
        { title: 'asc' },
      ],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemNoticePageResult(
      rows.map(toSystemNoticeRecord),
      pagination,
    );
  }

  async listNoticeInbox(
    userId: string,
    query: SystemNoticeInboxPageQuery = {},
  ): Promise<PageResult<SystemNoticeInboxRecord>> {
    const filters = normalizeSystemNoticeInboxFilters(query);
    const where = createInboxWhere(userId, filters);
    const total = await this.prisma.systemNotice.count({ where });
    const pagination = normalizeSystemNoticePageQuery(query, total);
    const rows = await this.prisma.systemNotice.findMany({
      where,
      include: createReadReceiptInclude(userId),
      orderBy: [
        { pinned: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
        { title: 'asc' },
      ],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemNoticePageResult(
      rows.map(toSystemNoticeInboxRecord),
      pagination,
    );
  }

  async getNoticeInboxItem(
    userId: string,
    id: string,
  ): Promise<SystemNoticeInboxRecord> {
    const notice = await this.prisma.systemNotice.findFirst({
      where: {
        id,
        ...createInboxWhere(userId, {}),
      },
      include: createReadReceiptInclude(userId),
    });

    if (!notice) {
      throw new NotFoundException(`System notice not found in inbox: ${id}`);
    }

    return toSystemNoticeInboxRecord(notice);
  }

  async listUnreadNoticeInbox(
    userId: string,
    limit?: number | string,
  ): Promise<readonly SystemNoticeInboxRecord[]> {
    const take = normalizeUnreadNoticeLimit(limit);
    const rows = await this.prisma.systemNotice.findMany({
      where: createInboxWhere(userId, { readStatus: false }),
      include: createReadReceiptInclude(userId),
      orderBy: [
        { pinned: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
        { title: 'asc' },
      ],
      take,
    });

    return rows.map(toSystemNoticeInboxRecord);
  }

  async countUnreadNoticeInbox(userId: string): Promise<number> {
    return this.prisma.systemNotice.count({
      where: createInboxWhere(userId, { readStatus: false }),
    });
  }

  async markNoticesRead(
    userId: string,
    body: MarkSystemNoticesReadDto,
  ): Promise<SystemNoticeReadMutationResult> {
    const ids = normalizeMarkSystemNoticesReadInput(body);
    await this.assertInboxNoticeIdsVisible(userId, ids);
    const now = new Date();
    const result = await this.prisma.systemNoticeReadReceipt.createMany({
      data: ids.map((noticeId) => ({
        noticeId,
        userId,
        readAt: now,
      })),
      skipDuplicates: true,
    });
    await this.markDeliveriesRead(userId, ids, now);

    return {
      ids,
      markedReadCount: result.count,
      unreadCount: await this.countUnreadNoticeInbox(userId),
    };
  }

  async markAllNoticesRead(
    userId: string,
  ): Promise<SystemNoticeReadMutationResult> {
    const unreadRows = await this.prisma.systemNotice.findMany({
      where: createInboxWhere(userId, { readStatus: false }),
      select: { id: true },
    });
    const ids = unreadRows.map((row) => row.id);
    const now = new Date();
    const result =
      ids.length === 0
        ? { count: 0 }
        : await this.prisma.systemNoticeReadReceipt.createMany({
            data: ids.map((noticeId) => ({
              noticeId,
              userId,
              readAt: now,
            })),
            skipDuplicates: true,
          });
    await this.markDeliveriesRead(userId, ids, now);

    return {
      ids,
      markedReadCount: result.count,
      unreadCount: await this.countUnreadNoticeInbox(userId),
    };
  }

  async listNoticeReadUsers(
    id: string,
    query: SystemNoticeReadUsersPageQuery = {},
  ): Promise<PageResult<SystemNoticeReadUserRecord>> {
    await this.findNoticeById(id);
    const total = await this.prisma.systemNoticeReadReceipt.count({
      where: { noticeId: id },
    });
    const pagination = normalizeSystemNoticePageQuery(query, total);
    const rows = await this.prisma.systemNoticeReadReceipt.findMany({
      where: { noticeId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ readAt: 'desc' }, { userId: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemNoticePageResult(
      rows.map(toSystemNoticeReadUserRecord),
      pagination,
    );
  }

  async listNoticeDeliveries(
    id: string,
    query: SystemNoticeDeliveryPageQuery = {},
  ): Promise<PageResult<SystemNoticeDeliveryRecord>> {
    await this.findNoticeById(id);
    const filters = normalizeSystemNoticeDeliveryFilters(query);
    const where: Prisma.SystemNoticeDeliveryWhereInput = {
      noticeId: id,
      ...(filters.channel ? { channel: filters.channel } : {}),
      ...(filters.providerStatus
        ? { providerStatus: filters.providerStatus }
        : {}),
      ...(filters.readStatus === true ? { readAt: { not: null } } : {}),
      ...(filters.readStatus === false ? { readAt: null } : {}),
      ...(filters.username
        ? {
            OR: [
              { username: { contains: filters.username, mode: 'insensitive' } },
              {
                displayName: {
                  contains: filters.username,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    const total = await this.prisma.systemNoticeDelivery.count({ where });
    const pagination = normalizeSystemNoticePageQuery(query, total);
    const rows = await this.prisma.systemNoticeDelivery.findMany({
      where,
      orderBy: [{ deliveredAt: 'desc' }, { username: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemNoticePageResult(
      rows.map(toSystemNoticeDeliveryRecord),
      pagination,
    );
  }

  async dispatchNotice(
    id: string,
    body: SystemNoticeDispatchDto = {},
  ): Promise<SystemNoticeDeliveryMutationResult> {
    const notice = toSystemNoticeRecord(await this.findNoticeById(id));
    assertNoticeCanDispatch(notice.status);
    return this.dispatchPublishedNotice(
      notice,
      normalizeSystemNoticeDeliveryChannelInput(body.channel),
    );
  }

  async executeNoticeDeliveries(
    id: string,
    body: SystemNoticeDeliveryExecuteDto = {},
  ): Promise<SystemNoticeDeliveryExecutionResult> {
    const notice = toSystemNoticeRecord(await this.findNoticeById(id));
    assertNoticeCanDispatch(notice.status);
    return this.executePendingDeliveries(
      notice.id,
      normalizeSystemNoticeDeliveryChannelInput(body.channel),
    );
  }

  async listNoticeTemplates(
    query: SystemNoticeTemplatePageQuery = {},
  ): Promise<PageResult<SystemNoticeTemplateRecord>> {
    const filters = normalizeSystemNoticeTemplateFilters(query);
    const where = {
      ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
      ...(filters.type ? { type: filters.type } : {}),
    };
    const total = await this.prisma.systemNoticeTemplate.count({ where });
    const pagination = normalizeSystemNoticePageQuery(query, total);
    const rows = await this.prisma.systemNoticeTemplate.findMany({
      where,
      orderBy: [{ enabled: 'desc' }, { code: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemNoticePageResult(
      rows.map(toSystemNoticeTemplateRecord),
      pagination,
    );
  }

  async listNoticeTemplateOptions(): Promise<
    readonly SystemNoticeTemplateOptionRecord[]
  > {
    const rows = await this.prisma.systemNoticeTemplate.findMany({
      where: { enabled: true },
      orderBy: [{ code: 'asc' }],
    });

    return rows.map((row) => {
      const template = toSystemNoticeTemplateRecord(row);
      return {
        code: template.code,
        name: template.name,
        params: template.params,
        type: template.type,
      };
    });
  }

  async getNoticeTemplate(code: string): Promise<SystemNoticeTemplateRecord> {
    return toSystemNoticeTemplateRecord(
      await this.findNoticeTemplateByCode(code),
    );
  }

  async createNoticeTemplate(
    body: CreateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord> {
    const input = normalizeCreateSystemNoticeTemplateInput(body);

    if (
      await this.prisma.systemNoticeTemplate.findUnique({
        where: { code: input.code },
        select: { code: true },
      })
    ) {
      throw new ConflictException(
        `System notice template already exists: ${input.code}`,
      );
    }

    const template = await this.prisma.systemNoticeTemplate.create({
      data: {
        ...input,
        params: [...input.params] as Prisma.InputJsonValue,
      },
    });

    return toSystemNoticeTemplateRecord(template);
  }

  async updateNoticeTemplate(
    code: string,
    body: UpdateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord> {
    const existing = toSystemNoticeTemplateRecord(
      await this.findNoticeTemplateByCode(code),
    );
    const input = normalizeUpdateSystemNoticeTemplateInput(existing, body);
    const template = await this.prisma.systemNoticeTemplate.update({
      where: { code },
      data: {
        ...input,
        params: [...input.params] as Prisma.InputJsonValue,
      },
    });

    return toSystemNoticeTemplateRecord(template);
  }

  async deleteNoticeTemplate(code: string): Promise<{ deleted: true }> {
    await this.findNoticeTemplateByCode(code);
    await this.prisma.systemNoticeTemplate.delete({ where: { code } });
    return { deleted: true };
  }

  async createNoticeFromTemplate(
    code: string,
    body: CreateSystemNoticeFromTemplateDto,
  ): Promise<SystemNoticeRecord> {
    const input = createSystemNoticeFromTemplateInput(
      toSystemNoticeTemplateRecord(await this.findNoticeTemplateByCode(code)),
      body,
    );
    return this.createNotice(input);
  }

  async getNotice(id: string): Promise<SystemNoticeRecord> {
    return toSystemNoticeRecord(await this.findNoticeById(id));
  }

  async createNotice(body: CreateSystemNoticeDto): Promise<SystemNoticeRecord> {
    const input = normalizeCreateSystemNoticeInput(body);

    if (
      await this.prisma.systemNotice.findFirst({
        where: { title: input.title, createdBy: input.createdBy },
      })
    ) {
      throw new ConflictException(
        `System notice already exists: ${input.title}`,
      );
    }

    const notice = await this.prisma.systemNotice.create({
      data: {
        ...input,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validTo: input.validTo ? new Date(input.validTo) : null,
      },
    });

    return toSystemNoticeRecord(notice);
  }

  async updateNotice(
    id: string,
    body: UpdateSystemNoticeDto,
  ): Promise<SystemNoticeRecord> {
    const existing = toSystemNoticeRecord(await this.findNoticeById(id));
    assertNoticeNotArchived(existing.status, 'updated');
    const input = normalizeUpdateSystemNoticeInput(existing, body);
    const notice = await this.prisma.systemNotice.update({
      where: { id },
      data: {
        ...input,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validTo: input.validTo ? new Date(input.validTo) : null,
      },
    });

    return toSystemNoticeRecord(notice);
  }

  async publishNotice(id: string): Promise<SystemNoticeRecord> {
    const existing = toSystemNoticeRecord(await this.findNoticeById(id));
    assertNoticeCanPublish(existing.status);
    const now = new Date();
    const notice = await this.prisma.systemNotice.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: now,
        archivedAt: null,
      },
    });
    await this.dispatchPublishedNotice(toSystemNoticeRecord(notice), 'in_app');

    return toSystemNoticeRecord(notice);
  }

  async archiveNotice(id: string): Promise<SystemNoticeRecord> {
    const existing = toSystemNoticeRecord(await this.findNoticeById(id));
    assertNoticeNotArchived(existing.status, 'archived');
    const notice = await this.prisma.systemNotice.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return toSystemNoticeRecord(notice);
  }

  async deleteNotice(id: string): Promise<{ deleted: true }> {
    await this.findNoticeById(id);
    await this.prisma.systemNotice.delete({ where: { id } });
    return { deleted: true };
  }

  private async dispatchPublishedNotice(
    notice: SystemNoticeRecord,
    channel: SystemNoticeDeliveryChannel,
  ): Promise<SystemNoticeDeliveryMutationResult> {
    assertNoticeCanDispatch(notice.status);
    const provider = getSystemNoticeDeliveryProvider(channel);
    const recipients = await this.findNoticeRecipients();
    const existingRows = await this.prisma.systemNoticeDelivery.findMany({
      where: {
        noticeId: notice.id,
        channel,
      },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingRows.map((row) => row.userId));
    const pendingRecipients = recipients.filter(
      (recipient) => !existingUserIds.has(recipient.id),
    );
    const deliveredAt = new Date();

    if (pendingRecipients.length > 0) {
      await this.prisma.systemNoticeDelivery.createMany({
        data: pendingRecipients.map((recipient) => ({
          noticeId: notice.id,
          userId: recipient.id,
          username: recipient.username,
          displayName: recipient.displayName,
          channel,
          status: 'delivered',
          provider,
          providerStatus: 'pending',
          recipient: createNoticeDeliveryRecipient(channel, recipient),
          attemptCount: 0,
          title: notice.title,
          content: notice.content,
          type: notice.type,
          audience: notice.audience,
          deliveredAt,
        })),
        skipDuplicates: true,
      });
    }

    return {
      noticeId: notice.id,
      channel,
      provider,
      deliveredCount: pendingRecipients.length,
      skippedCount: recipients.length - pendingRecipients.length,
      totalRecipientCount: recipients.length,
      attemptedCount: 0,
      sentCount: 0,
      failedCount: 0,
      pendingCount: await this.countNoticeDeliveriesByProviderStatus(
        notice.id,
        channel,
        provider,
        'pending',
      ),
    };
  }

  private async executePendingDeliveries(
    noticeId: string,
    channel: SystemNoticeDeliveryChannel,
  ): Promise<SystemNoticeDeliveryExecutionResult> {
    const provider = getSystemNoticeDeliveryProvider(channel);
    if (channel !== 'in_app') {
      await this.assertIntegrationProviderReady(provider, channel);
    }

    const executableRows = await this.prisma.systemNoticeDelivery.findMany({
      where: {
        noticeId,
        channel,
        provider,
        providerStatus: { in: ['pending', 'failed'] },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        recipient: true,
        title: true,
        content: true,
        type: true,
        audience: true,
      },
      orderBy: [{ deliveredAt: 'asc' }, { username: 'asc' }],
    });
    const totalRows = await this.prisma.systemNoticeDelivery.count({
      where: {
        noticeId,
        channel,
        provider,
      },
    });
    const now = new Date();
    let queuedOutboxCount = 0;

    if (executableRows.length > 0) {
      if (channel === 'in_app') {
        await this.prisma.systemNoticeDelivery.updateMany({
          where: {
            id: { in: executableRows.map((row) => row.id) },
          },
          data: {
            providerStatus: 'sent',
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
            sentAt: now,
            lastError: null,
          },
        });
      } else {
        queuedOutboxCount = await this.enqueueNoticeIntegrationOutbox(
          noticeId,
          channel,
          provider,
          executableRows,
          now,
        );
      }
    }

    return {
      noticeId,
      channel,
      provider,
      attemptedCount: executableRows.length,
      sentCount: executableRows.length,
      failedCount: 0,
      skippedCount: totalRows - executableRows.length,
      pendingCount: await this.countNoticeDeliveriesByProviderStatus(
        noticeId,
        channel,
        provider,
        'pending',
      ),
      queuedOutboxCount,
    };
  }

  private async countNoticeDeliveriesByProviderStatus(
    noticeId: string,
    channel: SystemNoticeDeliveryChannel,
    provider: SystemNoticeDeliveryProvider,
    providerStatus: string,
  ): Promise<number> {
    return this.prisma.systemNoticeDelivery.count({
      where: {
        noticeId,
        channel,
        provider,
        providerStatus,
      },
    });
  }

  private async assertIntegrationProviderReady(
    provider: SystemNoticeDeliveryProvider,
    channel: Exclude<SystemNoticeDeliveryChannel, 'in_app'>,
  ): Promise<void> {
    const integrationProvider =
      await this.prisma.integrationProvider.findUnique({
        where: { code: provider },
        select: { code: true, enabled: true, type: true },
      });

    if (!integrationProvider) {
      throw new BadRequestException(
        `Integration provider is not configured for notice delivery: ${provider}`,
      );
    }

    if (integrationProvider.type !== channel) {
      throw new BadRequestException(
        `Integration provider ${provider} is not a ${channel} provider.`,
      );
    }

    if (!integrationProvider.enabled) {
      throw new BadRequestException(
        `Integration provider ${provider} must be enabled before notice delivery execution.`,
      );
    }
  }

  private async enqueueNoticeIntegrationOutbox(
    noticeId: string,
    channel: Exclude<SystemNoticeDeliveryChannel, 'in_app'>,
    provider: SystemNoticeDeliveryProvider,
    rows: readonly {
      id: string;
      username: string;
      displayName: string;
      recipient: string | null;
      title: string;
      content: string;
      type: string;
      audience: string;
    }[],
    now: Date,
  ): Promise<number> {
    let queuedOutboxCount = 0;

    for (const row of rows) {
      const recipient =
        row.recipient ??
        createExternalNoticeDeliveryRecipient(channel, {
          username: row.username,
        });

      assertNoticeDeliveryRecipient(channel, recipient);

      const outbox = await this.prisma.integrationOutbox.create({
        data: {
          channel,
          providerCode: provider,
          templateCode: null,
          recipient,
          payload: {
            audience: row.audience,
            deliveryId: row.id,
            displayName: row.displayName,
            noticeId,
            title: row.title,
            type: row.type,
            username: row.username,
          } satisfies Prisma.InputJsonObject,
          status: 'queued',
          retryCount: 0,
          preview: row.content,
        },
        select: { id: true },
      });
      queuedOutboxCount += 1;

      await this.prisma.systemNoticeDelivery.update({
        where: { id: row.id },
        data: {
          providerStatus: 'sent',
          recipient,
          providerMessageId: outbox.id,
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
          sentAt: now,
          lastError: null,
        },
      });
    }

    return queuedOutboxCount;
  }

  private async findNoticeRecipients(): Promise<
    readonly PrismaNoticeDeliveryRecipient[]
  > {
    return this.prisma.user.findMany({
      where: { enabled: true },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
      orderBy: [{ username: 'asc' }],
    });
  }

  private async markDeliveriesRead(
    userId: string,
    noticeIds: readonly string[],
    readAt: Date,
  ): Promise<void> {
    if (noticeIds.length === 0) {
      return;
    }

    await this.prisma.systemNoticeDelivery.updateMany({
      where: {
        userId,
        noticeId: { in: [...noticeIds] },
        channel: 'in_app',
        readAt: null,
      },
      data: {
        status: 'read',
        readAt,
      },
    });
  }

  private async findNoticeById(id: string): Promise<PrismaSystemNotice> {
    const notice = await this.prisma.systemNotice.findUnique({ where: { id } });

    if (!notice) {
      throw new NotFoundException(`System notice not found: ${id}`);
    }

    return notice;
  }

  private async findNoticeTemplateByCode(
    code: string,
  ): Promise<PrismaSystemNoticeTemplate> {
    const template = await this.prisma.systemNoticeTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      throw new NotFoundException(`System notice template not found: ${code}`);
    }

    return template;
  }

  private async assertInboxNoticeIdsVisible(
    userId: string,
    ids: readonly string[],
  ): Promise<void> {
    const rows = await this.prisma.systemNotice.findMany({
      where: {
        id: { in: [...ids] },
        ...createInboxWhere(userId, {}),
      },
      select: { id: true },
    });
    const foundIds = new Set(rows.map((row) => row.id));
    const missingId = ids.find((id) => !foundIds.has(id));

    if (missingId) {
      throw new NotFoundException(
        `System notice not found in inbox: ${missingId}`,
      );
    }
  }
}

function toSystemNoticeRecord(notice: PrismaSystemNotice): SystemNoticeRecord {
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    type: toSystemNoticeType(notice.type),
    status: toSystemNoticeStatus(notice.status),
    audience: toSystemNoticeAudience(notice.audience),
    pinned: notice.pinned,
    validFrom: notice.validFrom?.toISOString(),
    validTo: notice.validTo?.toISOString(),
    publishedAt: notice.publishedAt?.toISOString(),
    archivedAt: notice.archivedAt?.toISOString(),
    createdBy: notice.createdBy,
    createdAt: notice.createdAt.toISOString(),
    updatedAt: notice.updatedAt.toISOString(),
  };
}

function toSystemNoticeInboxRecord(
  notice: PrismaSystemNoticeWithReadReceipt,
): SystemNoticeInboxRecord {
  return createSystemNoticeInboxRecord(
    toSystemNoticeRecord(notice),
    notice.readReceipts[0]?.readAt.toISOString(),
  );
}

function toSystemNoticeReadUserRecord(
  receipt: PrismaSystemNoticeReadReceiptWithUser,
): SystemNoticeReadUserRecord {
  return {
    userId: receipt.user.id,
    username: receipt.user.username,
    displayName: receipt.user.displayName,
    readAt: receipt.readAt.toISOString(),
  };
}

function toSystemNoticeDeliveryRecord(
  delivery: PrismaSystemNoticeDelivery,
): SystemNoticeDeliveryRecord {
  return {
    id: delivery.id,
    noticeId: delivery.noticeId,
    userId: delivery.userId,
    username: delivery.username,
    displayName: delivery.displayName,
    channel: toSystemNoticeDeliveryChannel(delivery.channel),
    status: toSystemNoticeDeliveryStatus(delivery.status),
    provider: toSystemNoticeDeliveryProvider(delivery.provider),
    providerStatus: toSystemNoticeDeliveryProviderStatus(
      delivery.providerStatus,
    ),
    recipient: delivery.recipient ?? undefined,
    providerMessageId: delivery.providerMessageId ?? undefined,
    attemptCount: delivery.attemptCount,
    title: delivery.title,
    content: delivery.content,
    type: toSystemNoticeType(delivery.type),
    audience: toSystemNoticeAudience(delivery.audience),
    deliveredAt: delivery.deliveredAt.toISOString(),
    lastAttemptAt: delivery.lastAttemptAt?.toISOString(),
    sentAt: delivery.sentAt?.toISOString(),
    lastError: delivery.lastError ?? undefined,
    readAt: delivery.readAt?.toISOString(),
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
  };
}

function createNoticeDeliveryRecipient(
  channel: SystemNoticeDeliveryChannel,
  recipient: Pick<PrismaNoticeDeliveryRecipient, 'username'>,
): string | undefined {
  if (channel === 'mail') {
    return `${normalizeRecipientLocalPart(recipient.username)}@opencore.local`;
  }

  if (channel === 'sms') {
    return `+1555${createStableNumericSuffix(recipient.username)}`;
  }

  return undefined;
}

function createExternalNoticeDeliveryRecipient(
  channel: Exclude<SystemNoticeDeliveryChannel, 'in_app'>,
  recipient: Pick<PrismaNoticeDeliveryRecipient, 'username'>,
): string {
  return channel === 'mail'
    ? `${normalizeRecipientLocalPart(recipient.username)}@opencore.local`
    : `+1555${createStableNumericSuffix(recipient.username)}`;
}

function assertNoticeDeliveryRecipient(
  channel: Exclude<SystemNoticeDeliveryChannel, 'in_app'>,
  recipient: string,
): void {
  if (channel === 'mail' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
    throw new BadRequestException(
      `Notice mail delivery recipient is invalid: ${recipient}`,
    );
  }

  if (channel === 'sms' && !/^\+?[0-9]{6,20}$/.test(recipient)) {
    throw new BadRequestException(
      `Notice SMS delivery recipient is invalid: ${recipient}`,
    );
  }
}

function normalizeRecipientLocalPart(username: string): string {
  const normalized = username
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');

  return normalized || 'user';
}

function createStableNumericSuffix(value: string): string {
  const sum = [...value].reduce(
    (current, character) => current + character.charCodeAt(0),
    0,
  );

  return String(sum % 10000000).padStart(7, '0');
}

function toSystemNoticeTemplateRecord(
  template: PrismaSystemNoticeTemplate,
): SystemNoticeTemplateRecord {
  return {
    id: template.id,
    code: template.code,
    name: template.name,
    type: toSystemNoticeType(template.type),
    titleTemplate: template.titleTemplate,
    contentTemplate: template.contentTemplate,
    params: normalizeStoredTemplateParams(template.params, template.code),
    enabled: template.enabled,
    remark: template.remark ?? undefined,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function normalizeStoredTemplateParams(
  value: Prisma.JsonValue,
  code: string,
): readonly string[] {
  const params = value;

  if (
    !Array.isArray(params) ||
    !params.every((entry): entry is string => typeof entry === 'string')
  ) {
    throw new Error(`Invalid system notice template params: ${code}`);
  }

  return [...params].sort((left, right) => left.localeCompare(right));
}

function createInboxWhere(
  userId: string,
  filters: { readStatus?: boolean; type?: string },
) {
  return {
    status: 'published',
    audience: { in: ['all', 'admin'] },
    ...(filters.type ? { type: filters.type } : {}),
    AND: [
      {
        OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
      },
      {
        OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
      },
      ...(filters.readStatus === true
        ? [{ readReceipts: { some: { userId } } }]
        : []),
      ...(filters.readStatus === false
        ? [{ readReceipts: { none: { userId } } }]
        : []),
    ],
  };
}

function createReadReceiptInclude(userId: string) {
  return {
    readReceipts: {
      where: { userId },
      select: { readAt: true },
      take: 1,
    },
  };
}
