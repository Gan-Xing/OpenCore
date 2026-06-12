import { collectPermissionCodes } from '@opencore/module-registry';
import type { SecurityDataScopeType } from '@opencore/security';

export type SystemRoleRecord = {
  id: string;
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system: boolean;
  dataScope: SystemRoleDataScope;
  dataScopeDeptIds: readonly string[];
};

export const systemRoleDataScopeTypes = [
  'all',
  'custom',
  'dept_tree',
  'own_dept',
  'self',
] as const satisfies readonly SecurityDataScopeType[];

export type SystemRoleDataScope = (typeof systemRoleDataScopeTypes)[number];

export const seedSystemRolePermissionCodes: readonly string[] =
  collectPermissionCodes();

export const seedSystemRoles: readonly SystemRoleRecord[] = [
  {
    id: 'role_admin',
    code: 'admin',
    name: 'Administrator',
    permissionCodes: seedSystemRolePermissionCodes,
    system: true,
    dataScope: 'all',
    dataScopeDeptIds: [],
  },
  {
    id: 'role_viewer',
    code: 'viewer',
    name: 'Viewer',
    permissionCodes: [
      'core:dashboard:read',
      'tool:openapi:read',
      'core:user:read',
      'core:role:read',
      'core:permission:read',
      'core:menu:read',
    ],
    system: true,
    dataScope: 'self',
    dataScopeDeptIds: [],
  },
];
