import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type {
  AssignTodoDto,
  ApprovalLiteQueryDto,
  CreateApprovalLiteDto,
  CreateMessageDto,
  CreateNoticeDto,
  CreateTodoDto,
  DecideApprovalLiteDto,
  MessageQueryDto,
  NoticeQueryDto,
  TodoActionDto,
  TodoQueryDto,
} from './collaboration.dto';
import type {
  ApprovalLiteRecord,
  MessageRecord,
  NoticeRecord,
  TimelineEntryRecord,
  TodoRecord,
} from './collaboration.seed';
import {
  appendTimeline,
  assertMessageNotDeleted,
  assertMessageReadable,
  assertNoticeCanPublish,
  assertNoticeNotArchived,
  assertPending,
  assertTodoOpen,
  buildCollaborationSummary,
  CollaborationRepository,
  createPage,
  createTimelineEntry,
  requireRecord,
  requireVisibleMessage,
  type PageResult,
} from './collaboration.repository';

type MessageRow = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  sender: string;
  recipient: string;
  status: string;
  businessType: string | null;
  businessId: string | null;
  readAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
};

const ROOT_TENANT_ID = 'tenant_root';

type NoticeRow = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  status: string;
  targetAudience: unknown;
  validFrom: Date | null;
  validTo: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: string;
  createdAt: Date;
};

type TodoRow = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  sourceType: string;
  businessType: string | null;
  businessId: string | null;
  assignee: string;
  status: string;
  timeline: unknown;
  completedAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
};

type ApprovalRow = {
  id: string;
  tenantId: string;
  title: string;
  requester: string;
  approver: string;
  businessType: string | null;
  businessId: string | null;
  status: string;
  comment: string | null;
  timeline: unknown;
  decidedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class PrismaCollaborationRepository extends CollaborationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary() {
    const tenantId = resolveCurrentTenantId();
    const [messages, notices, todos, approvals] = await Promise.all([
      this.prisma.collaborationMessage.findMany({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.collaborationNotice.findMany({ where: { tenantId } }),
      this.prisma.collaborationTodo.findMany({ where: { tenantId } }),
      this.prisma.collaborationApprovalLite.findMany({ where: { tenantId } }),
    ]);

    return buildCollaborationSummary({
      messages: messages.map(toMessageRecord),
      notices: notices.map(toNoticeRecord),
      todos: todos.map(toTodoRecord),
      approvals: approvals.map(toApprovalRecord),
    });
  }

  async listMessages(
    query: MessageQueryDto = {},
  ): Promise<PageResult<MessageRecord>> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.collaborationMessage.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: query.status,
        recipient: query.recipient,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toMessageRecord), query);
  }

  async createMessage(body: CreateMessageDto): Promise<MessageRecord> {
    const tenantId = resolveCurrentTenantId();
    const message = await this.prisma.collaborationMessage.create({
      data: {
        tenantId,
        title: body.title,
        body: body.body,
        sender: body.sender,
        recipient: body.recipient,
        businessType: body.businessType,
        businessId: body.businessId,
      },
    });

    return toMessageRecord(message);
  }

  async getMessage(id: string): Promise<MessageRecord> {
    const tenantId = resolveCurrentTenantId();
    const message = await this.prisma.collaborationMessage
      .findFirst({ where: { id, tenantId } })
      .then((row) => (row ? toMessageRecord(row) : undefined));

    return requireVisibleMessage(message, id);
  }

  async markMessageRead(id: string): Promise<MessageRecord> {
    const existing = await this.findMessage(id);
    assertMessageReadable(existing.status);
    const message = await this.prisma.collaborationMessage.update({
      where: { id },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    return toMessageRecord(message);
  }

  async archiveMessage(id: string): Promise<MessageRecord> {
    const existing = await this.findMessage(id);
    assertMessageNotDeleted(existing.status, 'archived');
    const message = await this.prisma.collaborationMessage.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return toMessageRecord(message);
  }

  async deleteMessage(id: string): Promise<{ deleted: true }> {
    const existing = await this.findMessage(id);
    assertMessageNotDeleted(existing.status, 'deleted');
    await this.prisma.collaborationMessage.update({
      where: { id },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });
    return { deleted: true };
  }

  async listNotices(
    query: NoticeQueryDto = {},
  ): Promise<PageResult<NoticeRecord>> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.collaborationNotice.findMany({
      where: { tenantId, status: query.status },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toNoticeRecord), query);
  }

  async createNotice(body: CreateNoticeDto): Promise<NoticeRecord> {
    const tenantId = resolveCurrentTenantId();
    const notice = await this.prisma.collaborationNotice.create({
      data: {
        tenantId,
        title: body.title,
        body: body.body,
        targetAudience: body.targetAudience,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validTo: body.validTo ? new Date(body.validTo) : undefined,
        createdBy: body.createdBy,
      },
    });

    return toNoticeRecord(notice);
  }

  async getNotice(id: string): Promise<NoticeRecord> {
    return this.findNotice(id);
  }

  async publishNotice(id: string): Promise<NoticeRecord> {
    const existing = await this.findNotice(id);
    assertNoticeCanPublish(existing.status);
    const notice = await this.prisma.collaborationNotice.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    return toNoticeRecord(notice);
  }

  async archiveNotice(id: string): Promise<NoticeRecord> {
    const existing = await this.findNotice(id);
    assertNoticeNotArchived(existing.status, 'archived');
    const notice = await this.prisma.collaborationNotice.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    return toNoticeRecord(notice);
  }

  async listTodos(query: TodoQueryDto = {}): Promise<PageResult<TodoRecord>> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.collaborationTodo.findMany({
      where: {
        tenantId,
        status: query.status,
        assignee: query.assignee,
        sourceType: query.sourceType,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toTodoRecord), query);
  }

  async createTodo(body: CreateTodoDto): Promise<TodoRecord> {
    const tenantId = resolveCurrentTenantId();
    const todo = await this.prisma.collaborationTodo.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description,
        sourceType: body.sourceType,
        businessType: body.businessType,
        businessId: body.businessId,
        assignee: body.assignee,
        timeline: toInputJson([createTimelineEntry(body.actor, 'created')]),
      },
    });

    return toTodoRecord(todo);
  }

  async getTodo(id: string): Promise<TodoRecord> {
    return this.findTodo(id);
  }

  async assignTodo(id: string, body: AssignTodoDto): Promise<TodoRecord> {
    const existing = await this.findTodo(id);
    assertTodoOpen(existing.status, 'assigned');
    const todo = await this.prisma.collaborationTodo.update({
      where: { id },
      data: {
        assignee: body.assignee,
        status: 'assigned',
        timeline: toInputJson(
          appendTimeline(existing.timeline, body.actor, 'assigned'),
        ),
      },
    });

    return toTodoRecord(todo);
  }

  async completeTodo(id: string, body: TodoActionDto): Promise<TodoRecord> {
    const existing = await this.findTodo(id);
    assertTodoOpen(existing.status, 'completed');
    const todo = await this.prisma.collaborationTodo.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        timeline: toInputJson(
          appendTimeline(existing.timeline, body.actor, 'completed'),
        ),
      },
    });

    return toTodoRecord(todo);
  }

  async cancelTodo(id: string, body: TodoActionDto): Promise<TodoRecord> {
    const existing = await this.findTodo(id);
    assertTodoOpen(existing.status, 'canceled');
    const todo = await this.prisma.collaborationTodo.update({
      where: { id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        timeline: toInputJson(
          appendTimeline(existing.timeline, body.actor, 'canceled'),
        ),
      },
    });

    return toTodoRecord(todo);
  }

  async listApprovalLiteRequests(
    query: ApprovalLiteQueryDto = {},
  ): Promise<PageResult<ApprovalLiteRecord>> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.collaborationApprovalLite.findMany({
      where: {
        tenantId,
        status: query.status,
        requester: query.requester,
        approver: query.approver,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toApprovalRecord), query);
  }

  async createApprovalLiteRequest(
    body: CreateApprovalLiteDto,
  ): Promise<ApprovalLiteRecord> {
    const tenantId = resolveCurrentTenantId();
    const approval = await this.prisma.collaborationApprovalLite.create({
      data: {
        tenantId,
        title: body.title,
        requester: body.requester,
        approver: body.approver,
        businessType: body.businessType,
        businessId: body.businessId,
        timeline: toInputJson([
          createTimelineEntry(body.requester, 'submitted'),
        ]),
      },
    });

    return toApprovalRecord(approval);
  }

  async getApprovalLiteRequest(id: string): Promise<ApprovalLiteRecord> {
    return this.findApproval(id);
  }

  async approveApprovalLiteRequest(
    id: string,
    body: DecideApprovalLiteDto,
  ): Promise<ApprovalLiteRecord> {
    return this.decideApproval(id, body, 'approved');
  }

  async rejectApprovalLiteRequest(
    id: string,
    body: DecideApprovalLiteDto,
  ): Promise<ApprovalLiteRecord> {
    return this.decideApproval(id, body, 'rejected');
  }

  private async decideApproval(
    id: string,
    body: DecideApprovalLiteDto,
    status: 'approved' | 'rejected',
  ): Promise<ApprovalLiteRecord> {
    const existing = await this.findApproval(id);
    assertPending(existing.status, 'Approval Lite request');
    const approval = await this.prisma.collaborationApprovalLite.update({
      where: { id },
      data: {
        status,
        comment: body.comment,
        decidedAt: new Date(),
        timeline: toInputJson(
          appendTimeline(existing.timeline, body.actor, status),
        ),
      },
    });

    return toApprovalRecord(approval);
  }

  private async findMessage(id: string): Promise<MessageRecord> {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      await this.prisma.collaborationMessage
        .findFirst({ where: { id, tenantId } })
        .then((message) => (message ? toMessageRecord(message) : undefined)),
      'Message',
      id,
    );
  }

  private async findNotice(id: string): Promise<NoticeRecord> {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      await this.prisma.collaborationNotice
        .findFirst({ where: { id, tenantId } })
        .then((notice) => (notice ? toNoticeRecord(notice) : undefined)),
      'Notice',
      id,
    );
  }

  private async findTodo(id: string): Promise<TodoRecord> {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      await this.prisma.collaborationTodo
        .findFirst({ where: { id, tenantId } })
        .then((todo) => (todo ? toTodoRecord(todo) : undefined)),
      'Todo',
      id,
    );
  }

  private async findApproval(id: string): Promise<ApprovalLiteRecord> {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      await this.prisma.collaborationApprovalLite
        .findFirst({ where: { id, tenantId } })
        .then((approval) =>
          approval ? toApprovalRecord(approval) : undefined,
        ),
      'Approval Lite request',
      id,
    );
  }
}

function toMessageRecord(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    body: row.body,
    sender: row.sender,
    recipient: row.recipient,
    status: normalizeMessageStatus(row.status),
    businessType: row.businessType ?? undefined,
    businessId: row.businessId ?? undefined,
    readAt: row.readAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    deletedAt: row.deletedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function toNoticeRecord(row: NoticeRow): NoticeRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    body: row.body,
    status: normalizeNoticeStatus(row.status),
    targetAudience: normalizeStringArray(row.targetAudience),
    validFrom: row.validFrom?.toISOString(),
    validTo: row.validTo?.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function toTodoRecord(row: TodoRow): TodoRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description ?? undefined,
    sourceType: row.sourceType,
    businessType: row.businessType ?? undefined,
    businessId: row.businessId ?? undefined,
    assignee: row.assignee,
    status: normalizeTodoStatus(row.status),
    timeline: normalizeTimeline(row.timeline),
    completedAt: row.completedAt?.toISOString(),
    canceledAt: row.canceledAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toApprovalRecord(row: ApprovalRow): ApprovalLiteRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    requester: row.requester,
    approver: row.approver,
    businessType: row.businessType ?? undefined,
    businessId: row.businessId ?? undefined,
    status: normalizeApprovalStatus(row.status),
    comment: row.comment ?? undefined,
    timeline: normalizeTimeline(row.timeline),
    decidedAt: row.decidedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeTimeline(value: unknown): TimelineEntryRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): TimelineEntryRecord[] => {
    if (
      item &&
      typeof item === 'object' &&
      'at' in item &&
      'actor' in item &&
      'action' in item &&
      typeof item.at === 'string' &&
      typeof item.actor === 'string' &&
      typeof item.action === 'string'
    ) {
      return [
        {
          at: item.at,
          actor: item.actor,
          action: item.action,
        },
      ];
    }

    return [];
  });
}

function normalizeMessageStatus(value: string): MessageRecord['status'] {
  return ['unread', 'read', 'archived', 'deleted'].includes(value)
    ? (value as MessageRecord['status'])
    : 'unread';
}

function normalizeNoticeStatus(value: string): NoticeRecord['status'] {
  return ['draft', 'published', 'archived'].includes(value)
    ? (value as NoticeRecord['status'])
    : 'draft';
}

function normalizeTodoStatus(value: string): TodoRecord['status'] {
  return ['pending', 'assigned', 'completed', 'canceled'].includes(value)
    ? (value as TodoRecord['status'])
    : 'pending';
}

function normalizeApprovalStatus(value: string): ApprovalLiteRecord['status'] {
  return ['pending', 'approved', 'rejected'].includes(value)
    ? (value as ApprovalLiteRecord['status'])
    : 'pending';
}
