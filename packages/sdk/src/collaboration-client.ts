import type { SdkRequest } from './rbac-client';
import type {
  ApprovalLitePage,
  ApprovalLiteQueryRequest,
  ApprovalLiteSummary,
  AssignTodoRequest,
  CollaborationDeleteResult,
  CollaborationSummary,
  CreateApprovalLiteRequest,
  CreateMessageRequest,
  CreateNoticeRequest,
  CreateTodoRequest,
  DecideApprovalLiteRequest,
  MessagePage,
  MessageQueryRequest,
  MessageSummary,
  NoticePage,
  NoticeQueryRequest,
  NoticeSummary,
  PageRequest,
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
