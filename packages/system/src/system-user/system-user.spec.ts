import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { hashSystemUserPassword } from './system-user.password';
import { PrismaSystemUserRepository } from './system-user.prisma-repository';
import { SeedSystemUserRepository } from './system-user.seed-repository';
import { SystemUserService } from './system-user.service';

describe('@opencore/system system-user', () => {
  it('supports seeded user CRUD and export previews', async () => {
    const service = new SystemUserService(new SeedSystemUserRepository());

    await expect(service.listUsers()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: 'admin',
          roleCodes: ['admin'],
          deptId: 'dept_headquarters',
          enabled: true,
        }),
      ]),
    );

    const user = await service.createUser({
      username: 'operator',
      displayName: 'Operations User',
      password: 'change-me',
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
    });

    expect(user).toMatchObject({
      id: 'user_operator',
      username: 'operator',
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
      enabled: true,
    });
    await expect(
      service.updateUser('user_operator', {
        displayName: 'Operations',
        roleCodes: ['admin'],
        deptId: null,
        enabled: false,
      }),
    ).resolves.toMatchObject({
      displayName: 'Operations',
      roleCodes: ['admin'],
      deptId: undefined,
      enabled: false,
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-users.csv',
      scope: 'current-page',
      columns: ['username', 'displayName', 'roleCodes', 'deptId', 'enabled'],
    });
    await expect(service.deleteUser('user_operator')).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects invalid usernames, duplicated role codes, and unknown roles', async () => {
    const service = new SystemUserService(new SeedSystemUserRepository());

    await expect(
      service.createUser({
        username: 'Invalid User',
        displayName: 'Invalid',
        password: 'change-me',
        roleCodes: [],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createUser({
        username: 'duplicate_roles',
        displayName: 'Duplicate Roles',
        password: 'change-me',
        roleCodes: ['viewer', 'viewer'],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createUser({
        username: 'unknown_role',
        displayName: 'Unknown Role',
        password: 'change-me',
        roleCodes: ['missing'],
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createUser({
        username: 'unknown_dept',
        displayName: 'Unknown Dept',
        password: 'change-me',
        roleCodes: ['viewer'],
        deptId: 'missing_dept',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('PrismaSystemUserRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemUserService(
      new PrismaSystemUserRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const username = `user_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded users from PostgreSQL with role assignments', async () => {
      await expect(service.listUsers()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            username: 'admin',
            roleCodes: expect.arrayContaining(['admin']),
            enabled: true,
          }),
        ]),
      );
    });

    it('persists user CRUD through Prisma and unlinks roles on delete', async () => {
      const user = await service.createUser({
        username,
        displayName: 'Prisma User',
        password: 'initial-password',
        roleCodes: ['viewer'],
        deptId: 'dept_operations',
      });

      expect(user).toMatchObject({
        username,
        roleCodes: ['viewer'],
        deptId: 'dept_operations',
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('initial-password'),
      });

      await expect(
        service.updateUser(user.id, {
          displayName: 'Updated Prisma User',
          password: 'updated-password',
          roleCodes: ['admin'],
          deptId: null,
          enabled: false,
        }),
      ).resolves.toMatchObject({
        displayName: 'Updated Prisma User',
        roleCodes: ['admin'],
        deptId: undefined,
        enabled: false,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('updated-password'),
      });

      await expect(service.deleteUser(user.id)).resolves.toEqual({
        deleted: true,
      });
      await expect(
        prisma.userRole.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.user.findUnique({ where: { id: user.id } }),
      ).resolves.toBeNull();
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.userRole.deleteMany({
        where: { user: { username } },
      });
      await prisma.user.deleteMany({
        where: { username },
      });
    }
  });
});
