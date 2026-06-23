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
    file: 'apps/api/src/modules/core/rbac/rbac.controller.ts',
    markers: [
      'getMenuPlanScope(request)',
      'enabledModuleCodes: getAuthenticatedUser(request).enabledModuleCodes',
    ],
  },
  {
    file: 'packages/system/src/system-menu/system-menu.repository.ts',
    markers: [
      'filterSystemMenusByPlanScope',
      'menuModuleCodeByPermissionCode',
      'listModules()',
    ],
  },
  {
    file: 'packages/system/src/system-role/system-role.service.ts',
    markers: ['SystemMenuPlanScope', 'this.menus.listMenus(scope)'],
  },
  {
    file: 'tools/smoke/smoke-core-tenant-rbac.ts',
    markers: ['postCodes', 'permissionCodes', 'activeMembership'],
  },
  {
    file: 'tools/smoke/smoke-core-menu.ts',
    markers: [
      'core.menu.plan-scope-list',
      'core.menu.plan-scope-detail',
      'core.role.menu-plan-scope',
      'assertNoMenu(limitedMenus,',
    ],
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
