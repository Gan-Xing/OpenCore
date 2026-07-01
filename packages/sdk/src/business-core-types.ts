import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type BusinessTargetType =
  | 'contact'
  | 'customer'
  | 'lead'
  | 'opportunity';
export type BusinessCustomerStatus =
  | 'active'
  | 'archived'
  | 'churned'
  | 'inactive';
export type BusinessWritableCustomerStatus = Exclude<
  BusinessCustomerStatus,
  'archived'
>;
export type BusinessTaskStatus = 'canceled' | 'done' | 'open';
export type BusinessTaskPriority = 'high' | 'low' | 'medium' | 'urgent';
export type BusinessFollowUpMethod =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'wechat';

export type BusinessDeleteResult = { deleted: true };

export type BusinessTagSummary = {
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

export type BusinessCustomerSummary = {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  owner: string;
  status: BusinessCustomerStatus;
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

export type BusinessContactSummary = {
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

export type BusinessFollowUpSummary = {
  id: string;
  tenantId: string;
  targetType: BusinessTargetType;
  targetId: string;
  method: BusinessFollowUpMethod;
  content: string;
  outcome?: string;
  nextContactAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessTaskSummary = {
  id: string;
  tenantId: string;
  targetType: BusinessTargetType;
  targetId: string;
  title: string;
  assignee: string;
  status: BusinessTaskStatus;
  priority: BusinessTaskPriority;
  dueAt?: string;
  completedAt?: string;
  remark?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessAttachmentSummary = {
  id: string;
  tenantId: string;
  targetType: BusinessTargetType;
  targetId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessActivitySummary = {
  id: string;
  tenantId: string;
  activityType: 'attachment' | 'audit' | 'follow-up' | 'transfer';
  targetType: BusinessTargetType;
  targetId: string;
  actor?: string;
  title?: string;
  createdAt: string;
};

export type BusinessOwnerTransferSummary = {
  id: string;
  tenantId: string;
  targetType: BusinessTargetType;
  targetId: string;
  fromOwner?: string;
  toOwner: string;
  actor: string;
  reason?: string;
  createdAt: string;
};

export type BusinessAuditEventSummary = {
  id: string;
  tenantId: string;
  targetType: BusinessTargetType;
  targetId: string;
  action: string;
  actor: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type BusinessExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type BusinessTagPage = PageResponse<BusinessTagSummary>;
export type BusinessCustomerPage = PageResponse<BusinessCustomerSummary>;
export type BusinessContactPage = PageResponse<BusinessContactSummary>;
export type BusinessActivityPage = PageResponse<BusinessActivitySummary>;
export type BusinessFollowUpPage = PageResponse<BusinessFollowUpSummary>;
export type BusinessTaskPage = PageResponse<BusinessTaskSummary>;
export type BusinessAttachmentPage = PageResponse<BusinessAttachmentSummary>;
export type BusinessOwnerTransferPage =
  PageResponse<BusinessOwnerTransferSummary>;
export type BusinessAuditEventPage = PageResponse<BusinessAuditEventSummary>;

export type BusinessTagQueryRequest = PageRequest & {
  enabled?: boolean | string;
};
export type BusinessCustomerQueryRequest = PageRequest & {
  status?: BusinessCustomerStatus;
  level?: string;
  source?: string;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type BusinessContactQueryRequest = PageRequest & {
  customerId?: string;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type BusinessTargetQueryRequest = PageRequest & {
  targetType?: BusinessTargetType;
  targetId?: string;
};
export type BusinessTaskQueryRequest = BusinessTargetQueryRequest & {
  status?: BusinessTaskStatus;
  assignee?: string;
};
export type BusinessExportQueryRequest = PageRequest & {
  resource: 'contacts' | 'customers' | 'tasks';
};

export type CreateBusinessTagRequest = {
  code: string;
  name: string;
  color?: string;
  description?: string;
  enabled?: boolean;
};
export type UpdateBusinessTagRequest = Partial<CreateBusinessTagRequest>;
export type CreateBusinessCustomerRequest = Pick<
  BusinessCustomerSummary,
  'name' | 'owner' | 'source'
> &
  Partial<
    Pick<
      BusinessCustomerSummary,
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
  > & { status?: BusinessWritableCustomerStatus; tags?: string[] };
export type UpdateBusinessCustomerRequest = Partial<
  Pick<
    BusinessCustomerSummary,
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
> & { status?: BusinessWritableCustomerStatus; tags?: string[] };
export type CreateBusinessContactRequest = Pick<
  BusinessContactSummary,
  'customerId' | 'name'
> &
  Partial<
    Pick<
      BusinessContactSummary,
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
export type UpdateBusinessContactRequest = Partial<
  Omit<
    BusinessContactSummary,
    | 'createdAt'
    | 'customerId'
    | 'customerName'
    | 'id'
    | 'tenantId'
    | 'updatedAt'
  >
>;
export type TransferBusinessOwnerRequest = {
  toOwner: string;
  actor: string;
  reason?: string;
};
export type CreateBusinessFollowUpRequest = Pick<
  BusinessFollowUpSummary,
  'content' | 'createdBy' | 'method' | 'targetId' | 'targetType'
> &
  Partial<Pick<BusinessFollowUpSummary, 'nextContactAt' | 'outcome'>>;
export type CreateBusinessTaskRequest = Pick<
  BusinessTaskSummary,
  'assignee' | 'createdBy' | 'targetId' | 'targetType' | 'title'
> &
  Partial<Pick<BusinessTaskSummary, 'dueAt' | 'priority' | 'remark'>>;
export type CompleteBusinessTaskRequest = { actor: string };
export type CreateBusinessAttachmentRequest = Pick<
  BusinessAttachmentSummary,
  | 'mimeType'
  | 'originalName'
  | 'sizeBytes'
  | 'storageKey'
  | 'targetId'
  | 'targetType'
  | 'uploadedBy'
>;
