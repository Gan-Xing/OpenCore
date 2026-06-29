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
      'auditLogs              AuditLog[]',
      'tenantId      String   @default("tenant_root")',
      '@@index([tenantId, resource, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260623183000_tenant_scoped_operation_logs/migration.sql',
    markers: [
      'UPDATE "AuditLog"',
      'AuditLog_tenantId_createdAt_idx',
      'AuditLog_tenantId_fkey',
    ],
  },
  {
    file: 'packages/audit/src/audit-operation-log/audit-operation-log.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId,',
      'findFirst',
      'where: { tenantId',
    ],
  },
  {
    file: 'packages/audit/src/audit-operation-log/audit-operation-log.spec.ts',
    markers: [
      'scopes Prisma operation-log operations to the request tenant',
      'runWithRequestContext',
      'otherTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-audit-log.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantHidden',
      'assertForeignAuditLogPreserved',
      'foreign tenant audit log',
    ],
  },
  {
    file: 'apps/admin/src/pages/Security/OperationLogs.tsx',
    markers: ['pages.security.operationLogs.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/system-management-types.ts',
    markers: ['tenantId: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-operation-log-scope', 'smoke:core-audit-log'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4c', 'Operation audit logs'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant operation-log marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant operation-log scope guard passed.');
