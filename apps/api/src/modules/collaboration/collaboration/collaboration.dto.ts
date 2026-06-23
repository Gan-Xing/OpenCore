import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export { PageQueryDto };

export class DeleteResultDto {
  @ApiProperty()
  deleted!: true;
}

export class CollaborationTimelineEntryDto {
  @ApiProperty()
  at!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty()
  action!: string;
}

export class MessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  sender!: string;

  @ApiProperty()
  recipient!: string;

  @ApiProperty({ enum: ['unread', 'read', 'archived', 'deleted'] })
  status!: 'unread' | 'read' | 'archived' | 'deleted';

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ required: false })
  businessId?: string;

  @ApiProperty({ required: false })
  readAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty({ required: false })
  deletedAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class MessagePageDto {
  @ApiProperty({ type: [MessageDto] })
  items!: readonly MessageDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class MessageQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['unread', 'read', 'archived'],
    required: false,
  })
  status?: 'unread' | 'read' | 'archived';

  @ApiProperty({ required: false })
  recipient?: string;
}

export class CreateMessageDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  sender!: string;

  @ApiProperty()
  recipient!: string;

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ required: false })
  businessId?: string;
}

export class CollaborationMessageSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  unread!: number;

  @ApiProperty()
  read!: number;

  @ApiProperty()
  archived!: number;
}

export class NoticeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status!: 'draft' | 'published' | 'archived';

  @ApiProperty({ type: [String] })
  targetAudience!: readonly string[];

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
}

export class NoticePageDto {
  @ApiProperty({ type: [NoticeDto] })
  items!: readonly NoticeDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class NoticeQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['draft', 'published', 'archived'],
    required: false,
  })
  status?: 'draft' | 'published' | 'archived';
}

export class CreateNoticeDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ type: [String] })
  targetAudience!: string[];

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ required: false })
  validFrom?: string;

  @ApiProperty({ required: false })
  validTo?: string;
}

export class CollaborationNoticeSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  published!: number;

  @ApiProperty()
  archived!: number;
}

export class TodoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ required: false })
  businessId?: string;

  @ApiProperty()
  assignee!: string;

  @ApiProperty({ enum: ['pending', 'assigned', 'completed', 'canceled'] })
  status!: 'pending' | 'assigned' | 'completed' | 'canceled';

  @ApiProperty({ type: [CollaborationTimelineEntryDto] })
  timeline!: readonly CollaborationTimelineEntryDto[];

  @ApiProperty({ required: false })
  completedAt?: string;

  @ApiProperty({ required: false })
  canceledAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class TodoPageDto {
  @ApiProperty({ type: [TodoDto] })
  items!: readonly TodoDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TodoQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['pending', 'assigned', 'completed', 'canceled'],
    required: false,
  })
  status?: 'pending' | 'assigned' | 'completed' | 'canceled';

  @ApiProperty({ required: false })
  assignee?: string;

  @ApiProperty({ required: false })
  sourceType?: string;
}

export class CreateTodoDto {
  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ required: false })
  businessId?: string;

  @ApiProperty()
  assignee!: string;

  @ApiProperty()
  actor!: string;
}

export class AssignTodoDto {
  @ApiProperty()
  assignee!: string;

  @ApiProperty()
  actor!: string;
}

export class TodoActionDto {
  @ApiProperty()
  actor!: string;
}

export class CollaborationTodoSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  assigned!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  canceled!: number;
}

export class ApprovalLiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  requester!: string;

  @ApiProperty()
  approver!: string;

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ required: false })
  businessId?: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty({ type: [CollaborationTimelineEntryDto] })
  timeline!: readonly CollaborationTimelineEntryDto[];

  @ApiProperty({ required: false })
  decidedAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class ApprovalLitePageDto {
  @ApiProperty({ type: [ApprovalLiteDto] })
  items!: readonly ApprovalLiteDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ApprovalLiteQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['pending', 'approved', 'rejected'],
    required: false,
  })
  status?: 'pending' | 'approved' | 'rejected';

  @ApiProperty({ required: false })
  requester?: string;

  @ApiProperty({ required: false })
  approver?: string;
}

export class CreateApprovalLiteDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  requester!: string;

  @ApiProperty()
  approver!: string;

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ required: false })
  businessId?: string;
}

export class DecideApprovalLiteDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  comment?: string;
}

export class CollaborationApprovalSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  rejected!: number;
}

export class CollaborationSummaryDto {
  @ApiProperty({ type: CollaborationMessageSummaryDto })
  messages!: CollaborationMessageSummaryDto;

  @ApiProperty({ type: CollaborationNoticeSummaryDto })
  notices!: CollaborationNoticeSummaryDto;

  @ApiProperty({ type: CollaborationTodoSummaryDto })
  todos!: CollaborationTodoSummaryDto;

  @ApiProperty({ type: CollaborationApprovalSummaryDto })
  approvals!: CollaborationApprovalSummaryDto;
}
