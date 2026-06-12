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
  createSystemNoticePageResult,
  normalizeCreateSystemNoticeInput,
  normalizeSystemNoticeFilters,
  normalizeSystemNoticePageQuery,
  normalizeUpdateSystemNoticeInput,
  SystemNoticeRepository,
  type SystemNoticePageQuery,
} from './system-notice.repository';
import type {
  CreateSystemNoticeDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';

@Injectable()
export class SeedSystemNoticeRepository extends SystemNoticeRepository {
  private notices = seedSystemNotices.map((notice) => ({ ...notice }));

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
    return { deleted: true };
  }

  private findNotice(id: string): SystemNoticeRecord {
    const notice = this.notices.find((candidate) => candidate.id === id);

    if (!notice) {
      throw new NotFoundException(`System notice not found: ${id}`);
    }

    return notice;
  }
}
