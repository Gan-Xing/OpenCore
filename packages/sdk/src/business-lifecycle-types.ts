import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type BusinessPoolTargetType = 'customer' | 'lead';
export type BusinessPoolStatus =
  | 'archived'
  | 'assigned'
  | 'available'
  | 'claimed'
  | 'recycled';
export type BusinessLifecycleStage =
  | 'archived'
  | 'assigned'
  | 'fulfillment'
  | 'in_progress'
  | 'lost'
  | 'potential'
  | 'renewal'
  | 'won';
export type BusinessAssignmentAction =
  | 'archive'
  | 'assign'
  | 'claim'
  | 'enter_pool'
  | 'recycle'
  | 'transfer';

export type BusinessLifecycleBucket = {
  key: string;
  count: number;
};

export type BusinessLifecycleSummary = {
  availablePool: number;
  claimedPool: number;
  assignedPool: number;
  recycledPool: number;
  customers: number;
  lifecycleByStage: readonly BusinessLifecycleBucket[];
  openOpportunities: number;
  activeContracts: number;
  receivableBalance: string;
  duplicateWarnings: number;
};

export type BusinessPoolEntrySummary = {
  id: string;
  tenantId: string;
  targetType: BusinessPoolTargetType;
  targetId: string;
  displayName: string;
  source: string;
  status: BusinessPoolStatus;
  owner?: string;
  claimedBy?: string;
  claimedAt?: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: string;
  recycledAt?: string;
  archivedAt?: string;
  reason?: string;
  duplicateKey?: string;
  duplicateCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BusinessAssignmentEventSummary = {
  id: string;
  tenantId: string;
  targetType: BusinessPoolTargetType;
  targetId: string;
  action: BusinessAssignmentAction;
  fromOwner?: string;
  toOwner?: string;
  actor: string;
  reason?: string;
  poolEntryId?: string;
  createdAt: string;
};

export type BusinessLifecycleCustomerSummary = {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  owner: string;
  status: string;
  level: string;
  source: string;
  lifecycleStage: BusinessLifecycleStage;
  lifecycleReason?: string;
  lifecycleChangedAt?: string;
  contactCount: number;
  opportunityCount: number;
  quoteCount: number;
  contractCount: number;
  receivableCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BusinessLifecycleEventSummary = {
  id: string;
  tenantId: string;
  customerId: string;
  fromStage?: BusinessLifecycleStage;
  toStage: BusinessLifecycleStage;
  reason?: string;
  actor: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type BusinessLifecycleTimelineEventSummary = {
  id: string;
  eventType:
    | 'assignment'
    | 'audit'
    | 'follow_up'
    | 'lifecycle'
    | 'owner_transfer';
  title: string;
  actor?: string;
  fromValue?: string;
  toValue?: string;
  reason?: string;
  createdAt: string;
};

export type BusinessDuplicateGroupSummary = {
  duplicateKey: string;
  count: number;
  entries: readonly BusinessPoolEntrySummary[];
};

export type BusinessLifecycleExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type BusinessPoolEntryPage = PageResponse<BusinessPoolEntrySummary>;
export type BusinessAssignmentEventPage =
  PageResponse<BusinessAssignmentEventSummary>;
export type BusinessLifecycleCustomerPage =
  PageResponse<BusinessLifecycleCustomerSummary>;
export type BusinessLifecycleEventPage =
  PageResponse<BusinessLifecycleEventSummary>;
export type BusinessLifecycleTimelinePage =
  PageResponse<BusinessLifecycleTimelineEventSummary>;
export type BusinessDuplicateGroupPage =
  PageResponse<BusinessDuplicateGroupSummary>;

export type BusinessPoolEntryQueryRequest = PageRequest & {
  targetType?: BusinessPoolTargetType;
  status?: BusinessPoolStatus;
  owner?: string;
  assignedTo?: string;
  keyword?: string;
};

export type BusinessLifecycleCustomerQueryRequest = PageRequest & {
  lifecycleStage?: BusinessLifecycleStage;
  owner?: string;
  keyword?: string;
};

export type BusinessAssignmentEventQueryRequest = PageRequest & {
  targetType?: BusinessPoolTargetType;
  targetId?: string;
  action?: BusinessAssignmentAction;
  actor?: string;
};

export type BusinessLifecycleEventQueryRequest = PageRequest & {
  customerId?: string;
  toStage?: BusinessLifecycleStage;
  actor?: string;
};

export type BusinessLifecycleExportQueryRequest = PageRequest & {
  resource: 'customers' | 'events' | 'pool';
};

export type EnterBusinessPoolRequest = {
  targetType: BusinessPoolTargetType;
  targetId: string;
  actor: string;
  reason?: string;
  source?: string;
};

export type ClaimBusinessPoolEntryRequest = {
  actor: string;
  reason?: string;
};

export type AssignBusinessPoolEntryRequest = {
  toOwner: string;
  actor: string;
  reason?: string;
};

export type RecycleBusinessPoolEntryRequest = {
  actor: string;
  reason?: string;
};

export type ChangeBusinessLifecycleStageRequest = {
  toStage: BusinessLifecycleStage;
  actor: string;
  reason?: string;
};
