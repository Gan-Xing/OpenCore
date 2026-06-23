import { Injectable } from '@nestjs/common';
import { getRequestContext } from '@opencore/core';
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
import {
  seedApprovalLiteRequests,
  seedMessages,
  seedNotices,
  seedTodos,
  type ApprovalLiteRecord,
  type MessageRecord,
  type NoticeRecord,
  type TodoRecord,
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
  matchesOptional,
  requireRecord,
  requireVisibleMessage,
  type PageResult,
} from './collaboration.repository';

const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class SeedCollaborationRepository extends CollaborationRepository {
  private messages: MessageRecord[] = seedMessages.map((message) => ({
    ...message,
  }));
  private notices: NoticeRecord[] = seedNotices.map((notice) => ({
    ...notice,
  }));
  private todos: TodoRecord[] = seedTodos.map(cloneTodo);
  private approvals: ApprovalLiteRecord[] =
    seedApprovalLiteRequests.map(cloneApproval);

  async getSummary() {
    const tenantId = resolveCurrentTenantId();
    return buildCollaborationSummary({
      messages: this.messages.filter(
        (message) =>
          message.tenantId === tenantId && message.status !== 'deleted',
      ),
      notices: this.notices.filter((notice) => notice.tenantId === tenantId),
      todos: this.todos,
      approvals: this.approvals,
    });
  }

  async listMessages(
    query: MessageQueryDto = {},
  ): Promise<PageResult<MessageRecord>> {
    const tenantId = resolveCurrentTenantId();
    return createPage(
      this.messages.filter(
        (message) =>
          message.tenantId === tenantId &&
          message.status !== 'deleted' &&
          matchesOptional(message.status, query.status) &&
          matchesOptional(message.recipient, query.recipient),
      ),
      query,
    );
  }

  async createMessage(body: CreateMessageDto): Promise<MessageRecord> {
    const tenantId = resolveCurrentTenantId();
    const message: MessageRecord = {
      id: `msg_${this.messages.length + 1}`,
      tenantId,
      title: body.title,
      body: body.body,
      sender: body.sender,
      recipient: body.recipient,
      status: 'unread',
      businessType: body.businessType,
      businessId: body.businessId,
      createdAt: new Date().toISOString(),
    };
    this.messages = [message, ...this.messages];
    return { ...message };
  }

  async getMessage(id: string): Promise<MessageRecord> {
    return { ...requireVisibleMessage(this.findMessage(id), id) };
  }

  async markMessageRead(id: string): Promise<MessageRecord> {
    const message = this.findMessage(id);
    assertMessageReadable(message.status);
    message.status = 'read';
    message.readAt = new Date().toISOString();
    return { ...message };
  }

  async archiveMessage(id: string): Promise<MessageRecord> {
    const message = this.findMessage(id);
    assertMessageNotDeleted(message.status, 'archived');
    message.status = 'archived';
    message.archivedAt = new Date().toISOString();
    return { ...message };
  }

  async deleteMessage(id: string): Promise<{ deleted: true }> {
    const message = this.findMessage(id);
    assertMessageNotDeleted(message.status, 'deleted');
    message.status = 'deleted';
    message.deletedAt = new Date().toISOString();
    return { deleted: true };
  }

  async listNotices(
    query: NoticeQueryDto = {},
  ): Promise<PageResult<NoticeRecord>> {
    const tenantId = resolveCurrentTenantId();
    return createPage(
      this.notices.filter(
        (notice) =>
          notice.tenantId === tenantId &&
          matchesOptional(notice.status, query.status),
      ),
      query,
    );
  }

  async createNotice(body: CreateNoticeDto): Promise<NoticeRecord> {
    const tenantId = resolveCurrentTenantId();
    const notice: NoticeRecord = {
      id: `notice_${this.notices.length + 1}`,
      tenantId,
      title: body.title,
      body: body.body,
      status: 'draft',
      targetAudience: body.targetAudience,
      validFrom: body.validFrom,
      validTo: body.validTo,
      createdBy: body.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.notices = [notice, ...this.notices];
    return { ...notice };
  }

  async getNotice(id: string): Promise<NoticeRecord> {
    return { ...this.findNotice(id) };
  }

  async publishNotice(id: string): Promise<NoticeRecord> {
    const notice = this.findNotice(id);
    assertNoticeCanPublish(notice.status);
    notice.status = 'published';
    notice.publishedAt = new Date().toISOString();
    return { ...notice };
  }

  async archiveNotice(id: string): Promise<NoticeRecord> {
    const notice = this.findNotice(id);
    assertNoticeNotArchived(notice.status, 'archived');
    notice.status = 'archived';
    notice.archivedAt = new Date().toISOString();
    return { ...notice };
  }

  async listTodos(query: TodoQueryDto = {}): Promise<PageResult<TodoRecord>> {
    return createPage(
      this.todos.filter(
        (todo) =>
          matchesOptional(todo.status, query.status) &&
          matchesOptional(todo.assignee, query.assignee) &&
          matchesOptional(todo.sourceType, query.sourceType),
      ),
      query,
    );
  }

  async createTodo(body: CreateTodoDto): Promise<TodoRecord> {
    const todo: TodoRecord = {
      id: `todo_${this.todos.length + 1}`,
      title: body.title,
      description: body.description,
      sourceType: body.sourceType,
      businessType: body.businessType,
      businessId: body.businessId,
      assignee: body.assignee,
      status: 'pending',
      timeline: [createTimelineEntry(body.actor, 'created')],
      createdAt: new Date().toISOString(),
    };
    this.todos = [todo, ...this.todos];
    return cloneTodo(todo);
  }

  async getTodo(id: string): Promise<TodoRecord> {
    return cloneTodo(this.findTodo(id));
  }

  async assignTodo(id: string, body: AssignTodoDto): Promise<TodoRecord> {
    const todo = this.findTodo(id);
    assertTodoOpen(todo.status, 'assigned');
    todo.assignee = body.assignee;
    todo.status = 'assigned';
    todo.timeline = appendTimeline(todo.timeline, body.actor, 'assigned');
    return cloneTodo(todo);
  }

  async completeTodo(id: string, body: TodoActionDto): Promise<TodoRecord> {
    const todo = this.findTodo(id);
    assertTodoOpen(todo.status, 'completed');
    todo.status = 'completed';
    todo.completedAt = new Date().toISOString();
    todo.timeline = appendTimeline(todo.timeline, body.actor, 'completed');
    return cloneTodo(todo);
  }

  async cancelTodo(id: string, body: TodoActionDto): Promise<TodoRecord> {
    const todo = this.findTodo(id);
    assertTodoOpen(todo.status, 'canceled');
    todo.status = 'canceled';
    todo.canceledAt = new Date().toISOString();
    todo.timeline = appendTimeline(todo.timeline, body.actor, 'canceled');
    return cloneTodo(todo);
  }

  async listApprovalLiteRequests(
    query: ApprovalLiteQueryDto = {},
  ): Promise<PageResult<ApprovalLiteRecord>> {
    return createPage(
      this.approvals.filter(
        (approval) =>
          matchesOptional(approval.status, query.status) &&
          matchesOptional(approval.requester, query.requester) &&
          matchesOptional(approval.approver, query.approver),
      ),
      query,
    );
  }

  async createApprovalLiteRequest(
    body: CreateApprovalLiteDto,
  ): Promise<ApprovalLiteRecord> {
    const approval: ApprovalLiteRecord = {
      id: `approval_${this.approvals.length + 1}`,
      title: body.title,
      requester: body.requester,
      approver: body.approver,
      businessType: body.businessType,
      businessId: body.businessId,
      status: 'pending',
      timeline: [createTimelineEntry(body.requester, 'submitted')],
      createdAt: new Date().toISOString(),
    };
    this.approvals = [approval, ...this.approvals];
    return cloneApproval(approval);
  }

  async getApprovalLiteRequest(id: string): Promise<ApprovalLiteRecord> {
    return cloneApproval(this.findApproval(id));
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

  private decideApproval(
    id: string,
    body: DecideApprovalLiteDto,
    status: 'approved' | 'rejected',
  ): ApprovalLiteRecord {
    const approval = this.findApproval(id);
    assertPending(approval.status, 'Approval Lite request');
    approval.status = status;
    approval.comment = body.comment;
    approval.decidedAt = new Date().toISOString();
    approval.timeline = appendTimeline(approval.timeline, body.actor, status);
    return cloneApproval(approval);
  }

  private findMessage(id: string): MessageRecord {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      this.messages.find(
        (message) => message.id === id && message.tenantId === tenantId,
      ),
      'Message',
      id,
    );
  }

  private findNotice(id: string): NoticeRecord {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      this.notices.find(
        (notice) => notice.id === id && notice.tenantId === tenantId,
      ),
      'Notice',
      id,
    );
  }

  private findTodo(id: string): TodoRecord {
    return requireRecord(
      this.todos.find((todo) => todo.id === id),
      'Todo',
      id,
    );
  }

  private findApproval(id: string): ApprovalLiteRecord {
    return requireRecord(
      this.approvals.find((approval) => approval.id === id),
      'Approval Lite request',
      id,
    );
  }
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function cloneTodo(todo: TodoRecord): TodoRecord {
  return {
    ...todo,
    timeline: todo.timeline.map((entry) => ({ ...entry })),
  };
}

function cloneApproval(approval: ApprovalLiteRecord): ApprovalLiteRecord {
  return {
    ...approval,
    timeline: approval.timeline.map((entry) => ({ ...entry })),
  };
}
