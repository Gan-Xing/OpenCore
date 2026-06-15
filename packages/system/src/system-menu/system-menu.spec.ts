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
          key: 'system',
          type: 'directory',
          icon: 'SettingOutlined',
          status: 'enabled',
        }),
        expect.objectContaining({
          key: 'system.menus',
          parentKey: 'system',
          component: 'System/Menus',
          permissionCode: 'core:menu:read',
        }),
      ]),
    );

    const menu = await service.createMenu({
      key: 'system.examples',
      parentKey: 'system',
      title: 'Examples',
      type: 'menu',
      path: '/system/examples',
      icon: 'AppstoreOutlined',
      component: 'System/Examples',
      permissionCode: 'core:menu:read',
      order: 999,
      status: 'enabled',
      cache: true,
    });

    expect(menu).toMatchObject({
      key: 'system.examples',
      parentKey: 'system',
      type: 'menu',
      component: 'System/Examples',
      permissionCode: 'core:menu:read',
      stage: 'S6',
      cache: true,
      hidden: false,
    });
    await expect(service.getMenu('system.examples')).resolves.toMatchObject({
      key: 'system.examples',
      title: 'Examples',
      parentKey: 'system',
      permissionCode: 'core:menu:read',
    });
    const updatedMenu = await service.updateMenu('system.examples', {
      parentKey: null,
      icon: null,
      component: null,
      permissionCode: null,
      status: 'disabled',
      title: 'Example Menus',
    });

    expect(updatedMenu).toMatchObject({
      key: 'system.examples',
      title: 'Example Menus',
      status: 'disabled',
    });
    expect(updatedMenu.parentKey).toBeUndefined();
    expect(updatedMenu.icon).toBeUndefined();
    expect(updatedMenu.component).toBeUndefined();
    expect(updatedMenu.permissionCode).toBeUndefined();
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-menus.csv',
      scope: 'current-page',
      columns: expect.arrayContaining([
        'key',
        'parentKey',
        'type',
        'component',
        'status',
        'cache',
        'hidden',
      ]),
    });
    await expect(service.deleteMenu('system.examples')).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects invalid menu keys, paths and order values', async () => {
    const service = new SystemMenuService(new SeedSystemMenuRepository());

    await expectHttpExceptionCode(
      service.createMenu({
        key: 'Invalid Key',
        title: 'Invalid',
        path: '/invalid',
        order: 1,
      }),
      'SYSTEM_MENU_KEY_INVALID',
    );
    await expectHttpExceptionCode(
      service.createMenu({
        key: 'system.invalid',
        title: 'Invalid',
        path: 'system/invalid',
        order: 1,
      }),
      'SYSTEM_MENU_PATH_INVALID',
    );
    await expectHttpExceptionCode(
      service.createMenu({
        key: 'system.invalid',
        title: 'Invalid',
        path: '/system/invalid',
        order: -1,
      }),
      'SYSTEM_MENU_ORDER_INVALID',
    );
    await expectHttpExceptionCode(
      service.createMenu({
        key: 'system.invalid',
        parentKey: 'system.invalid',
        title: 'Invalid',
        path: '/system/invalid',
        order: 1,
      }),
      'SYSTEM_MENU_PARENT_SELF',
    );
  });

  it('protects seeded menu tree structure from cycles and parent deletes', async () => {
    const service = new SystemMenuService(new SeedSystemMenuRepository());

    await service.createMenu({
      key: 'system.examples',
      parentKey: 'system',
      title: 'Examples',
      path: '/system/examples',
      order: 999,
    });
    await service.createMenu({
      key: 'system.examples.child',
      parentKey: 'system.examples',
      title: 'Example Child',
      path: '/system/examples/child',
      order: 1000,
    });

    await expectHttpExceptionCode(
      service.updateMenu('system.examples', {
        parentKey: 'system.examples.child',
      }),
      'SYSTEM_MENU_PARENT_CYCLE',
    );
    await expectHttpExceptionCode(
      service.deleteMenu('system.examples'),
      'SYSTEM_MENU_HAS_CHILDREN',
    );
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
        parentKey: 'system',
        title: 'Prisma Test Menu',
        type: 'menu',
        path: '/system/test-menu',
        icon: 'AppstoreOutlined',
        component: 'System/TestMenu',
        permissionCode: 'core:menu:read',
        order: 998,
        status: 'enabled',
        cache: true,
      });

      expect(menu).toMatchObject({
        key,
        parentKey: 'system',
        component: 'System/TestMenu',
        permissionCode: 'core:menu:read',
        cache: true,
      });
      await expect(service.getMenu(key)).resolves.toMatchObject({
        key,
        title: 'Prisma Test Menu',
        parentKey: 'system',
        permissionCode: 'core:menu:read',
      });
      await expect(
        service.updateMenu(key, {
          parentKey: null,
          component: 'System/UpdatedTestMenu',
          permissionCode: 'core:dashboard:read',
          status: 'disabled',
          title: 'Updated Prisma Test Menu',
        }),
      ).resolves.toMatchObject({
        title: 'Updated Prisma Test Menu',
        parentKey: undefined,
        component: 'System/UpdatedTestMenu',
        permissionCode: 'core:dashboard:read',
        status: 'disabled',
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
