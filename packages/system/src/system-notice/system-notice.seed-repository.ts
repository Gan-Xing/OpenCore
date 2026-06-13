import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import {
  seedSystemNotices,
  type SystemNoticeRecord,
} from './system-notice.records';
import {
  assertNoticeCanPublish,
  assertNoticeNotArchived,
  compareSystemNoticeInboxRecords,
  createSystemNoticeInboxRecord,
  createSystemNoticePageResult,
  isSystemNoticeVisibleInInbox,
  normalizeCreateSystemNoticeInput,
  normalizeMarkSystemNoticesReadInput,
  normalizeSystemNoticeInboxFilters,
  normalizeSystemNoticeFilters,
  normalizeSystemNoticePageQuery,
  normalizeUnreadNoticeLimit,
  normalizeUpdateSystemNoticeInput,
  SystemNoticeRepository,
  type SystemNoticeInboxPageQuery,
  type SystemNoticeInboxRecord,
  type SystemNoticeReadMutationResult,
  type SystemNoticePageQuery,
} from './system-notice.repository';
import type {
  CreateSystemNoticeDto,
  MarkSystemNoticesReadDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';

@Injectable()
export class SeedSystemNoticeRepository extends SystemNoticeRepository {
  private notices = seedSystemNotices.map((notice) => ({ ...notice }));
  private readReceipts = new Map<string, string>();

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

    return {
      ids: unreadIds,
      markedReadCount: unreadIds.length,
      unreadCount: await this.countUnreadNoticeInbox(userId),
    };
  }

  async getNotice(id: string): Promise<SystemNoticeRecord> {
    return { ...this.findNotice(id) };
  }

  async createNotice(body: CreateSystemNoticeDto): Promise<SystemNoticeRecord> {
    const input = normalizeCreateSystemNoticeInput(body);
    const id = `notice_${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`;

    if (this.notices.some((notice) => notice.id === id)) {
      throw new ConflictException(`System notice already exists: ${id}`);
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
    return { deleted: true };
  }

  private findNotice(id: string): SystemNoticeRecord {
    const notice = this.notices.find((candidate) => candidate.id === id);

    if (!notice) {
      throw new NotFoundException(`System notice not found: ${id}`);
    }

    return notice;
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
      throw new NotFoundException(`System notice not found in inbox: ${id}`);
    }

    return notice;
  }
}

function createReadReceiptKey(userId: string, noticeId: string): string {
  return `${userId}:${noticeId}`;
}
