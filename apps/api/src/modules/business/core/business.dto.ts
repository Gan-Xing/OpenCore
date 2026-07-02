import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export const BUSINESS_TARGET_TYPES = [
  'lead',
  'customer',
  'contact',
  'opportunity',
] as const;
export const BUSINESS_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
  'archived',
] as const;
export const BUSINESS_WRITABLE_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'lost',
] as const;
export const BUSINESS_CUSTOMER_STATUSES = [
  'active',
  'inactive',
  'churned',
  'archived',
] as const;
export const BUSINESS_CUSTOMER_LIFECYCLE_STAGES = [
  'potential',
  'assigned',
  'in_progress',
  'won',
  'fulfillment',
  'renewal',
  'lost',
  'archived',
] as const;
export const BUSINESS_WRITABLE_CUSTOMER_STATUSES = [
  'active',
  'inactive',
  'churned',
] as const;
export const BUSINESS_OPPORTUNITY_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;
export const BUSINESS_OPEN_OPPORTUNITY_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
] as const;
export const BUSINESS_TASK_STATUSES = ['open', 'done', 'canceled'] as const;
export const BUSINESS_TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;
export const BUSINESS_FOLLOW_UP_METHODS = [
  'call',
  'email',
  'meeting',
  'wechat',
  'note',
] as const;

export type BusinessTargetType = (typeof BUSINESS_TARGET_TYPES)[number];
export type BusinessLeadStatus = (typeof BUSINESS_LEAD_STATUSES)[number];
export type BusinessWritableLeadStatus =
  (typeof BUSINESS_WRITABLE_LEAD_STATUSES)[number];
export type BusinessCustomerStatus =
  (typeof BUSINESS_CUSTOMER_STATUSES)[number];
export type BusinessCustomerLifecycleStage =
  (typeof BUSINESS_CUSTOMER_LIFECYCLE_STAGES)[number];
export type BusinessWritableCustomerStatus =
  (typeof BUSINESS_WRITABLE_CUSTOMER_STATUSES)[number];
export type BusinessOpportunityStage =
  (typeof BUSINESS_OPPORTUNITY_STAGES)[number];
export type BusinessOpenOpportunityStage =
  (typeof BUSINESS_OPEN_OPPORTUNITY_STAGES)[number];
export type BusinessTaskStatus = (typeof BUSINESS_TASK_STATUSES)[number];
export type BusinessTaskPriority = (typeof BUSINESS_TASK_PRIORITIES)[number];
export type BusinessFollowUpMethod =
  (typeof BUSINESS_FOLLOW_UP_METHODS)[number];

export class BusinessTagDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessLeadDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  company?: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ enum: BUSINESS_LEAD_STATUSES })
  status!: BusinessLeadStatus;

  @ApiProperty()
  rating!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ type: [String] })
  tags!: readonly string[];

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;

  @ApiProperty({ required: false })
  lastFollowedAt?: string;

  @ApiProperty({ required: false })
  convertedCustomerId?: string;

  @ApiProperty({ required: false })
  convertedOpportunityId?: string;

  @ApiProperty({ required: false })
  convertedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessCustomerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ enum: BUSINESS_CUSTOMER_STATUSES })
  status!: BusinessCustomerStatus;

  @ApiProperty()
  level!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ required: false })
  industry?: string;

  @ApiProperty({ required: false })
  region?: string;

  @ApiProperty({ required: false })
  website?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ type: [String] })
  tags!: readonly string[];

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;

  @ApiProperty({ required: false })
  lastFollowedAt?: string;

  @ApiProperty({ enum: BUSINESS_CUSTOMER_LIFECYCLE_STAGES })
  lifecycleStage!: BusinessCustomerLifecycleStage;

  @ApiProperty({ required: false })
  lifecycleReason?: string;

  @ApiProperty({ required: false })
  lifecycleChangedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty()
  contactCount!: number;

  @ApiProperty()
  opportunityCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessContactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ required: false })
  decisionRole?: string;

  @ApiProperty()
  primary!: boolean;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;

  @ApiProperty({ required: false })
  lastFollowedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessOpportunityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ enum: BUSINESS_OPPORTUNITY_STAGES })
  stage!: BusinessOpportunityStage;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  probability!: number;

  @ApiProperty({ required: false })
  expectedCloseAt?: string;

  @ApiProperty({ required: false })
  closedAt?: string;

  @ApiProperty({ required: false })
  closeReason?: string;

  @ApiProperty({ type: [String] })
  tags!: readonly string[];

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ConvertBusinessLeadResultDto {
  @ApiProperty({ type: BusinessLeadDto })
  lead!: BusinessLeadDto;

  @ApiProperty({ type: BusinessCustomerDto })
  customer!: BusinessCustomerDto;

  @ApiProperty({ type: BusinessOpportunityDto, required: false })
  opportunity?: BusinessOpportunityDto;
}

export class BusinessFollowUpDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: BUSINESS_FOLLOW_UP_METHODS })
  method!: BusinessFollowUpMethod;

  @ApiProperty()
  content!: string;

  @ApiProperty({ required: false })
  outcome?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  assignee!: string;

  @ApiProperty({ enum: BUSINESS_TASK_STATUSES })
  status!: BusinessTaskStatus;

  @ApiProperty({ enum: BUSINESS_TASK_PRIORITIES })
  priority!: BusinessTaskPriority;

  @ApiProperty({ required: false })
  dueAt?: string;

  @ApiProperty({ required: false })
  completedAt?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessAttachmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

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

export class BusinessOwnerTransferDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ required: false })
  fromOwner?: string;

  @ApiProperty()
  toOwner!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  createdAt!: string;
}

export class BusinessAuditEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty()
  detail!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}

export class BusinessActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({
    enum: ['follow-up', 'attachment', 'transfer', 'audit'],
  })
  activityType!: 'follow-up' | 'attachment' | 'transfer' | 'audit';

  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ required: false })
  actor?: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty()
  createdAt!: string;
}

export class BusinessPageDto<T> {
  @ApiProperty()
  items!: readonly T[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BusinessTagPageDto extends BusinessPageDto<BusinessTagDto> {
  @ApiProperty({ type: [BusinessTagDto] })
  declare items: readonly BusinessTagDto[];
}

export class BusinessLeadPageDto extends BusinessPageDto<BusinessLeadDto> {
  @ApiProperty({ type: [BusinessLeadDto] })
  declare items: readonly BusinessLeadDto[];
}

export class BusinessCustomerPageDto extends BusinessPageDto<BusinessCustomerDto> {
  @ApiProperty({ type: [BusinessCustomerDto] })
  declare items: readonly BusinessCustomerDto[];
}

export class BusinessContactPageDto extends BusinessPageDto<BusinessContactDto> {
  @ApiProperty({ type: [BusinessContactDto] })
  declare items: readonly BusinessContactDto[];
}

export class BusinessOpportunityPageDto extends BusinessPageDto<BusinessOpportunityDto> {
  @ApiProperty({ type: [BusinessOpportunityDto] })
  declare items: readonly BusinessOpportunityDto[];
}

export class BusinessActivityPageDto extends BusinessPageDto<BusinessActivityDto> {
  @ApiProperty({ type: [BusinessActivityDto] })
  declare items: readonly BusinessActivityDto[];
}

export class BusinessFollowUpPageDto extends BusinessPageDto<BusinessFollowUpDto> {
  @ApiProperty({ type: [BusinessFollowUpDto] })
  declare items: readonly BusinessFollowUpDto[];
}

export class BusinessTaskPageDto extends BusinessPageDto<BusinessTaskDto> {
  @ApiProperty({ type: [BusinessTaskDto] })
  declare items: readonly BusinessTaskDto[];
}

export class BusinessAttachmentPageDto extends BusinessPageDto<BusinessAttachmentDto> {
  @ApiProperty({ type: [BusinessAttachmentDto] })
  declare items: readonly BusinessAttachmentDto[];
}

export class BusinessOwnerTransferPageDto extends BusinessPageDto<BusinessOwnerTransferDto> {
  @ApiProperty({ type: [BusinessOwnerTransferDto] })
  declare items: readonly BusinessOwnerTransferDto[];
}

export class BusinessAuditEventPageDto extends BusinessPageDto<BusinessAuditEventDto> {
  @ApiProperty({ type: [BusinessAuditEventDto] })
  declare items: readonly BusinessAuditEventDto[];
}

export class BusinessSummaryBucketDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  count!: number;
}

export class BusinessSummaryDto {
  @ApiProperty()
  leads!: number;

  @ApiProperty()
  customers!: number;

  @ApiProperty()
  contacts!: number;

  @ApiProperty()
  opportunities!: number;

  @ApiProperty()
  openTasks!: number;

  @ApiProperty()
  overdueTasks!: number;

  @ApiProperty()
  openPipelineAmount!: string;

  @ApiProperty({ type: [BusinessSummaryBucketDto] })
  leadsByStatus!: readonly BusinessSummaryBucketDto[];

  @ApiProperty({ type: [BusinessSummaryBucketDto] })
  customersByLevel!: readonly BusinessSummaryBucketDto[];

  @ApiProperty({ type: [BusinessSummaryBucketDto] })
  opportunitiesByStage!: readonly BusinessSummaryBucketDto[];
}

export class BusinessExportPreviewDto {
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

export class BusinessTagQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  enabled?: string;
}

export class BusinessLeadQueryDto extends PageQueryDto {
  @ApiProperty({ enum: BUSINESS_LEAD_STATUSES, required: false })
  status?: BusinessLeadStatus;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class BusinessCustomerQueryDto extends PageQueryDto {
  @ApiProperty({ enum: BUSINESS_CUSTOMER_STATUSES, required: false })
  status?: BusinessCustomerStatus;

  @ApiProperty({ required: false })
  level?: string;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class BusinessContactQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class BusinessOpportunityQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ enum: BUSINESS_OPPORTUNITY_STAGES, required: false })
  stage?: BusinessOpportunityStage;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class BusinessTargetQueryDto extends PageQueryDto {
  @ApiProperty({ enum: BUSINESS_TARGET_TYPES, required: false })
  targetType?: BusinessTargetType;

  @ApiProperty({ required: false })
  targetId?: string;
}

export class BusinessTaskQueryDto extends BusinessTargetQueryDto {
  @ApiProperty({ enum: BUSINESS_TASK_STATUSES, required: false })
  status?: BusinessTaskStatus;

  @ApiProperty({ required: false })
  assignee?: string;
}

export class BusinessExportQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['leads', 'customers', 'contacts', 'opportunities', 'tasks'],
  })
  resource!: 'leads' | 'customers' | 'contacts' | 'opportunities' | 'tasks';
}

export class CreateBusinessTagDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;
}

export class UpdateBusinessTagDto {
  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  color?: string | null;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ required: false })
  enabled?: boolean;
}

export class CreateBusinessLeadDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  company?: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ required: false })
  rating?: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;
}

export class UpdateBusinessLeadDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  company?: string | null;

  @ApiProperty({ required: false })
  mobile?: string | null;

  @ApiProperty({ required: false })
  email?: string | null;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ enum: BUSINESS_WRITABLE_LEAD_STATUSES, required: false })
  status?: BusinessWritableLeadStatus;

  @ApiProperty({ required: false })
  rating?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string | null;

  @ApiProperty({ required: false })
  nextContactAt?: string | null;
}

export class ConvertBusinessLeadDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  opportunityName?: string;

  @ApiProperty({ required: false })
  amount?: string;
}

export class CreateBusinessCustomerDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ required: false })
  level?: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ enum: BUSINESS_WRITABLE_CUSTOMER_STATUSES, required: false })
  status?: BusinessWritableCustomerStatus;

  @ApiProperty({ required: false })
  industry?: string;

  @ApiProperty({ required: false })
  region?: string;

  @ApiProperty({ required: false })
  website?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;
}

export class UpdateBusinessCustomerDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ enum: BUSINESS_WRITABLE_CUSTOMER_STATUSES, required: false })
  status?: BusinessWritableCustomerStatus;

  @ApiProperty({ required: false })
  level?: string;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ required: false })
  industry?: string | null;

  @ApiProperty({ required: false })
  region?: string | null;

  @ApiProperty({ required: false })
  website?: string | null;

  @ApiProperty({ required: false })
  phone?: string | null;

  @ApiProperty({ required: false })
  email?: string | null;

  @ApiProperty({ required: false })
  address?: string | null;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string | null;

  @ApiProperty({ required: false })
  nextContactAt?: string | null;
}

export class CreateBusinessContactDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  decisionRole?: string;

  @ApiProperty({ required: false })
  primary?: boolean;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;
}

export class UpdateBusinessContactDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  title?: string | null;

  @ApiProperty({ required: false })
  mobile?: string | null;

  @ApiProperty({ required: false })
  email?: string | null;

  @ApiProperty({ required: false })
  phone?: string | null;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  decisionRole?: string | null;

  @ApiProperty({ required: false })
  primary?: boolean;

  @ApiProperty({ required: false })
  remark?: string | null;

  @ApiProperty({ required: false })
  nextContactAt?: string | null;
}

export class CreateBusinessOpportunityDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ enum: BUSINESS_OPEN_OPPORTUNITY_STAGES, required: false })
  stage?: BusinessOpenOpportunityStage;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty({ required: false })
  probability?: number;

  @ApiProperty({ required: false })
  expectedCloseAt?: string;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string;
}

export class UpdateBusinessOpportunityDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiHideProperty()
  stage?: BusinessOpportunityStage;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty({ required: false })
  probability?: number;

  @ApiProperty({ required: false })
  expectedCloseAt?: string | null;

  @ApiHideProperty()
  closeReason?: string | null;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string | null;
}

export class ChangeBusinessOpportunityStageDto {
  @ApiProperty({ enum: BUSINESS_OPPORTUNITY_STAGES })
  stage!: BusinessOpportunityStage;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  closeReason?: string;
}

export class TransferBusinessOwnerDto {
  @ApiProperty()
  toOwner!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;
}

export class CreateBusinessFollowUpDto {
  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: BUSINESS_FOLLOW_UP_METHODS })
  method!: BusinessFollowUpMethod;

  @ApiProperty()
  content!: string;

  @ApiProperty({ required: false })
  outcome?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;

  @ApiProperty()
  createdBy!: string;
}

export class CreateBusinessTaskDto {
  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  assignee!: string;

  @ApiProperty({ enum: BUSINESS_TASK_PRIORITIES, required: false })
  priority?: BusinessTaskPriority;

  @ApiProperty({ required: false })
  dueAt?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  createdBy!: string;
}

export class CompleteBusinessTaskDto {
  @ApiProperty()
  actor!: string;
}

export class CreateBusinessAttachmentDto {
  @ApiProperty({ enum: BUSINESS_TARGET_TYPES })
  targetType!: BusinessTargetType;

  @ApiProperty()
  targetId!: string;

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
