import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestContext } from '@opencore/core';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '@opencore/database';
import {
  createBusinessDbPage,
  normalizeBusinessPageWindow,
} from '../core/business.repository';
import {
  BUSINESS_CONTRACT_STATUSES,
  BUSINESS_PRODUCT_STATUSES,
  BUSINESS_QUOTE_STATUSES,
  BUSINESS_RECEIVABLE_STATUSES,
  BUSINESS_WRITABLE_PRODUCT_STATUSES,
  type BusinessCommerceActionDto,
  type BusinessCommerceExportPreviewDto,
  type BusinessCommerceExportQueryDto,
  type BusinessCommerceSummaryDto,
  type BusinessContractDto,
  type BusinessContractPageDto,
  type BusinessContractQueryDto,
  type BusinessContractStatus,
  type BusinessProductDto,
  type BusinessProductPageDto,
  type BusinessProductQueryDto,
  type BusinessProductStatus,
  type BusinessQuoteDto,
  type BusinessQuoteLineDto,
  type BusinessQuotePageDto,
  type BusinessQuoteQueryDto,
  type BusinessQuoteStatus,
  type BusinessReceivableDto,
  type BusinessReceivablePageDto,
  type BusinessReceivableQueryDto,
  type BusinessReceivableStatus,
  type BusinessWritableProductStatus,
  type CreateBusinessContractDto,
  type CreateBusinessProductDto,
  type CreateBusinessQuoteDto,
  type CreateBusinessQuoteLineDto,
  type CreateBusinessReceivableDto,
  type RecordBusinessReceivablePaymentDto,
  type UpdateBusinessContractDto,
  type UpdateBusinessProductDto,
  type UpdateBusinessQuoteDto,
  type UpdateBusinessReceivableDto,
} from './commerce.dto';
import {
  BusinessCommerceRepository,
  commerceBadRequest,
  commerceNotFound,
} from './commerce.repository';

const ROOT_TENANT_ID = 'tenant_root';
const CSV_CONTENT_TYPE = 'text/csv;charset=utf-8';

const QUOTE_INCLUDE = {
  customer: true,
  lines: { orderBy: { createdAt: 'asc' as const } },
};
const CONTRACT_INCLUDE = {
  customer: true,
  _count: { select: { receivables: true } },
};
const RECEIVABLE_INCLUDE = {
  contract: true,
  customer: true,
};

type BusinessQuoteRow = Prisma.BusinessQuoteGetPayload<{
  include: typeof QUOTE_INCLUDE;
}>;
type BusinessContractRow = Prisma.BusinessContractGetPayload<{
  include: typeof CONTRACT_INCLUDE;
}>;
type BusinessReceivableRow = Prisma.BusinessReceivableGetPayload<{
  include: typeof RECEIVABLE_INCLUDE;
}>;

type NormalizedQuoteLine = {
  discountRate: Prisma.Decimal;
  lineAmount: Prisma.Decimal;
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  unit: string;
  unitPrice: Prisma.Decimal;
};

type QuoteTotals = {
  discountAmount: Prisma.Decimal;
  lines: NormalizedQuoteLine[];
  subtotalAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
};

@Injectable()
export class PrismaCommerceRepository extends BusinessCommerceRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary(): Promise<BusinessCommerceSummaryDto> {
    const tenantId = resolveCurrentTenantId();
    const openReceivableWhere = {
      tenantId,
      status: { in: ['pending', 'partial', 'overdue'] },
    };
    const [
      products,
      openQuotes,
      acceptedQuoteAmount,
      activeContracts,
      activeContractAmount,
      openReceivables,
      openReceivableAmount,
    ] = await Promise.all([
      this.prisma.businessProduct.count({
        where: { tenantId, archivedAt: null, status: { not: 'archived' } },
      }),
      this.prisma.businessQuote.count({
        where: {
          tenantId,
          archivedAt: null,
          status: { in: ['draft', 'sent'] },
        },
      }),
      this.prisma.businessQuote.aggregate({
        _sum: { totalAmount: true },
        where: { tenantId, archivedAt: null, status: 'accepted' },
      }),
      this.prisma.businessContract.count({
        where: { tenantId, archivedAt: null, status: 'active' },
      }),
      this.prisma.businessContract.aggregate({
        _sum: { amount: true },
        where: { tenantId, archivedAt: null, status: 'active' },
      }),
      this.prisma.businessReceivable.count({
        where: openReceivableWhere,
      }),
      this.prisma.businessReceivable.aggregate({
        _sum: { amount: true, paidAmount: true },
        where: openReceivableWhere,
      }),
    ]);

    const receivableAmount =
      openReceivableAmount._sum.amount ?? new Prisma.Decimal(0);
    const paidAmount =
      openReceivableAmount._sum.paidAmount ?? new Prisma.Decimal(0);

    return {
      acceptedQuoteAmount: decimalText(
        acceptedQuoteAmount._sum.totalAmount ?? new Prisma.Decimal(0),
      ),
      activeContractAmount: decimalText(
        activeContractAmount._sum.amount ?? new Prisma.Decimal(0),
      ),
      activeContracts,
      openQuotes,
      openReceivables,
      products,
      receivableBalance: decimalText(receivableAmount.minus(paidAmount)),
    };
  }

  async exportCommerce(
    query: BusinessCommerceExportQueryDto,
  ): Promise<BusinessCommerceExportPreviewDto> {
    const resource = normalizeOptionalText(query.resource);
    if (!resource) {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_EXPORT_RESOURCE_REQUIRED',
        'business commerce export resource is required.',
      );
    }

    if (resource === 'products') {
      const page = await this.listProducts(query);
      return createCsvExportPreview(
        'opencore-business-products.csv',
        ['sku', 'name', 'category', 'status', 'listPrice', 'currency'],
        page.items.map((row) => [
          row.sku,
          row.name,
          row.category ?? '',
          row.status,
          row.listPrice,
          row.currency,
        ]),
      );
    }

    if (resource === 'quotes') {
      const page = await this.listQuotes(query);
      return createCsvExportPreview(
        'opencore-business-quotes.csv',
        ['number', 'name', 'customerName', 'status', 'owner', 'totalAmount'],
        page.items.map((row) => [
          row.number,
          row.name,
          row.customerName ?? '',
          row.status,
          row.owner,
          row.totalAmount,
        ]),
      );
    }

    if (resource === 'contracts') {
      const page = await this.listContracts(query);
      return createCsvExportPreview(
        'opencore-business-contracts.csv',
        ['number', 'name', 'customerName', 'status', 'owner', 'amount'],
        page.items.map((row) => [
          row.number,
          row.name,
          row.customerName ?? '',
          row.status,
          row.owner,
          row.amount,
        ]),
      );
    }

    if (resource === 'receivables') {
      const page = await this.listReceivables(query);
      return createCsvExportPreview(
        'opencore-business-receivables.csv',
        [
          'number',
          'name',
          'customerName',
          'contractName',
          'status',
          'amount',
          'paidAmount',
          'dueAt',
        ],
        page.items.map((row) => [
          row.number,
          row.name,
          row.customerName ?? '',
          row.contractName ?? '',
          row.status,
          row.amount,
          row.paidAmount,
          row.dueAt,
        ]),
      );
    }

    throw commerceBadRequest(
      'BUSINESS_COMMERCE_EXPORT_RESOURCE_INVALID',
      'business commerce export resource is invalid.',
      { resource },
    );
  }

  async listProducts(
    query: BusinessProductQueryDto = {},
  ): Promise<BusinessProductPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildProductWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessProduct.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.businessProduct.count({ where }),
    ]);

    return createBusinessDbPage(rows.map(toProductRecord), query, total);
  }

  async getProduct(id: string): Promise<BusinessProductDto> {
    return toProductRecord(await this.findActiveProduct(id));
  }

  async createProduct(
    body: CreateBusinessProductDto,
  ): Promise<BusinessProductDto> {
    const tenantId = resolveCurrentTenantId();
    const product = await this.prisma.businessProduct.create({
      data: {
        tenantId,
        sku: requireText(body.sku, 'sku'),
        name: requireText(body.name, 'name'),
        category: normalizeOptionalText(body.category),
        unit: normalizeOptionalText(body.unit) ?? 'unit',
        listPrice: parseMoney(body.listPrice ?? '0', 'listPrice'),
        currency: normalizeOptionalText(body.currency) ?? 'USD',
        taxRate: parseRate(body.taxRate ?? '0', 'taxRate'),
        description: normalizeOptionalText(body.description),
      },
    });
    await this.writeAudit(
      tenantId,
      'product',
      product.id,
      'create-product',
      'system',
    );

    return toProductRecord(product);
  }

  async updateProduct(
    id: string,
    body: UpdateBusinessProductDto,
  ): Promise<BusinessProductDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findActiveProduct(id);
    const product = await this.prisma.businessProduct.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.sku === undefined
          ? {}
          : { sku: requireText(body.sku, 'sku') }),
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.category === undefined
          ? {}
          : { category: normalizeNullableText(body.category) }),
        ...(body.unit === undefined
          ? {}
          : { unit: requireText(body.unit, 'unit') }),
        ...(body.status === undefined
          ? {}
          : { status: parseWritableProductStatus(body.status) }),
        ...(body.listPrice === undefined
          ? {}
          : { listPrice: parseMoney(body.listPrice, 'listPrice') }),
        ...(body.currency === undefined
          ? {}
          : { currency: requireText(body.currency, 'currency') }),
        ...(body.taxRate === undefined
          ? {}
          : { taxRate: parseRate(body.taxRate, 'taxRate') }),
        ...(body.description === undefined
          ? {}
          : { description: normalizeNullableText(body.description) }),
      },
    });
    await this.writeAudit(tenantId, 'product', id, 'update-product', 'system');

    return toProductRecord(product);
  }

  async archiveProduct(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findActiveProduct(id);
    await this.prisma.businessProduct.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date(), status: 'archived' },
    });
    await this.writeAudit(tenantId, 'product', id, 'archive-product', 'system');

    return { deleted: true };
  }

  async listQuotes(
    query: BusinessQuoteQueryDto = {},
  ): Promise<BusinessQuotePageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildQuoteWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessQuote.findMany({
        include: QUOTE_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
        where,
      }),
      this.prisma.businessQuote.count({ where }),
    ]);

    return createBusinessDbPage(rows.map(toQuoteRecord), query, total);
  }

  async getQuote(id: string): Promise<BusinessQuoteDto> {
    return toQuoteRecord(await this.findActiveQuote(id));
  }

  async createQuote(body: CreateBusinessQuoteDto): Promise<BusinessQuoteDto> {
    const tenantId = resolveCurrentTenantId();
    await this.assertActiveCustomer(tenantId, body.customerId);
    const quote = await this.prisma.$transaction(async (tx) => {
      const totals = normalizeQuoteTotals(body.lines);
      const created = await tx.businessQuote.create({
        data: {
          tenantId,
          customerId: requireText(body.customerId, 'customerId'),
          opportunityId: normalizeOptionalText(body.opportunityId),
          number: createCommerceNumber('QUO'),
          name: requireText(body.name, 'name'),
          owner: requireText(body.owner, 'owner'),
          currency: normalizeOptionalText(body.currency) ?? 'USD',
          subtotalAmount: totals.subtotalAmount,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          validUntil: parseOptionalDate(body.validUntil, 'validUntil'),
          remark: normalizeOptionalText(body.remark),
        },
      });
      await tx.businessQuoteLine.createMany({
        data: totals.lines.map((line) => ({
          ...line,
          quoteId: created.id,
          tenantId,
        })),
      });
      await writeAudit(
        tx,
        tenantId,
        'quote',
        created.id,
        'create-quote',
        created.owner,
      );

      return this.findQuoteById(tx, tenantId, created.id);
    });

    return toQuoteRecord(quote);
  }

  async updateQuote(
    id: string,
    body: UpdateBusinessQuoteDto,
  ): Promise<BusinessQuoteDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findActiveQuote(id);
    assertQuoteWritable(existing);
    if (body.customerId !== undefined) {
      await this.assertActiveCustomer(tenantId, body.customerId);
    }

    const quote = await this.prisma.$transaction(async (tx) => {
      const totals =
        body.lines === undefined ? undefined : normalizeQuoteTotals(body.lines);
      await tx.businessQuote.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          ...(body.customerId === undefined
            ? {}
            : { customerId: requireText(body.customerId, 'customerId') }),
          ...(body.opportunityId === undefined
            ? {}
            : { opportunityId: normalizeNullableText(body.opportunityId) }),
          ...(body.name === undefined
            ? {}
            : { name: requireText(body.name, 'name') }),
          ...(body.owner === undefined
            ? {}
            : { owner: requireText(body.owner, 'owner') }),
          ...(body.currency === undefined
            ? {}
            : { currency: requireText(body.currency, 'currency') }),
          ...(body.validUntil === undefined
            ? {}
            : { validUntil: parseNullableDate(body.validUntil, 'validUntil') }),
          ...(body.remark === undefined
            ? {}
            : { remark: normalizeNullableText(body.remark) }),
          ...(totals === undefined
            ? {}
            : {
                discountAmount: totals.discountAmount,
                subtotalAmount: totals.subtotalAmount,
                taxAmount: totals.taxAmount,
                totalAmount: totals.totalAmount,
              }),
        },
      });
      if (totals) {
        await tx.businessQuoteLine.deleteMany({
          where: { tenantId, quoteId: id },
        });
        await tx.businessQuoteLine.createMany({
          data: totals.lines.map((line) => ({
            ...line,
            quoteId: id,
            tenantId,
          })),
        });
      }
      await writeAudit(
        tx,
        tenantId,
        'quote',
        id,
        'update-quote',
        body.owner ?? existing.owner,
      );

      return this.findQuoteById(tx, tenantId, id);
    });

    return toQuoteRecord(quote);
  }

  async submitQuote(
    id: string,
    body: BusinessCommerceActionDto = {},
  ): Promise<BusinessQuoteDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findActiveQuote(id);
    if (existing.status !== 'draft') {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_QUOTE_SUBMIT_STATUS_INVALID',
        'only draft quotes can be submitted.',
        { id, status: existing.status },
      );
    }

    const quote = await this.prisma.businessQuote.update({
      where: { tenantId_id: { tenantId, id } },
      data: { issuedAt: new Date(), status: 'sent' },
      include: QUOTE_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'quote',
      id,
      'submit-quote',
      normalizeOptionalText(body.actor) ?? quote.owner,
    );

    return toQuoteRecord(quote);
  }

  async acceptQuote(
    id: string,
    body: BusinessCommerceActionDto = {},
  ): Promise<BusinessQuoteDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findActiveQuote(id);
    if (!['draft', 'sent'].includes(existing.status)) {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_QUOTE_ACCEPT_STATUS_INVALID',
        'only draft or sent quotes can be accepted.',
        { id, status: existing.status },
      );
    }

    const quote = await this.prisma.businessQuote.update({
      where: { tenantId_id: { tenantId, id } },
      data: { acceptedAt: new Date(), status: 'accepted' },
      include: QUOTE_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'quote',
      id,
      'accept-quote',
      normalizeOptionalText(body.actor) ?? quote.owner,
    );

    return toQuoteRecord(quote);
  }

  async archiveQuote(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findActiveQuote(id);
    await this.prisma.businessQuote.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date(), status: 'archived' },
    });
    await this.writeAudit(tenantId, 'quote', id, 'archive-quote', 'system');

    return { deleted: true };
  }

  async listContracts(
    query: BusinessContractQueryDto = {},
  ): Promise<BusinessContractPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildContractWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessContract.findMany({
        include: CONTRACT_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
        where,
      }),
      this.prisma.businessContract.count({ where }),
    ]);

    return createBusinessDbPage(rows.map(toContractRecord), query, total);
  }

  async getContract(id: string): Promise<BusinessContractDto> {
    return toContractRecord(await this.findActiveContract(id));
  }

  async createContract(
    body: CreateBusinessContractDto,
  ): Promise<BusinessContractDto> {
    const tenantId = resolveCurrentTenantId();
    await this.assertActiveCustomer(tenantId, body.customerId);
    const quote = body.quoteId
      ? await this.assertActiveQuote(tenantId, body.quoteId)
      : undefined;
    if (quote && quote.customerId !== body.customerId) {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_CONTRACT_QUOTE_CUSTOMER_MISMATCH',
        'contract quote belongs to another customer.',
        { customerId: body.customerId, quoteId: body.quoteId },
      );
    }

    const contract = await this.prisma.businessContract.create({
      data: {
        tenantId,
        customerId: requireText(body.customerId, 'customerId'),
        quoteId: normalizeOptionalText(body.quoteId),
        opportunityId: normalizeOptionalText(body.opportunityId),
        number: createCommerceNumber('CON'),
        name: requireText(body.name, 'name'),
        owner: requireText(body.owner, 'owner'),
        currency:
          normalizeOptionalText(body.currency) ?? quote?.currency ?? 'USD',
        amount: parseMoney(
          body.amount ?? quote?.totalAmount.toFixed(2) ?? '0',
          'amount',
        ),
        signedAt: parseOptionalDate(body.signedAt, 'signedAt'),
        effectiveFrom: parseOptionalDate(body.effectiveFrom, 'effectiveFrom'),
        effectiveTo: parseOptionalDate(body.effectiveTo, 'effectiveTo'),
        remark: normalizeOptionalText(body.remark),
      },
      include: CONTRACT_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'contract',
      contract.id,
      'create-contract',
      contract.owner,
    );

    return toContractRecord(contract);
  }

  async updateContract(
    id: string,
    body: UpdateBusinessContractDto,
  ): Promise<BusinessContractDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findActiveContract(id);
    assertContractWritable(existing);
    if (body.customerId !== undefined) {
      await this.assertActiveCustomer(tenantId, body.customerId);
    }
    if (body.quoteId) {
      await this.assertActiveQuote(tenantId, body.quoteId);
    }

    const contract = await this.prisma.businessContract.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.customerId === undefined
          ? {}
          : { customerId: requireText(body.customerId, 'customerId') }),
        ...(body.quoteId === undefined
          ? {}
          : { quoteId: normalizeNullableText(body.quoteId) }),
        ...(body.opportunityId === undefined
          ? {}
          : { opportunityId: normalizeNullableText(body.opportunityId) }),
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.owner === undefined
          ? {}
          : { owner: requireText(body.owner, 'owner') }),
        ...(body.currency === undefined
          ? {}
          : { currency: requireText(body.currency, 'currency') }),
        ...(body.amount === undefined
          ? {}
          : { amount: parseMoney(body.amount, 'amount') }),
        ...(body.signedAt === undefined
          ? {}
          : { signedAt: parseNullableDate(body.signedAt, 'signedAt') }),
        ...(body.effectiveFrom === undefined
          ? {}
          : {
              effectiveFrom: parseNullableDate(
                body.effectiveFrom,
                'effectiveFrom',
              ),
            }),
        ...(body.effectiveTo === undefined
          ? {}
          : {
              effectiveTo: parseNullableDate(body.effectiveTo, 'effectiveTo'),
            }),
        ...(body.remark === undefined
          ? {}
          : { remark: normalizeNullableText(body.remark) }),
      },
      include: CONTRACT_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'contract',
      id,
      'update-contract',
      contract.owner,
    );

    return toContractRecord(contract);
  }

  async activateContract(
    id: string,
    body: BusinessCommerceActionDto = {},
  ): Promise<BusinessContractDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findActiveContract(id);
    if (existing.status !== 'draft') {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_CONTRACT_ACTIVATE_STATUS_INVALID',
        'only draft contracts can be activated.',
        { id, status: existing.status },
      );
    }
    const contract = await this.prisma.businessContract.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: 'active' },
      include: CONTRACT_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'contract',
      id,
      'activate-contract',
      normalizeOptionalText(body.actor) ?? contract.owner,
    );

    return toContractRecord(contract);
  }

  async completeContract(
    id: string,
    body: BusinessCommerceActionDto = {},
  ): Promise<BusinessContractDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findActiveContract(id);
    if (existing.status !== 'active') {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_CONTRACT_COMPLETE_STATUS_INVALID',
        'only active contracts can be completed.',
        { id, status: existing.status },
      );
    }
    const contract = await this.prisma.businessContract.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: 'completed' },
      include: CONTRACT_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'contract',
      id,
      'complete-contract',
      normalizeOptionalText(body.actor) ?? contract.owner,
    );

    return toContractRecord(contract);
  }

  async archiveContract(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findActiveContract(id);
    await this.prisma.businessContract.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date(), status: 'archived' },
    });
    await this.writeAudit(
      tenantId,
      'contract',
      id,
      'archive-contract',
      'system',
    );

    return { deleted: true };
  }

  async listReceivables(
    query: BusinessReceivableQueryDto = {},
  ): Promise<BusinessReceivablePageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildReceivableWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessReceivable.findMany({
        include: RECEIVABLE_INCLUDE,
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
        where,
      }),
      this.prisma.businessReceivable.count({ where }),
    ]);

    return createBusinessDbPage(rows.map(toReceivableRecord), query, total);
  }

  async getReceivable(id: string): Promise<BusinessReceivableDto> {
    return toReceivableRecord(await this.findReceivable(id));
  }

  async createReceivable(
    body: CreateBusinessReceivableDto,
  ): Promise<BusinessReceivableDto> {
    const tenantId = resolveCurrentTenantId();
    const contract = await this.findActiveContract(body.contractId);
    const dueAt = parseRequiredDate(body.dueAt, 'dueAt');
    const amount = parseMoney(
      body.amount ?? contract.amount.toFixed(2),
      'amount',
    );
    const receivable = await this.prisma.businessReceivable.create({
      data: {
        tenantId,
        contractId: requireText(body.contractId, 'contractId'),
        customerId: contract.customerId,
        number: createCommerceNumber('REC'),
        name: requireText(body.name, 'name'),
        status: deriveReceivableStatus(amount, new Prisma.Decimal(0), dueAt),
        currency: contract.currency,
        amount,
        dueAt,
        remark: normalizeOptionalText(body.remark),
      },
      include: RECEIVABLE_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'receivable',
      receivable.id,
      'create-receivable',
      contract.owner,
    );

    return toReceivableRecord(receivable);
  }

  async updateReceivable(
    id: string,
    body: UpdateBusinessReceivableDto,
  ): Promise<BusinessReceivableDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findReceivable(id);
    assertReceivableWritable(existing);
    const amount =
      body.amount === undefined
        ? existing.amount
        : parseMoney(body.amount, 'amount');
    if (amount.lt(existing.paidAmount)) {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_RECEIVABLE_AMOUNT_BELOW_PAID',
        'receivable amount cannot be lower than paid amount.',
        {
          amount: amount.toFixed(2),
          paidAmount: existing.paidAmount.toFixed(2),
        },
      );
    }
    const dueAt =
      body.dueAt === undefined
        ? existing.dueAt
        : parseRequiredDate(body.dueAt, 'dueAt');
    const receivable = await this.prisma.businessReceivable.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.amount === undefined ? {} : { amount }),
        ...(body.dueAt === undefined ? {} : { dueAt }),
        ...(body.remark === undefined
          ? {}
          : { remark: normalizeNullableText(body.remark) }),
        status: deriveReceivableStatus(amount, existing.paidAmount, dueAt),
      },
      include: RECEIVABLE_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'receivable',
      id,
      'update-receivable',
      receivable.contract.owner,
    );

    return toReceivableRecord(receivable);
  }

  async recordReceivablePayment(
    id: string,
    body: RecordBusinessReceivablePaymentDto,
  ): Promise<BusinessReceivableDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findReceivable(id);
    if (['canceled', 'paid'].includes(existing.status)) {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_RECEIVABLE_PAYMENT_STATUS_INVALID',
        'receivable cannot accept payment in current status.',
        { id, status: existing.status },
      );
    }
    const amount = parsePositiveMoney(body.amount, 'amount');
    const paidAmount = existing.paidAmount.plus(amount);
    if (paidAmount.gt(existing.amount)) {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_RECEIVABLE_PAYMENT_EXCEEDS_AMOUNT',
        'payment exceeds receivable balance.',
        {
          amount: existing.amount.toFixed(2),
          paidAmount: existing.paidAmount.toFixed(2),
          paymentAmount: amount.toFixed(2),
        },
      );
    }
    const paid = paidAmount.eq(existing.amount);
    const receivable = await this.prisma.businessReceivable.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        paidAmount,
        paidAt: paid ? new Date() : null,
        status: paid ? 'paid' : 'partial',
      },
      include: RECEIVABLE_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'receivable',
      id,
      'record-receivable-payment',
      normalizeOptionalText(body.actor) ?? receivable.contract.owner,
      { paymentAmount: amount.toFixed(2) },
    );

    return toReceivableRecord(receivable);
  }

  async cancelReceivable(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findReceivable(id);
    if (existing.status === 'paid') {
      throw commerceBadRequest(
        'BUSINESS_COMMERCE_RECEIVABLE_CANCEL_PAID',
        'paid receivable cannot be canceled.',
        { id },
      );
    }
    await this.prisma.businessReceivable.update({
      where: { tenantId_id: { tenantId, id } },
      data: { canceledAt: new Date(), status: 'canceled' },
    });
    await this.writeAudit(
      tenantId,
      'receivable',
      id,
      'cancel-receivable',
      'system',
    );

    return { deleted: true };
  }

  private async findActiveProduct(id: string) {
    const tenantId = resolveCurrentTenantId();
    const product = await this.prisma.businessProduct.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    if (!product || product.archivedAt || product.status === 'archived') {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_PRODUCT_NOT_FOUND',
        'business product not found.',
        { id },
      );
    }

    return product;
  }

  private async findActiveQuote(id: string): Promise<BusinessQuoteRow> {
    const tenantId = resolveCurrentTenantId();
    const quote = await this.findQuoteById(this.prisma, tenantId, id);
    if (!quote || quote.archivedAt || quote.status === 'archived') {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_QUOTE_NOT_FOUND',
        'business quote not found.',
        { id },
      );
    }

    return quote;
  }

  private async assertActiveQuote(
    tenantId: string,
    id: string,
  ): Promise<BusinessQuoteRow> {
    const quote = await this.findQuoteById(this.prisma, tenantId, id);
    if (!quote || quote.archivedAt || quote.status === 'archived') {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_QUOTE_NOT_FOUND',
        'business quote not found.',
        { id },
      );
    }

    return quote;
  }

  private async findQuoteById(
    client: PrismaService | PrismaTransactionClient,
    tenantId: string,
    id: string,
  ): Promise<BusinessQuoteRow> {
    const quote = await client.businessQuote.findUnique({
      include: QUOTE_INCLUDE,
      where: { tenantId_id: { tenantId, id } },
    });
    if (!quote) {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_QUOTE_NOT_FOUND',
        'business quote not found.',
        { id },
      );
    }

    return quote;
  }

  private async findActiveContract(id: string): Promise<BusinessContractRow> {
    const tenantId = resolveCurrentTenantId();
    const contract = await this.prisma.businessContract.findUnique({
      include: CONTRACT_INCLUDE,
      where: { tenantId_id: { tenantId, id } },
    });
    if (!contract || contract.archivedAt || contract.status === 'archived') {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_CONTRACT_NOT_FOUND',
        'business contract not found.',
        { id },
      );
    }

    return contract;
  }

  private async findReceivable(id: string): Promise<BusinessReceivableRow> {
    const tenantId = resolveCurrentTenantId();
    const receivable = await this.prisma.businessReceivable.findUnique({
      include: RECEIVABLE_INCLUDE,
      where: { tenantId_id: { tenantId, id } },
    });
    if (!receivable) {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_RECEIVABLE_NOT_FOUND',
        'business receivable not found.',
        { id },
      );
    }

    return receivable;
  }

  private async assertActiveCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    const customer = await this.prisma.businessCustomer.findUnique({
      where: {
        tenantId_id: { tenantId, id: requireText(customerId, 'customerId') },
      },
      select: { archivedAt: true, id: true, status: true },
    });
    if (!customer || customer.archivedAt || customer.status === 'archived') {
      throw commerceNotFound(
        'BUSINESS_COMMERCE_CUSTOMER_NOT_FOUND',
        'business customer not found.',
        { customerId },
      );
    }
  }

  private async writeAudit(
    tenantId: string,
    targetType: string,
    targetId: string,
    action: string,
    actor: string,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    await writeAudit(
      this.prisma,
      tenantId,
      targetType,
      targetId,
      action,
      actor,
      detail,
    );
  }
}

function buildProductWhere(
  tenantId: string,
  query: BusinessProductQueryDto,
): Prisma.BusinessProductWhereInput {
  const status = parseOptionalProductStatus(query.status);
  const keyword = normalizeOptionalText(query.keyword);
  const category = normalizeOptionalText(query.category);

  return {
    tenantId,
    ...(status === 'archived'
      ? { status: 'archived' }
      : {
          archivedAt: null,
          status: status === undefined ? { not: 'archived' } : status,
        }),
    ...(category ? { category } : {}),
    ...(keyword
      ? {
          OR: [
            { sku: { contains: keyword, mode: 'insensitive' } },
            { name: { contains: keyword, mode: 'insensitive' } },
            { category: { contains: keyword, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function buildQuoteWhere(
  tenantId: string,
  query: BusinessQuoteQueryDto,
): Prisma.BusinessQuoteWhereInput {
  const status = parseOptionalQuoteStatus(query.status);
  const keyword = normalizeOptionalText(query.keyword);
  const owner = normalizeOptionalText(query.owner);
  const customerId = normalizeOptionalText(query.customerId);

  return {
    tenantId,
    ...(status === 'archived'
      ? { status: 'archived' }
      : {
          archivedAt: null,
          status: status === undefined ? { not: 'archived' } : status,
        }),
    ...(owner ? { owner } : {}),
    ...(customerId ? { customerId } : {}),
    ...(keyword
      ? {
          OR: [
            { number: { contains: keyword, mode: 'insensitive' } },
            { name: { contains: keyword, mode: 'insensitive' } },
            {
              customer: {
                name: { contains: keyword, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  };
}

function buildContractWhere(
  tenantId: string,
  query: BusinessContractQueryDto,
): Prisma.BusinessContractWhereInput {
  const status = parseOptionalContractStatus(query.status);
  const keyword = normalizeOptionalText(query.keyword);
  const owner = normalizeOptionalText(query.owner);
  const customerId = normalizeOptionalText(query.customerId);

  return {
    tenantId,
    ...(status === 'archived'
      ? { status: 'archived' }
      : {
          archivedAt: null,
          status: status === undefined ? { not: 'archived' } : status,
        }),
    ...(owner ? { owner } : {}),
    ...(customerId ? { customerId } : {}),
    ...(keyword
      ? {
          OR: [
            { number: { contains: keyword, mode: 'insensitive' } },
            { name: { contains: keyword, mode: 'insensitive' } },
            {
              customer: {
                name: { contains: keyword, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  };
}

function buildReceivableWhere(
  tenantId: string,
  query: BusinessReceivableQueryDto,
): Prisma.BusinessReceivableWhereInput {
  const status = parseOptionalReceivableStatus(query.status);
  const keyword = normalizeOptionalText(query.keyword);
  const customerId = normalizeOptionalText(query.customerId);
  const contractId = normalizeOptionalText(query.contractId);

  return {
    tenantId,
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(contractId ? { contractId } : {}),
    ...(keyword
      ? {
          OR: [
            { number: { contains: keyword, mode: 'insensitive' } },
            { name: { contains: keyword, mode: 'insensitive' } },
            {
              customer: {
                name: { contains: keyword, mode: 'insensitive' },
              },
            },
            {
              contract: {
                name: { contains: keyword, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  };
}

function toProductRecord(row: {
  archivedAt: Date | null;
  category: string | null;
  createdAt: Date;
  currency: string;
  description: string | null;
  id: string;
  listPrice: Prisma.Decimal;
  name: string;
  sku: string;
  status: string;
  taxRate: Prisma.Decimal;
  tenantId: string;
  unit: string;
  updatedAt: Date;
}): BusinessProductDto {
  return {
    archivedAt: toOptionalIso(row.archivedAt),
    category: row.category ?? undefined,
    createdAt: row.createdAt.toISOString(),
    currency: row.currency,
    description: row.description ?? undefined,
    id: row.id,
    listPrice: decimalText(row.listPrice),
    name: row.name,
    sku: row.sku,
    status: row.status as BusinessProductStatus,
    taxRate: row.taxRate.toFixed(2),
    tenantId: row.tenantId,
    unit: row.unit,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toQuoteRecord(row: BusinessQuoteRow): BusinessQuoteDto {
  return {
    acceptedAt: toOptionalIso(row.acceptedAt),
    archivedAt: toOptionalIso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    currency: row.currency,
    customerId: row.customerId,
    customerName: row.customer.name,
    discountAmount: decimalText(row.discountAmount),
    id: row.id,
    issuedAt: toOptionalIso(row.issuedAt),
    lines: row.lines.map(toQuoteLineRecord),
    name: row.name,
    number: row.number,
    opportunityId: row.opportunityId ?? undefined,
    owner: row.owner,
    rejectedAt: toOptionalIso(row.rejectedAt),
    remark: row.remark ?? undefined,
    status: row.status as BusinessQuoteStatus,
    subtotalAmount: decimalText(row.subtotalAmount),
    taxAmount: decimalText(row.taxAmount),
    tenantId: row.tenantId,
    totalAmount: decimalText(row.totalAmount),
    updatedAt: row.updatedAt.toISOString(),
    validUntil: toOptionalIso(row.validUntil),
  };
}

function toQuoteLineRecord(row: {
  createdAt: Date;
  discountRate: Prisma.Decimal;
  id: string;
  lineAmount: Prisma.Decimal;
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: Prisma.Decimal;
  quoteId: string;
  taxRate: Prisma.Decimal;
  tenantId: string;
  unit: string;
  unitPrice: Prisma.Decimal;
  updatedAt: Date;
}): BusinessQuoteLineDto {
  return {
    createdAt: row.createdAt.toISOString(),
    discountRate: row.discountRate.toFixed(2),
    id: row.id,
    lineAmount: decimalText(row.lineAmount),
    productId: row.productId ?? undefined,
    productName: row.productName,
    productSku: row.productSku ?? undefined,
    quantity: row.quantity.toFixed(2),
    quoteId: row.quoteId,
    taxRate: row.taxRate.toFixed(2),
    tenantId: row.tenantId,
    unit: row.unit,
    unitPrice: decimalText(row.unitPrice),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toContractRecord(row: BusinessContractRow): BusinessContractDto {
  return {
    amount: decimalText(row.amount),
    archivedAt: toOptionalIso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    currency: row.currency,
    customerId: row.customerId,
    customerName: row.customer.name,
    effectiveFrom: toOptionalIso(row.effectiveFrom),
    effectiveTo: toOptionalIso(row.effectiveTo),
    id: row.id,
    name: row.name,
    number: row.number,
    opportunityId: row.opportunityId ?? undefined,
    owner: row.owner,
    quoteId: row.quoteId ?? undefined,
    receivableCount: row._count.receivables,
    remark: row.remark ?? undefined,
    signedAt: toOptionalIso(row.signedAt),
    status: row.status as BusinessContractStatus,
    tenantId: row.tenantId,
    terminatedAt: toOptionalIso(row.terminatedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toReceivableRecord(row: BusinessReceivableRow): BusinessReceivableDto {
  return {
    amount: decimalText(row.amount),
    canceledAt: toOptionalIso(row.canceledAt),
    contractId: row.contractId,
    contractName: row.contract.name,
    createdAt: row.createdAt.toISOString(),
    currency: row.currency,
    customerId: row.customerId,
    customerName: row.customer.name,
    dueAt: row.dueAt.toISOString(),
    id: row.id,
    name: row.name,
    number: row.number,
    paidAmount: decimalText(row.paidAmount),
    paidAt: toOptionalIso(row.paidAt),
    remark: row.remark ?? undefined,
    status: row.status as BusinessReceivableStatus,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeQuoteTotals(
  lines: CreateBusinessQuoteLineDto[],
): QuoteTotals {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_QUOTE_LINES_REQUIRED',
      'quote must contain at least one line.',
    );
  }

  const normalized = lines.map(normalizeQuoteLine);
  return normalized.reduce<QuoteTotals>(
    (totals, line) => {
      const gross = line.quantity.mul(line.unitPrice);
      const discount = gross.mul(line.discountRate).div(100);
      const taxable = gross.minus(discount);
      const tax = taxable.mul(line.taxRate).div(100);

      return {
        discountAmount: moneyDecimal(totals.discountAmount.plus(discount)),
        lines: [...totals.lines, line],
        subtotalAmount: moneyDecimal(totals.subtotalAmount.plus(gross)),
        taxAmount: moneyDecimal(totals.taxAmount.plus(tax)),
        totalAmount: moneyDecimal(totals.totalAmount.plus(line.lineAmount)),
      };
    },
    {
      discountAmount: new Prisma.Decimal(0),
      lines: [],
      subtotalAmount: new Prisma.Decimal(0),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(0),
    },
  );
}

function normalizeQuoteLine(
  line: CreateBusinessQuoteLineDto,
): NormalizedQuoteLine {
  const quantity = parsePositiveMoney(line.quantity ?? '1', 'quantity');
  const unitPrice = parseMoney(line.unitPrice ?? '0', 'unitPrice');
  const discountRate = parseRate(line.discountRate ?? '0', 'discountRate');
  const taxRate = parseRate(line.taxRate ?? '0', 'taxRate');
  const gross = quantity.mul(unitPrice);
  const discount = gross.mul(discountRate).div(100);
  const taxable = gross.minus(discount);
  const tax = taxable.mul(taxRate).div(100);

  return {
    discountRate,
    lineAmount: moneyDecimal(taxable.plus(tax)),
    productId: normalizeOptionalText(line.productId) ?? null,
    productName: requireText(line.productName, 'productName'),
    productSku: normalizeOptionalText(line.productSku) ?? null,
    quantity,
    taxRate,
    unit: normalizeOptionalText(line.unit) ?? 'unit',
    unitPrice,
  };
}

function assertQuoteWritable(quote: BusinessQuoteRow): void {
  if (quote.status !== 'draft') {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_QUOTE_NOT_WRITABLE',
      'only draft quotes can be updated.',
      { id: quote.id, status: quote.status },
    );
  }
}

function assertContractWritable(contract: BusinessContractRow): void {
  if (['completed', 'terminated', 'archived'].includes(contract.status)) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_CONTRACT_NOT_WRITABLE',
      'contract cannot be updated in current status.',
      { id: contract.id, status: contract.status },
    );
  }
}

function assertReceivableWritable(receivable: BusinessReceivableRow): void {
  if (['paid', 'canceled'].includes(receivable.status)) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_RECEIVABLE_NOT_WRITABLE',
      'receivable cannot be updated in current status.',
      { id: receivable.id, status: receivable.status },
    );
  }
}

function deriveReceivableStatus(
  amount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
  dueAt: Date,
): BusinessReceivableStatus {
  if (paidAmount.gte(amount)) return 'paid';
  if (paidAmount.gt(0)) return 'partial';
  if (dueAt.getTime() < Date.now()) return 'overdue';
  return 'pending';
}

function parseOptionalProductStatus(
  value: unknown,
): BusinessProductStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    BUSINESS_PRODUCT_STATUSES.includes(value as BusinessProductStatus)
  ) {
    return value as BusinessProductStatus;
  }
  throw commerceBadRequest(
    'BUSINESS_COMMERCE_PRODUCT_STATUS_INVALID',
    'business product status is invalid.',
    { status: value },
  );
}

function parseWritableProductStatus(
  value: unknown,
): BusinessWritableProductStatus {
  if (
    typeof value === 'string' &&
    BUSINESS_WRITABLE_PRODUCT_STATUSES.includes(
      value as BusinessWritableProductStatus,
    )
  ) {
    return value as BusinessWritableProductStatus;
  }
  throw commerceBadRequest(
    'BUSINESS_COMMERCE_PRODUCT_STATUS_INVALID',
    'business product status is invalid.',
    { status: value },
  );
}

function parseOptionalQuoteStatus(
  value: unknown,
): BusinessQuoteStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    BUSINESS_QUOTE_STATUSES.includes(value as BusinessQuoteStatus)
  ) {
    return value as BusinessQuoteStatus;
  }
  throw commerceBadRequest(
    'BUSINESS_COMMERCE_QUOTE_STATUS_INVALID',
    'business quote status is invalid.',
    { status: value },
  );
}

function parseOptionalContractStatus(
  value: unknown,
): BusinessContractStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    BUSINESS_CONTRACT_STATUSES.includes(value as BusinessContractStatus)
  ) {
    return value as BusinessContractStatus;
  }
  throw commerceBadRequest(
    'BUSINESS_COMMERCE_CONTRACT_STATUS_INVALID',
    'business contract status is invalid.',
    { status: value },
  );
}

function parseOptionalReceivableStatus(
  value: unknown,
): BusinessReceivableStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value === 'string' &&
    BUSINESS_RECEIVABLE_STATUSES.includes(value as BusinessReceivableStatus)
  ) {
    return value as BusinessReceivableStatus;
  }
  throw commerceBadRequest(
    'BUSINESS_COMMERCE_RECEIVABLE_STATUS_INVALID',
    'business receivable status is invalid.',
    { status: value },
  );
}

function parseMoney(value: unknown, field: string): Prisma.Decimal {
  const decimal = new Prisma.Decimal(requireText(value, field));
  if (!decimal.isFinite() || decimal.lt(0)) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_AMOUNT_INVALID',
      `${field} must be a non-negative number.`,
      { field },
    );
  }
  return moneyDecimal(decimal);
}

function parsePositiveMoney(value: unknown, field: string): Prisma.Decimal {
  const decimal = parseMoney(value, field);
  if (decimal.lte(0)) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_AMOUNT_INVALID',
      `${field} must be greater than zero.`,
      { field },
    );
  }
  return decimal;
}

function parseRate(value: unknown, field: string): Prisma.Decimal {
  const decimal = new Prisma.Decimal(requireText(value, field));
  if (!decimal.isFinite() || decimal.lt(0) || decimal.gt(100)) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_RATE_INVALID',
      `${field} must be between 0 and 100.`,
      { field },
    );
  }
  return new Prisma.Decimal(decimal.toFixed(2));
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  const text = normalizeOptionalText(value);
  if (!text) return undefined;
  return parseRequiredDate(text, field);
}

function parseNullableDate(value: unknown, field: string): Date | null {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  return parseRequiredDate(text, field);
}

function parseRequiredDate(value: unknown, field: string): Date {
  const text = requireText(value, field);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_DATE_INVALID',
      `${field} is invalid.`,
      { field },
    );
  }
  return date;
}

function moneyDecimal(value: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function decimalText(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

function normalizeNullableText(value: unknown): string | null {
  return normalizeOptionalText(value) ?? null;
}

function requireText(value: unknown, field: string): string {
  const text = normalizeOptionalText(value);
  if (!text) {
    throw commerceBadRequest(
      'BUSINESS_COMMERCE_REQUIRED_FIELD_MISSING',
      `${field} is required.`,
      { field },
    );
  }
  return text;
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function createCommerceNumber(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `${prefix}-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function toOptionalIso(value: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function createCsvExportPreview(
  filename: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): BusinessCommerceExportPreviewDto {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');

  return {
    columns: headers,
    contentBase64: Buffer.from(csv, 'utf8').toString('base64'),
    contentType: CSV_CONTENT_TYPE,
    filename,
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    scope: 'current-page',
  };
}

function escapeCsvCell(value: string): string {
  const safe = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;

  return `"${safe.replaceAll('"', '""')}"`;
}

async function writeAudit(
  client: PrismaService | PrismaTransactionClient,
  tenantId: string,
  targetType: string,
  targetId: string,
  action: string,
  actor: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await client.businessAuditEvent.create({
    data: {
      action,
      actor,
      detail: JSON.parse(JSON.stringify(detail)) as Prisma.InputJsonValue,
      targetId,
      targetType,
      tenantId,
    },
  });
}
