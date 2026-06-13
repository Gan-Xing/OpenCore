import { createRbacClient, type SdkRequest } from './rbac-client';

describe('createRbacClient', () => {
  it('uses stable S6 RBAC API paths and methods', async () => {
    const calls: Array<{ path: string; method?: string; token?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({
        path,
        method: options?.method,
        token: options?.token,
      });
      return {} as never;
    };
    const client = createRbacClient(request);

    await client.listUsers('token', { deptId: 'dept_operations' });
    await client.listUserOptions('token', { deptId: 'dept_operations' });
    await client.exportUsers('token', { deptId: 'dept_operations' });
    await client.getUserImportTemplate('token');
    await client.importUsers('token', {
      contentBase64: Buffer.from('username\noperator\n').toString('base64'),
      updateExisting: false,
    });
    await client.getUserProfile('token');
    await client.updateUserProfile('token', {
      displayName: 'Profile Name',
    });
    await client.updateUserAvatar('token', {
      originalName: 'avatar.png',
      mimeType: 'image/png',
      contentBase64: 'iVBORw0KGgo=',
    });
    await client.deleteUserAvatar('token');
    expect(client.getUserAvatarPath('user admin')).toBe(
      '/core/users/user%20admin/avatar',
    );
    await client.updateUserPassword('token', {
      oldPassword: 'old-password',
      newPassword: 'new-password',
    });
    await client.getUser('token', 'user_admin');
    await client.getUserRoleAssignment('token', 'user_operator');
    await client.assignUserRoles('token', 'user_operator', {
      roleCodes: ['viewer'],
    });
    await client.createUser('token', {
      username: 'operator',
      displayName: 'Operator',
      password: 'change-me',
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
      postCodes: ['engineer'],
    });
    await client.updateUser('token', 'user_operator', {
      deptId: null,
      enabled: false,
      postCodes: [],
    });
    await client.setUserStatus('token', 'user_operator', {
      enabled: true,
    });
    await client.setUsersStatus('token', {
      userIds: ['user_operator', 'user_viewer'],
      enabled: false,
    });
    await client.resetUserPassword('token', 'user_operator', {
      password: 'reset-password',
    });
    await client.deleteUser('token', 'user_operator');
    await client.deleteUsers('token', {
      userIds: ['user_operator', 'user_viewer'],
    });
    await client.listRoles('token');
    await client.exportRoles('token');
    await client.getRole('token', 'admin');
    await client.getRoleMenuAssignment('token', 'operator');
    await client.assignRoleMenus('token', 'operator', {
      menuKeys: ['system.users'],
    });
    await client.getRoleUserAssignment('token', 'operator');
    await client.assignRoleUsers('token', 'operator', {
      userIds: ['user_operator'],
    });
    await client.createRole('token', {
      code: 'operator',
      name: 'Operator',
      permissionCodes: ['core:user:read'],
      dataScope: 'self',
    });
    await client.updateRole('token', 'operator', { name: 'Ops' });
    await client.setRoleStatus('token', 'operator', { enabled: false });
    await client.deleteRole('token', 'operator');
    await client.listPermissions('token');
    await client.exportPermissions('token');
    await client.getPermission('token', 'core:permission:read');
    await client.createPermission('token', {
      code: 'core:example:read',
      title: 'Read examples',
    });
    await client.updatePermission('token', 'core:example:read', {
      title: 'Read example records',
    });
    await client.deletePermission('token', 'core:example:read');
    await client.listMenus('token');
    await client.exportMenus('token');
    await client.getMenu('token', 'system.menus');
    await client.createMenu('token', {
      key: 'system.examples',
      title: 'Examples',
      path: '/system/examples',
      permissionCode: 'core:example:read',
      order: 999,
    });
    await client.updateMenu('token', 'system.examples', {
      title: 'Example Records',
    });
    await client.deleteMenu('token', 'system.examples');

    expect(calls).toEqual([
      { path: '/core/users?deptId=dept_operations', token: 'token' },
      {
        path: '/core/users/simple-list?deptId=dept_operations',
        token: 'token',
      },
      { path: '/core/users/export?deptId=dept_operations', token: 'token' },
      { path: '/core/users/import-template', token: 'token' },
      {
        path: '/core/users/import',
        method: 'POST',
        token: 'token',
      },
      { path: '/core/users/profile', token: 'token' },
      {
        path: '/core/users/profile',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/users/profile/avatar',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/users/profile/avatar',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/users/profile/password',
        method: 'PATCH',
        token: 'token',
      },
      { path: '/core/users/user_admin', token: 'token' },
      { path: '/core/users/user_operator/roles', token: 'token' },
      {
        path: '/core/users/user_operator/roles',
        method: 'PATCH',
        token: 'token',
      },
      { path: '/core/users', method: 'POST', token: 'token' },
      {
        path: '/core/users/user_operator',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/users/user_operator/status',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/users/batch/status',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/users/user_operator/reset-password',
        method: 'POST',
        token: 'token',
      },
      {
        path: '/core/users/user_operator',
        method: 'DELETE',
        token: 'token',
      },
      {
        path: '/core/users/batch',
        method: 'DELETE',
        token: 'token',
      },
      { path: '/core/roles', token: 'token' },
      { path: '/core/roles/export', token: 'token' },
      { path: '/core/roles/admin', token: 'token' },
      { path: '/core/roles/operator/menus', token: 'token' },
      {
        path: '/core/roles/operator/menus',
        method: 'PATCH',
        token: 'token',
      },
      { path: '/core/roles/operator/users', token: 'token' },
      {
        path: '/core/roles/operator/users',
        method: 'PATCH',
        token: 'token',
      },
      { path: '/core/roles', method: 'POST', token: 'token' },
      { path: '/core/roles/operator', method: 'PATCH', token: 'token' },
      {
        path: '/core/roles/operator/status',
        method: 'PATCH',
        token: 'token',
      },
      { path: '/core/roles/operator', method: 'DELETE', token: 'token' },
      { path: '/core/permissions', token: 'token' },
      { path: '/core/permissions/export', token: 'token' },
      { path: '/core/permissions/core%3Apermission%3Aread', token: 'token' },
      { path: '/core/permissions', method: 'POST', token: 'token' },
      {
        path: '/core/permissions/core%3Aexample%3Aread',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/permissions/core%3Aexample%3Aread',
        method: 'DELETE',
        token: 'token',
      },
      { path: '/core/menus', token: 'token' },
      { path: '/core/menus/export', token: 'token' },
      { path: '/core/menus/system.menus', token: 'token' },
      { path: '/core/menus', method: 'POST', token: 'token' },
      {
        path: '/core/menus/system.examples',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/menus/system.examples',
        method: 'DELETE',
        token: 'token',
      },
    ]);
  });
});
