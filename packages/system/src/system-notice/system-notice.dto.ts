import { ApiProperty } from '@nestjs/swagger';
import type {
  SystemNoticeAudience,
  SystemNoticeDeliveryChannel,
  SystemNoticeDeliveryProvider,
  SystemNoticeDeliveryProviderStatus,
  SystemNoticeDeliveryStatus,
  SystemNoticeTemplateRecord,
  SystemNoticeStatus,
  SystemNoticeType,
} from './system-notice.records';

export class SystemNoticeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['announcement', 'maintenance', 'security'] })
  type!: SystemNoticeType;

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status!: SystemNoticeStatus;

  @ApiProperty({ enum: ['all', 'admin'] })
  audience!: SystemNoticeAudience;

  @ApiProperty()
  pinned!: boolean;

  @ApiProperty({ required: false })
  validFrom?: string;

  @ApiProperty({ required: false })
  validTo?: string;

  @ApiProperty({ required: false })
  publishedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SystemNoticePageDto {
  @ApiProperty({ type: [SystemNoticeDto] })
  items!: readonly SystemNoticeDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemNoticeInboxItemDto extends SystemNoticeDto {
  @ApiProperty()
  read!: boolean;

  @ApiProperty({ required: false })
  readAt?: string;
}

export class SystemNoticeInboxPageDto {
  @ApiProperty({ type: [SystemNoticeInboxItemDto] })
  items!: readonly SystemNoticeInboxItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemNoticeUnreadCountDto {
  @ApiProperty()
  unreadCount!: number;
}

export class SystemNoticeRealtimeEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ['snapshot', 'notice.published', 'notice.read'],
  })
  type!: 'notice.published' | 'notice.read' | 'snapshot';

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty({ type: [String] })
  noticeIds!: readonly string[];

  @ApiProperty({ type: [SystemNoticeInboxItemDto] })
  notices!: readonly SystemNoticeInboxItemDto[];

  @ApiProperty()
  generatedAt!: string;
}

export class SystemNoticeReadUserDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  readAt!: string;
}

export class SystemNoticeReadUserPageDto {
  @ApiProperty({ type: [SystemNoticeReadUserDto] })
  items!: readonly SystemNoticeReadUserDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemNoticeDeliveryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  noticeId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: ['in_app', 'mail', 'sms'] })
  channel!: SystemNoticeDeliveryChannel;

  @ApiProperty({ enum: ['delivered', 'read'] })
  status!: SystemNoticeDeliveryStatus;

  @ApiProperty({ enum: ['in_app.local', 'mail.sandbox', 'sms.sandbox'] })
  provider!: SystemNoticeDeliveryProvider;

  @ApiProperty({ enum: ['failed', 'pending', 'sent'] })
  providerStatus!: SystemNoticeDeliveryProviderStatus;

  @ApiProperty()
  attemptCount!: number;

  @ApiProperty({ required: false })
  recipient?: string;

  @ApiProperty({ required: false })
  providerMessageId?: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['announcement', 'maintenance', 'security'] })
  type!: SystemNoticeType;

  @ApiProperty({ enum: ['all', 'admin'] })
  audience!: SystemNoticeAudience;

  @ApiProperty()
  deliveredAt!: string;

  @ApiProperty({ required: false })
  lastAttemptAt?: string;

  @ApiProperty({ required: false })
  sentAt?: string;

  @ApiProperty({ required: false })
  lastError?: string;

  @ApiProperty({ required: false })
  readAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SystemNoticeDeliveryPageDto {
  @ApiProperty({ type: [SystemNoticeDeliveryDto] })
  items!: readonly SystemNoticeDeliveryDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemNoticeDispatchDto {
  @ApiProperty({ enum: ['in_app', 'mail', 'sms'], required: false })
  channel?: SystemNoticeDeliveryChannel;
}

export class SystemNoticeDeliveryMutationResultDto {
  @ApiProperty()
  noticeId!: string;

  @ApiProperty({ enum: ['in_app', 'mail', 'sms'] })
  channel!: SystemNoticeDeliveryChannel;

  @ApiProperty({ enum: ['in_app.local', 'mail.sandbox', 'sms.sandbox'] })
  provider!: SystemNoticeDeliveryProvider;

  @ApiProperty()
  deliveredCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty()
  totalRecipientCount!: number;

  @ApiProperty()
  attemptedCount!: number;

  @ApiProperty()
  sentCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  pendingCount!: number;
}

export class SystemNoticeDeliveryExecuteDto {
  @ApiProperty({ enum: ['in_app', 'mail', 'sms'], required: false })
  channel?: SystemNoticeDeliveryChannel;
}

export class SystemNoticeDeliveryExecutionResultDto {
  @ApiProperty()
  noticeId!: string;

  @ApiProperty({ enum: ['in_app', 'mail', 'sms'] })
  channel!: SystemNoticeDeliveryChannel;

  @ApiProperty({ enum: ['in_app.local', 'mail.sandbox', 'sms.sandbox'] })
  provider!: SystemNoticeDeliveryProvider;

  @ApiProperty()
  attemptedCount!: number;

  @ApiProperty()
  sentCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty()
  pendingCount!: number;

  @ApiProperty()
  queuedOutboxCount!: number;
}

export class SystemNoticeTemplateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['announcement', 'maintenance', 'security'] })
  type!: SystemNoticeType;

  @ApiProperty()
  titleTemplate!: string;

  @ApiProperty()
  contentTemplate!: string;

  @ApiProperty({ type: [String] })
  params!: readonly string[];

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SystemNoticeTemplatePageDto {
  @ApiProperty({ type: [SystemNoticeTemplateDto] })
  items!: readonly SystemNoticeTemplateDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemNoticeTemplateOptionDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['announcement', 'maintenance', 'security'] })
  type!: SystemNoticeType;

  @ApiProperty({ type: [String] })
  params!: readonly string[];
}

export class SystemNoticeTemplateRenderDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [String] })
  params!: readonly string[];
}

export class SystemNoticeTemplateTestSendResultDto {
  @ApiProperty({ type: SystemNoticeDto })
  notice!: SystemNoticeDto;

  @ApiProperty({ type: SystemNoticeDeliveryDto })
  delivery!: SystemNoticeDeliveryDto;

  @ApiProperty({ type: SystemNoticeTemplateRenderDto })
  rendered!: SystemNoticeTemplateRenderDto;
}

export class MarkSystemNoticesReadDto {
  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class SystemNoticeReadMutationResultDto {
  @ApiProperty()
  markedReadCount!: number;

  @ApiProperty({ type: [String] })
  ids!: readonly string[];

  @ApiProperty()
  unreadCount!: number;
}

export class SystemNoticeQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false, enum: ['draft', 'published', 'archived'] })
  status?: SystemNoticeStatus | string;

  @ApiProperty({
    required: false,
    enum: ['announcement', 'maintenance', 'security'],
  })
  type?: SystemNoticeType | string;

  @ApiProperty({ required: false, enum: ['all', 'admin'] })
  audience?: SystemNoticeAudience | string;
}

export class SystemNoticeInboxQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({
    required: false,
    enum: ['announcement', 'maintenance', 'security'],
  })
  type?: SystemNoticeType | string;

  @ApiProperty({ required: false })
  readStatus?: boolean | string;
}

export class SystemNoticeReadUsersQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;
}

export class SystemNoticeDeliveryQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false, enum: ['in_app', 'mail', 'sms'] })
  channel?: SystemNoticeDeliveryChannel | string;

  @ApiProperty({ required: false, enum: ['failed', 'pending', 'sent'] })
  providerStatus?: SystemNoticeDeliveryProviderStatus | string;

  @ApiProperty({ required: false })
  readStatus?: boolean | string;

  @ApiProperty({ required: false })
  username?: string;
}

export class SystemNoticeTemplateQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({
    required: false,
    enum: ['announcement', 'maintenance', 'security'],
  })
  type?: SystemNoticeType | string;

  @ApiProperty({ required: false })
  enabled?: boolean | string;
}

export class CreateSystemNoticeDto {
  @ApiProperty({ example: 'Maintenance Window' })
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['announcement', 'maintenance', 'security'] })
  type!: SystemNoticeType;

  @ApiProperty({ required: false, enum: ['all', 'admin'], default: 'all' })
  audience?: SystemNoticeAudience;

  @ApiProperty({ required: false, default: false })
  pinned?: boolean;

  @ApiProperty({ required: false })
  validFrom?: string;

  @ApiProperty({ required: false })
  validTo?: string;

  @ApiProperty({ example: 'admin' })
  createdBy!: string;
}

export class UpdateSystemNoticeDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  content?: string;

  @ApiProperty({
    required: false,
    enum: ['announcement', 'maintenance', 'security'],
  })
  type?: SystemNoticeType;

  @ApiProperty({ required: false, enum: ['all', 'admin'] })
  audience?: SystemNoticeAudience;

  @ApiProperty({ required: false })
  pinned?: boolean;

  @ApiProperty({ required: false })
  validFrom?: string;

  @ApiProperty({ required: false })
  validTo?: string;
}

export class CreateSystemNoticeTemplateDto {
  @ApiProperty({ example: 'release.window' })
  code!: string;

  @ApiProperty({ example: 'Release Window' })
  name!: string;

  @ApiProperty({ enum: ['announcement', 'maintenance', 'security'] })
  type!: SystemNoticeType;

  @ApiProperty({ example: 'Release window: {{version}}' })
  titleTemplate!: string;

  @ApiProperty({
    example: 'Version {{version}} is scheduled for {{window}}.',
  })
  contentTemplate!: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty({ required: false })
  remark?: string;
}

export class UpdateSystemNoticeTemplateDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({
    required: false,
    enum: ['announcement', 'maintenance', 'security'],
  })
  type?: SystemNoticeType;

  @ApiProperty({ required: false })
  titleTemplate?: string;

  @ApiProperty({ required: false })
  contentTemplate?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  remark?: string;
}

export class RenderSystemNoticeTemplateDto {
  @ApiProperty({ required: false })
  templateParams?: Record<string, string | number | boolean>;
}

export class CreateSystemNoticeFromTemplateDto extends RenderSystemNoticeTemplateDto {
  @ApiProperty({ required: false, enum: ['all', 'admin'], default: 'all' })
  audience?: SystemNoticeAudience;

  @ApiProperty({ required: false, default: false })
  pinned?: boolean;

  @ApiProperty({ required: false })
  validFrom?: string;

  @ApiProperty({ required: false })
  validTo?: string;

  @ApiProperty({ example: 'admin' })
  createdBy!: string;
}

export class TestSystemNoticeTemplateDto extends RenderSystemNoticeTemplateDto {
  @ApiProperty({ example: 'user_admin' })
  recipientUserId!: string;

  @ApiProperty({ example: 'admin' })
  createdBy!: string;
}

export type SystemNoticeTemplateOption = Pick<
  SystemNoticeTemplateRecord,
  'code' | 'name' | 'params' | 'type'
>;
