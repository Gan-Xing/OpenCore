import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  CreateSystemNoticeDto,
  MarkSystemNoticesReadDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type { SystemNoticeRecord } from './system-notice.records';
import {
  assertNoticeCanPublish,
  assertNoticeNotArchived,
  createSystemNoticeInboxRecord,
  createSystemNoticePageResult,
  normalizeCreateSystemNoticeInput,
  normalizeMarkSystemNoticesReadInput,
  normalizeSystemNoticeInboxFilters,
  normalizeSystemNoticeFilters,
  normalizeSystemNoticePageQuery,
  normalizeUnreadNoticeLimit,
  normalizeUpdateSystemNoticeInput,
  SystemNoticeRepository,
  toSystemNoticeAudience,
  toSystemNoticeStatus,
  toSystemNoticeType,
  type SystemNoticeInboxPageQuery,
  type SystemNoticeInboxRecord,
  type SystemNoticeReadMutationResult,
  type SystemNoticePageQuery,
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

    return {
      ids,
      markedReadCount: result.count,
      unreadCount: await this.countUnreadNoticeInbox(userId),
    };
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

  private async findNoticeById(id: string): Promise<PrismaSystemNotice> {
    const notice = await this.prisma.systemNotice.findUnique({ where: { id } });

    if (!notice) {
      throw new NotFoundException(`System notice not found: ${id}`);
    }

    return notice;
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
