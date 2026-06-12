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

    await client.listUsers('token');
    await client.exportUsers('token');
    await client.createUser('token', {
      username: 'operator',
      displayName: 'Operator',
      password: 'change-me',
      roleCodes: ['viewer'],
    });
    await client.updateUser('token', 'user_operator', { enabled: false });
    await client.deleteUser('token', 'user_operator');
    await client.listRoles('token');
    await client.exportRoles('token');
    await client.createRole('token', {
      code: 'operator',
      name: 'Operator',
      permissionCodes: ['core:user:read'],
    });
    await client.updateRole('token', 'operator', { name: 'Ops' });
    await client.deleteRole('token', 'operator');
    await client.listPermissions('token');
    await client.exportPermissions('token');
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
      { path: '/core/users', token: 'token' },
      { path: '/core/users/export', token: 'token' },
      { path: '/core/users', method: 'POST', token: 'token' },
      {
        path: '/core/users/user_operator',
        method: 'PATCH',
        token: 'token',
      },
      {
        path: '/core/users/user_operator',
        method: 'DELETE',
        token: 'token',
      },
      { path: '/core/roles', token: 'token' },
      { path: '/core/roles/export', token: 'token' },
      { path: '/core/roles', method: 'POST', token: 'token' },
      { path: '/core/roles/operator', method: 'PATCH', token: 'token' },
      { path: '/core/roles/operator', method: 'DELETE', token: 'token' },
      { path: '/core/permissions', token: 'token' },
      { path: '/core/permissions/export', token: 'token' },
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
