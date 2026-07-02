import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredChecks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'apps/api/src/modules/business/core/business-core.controller.ts',
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
      'listCustomers',
      'listContacts',
      'listFollowUps',
      'listTasks',
      'listAttachments',
      'listOwnerTransfers',
      'listAuditEvents',
    ],
  },
  {
    file: 'apps/api/src/modules/business/sales/sales.controller.ts',
    markers: [
      "@Controller('business/sales')",
      "@ApiTags('Business Sales')",
      "RequirePermission('business:sales:read')",
      "RequirePermission('business:sales:create')",
      "RequirePermission('business:sales:update')",
      "RequirePermission('business:sales:assign')",
      "RequirePermission('business:sales:export')",
      "RequirePermission('business:sales:delete')",
      "resource: 'business.sales'",
      'getSummary',
      'listLeads',
      'convertLead',
      'listOpportunities',
      'changeOpportunityStage',
    ],
  },
  {
    file: 'apps/api/src/app/app.module.ts',
    markers: [
      'BusinessCommerceModule',
      'BusinessCoreModule',
      'BusinessLifecycleModule',
      'SalesModule',
    ],
  },
  {
    file: 'apps/api/src/modules/business/commerce/commerce.controller.ts',
    markers: [
      "@Controller('business/commerce')",
      "@ApiTags('Business Commerce')",
      "RequirePermission('business:commerce:read')",
      "RequirePermission('business:commerce:create')",
      "RequirePermission('business:commerce:update')",
      "RequirePermission('business:commerce:export')",
      "RequirePermission('business:commerce:delete')",
      "resource: 'business.commerce'",
      'listProducts',
      'listQuotes',
      'submitQuote',
      'acceptQuote',
      'listContracts',
      'activateContract',
      'listReceivables',
      'recordReceivablePayment',
    ],
  },
  {
    file: 'packages/module-registry/src/modules.ts',
    markers: [
      "code: 'business.core'",
      "code: 'business.commerce'",
      "code: 'business.lifecycle'",
      "code: 'business.sales'",
      "apiTags: ['Business Core']",
      "apiTags: ['Business Commerce']",
      "apiTags: ['Business Lifecycle']",
      "apiTags: ['Business Sales']",
      "'business:core:read'",
      "'business:commerce:read'",
      "'business:lifecycle:read'",
      "'business:sales:read'",
      "path: '/business/accounts'",
      "path: '/business/leads'",
      "path: '/business/pool'",
      "path: '/business/lifecycle'",
      "path: '/business/opportunities'",
      "path: '/business/products'",
      "path: '/business/quotes'",
      "path: '/business/contracts'",
      "path: '/business/receivables'",
    ],
  },
  {
    file: 'packages/sdk/src/business-core-client.ts',
    markers: [
      'createBusinessCoreClient',
      'BusinessCoreClient',
      'exportBusinessCore',
      "'/business/core/customers'",
      "'/business/core/follow-ups'",
      "'/business/core/audit-events'",
    ],
  },
  {
    file: 'packages/sdk/src/business-commerce-client.ts',
    markers: [
      'createBusinessCommerceClient',
      'BusinessCommerceClient',
      'exportBusinessCommerce',
      "'/business/commerce/summary'",
      "'/business/commerce/products'",
      "'/business/commerce/quotes'",
      "'/business/commerce/contracts'",
      "'/business/commerce/receivables'",
    ],
  },
  {
    file: 'packages/sdk/src/business-lifecycle-client.ts',
    markers: [
      'createBusinessLifecycleClient',
      'BusinessLifecycleClient',
      'exportBusinessLifecycle',
      'transferPoolEntry',
      "'/business/lifecycle/summary'",
      "'/business/lifecycle/pool'",
      '}/transfer`',
      "'/business/lifecycle/customers'",
      "'/business/lifecycle/assignment-events'",
      "'/business/lifecycle/duplicates'",
    ],
  },
  {
    file: 'packages/sdk/src/business-sales-client.ts',
    markers: [
      'createBusinessSalesClient',
      'BusinessSalesClient',
      'exportBusinessSales',
      "'/business/sales/summary'",
      "'/business/sales/leads'",
      "'/business/sales/opportunities'",
    ],
  },
  {
    file: 'packages/sdk/src/index.ts',
    markers: [
      "export * from './business-core-client'",
      "export * from './business-core-types'",
      "export * from './business-commerce-client'",
      "export * from './business-commerce-types'",
      "export * from './business-lifecycle-client'",
      "export * from './business-lifecycle-types'",
      "export * from './business-sales-client'",
      "export * from './business-sales-types'",
    ],
  },
  {
    file: 'apps/admin/src/services/opencore/platform.ts',
    markers: [
      'createBusinessCommerceClient',
      'createBusinessCoreClient',
      'createBusinessLifecycleClient',
      'createBusinessSalesClient',
      'businessCommerceClient',
      'businessCoreClient',
      'businessLifecycleClient',
      'businessSalesClient',
      'getOpenCoreBusinessLifecycleSummary',
      'getOpenCoreBusinessCommerceSummary',
      'getOpenCoreBusinessSummary',
      'pageOpenCoreBusinessPoolEntries',
      'pageOpenCoreBusinessLifecycleCustomers',
      'transferOpenCoreBusinessPoolEntry',
      'pageOpenCoreBusinessLeads',
      'pageOpenCoreBusinessOpportunities',
      'pageOpenCoreBusinessProducts',
      'pageOpenCoreBusinessQuotes',
      'pageOpenCoreBusinessContracts',
      'pageOpenCoreBusinessReceivables',
      'exportBusinessCommerce',
      'exportBusinessLifecycle',
      'exportBusinessSales',
      'exportBusinessCore',
    ],
  },
  {
    file: 'apps/admin/config/routes.ts',
    markers: [
      "path: '/business/pool'",
      "path: '/business/lifecycle'",
      "component: './Business/pool'",
      "component: './Business/lifecycle'",
    ],
  },
  {
    file: 'apps/admin/src/pages/Business/components/LifecycleWorkspace.tsx',
    markers: [
      'LifecycleWorkspace',
      'pageOpenCoreBusinessPoolEntries',
      'pageOpenCoreBusinessLifecycleCustomers',
      'claimOpenCoreBusinessPoolEntry',
      'assignOpenCoreBusinessPoolEntry',
      'transferOpenCoreBusinessPoolEntry',
      'recycleOpenCoreBusinessPoolEntry',
      'changeOpenCoreBusinessCustomerLifecycleStage',
    ],
  },
  {
    file: 'apps/admin/src/access.ts',
    markers: [
      'business:core:read',
      'business:commerce:read',
      'business:lifecycle:read',
      'business:sales:read',
      'business:core:create',
      'business:commerce:create',
      'business:lifecycle:create',
      'business:sales:create',
      'business:core:export',
      'business:commerce:export',
      'business:lifecycle:export',
      'business:sales:export',
    ],
  },
  {
    file: 'tools/smoke/runtime.ts',
    markers: [
      'createBusinessCommerceClient',
      'createBusinessCoreClient',
      'createBusinessLifecycleClient',
      'createBusinessSalesClient',
      'businessCommerce',
      'businessCore',
      'businessLifecycle',
      'businessSales',
      'satisfies BusinessCommerceClient',
      'satisfies BusinessCoreClient',
      'satisfies BusinessLifecycleClient',
      'satisfies BusinessSalesClient',
    ],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-business-platform-scope',
      'smoke:business-core-sales',
      'smoke:business-commerce',
      'smoke:business-lifecycle',
      'smoke:admin-business-actions',
      'smoke:admin-business-i18n',
    ],
  },
];

const legacySegment = ['c', 'r', 'm'].join('');
const legacyPascal = `${legacySegment[0]?.toUpperCase() ?? ''}${legacySegment.slice(1)}`;

const forbiddenChecks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'packages/sdk/src/index.ts',
    markers: [`'./${legacySegment}-client'`, `'./${legacySegment}-types'`],
  },
  {
    file: 'tools/smoke/runtime.ts',
    markers: [
      `create${legacyPascal}Client`,
      `${legacyPascal}Client`,
      `clients.${legacySegment}`,
    ],
  },
  {
    file: 'package.json',
    markers: [
      `guard:tenant-${legacySegment}-scope`,
      `smoke:core-${legacySegment}`,
      `smoke:admin-${legacySegment}-actions`,
      `smoke:admin-${legacySegment}-i18n`,
    ],
  },
];

for (const check of requiredChecks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing business platform marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

for (const check of forbiddenChecks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const present = check.markers.filter((marker) => content.includes(marker));

  if (present.length > 0) {
    throw new Error(
      `${check.file} still contains legacy business compatibility marker(s): ${present.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant business platform scope guard passed.');
