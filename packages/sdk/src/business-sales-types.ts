import type { PageRequest, PageResponse } from './system-management-types';
import type {
  BusinessCustomerSummary,
  BusinessDeleteResult,
} from './business-core-types';

export type { BusinessDeleteResult, PageRequest, PageResponse };

export type SalesLeadStatus =
  | 'archived'
  | 'contacted'
  | 'converted'
  | 'lost'
  | 'new'
  | 'qualified';
export type SalesWritableLeadStatus = Exclude<
  SalesLeadStatus,
  'archived' | 'converted'
>;
export type SalesOpportunityStage =
  | 'lost'
  | 'negotiation'
  | 'proposal'
  | 'qualification'
  | 'won';
export type SalesOpenOpportunityStage = Exclude<
  SalesOpportunityStage,
  'lost' | 'won'
>;

export type SalesLeadSummary = {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  company?: string;
  mobile?: string;
  email?: string;
  source: string;
  status: SalesLeadStatus;
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

export type SalesOpportunitySummary = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  number: string;
  name: string;
  owner: string;
  stage: SalesOpportunityStage;
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

export type SalesSummaryBucket = { key: string; count: number };
export type SalesSummary = {
  leads: number;
  customers: number;
  contacts: number;
  opportunities: number;
  openTasks: number;
  overdueTasks: number;
  openPipelineAmount: string;
  leadsByStatus: readonly SalesSummaryBucket[];
  customersByLevel: readonly SalesSummaryBucket[];
  opportunitiesByStage: readonly SalesSummaryBucket[];
};

export type SalesExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type SalesLeadPage = PageResponse<SalesLeadSummary>;
export type SalesOpportunityPage = PageResponse<SalesOpportunitySummary>;

export type SalesLeadQueryRequest = PageRequest & {
  status?: SalesLeadStatus;
  source?: string;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type SalesOpportunityQueryRequest = PageRequest & {
  customerId?: string;
  stage?: SalesOpportunityStage;
  owner?: string;
  keyword?: string;
  includeArchived?: boolean | string;
};
export type SalesExportQueryRequest = PageRequest & {
  resource: 'leads' | 'opportunities';
};

export type CreateSalesLeadRequest = Pick<
  SalesLeadSummary,
  'name' | 'owner' | 'source'
> &
  Partial<
    Pick<
      SalesLeadSummary,
      'company' | 'email' | 'mobile' | 'nextContactAt' | 'rating' | 'remark'
    >
  > & { tags?: string[] };
export type UpdateSalesLeadRequest = Partial<
  Pick<
    SalesLeadSummary,
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
> & { status?: SalesWritableLeadStatus; tags?: string[] };
export type ConvertSalesLeadRequest = {
  actor: string;
  customerName?: string;
  opportunityName?: string;
  amount?: string;
};
export type ConvertSalesLeadResult = {
  lead: SalesLeadSummary;
  customer: BusinessCustomerSummary;
  opportunity?: SalesOpportunitySummary;
};
export type CreateSalesOpportunityRequest = Pick<
  SalesOpportunitySummary,
  'customerId' | 'name' | 'owner'
> &
  Partial<
    Pick<
      SalesOpportunitySummary,
      'amount' | 'expectedCloseAt' | 'probability' | 'remark'
    >
  > & { stage?: SalesOpenOpportunityStage; tags?: string[] };
export type UpdateSalesOpportunityRequest = Partial<
  Omit<
    SalesOpportunitySummary,
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
export type ChangeSalesOpportunityStageRequest = {
  stage: SalesOpportunityStage;
  actor: string;
  closeReason?: string;
};

export type BusinessLeadPage = SalesLeadPage;
export type BusinessLeadQueryRequest = SalesLeadQueryRequest;
export type BusinessLeadStatus = SalesLeadStatus;
export type BusinessLeadSummary = SalesLeadSummary;
export type BusinessOpportunityPage = SalesOpportunityPage;
export type BusinessOpportunityQueryRequest = SalesOpportunityQueryRequest;
export type BusinessOpportunityStage = SalesOpportunityStage;
export type BusinessOpportunitySummary = SalesOpportunitySummary;
export type BusinessOpenOpportunityStage = SalesOpenOpportunityStage;
export type BusinessWritableLeadStatus = SalesWritableLeadStatus;
export type BusinessSummary = SalesSummary;
export type BusinessSummaryBucket = SalesSummaryBucket;
export type ConvertBusinessLeadRequest = ConvertSalesLeadRequest;
export type ConvertBusinessLeadResult = ConvertSalesLeadResult;
export type CreateBusinessLeadRequest = CreateSalesLeadRequest;
export type CreateBusinessOpportunityRequest = CreateSalesOpportunityRequest;
export type UpdateBusinessLeadRequest = UpdateSalesLeadRequest;
export type UpdateBusinessOpportunityRequest = UpdateSalesOpportunityRequest;
export type ChangeBusinessOpportunityStageRequest =
  ChangeSalesOpportunityStageRequest;
