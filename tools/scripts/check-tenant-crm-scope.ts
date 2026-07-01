import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'docs/quality-cycle/cycle-027/admission.md',
    markers: [
      '`business.core`',
      '`CrmLead`',
      '`CrmCustomer`',
      '`CrmOpportunity`',
      'Cross-tenant read/write/update/delete attempts',
      '`pnpm release:gate`',
    ],
  },
  {
    file: 'docs/quality-cycle/cycle-027/backlog.md',
    markers: [
      'Prisma CRM models',
      'NestJS CRM API',
      'SDK client/types',
      'Admin CRM pages',
      'Typed smoke and tenant guard',
      'Full validation',
    ],
  },
  {
    file: 'prisma/schema.prisma',
    markers: [
      'crmTags                CrmTag[]',
      'crmLeads               CrmLead[]',
      'crmCustomers           CrmCustomer[]',
      'crmContacts            CrmContact[]',
      'crmOpportunities       CrmOpportunity[]',
      'crmFollowUps           CrmFollowUp[]',
      'crmTasks               CrmTask[]',
      'crmAttachments         CrmAttachment[]',
      'crmOwnerTransfers      CrmOwnerTransfer[]',
      'crmAuditEvents         CrmAuditEvent[]',
      'model CrmTag',
      'model CrmLead',
      'model CrmCustomer',
      'model CrmContact',
      'model CrmOpportunity',
      'model CrmFollowUp',
      'model CrmTask',
      'model CrmAttachment',
      'model CrmOwnerTransfer',
      'model CrmAuditEvent',
      '@@unique([tenantId, id])',
      '@@unique([tenantId, number])',
      '@@index([tenantId, targetType, targetId',
    ],
  },
  {
    file: 'prisma/migrations/20260630120000_add_crm_core/migration.sql',
    markers: [
      'CREATE TABLE "CrmTag"',
      'CREATE TABLE "CrmLead"',
      'CREATE TABLE "CrmCustomer"',
      'CREATE TABLE "CrmContact"',
      'CREATE TABLE "CrmOpportunity"',
      'CREATE TABLE "CrmFollowUp"',
      'CREATE TABLE "CrmTask"',
      'CREATE TABLE "CrmAttachment"',
      'CREATE TABLE "CrmOwnerTransfer"',
      'CREATE TABLE "CrmAuditEvent"',
      'CrmLead_tenantId_fkey',
      'CrmCustomer_tenantId_fkey',
      'CrmContact_tenantId_customerId_fkey',
      'CrmOpportunity_tenantId_customerId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/business/core/prisma-crm.repository.ts',
    markers: [
      'resolveCurrentTenantId',
      'const tenantId = resolveCurrentTenantId();',
      'tenantId_id: { tenantId, id }',
      'exportCrm',
      'convertLead',
      'transferLeadOwner',
      'transferCustomerOwner',
      'transferOpportunityOwner',
      'listActivities',
      'touchFollowUpTarget',
      'ensureTarget',
      'writeTransfer',
      'writeAudit',
    ],
  },
  {
    file: 'apps/api/src/modules/business/core/crm.controller.ts',
    markers: [
      "@Controller('business/core')",
      "@ApiTags('Business Core')",
      "RequirePermission('business:core:read')",
      "RequirePermission('business:core:create')",
      "RequirePermission('business:core:update')",
      "RequirePermission('business:core:assign')",
      "RequirePermission('business:core:comment')",
      "RequirePermission('business:core:export')",
      "RequirePermission('business:core:delete')",
    ],
  },
  {
    file: 'apps/api/src/modules/business/core/crm.seed.ts',
    markers: [
      'seedCrmTags',
      'seedCrmLeads',
      'seedCrmCustomers',
      'seedCrmContacts',
      'seedCrmOpportunities',
      'seedCrmFollowUps',
      'seedCrmTasks',
      'seedCrmAttachments',
      'seedCrmOwnerTransfers',
      'seedCrmAuditEvents',
    ],
  },
  {
    file: 'prisma/seed.ts',
    markers: ['seedCrm', 'crm: crmCount'],
  },
  {
    file: 'packages/module-registry/src/modules.ts',
    markers: [
      "code: 'business.core'",
      "apiTags: ['Business Core']",
      "'business:core:read'",
      "definePermissions('business', 'core'",
      "{ action: 'create', title: 'Create' }",
      "{ action: 'update', title: 'Update' }",
      "{ action: 'assign', title: 'Transfer owner for' }",
      "{ action: 'comment', title: 'Follow up' }",
      "{ action: 'export', title: 'Export' }",
      "{ action: 'delete', title: 'Archive', dangerous: true }",
      "path: '/business/overview'",
      "path: '/business/accounts'",
    ],
  },
  {
    file: 'packages/sdk/src/crm-client.ts',
    markers: [
      'createCrmClient',
      'getSummary',
      'exportCrm',
      'createLead',
      'convertLead',
      'createCustomer',
      'createContact',
      'createOpportunity',
      'createFollowUp',
      'createTask',
      'createAttachment',
      'listActivities',
      'listOwnerTransfers',
      'listAuditEvents',
    ],
  },
  {
    file: 'apps/admin/src/services/opencore/platform.ts',
    markers: [
      'createCrmClient',
      'getOpenCoreCrmSummary',
      'listOpenCoreCrmLeads',
      'createOpenCoreCrmLead',
      'convertOpenCoreCrmLead',
      'createOpenCoreCrmCustomer',
      'createOpenCoreCrmContact',
      'createOpenCoreCrmOpportunity',
      'createOpenCoreCrmFollowUp',
      'createOpenCoreCrmTask',
      'createOpenCoreCrmAttachment',
      'pageOpenCoreCrmActivities',
      'listOpenCoreCrmAuditEvents',
    ],
  },
  {
    file: 'apps/admin/src/pages/Business/components/BusinessWorkspace.tsx',
    markers: [
      'BUSINESS_ROUTE_PATHS',
      'getOpenCoreCrmSummary',
      'CurrentPageExportButton',
      'ReadOnlyDetailDrawer',
      'loadCrm',
      'openCreate',
      'openEdit',
      'openAction',
      'submitEntity',
      'submitAction',
      'canCreateBusiness',
      'canAssignBusiness',
      'canCommentBusiness',
      'canExportBusiness',
      'canDeleteBusiness',
    ],
  },
  {
    file: 'apps/admin/config/routes.ts',
    markers: [
      "path: '/business/leads'",
      "path: '/business/accounts'",
      'canReadBusiness',
    ],
  },
  {
    file: 'apps/admin/src/access.ts',
    markers: [
      'canReadBusiness',
      'canCreateBusiness',
      'canUpdateBusiness',
      'canAssignBusiness',
      'canCommentBusiness',
      'canExportBusiness',
      'canDeleteBusiness',
    ],
  },
  {
    file: 'tools/smoke/runtime.ts',
    markers: ['createCrmClient', 'satisfies CrmClient'],
  },
  {
    file: 'tools/smoke/smoke-core-crm.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantCrmHidden',
      'assertForeignTenantCrmPreserved',
      'crm.foreign-hidden',
      'crm.lead-conversion',
      'crm.follow-up-task-attachment',
      'crm.owner-transfer',
      'crm.export',
      'crm.audit',
      'crm.archive',
    ],
  },
  {
    file: 'tools/scripts/run-local-api-smoke.sh',
    markers: ['smoke-core-crm.ts'],
  },
  {
    file: 'tools/scripts/release-readiness-gate.sh',
    markers: ['guard:tenant-crm-scope'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-crm-scope', 'smoke:core-crm'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant CRM marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant CRM scope guard passed.');
