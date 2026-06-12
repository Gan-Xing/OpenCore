import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  CreateSystemNoticeDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type { SystemNoticeRecord } from './system-notice.records';
import {
  createSystemNoticeExportPreview,
  SystemNoticeRepository,
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
