import type {
  CrmAttachmentDto,
  CrmAuditEventDto,
  CrmContactDto,
  CrmCustomerDto,
  CrmFollowUpDto,
  CrmLeadDto,
  CrmOpportunityDto,
  CrmOwnerTransferDto,
  CrmTagDto,
  CrmTaskDto,
} from './crm.dto';

export const seedCrmTags: readonly CrmTagDto[] = [
  {
    id: 'crm_tag_key_account',
    tenantId: 'tenant_root',
    code: 'key-account',
    name: 'Key Account',
    color: 'blue',
    description: 'Strategic customer or high-value lead.',
    enabled: true,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
  },
  {
    id: 'crm_tag_expansion',
    tenantId: 'tenant_root',
    code: 'expansion',
    name: 'Expansion',
    color: 'green',
    description: 'Upsell or expansion-ready account.',
    enabled: true,
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
  },
];

export const seedCrmLeads: readonly CrmLeadDto[] = [
  {
    id: 'crm_lead_acme_demo',
    tenantId: 'tenant_root',
    number: 'LEAD-20260630-0001',
    name: 'Ivy Chen',
    company: 'Acme Retail',
    mobile: '+1-555-0101',
    email: 'ivy.chen@example.com',
    source: 'website',
    status: 'qualified',
    rating: 'hot',
    owner: 'admin',
    tags: ['key-account'],
    remark: 'Interested in OpenCore CRM and operations modules.',
    nextContactAt: '2026-07-02T09:00:00.000Z',
    lastFollowedAt: '2026-06-30T01:00:00.000Z',
    createdAt: '2026-06-30T00:10:00.000Z',
    updatedAt: '2026-06-30T01:00:00.000Z',
  },
];

export const seedCrmCustomers: readonly CrmCustomerDto[] = [
  {
    id: 'crm_customer_northstar',
    tenantId: 'tenant_root',
    number: 'CUS-20260630-0001',
    name: 'Northstar Manufacturing',
    owner: 'admin',
    status: 'active',
    level: 'enterprise',
    source: 'partner',
    industry: 'manufacturing',
    region: 'North America',
    website: 'https://northstar.example.com',
    phone: '+1-555-0200',
    email: 'ops@northstar.example.com',
    address: '100 Industrial Way',
    tags: ['key-account', 'expansion'],
    remark: 'Reference account for CRM smoke and demo data.',
    nextContactAt: '2026-07-03T10:00:00.000Z',
    lastFollowedAt: '2026-06-30T02:00:00.000Z',
    contactCount: 1,
    opportunityCount: 1,
    createdAt: '2026-06-30T00:20:00.000Z',
    updatedAt: '2026-06-30T02:00:00.000Z',
  },
];

export const seedCrmContacts: readonly CrmContactDto[] = [
  {
    id: 'crm_contact_northstar_mia',
    tenantId: 'tenant_root',
    customerId: 'crm_customer_northstar',
    customerName: 'Northstar Manufacturing',
    name: 'Mia Johnson',
    title: 'VP Operations',
    mobile: '+1-555-0201',
    email: 'mia.johnson@northstar.example.com',
    owner: 'admin',
    decisionRole: 'decision-maker',
    primary: true,
    remark: 'Primary business sponsor.',
    nextContactAt: '2026-07-03T10:00:00.000Z',
    lastFollowedAt: '2026-06-30T02:00:00.000Z',
    createdAt: '2026-06-30T00:30:00.000Z',
    updatedAt: '2026-06-30T02:00:00.000Z',
  },
];

export const seedCrmOpportunities: readonly CrmOpportunityDto[] = [
  {
    id: 'crm_opportunity_northstar_q3',
    tenantId: 'tenant_root',
    customerId: 'crm_customer_northstar',
    customerName: 'Northstar Manufacturing',
    number: 'OPP-20260630-0001',
    name: 'Northstar Q3 rollout',
    owner: 'admin',
    stage: 'proposal',
    amount: '68000.00',
    probability: 50,
    expectedCloseAt: '2026-08-15T00:00:00.000Z',
    tags: ['expansion'],
    remark: 'Commercial CRM rollout opportunity.',
    createdAt: '2026-06-30T00:40:00.000Z',
    updatedAt: '2026-06-30T00:40:00.000Z',
  },
];

export const seedCrmFollowUps: readonly CrmFollowUpDto[] = [
  {
    id: 'crm_followup_northstar_1',
    tenantId: 'tenant_root',
    targetType: 'customer',
    targetId: 'crm_customer_northstar',
    method: 'meeting',
    content: 'Reviewed rollout scope and success criteria.',
    outcome: 'Send proposal and confirm timeline.',
    nextContactAt: '2026-07-03T10:00:00.000Z',
    createdBy: 'admin',
    createdAt: '2026-06-30T02:00:00.000Z',
    updatedAt: '2026-06-30T02:00:00.000Z',
  },
];

export const seedCrmTasks: readonly CrmTaskDto[] = [
  {
    id: 'crm_task_northstar_followup',
    tenantId: 'tenant_root',
    targetType: 'opportunity',
    targetId: 'crm_opportunity_northstar_q3',
    title: 'Send commercial proposal',
    assignee: 'admin',
    status: 'open',
    priority: 'high',
    dueAt: '2026-07-03T10:00:00.000Z',
    remark: 'Include CRM, scheduler, and integration scope.',
    createdBy: 'admin',
    createdAt: '2026-06-30T02:05:00.000Z',
    updatedAt: '2026-06-30T02:05:00.000Z',
  },
];

export const seedCrmAttachments: readonly CrmAttachmentDto[] = [
  {
    id: 'crm_attachment_northstar_scope',
    tenantId: 'tenant_root',
    targetType: 'customer',
    targetId: 'crm_customer_northstar',
    originalName: 'northstar-scope.txt',
    mimeType: 'text/plain',
    sizeBytes: 256,
    storageKey: 'tenant/tenant_root/crm/northstar-scope.txt',
    uploadedBy: 'admin',
    createdAt: '2026-06-30T02:10:00.000Z',
    updatedAt: '2026-06-30T02:10:00.000Z',
  },
];

export const seedCrmOwnerTransfers: readonly CrmOwnerTransferDto[] = [
  {
    id: 'crm_transfer_northstar_seed',
    tenantId: 'tenant_root',
    targetType: 'customer',
    targetId: 'crm_customer_northstar',
    fromOwner: 'ops',
    toOwner: 'admin',
    actor: 'system',
    reason: 'Seed ownership alignment.',
    createdAt: '2026-06-30T00:25:00.000Z',
  },
];

export const seedCrmAuditEvents: readonly CrmAuditEventDto[] = [
  {
    id: 'crm_audit_northstar_seed',
    tenantId: 'tenant_root',
    targetType: 'customer',
    targetId: 'crm_customer_northstar',
    action: 'seed-customer',
    actor: 'system',
    detail: { source: 'seed' },
    createdAt: '2026-06-30T00:20:00.000Z',
  },
];
