import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import type {
  AssignTicketDto,
  BatchAssignTicketsDto,
  BatchTicketActionDto,
  ChangeTicketStatusDto,
  CreateTicketAttachmentDto,
  CreateTicketCategoryDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  TicketActionDto,
  TicketBatchMutationDto,
  TicketCategoryDto,
  TicketCategoryQueryDto,
  TicketDashboardSummaryDto,
  TicketDto,
  TicketExportPreviewDto,
  TicketPriority,
  TicketQueryDto,
  TicketSlaReminderDto,
  TicketStatus,
  TicketTransitionExportQueryDto,
  UpdateTicketCategoryDto,
  UpdateTicketDto,
} from './ticket.dto';
import { TICKET_PRIORITIES, TICKET_STATUSES } from './ticket.dto';

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export abstract class TicketRepository {
  abstract listCategories(
    query?: TicketCategoryQueryDto,
  ): Promise<PageResult<TicketCategoryDto>>;
  abstract createCategory(
    body: CreateTicketCategoryDto,
  ): Promise<TicketCategoryDto>;
  abstract updateCategory(
    id: string,
    body: UpdateTicketCategoryDto,
  ): Promise<TicketCategoryDto>;

  abstract listTickets(query?: TicketQueryDto): Promise<PageResult<TicketDto>>;
  abstract getDashboardSummary(): Promise<TicketDashboardSummaryDto>;
  abstract exportTickets(
    query?: TicketQueryDto,
  ): Promise<TicketExportPreviewDto>;
  abstract exportTicketTransitions(
    query?: TicketTransitionExportQueryDto,
  ): Promise<TicketExportPreviewDto>;
  abstract getTicket(id: string): Promise<TicketDto>;
  abstract createTicket(body: CreateTicketDto): Promise<TicketDto>;
  abstract updateTicket(id: string, body: UpdateTicketDto): Promise<TicketDto>;
  abstract assignTicket(id: string, body: AssignTicketDto): Promise<TicketDto>;
  abstract changeTicketStatus(
    id: string,
    body: ChangeTicketStatusDto,
  ): Promise<TicketDto>;
  abstract closeTicket(id: string, body: TicketActionDto): Promise<TicketDto>;
  abstract reopenTicket(id: string, body: TicketActionDto): Promise<TicketDto>;
  abstract addComment(
    id: string,
    body: CreateTicketCommentDto,
  ): Promise<TicketDto>;
  abstract addAttachment(
    id: string,
    body: CreateTicketAttachmentDto,
  ): Promise<TicketDto>;
  abstract sendSlaReminders(): Promise<TicketSlaReminderDto>;
  abstract batchAssignTickets(
    body: BatchAssignTicketsDto,
  ): Promise<TicketBatchMutationDto>;
  abstract batchCloseTickets(
    body: BatchTicketActionDto,
  ): Promise<TicketBatchMutationDto>;
  abstract batchArchiveTickets(
    body: BatchTicketActionDto,
  ): Promise<TicketBatchMutationDto>;
  abstract archiveTicket(id: string): Promise<{ deleted: true }>;
}

export function createPage<T>(
  rows: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
): PageResult<T> {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);
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

export function parseTicketStatus(value: string): TicketStatus {
  if ((TICKET_STATUSES as readonly string[]).includes(value)) {
    return value as TicketStatus;
  }

  throw ticketBadRequest(
    'COLLABORATION_TICKET_STATUS_INVALID',
    'Ticket status is invalid.',
    { status: value },
  );
}

export function parseTicketPriority(value: string): TicketPriority {
  if ((TICKET_PRIORITIES as readonly string[]).includes(value)) {
    return value as TicketPriority;
  }

  throw ticketBadRequest(
    'COLLABORATION_TICKET_PRIORITY_INVALID',
    'Ticket priority is invalid.',
    { priority: value },
  );
}

export function assertTicketTransitionAllowed(
  fromStatus: string,
  toStatus: string,
): void {
  const from = parseTicketStatus(fromStatus);
  const to = parseTicketStatus(toStatus);
  const allowed = TICKET_STATUS_TRANSITIONS[from];

  if (!allowed.includes(to)) {
    throw ticketBadRequest(
      'COLLABORATION_TICKET_TRANSITION_INVALID',
      'Ticket status transition is invalid.',
      { fromStatus: from, toStatus: to },
    );
  }
}

export function ticketBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function ticketNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> =
  {
    new: ['processing', 'canceled'],
    processing: ['pending_confirmation', 'resolved', 'canceled'],
    pending_confirmation: ['processing', 'resolved', 'canceled'],
    resolved: ['closed', 'processing'],
    closed: ['processing'],
    canceled: ['processing'],
  };

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
