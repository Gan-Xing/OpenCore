import {
  collectMenus,
  collectPermissionDefinitions,
  collectPermissionCodes,
} from '@opencore/module-registry';
import { hashPassword } from './rbac.password';

export type SeedUser = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  enabled: boolean;
};

export type SeedRole = {
  id: string;
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system: boolean;
};

export const seedPermissions = collectPermissionDefinitions().map(
  (permission) => ({
    code: permission.code,
    title: permission.title,
    stage: permission.stage,
    dangerous: permission.dangerous ?? false,
  }),
);

export const seedMenus = collectMenus().map((menu) => ({
  key: menu.key,
  title: menu.title,
  path: menu.path,
  permissionCode: menu.permissionCode,
  stage: menu.stage,
  order: menu.order,
}));

export const seedRoles: readonly SeedRole[] = [
  {
    id: 'role_admin',
    code: 'admin',
    name: 'Administrator',
    permissionCodes: collectPermissionCodes(),
    system: true,
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
  },
];

export const seedUsers: readonly SeedUser[] = [
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'OpenCore Admin',
    passwordHash: hashPassword('admin123'),
    roleCodes: ['admin'],
    enabled: true,
  },
];
