import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type CrmTargetType = 'contact' | 'customer' | 'lead' | 'opportunity';
export type CrmLeadStatus =
  | 'archived'
  | 'contacted'
  | 'converted'
  | 'lost'
  | 'new'
  | 'qualified';
export type CrmWritableLeadStatus = Exclude<
  CrmLeadStatus,
  'archived' | 'converted'
>;
export type CrmCustomerStatus = 'active' | 'archived' | 'churned' | 'inactive';
export type CrmWritableCustomerStatus = Exclude<CrmCustomerStatus, 'archived'>;
export type CrmOpportunityStage =
  | 'lost'
  | 'negotiation'
  | 'proposal'
  | 'qualification'
  | 'won';
export type CrmOpenOpportunityStage = Exclude<
  CrmOpportunityStage,
  'lost' | 'won'
>;
export type CrmTaskStatus = 'canceled' | 'done' | 'open';
export type CrmTaskPriority = 'high' | 'low' | 'medium' | 'urgent';
export type CrmFollowUpMethod =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'wechat';

export type CrmDeleteResult = { deleted: true };

export type CrmTagSummary = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  color?: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmLeadSummary = {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  company?: string;
  mobile?: string;
  email?: string;
  source: string;
  status: CrmLeadStatus;
  rating: string;
  owner: string;
  tags: readonly string[];
  remark?: string;
  nextContactAt?: string;
  lastFollowedAt?: string;
  convertedCustomerId?: string;
  convertedOpportunityId?: string;
  convertedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmCustomerSummary = {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  owner: string;
  status: CrmCustomerStatus;
  level: string;
  source: string;
  industry?: string;
  region?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  tags: readonly string[];
  remark?: string;
  nextContactAt?: string;
  lastFollowedAt?: string;
  archivedAt?: string;
  contactCount: number;
  opportunityCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CrmContactSummary = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  name: string;
  title?: string;
  mobile?: string;
  email?: string;
  phone?: string;
  owner: string;
  decisionRole?: string;
  primary: boolean;
  remark?: string;
  nextContactAt?: string;
  lastFollowedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmOpportunitySummary = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  number: string;
  name: string;
  owner: string;
  stage: CrmOpportunityStage;
  amount: string;
  probability: number;
  expectedCloseAt?: string;
  closedAt?: string;
  closeReason?: string;
  tags: readonly string[];
  remark?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmFollowUpSummary = {
  id: string;
  tenantId: string;
  targetType: CrmTargetType;
  targetId: string;
  method: CrmFollowUpMethod;
  content: string;
  outcome?: string;
  nextContactAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmTaskSummary = {
  id: string;
  tenantId: string;
  targetType: CrmTargetType;
  targetId: string;
  title: string;
  assignee: string;
  status: CrmTaskStatus;
  priority: CrmTaskPriority;
  dueAt?: string;
  completedAt?: string;
  remark?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmAttachmentSummary = {
  id: string;
  tenantId: string;
  targetType: CrmTargetType;
  targetId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmActivitySummary = {
  id: string;
  tenantId: string;
  activityType: 'attachment' | 'audit' | 'follow-up' | 'transfer';
  targetType: CrmTargetType;
  targetId: string;
  actor?: string;
  title?: string;
  createdAt: string;
};

export type CrmOwnerTransferSummary = {
  id: string;
  tenantId: string;
  targetType: CrmTargetType;
  targetId: string;
  fromOwner?: string;
  toOwner: string;
  actor: string;
  reason?: string;
  createdAt: string;
};

export type CrmAuditEventSummary = {
  id: string;
  tenantId: string;
  targetType: CrmTargetType;
  targetId: string;
  action: string;
  actor: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type CrmSummaryBucket = { key: string; count: number };
export type CrmSummary = {
  leads: number;
  customers: number;
  contacts: number;
  opportunities: number;
  openTasks: number;
  overdueTasks: number;
  openPipelineAmount: string;
  leadsByStatus: readonly CrmSummaryBucket[];
  customersByLevel: readonly CrmSummaryBucket[];
  opportunitiesByStage: readonly CrmSummaryBucket[];
};

export type CrmExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type CrmTagPage = PageResponse<CrmTagSummary>;
export type CrmLeadPage = PageResponse<CrmLeadSummary>;
export type CrmCustomerPage = PageResponse<CrmCustomerSummary>;
export type CrmContactPage = PageResponse<CrmContactSummary>;
export type CrmOpportunityPage = PageResponse<CrmOpportunitySummary>;
export type CrmActivityPage = PageResponse<CrmActivitySummary>;
export type CrmFollowUpPage = PageResponse<CrmFollowUpSummary>;
export type CrmTaskPage = PageResponse<CrmTaskSummary>;
export type CrmAttachmentPage = PageResponse<CrmAttachmentSummary>;
export type CrmOwnerTransferPage = PageResponse<CrmOwnerTransferSummary>;
export type CrmAuditEventPage = PageResponse<CrmAuditEventSummary>;

export type CrmTagQueryRequest = PageRequest & { enabled?: boolean | string };
export type CrmLeadQueryRequest = PageRequest & {
  status?: CrmLeadStatus;
  source?: string;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type CrmCustomerQueryRequest = PageRequest & {
  status?: CrmCustomerStatus;
  level?: string;
  source?: string;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type CrmContactQueryRequest = PageRequest & {
  customerId?: string;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type CrmOpportunityQueryRequest = PageRequest & {
  customerId?: string;
  stage?: CrmOpportunityStage;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type CrmTargetQueryRequest = PageRequest & {
  targetType?: CrmTargetType;
  targetId?: string;
};
export type CrmTaskQueryRequest = CrmTargetQueryRequest & {
  status?: CrmTaskStatus;
  assignee?: string;
};
export type CrmExportQueryRequest = PageRequest & {
  resource: 'contacts' | 'customers' | 'leads' | 'opportunities' | 'tasks';
};

export type CreateCrmTagRequest = {
  code: string;
  name: string;
  color?: string;
  description?: string;
  enabled?: boolean;
};
export type UpdateCrmTagRequest = Partial<CreateCrmTagRequest>;
export type CreateCrmLeadRequest = Pick<
  CrmLeadSummary,
  'name' | 'owner' | 'source'
> &
  Partial<
    Pick<
      CrmLeadSummary,
      'company' | 'email' | 'mobile' | 'nextContactAt' | 'rating' | 'remark'
    >
  > & { tags?: string[] };
export type UpdateCrmLeadRequest = Partial<
  Pick<
    CrmLeadSummary,
    | 'company'
    | 'email'
    | 'mobile'
    | 'name'
    | 'nextContactAt'
    | 'owner'
    | 'rating'
    | 'remark'
    | 'source'
  >
> & { status?: CrmWritableLeadStatus; tags?: string[] };
export type ConvertCrmLeadRequest = {
  actor: string;
  customerName?: string;
  opportunityName?: string;
  amount?: string;
};
export type ConvertCrmLeadResult = {
  lead: CrmLeadSummary;
  customer: CrmCustomerSummary;
  opportunity?: CrmOpportunitySummary;
};
export type CreateCrmCustomerRequest = Pick<
  CrmCustomerSummary,
  'name' | 'owner' | 'source'
> &
  Partial<
    Pick<
      CrmCustomerSummary,
      | 'address'
      | 'email'
      | 'industry'
      | 'level'
      | 'nextContactAt'
      | 'phone'
      | 'region'
      | 'remark'
      | 'website'
    >
  > & { status?: CrmWritableCustomerStatus; tags?: string[] };
export type UpdateCrmCustomerRequest = Partial<
  Pick<
    CrmCustomerSummary,
    | 'address'
    | 'email'
    | 'industry'
    | 'level'
    | 'name'
    | 'nextContactAt'
    | 'owner'
    | 'phone'
    | 'region'
    | 'remark'
    | 'source'
    | 'website'
  >
> & { status?: CrmWritableCustomerStatus; tags?: string[] };
export type CreateCrmContactRequest = Pick<
  CrmContactSummary,
  'customerId' | 'name'
> &
  Partial<
    Pick<
      CrmContactSummary,
      | 'decisionRole'
      | 'email'
      | 'mobile'
      | 'nextContactAt'
      | 'owner'
      | 'phone'
      | 'primary'
      | 'remark'
      | 'title'
    >
  >;
export type UpdateCrmContactRequest = Partial<
  Omit<
    CrmContactSummary,
    | 'createdAt'
    | 'customerId'
    | 'customerName'
    | 'id'
    | 'tenantId'
    | 'updatedAt'
  >
>;
export type CreateCrmOpportunityRequest = Pick<
  CrmOpportunitySummary,
  'customerId' | 'name' | 'owner'
> &
  Partial<
    Pick<
      CrmOpportunitySummary,
      'amount' | 'expectedCloseAt' | 'probability' | 'remark'
    >
  > & { stage?: CrmOpenOpportunityStage; tags?: string[] };
export type UpdateCrmOpportunityRequest = Partial<
  Omit<
    CrmOpportunitySummary,
    | 'closedAt'
    | 'closeReason'
    | 'createdAt'
    | 'customerName'
    | 'id'
    | 'number'
    | 'stage'
    | 'tenantId'
    | 'updatedAt'
  >
> & { tags?: string[] };
export type ChangeCrmOpportunityStageRequest = {
  stage: CrmOpportunityStage;
  actor: string;
  closeReason?: string;
};
export type TransferCrmOwnerRequest = {
  toOwner: string;
  actor: string;
  reason?: string;
};
export type CreateCrmFollowUpRequest = Pick<
  CrmFollowUpSummary,
  'content' | 'createdBy' | 'method' | 'targetId' | 'targetType'
> &
  Partial<Pick<CrmFollowUpSummary, 'nextContactAt' | 'outcome'>>;
export type CreateCrmTaskRequest = Pick<
  CrmTaskSummary,
  'assignee' | 'createdBy' | 'targetId' | 'targetType' | 'title'
> &
  Partial<Pick<CrmTaskSummary, 'dueAt' | 'priority' | 'remark'>>;
export type CompleteCrmTaskRequest = { actor: string };
export type CreateCrmAttachmentRequest = Pick<
  CrmAttachmentSummary,
  | 'mimeType'
  | 'originalName'
  | 'sizeBytes'
  | 'storageKey'
  | 'targetId'
  | 'targetType'
  | 'uploadedBy'
>;
