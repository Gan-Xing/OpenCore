import type { SdkRequest } from './rbac-client';
import type {
  BusinessActivityPage,
  BusinessAttachmentPage,
  BusinessAuditEventPage,
  BusinessContactPage,
  BusinessContactQueryRequest,
  BusinessContactSummary,
  BusinessCustomerPage,
  BusinessCustomerQueryRequest,
  BusinessCustomerSummary,
  BusinessDeleteResult,
  BusinessExportPreview,
  BusinessExportQueryRequest,
  BusinessFollowUpPage,
  BusinessOwnerTransferPage,
  BusinessTagPage,
  BusinessTagQueryRequest,
  BusinessTagSummary,
  BusinessTargetQueryRequest,
  BusinessTaskPage,
  BusinessTaskQueryRequest,
  BusinessTaskSummary,
  CompleteBusinessTaskRequest,
  CreateBusinessAttachmentRequest,
  CreateBusinessContactRequest,
  CreateBusinessCustomerRequest,
  CreateBusinessFollowUpRequest,
  CreateBusinessTagRequest,
  CreateBusinessTaskRequest,
  PageRequest,
  TransferBusinessOwnerRequest,
  UpdateBusinessContactRequest,
  UpdateBusinessCustomerRequest,
  UpdateBusinessTagRequest,
} from './business-core-types';

export type BusinessCoreClient = {
  exportBusinessCore: (
    token: string,
    query: BusinessExportQueryRequest,
  ) => Promise<BusinessExportPreview>;
  listTags: (
    token: string,
    query?: BusinessTagQueryRequest,
  ) => Promise<BusinessTagPage>;
  createTag: (
    token: string,
    body: CreateBusinessTagRequest,
  ) => Promise<BusinessTagSummary>;
  updateTag: (
    token: string,
    id: string,
    body: UpdateBusinessTagRequest,
  ) => Promise<BusinessTagSummary>;
  listCustomers: (
    token: string,
    query?: BusinessCustomerQueryRequest,
  ) => Promise<BusinessCustomerPage>;
  getCustomer: (token: string, id: string) => Promise<BusinessCustomerSummary>;
  createCustomer: (
    token: string,
    body: CreateBusinessCustomerRequest,
  ) => Promise<BusinessCustomerSummary>;
  updateCustomer: (
    token: string,
    id: string,
    body: UpdateBusinessCustomerRequest,
  ) => Promise<BusinessCustomerSummary>;
  transferCustomerOwner: (
    token: string,
    id: string,
    body: TransferBusinessOwnerRequest,
  ) => Promise<BusinessCustomerSummary>;
  archiveCustomer: (token: string, id: string) => Promise<BusinessDeleteResult>;
  listContacts: (
    token: string,
    query?: BusinessContactQueryRequest,
  ) => Promise<BusinessContactPage>;
  getContact: (token: string, id: string) => Promise<BusinessContactSummary>;
  createContact: (
    token: string,
    body: CreateBusinessContactRequest,
  ) => Promise<BusinessContactSummary>;
  updateContact: (
    token: string,
    id: string,
    body: UpdateBusinessContactRequest,
  ) => Promise<BusinessContactSummary>;
  archiveContact: (token: string, id: string) => Promise<BusinessDeleteResult>;
  listActivities: (
    token: string,
    query?: BusinessTargetQueryRequest,
  ) => Promise<BusinessActivityPage>;
  listFollowUps: (
    token: string,
    query?: BusinessTargetQueryRequest,
  ) => Promise<BusinessFollowUpPage>;
  createFollowUp: (
    token: string,
    body: CreateBusinessFollowUpRequest,
  ) => Promise<BusinessFollowUpPage['items'][number]>;
  listTasks: (
    token: string,
    query?: BusinessTaskQueryRequest,
  ) => Promise<BusinessTaskPage>;
  createTask: (
    token: string,
    body: CreateBusinessTaskRequest,
  ) => Promise<BusinessTaskSummary>;
  completeTask: (
    token: string,
    id: string,
    body: CompleteBusinessTaskRequest,
  ) => Promise<BusinessTaskSummary>;
  listAttachments: (
    token: string,
    query?: BusinessTargetQueryRequest,
  ) => Promise<BusinessAttachmentPage>;
  createAttachment: (
    token: string,
    body: CreateBusinessAttachmentRequest,
  ) => Promise<BusinessAttachmentPage['items'][number]>;
  listOwnerTransfers: (
    token: string,
    query?: BusinessTargetQueryRequest,
  ) => Promise<BusinessOwnerTransferPage>;
  listAuditEvents: (
    token: string,
    query?: BusinessTargetQueryRequest,
  ) => Promise<BusinessAuditEventPage>;
};

export function createBusinessCoreClient(
  request: SdkRequest,
): BusinessCoreClient {
  return {
    exportBusinessCore: (token, query) =>
      request<BusinessExportPreview>(
        withQuery('/business/core/export', query),
        {
          token,
        },
      ),
    listTags: (token, query) =>
      request<BusinessTagPage>(withQuery('/business/core/tags', query), {
        token,
      }),
    createTag: (token, body) =>
      request<BusinessTagSummary>('/business/core/tags', {
        method: 'POST',
        body,
        token,
      }),
    updateTag: (token, id, body) =>
      request<BusinessTagSummary>(
        `/business/core/tags/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    listCustomers: (token, query) =>
      request<BusinessCustomerPage>(
        withQuery('/business/core/customers', query),
        { token },
      ),
    getCustomer: (token, id) =>
      request<BusinessCustomerSummary>(
        `/business/core/customers/${encodeURIComponent(id)}`,
        { token },
      ),
    createCustomer: (token, body) =>
      request<BusinessCustomerSummary>('/business/core/customers', {
        method: 'POST',
        body,
        token,
      }),
    updateCustomer: (token, id, body) =>
      request<BusinessCustomerSummary>(
        `/business/core/customers/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    transferCustomerOwner: (token, id, body) =>
      request<BusinessCustomerSummary>(
        `/business/core/customers/${encodeURIComponent(id)}/transfer`,
        { method: 'PATCH', body, token },
      ),
    archiveCustomer: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/core/customers/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listContacts: (token, query) =>
      request<BusinessContactPage>(
        withQuery('/business/core/contacts', query),
        { token },
      ),
    getContact: (token, id) =>
      request<BusinessContactSummary>(
        `/business/core/contacts/${encodeURIComponent(id)}`,
        { token },
      ),
    createContact: (token, body) =>
      request<BusinessContactSummary>('/business/core/contacts', {
        method: 'POST',
        body,
        token,
      }),
    updateContact: (token, id, body) =>
      request<BusinessContactSummary>(
        `/business/core/contacts/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    archiveContact: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/core/contacts/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listActivities: (token, query) =>
      request<BusinessActivityPage>(
        withQuery('/business/core/activity', query),
        { token },
      ),
    listFollowUps: (token, query) =>
      request<BusinessFollowUpPage>(
        withQuery('/business/core/follow-ups', query),
        { token },
      ),
    createFollowUp: (token, body) =>
      request<BusinessFollowUpPage['items'][number]>(
        '/business/core/follow-ups',
        {
          method: 'POST',
          body,
          token,
        },
      ),
    listTasks: (token, query) =>
      request<BusinessTaskPage>(withQuery('/business/core/tasks', query), {
        token,
      }),
    createTask: (token, body) =>
      request<BusinessTaskSummary>('/business/core/tasks', {
        method: 'POST',
        body,
        token,
      }),
    completeTask: (token, id, body) =>
      request<BusinessTaskSummary>(
        `/business/core/tasks/${encodeURIComponent(id)}/complete`,
        { method: 'PATCH', body, token },
      ),
    listAttachments: (token, query) =>
      request<BusinessAttachmentPage>(
        withQuery('/business/core/attachments', query),
        { token },
      ),
    createAttachment: (token, body) =>
      request<BusinessAttachmentPage['items'][number]>(
        '/business/core/attachments',
        {
          method: 'POST',
          body,
          token,
        },
      ),
    listOwnerTransfers: (token, query) =>
      request<BusinessOwnerTransferPage>(
        withQuery('/business/core/owner-transfers', query),
        { token },
      ),
    listAuditEvents: (token, query) =>
      request<BusinessAuditEventPage>(
        withQuery('/business/core/audit-events', query),
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
