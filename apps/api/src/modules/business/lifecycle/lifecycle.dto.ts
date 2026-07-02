import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export const BUSINESS_POOL_TARGET_TYPES = ['lead', 'customer'] as const;
export const BUSINESS_POOL_STATUSES = [
  'available',
  'claimed',
  'assigned',
  'recycled',
  'archived',
] as const;
export const BUSINESS_LIFECYCLE_STAGES = [
  'potential',
  'assigned',
  'in_progress',
  'won',
  'fulfillment',
  'renewal',
  'lost',
  'archived',
] as const;
export const BUSINESS_ASSIGNMENT_ACTIONS = [
  'enter_pool',
  'claim',
  'assign',
  'transfer',
  'recycle',
  'archive',
] as const;

export type BusinessPoolTargetType =
  (typeof BUSINESS_POOL_TARGET_TYPES)[number];
export type BusinessPoolStatus = (typeof BUSINESS_POOL_STATUSES)[number];
export type BusinessLifecycleStage = (typeof BUSINESS_LIFECYCLE_STAGES)[number];
export type BusinessAssignmentAction =
  (typeof BUSINESS_ASSIGNMENT_ACTIONS)[number];

export class BusinessLifecycleBucketDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  count!: number;
}

export class BusinessLifecycleSummaryDto {
  @ApiProperty()
  availablePool!: number;

  @ApiProperty()
  claimedPool!: number;

  @ApiProperty()
  assignedPool!: number;

  @ApiProperty()
  recycledPool!: number;

  @ApiProperty()
  customers!: number;

  @ApiProperty({ type: [BusinessLifecycleBucketDto] })
  lifecycleByStage!: readonly BusinessLifecycleBucketDto[];

  @ApiProperty()
  openOpportunities!: number;

  @ApiProperty()
  activeContracts!: number;

  @ApiProperty()
  receivableBalance!: string;

  @ApiProperty()
  duplicateWarnings!: number;
}

export class BusinessPoolEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_POOL_TARGET_TYPES })
  targetType!: BusinessPoolTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ enum: BUSINESS_POOL_STATUSES })
  status!: BusinessPoolStatus;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  claimedBy?: string;

  @ApiProperty({ required: false })
  claimedAt?: string;

  @ApiProperty({ required: false })
  assignedTo?: string;

  @ApiProperty({ required: false })
  assignedBy?: string;

  @ApiProperty({ required: false })
  assignedAt?: string;

  @ApiProperty({ required: false })
  recycledAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  duplicateKey?: string;

  @ApiProperty()
  duplicateCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessAssignmentEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BUSINESS_POOL_TARGET_TYPES })
  targetType!: BusinessPoolTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: BUSINESS_ASSIGNMENT_ACTIONS })
  action!: BusinessAssignmentAction;

  @ApiProperty({ required: false })
  fromOwner?: string;

  @ApiProperty({ required: false })
  toOwner?: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  poolEntryId?: string;

  @ApiProperty()
  createdAt!: string;
}

export class BusinessLifecycleCustomerDto {
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

  @ApiProperty()
  status!: string;

  @ApiProperty()
  level!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ enum: BUSINESS_LIFECYCLE_STAGES })
  lifecycleStage!: BusinessLifecycleStage;

  @ApiProperty({ required: false })
  lifecycleReason?: string;

  @ApiProperty({ required: false })
  lifecycleChangedAt?: string;

  @ApiProperty()
  contactCount!: number;

  @ApiProperty()
  opportunityCount!: number;

  @ApiProperty()
  quoteCount!: number;

  @ApiProperty()
  contractCount!: number;

  @ApiProperty()
  receivableCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessLifecycleEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  fromStage?: BusinessLifecycleStage;

  @ApiProperty({ enum: BUSINESS_LIFECYCLE_STAGES })
  toStage!: BusinessLifecycleStage;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty()
  detail!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}

export class BusinessLifecycleTimelineEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ['assignment', 'audit', 'follow_up', 'lifecycle', 'owner_transfer'],
  })
  eventType!:
    | 'assignment'
    | 'audit'
    | 'follow_up'
    | 'lifecycle'
    | 'owner_transfer';

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  actor?: string;

  @ApiProperty({ required: false })
  fromValue?: string;

  @ApiProperty({ required: false })
  toValue?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  createdAt!: string;
}

export class BusinessDuplicateGroupDto {
  @ApiProperty()
  duplicateKey!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [BusinessPoolEntryDto] })
  entries!: readonly BusinessPoolEntryDto[];
}

export class BusinessLifecycleExportPreviewDto {
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

export class BusinessLifecyclePageDto<T> {
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

export class BusinessPoolEntryPageDto extends BusinessLifecyclePageDto<BusinessPoolEntryDto> {
  @ApiProperty({ type: [BusinessPoolEntryDto] })
  declare items: readonly BusinessPoolEntryDto[];
}

export class BusinessAssignmentEventPageDto extends BusinessLifecyclePageDto<BusinessAssignmentEventDto> {
  @ApiProperty({ type: [BusinessAssignmentEventDto] })
  declare items: readonly BusinessAssignmentEventDto[];
}

export class BusinessLifecycleCustomerPageDto extends BusinessLifecyclePageDto<BusinessLifecycleCustomerDto> {
  @ApiProperty({ type: [BusinessLifecycleCustomerDto] })
  declare items: readonly BusinessLifecycleCustomerDto[];
}

export class BusinessLifecycleEventPageDto extends BusinessLifecyclePageDto<BusinessLifecycleEventDto> {
  @ApiProperty({ type: [BusinessLifecycleEventDto] })
  declare items: readonly BusinessLifecycleEventDto[];
}

export class BusinessLifecycleTimelinePageDto extends BusinessLifecyclePageDto<BusinessLifecycleTimelineEventDto> {
  @ApiProperty({ type: [BusinessLifecycleTimelineEventDto] })
  declare items: readonly BusinessLifecycleTimelineEventDto[];
}

export class BusinessDuplicateGroupPageDto extends BusinessLifecyclePageDto<BusinessDuplicateGroupDto> {
  @ApiProperty({ type: [BusinessDuplicateGroupDto] })
  declare items: readonly BusinessDuplicateGroupDto[];
}

export class BusinessPoolEntryQueryDto extends PageQueryDto {
  @ApiProperty({ enum: BUSINESS_POOL_TARGET_TYPES, required: false })
  targetType?: BusinessPoolTargetType;

  @ApiProperty({ enum: BUSINESS_POOL_STATUSES, required: false })
  status?: BusinessPoolStatus;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  assignedTo?: string;

  @ApiProperty({ required: false })
  keyword?: string;
}

export class BusinessLifecycleCustomerQueryDto extends PageQueryDto {
  @ApiProperty({ enum: BUSINESS_LIFECYCLE_STAGES, required: false })
  lifecycleStage?: BusinessLifecycleStage;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  keyword?: string;
}

export class BusinessAssignmentEventQueryDto extends PageQueryDto {
  @ApiProperty({ enum: BUSINESS_POOL_TARGET_TYPES, required: false })
  targetType?: BusinessPoolTargetType;

  @ApiProperty({ required: false })
  targetId?: string;

  @ApiProperty({ enum: BUSINESS_ASSIGNMENT_ACTIONS, required: false })
  action?: BusinessAssignmentAction;

  @ApiProperty({ required: false })
  actor?: string;
}

export class BusinessLifecycleEventQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ enum: BUSINESS_LIFECYCLE_STAGES, required: false })
  toStage?: BusinessLifecycleStage;

  @ApiProperty({ required: false })
  actor?: string;
}

export class BusinessLifecycleExportQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  resource?: string;
}

export class EnterBusinessPoolDto {
  @ApiProperty({ enum: BUSINESS_POOL_TARGET_TYPES })
  targetType!: BusinessPoolTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  source?: string;
}

export class ClaimBusinessPoolEntryDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;
}

export class AssignBusinessPoolEntryDto {
  @ApiProperty()
  toOwner!: string;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;
}

export class RecycleBusinessPoolEntryDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;
}

export class ChangeBusinessLifecycleStageDto {
  @ApiProperty({ enum: BUSINESS_LIFECYCLE_STAGES })
  toStage!: BusinessLifecycleStage;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;
}
