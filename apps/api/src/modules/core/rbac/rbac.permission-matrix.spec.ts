import 'reflect-metadata';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRE_AUTHENTICATED_KEY,
} from './permissions.decorator';
import { AuthController } from './auth.controller';
import { RbacController } from './rbac.controller';

const expectedPermissions = {
  createMenu: ['core:menu:create'],
  createPermission: ['core:permission:create'],
  createRole: ['core:role:create'],
  createUser: ['core:user:create'],
  deleteMenu: ['core:menu:delete'],
  deletePermission: ['core:permission:delete'],
  deleteRole: ['core:role:delete'],
  deleteUser: ['core:user:delete'],
  exportMenus: ['core:menu:export'],
  exportPermissions: ['core:permission:export'],
  exportRoles: ['core:role:export'],
  exportUsers: ['core:user:export'],
  getMenu: ['core:menu:read'],
  getPermission: ['core:permission:read'],
  getRole: ['core:role:read'],
  getRoleMenuAssignment: ['core:role:read'],
  getRoleUserAssignment: ['core:role:read'],
  getUser: ['core:user:read'],
  listMenus: ['core:menu:read'],
  listPermissions: ['core:permission:read'],
  listRoles: ['core:role:read'],
  listUsers: ['core:user:read'],
  resetUserPassword: ['core:user:update'],
  setRoleStatus: ['core:role:update'],
  setUserStatus: ['core:user:update'],
  assignRoleMenus: ['core:role:update'],
  assignRoleUsers: ['core:role:update'],
  updateMenu: ['core:menu:update'],
  updatePermission: ['core:permission:update'],
  updateRole: ['core:role:update'],
  updateUser: ['core:user:update'],
} as const;

const expectedAuthenticatedOnly = [
  'getUserProfile',
  'updateUserProfile',
  'updateUserProfilePassword',
];

describe('RbacController permission matrix', () => {
  it('guards every S6 RBAC route with registry permission codes', () => {
    for (const [methodName, permissions] of Object.entries(
      expectedPermissions,
    )) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          RbacController.prototype[methodName as keyof RbacController],
        ),
      ).toEqual(permissions);
    }
  });

  it('keeps self-profile routes authenticated without management permissions', () => {
    for (const methodName of expectedAuthenticatedOnly) {
      expect(
        Reflect.getMetadata(
          REQUIRE_AUTHENTICATED_KEY,
          RbacController.prototype[methodName as keyof RbacController],
        ),
      ).toBe(true);
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          RbacController.prototype[methodName as keyof RbacController],
        ),
      ).toBeUndefined();
    }
  });
});

describe('AuthController permission matrix', () => {
  it('keeps auth/me authenticated without dashboard permission coupling', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTHENTICATED_KEY,
        AuthController.prototype.me,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        AuthController.prototype.me,
      ),
    ).toBeUndefined();
  });
});
