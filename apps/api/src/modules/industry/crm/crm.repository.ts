import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import type {
  ChangeCrmOpportunityStageDto,
  CompleteCrmTaskDto,
  ConvertCrmLeadDto,
  CreateCrmAttachmentDto,
  CreateCrmContactDto,
  CreateCrmCustomerDto,
  CreateCrmFollowUpDto,
  CreateCrmLeadDto,
  CreateCrmOpportunityDto,
  CreateCrmTagDto,
  CreateCrmTaskDto,
  CrmAttachmentDto,
  CrmAttachmentPageDto,
  CrmAuditEventPageDto,
  CrmContactQueryDto,
  CrmContactDto,
  CrmContactPageDto,
  CrmCustomerDto,
  CrmCustomerPageDto,
  CrmCustomerQueryDto,
  CrmExportPreviewDto,
  CrmExportQueryDto,
  CrmFollowUpDto,
  CrmFollowUpPageDto,
  CrmLeadDto,
  CrmLeadPageDto,
  CrmLeadQueryDto,
  CrmOpportunityDto,
  CrmOpportunityPageDto,
  CrmOpportunityQueryDto,
  CrmOwnerTransferPageDto,
  CrmSummaryDto,
  CrmTagDto,
  CrmTagPageDto,
  CrmTagQueryDto,
  CrmTargetQueryDto,
  CrmTaskDto,
  CrmTaskPageDto,
  CrmTaskQueryDto,
  TransferCrmOwnerDto,
  UpdateCrmContactDto,
  UpdateCrmCustomerDto,
  UpdateCrmLeadDto,
  UpdateCrmOpportunityDto,
  UpdateCrmTagDto,
} from './crm.dto';

export type CrmPageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CrmPageWindow = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export abstract class CrmRepository {
  abstract getSummary(): Promise<CrmSummaryDto>;
  abstract exportCrm(query: CrmExportQueryDto): Promise<CrmExportPreviewDto>;

  abstract listTags(query?: CrmTagQueryDto): Promise<CrmTagPageDto>;
  abstract createTag(body: CreateCrmTagDto): Promise<CrmTagDto>;
  abstract updateTag(id: string, body: UpdateCrmTagDto): Promise<CrmTagDto>;

  abstract listLeads(query?: CrmLeadQueryDto): Promise<CrmLeadPageDto>;
  abstract getLead(id: string): Promise<CrmLeadDto>;
  abstract createLead(body: CreateCrmLeadDto): Promise<CrmLeadDto>;
  abstract updateLead(id: string, body: UpdateCrmLeadDto): Promise<CrmLeadDto>;
  abstract convertLead(
    id: string,
    body: ConvertCrmLeadDto,
  ): Promise<{
    lead: CrmLeadDto;
    customer: CrmCustomerDto;
    opportunity?: CrmOpportunityDto;
  }>;
  abstract transferLeadOwner(
    id: string,
    body: TransferCrmOwnerDto,
  ): Promise<CrmLeadDto>;
  abstract archiveLead(id: string): Promise<{ deleted: true }>;

  abstract listCustomers(
    query?: CrmCustomerQueryDto,
  ): Promise<CrmCustomerPageDto>;
  abstract getCustomer(id: string): Promise<CrmCustomerDto>;
  abstract createCustomer(body: CreateCrmCustomerDto): Promise<CrmCustomerDto>;
  abstract updateCustomer(
    id: string,
    body: UpdateCrmCustomerDto,
  ): Promise<CrmCustomerDto>;
  abstract transferCustomerOwner(
    id: string,
    body: TransferCrmOwnerDto,
  ): Promise<CrmCustomerDto>;
  abstract archiveCustomer(id: string): Promise<{ deleted: true }>;

  abstract listContacts(query?: CrmContactQueryDto): Promise<CrmContactPageDto>;
  abstract getContact(id: string): Promise<CrmContactDto>;
  abstract createContact(body: CreateCrmContactDto): Promise<CrmContactDto>;
  abstract updateContact(
    id: string,
    body: UpdateCrmContactDto,
  ): Promise<CrmContactDto>;
  abstract archiveContact(id: string): Promise<{ deleted: true }>;

  abstract listOpportunities(
    query?: CrmOpportunityQueryDto,
  ): Promise<CrmOpportunityPageDto>;
  abstract getOpportunity(id: string): Promise<CrmOpportunityDto>;
  abstract createOpportunity(
    body: CreateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto>;
  abstract updateOpportunity(
    id: string,
    body: UpdateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto>;
  abstract changeOpportunityStage(
    id: string,
    body: ChangeCrmOpportunityStageDto,
  ): Promise<CrmOpportunityDto>;
  abstract transferOpportunityOwner(
    id: string,
    body: TransferCrmOwnerDto,
  ): Promise<CrmOpportunityDto>;
  abstract archiveOpportunity(id: string): Promise<{ deleted: true }>;

  abstract listFollowUps(
    query?: CrmTargetQueryDto,
  ): Promise<CrmFollowUpPageDto>;
  abstract createFollowUp(body: CreateCrmFollowUpDto): Promise<CrmFollowUpDto>;

  abstract listTasks(query?: CrmTaskQueryDto): Promise<CrmTaskPageDto>;
  abstract createTask(body: CreateCrmTaskDto): Promise<CrmTaskDto>;
  abstract completeTask(
    id: string,
    body: CompleteCrmTaskDto,
  ): Promise<CrmTaskDto>;

  abstract listAttachments(
    query?: CrmTargetQueryDto,
  ): Promise<CrmAttachmentPageDto>;
  abstract createAttachment(
    body: CreateCrmAttachmentDto,
  ): Promise<CrmAttachmentDto>;

  abstract listOwnerTransfers(
    query?: CrmTargetQueryDto,
  ): Promise<CrmOwnerTransferPageDto>;
  abstract listAuditEvents(
    query?: CrmTargetQueryDto,
  ): Promise<CrmAuditEventPageDto>;
}

export function createCrmPage<T>(
  rows: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
): CrmPageResult<T> {
  const { page, pageSize } = normalizeCrmPageWindow(query);
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  return {
    items: rows.slice(skip, skip + pageSize).map(clone),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function normalizeCrmPageWindow(
  query: { page?: number | string; pageSize?: number | string } = {},
): CrmPageWindow {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function createCrmDbPage<T>(
  items: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
  total: number,
): CrmPageResult<T> {
  const { page, pageSize } = normalizeCrmPageWindow(query);

  return {
    items: items.map(clone),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function crmBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function crmNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

function normalizePositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
