import type {
  TicketAttachmentDto,
  TicketCategoryDto,
  TicketCommentDto,
  TicketDto,
  TicketTransitionDto,
} from './ticket.dto';

export type TicketCategoryRecord = TicketCategoryDto;
export type TicketRecord = TicketDto;
export type TicketCommentRecord = TicketCommentDto;
export type TicketTransitionRecord = TicketTransitionDto;
export type TicketAttachmentRecord = TicketAttachmentDto;

export const seedTicketCategories: readonly TicketCategoryRecord[] = [
  {
    id: 'ticket_cat_support',
    tenantId: 'tenant_root',
    code: 'support',
    name: 'Support',
    description: 'General support and internal service requests.',
    enabled: true,
    order: 10,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'ticket_cat_operations',
    tenantId: 'tenant_root',
    code: 'operations',
    name: 'Operations',
    description: 'Operational work orders and follow-up tasks.',
    enabled: true,
    order: 20,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
];

export const seedTicketComments: readonly TicketCommentRecord[] = [
  {
    id: 'ticket_comment_onboarding_access_1',
    tenantId: 'tenant_root',
    ticketId: 'ticket_onboarding_access',
    author: 'admin',
    body: 'Initial request captured from tenant onboarding.',
    createdAt: '2026-06-10T00:02:00.000Z',
    updatedAt: '2026-06-10T00:02:00.000Z',
  },
];

export const seedTicketTransitions: readonly TicketTransitionRecord[] = [
  {
    id: 'ticket_transition_onboarding_access_1',
    tenantId: 'tenant_root',
    ticketId: 'ticket_onboarding_access',
    toStatus: 'new',
    actor: 'system',
    comment: 'created',
    createdAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'ticket_transition_onboarding_access_2',
    tenantId: 'tenant_root',
    ticketId: 'ticket_onboarding_access',
    fromStatus: 'new',
    toStatus: 'processing',
    actor: 'admin',
    comment: 'triaged',
    createdAt: '2026-06-10T00:01:00.000Z',
  },
];

export const seedTicketAttachments: readonly TicketAttachmentRecord[] = [
  {
    id: 'ticket_attachment_onboarding_access_1',
    tenantId: 'tenant_root',
    ticketId: 'ticket_onboarding_access',
    originalName: 'onboarding-access.txt',
    mimeType: 'text/plain',
    sizeBytes: 128,
    storageKey: 'tenant/tenant_root/tickets/onboarding-access.txt',
    uploadedBy: 'admin',
    createdAt: '2026-06-10T00:03:00.000Z',
    updatedAt: '2026-06-10T00:03:00.000Z',
  },
];

export const seedTickets: readonly TicketRecord[] = [
  {
    id: 'ticket_onboarding_access',
    tenantId: 'tenant_root',
    number: 'TCK-20260610-0001',
    title: 'Tenant onboarding access',
    description: 'Provision and verify initial tenant workspace access.',
    status: 'processing',
    priority: 'high',
    categoryId: 'ticket_cat_support',
    createdBy: 'admin',
    assignee: 'ops',
    dueAt: '2026-06-20T00:00:00.000Z',
    firstRespondedAt: '2026-06-10T00:01:00.000Z',
    responseDueAt: '2026-06-10T08:00:00.000Z',
    resolutionDueAt: '2026-06-20T00:00:00.000Z',
    responseOverdue: false,
    resolutionOverdue: true,
    slaBreached: true,
    comments: seedTicketComments,
    transitions: seedTicketTransitions,
    attachments: seedTicketAttachments,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:03:00.000Z',
  },
];
