import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemMenuRepository } from './system-menu.prisma-repository';
import { SeedSystemMenuRepository } from './system-menu.seed-repository';
import { SystemMenuService } from './system-menu.service';

describe('@opencore/system system-menu', () => {
  it('supports seeded menu CRUD and export previews', async () => {
    const service = new SystemMenuService(new SeedSystemMenuRepository());

    await expect(service.listMenus()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'system.menus',
          permissionCode: 'core:menu:read',
        }),
      ]),
    );

    const menu = await service.createMenu({
      key: 'system.examples',
      title: 'Examples',
      path: '/system/examples',
      permissionCode: 'core:menu:read',
      order: 999,
    });

    expect(menu).toMatchObject({
      key: 'system.examples',
      permissionCode: 'core:menu:read',
      stage: 'S6',
    });
    const updatedMenu = await service.updateMenu('system.examples', {
      permissionCode: null,
      title: 'Example Menus',
    });

    expect(updatedMenu).toMatchObject({
      key: 'system.examples',
      title: 'Example Menus',
    });
    expect(updatedMenu.permissionCode).toBeUndefined();
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-menus.csv',
      scope: 'current-page',
      columns: ['key', 'title', 'path', 'permissionCode', 'order'],
    });
    await expect(service.deleteMenu('system.examples')).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects invalid menu keys, paths and order values', async () => {
    const service = new SystemMenuService(new SeedSystemMenuRepository());

    await expect(
      service.createMenu({
        key: 'Invalid Key',
        title: 'Invalid',
        path: '/invalid',
        order: 1,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createMenu({
        key: 'system.invalid',
        title: 'Invalid',
        path: 'system/invalid',
        order: 1,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createMenu({
        key: 'system.invalid',
        title: 'Invalid',
        path: '/system/invalid',
        order: -1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSystemMenuRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemMenuService(
      new PrismaSystemMenuRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const key = `system.test_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded menus from PostgreSQL and traces permission codes', async () => {
      const menus = await service.listMenus();
      const permissionCodes = new Set(
        (
          await prisma.permission.findMany({
            select: { code: true },
          })
        ).map((permission) => permission.code),
      );

      expect(menus).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'system.menus',
            permissionCode: 'core:menu:read',
          }),
        ]),
      );
      for (const menu of menus) {
        if (menu.permissionCode) {
          expect(permissionCodes.has(menu.permissionCode)).toBe(true);
        }
      }
    });

    it('persists menu CRUD through Prisma', async () => {
      const menu = await service.createMenu({
        key,
        title: 'Prisma Test Menu',
        path: '/system/test-menu',
        permissionCode: 'core:menu:read',
        order: 998,
      });

      expect(menu).toMatchObject({
        key,
        permissionCode: 'core:menu:read',
      });
      await expect(
        service.updateMenu(key, {
          permissionCode: 'core:dashboard:read',
          title: 'Updated Prisma Test Menu',
        }),
      ).resolves.toMatchObject({
        title: 'Updated Prisma Test Menu',
        permissionCode: 'core:dashboard:read',
      });
      await expect(service.deleteMenu(key)).resolves.toEqual({
        deleted: true,
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.menu.deleteMany({
        where: { key },
      });
    }
  });
});
