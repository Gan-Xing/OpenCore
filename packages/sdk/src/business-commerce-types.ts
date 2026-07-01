import type { BusinessDeleteResult } from './business-core-types';
import type { PageRequest, PageResponse } from './system-management-types';

export type { BusinessDeleteResult, PageRequest, PageResponse };

export type BusinessProductStatus = 'active' | 'archived' | 'inactive';
export type BusinessWritableProductStatus = Exclude<
  BusinessProductStatus,
  'archived'
>;
export type BusinessQuoteStatus =
  | 'accepted'
  | 'archived'
  | 'draft'
  | 'expired'
  | 'rejected'
  | 'sent';
export type BusinessContractStatus =
  | 'active'
  | 'archived'
  | 'completed'
  | 'draft'
  | 'terminated';
export type BusinessReceivableStatus =
  | 'canceled'
  | 'overdue'
  | 'paid'
  | 'partial'
  | 'pending';

export type BusinessCommerceSummary = {
  products: number;
  openQuotes: number;
  acceptedQuoteAmount: string;
  activeContracts: number;
  activeContractAmount: string;
  openReceivables: number;
  receivableBalance: string;
};

export type BusinessCommerceExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type BusinessProductSummary = {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  status: BusinessProductStatus;
  listPrice: string;
  currency: string;
  taxRate: string;
  description?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessQuoteLineSummary = {
  id: string;
  tenantId: string;
  quoteId: string;
  productId?: string;
  productSku?: string;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRate: string;
  lineAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessQuoteSummary = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  opportunityId?: string;
  number: string;
  name: string;
  status: BusinessQuoteStatus;
  owner: string;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  validUntil?: string;
  issuedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  archivedAt?: string;
  remark?: string;
  lines: readonly BusinessQuoteLineSummary[];
  createdAt: string;
  updatedAt: string;
};

export type BusinessContractSummary = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  quoteId?: string;
  opportunityId?: string;
  number: string;
  name: string;
  status: BusinessContractStatus;
  owner: string;
  currency: string;
  amount: string;
  signedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  terminatedAt?: string;
  archivedAt?: string;
  remark?: string;
  receivableCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BusinessReceivableSummary = {
  id: string;
  tenantId: string;
  contractId: string;
  contractName?: string;
  customerId: string;
  customerName?: string;
  number: string;
  name: string;
  status: BusinessReceivableStatus;
  currency: string;
  amount: string;
  paidAmount: string;
  dueAt: string;
  paidAt?: string;
  canceledAt?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessProductPage = PageResponse<BusinessProductSummary>;
export type BusinessQuotePage = PageResponse<BusinessQuoteSummary>;
export type BusinessContractPage = PageResponse<BusinessContractSummary>;
export type BusinessReceivablePage = PageResponse<BusinessReceivableSummary>;

export type BusinessProductQueryRequest = PageRequest & {
  category?: string;
  keyword?: string;
  status?: BusinessProductStatus;
};
export type BusinessQuoteQueryRequest = PageRequest & {
  customerId?: string;
  keyword?: string;
  owner?: string;
  status?: BusinessQuoteStatus;
};
export type BusinessContractQueryRequest = PageRequest & {
  customerId?: string;
  keyword?: string;
  owner?: string;
  status?: BusinessContractStatus;
};
export type BusinessReceivableQueryRequest = PageRequest & {
  contractId?: string;
  customerId?: string;
  keyword?: string;
  status?: BusinessReceivableStatus;
};
export type BusinessCommerceExportQueryRequest = PageRequest & {
  resource: 'contracts' | 'products' | 'quotes' | 'receivables';
};

export type CreateBusinessProductRequest = Pick<
  BusinessProductSummary,
  'name' | 'sku'
> &
  Partial<
    Pick<
      BusinessProductSummary,
      'category' | 'currency' | 'description' | 'listPrice' | 'taxRate' | 'unit'
    >
  >;
export type UpdateBusinessProductRequest = Partial<
  Omit<
    BusinessProductSummary,
    'archivedAt' | 'createdAt' | 'id' | 'tenantId' | 'updatedAt'
  >
> & { status?: BusinessWritableProductStatus };

export type CreateBusinessQuoteLineRequest = Partial<
  Pick<
    BusinessQuoteLineSummary,
    | 'discountRate'
    | 'productId'
    | 'productSku'
    | 'quantity'
    | 'taxRate'
    | 'unit'
    | 'unitPrice'
  >
> &
  Pick<BusinessQuoteLineSummary, 'productName'>;
export type CreateBusinessQuoteRequest = Pick<
  BusinessQuoteSummary,
  'customerId' | 'name' | 'owner'
> &
  Partial<
    Pick<
      BusinessQuoteSummary,
      'currency' | 'opportunityId' | 'remark' | 'validUntil'
    >
  > & { lines: CreateBusinessQuoteLineRequest[] };
export type UpdateBusinessQuoteRequest = Partial<
  Pick<
    BusinessQuoteSummary,
    | 'currency'
    | 'customerId'
    | 'name'
    | 'opportunityId'
    | 'owner'
    | 'remark'
    | 'validUntil'
  >
> & { lines?: CreateBusinessQuoteLineRequest[] };

export type CreateBusinessContractRequest = Pick<
  BusinessContractSummary,
  'customerId' | 'name' | 'owner'
> &
  Partial<
    Pick<
      BusinessContractSummary,
      | 'amount'
      | 'currency'
      | 'effectiveFrom'
      | 'effectiveTo'
      | 'opportunityId'
      | 'quoteId'
      | 'remark'
      | 'signedAt'
    >
  >;
export type UpdateBusinessContractRequest = Partial<
  Pick<
    BusinessContractSummary,
    | 'amount'
    | 'currency'
    | 'customerId'
    | 'effectiveFrom'
    | 'effectiveTo'
    | 'name'
    | 'opportunityId'
    | 'owner'
    | 'quoteId'
    | 'remark'
    | 'signedAt'
  >
>;

export type CreateBusinessReceivableRequest = Pick<
  BusinessReceivableSummary,
  'contractId' | 'dueAt' | 'name'
> &
  Partial<Pick<BusinessReceivableSummary, 'amount' | 'remark'>>;
export type UpdateBusinessReceivableRequest = Partial<
  Pick<BusinessReceivableSummary, 'amount' | 'dueAt' | 'name' | 'remark'>
>;

export type BusinessCommerceActionRequest = { actor?: string };
export type RecordBusinessReceivablePaymentRequest = {
  actor?: string;
  amount: string;
};
