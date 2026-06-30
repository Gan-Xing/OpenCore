import type { SdkRequest } from './rbac-client';
import type {
  ChangeCrmOpportunityStageRequest,
  CompleteCrmTaskRequest,
  ConvertCrmLeadRequest,
  ConvertCrmLeadResult,
  CreateCrmAttachmentRequest,
  CreateCrmContactRequest,
  CreateCrmCustomerRequest,
  CreateCrmFollowUpRequest,
  CreateCrmLeadRequest,
  CreateCrmOpportunityRequest,
  CreateCrmTagRequest,
  CreateCrmTaskRequest,
  CrmAttachmentPage,
  CrmAuditEventPage,
  CrmContactPage,
  CrmContactQueryRequest,
  CrmContactSummary,
  CrmCustomerPage,
  CrmCustomerQueryRequest,
  CrmCustomerSummary,
  CrmDeleteResult,
  CrmExportPreview,
  CrmExportQueryRequest,
  CrmFollowUpPage,
  CrmLeadPage,
  CrmLeadQueryRequest,
  CrmLeadSummary,
  CrmOpportunityPage,
  CrmOpportunityQueryRequest,
  CrmOpportunitySummary,
  CrmOwnerTransferPage,
  CrmSummary,
  CrmTagPage,
  CrmTagQueryRequest,
  CrmTagSummary,
  CrmTargetQueryRequest,
  CrmTaskPage,
  CrmTaskQueryRequest,
  CrmTaskSummary,
  PageRequest,
  TransferCrmOwnerRequest,
  UpdateCrmContactRequest,
  UpdateCrmCustomerRequest,
  UpdateCrmLeadRequest,
  UpdateCrmOpportunityRequest,
  UpdateCrmTagRequest,
} from './crm-types';

export type CrmClient = {
  getSummary: (token: string) => Promise<CrmSummary>;
  exportCrm: (
    token: string,
    query: CrmExportQueryRequest,
  ) => Promise<CrmExportPreview>;
  listTags: (token: string, query?: CrmTagQueryRequest) => Promise<CrmTagPage>;
  createTag: (
    token: string,
    body: CreateCrmTagRequest,
  ) => Promise<CrmTagSummary>;
  updateTag: (
    token: string,
    id: string,
    body: UpdateCrmTagRequest,
  ) => Promise<CrmTagSummary>;
  listLeads: (
    token: string,
    query?: CrmLeadQueryRequest,
  ) => Promise<CrmLeadPage>;
  getLead: (token: string, id: string) => Promise<CrmLeadSummary>;
  createLead: (
    token: string,
    body: CreateCrmLeadRequest,
  ) => Promise<CrmLeadSummary>;
  updateLead: (
    token: string,
    id: string,
    body: UpdateCrmLeadRequest,
  ) => Promise<CrmLeadSummary>;
  convertLead: (
    token: string,
    id: string,
    body: ConvertCrmLeadRequest,
  ) => Promise<ConvertCrmLeadResult>;
  transferLeadOwner: (
    token: string,
    id: string,
    body: TransferCrmOwnerRequest,
  ) => Promise<CrmLeadSummary>;
  archiveLead: (token: string, id: string) => Promise<CrmDeleteResult>;
  listCustomers: (
    token: string,
    query?: CrmCustomerQueryRequest,
  ) => Promise<CrmCustomerPage>;
  getCustomer: (token: string, id: string) => Promise<CrmCustomerSummary>;
  createCustomer: (
    token: string,
    body: CreateCrmCustomerRequest,
  ) => Promise<CrmCustomerSummary>;
  updateCustomer: (
    token: string,
    id: string,
    body: UpdateCrmCustomerRequest,
  ) => Promise<CrmCustomerSummary>;
  transferCustomerOwner: (
    token: string,
    id: string,
    body: TransferCrmOwnerRequest,
  ) => Promise<CrmCustomerSummary>;
  archiveCustomer: (token: string, id: string) => Promise<CrmDeleteResult>;
  listContacts: (
    token: string,
    query?: CrmContactQueryRequest,
  ) => Promise<CrmContactPage>;
  getContact: (token: string, id: string) => Promise<CrmContactSummary>;
  createContact: (
    token: string,
    body: CreateCrmContactRequest,
  ) => Promise<CrmContactSummary>;
  updateContact: (
    token: string,
    id: string,
    body: UpdateCrmContactRequest,
  ) => Promise<CrmContactSummary>;
  archiveContact: (token: string, id: string) => Promise<CrmDeleteResult>;
  listOpportunities: (
    token: string,
    query?: CrmOpportunityQueryRequest,
  ) => Promise<CrmOpportunityPage>;
  getOpportunity: (token: string, id: string) => Promise<CrmOpportunitySummary>;
  createOpportunity: (
    token: string,
    body: CreateCrmOpportunityRequest,
  ) => Promise<CrmOpportunitySummary>;
  updateOpportunity: (
    token: string,
    id: string,
    body: UpdateCrmOpportunityRequest,
  ) => Promise<CrmOpportunitySummary>;
  changeOpportunityStage: (
    token: string,
    id: string,
    body: ChangeCrmOpportunityStageRequest,
  ) => Promise<CrmOpportunitySummary>;
  transferOpportunityOwner: (
    token: string,
    id: string,
    body: TransferCrmOwnerRequest,
  ) => Promise<CrmOpportunitySummary>;
  archiveOpportunity: (token: string, id: string) => Promise<CrmDeleteResult>;
  listFollowUps: (
    token: string,
    query?: CrmTargetQueryRequest,
  ) => Promise<CrmFollowUpPage>;
  createFollowUp: (
    token: string,
    body: CreateCrmFollowUpRequest,
  ) => Promise<CrmFollowUpPage['items'][number]>;
  listTasks: (
    token: string,
    query?: CrmTaskQueryRequest,
  ) => Promise<CrmTaskPage>;
  createTask: (
    token: string,
    body: CreateCrmTaskRequest,
  ) => Promise<CrmTaskSummary>;
  completeTask: (
    token: string,
    id: string,
    body: CompleteCrmTaskRequest,
  ) => Promise<CrmTaskSummary>;
  listAttachments: (
    token: string,
    query?: CrmTargetQueryRequest,
  ) => Promise<CrmAttachmentPage>;
  createAttachment: (
    token: string,
    body: CreateCrmAttachmentRequest,
  ) => Promise<CrmAttachmentPage['items'][number]>;
  listOwnerTransfers: (
    token: string,
    query?: CrmTargetQueryRequest,
  ) => Promise<CrmOwnerTransferPage>;
  listAuditEvents: (
    token: string,
    query?: CrmTargetQueryRequest,
  ) => Promise<CrmAuditEventPage>;
};

export function createCrmClient(request: SdkRequest): CrmClient {
  return {
    getSummary: (token) =>
      request<CrmSummary>('/industry/crm/summary', { token }),
    exportCrm: (token, query) =>
      request<CrmExportPreview>(withQuery('/industry/crm/export', query), {
        token,
      }),
    listTags: (token, query) =>
      request<CrmTagPage>(withQuery('/industry/crm/tags', query), { token }),
    createTag: (token, body) =>
      request<CrmTagSummary>('/industry/crm/tags', {
        method: 'POST',
        body,
        token,
      }),
    updateTag: (token, id, body) =>
      request<CrmTagSummary>(`/industry/crm/tags/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    listLeads: (token, query) =>
      request<CrmLeadPage>(withQuery('/industry/crm/leads', query), { token }),
    getLead: (token, id) =>
      request<CrmLeadSummary>(`/industry/crm/leads/${encodeURIComponent(id)}`, {
        token,
      }),
    createLead: (token, body) =>
      request<CrmLeadSummary>('/industry/crm/leads', {
        method: 'POST',
        body,
        token,
      }),
    updateLead: (token, id, body) =>
      request<CrmLeadSummary>(`/industry/crm/leads/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    convertLead: (token, id, body) =>
      request<ConvertCrmLeadResult>(
        `/industry/crm/leads/${encodeURIComponent(id)}/convert`,
        { method: 'PATCH', body, token },
      ),
    transferLeadOwner: (token, id, body) =>
      request<CrmLeadSummary>(
        `/industry/crm/leads/${encodeURIComponent(id)}/transfer`,
        { method: 'PATCH', body, token },
      ),
    archiveLead: (token, id) =>
      request<CrmDeleteResult>(
        `/industry/crm/leads/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listCustomers: (token, query) =>
      request<CrmCustomerPage>(withQuery('/industry/crm/customers', query), {
        token,
      }),
    getCustomer: (token, id) =>
      request<CrmCustomerSummary>(
        `/industry/crm/customers/${encodeURIComponent(id)}`,
        { token },
      ),
    createCustomer: (token, body) =>
      request<CrmCustomerSummary>('/industry/crm/customers', {
        method: 'POST',
        body,
        token,
      }),
    updateCustomer: (token, id, body) =>
      request<CrmCustomerSummary>(
        `/industry/crm/customers/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    transferCustomerOwner: (token, id, body) =>
      request<CrmCustomerSummary>(
        `/industry/crm/customers/${encodeURIComponent(id)}/transfer`,
        { method: 'PATCH', body, token },
      ),
    archiveCustomer: (token, id) =>
      request<CrmDeleteResult>(
        `/industry/crm/customers/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listContacts: (token, query) =>
      request<CrmContactPage>(withQuery('/industry/crm/contacts', query), {
        token,
      }),
    getContact: (token, id) =>
      request<CrmContactSummary>(
        `/industry/crm/contacts/${encodeURIComponent(id)}`,
        { token },
      ),
    createContact: (token, body) =>
      request<CrmContactSummary>('/industry/crm/contacts', {
        method: 'POST',
        body,
        token,
      }),
    updateContact: (token, id, body) =>
      request<CrmContactSummary>(
        `/industry/crm/contacts/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    archiveContact: (token, id) =>
      request<CrmDeleteResult>(
        `/industry/crm/contacts/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listOpportunities: (token, query) =>
      request<CrmOpportunityPage>(
        withQuery('/industry/crm/opportunities', query),
        { token },
      ),
    getOpportunity: (token, id) =>
      request<CrmOpportunitySummary>(
        `/industry/crm/opportunities/${encodeURIComponent(id)}`,
        { token },
      ),
    createOpportunity: (token, body) =>
      request<CrmOpportunitySummary>('/industry/crm/opportunities', {
        method: 'POST',
        body,
        token,
      }),
    updateOpportunity: (token, id, body) =>
      request<CrmOpportunitySummary>(
        `/industry/crm/opportunities/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    changeOpportunityStage: (token, id, body) =>
      request<CrmOpportunitySummary>(
        `/industry/crm/opportunities/${encodeURIComponent(id)}/stage`,
        { method: 'PATCH', body, token },
      ),
    transferOpportunityOwner: (token, id, body) =>
      request<CrmOpportunitySummary>(
        `/industry/crm/opportunities/${encodeURIComponent(id)}/transfer`,
        { method: 'PATCH', body, token },
      ),
    archiveOpportunity: (token, id) =>
      request<CrmDeleteResult>(
        `/industry/crm/opportunities/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listFollowUps: (token, query) =>
      request<CrmFollowUpPage>(withQuery('/industry/crm/follow-ups', query), {
        token,
      }),
    createFollowUp: (token, body) =>
      request<CrmFollowUpPage['items'][number]>('/industry/crm/follow-ups', {
        method: 'POST',
        body,
        token,
      }),
    listTasks: (token, query) =>
      request<CrmTaskPage>(withQuery('/industry/crm/tasks', query), { token }),
    createTask: (token, body) =>
      request<CrmTaskSummary>('/industry/crm/tasks', {
        method: 'POST',
        body,
        token,
      }),
    completeTask: (token, id, body) =>
      request<CrmTaskSummary>(
        `/industry/crm/tasks/${encodeURIComponent(id)}/complete`,
        { method: 'PATCH', body, token },
      ),
    listAttachments: (token, query) =>
      request<CrmAttachmentPage>(
        withQuery('/industry/crm/attachments', query),
        { token },
      ),
    createAttachment: (token, body) =>
      request<CrmAttachmentPage['items'][number]>('/industry/crm/attachments', {
        method: 'POST',
        body,
        token,
      }),
    listOwnerTransfers: (token, query) =>
      request<CrmOwnerTransferPage>(
        withQuery('/industry/crm/owner-transfers', query),
        { token },
      ),
    listAuditEvents: (token, query) =>
      request<CrmAuditEventPage>(
        withQuery('/industry/crm/audit-events', query),
        { token },
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
