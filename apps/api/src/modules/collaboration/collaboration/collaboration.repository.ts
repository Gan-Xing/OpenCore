import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  AssignTodoDto,
  ApprovalLiteQueryDto,
  CollaborationSummaryDto,
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

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export abstract class CollaborationRepository {
  abstract getSummary(): Promise<CollaborationSummaryDto>;

  abstract listMessages(
    query?: MessageQueryDto,
  ): Promise<PageResult<MessageRecord>>;
  abstract getMessage(id: string): Promise<MessageRecord>;
  abstract createMessage(body: CreateMessageDto): Promise<MessageRecord>;
  abstract markMessageRead(id: string): Promise<MessageRecord>;
  abstract archiveMessage(id: string): Promise<MessageRecord>;
  abstract deleteMessage(id: string): Promise<{ deleted: true }>;

  abstract listNotices(
    query?: NoticeQueryDto,
  ): Promise<PageResult<NoticeRecord>>;
  abstract getNotice(id: string): Promise<NoticeRecord>;
  abstract createNotice(body: CreateNoticeDto): Promise<NoticeRecord>;
  abstract publishNotice(id: string): Promise<NoticeRecord>;
  abstract archiveNotice(id: string): Promise<NoticeRecord>;

  abstract listTodos(query?: TodoQueryDto): Promise<PageResult<TodoRecord>>;
  abstract getTodo(id: string): Promise<TodoRecord>;
  abstract createTodo(body: CreateTodoDto): Promise<TodoRecord>;
  abstract assignTodo(id: string, body: AssignTodoDto): Promise<TodoRecord>;
  abstract completeTodo(id: string, body: TodoActionDto): Promise<TodoRecord>;
  abstract cancelTodo(id: string, body: TodoActionDto): Promise<TodoRecord>;

  abstract listApprovalLiteRequests(
    query?: ApprovalLiteQueryDto,
  ): Promise<PageResult<ApprovalLiteRecord>>;
  abstract getApprovalLiteRequest(id: string): Promise<ApprovalLiteRecord>;
  abstract createApprovalLiteRequest(
    body: CreateApprovalLiteDto,
  ): Promise<ApprovalLiteRecord>;
  abstract approveApprovalLiteRequest(
    id: string,
    body: DecideApprovalLiteDto,
  ): Promise<ApprovalLiteRecord>;
  abstract rejectApprovalLiteRequest(
    id: string,
    body: DecideApprovalLiteDto,
  ): Promise<ApprovalLiteRecord>;
}

export function buildCollaborationSummary(input: {
  messages: readonly MessageRecord[];
  notices: readonly NoticeRecord[];
  todos: readonly TodoRecord[];
  approvals: readonly ApprovalLiteRecord[];
}): CollaborationSummaryDto {
  return {
    messages: {
      total: input.messages.length,
      unread: countByStatus(input.messages, 'unread'),
      read: countByStatus(input.messages, 'read'),
      archived: countByStatus(input.messages, 'archived'),
    },
    notices: {
      total: input.notices.length,
      draft: countByStatus(input.notices, 'draft'),
      published: countByStatus(input.notices, 'published'),
      archived: countByStatus(input.notices, 'archived'),
    },
    todos: {
      total: input.todos.length,
      pending: countByStatus(input.todos, 'pending'),
      assigned: countByStatus(input.todos, 'assigned'),
      completed: countByStatus(input.todos, 'completed'),
      canceled: countByStatus(input.todos, 'canceled'),
    },
    approvals: {
      total: input.approvals.length,
      pending: countByStatus(input.approvals, 'pending'),
      approved: countByStatus(input.approvals, 'approved'),
      rejected: countByStatus(input.approvals, 'rejected'),
    },
  };
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

export function matchesOptional<T>(
  value: T | undefined,
  expected: T | undefined,
): boolean {
  return expected === undefined || value === expected;
}

export function createTimelineEntry(
  actor: string,
  action: string,
): TimelineEntryRecord {
  return {
    at: new Date().toISOString(),
    actor,
    action,
  };
}

export function appendTimeline(
  timeline: readonly TimelineEntryRecord[],
  actor: string,
  action: string,
): TimelineEntryRecord[] {
  return [
    ...timeline.map((entry) => ({ ...entry })),
    createTimelineEntry(actor, action),
  ];
}

export function assertMessageReadable(status: string): void {
  if (status === 'archived' || status === 'deleted') {
    throw new BadRequestException(
      `Message cannot be marked read from ${status} status.`,
    );
  }
}

export function assertMessageNotDeleted(status: string, action: string): void {
  if (status === 'deleted') {
    throw new BadRequestException(
      `Message cannot be ${action} after deletion.`,
    );
  }
}

export function requireVisibleMessage(
  record: MessageRecord | undefined,
  id: string,
): MessageRecord {
  if (!record || record.status === 'deleted') {
    throw new NotFoundException(`Message not found: ${id}`);
  }

  return record;
}

export function assertNoticeCanPublish(status: string): void {
  if (status !== 'draft') {
    throw new BadRequestException('Notice can only be published from draft.');
  }
}

export function assertNoticeNotArchived(status: string, action: string): void {
  if (status === 'archived') {
    throw new BadRequestException(`Notice cannot be ${action} after archive.`);
  }
}

export function assertPending(status: string, resource: string): void {
  if (status !== 'pending') {
    throw new BadRequestException(`${resource} is not pending.`);
  }
}

export function assertTodoOpen(status: string, action: string): void {
  if (status === 'completed' || status === 'canceled') {
    throw new BadRequestException(
      `Todo cannot be ${action} from ${status} status.`,
    );
  }
}

export function requireRecord<T>(
  record: T | undefined,
  resource: string,
  id: string,
): T {
  if (!record) {
    throw new NotFoundException(`${resource} not found: ${id}`);
  }

  return record;
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

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}
