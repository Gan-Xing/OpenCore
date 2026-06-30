import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type CollaborationTimelineEntry = {
  at: string;
  actor: string;
  action: string;
};

export type MessageSummary = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  sender: string;
  recipient: string;
  status: 'archived' | 'deleted' | 'read' | 'unread';
  businessType?: string;
  businessId?: string;
  readAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  createdAt: string;
};

export type NoticeSummary = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  status: 'archived' | 'draft' | 'published';
  targetAudience: readonly string[];
  validFrom?: string;
  validTo?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdBy: string;
  createdAt: string;
};

export type TodoSummary = {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  sourceType: string;
  businessType?: string;
  businessId?: string;
  assignee: string;
  status: 'assigned' | 'canceled' | 'completed' | 'pending';
  timeline: readonly CollaborationTimelineEntry[];
  completedAt?: string;
  canceledAt?: string;
  createdAt: string;
};

export type ApprovalLiteSummary = {
  id: string;
  tenantId: string;
  title: string;
  requester: string;
  approver: string;
  businessType?: string;
  businessId?: string;
  status: 'approved' | 'pending' | 'rejected';
  comment?: string;
  timeline: readonly CollaborationTimelineEntry[];
  decidedAt?: string;
  createdAt: string;
};

export type TicketStatus =
  | 'canceled'
  | 'closed'
  | 'new'
  | 'pending_confirmation'
  | 'processing'
  | 'resolved';

export type TicketPriority = 'high' | 'low' | 'medium' | 'urgent';

export type TicketCategorySummary = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type TicketCommentSummary = {
  id: string;
  tenantId: string;
  ticketId: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketTransitionSummary = {
  id: string;
  tenantId: string;
  ticketId: string;
  fromStatus?: TicketStatus;
  toStatus: TicketStatus;
  actor: string;
  comment?: string;
  createdAt: string;
};

export type TicketAttachmentSummary = {
  id: string;
  tenantId: string;
  ticketId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketSummary = {
  id: string;
  tenantId: string;
  number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId?: string;
  category?: TicketCategorySummary;
  createdBy: string;
  assignee?: string;
  dueAt?: string;
  firstRespondedAt?: string;
  responseDueAt?: string;
  resolutionDueAt?: string;
  responseOverdue: boolean;
  resolutionOverdue: boolean;
  slaBreached: boolean;
  slaNotifiedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  comments: readonly TicketCommentSummary[];
  transitions: readonly TicketTransitionSummary[];
  attachments: readonly TicketAttachmentSummary[];
  createdAt: string;
  updatedAt: string;
};

export type CollaborationSummary = {
  messages: {
    total: number;
    unread: number;
    read: number;
    archived: number;
  };
  notices: {
    total: number;
    draft: number;
    published: number;
    archived: number;
  };
  todos: {
    total: number;
    pending: number;
    assigned: number;
    completed: number;
    canceled: number;
  };
  approvals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export type CreateMessageRequest = Pick<
  MessageSummary,
  'body' | 'businessId' | 'businessType' | 'recipient' | 'sender' | 'title'
>;

export type CreateNoticeRequest = Pick<
  NoticeSummary,
  'body' | 'createdBy' | 'targetAudience' | 'title' | 'validFrom' | 'validTo'
>;

export type CreateTodoRequest = Pick<
  TodoSummary,
  | 'assignee'
  | 'businessId'
  | 'businessType'
  | 'description'
  | 'sourceType'
  | 'title'
> & { actor: string };

export type AssignTodoRequest = {
  assignee: string;
  actor: string;
};

export type TodoActionRequest = {
  actor: string;
};

export type CreateApprovalLiteRequest = Pick<
  ApprovalLiteSummary,
  'approver' | 'businessId' | 'businessType' | 'requester' | 'title'
>;

export type DecideApprovalLiteRequest = {
  actor: string;
  comment?: string;
};

export type CreateTicketCategoryRequest = {
  code: string;
  name: string;
  description?: string;
  enabled?: boolean;
  order?: number;
};

export type UpdateTicketCategoryRequest = Partial<CreateTicketCategoryRequest>;

export type CreateTicketRequest = {
  title: string;
  description: string;
  createdBy: string;
  priority?: TicketPriority;
  categoryId?: string;
  assignee?: string;
  dueAt?: string;
  responseDueAt?: string;
  resolutionDueAt?: string;
};

export type UpdateTicketRequest = Partial<
  Pick<
    TicketSummary,
    | 'description'
    | 'dueAt'
    | 'priority'
    | 'resolutionDueAt'
    | 'responseDueAt'
    | 'title'
  >
> & {
  assignee?: string | null;
  categoryId?: string | null;
};

export type AssignTicketRequest = {
  assignee: string;
  actor: string;
  comment?: string;
};

export type ChangeTicketStatusRequest = {
  status: TicketStatus;
  actor: string;
  comment?: string;
};

export type TicketActionRequest = {
  actor: string;
  comment?: string;
};

export type BatchAssignTicketsRequest = {
  ids: string[];
  assignee: string;
  actor: string;
  comment?: string;
};

export type BatchTicketActionRequest = {
  ids: string[];
  actor: string;
  comment?: string;
};

export type TicketBatchMutationSummary = {
  updated: number;
  skipped: number;
  ids: readonly string[];
};

export type TicketSlaReminderSummary = {
  scanned: number;
  markedOverdue: number;
  notified: number;
};

export type TicketSummaryBucket = {
  key: string;
  count: number;
};

export type TicketDashboardSummary = {
  total: number;
  pending: number;
  overdue: number;
  byAssignee: readonly TicketSummaryBucket[];
  byCategory: readonly TicketSummaryBucket[];
  byPriority: readonly TicketSummaryBucket[];
  byStatus: readonly TicketSummaryBucket[];
};

export type TicketExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type CreateTicketCommentRequest = {
  author: string;
  body: string;
};

export type CreateTicketAttachmentRequest = Pick<
  TicketAttachmentSummary,
  'mimeType' | 'originalName' | 'sizeBytes' | 'storageKey' | 'uploadedBy'
>;

export type CollaborationDeleteResult = {
  deleted: true;
};

export type MessageQueryRequest = PageRequest & {
  status?: 'archived' | 'read' | 'unread';
  recipient?: string;
};

export type NoticeQueryRequest = PageRequest & {
  status?: 'archived' | 'draft' | 'published';
};

export type TodoQueryRequest = PageRequest & {
  status?: 'assigned' | 'canceled' | 'completed' | 'pending';
  assignee?: string;
  sourceType?: string;
};

export type ApprovalLiteQueryRequest = PageRequest & {
  status?: 'approved' | 'pending' | 'rejected';
  requester?: string;
  approver?: string;
};

export type TicketCategoryQueryRequest = PageRequest & {
  enabled?: boolean;
};

export type TicketQueryRequest = PageRequest & {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assignee?: string;
  keyword?: string;
  includeArchived?: boolean;
  overdue?: boolean;
  slaBreached?: boolean;
};

export type TicketTransitionExportQueryRequest = PageRequest & {
  ticketId?: string;
  actor?: string;
};

export type CollaborationFixtures = {
  summary: CollaborationSummary;
  messages: readonly MessageSummary[];
  notices: readonly NoticeSummary[];
  todos: readonly TodoSummary[];
  approvals: readonly ApprovalLiteSummary[];
};

export function createCollaborationFixtures(): CollaborationFixtures {
  const messages: readonly MessageSummary[] = [
    {
      id: 'msg_welcome_admin',
      tenantId: 'tenant_root',
      title: 'Welcome to OpenCore',
      body: 'Initial collaboration message for the admin user.',
      sender: 'system',
      recipient: 'admin',
      status: 'unread',
      businessType: 'system',
      businessId: 'welcome',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ];
  const notices: readonly NoticeSummary[] = [
    {
      id: 'notice_release_window',
      tenantId: 'tenant_root',
      title: 'Release window',
      body: 'OpenCore maintenance release window.',
      status: 'draft',
      targetAudience: ['admin'],
      createdBy: 'admin',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ];
  const todos: readonly TodoSummary[] = [
    {
      id: 'todo_review_openforge',
      tenantId: 'tenant_root',
      title: 'Review OpenForge patch plan',
      sourceType: 'manual',
      businessType: 'tool.openforge',
      businessId: 'core.dict',
      assignee: 'admin',
      status: 'pending',
      timeline: [
        {
          at: '2026-06-10T00:00:00.000Z',
          actor: 'system',
          action: 'created',
        },
      ],
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ];
  const approvals: readonly ApprovalLiteSummary[] = [
    {
      id: 'approval_openforge_apply',
      tenantId: 'tenant_root',
      title: 'Approve OpenForge apply',
      requester: 'developer',
      approver: 'admin',
      businessType: 'tool.openforge',
      businessId: 'core.dict',
      status: 'pending',
      timeline: [
        {
          at: '2026-06-10T00:00:00.000Z',
          actor: 'developer',
          action: 'submitted',
        },
      ],
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ];

  return {
    summary: {
      messages: {
        total: messages.length,
        unread: countByStatus(messages, 'unread'),
        read: countByStatus(messages, 'read'),
        archived: countByStatus(messages, 'archived'),
      },
      notices: {
        total: notices.length,
        draft: countByStatus(notices, 'draft'),
        published: countByStatus(notices, 'published'),
        archived: countByStatus(notices, 'archived'),
      },
      todos: {
        total: todos.length,
        pending: countByStatus(todos, 'pending'),
        assigned: countByStatus(todos, 'assigned'),
        completed: countByStatus(todos, 'completed'),
        canceled: countByStatus(todos, 'canceled'),
      },
      approvals: {
        total: approvals.length,
        pending: countByStatus(approvals, 'pending'),
        approved: countByStatus(approvals, 'approved'),
        rejected: countByStatus(approvals, 'rejected'),
      },
    },
    messages,
    notices,
    todos,
    approvals,
  };
}

export function findMessageFixture(id: string): MessageSummary | undefined {
  return createCollaborationFixtures().messages.find(
    (message) => message.id === id && message.status !== 'deleted',
  );
}

export function findNoticeFixture(id: string): NoticeSummary | undefined {
  return createCollaborationFixtures().notices.find(
    (notice) => notice.id === id,
  );
}

export function findTodoFixture(id: string): TodoSummary | undefined {
  return createCollaborationFixtures().todos.find((todo) => todo.id === id);
}

export function findApprovalLiteFixture(
  id: string,
): ApprovalLiteSummary | undefined {
  return createCollaborationFixtures().approvals.find(
    (approval) => approval.id === id,
  );
}

export type MessagePage = PageResponse<MessageSummary>;
export type NoticePage = PageResponse<NoticeSummary>;
export type TodoPage = PageResponse<TodoSummary>;
export type ApprovalLitePage = PageResponse<ApprovalLiteSummary>;
export type TicketCategoryPage = PageResponse<TicketCategorySummary>;
export type TicketPage = PageResponse<TicketSummary>;

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}
