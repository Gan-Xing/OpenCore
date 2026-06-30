import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
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
  TicketAttachmentDto,
  TicketBatchMutationDto,
  TicketCategoryDto,
  TicketCategoryQueryDto,
  TicketCommentDto,
  TicketDashboardSummaryDto,
  TicketDto,
  TicketExportPreviewDto,
  TicketQueryDto,
  TicketSlaReminderDto,
  TicketTransitionDto,
  TicketTransitionExportQueryDto,
  UpdateTicketCategoryDto,
  UpdateTicketDto,
} from './ticket.dto';
import {
  assertTicketTransitionAllowed,
  createPage,
  parseTicketPriority,
  parseTicketStatus,
  ticketBadRequest,
  ticketNotFound,
  TicketRepository,
  type PageResult,
} from './ticket.repository';

const ROOT_TENANT_ID = 'tenant_root';
const CSV_CONTENT_TYPE = 'text/csv;charset=utf-8';
const ACTIVE_TICKET_STATUSES = ['new', 'processing', 'pending_confirmation'];

type TicketCategoryRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type TicketCommentRow = {
  id: string;
  tenantId: string;
  ticketId: string;
  author: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

type TicketTransitionRow = {
  id: string;
  tenantId: string;
  ticketId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  comment: string | null;
  createdAt: Date;
};

type TicketAttachmentRow = {
  id: string;
  tenantId: string;
  ticketId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type TicketRow = {
  id: string;
  tenantId: string;
  number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  categoryId: string | null;
  category: TicketCategoryRow | null;
  createdBy: string;
  assignee: string | null;
  dueAt: Date | null;
  firstRespondedAt: Date | null;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  slaBreached: boolean;
  slaNotifiedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  archivedAt: Date | null;
  comments: TicketCommentRow[];
  transitions: TicketTransitionRow[];
  attachments: TicketAttachmentRow[];
  createdAt: Date;
  updatedAt: Date;
};

const TICKET_INCLUDE = {
  category: true as const,
  comments: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
  transitions: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
  attachments: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
};

@Injectable()
export class PrismaTicketRepository extends TicketRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listCategories(
    query: TicketCategoryQueryDto = {},
  ): Promise<PageResult<TicketCategoryDto>> {
    const tenantId = resolveCurrentTenantId();
    const enabled = parseOptionalBoolean(query.enabled);
    const rows = await this.prisma.ticketCategory.findMany({
      where: { tenantId, ...(enabled === undefined ? {} : { enabled }) },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toCategoryRecord), query);
  }

  async createCategory(
    body: CreateTicketCategoryDto,
  ): Promise<TicketCategoryDto> {
    const tenantId = resolveCurrentTenantId();
    const category = await this.prisma.ticketCategory.create({
      data: {
        tenantId,
        code: requireText(body.code, 'code'),
        name: requireText(body.name, 'name'),
        description: normalizeOptionalText(body.description),
        enabled: body.enabled ?? true,
        order: normalizeInteger(body.order, 0),
      },
    });

    return toCategoryRecord(category);
  }

  async updateCategory(
    id: string,
    body: UpdateTicketCategoryDto,
  ): Promise<TicketCategoryDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findCategory(id);
    const category = await this.prisma.ticketCategory.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.code === undefined
          ? {}
          : { code: requireText(body.code, 'code') }),
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.description === undefined
          ? {}
          : { description: normalizeOptionalText(body.description) }),
        ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
        ...(body.order === undefined
          ? {}
          : { order: normalizeInteger(body.order, 0) }),
      },
    });

    return toCategoryRecord(category);
  }

  async listTickets(
    query: TicketQueryDto = {},
  ): Promise<PageResult<TicketDto>> {
    const tenantId = resolveCurrentTenantId();
    await this.markOverdueTickets(tenantId);
    const rows = await this.prisma.ticket.findMany({
      where: buildTicketWhere(tenantId, query),
      include: TICKET_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toTicketRecord), query);
  }

  async getDashboardSummary(): Promise<TicketDashboardSummaryDto> {
    const tenantId = resolveCurrentTenantId();
    await this.markOverdueTickets(tenantId);
    const rows = await this.prisma.ticket.findMany({
      where: { tenantId, archivedAt: null },
      include: { category: true },
    });
    const activeRows = rows.filter((row) =>
      ACTIVE_TICKET_STATUSES.includes(row.status),
    );

    return {
      total: rows.length,
      pending: activeRows.length,
      overdue: rows.filter((row) => isTicketSlaBreached(row)).length,
      byAssignee: countBuckets(rows.map((row) => row.assignee ?? 'unassigned')),
      byCategory: countBuckets(
        rows.map(
          (row) => row.category?.name ?? row.categoryId ?? 'uncategorized',
        ),
      ),
      byPriority: countBuckets(rows.map((row) => row.priority)),
      byStatus: countBuckets(rows.map((row) => row.status)),
    };
  }

  async exportTickets(
    query: TicketQueryDto = {},
  ): Promise<TicketExportPreviewDto> {
    const page = await this.listTickets(query);
    const columns = [
      'number',
      'title',
      'status',
      'priority',
      'category',
      'createdBy',
      'assignee',
      'firstRespondedAt',
      'responseDueAt',
      'resolutionDueAt',
      'slaBreached',
      'createdAt',
    ];
    return createCsvExportPreview(
      'opencore-collaboration-tickets.csv',
      columns,
      page.items.map((ticket) => [
        ticket.number,
        ticket.title,
        ticket.status,
        ticket.priority,
        ticket.category?.name ?? ticket.categoryId ?? '',
        ticket.createdBy,
        ticket.assignee ?? '',
        ticket.firstRespondedAt ?? '',
        ticket.responseDueAt ?? '',
        ticket.resolutionDueAt ?? '',
        String(ticket.slaBreached),
        ticket.createdAt,
      ]),
    );
  }

  async exportTicketTransitions(
    query: TicketTransitionExportQueryDto = {},
  ): Promise<TicketExportPreviewDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.ticketTransition.findMany({
      where: {
        tenantId,
        ...(query.ticketId === undefined ? {} : { ticketId: query.ticketId }),
        ...(query.actor === undefined ? {} : { actor: query.actor }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    const page = createPage(rows.map(toTransitionRecord), query);
    const columns = [
      'ticketId',
      'fromStatus',
      'toStatus',
      'actor',
      'comment',
      'createdAt',
    ];

    return createCsvExportPreview(
      'opencore-collaboration-ticket-transitions.csv',
      columns,
      page.items.map((transition) => [
        transition.ticketId,
        transition.fromStatus ?? '',
        transition.toStatus,
        transition.actor,
        transition.comment ?? '',
        transition.createdAt,
      ]),
    );
  }

  async getTicket(id: string): Promise<TicketDto> {
    return this.findTicket(id);
  }

  async createTicket(body: CreateTicketDto): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    const priority = parseTicketPriority(body.priority ?? 'medium');
    const categoryId = normalizeOptionalText(body.categoryId);
    const createdAt = new Date();
    const dueAt = parseOptionalDate(body.dueAt, 'dueAt');
    const responseDueAt =
      parseOptionalDate(body.responseDueAt, 'responseDueAt') ??
      addHours(createdAt, getDefaultResponseHours(priority));
    const resolutionDueAt =
      parseOptionalDate(body.resolutionDueAt, 'resolutionDueAt') ??
      dueAt ??
      addHours(createdAt, getDefaultResolutionHours(priority));

    if (categoryId) {
      await this.findCategory(categoryId);
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId,
        number: createTicketNumber(),
        title: requireText(body.title, 'title'),
        description: requireText(body.description, 'description'),
        status: 'new',
        priority,
        categoryId,
        createdBy: requireText(body.createdBy, 'createdBy'),
        assignee: normalizeOptionalText(body.assignee),
        dueAt,
        responseDueAt,
        resolutionDueAt,
      },
    });
    await this.prisma.ticketTransition.create({
      data: {
        tenantId,
        ticketId: ticket.id,
        toStatus: 'new',
        actor: ticket.createdBy,
        comment: 'created',
      },
    });
    await this.notifyTicketUser(ticket, ticket.assignee, {
      actor: ticket.createdBy,
      action: 'created',
      content: `${ticket.number} ${ticket.title} was created.`,
    });

    return this.findTicket(ticket.id);
  }

  async updateTicket(id: string, body: UpdateTicketDto): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findTicket(id);

    if (body.categoryId !== undefined && body.categoryId !== null) {
      await this.findCategory(body.categoryId);
    }

    const ticket = await this.prisma.ticket.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.title === undefined
          ? {}
          : { title: requireText(body.title, 'title') }),
        ...(body.description === undefined
          ? {}
          : { description: requireText(body.description, 'description') }),
        ...(body.priority === undefined
          ? {}
          : { priority: parseTicketPriority(body.priority) }),
        ...(body.categoryId === undefined
          ? {}
          : { categoryId: normalizeNullableText(body.categoryId) }),
        ...(body.assignee === undefined
          ? {}
          : { assignee: normalizeNullableText(body.assignee) }),
        ...(body.dueAt === undefined
          ? {}
          : { dueAt: parseNullableDate(body.dueAt, 'dueAt') }),
        ...(body.responseDueAt === undefined
          ? {}
          : {
              responseDueAt: parseNullableDate(
                body.responseDueAt,
                'responseDueAt',
              ),
            }),
        ...(body.resolutionDueAt === undefined
          ? {}
          : {
              resolutionDueAt: parseNullableDate(
                body.resolutionDueAt,
                'resolutionDueAt',
              ),
            }),
      },
      include: TICKET_INCLUDE,
    });

    return toTicketRecord(ticket);
  }

  async assignTicket(id: string, body: AssignTicketDto): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findTicket(id);
    const assignee = requireText(body.assignee, 'assignee');
    const actor = requireText(body.actor, 'actor');
    await this.prisma.ticket.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        assignee,
        firstRespondedAt: existing.firstRespondedAt ? undefined : new Date(),
      },
    });
    await this.prisma.ticketTransition.create({
      data: {
        tenantId,
        ticketId: id,
        fromStatus: existing.status,
        toStatus: existing.status,
        actor,
        comment:
          normalizeOptionalText(body.comment) ?? `assigned to ${assignee}`,
      },
    });
    await this.notifyTicketUser({ ...existing, assignee }, assignee, {
      actor,
      action: 'assigned',
      content: `${existing.number} ${existing.title} was assigned to ${assignee}.`,
    });

    return this.findTicket(id);
  }

  async changeTicketStatus(
    id: string,
    body: ChangeTicketStatusDto,
  ): Promise<TicketDto> {
    return this.transitionTicket(id, body.status, body.actor, body.comment);
  }

  async closeTicket(id: string, body: TicketActionDto): Promise<TicketDto> {
    return this.transitionTicket(id, 'closed', body.actor, body.comment);
  }

  async reopenTicket(id: string, body: TicketActionDto): Promise<TicketDto> {
    return this.transitionTicket(id, 'processing', body.actor, body.comment);
  }

  async addComment(
    id: string,
    body: CreateTicketCommentDto,
  ): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findTicket(id);
    await this.prisma.ticketComment.create({
      data: {
        tenantId,
        ticketId: id,
        author: requireText(body.author, 'author'),
        body: requireText(body.body, 'body'),
      },
    });
    const ticket = await this.findTicket(id);
    await this.touchFirstResponse(id, ticket);
    await this.notifyTicketUser(ticket, ticket.assignee ?? ticket.createdBy, {
      actor: body.author,
      action: 'commented',
      content: `${ticket.number} ${ticket.title} has a new comment.`,
    });

    return this.findTicket(id);
  }

  async addAttachment(
    id: string,
    body: CreateTicketAttachmentDto,
  ): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findTicket(id);
    await this.prisma.ticketAttachment.create({
      data: {
        tenantId,
        ticketId: id,
        originalName: requireText(body.originalName, 'originalName'),
        mimeType: requireText(body.mimeType, 'mimeType'),
        sizeBytes: normalizePositiveInteger(body.sizeBytes, 'sizeBytes'),
        storageKey: requireText(body.storageKey, 'storageKey'),
        uploadedBy: requireText(body.uploadedBy, 'uploadedBy'),
      },
    });

    return this.findTicket(id);
  }

  async sendSlaReminders(): Promise<TicketSlaReminderDto> {
    const tenantId = resolveCurrentTenantId();
    const now = new Date();
    const overdue = await this.prisma.ticket.findMany({
      where: {
        tenantId,
        archivedAt: null,
        status: { in: ACTIVE_TICKET_STATUSES },
        slaNotifiedAt: null,
        OR: buildOverdueConditions(now),
      },
    });
    let notified = 0;

    for (const ticket of overdue) {
      await this.prisma.ticket.update({
        where: { tenantId_id: { tenantId, id: ticket.id } },
        data: { slaBreached: true, slaNotifiedAt: now },
      });
      const delivered = await this.notifyTicketUser(
        ticket,
        ticket.assignee ?? ticket.createdBy,
        {
          actor: 'system',
          action: 'sla-overdue',
          content: `${ticket.number} ${ticket.title} is overdue.`,
        },
      );
      if (delivered) {
        notified += 1;
      }
    }

    return {
      scanned: overdue.length,
      markedOverdue: overdue.length,
      notified,
    };
  }

  async batchAssignTickets(
    body: BatchAssignTicketsDto,
  ): Promise<TicketBatchMutationDto> {
    const ids = normalizeIds(body.ids);
    const updated: string[] = [];

    for (const id of ids) {
      try {
        await this.assignTicket(id, {
          actor: body.actor,
          assignee: body.assignee,
          comment: body.comment,
        });
        updated.push(id);
      } catch {
        // ponytail: skip invalid rows; batch result exposes the count.
      }
    }

    return {
      updated: updated.length,
      skipped: ids.length - updated.length,
      ids: updated,
    };
  }

  async batchCloseTickets(
    body: BatchTicketActionDto,
  ): Promise<TicketBatchMutationDto> {
    const ids = normalizeIds(body.ids);
    const updated: string[] = [];

    for (const id of ids) {
      try {
        await this.closeTicket(id, body);
        updated.push(id);
      } catch {
        // ponytail: skip tickets that cannot legally close yet.
      }
    }

    return {
      updated: updated.length,
      skipped: ids.length - updated.length,
      ids: updated,
    };
  }

  async batchArchiveTickets(
    body: BatchTicketActionDto,
  ): Promise<TicketBatchMutationDto> {
    const ids = normalizeIds(body.ids);
    const updated: string[] = [];

    for (const id of ids) {
      try {
        await this.archiveTicketWithActor(id, body.actor);
        updated.push(id);
      } catch {
        // ponytail: skip missing or foreign-tenant tickets.
      }
    }

    return {
      updated: updated.length,
      skipped: ids.length - updated.length,
      ids: updated,
    };
  }

  async archiveTicket(id: string): Promise<{ deleted: true }> {
    return this.archiveTicketWithActor(
      id,
      getRequestContext()?.actorUserId ?? 'system',
    );
  }

  private async archiveTicketWithActor(
    id: string,
    actor: string,
  ): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findTicket(id);
    await this.prisma.ticket.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        archivedAt: existing.archivedAt ? undefined : new Date(),
      },
    });
    await this.prisma.ticketTransition.create({
      data: {
        tenantId,
        ticketId: id,
        fromStatus: existing.status,
        toStatus: existing.status,
        actor: normalizeOptionalText(actor) ?? 'system',
        comment: 'archived',
      },
    });

    return { deleted: true };
  }

  private async transitionTicket(
    id: string,
    nextStatus: string,
    actor: string,
    comment?: string,
  ): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findTicket(id);
    const status = parseTicketStatus(nextStatus);
    const safeActor = requireText(actor, 'actor');

    if (existing.status === status) {
      return existing;
    }

    assertTicketTransitionAllowed(existing.status, status);
    const now = new Date();
    await this.prisma.ticket.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        status,
        firstRespondedAt:
          status === 'processing' && !existing.firstRespondedAt
            ? now
            : undefined,
        resolvedAt:
          status === 'resolved'
            ? now
            : status === 'processing'
              ? null
              : undefined,
        closedAt:
          status === 'closed'
            ? now
            : status === 'processing'
              ? null
              : undefined,
        archivedAt: status === 'processing' ? null : undefined,
      },
    });
    await this.prisma.ticketTransition.create({
      data: {
        tenantId,
        ticketId: id,
        fromStatus: existing.status,
        toStatus: status,
        actor: safeActor,
        comment: normalizeOptionalText(comment),
      },
    });
    await this.notifyTicketUser(
      existing,
      existing.assignee ?? existing.createdBy,
      {
        actor: safeActor,
        action: `status-${status}`,
        content: `${existing.number} ${existing.title} moved from ${existing.status} to ${status}.`,
      },
    );

    return this.findTicket(id);
  }

  private async markOverdueTickets(tenantId: string): Promise<number> {
    const result = await this.prisma.ticket.updateMany({
      where: {
        tenantId,
        archivedAt: null,
        slaBreached: false,
        status: { in: ACTIVE_TICKET_STATUSES },
        OR: buildOverdueConditions(new Date()),
      },
      data: { slaBreached: true },
    });

    return result.count;
  }

  private async touchFirstResponse(id: string, ticket: TicketDto) {
    if (ticket.firstRespondedAt) {
      return;
    }

    await this.prisma.ticket.update({
      where: { tenantId_id: { tenantId: ticket.tenantId, id } },
      data: { firstRespondedAt: new Date() },
    });
  }

  private async notifyTicketUser(
    ticket: {
      id: string;
      tenantId: string;
      number: string;
      title: string;
      createdBy: string;
      assignee?: string | null;
    },
    username: string | undefined | null,
    event: { action: string; actor: string; content: string },
  ): Promise<boolean> {
    const safeUsername = normalizeOptionalText(username);

    if (!safeUsername) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { username: safeUsername },
    });

    if (!user) {
      return false;
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId: ticket.tenantId, userId: user.id },
      },
    });

    if (!membership || membership.status !== 'active') {
      return false;
    }

    const now = new Date();
    const notice = await this.prisma.systemNotice.create({
      data: {
        tenantId: ticket.tenantId,
        title: `Ticket ${event.action}: ${ticket.number}`,
        content: event.content,
        type: 'announcement',
        status: 'published',
        audience: 'admin',
        publishedAt: now,
        createdBy: event.actor,
      },
    });

    await this.prisma.systemNoticeDelivery.create({
      data: {
        tenantId: ticket.tenantId,
        noticeId: notice.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        title: notice.title,
        content: notice.content,
        type: notice.type,
        audience: notice.audience,
        providerStatus: 'sent',
        deliveredAt: now,
        sentAt: now,
      },
    });

    return true;
  }

  private async findCategory(id: string): Promise<TicketCategoryDto> {
    const tenantId = resolveCurrentTenantId();
    const category = await this.prisma.ticketCategory.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });

    if (!category) {
      throw ticketNotFound(
        'COLLABORATION_TICKET_CATEGORY_NOT_FOUND',
        'Ticket category not found.',
        { id },
      );
    }

    return toCategoryRecord(category);
  }

  private async findTicket(id: string): Promise<TicketDto> {
    const tenantId = resolveCurrentTenantId();
    await this.markOverdueTickets(tenantId);
    const ticket = await this.prisma.ticket.findUnique({
      where: { tenantId_id: { tenantId, id } },
      include: TICKET_INCLUDE,
    });

    if (!ticket) {
      throw ticketNotFound(
        'COLLABORATION_TICKET_NOT_FOUND',
        'Ticket not found.',
        { id },
      );
    }

    return toTicketRecord(ticket);
  }
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function createTicketNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  return `TCK-${date}-${suffix}`;
}

function requireText(value: string | undefined, field: string): string {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    throw ticketBadRequest(
      'COLLABORATION_TICKET_FIELD_REQUIRED',
      'Ticket field is required.',
      { field },
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | undefined | null,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullableText(
  value: string | undefined | null,
): string | null {
  return normalizeOptionalText(value) ?? null;
}

function normalizeInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) ? Number(value) : fallback;
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw ticketBadRequest(
      'COLLABORATION_TICKET_FIELD_INVALID',
      'Ticket field is invalid.',
      { field },
    );
  }

  return value;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw ticketBadRequest(
    'COLLABORATION_TICKET_BOOLEAN_INVALID',
    'Ticket boolean query value is invalid.',
    { value },
  );
}

function parseOptionalDate(
  value: string | undefined,
  field: string,
): Date | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return parseDate(value, field);
}

function parseNullableDate(value: string | null, field: string): Date | null {
  if (value === null || value === '') {
    return null;
  }

  return parseDate(value, field);
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw ticketBadRequest(
      'COLLABORATION_TICKET_DATE_INVALID',
      'Ticket date field is invalid.',
      { field, value },
    );
  }

  return date;
}

function buildTicketWhere(tenantId: string, query: TicketQueryDto) {
  const keyword = normalizeOptionalText(query.keyword);
  const includeArchived = parseOptionalBoolean(query.includeArchived) === true;
  const overdue = parseOptionalBoolean(query.overdue);
  const slaBreached = parseOptionalBoolean(query.slaBreached);
  const and: object[] = [];

  if (keyword !== undefined) {
    and.push({
      OR: [
        { number: { contains: keyword, mode: 'insensitive' as const } },
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { description: { contains: keyword, mode: 'insensitive' as const } },
      ],
    });
  }

  if (overdue === true) {
    and.push({
      status: { in: ACTIVE_TICKET_STATUSES },
      OR: buildOverdueConditions(new Date()),
    });
  } else if (overdue === false) {
    and.push({
      NOT: {
        status: { in: ACTIVE_TICKET_STATUSES },
        OR: buildOverdueConditions(new Date()),
      },
    });
  }

  return {
    tenantId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(query.status === undefined
      ? {}
      : { status: parseTicketStatus(query.status) }),
    ...(query.priority === undefined
      ? {}
      : { priority: parseTicketPriority(query.priority) }),
    ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
    ...(query.assignee === undefined ? {} : { assignee: query.assignee }),
    ...(slaBreached === undefined ? {} : { slaBreached }),
    ...(and.length === 0 ? {} : { AND: and }),
  };
}

function buildOverdueConditions(now: Date) {
  return [
    {
      firstRespondedAt: null,
      responseDueAt: { lt: now },
    },
    {
      resolutionDueAt: { lt: now },
    },
    {
      dueAt: { lt: now },
    },
  ];
}

function getDefaultResponseHours(priority: string): number {
  if (priority === 'urgent') return 1;
  if (priority === 'high') return 4;
  if (priority === 'medium') return 8;
  return 24;
}

function getDefaultResolutionHours(priority: string): number {
  if (priority === 'urgent') return 24;
  if (priority === 'high') return 48;
  if (priority === 'medium') return 72;
  return 168;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function normalizeIds(ids: readonly string[] | undefined): string[] {
  const normalized = Array.from(
    new Set((ids ?? []).map((id) => normalizeOptionalText(id)).filter(Boolean)),
  ) as string[];

  if (normalized.length === 0) {
    throw ticketBadRequest(
      'COLLABORATION_TICKET_BATCH_EMPTY',
      'Ticket batch ids are required.',
    );
  }

  return normalized;
}

function countBuckets(
  values: readonly string[],
): TicketDashboardSummaryDto['byStatus'] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.key.localeCompare(right.key),
    );
}

function createCsvExportPreview(
  filename: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): TicketExportPreviewDto {
  const generatedAt = new Date().toISOString();
  const csv = [columns, ...rows]
    .map((row) => row.map(toCsvCell).join(','))
    .join('\n');

  return {
    filename,
    contentType: CSV_CONTENT_TYPE,
    contentBase64: Buffer.from(csv, 'utf8').toString('base64'),
    scope: 'current-page',
    columns,
    rowCount: rows.length,
    generatedAt,
  };
}

function toCsvCell(value: string): string {
  const safe = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;

  return `"${safe.replace(/"/g, '""')}"`;
}

function isTicketSlaBreached(row: {
  status: string;
  dueAt: Date | null;
  firstRespondedAt: Date | null;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  slaBreached: boolean;
}): boolean {
  if (row.slaBreached) {
    return true;
  }

  if (!ACTIVE_TICKET_STATUSES.includes(row.status)) {
    return false;
  }

  const now = Date.now();

  return (
    (!row.firstRespondedAt &&
      row.responseDueAt !== null &&
      row.responseDueAt.getTime() < now) ||
    (row.resolutionDueAt !== null && row.resolutionDueAt.getTime() < now) ||
    (row.dueAt !== null && row.dueAt.getTime() < now)
  );
}

function toCategoryRecord(row: TicketCategoryRow): TicketCategoryDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    enabled: row.enabled,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCommentRecord(row: TicketCommentRow): TicketCommentDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    ticketId: row.ticketId,
    author: row.author,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTransitionRecord(row: TicketTransitionRow): TicketTransitionDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    ticketId: row.ticketId,
    fromStatus: row.fromStatus ? parseTicketStatus(row.fromStatus) : undefined,
    toStatus: parseTicketStatus(row.toStatus),
    actor: row.actor,
    comment: row.comment ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAttachmentRecord(row: TicketAttachmentRow): TicketAttachmentDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    ticketId: row.ticketId,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTicketRecord(row: TicketRow): TicketDto {
  const responseOverdue =
    ACTIVE_TICKET_STATUSES.includes(row.status) &&
    !row.firstRespondedAt &&
    row.responseDueAt !== null &&
    row.responseDueAt.getTime() < Date.now();
  const resolutionOverdue =
    ACTIVE_TICKET_STATUSES.includes(row.status) &&
    ((row.resolutionDueAt !== null &&
      row.resolutionDueAt.getTime() < Date.now()) ||
      (row.dueAt !== null && row.dueAt.getTime() < Date.now()));

  return {
    id: row.id,
    tenantId: row.tenantId,
    number: row.number,
    title: row.title,
    description: row.description,
    status: parseTicketStatus(row.status),
    priority: parseTicketPriority(row.priority),
    categoryId: row.categoryId ?? undefined,
    category: row.category ? toCategoryRecord(row.category) : undefined,
    createdBy: row.createdBy,
    assignee: row.assignee ?? undefined,
    dueAt: row.dueAt?.toISOString(),
    firstRespondedAt: row.firstRespondedAt?.toISOString(),
    responseDueAt: row.responseDueAt?.toISOString(),
    resolutionDueAt: row.resolutionDueAt?.toISOString(),
    responseOverdue,
    resolutionOverdue,
    slaBreached: row.slaBreached || responseOverdue || resolutionOverdue,
    slaNotifiedAt: row.slaNotifiedAt?.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
    closedAt: row.closedAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    comments: row.comments.map(toCommentRecord),
    transitions: row.transitions.map(toTransitionRecord),
    attachments: row.attachments.map(toAttachmentRecord),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
