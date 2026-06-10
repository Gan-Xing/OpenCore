import { SeedRbacRepository } from './seed-rbac.repository';

describe('SeedRbacRepository', () => {
  const repository = new SeedRbacRepository();

  it('keeps Role.code and Permission.code as stable RBAC identities', async () => {
    expect((await repository.listRoles()).map((role) => role.code)).toEqual(
      expect.arrayContaining(['admin', 'viewer']),
    );
    expect(
      (await repository.listPermissions()).map((permission) => permission.code),
    ).toEqual(
      expect.arrayContaining([
        'core:user:read',
        'core:role:read',
        'core:permission:read',
        'core:menu:read',
      ]),
    );
  });

  it('traces every registered menu permission to a permission code', async () => {
    const permissionCodes = new Set(
      (await repository.listPermissions()).map((permission) => permission.code),
    );

    for (const menu of await repository.listMenus()) {
      if (menu.permissionCode) {
        expect(permissionCodes.has(menu.permissionCode)).toBe(true);
      }
    }
  });
});
