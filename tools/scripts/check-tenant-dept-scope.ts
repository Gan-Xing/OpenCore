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
      'depts           SystemDept[]',
      'tenant            Tenant',
      '@@unique([tenantId, code])',
      '@@unique([tenantId, id])',
      '@@index([tenantId, parentId, order])',
    ],
  },
  {
    file: 'prisma/migrations/20260623143000_tenant_scoped_departments/migration.sql',
    markers: [
      'UPDATE "SystemDept"',
      'CREATE UNIQUE INDEX "SystemDept_tenantId_code_key"',
      'SystemDept_tenantId_parentId_fkey',
      'TenantMembership_tenantId_deptId_fkey',
    ],
  },
  {
    file: 'packages/system/src/system-dept/system-dept.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId_code',
      'where: { tenantId',
    ],
  },
  {
    file: 'packages/system/src/system-user/system-user.prisma-repository.ts',
    markers: ['tenantId: ROOT_TENANT_ID', 'where: { tenantId: ROOT_TENANT_ID'],
  },
  {
    file: 'apps/api/src/modules/core/rbac/prisma-rbac.repository.ts',
    markers: ['getRequestContext', 'where: { tenantId }'],
  },
  {
    file: 'prisma/seed.ts',
    markers: ['tenantId: ROOT_TENANT_ID', 'tenantId_code'],
  },
  {
    file: 'tools/smoke/smoke-core-dept.ts',
    markers: ['active tenant code', 'tenantCode'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-dept-scope', 'smoke:core-tenant-dept'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant dept marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant dept scope guard passed.');
