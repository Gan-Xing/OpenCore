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
          postCodes: ['admin'],
          enabled: true,
          system: true,
        }),
      ]),
    );
    await expect(service.getUser('user_admin')).resolves.toMatchObject({
      id: 'user_admin',
      username: 'admin',
      system: true,
    });
    await expect(
      service.updateUser('user_admin', { displayName: 'Renamed Admin' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.deleteUser('user_admin')).rejects.toThrow(
      BadRequestException,
    );

    const user = await service.createUser({
      username: 'operator',
      displayName: 'Operations User',
      password: 'change-me',
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
      postCodes: ['engineer'],
    });

    expect(user).toMatchObject({
      id: 'user_operator',
      username: 'operator',
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
      postCodes: ['engineer'],
      enabled: true,
      system: false,
    });
    await expect(service.getUser(user.id)).resolves.toMatchObject({
      id: 'user_operator',
      system: false,
    });
    await expect(
      service.updateUser('user_operator', {
        displayName: 'Operations',
        roleCodes: ['admin'],
        deptId: null,
        postCodes: ['admin'],
        enabled: false,
      }),
    ).resolves.toMatchObject({
      displayName: 'Operations',
      roleCodes: ['admin'],
      deptId: undefined,
      postCodes: ['admin'],
      enabled: false,
    });
    await expect(
      service.setUserStatus('user_operator', { enabled: true }),
    ).resolves.toMatchObject({
      enabled: true,
    });
    await expect(
      service.setUserStatus('user_operator', {
        enabled: 'false' as unknown as boolean,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.resetUserPassword('user_operator', {
        password: 'reset-password',
      }),
    ).resolves.toMatchObject({
      id: 'user_operator',
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-users.csv',
      scope: 'current-page',
      columns: [
        'username',
        'displayName',
        'roleCodes',
        'deptId',
        'postCodes',
        'enabled',
        'system',
      ],
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
    await expect(
      service.createUser({
        username: 'unknown_post',
        displayName: 'Unknown Post',
        password: 'change-me',
        roleCodes: ['viewer'],
        postCodes: ['missing_post'],
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createUser({
        username: 'duplicate_posts',
        displayName: 'Duplicate Posts',
        password: 'change-me',
        roleCodes: ['viewer'],
        postCodes: ['engineer', 'engineer'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('assigns users to roles while protecting system users', async () => {
    const service = new SystemUserService(new SeedSystemUserRepository());
    const operator = await service.createUser({
      username: 'role_assignee',
      displayName: 'Role Assignee',
      password: 'change-me',
      roleCodes: [],
    });

    await expect(service.getRoleUserAssignment('viewer')).resolves.toEqual(
      expect.objectContaining({
        roleCode: 'viewer',
        assignedUserIds: [],
        availableUsers: expect.arrayContaining([
          expect.objectContaining({ id: operator.id }),
        ]),
      }),
    );
    await expect(
      service.assignRoleUsers('viewer', { userIds: [operator.id] }),
    ).resolves.toEqual(
      expect.objectContaining({
        roleCode: 'viewer',
        assignedUserIds: [operator.id],
        assignedUsers: [
          expect.objectContaining({
            id: operator.id,
            roleCodes: ['viewer'],
          }),
        ],
      }),
    );
    await expect(service.getUser(operator.id)).resolves.toMatchObject({
      roleCodes: ['viewer'],
    });
    await expect(
      service.assignRoleUsers('viewer', { userIds: [] }),
    ).resolves.toMatchObject({
      assignedUserIds: [],
    });
    await expect(
      service.assignRoleUsers('viewer', { userIds: ['user_admin'] }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSystemUserRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemUserService(
      new PrismaSystemUserRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const username = `user_${testRunId}`;
    const secondUsername = `${username}_b`;
    const roleCode = `role_user_${testRunId}`;

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
            postCodes: expect.arrayContaining(['admin']),
            enabled: true,
            system: true,
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
        postCodes: ['engineer'],
      });

      expect(user).toMatchObject({
        username,
        roleCodes: ['viewer'],
        deptId: 'dept_operations',
        postCodes: ['engineer'],
        system: false,
      });
      await expect(service.getUser(user.id)).resolves.toMatchObject({
        username,
        roleCodes: ['viewer'],
        system: false,
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
          postCodes: ['admin'],
          enabled: false,
        }),
      ).resolves.toMatchObject({
        displayName: 'Updated Prisma User',
        roleCodes: ['admin'],
        deptId: undefined,
        postCodes: ['admin'],
        enabled: false,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('updated-password'),
      });
      await expect(
        service.setUserStatus(user.id, { enabled: true }),
      ).resolves.toMatchObject({
        enabled: true,
      });
      await expect(
        service.resetUserPassword(user.id, {
          password: 'reset-password',
        }),
      ).resolves.toMatchObject({
        username,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('reset-password'),
      });

      await expect(
        prisma.userPost.count({ where: { userId: user.id } }),
      ).resolves.toBe(1);
      await expect(service.deleteUser(user.id)).resolves.toEqual({
        deleted: true,
      });
      await expect(
        prisma.userRole.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.userPost.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.user.findUnique({ where: { id: user.id } }),
      ).resolves.toBeNull();
    });

    it('persists role-user assignment through Prisma', async () => {
      await prisma.role.create({
        data: {
          code: roleCode,
          name: 'Role User Assignment Test',
          dataScope: 'self',
          dataScopeDeptIds: [],
        },
      });
      const firstUser = await service.createUser({
        username,
        displayName: 'Role Assignment User',
        password: 'initial-password',
        roleCodes: [],
      });
      const secondUser = await service.createUser({
        username: secondUsername,
        displayName: 'Role Assignment User B',
        password: 'initial-password',
        roleCodes: [],
      });

      await expect(service.getRoleUserAssignment(roleCode)).resolves.toEqual(
        expect.objectContaining({
          roleCode,
          assignedUserIds: [],
          availableUsers: expect.arrayContaining([
            expect.objectContaining({ id: firstUser.id }),
            expect.objectContaining({ id: secondUser.id }),
          ]),
        }),
      );
      await expect(
        service.assignRoleUsers(roleCode, { userIds: [firstUser.id] }),
      ).resolves.toEqual(
        expect.objectContaining({
          roleCode,
          assignedUserIds: [firstUser.id],
          assignedUsers: [
            expect.objectContaining({
              id: firstUser.id,
              roleCodes: [roleCode],
            }),
          ],
          availableUsers: expect.arrayContaining([
            expect.objectContaining({ id: secondUser.id }),
          ]),
        }),
      );
      await expect(service.getUser(firstUser.id)).resolves.toMatchObject({
        roleCodes: [roleCode],
      });
      await expect(
        service.assignRoleUsers(roleCode, { userIds: [] }),
      ).resolves.toMatchObject({
        assignedUserIds: [],
      });
      await expect(service.getUser(firstUser.id)).resolves.toMatchObject({
        roleCodes: [],
      });
      const admin = (await service.listUsers()).find(
        (user) => user.username === 'admin',
      );

      expect(admin).toEqual(expect.objectContaining({ system: true }));
      await expect(
        service.assignRoleUsers(roleCode, { userIds: [admin?.id ?? 'admin'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('protects the seeded admin user from Prisma updates and deletes', async () => {
      const admin = (await service.listUsers()).find(
        (user) => user.username === 'admin',
      );

      expect(admin).toMatchObject({ username: 'admin', system: true });
      await expect(
        service.updateUser(admin?.id ?? 'missing_admin', {
          displayName: 'Renamed Admin',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteUser(admin?.id ?? 'missing_admin'),
      ).rejects.toThrow(BadRequestException);
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.userPost.deleteMany({
        where: { user: { username: { in: [username, secondUsername] } } },
      });
      await prisma.userRole.deleteMany({
        where: { user: { username: { in: [username, secondUsername] } } },
      });
      await prisma.user.deleteMany({
        where: { username: { in: [username, secondUsername] } },
      });
      await prisma.role.deleteMany({
        where: { code: roleCode },
      });
    }
  });
});
