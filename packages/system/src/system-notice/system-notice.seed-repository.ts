import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import {
  seedSystemNotices,
  seedSystemNoticeTemplates,
  type SystemNoticeDeliveryRecord,
  type SystemNoticeRecord,
  type SystemNoticeTemplateRecord,
} from './system-notice.records';
import {
  seedSystemUsers,
  type SystemUserRecord,
} from '../system-user/system-user.records';
import {
  assertNoticeCanDispatch,
  assertNoticeCanPublish,
  assertNoticeNotArchived,
  compareSystemNoticeInboxRecords,
  createSystemNoticeInboxRecord,
  createSystemNoticePageResult,
  createSystemNoticeFromTemplateInput,
  getSystemNoticeDeliveryProvider,
  isSystemNoticeVisibleInInbox,
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
  systemNoticeConflict,
  systemNoticeNotFound,
  SystemNoticeRepository,
  type SystemNoticeDeliveryExecutionResult,
  type SystemNoticeDeliveryMutationResult,
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
import type { SystemNoticeDeliveryChannel } from './system-notice.records';

@Injectable()
export class SeedSystemNoticeRepository extends SystemNoticeRepository {
  private notices = seedSystemNotices.map((notice) => ({ ...notice }));
  private templates: SystemNoticeTemplateRecord[] =
    seedSystemNoticeTemplates.map((template) => ({
      ...template,
      params: [...template.params],
    }));
  private readReceipts = new Map<string, string>();
  private deliveries = new Map<string, SystemNoticeDeliveryRecord>(
    seedSystemNotices
      .filter((notice) => notice.status === 'published')
      .flatMap((notice) =>
        seedSystemUsers
          .filter((user) => user.enabled)
          .map(
            (user) =>
              [
                createDeliveryKey(notice.id, user.id),
                createDeliveryRecord(notice, user, notice.publishedAt),
              ] as const,
          ),
      ),
  );

  async listNotices(
    query: SystemNoticePageQuery = {},
  ): Promise<PageResult<SystemNoticeRecord>> {
    const filters = normalizeSystemNoticeFilters(query);
    const filtered = this.notices.filter(
      (notice) =>
        (!filters.status || notice.status === filters.status) &&
        (!filters.type || notice.type === filters.type) &&
        (!filters.audience || notice.audience === filters.audience),
    );
    const pagination = normalizeSystemNoticePageQuery(query, filtered.length);
    const rows = filtered.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createSystemNoticePageResult(
      rows.map((notice) => ({ ...notice })),
      pagination,
    );
  }

  async listNoticeInbox(
    userId: string,
    query: SystemNoticeInboxPageQuery = {},
  ): Promise<PageResult<SystemNoticeInboxRecord>> {
    const filters = normalizeSystemNoticeInboxFilters(query);
    const rows = this.listVisibleInboxNotices(userId).filter(
      (notice) =>
        (filters.readStatus === undefined ||
          notice.read === filters.readStatus) &&
        (!filters.type || notice.type === filters.type),
    );
    const pagination = normalizeSystemNoticePageQuery(query, rows.length);

    return createSystemNoticePageResult(
      rows.slice(pagination.skip, pagination.skip + pagination.take),
      pagination,
    );
  }

  async getNoticeInboxItem(
    userId: string,
    id: string,
  ): Promise<SystemNoticeInboxRecord> {
    return { ...this.findVisibleInboxNotice(userId, id) };
  }

  async listUnreadNoticeInbox(
    userId: string,
    limit?: number | string,
  ): Promise<readonly SystemNoticeInboxRecord[]> {
    const take = normalizeUnreadNoticeLimit(limit);
    return this.listVisibleInboxNotices(userId)
      .filter((notice) => !notice.read)
      .slice(0, take)
      .map((notice) => ({ ...notice }));
  }

  async countUnreadNoticeInbox(userId: string): Promise<number> {
    return this.listVisibleInboxNotices(userId).filter((notice) => !notice.read)
      .length;
  }

  async markNoticesRead(
    userId: string,
    body: MarkSystemNoticesReadDto,
  ): Promise<SystemNoticeReadMutationResult> {
    const ids = normalizeMarkSystemNoticesReadInput(body);

    for (const id of ids) {
      this.findVisibleInboxNotice(userId, id);
    }

    let markedReadCount = 0;
    const now = new Date().toISOString();

    for (const id of ids) {
      const key = createReadReceiptKey(userId, id);
      if (!this.readReceipts.has(key)) {
        markedReadCount += 1;
      }
      this.readReceipts.set(key, now);
    }
    this.markDeliveriesRead(userId, ids, now);

    return {
      ids,
      markedReadCount,
      unreadCount: await this.countUnreadNoticeInbox(userId),
    };
  }

  async markAllNoticesRead(
    userId: string,
  ): Promise<SystemNoticeReadMutationResult> {
    const unreadIds = this.listVisibleInboxNotices(userId)
      .filter((notice) => !notice.read)
      .map((notice) => notice.id);
    const now = new Date().toISOString();

    for (const id of unreadIds) {
      this.readReceipts.set(createReadReceiptKey(userId, id), now);
    }
    this.markDeliveriesRead(userId, unreadIds, now);

    return {
      ids: unreadIds,
      markedReadCount: unreadIds.length,
      unreadCount: await this.countUnreadNoticeInbox(userId),
    };
  }

  async listNoticeReadUsers(
    id: string,
    query: SystemNoticeReadUsersPageQuery = {},
  ): Promise<PageResult<SystemNoticeReadUserRecord>> {
    this.findNotice(id);
    const rows = [...this.readReceipts.entries()]
      .map(([key, readAt]) => {
        const [userId, noticeId] = key.split(':');
        return { noticeId, readAt, userId };
      })
      .filter((receipt) => receipt.noticeId === id)
      .map((receipt) => {
        const user = seedSystemUsers.find(
          (candidate) => candidate.id === receipt.userId,
        );
        return {
          userId: receipt.userId,
          username: user?.username ?? receipt.userId,
          displayName: user?.displayName ?? receipt.userId,
          readAt: receipt.readAt,
        };
      })
      .sort(compareReadUsers);
    const pagination = normalizeSystemNoticePageQuery(query, rows.length);

    return createSystemNoticePageResult(
      rows.slice(pagination.skip, pagination.skip + pagination.take),
      pagination,
    );
  }

  async listNoticeDeliveries(
    id: string,
    query: SystemNoticeDeliveryPageQuery = {},
  ): Promise<PageResult<SystemNoticeDeliveryRecord>> {
    this.findNotice(id);
    const filters = normalizeSystemNoticeDeliveryFilters(query);
    const rows = [...this.deliveries.values()]
      .filter(
        (delivery) =>
          delivery.noticeId === id &&
          (!filters.channel || delivery.channel === filters.channel) &&
          (filters.readStatus === undefined ||
            Boolean(delivery.readAt) === filters.readStatus) &&
          (!filters.username ||
            delivery.username.includes(filters.username) ||
            delivery.displayName.includes(filters.username)),
      )
      .sort(compareNoticeDeliveries);
    const pagination = normalizeSystemNoticePageQuery(query, rows.length);

    return createSystemNoticePageResult(
      rows
        .slice(pagination.skip, pagination.skip + pagination.take)
        .map((delivery) => ({ ...delivery })),
      pagination,
    );
  }

  async dispatchNotice(
    id: string,
    body: SystemNoticeDispatchDto = {},
  ): Promise<SystemNoticeDeliveryMutationResult> {
    const notice = this.findNotice(id);
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
    const notice = this.findNotice(id);
    assertNoticeCanDispatch(notice.status);
    return this.executePendingDeliveries(
      notice.id,
      normalizeSystemNoticeDeliveryChannelInput(body.channel),
    );
  }

  async getNotice(id: string): Promise<SystemNoticeRecord> {
    return { ...this.findNotice(id) };
  }

  async listNoticeTemplates(
    query: SystemNoticeTemplatePageQuery = {},
  ): Promise<PageResult<SystemNoticeTemplateRecord>> {
    const filters = normalizeSystemNoticeTemplateFilters(query);
    const rows = this.templates
      .filter(
        (template) =>
          (filters.enabled === undefined ||
            template.enabled === filters.enabled) &&
          (!filters.type || template.type === filters.type),
      )
      .sort(compareNoticeTemplates);
    const pagination = normalizeSystemNoticePageQuery(query, rows.length);

    return createSystemNoticePageResult(
      rows
        .slice(pagination.skip, pagination.skip + pagination.take)
        .map(cloneTemplate),
      pagination,
    );
  }

  async listNoticeTemplateOptions(): Promise<
    readonly SystemNoticeTemplateOptionRecord[]
  > {
    return this.templates
      .filter((template) => template.enabled)
      .sort(compareNoticeTemplates)
      .map(({ code, name, params, type }) => ({
        code,
        name,
        params: [...params],
        type,
      }));
  }

  async getNoticeTemplate(code: string): Promise<SystemNoticeTemplateRecord> {
    return cloneTemplate(this.findTemplate(code));
  }

  async createNoticeTemplate(
    body: CreateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord> {
    const input = normalizeCreateSystemNoticeTemplateInput(body);

    if (this.templates.some((template) => template.code === input.code)) {
      throw systemNoticeConflict(
        'SYSTEM_NOTICE_TEMPLATE_ALREADY_EXISTS',
        `System notice template already exists: ${input.code}`,
        { code: input.code },
      );
    }

    const now = new Date().toISOString();
    const template: SystemNoticeTemplateRecord = {
      id: `notice_template_${input.code.replace(/[^a-z0-9]+/g, '_')}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.templates = [template, ...this.templates];
    return cloneTemplate(template);
  }

  async updateNoticeTemplate(
    code: string,
    body: UpdateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord> {
    const template = this.findTemplate(code);
    const input = normalizeUpdateSystemNoticeTemplateInput(template, body);

    Object.assign(template, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    return cloneTemplate(template);
  }

  async deleteNoticeTemplate(code: string): Promise<{ deleted: true }> {
    this.findTemplate(code);
    this.templates = this.templates.filter(
      (template) => template.code !== code,
    );
    return { deleted: true };
  }

  async createNoticeFromTemplate(
    code: string,
    body: CreateSystemNoticeFromTemplateDto,
  ): Promise<SystemNoticeRecord> {
    const input = createSystemNoticeFromTemplateInput(
      this.findTemplate(code),
      body,
    );
    return this.createNotice(input);
  }

  async createNotice(body: CreateSystemNoticeDto): Promise<SystemNoticeRecord> {
    const input = normalizeCreateSystemNoticeInput(body);
    const id = `notice_${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`;

    if (this.notices.some((notice) => notice.id === id)) {
      throw systemNoticeConflict(
        'SYSTEM_NOTICE_ALREADY_EXISTS',
        `System notice already exists: ${id}`,
        { id },
      );
    }

    const now = new Date().toISOString();
    const notice: SystemNoticeRecord = {
      id,
      ...input,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.notices = [notice, ...this.notices];
    return { ...notice };
  }

  async updateNotice(
    id: string,
    body: UpdateSystemNoticeDto,
  ): Promise<SystemNoticeRecord> {
    const notice = this.findNotice(id);
    assertNoticeNotArchived(notice.status, 'updated');
    const input = normalizeUpdateSystemNoticeInput(notice, body);

    Object.assign(notice, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    return { ...notice };
  }

  async publishNotice(id: string): Promise<SystemNoticeRecord> {
    const notice = this.findNotice(id);
    assertNoticeCanPublish(notice.status);
    const now = new Date().toISOString();
    Object.assign(notice, {
      status: 'published' as const,
      publishedAt: now,
      archivedAt: undefined,
      updatedAt: now,
    });
    this.dispatchPublishedNotice(notice, 'in_app');
    return { ...notice };
  }

  async archiveNotice(id: string): Promise<SystemNoticeRecord> {
    const notice = this.findNotice(id);
    assertNoticeNotArchived(notice.status, 'archived');
    const now = new Date().toISOString();
    Object.assign(notice, {
      status: 'archived' as const,
      archivedAt: now,
      updatedAt: now,
    });
    return { ...notice };
  }

  async deleteNotice(id: string): Promise<{ deleted: true }> {
    this.findNotice(id);
    this.notices = this.notices.filter((notice) => notice.id !== id);
    for (const key of this.readReceipts.keys()) {
      if (key.endsWith(`:${id}`)) {
        this.readReceipts.delete(key);
      }
    }
    for (const key of this.deliveries.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.deliveries.delete(key);
      }
    }
    return { deleted: true };
  }

  private dispatchPublishedNotice(
    notice: SystemNoticeRecord,
    channel: SystemNoticeDeliveryChannel,
  ): SystemNoticeDeliveryMutationResult {
    assertNoticeCanDispatch(notice.status);
    const provider = getSystemNoticeDeliveryProvider(channel);
    let deliveredCount = 0;
    const recipients = seedSystemUsers.filter((user) => user.enabled);

    for (const user of recipients) {
      const key = createDeliveryKey(notice.id, user.id, channel);
      if (this.deliveries.has(key)) {
        continue;
      }
      deliveredCount += 1;
      this.deliveries.set(
        key,
        createDeliveryRecord(notice, user, undefined, channel, {
          attemptCount: 0,
          providerStatus: 'pending',
        }),
      );
    }

    return {
      noticeId: notice.id,
      channel,
      provider,
      deliveredCount,
      skippedCount: recipients.length - deliveredCount,
      totalRecipientCount: recipients.length,
      attemptedCount: 0,
      sentCount: 0,
      failedCount: 0,
      pendingCount: this.countProviderStatus(notice.id, channel, 'pending'),
    };
  }

  private executePendingDeliveries(
    noticeId: string,
    channel: SystemNoticeDeliveryChannel,
  ): SystemNoticeDeliveryExecutionResult {
    const provider = getSystemNoticeDeliveryProvider(channel);
    const executableRows = [...this.deliveries.values()].filter(
      (delivery) =>
        delivery.noticeId === noticeId &&
        delivery.channel === channel &&
        delivery.provider === provider &&
        (delivery.providerStatus === 'pending' ||
          delivery.providerStatus === 'failed') &&
        (channel === 'in_app' || !delivery.providerMessageId),
    );
    const now = new Date().toISOString();
    let queuedOutboxCount = 0;

    for (const delivery of executableRows) {
      const providerMessageId =
        channel === 'in_app' ? undefined : `outbox_${delivery.id}`;
      const providerStatus = channel === 'in_app' ? 'sent' : 'pending';
      Object.assign(delivery, {
        providerStatus,
        providerMessageId,
        attemptCount:
          channel === 'in_app'
            ? delivery.attemptCount + 1
            : delivery.attemptCount,
        lastAttemptAt: channel === 'in_app' ? now : undefined,
        sentAt: channel === 'in_app' ? now : undefined,
        lastError: undefined,
        updatedAt: now,
      });
      if (providerMessageId) {
        queuedOutboxCount += 1;
      }
    }

    const totalRows = [...this.deliveries.values()].filter(
      (delivery) =>
        delivery.noticeId === noticeId &&
        delivery.channel === channel &&
        delivery.provider === provider,
    ).length;

    return {
      noticeId,
      channel,
      provider,
      attemptedCount: executableRows.length,
      sentCount: channel === 'in_app' ? executableRows.length : 0,
      failedCount: 0,
      skippedCount: totalRows - executableRows.length,
      pendingCount: this.countProviderStatus(noticeId, channel, 'pending'),
      queuedOutboxCount,
    };
  }

  private countProviderStatus(
    noticeId: string,
    channel: SystemNoticeDeliveryChannel,
    providerStatus: 'failed' | 'pending' | 'sent',
  ): number {
    const provider = getSystemNoticeDeliveryProvider(channel);
    return [...this.deliveries.values()].filter(
      (delivery) =>
        delivery.noticeId === noticeId &&
        delivery.channel === channel &&
        delivery.provider === provider &&
        delivery.providerStatus === providerStatus,
    ).length;
  }

  private markDeliveriesRead(
    userId: string,
    noticeIds: readonly string[],
    readAt: string,
  ): void {
    for (const noticeId of noticeIds) {
      const delivery = this.deliveries.get(createDeliveryKey(noticeId, userId));
      if (delivery && !delivery.readAt) {
        Object.assign(delivery, {
          status: 'read' as const,
          readAt,
          updatedAt: readAt,
        });
      }
    }
  }

  private findNotice(id: string): SystemNoticeRecord {
    const notice = this.notices.find((candidate) => candidate.id === id);

    if (!notice) {
      throw systemNoticeNotFound(
        'SYSTEM_NOTICE_NOT_FOUND',
        `System notice not found: ${id}`,
        { id },
      );
    }

    return notice;
  }

  private findTemplate(code: string): SystemNoticeTemplateRecord {
    const template = this.templates.find(
      (candidate) => candidate.code === code,
    );

    if (!template) {
      throw systemNoticeNotFound(
        'SYSTEM_NOTICE_TEMPLATE_NOT_FOUND',
        `System notice template not found: ${code}`,
        { code },
      );
    }

    return template;
  }

  private listVisibleInboxNotices(userId: string): SystemNoticeInboxRecord[] {
    return this.notices
      .filter((notice) => isSystemNoticeVisibleInInbox(notice))
      .map((notice) =>
        createSystemNoticeInboxRecord(
          notice,
          this.readReceipts.get(createReadReceiptKey(userId, notice.id)),
        ),
      )
      .sort(compareSystemNoticeInboxRecords);
  }

  private findVisibleInboxNotice(
    userId: string,
    id: string,
  ): SystemNoticeInboxRecord {
    const notice = this.listVisibleInboxNotices(userId).find(
      (candidate) => candidate.id === id,
    );

    if (!notice) {
      throw systemNoticeNotFound(
        'SYSTEM_NOTICE_INBOX_NOT_FOUND',
        `System notice not found in inbox: ${id}`,
        { id, userId },
      );
    }

    return notice;
  }
}

function createReadReceiptKey(userId: string, noticeId: string): string {
  return `${userId}:${noticeId}`;
}

function createDeliveryKey(
  noticeId: string,
  userId: string,
  channel: SystemNoticeDeliveryChannel = 'in_app',
): string {
  return `${noticeId}:${userId}:${channel}`;
}

function createDeliveryRecord(
  notice: SystemNoticeRecord,
  user: SystemUserRecord,
  deliveredAt = new Date().toISOString(),
  channel: SystemNoticeDeliveryChannel = 'in_app',
  providerState: Pick<
    SystemNoticeDeliveryRecord,
    'attemptCount' | 'providerStatus'
  > = {
    attemptCount: 1,
    providerStatus: 'sent',
  },
): SystemNoticeDeliveryRecord {
  const provider = getSystemNoticeDeliveryProvider(channel);
  return {
    id: `notice_delivery_${notice.id}_${user.id}_${channel}`,
    noticeId: notice.id,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    channel,
    status: 'delivered',
    provider,
    providerStatus: providerState.providerStatus,
    recipient: createSeedNoticeDeliveryRecipient(channel, user),
    attemptCount: providerState.attemptCount,
    title: notice.title,
    content: notice.content,
    type: notice.type,
    audience: notice.audience,
    deliveredAt,
    lastAttemptAt:
      providerState.attemptCount > 0 && providerState.providerStatus === 'sent'
        ? deliveredAt
        : undefined,
    sentAt:
      providerState.attemptCount > 0 && providerState.providerStatus === 'sent'
        ? deliveredAt
        : undefined,
    createdAt: deliveredAt,
    updatedAt: deliveredAt,
  };
}

function createSeedNoticeDeliveryRecipient(
  channel: SystemNoticeDeliveryChannel,
  user: SystemUserRecord,
): string | undefined {
  if (channel === 'mail') {
    return `${user.username}@opencore.local`;
  }

  if (channel === 'sms') {
    return '+15550000001';
  }

  return undefined;
}

function compareNoticeDeliveries(
  left: SystemNoticeDeliveryRecord,
  right: SystemNoticeDeliveryRecord,
): number {
  return (
    new Date(right.deliveredAt).getTime() -
      new Date(left.deliveredAt).getTime() ||
    left.username.localeCompare(right.username)
  );
}

function compareReadUsers(
  left: SystemNoticeReadUserRecord,
  right: SystemNoticeReadUserRecord,
): number {
  return (
    new Date(right.readAt).getTime() - new Date(left.readAt).getTime() ||
    left.username.localeCompare(right.username)
  );
}

function compareNoticeTemplates(
  left: SystemNoticeTemplateRecord,
  right: SystemNoticeTemplateRecord,
): number {
  return (
    Number(right.enabled) - Number(left.enabled) ||
    left.code.localeCompare(right.code)
  );
}

function cloneTemplate(
  template: SystemNoticeTemplateRecord,
): SystemNoticeTemplateRecord {
  return {
    ...template,
    params: [...template.params],
  };
}
