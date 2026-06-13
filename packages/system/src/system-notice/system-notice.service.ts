import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  CreateSystemNoticeFromTemplateDto,
  MarkSystemNoticesReadDto,
  CreateSystemNoticeDto,
  CreateSystemNoticeTemplateDto,
  RenderSystemNoticeTemplateDto,
  SystemNoticeDeliveryExecuteDto,
  SystemNoticeDispatchDto,
  UpdateSystemNoticeTemplateDto,
  UpdateSystemNoticeDto,
} from './system-notice.dto';
import type {
  SystemNoticeDeliveryRecord,
  SystemNoticeRecord,
  SystemNoticeTemplateRecord,
} from './system-notice.records';
import {
  createSystemNoticeExportPreview,
  renderSystemNoticeTemplate,
  SystemNoticeRepository,
  type SystemNoticeInboxPageQuery,
  type SystemNoticeInboxRecord,
  type SystemNoticeReadUserRecord,
  type SystemNoticeReadUsersPageQuery,
  type SystemNoticeReadMutationResult,
  type SystemNoticeDeliveryMutationResult,
  type SystemNoticeDeliveryExecutionResult,
  type SystemNoticeDeliveryPageQuery,
  type SystemNoticeExportPreview,
  type SystemNoticePageQuery,
  type SystemNoticeTemplateOptionRecord,
  type SystemNoticeTemplatePageQuery,
  type SystemNoticeTemplateRenderRecord,
} from './system-notice.repository';
import {
  createSystemNoticeRealtimeEvent,
  SystemNoticeRealtimeService,
  type SystemNoticeRealtimeEvent,
  type SystemNoticeRealtimeEventType,
  type SystemNoticeRealtimeListener,
} from './system-notice.realtime';

@Injectable()
export class SystemNoticeService {
  constructor(
    private readonly repository: SystemNoticeRepository,
    private readonly realtime: SystemNoticeRealtimeService = new SystemNoticeRealtimeService(),
  ) {}

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

  async createNoticeRealtimeSnapshot(
    userId: string,
  ): Promise<SystemNoticeRealtimeEvent> {
    return this.createRealtimeEvent(userId, 'snapshot');
  }

  subscribeNoticeInboxEvents(
    userId: string,
    listener: SystemNoticeRealtimeListener,
  ): () => void {
    return this.realtime.subscribe(userId, listener);
  }

  async markNoticesRead(
    userId: string,
    body: MarkSystemNoticesReadDto,
  ): Promise<SystemNoticeReadMutationResult> {
    const result = await this.repository.markNoticesRead(userId, body);
    await this.publishRealtimeEvent(userId, 'notice.read', result.ids);

    return result;
  }

  async markAllNoticesRead(
    userId: string,
  ): Promise<SystemNoticeReadMutationResult> {
    const result = await this.repository.markAllNoticesRead(userId);
    await this.publishRealtimeEvent(userId, 'notice.read', result.ids);

    return result;
  }

  listNoticeReadUsers(
    id: string,
    query: SystemNoticeReadUsersPageQuery = {},
  ): Promise<PageResult<SystemNoticeReadUserRecord>> {
    return this.repository.listNoticeReadUsers(id, query);
  }

  listNoticeDeliveries(
    id: string,
    query: SystemNoticeDeliveryPageQuery = {},
  ): Promise<PageResult<SystemNoticeDeliveryRecord>> {
    return this.repository.listNoticeDeliveries(id, query);
  }

  dispatchNotice(
    id: string,
    body?: SystemNoticeDispatchDto,
  ): Promise<SystemNoticeDeliveryMutationResult> {
    return this.repository.dispatchNotice(id, body);
  }

  executeNoticeDeliveries(
    id: string,
    body?: SystemNoticeDeliveryExecuteDto,
  ): Promise<SystemNoticeDeliveryExecutionResult> {
    return this.repository.executeNoticeDeliveries(id, body);
  }

  listNoticeTemplates(
    query: SystemNoticeTemplatePageQuery = {},
  ): Promise<PageResult<SystemNoticeTemplateRecord>> {
    return this.repository.listNoticeTemplates(query);
  }

  listNoticeTemplateOptions(): Promise<
    readonly SystemNoticeTemplateOptionRecord[]
  > {
    return this.repository.listNoticeTemplateOptions();
  }

  getNoticeTemplate(code: string): Promise<SystemNoticeTemplateRecord> {
    return this.repository.getNoticeTemplate(code);
  }

  async renderNoticeTemplate(
    code: string,
    body: RenderSystemNoticeTemplateDto = {},
  ): Promise<SystemNoticeTemplateRenderRecord> {
    return renderSystemNoticeTemplate(
      await this.repository.getNoticeTemplate(code),
      body,
    );
  }

  createNoticeTemplate(
    body: CreateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord> {
    return this.repository.createNoticeTemplate(body);
  }

  updateNoticeTemplate(
    code: string,
    body: UpdateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRecord> {
    return this.repository.updateNoticeTemplate(code, body);
  }

  deleteNoticeTemplate(code: string): Promise<{ deleted: true }> {
    return this.repository.deleteNoticeTemplate(code);
  }

  createNoticeFromTemplate(
    code: string,
    body: CreateSystemNoticeFromTemplateDto,
  ): Promise<SystemNoticeRecord> {
    return this.repository.createNoticeFromTemplate(code, body);
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

  async publishNotice(id: string): Promise<SystemNoticeRecord> {
    const notice = await this.repository.publishNotice(id);
    await this.publishRealtimeEventToSubscribers('notice.published', [
      notice.id,
    ]);

    return notice;
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

  private async publishRealtimeEvent(
    userId: string,
    type: SystemNoticeRealtimeEventType,
    noticeIds: readonly string[] = [],
  ): Promise<void> {
    this.realtime.publish(
      userId,
      await this.createRealtimeEvent(userId, type, noticeIds),
    );
  }

  private async publishRealtimeEventToSubscribers(
    type: SystemNoticeRealtimeEventType,
    noticeIds: readonly string[] = [],
  ): Promise<void> {
    await Promise.all(
      this.realtime
        .getSubscribedUserIds()
        .map((userId) => this.publishRealtimeEvent(userId, type, noticeIds)),
    );
  }

  private async createRealtimeEvent(
    userId: string,
    type: SystemNoticeRealtimeEventType,
    noticeIds: readonly string[] = [],
  ): Promise<SystemNoticeRealtimeEvent> {
    const [unreadCount, notices] = await Promise.all([
      this.repository.countUnreadNoticeInbox(userId),
      this.repository.listUnreadNoticeInbox(userId, 10),
    ]);

    return createSystemNoticeRealtimeEvent({
      type,
      userId,
      unreadCount,
      noticeIds,
      notices,
    });
  }
}
