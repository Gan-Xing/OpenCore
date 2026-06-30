import type { SdkRequest } from './rbac-client';
import type {
  ApprovalLitePage,
  ApprovalLiteQueryRequest,
  ApprovalLiteSummary,
  AssignTicketRequest,
  AssignTodoRequest,
  BatchAssignTicketsRequest,
  BatchTicketActionRequest,
  ChangeTicketStatusRequest,
  CollaborationDeleteResult,
  CollaborationSummary,
  CreateApprovalLiteRequest,
  CreateMessageRequest,
  CreateNoticeRequest,
  CreateTicketAttachmentRequest,
  CreateTicketCategoryRequest,
  CreateTicketCommentRequest,
  CreateTicketRequest,
  CreateTodoRequest,
  DecideApprovalLiteRequest,
  MessagePage,
  MessageQueryRequest,
  MessageSummary,
  NoticePage,
  NoticeQueryRequest,
  NoticeSummary,
  PageRequest,
  TicketActionRequest,
  TicketBatchMutationSummary,
  TicketCategoryPage,
  TicketCategoryQueryRequest,
  TicketCategorySummary,
  TicketDashboardSummary,
  TicketExportPreview,
  TicketPage,
  TicketQueryRequest,
  TicketSlaReminderSummary,
  TicketSummary,
  TicketTransitionExportQueryRequest,
  UpdateTicketCategoryRequest,
  UpdateTicketRequest,
  TodoActionRequest,
  TodoPage,
  TodoQueryRequest,
  TodoSummary,
} from './collaboration-types';

export type CollaborationClient = {
  getSummary: (token: string) => Promise<CollaborationSummary>;
  listMessages: (
    token: string,
    query?: MessageQueryRequest,
  ) => Promise<MessagePage>;
  getMessage: (token: string, id: string) => Promise<MessageSummary>;
  createMessage: (
    token: string,
    body: CreateMessageRequest,
  ) => Promise<MessageSummary>;
  markMessageRead: (token: string, id: string) => Promise<MessageSummary>;
  archiveMessage: (token: string, id: string) => Promise<MessageSummary>;
  deleteMessage: (
    token: string,
    id: string,
  ) => Promise<CollaborationDeleteResult>;
  listNotices: (
    token: string,
    query?: NoticeQueryRequest,
  ) => Promise<NoticePage>;
  getNotice: (token: string, id: string) => Promise<NoticeSummary>;
  createNotice: (
    token: string,
    body: CreateNoticeRequest,
  ) => Promise<NoticeSummary>;
  publishNotice: (token: string, id: string) => Promise<NoticeSummary>;
  archiveNotice: (token: string, id: string) => Promise<NoticeSummary>;
  listTodos: (token: string, query?: TodoQueryRequest) => Promise<TodoPage>;
  getTodo: (token: string, id: string) => Promise<TodoSummary>;
  createTodo: (token: string, body: CreateTodoRequest) => Promise<TodoSummary>;
  assignTodo: (
    token: string,
    id: string,
    body: AssignTodoRequest,
  ) => Promise<TodoSummary>;
  completeTodo: (
    token: string,
    id: string,
    body: TodoActionRequest,
  ) => Promise<TodoSummary>;
  cancelTodo: (
    token: string,
    id: string,
    body: TodoActionRequest,
  ) => Promise<TodoSummary>;
  listApprovalLiteRequests: (
    token: string,
    query?: ApprovalLiteQueryRequest,
  ) => Promise<ApprovalLitePage>;
  getApprovalLiteRequest: (
    token: string,
    id: string,
  ) => Promise<ApprovalLiteSummary>;
  createApprovalLiteRequest: (
    token: string,
    body: CreateApprovalLiteRequest,
  ) => Promise<ApprovalLiteSummary>;
  approveApprovalLiteRequest: (
    token: string,
    id: string,
    body: DecideApprovalLiteRequest,
  ) => Promise<ApprovalLiteSummary>;
  rejectApprovalLiteRequest: (
    token: string,
    id: string,
    body: DecideApprovalLiteRequest,
  ) => Promise<ApprovalLiteSummary>;
  listTicketCategories: (
    token: string,
    query?: TicketCategoryQueryRequest,
  ) => Promise<TicketCategoryPage>;
  createTicketCategory: (
    token: string,
    body: CreateTicketCategoryRequest,
  ) => Promise<TicketCategorySummary>;
  updateTicketCategory: (
    token: string,
    id: string,
    body: UpdateTicketCategoryRequest,
  ) => Promise<TicketCategorySummary>;
  listTickets: (
    token: string,
    query?: TicketQueryRequest,
  ) => Promise<TicketPage>;
  getTicketDashboardSummary: (token: string) => Promise<TicketDashboardSummary>;
  exportTickets: (
    token: string,
    query?: TicketQueryRequest,
  ) => Promise<TicketExportPreview>;
  exportTicketTransitions: (
    token: string,
    query?: TicketTransitionExportQueryRequest,
  ) => Promise<TicketExportPreview>;
  getTicket: (token: string, id: string) => Promise<TicketSummary>;
  createTicket: (
    token: string,
    body: CreateTicketRequest,
  ) => Promise<TicketSummary>;
  updateTicket: (
    token: string,
    id: string,
    body: UpdateTicketRequest,
  ) => Promise<TicketSummary>;
  assignTicket: (
    token: string,
    id: string,
    body: AssignTicketRequest,
  ) => Promise<TicketSummary>;
  changeTicketStatus: (
    token: string,
    id: string,
    body: ChangeTicketStatusRequest,
  ) => Promise<TicketSummary>;
  closeTicket: (
    token: string,
    id: string,
    body: TicketActionRequest,
  ) => Promise<TicketSummary>;
  reopenTicket: (
    token: string,
    id: string,
    body: TicketActionRequest,
  ) => Promise<TicketSummary>;
  addTicketComment: (
    token: string,
    id: string,
    body: CreateTicketCommentRequest,
  ) => Promise<TicketSummary>;
  addTicketAttachment: (
    token: string,
    id: string,
    body: CreateTicketAttachmentRequest,
  ) => Promise<TicketSummary>;
  sendTicketSlaReminders: (token: string) => Promise<TicketSlaReminderSummary>;
  batchAssignTickets: (
    token: string,
    body: BatchAssignTicketsRequest,
  ) => Promise<TicketBatchMutationSummary>;
  batchCloseTickets: (
    token: string,
    body: BatchTicketActionRequest,
  ) => Promise<TicketBatchMutationSummary>;
  batchArchiveTickets: (
    token: string,
    body: BatchTicketActionRequest,
  ) => Promise<TicketBatchMutationSummary>;
  archiveTicket: (
    token: string,
    id: string,
  ) => Promise<CollaborationDeleteResult>;
};

export function createCollaborationClient(
  request: SdkRequest,
): CollaborationClient {
  return {
    getSummary: (token) =>
      request<CollaborationSummary>('/collaboration/summary', { token }),
    listMessages: (token, query) =>
      request<MessagePage>(withQuery('/collaboration/messages', query), {
        token,
      }),
    getMessage: (token, id) =>
      request<MessageSummary>(
        `/collaboration/messages/${encodeURIComponent(id)}`,
        { token },
      ),
    createMessage: (token, body) =>
      request<MessageSummary>('/collaboration/messages', {
        method: 'POST',
        body,
        token,
      }),
    markMessageRead: (token, id) =>
      request<MessageSummary>(
        `/collaboration/messages/${encodeURIComponent(id)}/read`,
        { method: 'PATCH', token },
      ),
    archiveMessage: (token, id) =>
      request<MessageSummary>(
        `/collaboration/messages/${encodeURIComponent(id)}/archive`,
        { method: 'PATCH', token },
      ),
    deleteMessage: (token, id) =>
      request<CollaborationDeleteResult>(
        `/collaboration/messages/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
    listNotices: (token, query) =>
      request<NoticePage>(withQuery('/collaboration/notices', query), {
        token,
      }),
    getNotice: (token, id) =>
      request<NoticeSummary>(
        `/collaboration/notices/${encodeURIComponent(id)}`,
        { token },
      ),
    createNotice: (token, body) =>
      request<NoticeSummary>('/collaboration/notices', {
        method: 'POST',
        body,
        token,
      }),
    publishNotice: (token, id) =>
      request<NoticeSummary>(
        `/collaboration/notices/${encodeURIComponent(id)}/publish`,
        { method: 'PATCH', token },
      ),
    archiveNotice: (token, id) =>
      request<NoticeSummary>(
        `/collaboration/notices/${encodeURIComponent(id)}/archive`,
        { method: 'PATCH', token },
      ),
    listTodos: (token, query) =>
      request<TodoPage>(withQuery('/collaboration/todos', query), { token }),
    getTodo: (token, id) =>
      request<TodoSummary>(`/collaboration/todos/${encodeURIComponent(id)}`, {
        token,
      }),
    createTodo: (token, body) =>
      request<TodoSummary>('/collaboration/todos', {
        method: 'POST',
        body,
        token,
      }),
    assignTodo: (token, id, body) =>
      request<TodoSummary>(
        `/collaboration/todos/${encodeURIComponent(id)}/assign`,
        { method: 'PATCH', body, token },
      ),
    completeTodo: (token, id, body) =>
      request<TodoSummary>(
        `/collaboration/todos/${encodeURIComponent(id)}/complete`,
        { method: 'PATCH', body, token },
      ),
    cancelTodo: (token, id, body) =>
      request<TodoSummary>(
        `/collaboration/todos/${encodeURIComponent(id)}/cancel`,
        { method: 'PATCH', body, token },
      ),
    listApprovalLiteRequests: (token, query) =>
      request<ApprovalLitePage>(withQuery('/collaboration/approvals', query), {
        token,
      }),
    getApprovalLiteRequest: (token, id) =>
      request<ApprovalLiteSummary>(
        `/collaboration/approvals/${encodeURIComponent(id)}`,
        { token },
      ),
    createApprovalLiteRequest: (token, body) =>
      request<ApprovalLiteSummary>('/collaboration/approvals', {
        method: 'POST',
        body,
        token,
      }),
    approveApprovalLiteRequest: (token, id, body) =>
      request<ApprovalLiteSummary>(
        `/collaboration/approvals/${encodeURIComponent(id)}/approve`,
        { method: 'PATCH', body, token },
      ),
    rejectApprovalLiteRequest: (token, id, body) =>
      request<ApprovalLiteSummary>(
        `/collaboration/approvals/${encodeURIComponent(id)}/reject`,
        { method: 'PATCH', body, token },
      ),
    listTicketCategories: (token, query) =>
      request<TicketCategoryPage>(
        withQuery('/collaboration/tickets/categories', query),
        { token },
      ),
    createTicketCategory: (token, body) =>
      request<TicketCategorySummary>('/collaboration/tickets/categories', {
        method: 'POST',
        body,
        token,
      }),
    updateTicketCategory: (token, id, body) =>
      request<TicketCategorySummary>(
        `/collaboration/tickets/categories/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    listTickets: (token, query) =>
      request<TicketPage>(withQuery('/collaboration/tickets', query), {
        token,
      }),
    getTicketDashboardSummary: (token) =>
      request<TicketDashboardSummary>('/collaboration/tickets/summary', {
        token,
      }),
    exportTickets: (token, query) =>
      request<TicketExportPreview>(
        withQuery('/collaboration/tickets/export', query),
        { token },
      ),
    exportTicketTransitions: (token, query) =>
      request<TicketExportPreview>(
        withQuery('/collaboration/tickets/transitions/export', query),
        { token },
      ),
    getTicket: (token, id) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}`,
        { token },
      ),
    createTicket: (token, body) =>
      request<TicketSummary>('/collaboration/tickets', {
        method: 'POST',
        body,
        token,
      }),
    updateTicket: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}`,
        { method: 'PATCH', body, token },
      ),
    assignTicket: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}/assign`,
        { method: 'PATCH', body, token },
      ),
    changeTicketStatus: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}/status`,
        { method: 'PATCH', body, token },
      ),
    closeTicket: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}/close`,
        { method: 'PATCH', body, token },
      ),
    reopenTicket: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}/reopen`,
        { method: 'PATCH', body, token },
      ),
    addTicketComment: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}/comments`,
        { method: 'POST', body, token },
      ),
    addTicketAttachment: (token, id, body) =>
      request<TicketSummary>(
        `/collaboration/tickets/${encodeURIComponent(id)}/attachments`,
        { method: 'POST', body, token },
      ),
    sendTicketSlaReminders: (token) =>
      request<TicketSlaReminderSummary>(
        '/collaboration/tickets/sla/reminders',
        {
          method: 'POST',
          token,
        },
      ),
    batchAssignTickets: (token, body) =>
      request<TicketBatchMutationSummary>(
        '/collaboration/tickets/batch/assign',
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    batchCloseTickets: (token, body) =>
      request<TicketBatchMutationSummary>(
        '/collaboration/tickets/batch/close',
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    batchArchiveTickets: (token, body) =>
      request<TicketBatchMutationSummary>(
        '/collaboration/tickets/batch/archive',
        { method: 'PATCH', body, token },
      ),
    archiveTicket: (token, id) =>
      request<CollaborationDeleteResult>(
        `/collaboration/tickets/${encodeURIComponent(id)}`,
        { method: 'DELETE', token },
      ),
  };
}

function withQuery(
  path: `/${string}`,
  query: PageRequest & Record<string, unknown> = {},
): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
