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
    await expect(
      repository.getPermission('core:permission:read'),
    ).resolves.toEqual(
      expect.objectContaining({
        code: 'core:permission:read',
        system: true,
      }),
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
      system: false,
    });
    await expect(
      repository.getPermission('core:example:read'),
    ).resolves.toMatchObject({
      code: 'core:example:read',
      title: 'Read examples',
      system: false,
    });
    await expectHttpExceptionCode(
      repository.createPermission({
        code: 'core:example:read',
        title: 'Duplicate examples',
      }),
      'RBAC_PERMISSION_ALREADY_EXISTS',
    );

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

  it('protects registry permissions from mutation', async () => {
    await expectHttpExceptionCode(
      repository.updatePermission('core:permission:read', {
        title: 'Renamed',
      }),
      'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
    );
    await expectHttpExceptionCode(
      repository.deletePermission('core:permission:read'),
      'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
    );
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

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
