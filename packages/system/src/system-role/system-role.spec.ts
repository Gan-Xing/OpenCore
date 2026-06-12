import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemMenuRepository } from '../system-menu/system-menu.prisma-repository';
import { SeedSystemMenuRepository } from '../system-menu/system-menu.seed-repository';
import { SystemMenuService } from '../system-menu/system-menu.service';
import { PrismaSystemRoleRepository } from './system-role.prisma-repository';
import { SeedSystemRoleRepository } from './system-role.seed-repository';
import { SystemRoleService } from './system-role.service';

describe('@opencore/system system-role', () => {
  it('supports seeded role CRUD and export previews', async () => {
    const service = createSeedRoleService();

    await expect(service.listRoles()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'admin',
          system: true,
          enabled: true,
          dataScope: 'all',
        }),
        expect.objectContaining({
          code: 'viewer',
          enabled: true,
          permissionCodes: expect.arrayContaining(['core:role:read']),
          dataScope: 'self',
        }),
      ]),
    );

    const role = await service.createRole({
      code: 'operator',
      name: 'Operator',
      permissionCodes: ['core:user:read', 'core:role:read'],
      dataScope: 'custom',
      dataScopeDeptIds: ['dept_operations'],
    });

    expect(role).toMatchObject({
      code: 'operator',
      enabled: true,
      permissionCodes: ['core:role:read', 'core:user:read'],
      system: false,
      dataScope: 'custom',
      dataScopeDeptIds: ['dept_operations'],
    });
    await expect(service.getRole('operator')).resolves.toMatchObject({
      code: 'operator',
      name: 'Operator',
      dataScope: 'custom',
      dataScopeDeptIds: ['dept_operations'],
    });
    await expect(
      service.updateRole('operator', {
        name: 'Operations',
        permissionCodes: ['core:dashboard:read'],
        dataScope: 'own_dept',
      }),
    ).resolves.toMatchObject({
      name: 'Operations',
      permissionCodes: ['core:dashboard:read'],
      dataScope: 'own_dept',
      dataScopeDeptIds: [],
    });
    await expect(
      service.setRoleStatus('operator', { enabled: false }),
    ).resolves.toMatchObject({
      code: 'operator',
      enabled: false,
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-roles.csv',
      scope: 'current-page',
      columns: [
        'code',
        'name',
        'permissionCodes',
        'enabled',
        'system',
        'dataScope',
        'dataScopeDeptIds',
      ],
    });
    await expect(service.deleteRole('operator')).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects invalid role codes, duplicated permission codes and bad status payloads', async () => {
    const service = createSeedRoleService();

    await expect(
      service.createRole({
        code: 'Invalid Code',
        name: 'Invalid',
        permissionCodes: [],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createRole({
        code: 'duplicate_permissions',
        name: 'Duplicate Permissions',
        permissionCodes: ['core:user:read', 'core:user:read'],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createRole({
        code: 'custom_without_dept',
        name: 'Custom Without Dept',
        permissionCodes: ['core:user:read'],
        dataScope: 'custom',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createRole({
        code: 'duplicate_depts',
        name: 'Duplicate Depts',
        permissionCodes: ['core:user:read'],
        dataScope: 'custom',
        dataScopeDeptIds: ['dept_operations', 'dept_operations'],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.setRoleStatus('viewer', { enabled: 'false' as never }),
    ).rejects.toThrow(BadRequestException);
  });

  it('protects system roles from deletion, system demotion and status disable', async () => {
    const service = createSeedRoleService();

    await expect(service.deleteRole('admin')).rejects.toThrow(
      'System roles cannot be deleted.',
    );
    await expect(
      service.updateRole('viewer', { system: false }),
    ).resolves.toEqual(
      expect.objectContaining({
        code: 'viewer',
        system: true,
      }),
    );
    await expect(
      service.setRoleStatus('viewer', { enabled: false }),
    ).rejects.toThrow('System roles cannot be disabled.');
  });

  it('assigns role menus while preserving non-menu permissions', async () => {
    const service = createSeedRoleService();
    await service.createRole({
      code: 'menu_operator',
      name: 'Menu Operator',
      permissionCodes: ['core:dashboard:read', 'core:role:update'],
      dataScope: 'self',
    });

    const assignment = await service.assignRoleMenus('menu_operator', {
      menuKeys: ['system.users', 'system.roles'],
    });

    expect(assignment).toMatchObject({
      roleCode: 'menu_operator',
      menuKeys: ['system.roles', 'system.users'],
      permissionCodes: ['core:role:read', 'core:user:read'],
      preservedPermissionCodes: ['core:role:update'],
    });
    await expect(service.getRole('menu_operator')).resolves.toMatchObject({
      permissionCodes: ['core:role:read', 'core:role:update', 'core:user:read'],
    });
    await expect(
      service.assignRoleMenus('menu_operator', {
        menuKeys: ['system.missing'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSystemRoleRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemRoleService(
      new PrismaSystemRoleRepository(prisma),
      new SystemMenuService(new PrismaSystemMenuRepository(prisma)),
    );
    const testRunId = randomUUID().slice(0, 8);
    const code = `role_${testRunId}`;
    const username = `role_user_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded roles from PostgreSQL and traces permission codes', async () => {
      const roles = await service.listRoles();
      const permissionCodes = new Set(
        (
          await prisma.permission.findMany({
            select: { code: true },
          })
        ).map((permission) => permission.code),
      );

      expect(roles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'admin',
            enabled: true,
            system: true,
          }),
          expect.objectContaining({
            code: 'viewer',
            enabled: true,
            system: true,
          }),
        ]),
      );
      for (const role of roles) {
        for (const permissionCode of role.permissionCodes) {
          expect(permissionCodes.has(permissionCode)).toBe(true);
        }
      }
    });

    it('persists role CRUD through Prisma and unlinks users on delete', async () => {
      const role = await service.createRole({
        code,
        name: 'Prisma Test Role',
        permissionCodes: ['core:role:read'],
        dataScope: 'custom',
        dataScopeDeptIds: ['dept_operations'],
      });

      expect(role).toMatchObject({
        code,
        enabled: true,
        permissionCodes: ['core:role:read'],
        dataScope: 'custom',
        dataScopeDeptIds: ['dept_operations'],
      });
      await expect(service.getRole(code)).resolves.toMatchObject({
        code,
        name: 'Prisma Test Role',
        dataScope: 'custom',
        dataScopeDeptIds: ['dept_operations'],
      });
      await expect(
        service.updateRole(code, {
          name: 'Updated Prisma Test Role',
          permissionCodes: ['core:dashboard:read'],
          dataScope: 'self',
        }),
      ).resolves.toMatchObject({
        name: 'Updated Prisma Test Role',
        permissionCodes: ['core:dashboard:read'],
        dataScope: 'self',
        dataScopeDeptIds: [],
      });
      await expect(
        service.setRoleStatus(code, { enabled: false }),
      ).resolves.toMatchObject({
        code,
        enabled: false,
      });

      const persistedRole = await prisma.role.findUniqueOrThrow({
        where: { code },
      });
      const user = await prisma.user.create({
        data: {
          username,
          displayName: 'Role Test User',
          passwordHash: 'test-hash',
          roles: {
            create: {
              role: { connect: { id: persistedRole.id } },
            },
          },
        },
      });

      await expect(service.deleteRole(code)).resolves.toEqual({
        deleted: true,
      });
      await expect(
        prisma.userRole.count({
          where: { userId: user.id, roleId: persistedRole.id },
        }),
      ).resolves.toBe(0);
    });

    it('persists menu assignment through Prisma', async () => {
      await service.createRole({
        code,
        name: 'Prisma Menu Role',
        permissionCodes: ['core:dashboard:read', 'core:role:update'],
        dataScope: 'self',
      });

      await expect(
        service.assignRoleMenus(code, {
          menuKeys: ['system.users', 'system.roles'],
        }),
      ).resolves.toMatchObject({
        roleCode: code,
        menuKeys: ['system.roles', 'system.users'],
        permissionCodes: ['core:role:read', 'core:user:read'],
        preservedPermissionCodes: ['core:role:update'],
      });
      await expect(service.getRole(code)).resolves.toMatchObject({
        permissionCodes: [
          'core:role:read',
          'core:role:update',
          'core:user:read',
        ],
      });
    });

    it('protects seeded system roles in PostgreSQL', async () => {
      await expect(service.deleteRole('admin')).rejects.toThrow(
        'System roles cannot be deleted.',
      );
    });

    async function cleanupTestRows(): Promise<void> {
      const roles = await prisma.role.findMany({
        where: { code },
        select: { id: true },
      });
      const roleIds = roles.map((role) => role.id);

      await prisma.userRole.deleteMany({
        where: { user: { username } },
      });
      if (roleIds.length > 0) {
        await prisma.userRole.deleteMany({
          where: { roleId: { in: roleIds } },
        });
        await prisma.rolePermission.deleteMany({
          where: { roleId: { in: roleIds } },
        });
      }
      await prisma.user.deleteMany({
        where: { username },
      });
      await prisma.role.deleteMany({
        where: { code },
      });
    }
  });
});

function createSeedRoleService(): SystemRoleService {
  return new SystemRoleService(
    new SeedSystemRoleRepository(),
    new SystemMenuService(new SeedSystemMenuRepository()),
  );
}
