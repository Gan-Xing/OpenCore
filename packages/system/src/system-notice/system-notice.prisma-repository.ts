import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  CreateSystemNoticeDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type { SystemNoticeRecord } from './system-notice.records';
import {
  assertNoticeCanPublish,
  assertNoticeNotArchived,
  createSystemNoticePageResult,
  normalizeCreateSystemNoticeInput,
  normalizeSystemNoticeFilters,
  normalizeSystemNoticePageQuery,
  normalizeUpdateSystemNoticeInput,
  SystemNoticeRepository,
  toSystemNoticeAudience,
  toSystemNoticeStatus,
  toSystemNoticeType,
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
