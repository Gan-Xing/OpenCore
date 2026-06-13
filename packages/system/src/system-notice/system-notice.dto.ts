import { ApiProperty } from '@nestjs/swagger';
import type {
  SystemNoticeAudience,
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
