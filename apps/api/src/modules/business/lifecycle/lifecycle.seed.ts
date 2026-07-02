import type {
  BusinessAssignmentEventDto,
  BusinessLifecycleEventDto,
  BusinessPoolEntryDto,
} from './lifecycle.dto';

export const seedBusinessPoolEntries: readonly BusinessPoolEntryDto[] = [
  {
    id: 'business_pool_entry_acme_lead',
    tenantId: 'tenant_root',
    targetType: 'lead',
    targetId: 'sales_lead_acme_demo',
    displayName: 'Acme Retail / Ivy Chen',
    source: 'website',
    status: 'available',
    owner: 'admin',
    reason: 'Seed lead waiting for assignment.',
    duplicateKey: 'email:ivy.chen@example.com',
    duplicateCount: 0,
    createdAt: '2026-07-02T01:00:00.000Z',
    updatedAt: '2026-07-02T01:00:00.000Z',
  },
];

export const seedBusinessAssignmentEvents: readonly BusinessAssignmentEventDto[] =
  [
    {
      id: 'business_assignment_acme_enter_pool',
      tenantId: 'tenant_root',
      targetType: 'lead',
      targetId: 'sales_lead_acme_demo',
      action: 'enter_pool',
      fromOwner: 'admin',
      actor: 'system',
      reason: 'Seed lead waiting for assignment.',
      poolEntryId: 'business_pool_entry_acme_lead',
      createdAt: '2026-07-02T01:00:00.000Z',
    },
    {
      id: 'business_assignment_northstar_owner',
      tenantId: 'tenant_root',
      targetType: 'customer',
      targetId: 'business_customer_northstar',
      action: 'assign',
      fromOwner: 'ops',
      toOwner: 'admin',
      actor: 'system',
      reason: 'Seed customer ownership alignment.',
      createdAt: '2026-06-30T00:25:00.000Z',
    },
  ];

export const seedBusinessLifecycleEvents: readonly BusinessLifecycleEventDto[] =
  [
    {
      id: 'business_lifecycle_northstar_in_progress',
      tenantId: 'tenant_root',
      customerId: 'business_customer_northstar',
      fromStage: 'potential',
      toStage: 'in_progress',
      reason: 'Seed customer is already in active follow-up.',
      actor: 'system',
      detail: { source: 'seed' },
      createdAt: '2026-06-30T00:20:00.000Z',
    },
    {
      id: 'business_lifecycle_northstar_fulfillment',
      tenantId: 'tenant_root',
      customerId: 'business_customer_northstar',
      fromStage: 'in_progress',
      toStage: 'fulfillment',
      reason: 'Active contract created for rollout delivery.',
      actor: 'system',
      detail: { contractId: 'business_contract_northstar_rollout' },
      createdAt: '2026-07-02T00:00:00.000Z',
    },
  ];
