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
      'tenant            Tenant',
      '@@unique([tenantId, code])',
      '@@unique([tenantId, id])',
      'roles           Role[]',
    ],
  },
  {
    file: 'prisma/migrations/20260623093000_tenant_scoped_roles/migration.sql',
    markers: [
      'UPDATE "Role"',
      'CREATE UNIQUE INDEX "Role_tenantId_code_key"',
      'TenantMembershipRole_tenantId_roleId_fkey',
    ],
  },
  {
    file: 'packages/system/src/system-role/system-role.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId_code',
      'where: { tenantId }',
    ],
  },
  {
    file: 'packages/system/src/system-user/system-user.prisma-repository.ts',
    markers: ['tenantId: ROOT_TENANT_ID', 'tenantId_code'],
  },
  {
    file: 'tools/smoke/smoke-core-tenant-role.ts',
    markers: ['core.tenant-role.create', 'core.tenant-role.delete'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-role-scope', 'smoke:core-tenant-role'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant role marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant role scope guard passed.');
