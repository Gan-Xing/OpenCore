import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'packages/security/src/security-auth/security-auth.repository.ts',
    markers: [
      'roleCodes?: readonly string[]',
      'postCodes?: readonly string[]',
      'permissionCodes?: readonly string[]',
    ],
  },
  {
    file: 'packages/security/src/security-auth/security-auth.service.ts',
    markers: [
      'activeMembership?.roleCodes',
      'activeMembership?.postCodes',
      'activeMembership?.permissionCodes',
    ],
  },
  {
    file: 'packages/security/src/security-data-scope/security-data-scope.service.ts',
    markers: ['user.activeMembership?.id'],
  },
  {
    file: 'apps/api/src/modules/core/rbac/prisma-rbac.repository.ts',
    markers: [
      'permissionModuleCodeByCode',
      'toTenantMembershipRecord',
      'isPermissionEnabledForTenantPlan',
      'membership.roles',
      'membership.posts',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-tenant-rbac.ts',
    markers: ['postCodes', 'permissionCodes', 'activeMembership'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-rbac', 'smoke:core-tenant-rbac'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant RBAC marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant RBAC guard passed.');
