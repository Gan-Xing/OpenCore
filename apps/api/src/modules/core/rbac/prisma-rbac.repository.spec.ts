import { PrismaService } from '../../../platform/database/prisma.service';
import { AuthService } from './auth.service';
import { PrismaRbacRepository } from './prisma-rbac.repository';

describe('PrismaRbacRepository integration', () => {
  const prisma = new PrismaService();
  const repository = new PrismaRbacRepository(prisma);
  const authService = new AuthService(repository);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads seeded Role.code and Permission.code values from PostgreSQL', async () => {
    await expect(repository.listRoles()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'admin' }),
        expect.objectContaining({ code: 'viewer' }),
      ]),
    );

    await expect(repository.listPermissions()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'core:user:read' }),
        expect.objectContaining({ code: 'core:role:read' }),
        expect.objectContaining({ code: 'core:permission:read' }),
        expect.objectContaining({ code: 'core:menu:read' }),
      ]),
    );
  });

  it('traces seeded menus to database permission codes', async () => {
    const permissionCodes = new Set(
      (await repository.listPermissions()).map((permission) => permission.code),
    );

    for (const menu of await repository.listMenus()) {
      if (menu.permissionCode) {
        expect(permissionCodes.has(menu.permissionCode)).toBe(true);
      }
    }
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
});
