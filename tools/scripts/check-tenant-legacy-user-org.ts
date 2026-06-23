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
      'legacyDeptTenantId  String',
      '@relation(fields: [legacyDeptTenantId, deptId], references: [tenantId, id])',
      'model UserRole',
      'tenantId String @default("tenant_root")',
      '@relation(fields: [tenantId, roleId], references: [tenantId, id]',
      'model UserPost',
      '@relation(fields: [tenantId, postId], references: [tenantId, id]',
    ],
  },
  {
    file: 'prisma/migrations/20260624083000_root_only_legacy_user_org/migration.sql',
    markers: [
      'ADD COLUMN "legacyDeptTenantId"',
      'ADD COLUMN "tenantId"',
      '"User_legacyDeptTenantId_root_check"',
      '"UserRole_tenantId_root_check"',
      '"UserPost_tenantId_root_check"',
      '"User_legacyDeptTenantId_deptId_fkey"',
      '"UserRole_tenantId_roleId_fkey"',
      '"UserPost_tenantId_postId_fkey"',
    ],
  },
  {
    file: 'packages/system/src/system-user/system-user.prisma-repository.ts',
    markers: [
      'tenantId: ROOT_TENANT_ID',
      'where: { tenantId: ROOT_TENANT_ID, id: deptId }',
      'tenantId_code: {',
    ],
  },
  {
    file: 'apps/api/src/modules/core/tenant/tenant.service.ts',
    markers: [
      'tenantId: ROOT_TENANT_ID',
      'syncRootLegacyUser',
      'where: { id: nextDeptId, tenantId }',
    ],
  },
  {
    file: 'packages/system/src/system-user/system-user.spec.ts',
    markers: [
      'keeps legacy user org bridges root-only at the database boundary',
      'tenant_user_legacy_',
      'foreignRoleId',
      'foreignPostId',
      'foreignDeptId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-user.ts',
    markers: [
      'foreignLegacyDeptId',
      'core.user.legacy-dept.root-only',
      'SYSTEM_USER_DEPT_NOT_FOUND',
    ],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-legacy-user-org'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant legacy user org marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant legacy user org guard passed.');
