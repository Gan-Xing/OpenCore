import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export const BUSINESS_PRODUCT_STATUSES = [
  'active',
  'inactive',
  'archived',
] as const;
export const BUSINESS_WRITABLE_PRODUCT_STATUSES = [
  'active',
  'inactive',
] as const;
export const BUSINESS_QUOTE_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'archived',
] as const;
export const BUSINESS_CONTRACT_STATUSES = [
  'draft',
  'active',
  'completed',
  'terminated',
  'archived',
] as const;
export const BUSINESS_RECEIVABLE_STATUSES = [
  'pending',
  'partial',
  'paid',
  'overdue',
  'canceled',
] as const;

export type BusinessProductStatus = (typeof BUSINESS_PRODUCT_STATUSES)[number];
export type BusinessWritableProductStatus =
  (typeof BUSINESS_WRITABLE_PRODUCT_STATUSES)[number];
export type BusinessQuoteStatus = (typeof BUSINESS_QUOTE_STATUSES)[number];
export type BusinessContractStatus =
  (typeof BUSINESS_CONTRACT_STATUSES)[number];
export type BusinessReceivableStatus =
  (typeof BUSINESS_RECEIVABLE_STATUSES)[number];

export class BusinessCommerceSummaryDto {
  @ApiProperty()
  products!: number;

  @ApiProperty()
  openQuotes!: number;

  @ApiProperty()
  acceptedQuoteAmount!: string;

  @ApiProperty()
  activeContracts!: number;

  @ApiProperty()
  activeContractAmount!: string;

  @ApiProperty()
  openReceivables!: number;

  @ApiProperty()
  receivableBalance!: string;
}

export class BusinessCommerceExportQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  resource?: string;
}

export class BusinessCommerceExportPreviewDto {
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

export class BusinessProductQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ enum: BUSINESS_PRODUCT_STATUSES, required: false })
  status?: BusinessProductStatus;

  @ApiProperty({ required: false })
  category?: string;
}

export class BusinessQuoteQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ enum: BUSINESS_QUOTE_STATUSES, required: false })
  status?: BusinessQuoteStatus;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  customerId?: string;
}

export class BusinessContractQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ enum: BUSINESS_CONTRACT_STATUSES, required: false })
  status?: BusinessContractStatus;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  customerId?: string;
}

export class BusinessReceivableQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  keyword?: string;

  @ApiProperty({ enum: BUSINESS_RECEIVABLE_STATUSES, required: false })
  status?: BusinessReceivableStatus;

  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  contractId?: string;
}

export class BusinessProductDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty({ enum: BUSINESS_PRODUCT_STATUSES })
  status!: BusinessProductStatus;

  @ApiProperty()
  listPrice!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  taxRate!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessQuoteLineDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  quoteId!: string;

  @ApiProperty({ required: false })
  productId?: string;

  @ApiProperty({ required: false })
  productSku?: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  discountRate!: string;

  @ApiProperty()
  taxRate!: string;

  @ApiProperty()
  lineAmount!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessQuoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  opportunityId?: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: BUSINESS_QUOTE_STATUSES })
  status!: BusinessQuoteStatus;

  @ApiProperty()
  owner!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  subtotalAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  taxAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty({ required: false })
  validUntil?: string;

  @ApiProperty({ required: false })
  issuedAt?: string;

  @ApiProperty({ required: false })
  acceptedAt?: string;

  @ApiProperty({ required: false })
  rejectedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ type: [BusinessQuoteLineDto] })
  lines!: readonly BusinessQuoteLineDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessContractDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  quoteId?: string;

  @ApiProperty({ required: false })
  opportunityId?: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: BUSINESS_CONTRACT_STATUSES })
  status!: BusinessContractStatus;

  @ApiProperty()
  owner!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ required: false })
  signedAt?: string;

  @ApiProperty({ required: false })
  effectiveFrom?: string;

  @ApiProperty({ required: false })
  effectiveTo?: string;

  @ApiProperty({ required: false })
  terminatedAt?: string;

  @ApiProperty({ required: false })
  archivedAt?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  receivableCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessReceivableDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  contractId!: string;

  @ApiProperty({ required: false })
  contractName?: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: BUSINESS_RECEIVABLE_STATUSES })
  status!: BusinessReceivableStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  dueAt!: string;

  @ApiProperty({ required: false })
  paidAt?: string;

  @ApiProperty({ required: false })
  canceledAt?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class BusinessProductPageDto {
  @ApiProperty({ type: [BusinessProductDto] })
  items!: BusinessProductDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BusinessQuotePageDto {
  @ApiProperty({ type: [BusinessQuoteDto] })
  items!: BusinessQuoteDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BusinessContractPageDto {
  @ApiProperty({ type: [BusinessContractDto] })
  items!: BusinessContractDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class BusinessReceivablePageDto {
  @ApiProperty({ type: [BusinessReceivableDto] })
  items!: BusinessReceivableDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CreateBusinessProductDto {
  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  listPrice?: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  taxRate?: string;

  @ApiProperty({ required: false })
  description?: string;
}

export class UpdateBusinessProductDto {
  @ApiProperty({ required: false })
  sku?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  category?: string | null;

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ enum: BUSINESS_WRITABLE_PRODUCT_STATUSES, required: false })
  status?: BusinessWritableProductStatus;

  @ApiProperty({ required: false })
  listPrice?: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  taxRate?: string;

  @ApiProperty({ required: false })
  description?: string | null;
}

export class CreateBusinessQuoteLineDto {
  @ApiProperty({ required: false })
  productId?: string;

  @ApiProperty({ required: false })
  productSku?: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  quantity?: string;

  @ApiProperty({ required: false })
  unitPrice?: string;

  @ApiProperty({ required: false })
  discountRate?: string;

  @ApiProperty({ required: false })
  taxRate?: string;
}

export class CreateBusinessQuoteDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  opportunityId?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  validUntil?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ type: [CreateBusinessQuoteLineDto] })
  lines!: CreateBusinessQuoteLineDto[];
}

export class UpdateBusinessQuoteDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  opportunityId?: string | null;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  validUntil?: string | null;

  @ApiProperty({ required: false })
  remark?: string | null;

  @ApiProperty({ type: [CreateBusinessQuoteLineDto], required: false })
  lines?: CreateBusinessQuoteLineDto[];
}

export class CreateBusinessContractDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false })
  quoteId?: string;

  @ApiProperty({ required: false })
  opportunityId?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty({ required: false })
  signedAt?: string;

  @ApiProperty({ required: false })
  effectiveFrom?: string;

  @ApiProperty({ required: false })
  effectiveTo?: string;

  @ApiProperty({ required: false })
  remark?: string;
}

export class UpdateBusinessContractDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false })
  quoteId?: string | null;

  @ApiProperty({ required: false })
  opportunityId?: string | null;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  owner?: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty({ required: false })
  signedAt?: string | null;

  @ApiProperty({ required: false })
  effectiveFrom?: string | null;

  @ApiProperty({ required: false })
  effectiveTo?: string | null;

  @ApiProperty({ required: false })
  remark?: string | null;
}

export class CreateBusinessReceivableDto {
  @ApiProperty()
  contractId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty()
  dueAt!: string;

  @ApiProperty({ required: false })
  remark?: string;
}

export class UpdateBusinessReceivableDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  amount?: string;

  @ApiProperty({ required: false })
  dueAt?: string;

  @ApiProperty({ required: false })
  remark?: string | null;
}

export class BusinessCommerceActionDto {
  @ApiProperty({ required: false })
  actor?: string;
}

export class RecordBusinessReceivablePaymentDto {
  @ApiProperty()
  amount!: string;

  @ApiProperty({ required: false })
  actor?: string;
}
