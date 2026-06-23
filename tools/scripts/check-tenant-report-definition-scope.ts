import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'prisma/schema.prisma',
    markers: [
      'reportDefinitions      ReportDefinition[]',
      'tenantId    String   @default("tenant_root")',
      'tenant      Tenant',
      '@@unique([tenantId, code])',
      '@@index([tenantId, enabled, owner])',
    ],
  },
  {
    file: 'prisma/migrations/20260624063000_tenant_scoped_report_definitions/migration.sql',
    markers: [
      'UPDATE "ReportDefinition"',
      'ReportDefinition_tenantId_code_key',
      'ReportDefinition_tenantId_enabled_owner_idx',
      'ReportDefinition_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/monitor/operations/prisma-operations.repository.ts',
    markers: [
      'reportDefinition.findMany({ where: { tenantId } })',
      'where: { tenantId, enabled, owner: query.owner }',
      'findFirst({ where: { tenantId, code } })',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/monitor/operations/seed-operations.repository.ts',
    markers: [
      'getTenantReports',
      'report.tenantId === tenantId',
      'tenantId: resolveCurrentTenantId()',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-operations-reports.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantReportHidden',
      'assertForeignTenantReportPreserved',
      'operations.reports.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/Optional/Reports.tsx',
    markers: ['tenantId', 'pages.optional.reports.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/operations-types.ts',
    markers: ['tenantId: string', "tenantId: 'tenant_root'"],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-report-definition-scope',
      'smoke:core-operations-reports',
    ],
  },
  {
    file: 'tools/scripts/deploy-local-opencore.sh',
    markers: ['smoke-core-operations-reports.ts'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T7e', 'Report definitions scoped by active tenant'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant report definition marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant report definition scope guard passed.');
