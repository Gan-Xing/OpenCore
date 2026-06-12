import { PrismaService } from '@opencore/database';
import { AuthService } from './auth.service';
import { PrismaRbacRepository } from './prisma-rbac.repository';

describe('PrismaRbacRepository integration', () => {
  const prisma = new PrismaService();
  const repository = new PrismaRbacRepository(prisma);
  const authService = new AuthService(repository);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads seeded Permission.code values from PostgreSQL', async () => {
    await expect(repository.listPermissions()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'core:user:read' }),
        expect.objectContaining({ code: 'core:role:read' }),
        expect.objectContaining({ code: 'core:permission:read' }),
        expect.objectContaining({ code: 'core:menu:read' }),
      ]),
    );
  });

  it('authenticates the seeded admin from PostgreSQL permissions', async () => {
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    expect(bootstrapPassword).toBeTruthy();

    const session = await authService.login('admin', bootstrapPassword ?? '');

    expect(session.user.roleCodes).toContain('admin');
    expect(session.user.permissionCodes).toEqual(
      expect.arrayContaining([
        'core:user:read',
        'core:role:read',
        'core:permission:read',
        'core:menu:read',
      ]),
    );
    await expect(
      authService.authenticateBearer(`Bearer ${session.accessToken}`),
    ).resolves.toMatchObject({
      username: 'admin',
      roleCodes: expect.arrayContaining(['admin']),
    });
  });

  it('resolves seeded admin data-scope from PostgreSQL', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
      select: { id: true },
    });

    await expect(
      repository.getDataScopeProfileForUser(admin.id),
    ).resolves.toEqual({
      userId: admin.id,
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
