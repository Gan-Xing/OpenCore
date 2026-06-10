import { createRbacClient, type SdkRequest } from './rbac-client';

describe('createRbacClient', () => {
  it('uses stable S6 RBAC API paths', async () => {
    const calls: string[] = [];
    const request: SdkRequest = async (path) => {
      calls.push(path);
      return [] as never;
    };
    const client = createRbacClient(request);

    await client.listUsers('token');
    await client.listRoles('token');
    await client.listPermissions('token');
    await client.listMenus('token');

    expect(calls).toEqual([
      '/core/users',
      '/core/roles',
      '/core/permissions',
      '/core/menus',
    ]);
  });
});
