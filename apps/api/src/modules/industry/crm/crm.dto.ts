import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export const CRM_TARGET_TYPES = [
  'lead',
  'customer',
  'contact',
  'opportunity',
] as const;
export const CRM_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
  'archived',
] as const;
export const CRM_CUSTOMER_STATUSES = [
  'active',
  'inactive',
  'churned',
  'archived',
] as const;
export const CRM_OPPORTUNITY_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;
export const CRM_TASK_STATUSES = ['open', 'done', 'canceled'] as const;
export const CRM_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const CRM_FOLLOW_UP_METHODS = [
  'call',
  'email',
  'meeting',
  'wechat',
  'note',
] as const;

export type CrmTargetType = (typeof CRM_TARGET_TYPES)[number];
export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];
export type CrmCustomerStatus = (typeof CRM_CUSTOMER_STATUSES)[number];
export type CrmOpportunityStage = (typeof CRM_OPPORTUNITY_STAGES)[number];
export type CrmTaskStatus = (typeof CRM_TASK_STATUSES)[number];
export type CrmTaskPriority = (typeof CRM_TASK_PRIORITIES)[number];
export type CrmFollowUpMethod = (typeof CRM_FOLLOW_UP_METHODS)[number];

export class CrmTagDto {
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

export class CrmLeadDto {
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

  @ApiProperty({ enum: CRM_LEAD_STATUSES })
  status!: CrmLeadStatus;

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

export class CrmCustomerDto {
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

  @ApiProperty({ enum: CRM_CUSTOMER_STATUSES })
  status!: CrmCustomerStatus;

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

export class CrmContactDto {
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

export class CrmOpportunityDto {
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

  @ApiProperty({ enum: CRM_OPPORTUNITY_STAGES })
  stage!: CrmOpportunityStage;

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

export class CrmFollowUpDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: CRM_FOLLOW_UP_METHODS })
  method!: CrmFollowUpMethod;

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

export class CrmTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  assignee!: string;

  @ApiProperty({ enum: CRM_TASK_STATUSES })
  status!: CrmTaskStatus;

  @ApiProperty({ enum: CRM_TASK_PRIORITIES })
  priority!: CrmTaskPriority;

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

export class CrmAttachmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

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

export class CrmOwnerTransferDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

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

export class CrmAuditEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

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

export class CrmPageDto<T> {
  items!: readonly T[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
}

export class CrmTagPageDto extends CrmPageDto<CrmTagDto> {
  @ApiProperty({ type: [CrmTagDto] })
  declare items: readonly CrmTagDto[];
}

export class CrmLeadPageDto extends CrmPageDto<CrmLeadDto> {
  @ApiProperty({ type: [CrmLeadDto] })
  declare items: readonly CrmLeadDto[];
}

export class CrmCustomerPageDto extends CrmPageDto<CrmCustomerDto> {
  @ApiProperty({ type: [CrmCustomerDto] })
  declare items: readonly CrmCustomerDto[];
}

export class CrmContactPageDto extends CrmPageDto<CrmContactDto> {
  @ApiProperty({ type: [CrmContactDto] })
  declare items: readonly CrmContactDto[];
}

export class CrmOpportunityPageDto extends CrmPageDto<CrmOpportunityDto> {
  @ApiProperty({ type: [CrmOpportunityDto] })
  declare items: readonly CrmOpportunityDto[];
}

export class CrmFollowUpPageDto extends CrmPageDto<CrmFollowUpDto> {
  @ApiProperty({ type: [CrmFollowUpDto] })
  declare items: readonly CrmFollowUpDto[];
}

export class CrmTaskPageDto extends CrmPageDto<CrmTaskDto> {
  @ApiProperty({ type: [CrmTaskDto] })
  declare items: readonly CrmTaskDto[];
}

export class CrmAttachmentPageDto extends CrmPageDto<CrmAttachmentDto> {
  @ApiProperty({ type: [CrmAttachmentDto] })
  declare items: readonly CrmAttachmentDto[];
}

export class CrmOwnerTransferPageDto extends CrmPageDto<CrmOwnerTransferDto> {
  @ApiProperty({ type: [CrmOwnerTransferDto] })
  declare items: readonly CrmOwnerTransferDto[];
}

export class CrmAuditEventPageDto extends CrmPageDto<CrmAuditEventDto> {
  @ApiProperty({ type: [CrmAuditEventDto] })
  declare items: readonly CrmAuditEventDto[];
}

export class CrmSummaryBucketDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  count!: number;
}

export class CrmSummaryDto {
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

  @ApiProperty({ type: [CrmSummaryBucketDto] })
  leadsByStatus!: readonly CrmSummaryBucketDto[];

  @ApiProperty({ type: [CrmSummaryBucketDto] })
  customersByLevel!: readonly CrmSummaryBucketDto[];

  @ApiProperty({ type: [CrmSummaryBucketDto] })
  opportunitiesByStage!: readonly CrmSummaryBucketDto[];
}

export class CrmExportPreviewDto {
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

export class CrmTagQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  enabled?: string;
}

export class CrmLeadQueryDto extends PageQueryDto {
  @ApiProperty({ enum: CRM_LEAD_STATUSES, required: false })
  status?: CrmLeadStatus;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class CrmCustomerQueryDto extends PageQueryDto {
  @ApiProperty({ enum: CRM_CUSTOMER_STATUSES, required: false })
  status?: CrmCustomerStatus;

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

export class CrmContactQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class CrmOpportunityQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ enum: CRM_OPPORTUNITY_STAGES, required: false })
  stage?: CrmOpportunityStage;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ required: false })
  includeArchived?: string;
}

export class CrmTargetQueryDto extends PageQueryDto {
  @ApiProperty({ enum: CRM_TARGET_TYPES, required: false })
  targetType?: CrmTargetType;

  @ApiProperty({ required: false })
  targetId?: string;
}

export class CrmTaskQueryDto extends CrmTargetQueryDto {
  @ApiProperty({ enum: CRM_TASK_STATUSES, required: false })
  status?: CrmTaskStatus;

  @ApiProperty({ required: false })
  assignee?: string;
}

export class CrmExportQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['leads', 'customers', 'contacts', 'opportunities', 'tasks'],
  })
  resource!: 'leads' | 'customers' | 'contacts' | 'opportunities' | 'tasks';
}

export class CreateCrmTagDto {
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

export class UpdateCrmTagDto {
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

export class CreateCrmLeadDto {
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

export class UpdateCrmLeadDto {
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

  @ApiProperty({ enum: CRM_LEAD_STATUSES, required: false })
  status?: CrmLeadStatus;

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

export class ConvertCrmLeadDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  opportunityName?: string;

  @ApiProperty({ required: false })
  amount?: string;
}

export class CreateCrmCustomerDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ required: false })
  level?: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ required: false })
  status?: CrmCustomerStatus;

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

export class UpdateCrmCustomerDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ enum: CRM_CUSTOMER_STATUSES, required: false })
  status?: CrmCustomerStatus;

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

export class CreateCrmContactDto {
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

export class UpdateCrmContactDto {
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

export class CreateCrmOpportunityDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ enum: CRM_OPPORTUNITY_STAGES, required: false })
  stage?: CrmOpportunityStage;

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

export class UpdateCrmOpportunityDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ enum: CRM_OPPORTUNITY_STAGES, required: false })
  stage?: CrmOpportunityStage;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty({ required: false })
  probability?: number;

  @ApiProperty({ required: false })
  expectedCloseAt?: string | null;

  @ApiProperty({ required: false })
  closeReason?: string | null;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  remark?: string | null;
}

export class ChangeCrmOpportunityStageDto {
  @ApiProperty({ enum: CRM_OPPORTUNITY_STAGES })
  stage!: CrmOpportunityStage;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  closeReason?: string;
}

export class TransferCrmOwnerDto {
  @ApiProperty()
  toOwner!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;
}

export class CreateCrmFollowUpDto {
  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: CRM_FOLLOW_UP_METHODS })
  method!: CrmFollowUpMethod;

  @ApiProperty()
  content!: string;

  @ApiProperty({ required: false })
  outcome?: string;

  @ApiProperty({ required: false })
  nextContactAt?: string;

  @ApiProperty()
  createdBy!: string;
}

export class CreateCrmTaskDto {
  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  assignee!: string;

  @ApiProperty({ enum: CRM_TASK_PRIORITIES, required: false })
  priority?: CrmTaskPriority;

  @ApiProperty({ required: false })
  dueAt?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  createdBy!: string;
}

export class CompleteCrmTaskDto {
  @ApiProperty()
  actor!: string;
}

export class CreateCrmAttachmentDto {
  @ApiProperty({ enum: CRM_TARGET_TYPES })
  targetType!: CrmTargetType;

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
