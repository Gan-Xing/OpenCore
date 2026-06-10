import { RbacRepository } from './rbac.repository';

describe('RbacRepository', () => {
  const repository = new RbacRepository();

  it('keeps Role.code and Permission.code as stable RBAC identities', () => {
    expect(repository.listRoles().map((role) => role.code)).toEqual(
      expect.arrayContaining(['admin', 'viewer']),
    );
    expect(
      repository.listPermissions().map((permission) => permission.code),
    ).toEqual(
      expect.arrayContaining([
        'core:user:read',
        'core:role:read',
        'core:permission:read',
        'core:menu:read',
      ]),
    );
  });

  it('traces every registered menu permission to a permission code', () => {
    const permissionCodes = new Set(
      repository.listPermissions().map((permission) => permission.code),
    );

    for (const menu of repository.listMenus()) {
      if (menu.permissionCode) {
        expect(permissionCodes.has(menu.permissionCode)).toBe(true);
      }
    }
  });
});
