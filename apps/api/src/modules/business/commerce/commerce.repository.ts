import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import type {
  BusinessCommerceActionDto,
  BusinessCommerceExportPreviewDto,
  BusinessCommerceExportQueryDto,
  BusinessCommerceSummaryDto,
  BusinessContractDto,
  BusinessContractPageDto,
  BusinessContractQueryDto,
  BusinessProductDto,
  BusinessProductPageDto,
  BusinessProductQueryDto,
  BusinessQuoteDto,
  BusinessQuotePageDto,
  BusinessQuoteQueryDto,
  BusinessReceivableDto,
  BusinessReceivablePageDto,
  BusinessReceivableQueryDto,
  CreateBusinessContractDto,
  CreateBusinessProductDto,
  CreateBusinessQuoteDto,
  CreateBusinessReceivableDto,
  RecordBusinessReceivablePaymentDto,
  UpdateBusinessContractDto,
  UpdateBusinessProductDto,
  UpdateBusinessQuoteDto,
  UpdateBusinessReceivableDto,
} from './commerce.dto';

export abstract class BusinessCommerceRepository {
  abstract getSummary(): Promise<BusinessCommerceSummaryDto>;
  abstract exportCommerce(
    query: BusinessCommerceExportQueryDto,
  ): Promise<BusinessCommerceExportPreviewDto>;

  abstract listProducts(
    query?: BusinessProductQueryDto,
  ): Promise<BusinessProductPageDto>;
  abstract getProduct(id: string): Promise<BusinessProductDto>;
  abstract createProduct(
    body: CreateBusinessProductDto,
  ): Promise<BusinessProductDto>;
  abstract updateProduct(
    id: string,
    body: UpdateBusinessProductDto,
  ): Promise<BusinessProductDto>;
  abstract archiveProduct(id: string): Promise<{ deleted: true }>;

  abstract listQuotes(
    query?: BusinessQuoteQueryDto,
  ): Promise<BusinessQuotePageDto>;
  abstract getQuote(id: string): Promise<BusinessQuoteDto>;
  abstract createQuote(body: CreateBusinessQuoteDto): Promise<BusinessQuoteDto>;
  abstract updateQuote(
    id: string,
    body: UpdateBusinessQuoteDto,
  ): Promise<BusinessQuoteDto>;
  abstract submitQuote(
    id: string,
    body?: BusinessCommerceActionDto,
  ): Promise<BusinessQuoteDto>;
  abstract acceptQuote(
    id: string,
    body?: BusinessCommerceActionDto,
  ): Promise<BusinessQuoteDto>;
  abstract archiveQuote(id: string): Promise<{ deleted: true }>;

  abstract listContracts(
    query?: BusinessContractQueryDto,
  ): Promise<BusinessContractPageDto>;
  abstract getContract(id: string): Promise<BusinessContractDto>;
  abstract createContract(
    body: CreateBusinessContractDto,
  ): Promise<BusinessContractDto>;
  abstract updateContract(
    id: string,
    body: UpdateBusinessContractDto,
  ): Promise<BusinessContractDto>;
  abstract activateContract(
    id: string,
    body?: BusinessCommerceActionDto,
  ): Promise<BusinessContractDto>;
  abstract completeContract(
    id: string,
    body?: BusinessCommerceActionDto,
  ): Promise<BusinessContractDto>;
  abstract archiveContract(id: string): Promise<{ deleted: true }>;

  abstract listReceivables(
    query?: BusinessReceivableQueryDto,
  ): Promise<BusinessReceivablePageDto>;
  abstract getReceivable(id: string): Promise<BusinessReceivableDto>;
  abstract createReceivable(
    body: CreateBusinessReceivableDto,
  ): Promise<BusinessReceivableDto>;
  abstract updateReceivable(
    id: string,
    body: UpdateBusinessReceivableDto,
  ): Promise<BusinessReceivableDto>;
  abstract recordReceivablePayment(
    id: string,
    body: RecordBusinessReceivablePaymentDto,
  ): Promise<BusinessReceivableDto>;
  abstract cancelReceivable(id: string): Promise<{ deleted: true }>;
}

export function commerceBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, details, message }),
  );
}

export function commerceNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, details, message }));
}
