import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  MarkSystemNoticesReadDto,
  CreateSystemNoticeDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type { SystemNoticeRecord } from './system-notice.records';
import {
  createSystemNoticeExportPreview,
  SystemNoticeRepository,
  type SystemNoticeInboxPageQuery,
  type SystemNoticeInboxRecord,
  type SystemNoticeReadUserRecord,
  type SystemNoticeReadUsersPageQuery,
  type SystemNoticeReadMutationResult,
  type SystemNoticeExportPreview,
  type SystemNoticePageQuery,
} from './system-notice.repository';

@Injectable()
export class SystemNoticeService {
  constructor(private readonly repository: SystemNoticeRepository) {}

  listNotices(
    query: SystemNoticePageQuery = {},
  ): Promise<PageResult<SystemNoticeRecord>> {
    return this.repository.listNotices(query);
  }

  listNoticeInbox(
    userId: string,
    query: SystemNoticeInboxPageQuery = {},
  ): Promise<PageResult<SystemNoticeInboxRecord>> {
    return this.repository.listNoticeInbox(userId, query);
  }

  getNoticeInboxItem(
    userId: string,
    id: string,
  ): Promise<SystemNoticeInboxRecord> {
    return this.repository.getNoticeInboxItem(userId, id);
  }

  listUnreadNoticeInbox(
    userId: string,
    limit?: number | string,
  ): Promise<readonly SystemNoticeInboxRecord[]> {
    return this.repository.listUnreadNoticeInbox(userId, limit);
  }

  countUnreadNoticeInbox(userId: string): Promise<number> {
    return this.repository.countUnreadNoticeInbox(userId);
  }

  markNoticesRead(
    userId: string,
    body: MarkSystemNoticesReadDto,
  ): Promise<SystemNoticeReadMutationResult> {
    return this.repository.markNoticesRead(userId, body);
  }

  markAllNoticesRead(userId: string): Promise<SystemNoticeReadMutationResult> {
    return this.repository.markAllNoticesRead(userId);
  }

  listNoticeReadUsers(
    id: string,
    query: SystemNoticeReadUsersPageQuery = {},
  ): Promise<PageResult<SystemNoticeReadUserRecord>> {
    return this.repository.listNoticeReadUsers(id, query);
  }

  getNotice(id: string): Promise<SystemNoticeRecord> {
    return this.repository.getNotice(id);
  }

  createNotice(body: CreateSystemNoticeDto): Promise<SystemNoticeRecord> {
    return this.repository.createNotice(body);
  }

  updateNotice(
    id: string,
    body: UpdateSystemNoticeDto,
  ): Promise<SystemNoticeRecord> {
    return this.repository.updateNotice(id, body);
  }

  publishNotice(id: string): Promise<SystemNoticeRecord> {
    return this.repository.publishNotice(id);
  }

  archiveNotice(id: string): Promise<SystemNoticeRecord> {
    return this.repository.archiveNotice(id);
  }

  deleteNotice(id: string): Promise<{ deleted: true }> {
    return this.repository.deleteNotice(id);
  }

  async createExportPreview(
    query: SystemNoticePageQuery = {},
  ): Promise<SystemNoticeExportPreview> {
    return createSystemNoticeExportPreview(
      await this.repository.listNotices(query),
    );
  }
}
