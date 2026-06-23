import type {
  ApprovalLiteDto,
  CollaborationTimelineEntryDto,
  MessageDto,
  NoticeDto,
  TodoDto,
} from './collaboration.dto';

export type MessageRecord = MessageDto;
export type NoticeRecord = NoticeDto;
export type TodoRecord = TodoDto;
export type ApprovalLiteRecord = ApprovalLiteDto;
export type TimelineEntryRecord = CollaborationTimelineEntryDto;

export const seedMessages: readonly MessageRecord[] = [
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

export const seedNotices: readonly NoticeRecord[] = [
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

export const seedTodos: readonly TodoRecord[] = [
  {
    id: 'todo_review_openforge',
    title: 'Review OpenForge patch plan',
    description: 'Review generated patch plans before applying them.',
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

export const seedApprovalLiteRequests: readonly ApprovalLiteRecord[] = [
  {
    id: 'approval_openforge_apply',
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
