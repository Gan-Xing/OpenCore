import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export const TICKET_STATUSES = [
  'new',
  'processing',
  'pending_confirmation',
  'resolved',
  'closed',
  'canceled',
] as const;

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export class TicketCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TicketCategoryPageDto {
  @ApiProperty({ type: [TicketCategoryDto] })
  items!: readonly TicketCategoryDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TicketCommentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  author!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TicketTransitionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty({ required: false })
  fromStatus?: TicketStatus;

  @ApiProperty({ enum: TICKET_STATUSES })
  toStatus!: TicketStatus;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty()
  createdAt!: string;
}

export class TicketAttachmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty()
  uploadedBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TicketDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: TICKET_STATUSES })
  status!: TicketStatus;

  @ApiProperty({ enum: TICKET_PRIORITIES })
  priority!: TicketPriority;

  @ApiProperty({ required: false })
  categoryId?: string;

  @ApiProperty({ required: false, type: TicketCategoryDto })
  category?: TicketCategoryDto;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ required: false })
  assignee?: string;

  @ApiProperty({ required: false })
  dueAt?: string;

  @ApiProperty({ required: false })
  firstRespondedAt?: string;

  @ApiProperty({ required: false })
  responseDueAt?: string;

  @ApiProperty({ required: false })
  resolutionDueAt?: string;

  @ApiProperty()
  responseOverdue!: boolean;

  @ApiProperty()
  resolutionOverdue!: boolean;

  @ApiProperty()
  slaBreached!: boolean;

  @ApiProperty({ required: false })
  slaNotifiedAt?: string;

  @ApiProperty({ required: false })
  resolvedAt?: string;

  @ApiProperty({ required: false })
  closedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty({ type: [TicketCommentDto] })
  comments!: readonly TicketCommentDto[];

  @ApiProperty({ type: [TicketTransitionDto] })
  transitions!: readonly TicketTransitionDto[];

  @ApiProperty({ type: [TicketAttachmentDto] })
  attachments!: readonly TicketAttachmentDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TicketPageDto {
  @ApiProperty({ type: [TicketDto] })
  items!: readonly TicketDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TicketCategoryQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  enabled?: string;
}

export class TicketQueryDto extends PageQueryDto {
  @ApiProperty({ enum: TICKET_STATUSES, required: false })
  status?: TicketStatus;

  @ApiProperty({ enum: TICKET_PRIORITIES, required: false })
  priority?: TicketPriority;

  @ApiProperty({ required: false })
  categoryId?: string;

  @ApiProperty({ required: false })
  assignee?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;

  @ApiProperty({ required: false })
  overdue?: string;

  @ApiProperty({ required: false })
  slaBreached?: string;
}

export class CreateTicketCategoryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  order?: number;
}

export class UpdateTicketCategoryDto {
  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  order?: number;
}

export class CreateTicketDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: TICKET_PRIORITIES, required: false })
  priority?: TicketPriority;

  @ApiProperty({ required: false })
  categoryId?: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ required: false })
  assignee?: string;

  @ApiProperty({ required: false })
  dueAt?: string;

  @ApiProperty({ required: false })
  responseDueAt?: string;

  @ApiProperty({ required: false })
  resolutionDueAt?: string;
}

export class UpdateTicketDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: TICKET_PRIORITIES, required: false })
  priority?: TicketPriority;

  @ApiProperty({ required: false })
  categoryId?: string | null;

  @ApiProperty({ required: false })
  assignee?: string | null;

  @ApiProperty({ required: false })
  dueAt?: string | null;

  @ApiProperty({ required: false })
  responseDueAt?: string | null;

  @ApiProperty({ required: false })
  resolutionDueAt?: string | null;
}

export class AssignTicketDto {
  @ApiProperty()
  assignee!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;
}

export class ChangeTicketStatusDto {
  @ApiProperty({ enum: TICKET_STATUSES })
  status!: TicketStatus;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;
}

export class TicketActionDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;
}

export class CreateTicketCommentDto {
  @ApiProperty()
  author!: string;

  @ApiProperty()
  body!: string;
}

export class CreateTicketAttachmentDto {
  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty()
  uploadedBy!: string;
}

export class BatchAssignTicketsDto {
  @ApiProperty({ type: [String] })
  ids!: string[];

  @ApiProperty()
  assignee!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;
}

export class BatchTicketActionDto {
  @ApiProperty({ type: [String] })
  ids!: string[];

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;
}

export class TicketBatchMutationDto {
  @ApiProperty()
  updated!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class TicketSlaReminderDto {
  @ApiProperty()
  scanned!: number;

  @ApiProperty()
  markedOverdue!: number;

  @ApiProperty()
  notified!: number;
}

export class TicketSummaryBucketDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  count!: number;
}

export class TicketDashboardSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  overdue!: number;

  @ApiProperty({ type: [TicketSummaryBucketDto] })
  byAssignee!: readonly TicketSummaryBucketDto[];

  @ApiProperty({ type: [TicketSummaryBucketDto] })
  byCategory!: readonly TicketSummaryBucketDto[];

  @ApiProperty({ type: [TicketSummaryBucketDto] })
  byPriority!: readonly TicketSummaryBucketDto[];

  @ApiProperty({ type: [TicketSummaryBucketDto] })
  byStatus!: readonly TicketSummaryBucketDto[];
}

export class TicketExportPreviewDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentBase64!: string;

  @ApiProperty({ example: 'current-page' })
  scope!: 'current-page';

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  generatedAt!: string;
}

export class TicketTransitionExportQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  ticketId?: string;

  @ApiProperty({ required: false })
  actor?: string;
}
