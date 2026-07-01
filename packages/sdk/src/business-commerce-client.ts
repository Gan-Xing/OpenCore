import type { SdkRequest } from './rbac-client';
import type {
  BusinessCommerceActionRequest,
  BusinessCommerceExportPreview,
  BusinessCommerceExportQueryRequest,
  BusinessCommerceSummary,
  BusinessContractPage,
  BusinessContractQueryRequest,
  BusinessContractSummary,
  BusinessDeleteResult,
  BusinessProductPage,
  BusinessProductQueryRequest,
  BusinessProductSummary,
  BusinessQuotePage,
  BusinessQuoteQueryRequest,
  BusinessQuoteSummary,
  BusinessReceivablePage,
  BusinessReceivableQueryRequest,
  BusinessReceivableSummary,
  CreateBusinessContractRequest,
  CreateBusinessProductRequest,
  CreateBusinessQuoteRequest,
  CreateBusinessReceivableRequest,
  PageRequest,
  RecordBusinessReceivablePaymentRequest,
  UpdateBusinessContractRequest,
  UpdateBusinessProductRequest,
  UpdateBusinessQuoteRequest,
  UpdateBusinessReceivableRequest,
} from './business-commerce-types';

export type BusinessCommerceClient = {
  getSummary: (token: string) => Promise<BusinessCommerceSummary>;
  exportBusinessCommerce: (
    token: string,
    query: BusinessCommerceExportQueryRequest,
  ) => Promise<BusinessCommerceExportPreview>;
  listProducts: (
    token: string,
    query?: BusinessProductQueryRequest,
  ) => Promise<BusinessProductPage>;
  getProduct: (token: string, id: string) => Promise<BusinessProductSummary>;
  createProduct: (
    token: string,
    body: CreateBusinessProductRequest,
  ) => Promise<BusinessProductSummary>;
  updateProduct: (
    token: string,
    id: string,
    body: UpdateBusinessProductRequest,
  ) => Promise<BusinessProductSummary>;
  archiveProduct: (token: string, id: string) => Promise<BusinessDeleteResult>;
  listQuotes: (
    token: string,
    query?: BusinessQuoteQueryRequest,
  ) => Promise<BusinessQuotePage>;
  getQuote: (token: string, id: string) => Promise<BusinessQuoteSummary>;
  createQuote: (
    token: string,
    body: CreateBusinessQuoteRequest,
  ) => Promise<BusinessQuoteSummary>;
  updateQuote: (
    token: string,
    id: string,
    body: UpdateBusinessQuoteRequest,
  ) => Promise<BusinessQuoteSummary>;
  submitQuote: (
    token: string,
    id: string,
    body?: BusinessCommerceActionRequest,
  ) => Promise<BusinessQuoteSummary>;
  acceptQuote: (
    token: string,
    id: string,
    body?: BusinessCommerceActionRequest,
  ) => Promise<BusinessQuoteSummary>;
  archiveQuote: (token: string, id: string) => Promise<BusinessDeleteResult>;
  listContracts: (
    token: string,
    query?: BusinessContractQueryRequest,
  ) => Promise<BusinessContractPage>;
  getContract: (token: string, id: string) => Promise<BusinessContractSummary>;
  createContract: (
    token: string,
    body: CreateBusinessContractRequest,
  ) => Promise<BusinessContractSummary>;
  updateContract: (
    token: string,
    id: string,
    body: UpdateBusinessContractRequest,
  ) => Promise<BusinessContractSummary>;
  activateContract: (
    token: string,
    id: string,
    body?: BusinessCommerceActionRequest,
  ) => Promise<BusinessContractSummary>;
  completeContract: (
    token: string,
    id: string,
    body?: BusinessCommerceActionRequest,
  ) => Promise<BusinessContractSummary>;
  archiveContract: (token: string, id: string) => Promise<BusinessDeleteResult>;
  listReceivables: (
    token: string,
    query?: BusinessReceivableQueryRequest,
  ) => Promise<BusinessReceivablePage>;
  getReceivable: (
    token: string,
    id: string,
  ) => Promise<BusinessReceivableSummary>;
  createReceivable: (
    token: string,
    body: CreateBusinessReceivableRequest,
  ) => Promise<BusinessReceivableSummary>;
  updateReceivable: (
    token: string,
    id: string,
    body: UpdateBusinessReceivableRequest,
  ) => Promise<BusinessReceivableSummary>;
  recordReceivablePayment: (
    token: string,
    id: string,
    body: RecordBusinessReceivablePaymentRequest,
  ) => Promise<BusinessReceivableSummary>;
  cancelReceivable: (
    token: string,
    id: string,
  ) => Promise<BusinessDeleteResult>;
};

export function createBusinessCommerceClient(
  request: SdkRequest,
): BusinessCommerceClient {
  return {
    getSummary: (token) =>
      request<BusinessCommerceSummary>('/business/commerce/summary', { token }),
    exportBusinessCommerce: (token, query) =>
      request<BusinessCommerceExportPreview>(
        withQuery('/business/commerce/export', query),
        { token },
      ),
    listProducts: (token, query) =>
      request<BusinessProductPage>(
        withQuery('/business/commerce/products', query),
        { token },
      ),
    getProduct: (token, id) =>
      request<BusinessProductSummary>(
        `/business/commerce/products/${encodeURIComponent(id)}`,
        { token },
      ),
    createProduct: (token, body) =>
      request<BusinessProductSummary>('/business/commerce/products', {
        body,
        method: 'POST',
        token,
      }),
    updateProduct: (token, id, body) =>
      request<BusinessProductSummary>(
        `/business/commerce/products/${encodeURIComponent(id)}`,
        { body, method: 'PATCH', token },
      ),
    archiveProduct: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/commerce/products/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listQuotes: (token, query) =>
      request<BusinessQuotePage>(
        withQuery('/business/commerce/quotes', query),
        { token },
      ),
    getQuote: (token, id) =>
      request<BusinessQuoteSummary>(
        `/business/commerce/quotes/${encodeURIComponent(id)}`,
        { token },
      ),
    createQuote: (token, body) =>
      request<BusinessQuoteSummary>('/business/commerce/quotes', {
        body,
        method: 'POST',
        token,
      }),
    updateQuote: (token, id, body) =>
      request<BusinessQuoteSummary>(
        `/business/commerce/quotes/${encodeURIComponent(id)}`,
        { body, method: 'PATCH', token },
      ),
    submitQuote: (token, id, body = {}) =>
      request<BusinessQuoteSummary>(
        `/business/commerce/quotes/${encodeURIComponent(id)}/submit`,
        { body, method: 'PATCH', token },
      ),
    acceptQuote: (token, id, body = {}) =>
      request<BusinessQuoteSummary>(
        `/business/commerce/quotes/${encodeURIComponent(id)}/accept`,
        { body, method: 'PATCH', token },
      ),
    archiveQuote: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/commerce/quotes/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listContracts: (token, query) =>
      request<BusinessContractPage>(
        withQuery('/business/commerce/contracts', query),
        { token },
      ),
    getContract: (token, id) =>
      request<BusinessContractSummary>(
        `/business/commerce/contracts/${encodeURIComponent(id)}`,
        { token },
      ),
    createContract: (token, body) =>
      request<BusinessContractSummary>('/business/commerce/contracts', {
        body,
        method: 'POST',
        token,
      }),
    updateContract: (token, id, body) =>
      request<BusinessContractSummary>(
        `/business/commerce/contracts/${encodeURIComponent(id)}`,
        { body, method: 'PATCH', token },
      ),
    activateContract: (token, id, body = {}) =>
      request<BusinessContractSummary>(
        `/business/commerce/contracts/${encodeURIComponent(id)}/activate`,
        { body, method: 'PATCH', token },
      ),
    completeContract: (token, id, body = {}) =>
      request<BusinessContractSummary>(
        `/business/commerce/contracts/${encodeURIComponent(id)}/complete`,
        { body, method: 'PATCH', token },
      ),
    archiveContract: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/commerce/contracts/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listReceivables: (token, query) =>
      request<BusinessReceivablePage>(
        withQuery('/business/commerce/receivables', query),
        { token },
      ),
    getReceivable: (token, id) =>
      request<BusinessReceivableSummary>(
        `/business/commerce/receivables/${encodeURIComponent(id)}`,
        { token },
      ),
    createReceivable: (token, body) =>
      request<BusinessReceivableSummary>('/business/commerce/receivables', {
        body,
        method: 'POST',
        token,
      }),
    updateReceivable: (token, id, body) =>
      request<BusinessReceivableSummary>(
        `/business/commerce/receivables/${encodeURIComponent(id)}`,
        { body, method: 'PATCH', token },
      ),
    recordReceivablePayment: (token, id, body) =>
      request<BusinessReceivableSummary>(
        `/business/commerce/receivables/${encodeURIComponent(id)}/pay`,
        { body, method: 'PATCH', token },
      ),
    cancelReceivable: (token, id) =>
      request<BusinessDeleteResult>(
        `/business/commerce/receivables/${encodeURIComponent(id)}`,
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
