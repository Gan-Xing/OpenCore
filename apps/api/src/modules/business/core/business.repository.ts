import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import type {
  ChangeBusinessOpportunityStageDto,
  CompleteBusinessTaskDto,
  ConvertBusinessLeadDto,
  ConvertBusinessLeadResultDto,
  CreateBusinessAttachmentDto,
  CreateBusinessContactDto,
  CreateBusinessCustomerDto,
  CreateBusinessFollowUpDto,
  CreateBusinessLeadDto,
  CreateBusinessOpportunityDto,
  CreateBusinessTagDto,
  CreateBusinessTaskDto,
  BusinessAttachmentDto,
  BusinessActivityPageDto,
  BusinessAttachmentPageDto,
  BusinessAuditEventPageDto,
  BusinessContactQueryDto,
  BusinessContactDto,
  BusinessContactPageDto,
  BusinessCustomerDto,
  BusinessCustomerPageDto,
  BusinessCustomerQueryDto,
  BusinessExportPreviewDto,
  BusinessExportQueryDto,
  BusinessFollowUpDto,
  BusinessFollowUpPageDto,
  BusinessLeadDto,
  BusinessLeadPageDto,
  BusinessLeadQueryDto,
  BusinessOpportunityDto,
  BusinessOpportunityPageDto,
  BusinessOpportunityQueryDto,
  BusinessOwnerTransferPageDto,
  BusinessSummaryDto,
  BusinessTagDto,
  BusinessTagPageDto,
  BusinessTagQueryDto,
  BusinessTargetQueryDto,
  BusinessTaskDto,
  BusinessTaskPageDto,
  BusinessTaskQueryDto,
  TransferBusinessOwnerDto,
  UpdateBusinessContactDto,
  UpdateBusinessCustomerDto,
  UpdateBusinessLeadDto,
  UpdateBusinessOpportunityDto,
  UpdateBusinessTagDto,
} from './business.dto';

export type BusinessPageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type BusinessPageWindow = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export abstract class BusinessRepository {
  abstract getSummary(): Promise<BusinessSummaryDto>;
  abstract exportBusiness(
    query: BusinessExportQueryDto,
  ): Promise<BusinessExportPreviewDto>;

  abstract listTags(query?: BusinessTagQueryDto): Promise<BusinessTagPageDto>;
  abstract createTag(body: CreateBusinessTagDto): Promise<BusinessTagDto>;
  abstract updateTag(
    id: string,
    body: UpdateBusinessTagDto,
  ): Promise<BusinessTagDto>;

  abstract listLeads(
    query?: BusinessLeadQueryDto,
  ): Promise<BusinessLeadPageDto>;
  abstract getLead(id: string): Promise<BusinessLeadDto>;
  abstract createLead(body: CreateBusinessLeadDto): Promise<BusinessLeadDto>;
  abstract updateLead(
    id: string,
    body: UpdateBusinessLeadDto,
  ): Promise<BusinessLeadDto>;
  abstract convertLead(
    id: string,
    body: ConvertBusinessLeadDto,
  ): Promise<ConvertBusinessLeadResultDto>;
  abstract transferLeadOwner(
    id: string,
    body: TransferBusinessOwnerDto,
  ): Promise<BusinessLeadDto>;
  abstract archiveLead(id: string): Promise<{ deleted: true }>;

  abstract listCustomers(
    query?: BusinessCustomerQueryDto,
  ): Promise<BusinessCustomerPageDto>;
  abstract getCustomer(id: string): Promise<BusinessCustomerDto>;
  abstract createCustomer(
    body: CreateBusinessCustomerDto,
  ): Promise<BusinessCustomerDto>;
  abstract updateCustomer(
    id: string,
    body: UpdateBusinessCustomerDto,
  ): Promise<BusinessCustomerDto>;
  abstract transferCustomerOwner(
    id: string,
    body: TransferBusinessOwnerDto,
  ): Promise<BusinessCustomerDto>;
  abstract archiveCustomer(id: string): Promise<{ deleted: true }>;

  abstract listContacts(
    query?: BusinessContactQueryDto,
  ): Promise<BusinessContactPageDto>;
  abstract getContact(id: string): Promise<BusinessContactDto>;
  abstract createContact(
    body: CreateBusinessContactDto,
  ): Promise<BusinessContactDto>;
  abstract updateContact(
    id: string,
    body: UpdateBusinessContactDto,
  ): Promise<BusinessContactDto>;
  abstract archiveContact(id: string): Promise<{ deleted: true }>;

  abstract listOpportunities(
    query?: BusinessOpportunityQueryDto,
  ): Promise<BusinessOpportunityPageDto>;
  abstract getOpportunity(id: string): Promise<BusinessOpportunityDto>;
  abstract createOpportunity(
    body: CreateBusinessOpportunityDto,
  ): Promise<BusinessOpportunityDto>;
  abstract updateOpportunity(
    id: string,
    body: UpdateBusinessOpportunityDto,
  ): Promise<BusinessOpportunityDto>;
  abstract changeOpportunityStage(
    id: string,
    body: ChangeBusinessOpportunityStageDto,
  ): Promise<BusinessOpportunityDto>;
  abstract transferOpportunityOwner(
    id: string,
    body: TransferBusinessOwnerDto,
  ): Promise<BusinessOpportunityDto>;
  abstract archiveOpportunity(id: string): Promise<{ deleted: true }>;

  abstract listActivities(
    query?: BusinessTargetQueryDto,
  ): Promise<BusinessActivityPageDto>;

  abstract listFollowUps(
    query?: BusinessTargetQueryDto,
  ): Promise<BusinessFollowUpPageDto>;
  abstract createFollowUp(
    body: CreateBusinessFollowUpDto,
  ): Promise<BusinessFollowUpDto>;

  abstract listTasks(
    query?: BusinessTaskQueryDto,
  ): Promise<BusinessTaskPageDto>;
  abstract createTask(body: CreateBusinessTaskDto): Promise<BusinessTaskDto>;
  abstract completeTask(
    id: string,
    body: CompleteBusinessTaskDto,
  ): Promise<BusinessTaskDto>;

  abstract listAttachments(
    query?: BusinessTargetQueryDto,
  ): Promise<BusinessAttachmentPageDto>;
  abstract createAttachment(
    body: CreateBusinessAttachmentDto,
  ): Promise<BusinessAttachmentDto>;

  abstract listOwnerTransfers(
    query?: BusinessTargetQueryDto,
  ): Promise<BusinessOwnerTransferPageDto>;
  abstract listAuditEvents(
    query?: BusinessTargetQueryDto,
  ): Promise<BusinessAuditEventPageDto>;
}

export function createBusinessPage<T>(
  rows: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
): BusinessPageResult<T> {
  const { page, pageSize } = normalizeBusinessPageWindow(query);
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

export function normalizeBusinessPageWindow(
  query: { page?: number | string; pageSize?: number | string } = {},
): BusinessPageWindow {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function createBusinessDbPage<T>(
  items: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
  total: number,
): BusinessPageResult<T> {
  const { page, pageSize } = normalizeBusinessPageWindow(query);

  return {
    items: items.map(clone),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function businessBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function businessNotFound(
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
