import { SeedRbacRepository } from './seed-rbac.repository';

describe('SeedRbacRepository', () => {
  let repository: SeedRbacRepository;

  beforeEach(() => {
    repository = new SeedRbacRepository();
  });

  it('keeps Permission.code as a stable RBAC identity', async () => {
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

  it('supports RBAC permission create update delete and export operations', async () => {
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
      repository.updatePermission('core:example:read', {
        title: 'Read example records',
      }),
    ).resolves.toMatchObject({
      code: 'core:example:read',
      title: 'Read example records',
    });
    await expect(
      repository.createExportPreview('permissions'),
    ).resolves.toMatchObject({
      filename: 'opencore-rbac-permissions.csv',
      scope: 'current-page',
      rowCount: expect.any(Number),
    });
    await expect(
      repository.deletePermission('core:example:read'),
    ).resolves.toEqual({
      deleted: true,
    });
  });

  it('resolves seed data-scope profiles and dept descendants', async () => {
    await expect(
      repository.getDataScopeProfileForUser('user_admin'),
    ).resolves.toEqual({
      userId: 'user_admin',
      deptId: 'dept_headquarters',
      roles: [
        {
          roleCode: 'admin',
          dataScope: 'all',
          dataScopeDeptIds: [],
        },
      ],
    });
    await expect(
      repository.listDescendantDeptIds('dept_headquarters'),
    ).resolves.toEqual(['dept_engineering', 'dept_operations']);
  });
});
