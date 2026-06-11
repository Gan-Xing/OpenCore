import { SeedRbacRepository } from './seed-rbac.repository';

describe('SeedRbacRepository', () => {
  let repository: SeedRbacRepository;

  beforeEach(() => {
    repository = new SeedRbacRepository();
  });

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

  it('supports RBAC create update delete and export operations', async () => {
    await expect(
      repository.createPermission({
        code: 'core:example:read',
        title: 'Read examples',
      }),
    ).resolves.toMatchObject({
      code: 'core:example:read',
      stage: 'S6',
    });

    await expect(
      repository.createRole({
        code: 'operator',
        name: 'Operator',
        permissionCodes: ['core:example:read'],
      }),
    ).resolves.toMatchObject({
      code: 'operator',
      permissionCodes: ['core:example:read'],
      system: false,
    });

    await expect(
      repository.createUser({
        username: 'operator',
        displayName: 'Operations User',
        password: 'change-me',
        roleCodes: ['operator'],
      }),
    ).resolves.toMatchObject({
      username: 'operator',
      roleCodes: ['operator'],
      enabled: true,
    });

    const createdMenu = await repository.createMenu({
      key: 'system.examples',
      title: 'Examples',
      path: '/system/examples',
      permissionCode: 'core:example:read',
      order: 999,
    });
    expect(createdMenu).toMatchObject({
      key: 'system.examples',
      permissionCode: 'core:example:read',
    });

    await expect(
      repository.updateRole('operator', {
        name: 'Operations',
        permissionCodes: ['core:user:read'],
      }),
    ).resolves.toMatchObject({
      name: 'Operations',
      permissionCodes: ['core:user:read'],
    });

    await expect(
      repository.createExportPreview('users'),
    ).resolves.toMatchObject({
      filename: 'opencore-rbac-users.csv',
      scope: 'current-page',
      rowCount: expect.any(Number),
    });

    await expect(repository.deleteMenu('system.examples')).resolves.toEqual({
      deleted: true,
    });
    await expect(repository.deleteRole('operator')).resolves.toEqual({
      deleted: true,
    });
    await expect(
      repository.deletePermission('core:example:read'),
    ).resolves.toEqual({
      deleted: true,
    });
  });

  it('protects system roles from deletion', async () => {
    await expect(repository.deleteRole('admin')).rejects.toThrow(
      'System roles cannot be deleted.',
    );
  });
});
