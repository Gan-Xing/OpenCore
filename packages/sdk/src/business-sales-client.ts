import type { SdkRequest } from './rbac-client';
import type { TransferBusinessOwnerRequest } from './business-core-types';
import type {
  BusinessDeleteResult,
  ChangeSalesOpportunityStageRequest,
  ConvertSalesLeadRequest,
  ConvertSalesLeadResult,
  CreateSalesLeadRequest,
  CreateSalesOpportunityRequest,
  PageRequest,
  SalesExportPreview,
  SalesExportQueryRequest,
  SalesLeadPage,
  SalesLeadQueryRequest,
  SalesLeadSummary,
  SalesOpportunityPage,
  SalesOpportunityQueryRequest,
  SalesOpportunitySummary,
  SalesSummary,
  UpdateSalesLeadRequest,
  UpdateSalesOpportunityRequest,
} from './business-sales-types';

export type BusinessSalesClient = {
  getSummary: (token: string) => Promise<SalesSummary>;
  exportBusinessSales: (
    token: string,
    query: SalesExportQueryRequest,
  ) => Promise<SalesExportPreview>;
  listLeads: (
    token: string,
    query?: SalesLeadQueryRequest,
  ) => Promise<SalesLeadPage>;
  getLead: (token: string, id: string) => Promise<SalesLeadSummary>;
  createLead: (
    token: string,
    body: CreateSalesLeadRequest,
  ) => Promise<SalesLeadSummary>;
  updateLead: (
    token: string,
    id: string,
    body: UpdateSalesLeadRequest,
  ) => Promise<SalesLeadSummary>;
  convertLead: (
    token: string,
    id: string,
    body: ConvertSalesLeadRequest,
  ) => Promise<ConvertSalesLeadResult>;
  transferLeadOwner: (
    token: string,
    id: string,
    body: TransferBusinessOwnerRequest,
  ) => Promise<SalesLeadSummary>;
  archiveLead: (token: string, id: string) => Promise<BusinessDeleteResult>;
  listOpportunities: (
    token: string,
    query?: SalesOpportunityQueryRequest,
  ) => Promise<SalesOpportunityPage>;
  getOpportunity: (
    token: string,
    id: string,
  ) => Promise<SalesOpportunitySummary>;
  createOpportunity: (
    token: string,
    body: CreateSalesOpportunityRequest,
  ) => Promise<SalesOpportunitySummary>;
  updateOpportunity: (
    token: string,
    id: string,
    body: UpdateSalesOpportunityRequest,
  ) => Promise<SalesOpportunitySummary>;
  changeOpportunityStage: (
    token: string,
    id: string,
    body: ChangeSalesOpportunityStageRequest,
  ) => Promise<SalesOpportunitySummary>;
  transferOpportunityOwner: (
    token: string,
    id: string,
    body: TransferBusinessOwnerRequest,
  ) => Promise<SalesOpportunitySummary>;
  archiveOpportunity: (
    token: string,
    id: string,
  ) => Promise<BusinessDeleteResult>;
};

export function createBusinessSalesClient(
  request: SdkRequest,
): BusinessSalesClient {
  return {
    getSummary: (token) =>
      request<SalesSummary>('/business/sales/summary', { token }),
    exportBusinessSales: (token, query) =>
      request<SalesExportPreview>(withQuery('/business/sales/export', query), {
        token,
      }),
    listLeads: (token, query) =>
      request<SalesLeadPage>(withQuery('/business/sales/leads', query), {
        token,
      }),
    getLead: (token, id) =>
      request<SalesLeadSummary>(
        `/business/sales/leads/${encodeURIComponent(id)}`,
        { token },
      ),
    createLead: (token, body) =>
      request<SalesLeadSummary>('/business/sales/leads', {
        method: 'POST',
        body,
        token,
      }),
    updateLead: (token, id, body) =>
      request<SalesLeadSummary>(
        `/business/sales/leads/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    convertLead: (token, id, body) =>
      request<ConvertSalesLeadResult>(
        `/business/sales/leads/${encodeURIComponent(id)}/convert`,
        { method: 'PATCH', body, token },
      ),
    transferLeadOwner: (token, id, body) =>
      request<SalesLeadSummary>(
        `/business/sales/leads/${encodeURIComponent(id)}/transfer`,
        { method: 'PATCH', body, token },
      ),
    archiveLead: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/sales/leads/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listOpportunities: (token, query) =>
      request<SalesOpportunityPage>(
        withQuery('/business/sales/opportunities', query),
        { token },
      ),
    getOpportunity: (token, id) =>
      request<SalesOpportunitySummary>(
        `/business/sales/opportunities/${encodeURIComponent(id)}`,
        { token },
      ),
    createOpportunity: (token, body) =>
      request<SalesOpportunitySummary>('/business/sales/opportunities', {
        method: 'POST',
        body,
        token,
      }),
    updateOpportunity: (token, id, body) =>
      request<SalesOpportunitySummary>(
        `/business/sales/opportunities/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    changeOpportunityStage: (token, id, body) =>
      request<SalesOpportunitySummary>(
        `/business/sales/opportunities/${encodeURIComponent(id)}/stage`,
        { method: 'PATCH', body, token },
      ),
    transferOpportunityOwner: (token, id, body) =>
      request<SalesOpportunitySummary>(
        `/business/sales/opportunities/${encodeURIComponent(id)}/transfer`,
        { method: 'PATCH', body, token },
      ),
    archiveOpportunity: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/sales/opportunities/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
  };
}

function withQuery(
  path: `/${string}`,
  query: PageRequest & Record<string, unknown> = {},
): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
