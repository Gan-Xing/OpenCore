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
      'loginLogs       LoginLog[]',
      'tenantId      String   @default("tenant_root")',
      '@@index([tenantId, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260623163000_tenant_scoped_login_logs/migration.sql',
    markers: [
      'UPDATE "LoginLog"',
      'LoginLog_tenantId_createdAt_idx',
      'LoginLog_tenantId_fkey',
    ],
  },
  {
    file: 'packages/audit/src/audit-login-log/audit-login-log.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId,',
      'findFirst',
      'where: { tenantId',
    ],
  },
  {
    file: 'packages/audit/src/audit-login-log/audit-login-log.spec.ts',
    markers: [
      'scopes Prisma login-log operations to the request tenant',
      'runWithRequestContext',
      'otherTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-login-log.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantHidden',
      'assertForeignLoginLogPreserved',
      'foreign tenant login log',
    ],
  },
  {
    file: 'apps/admin/src/pages/Security/LoginLogs.tsx',
    markers: ['pages.security.loginLogs.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/system-management-types.ts',
    markers: ['tenantId: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-login-log-scope', 'smoke:core-login-log'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4b', 'Login logs'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant login-log marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant login-log scope guard passed.');
