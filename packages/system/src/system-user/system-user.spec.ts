import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { hashSystemUserPassword } from './system-user.password';
import { PrismaSystemUserRepository } from './system-user.prisma-repository';
import { SeedSystemUserRepository } from './system-user.seed-repository';
import { SystemUserService } from './system-user.service';
import { SYSTEM_USER_EXPORT_CONTENT_TYPE } from './system-user.repository';

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
    await expect(
      service.updateUserProfile('user_admin', {
        displayName: 'Renamed Admin Profile',
      }),
    ).resolves.toMatchObject({
      username: 'admin',
      displayName: 'Renamed Admin Profile',
      system: true,
    });
    await expect(
      service.updateUserProfile('user_admin', {
        displayName: 123 as unknown as string,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateUserAvatar('user_admin', {
        avatarUrl: '/api/core/users/user_admin/avatar?v=seed',
        avatarStorageKey: 'runtime/user-avatars/user_admin/seed-avatar.png',
        avatarMimeType: 'image/png',
        avatarSizeBytes: 68,
        avatarUpdatedAt: '2026-06-13T00:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      username: 'admin',
      avatarUrl: '/api/core/users/user_admin/avatar?v=seed',
      avatarMimeType: 'image/png',
      avatarSizeBytes: 68,
      avatarUpdatedAt: '2026-06-13T00:00:00.000Z',
    });
    await expect(service.getUser('user_admin')).resolves.not.toHaveProperty(
      'avatarStorageKey',
    );
    await expect(service.getUserAvatar('user_admin')).resolves.toMatchObject({
      avatarStorageKey: 'runtime/user-avatars/user_admin/seed-avatar.png',
      avatarMimeType: 'image/png',
    });
    await expect(service.clearUserAvatar('user_admin')).resolves.toMatchObject({
      username: 'admin',
      avatarUrl: undefined,
      avatarMimeType: undefined,
      avatarSizeBytes: undefined,
      avatarUpdatedAt: undefined,
    });
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
    await expect(
      service.listUsers({ deptId: 'dept_operations' }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: user.id,
        deptId: 'dept_operations',
      }),
    ]);
    await expect(
      service.listUserPage({
        deptId: 'dept_operations',
        username: 'oper',
        roleCode: 'viewer',
        postCode: 'engineer',
        enabled: true,
        page: 1,
        pageSize: 5,
      }),
    ).resolves.toMatchObject({
      total: 1,
      page: 1,
      pageSize: 5,
      list: [
        expect.objectContaining({
          id: user.id,
          username: 'operator',
          deptId: 'dept_operations',
        }),
      ],
    });
    await expect(
      service.listUsers({ deptId: 'dept_headquarters' }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ username: 'admin' }),
        expect.objectContaining({ id: user.id }),
      ]),
    );
    await expect(
      service.listUsers({ deptId: 'dept_engineering' }),
    ).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: user.id })]),
    );
    await expect(
      service.listUsers({
        dataScope: {
          type: 'restricted',
          userIds: [user.id],
          deptIds: [],
        },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: user.id,
        username: 'operator',
      }),
    ]);
    await expect(
      service.listUsers({
        deptId: 'dept_headquarters',
        dataScope: {
          type: 'restricted',
          userIds: [],
          deptIds: ['dept_operations'],
        },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: user.id,
        deptId: 'dept_operations',
      }),
    ]);
    await expect(
      service.listUsers({
        deptId: 'dept_engineering',
        dataScope: {
          type: 'restricted',
          userIds: [],
          deptIds: ['dept_operations'],
        },
      }),
    ).resolves.toEqual([]);
    await expect(
      service.listUsers({ dataScope: { type: 'none' } }),
    ).resolves.toEqual([]);
    await expect(service.listUsers({ deptId: 'missing_dept' })).rejects.toThrow(
      NotFoundException,
    );
    const seedOptions = await service.listUserOptions({
      deptId: 'dept_operations',
    });
    const seedUserOption = seedOptions.find((option) => option.id === user.id);

    expect(seedUserOption).toEqual({
      id: user.id,
      username: 'operator',
      displayName: 'Operations User',
      deptId: 'dept_operations',
      postCodes: ['engineer'],
    });
    expect(seedUserOption).not.toHaveProperty('roleCodes');
    expect(seedUserOption).not.toHaveProperty('enabled');
    expect(seedUserOption).not.toHaveProperty('system');
    await expect(
      service.listUserOptions({
        dataScope: {
          type: 'restricted',
          userIds: [user.id],
          deptIds: [],
        },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: user.id,
        username: 'operator',
      }),
    ]);
    await expect(
      service.createExportPreview({
        dataScope: {
          type: 'restricted',
          userIds: [user.id],
          deptIds: [],
        },
      }),
    ).resolves.toMatchObject({
      rowCount: 1,
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
    await expect(service.listUserOptions()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: user.id })]),
    );
    await expect(
      service.setUserStatus('user_operator', { enabled: true }),
    ).resolves.toMatchObject({
      enabled: true,
    });
    await expect(service.listUserOptions()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: user.id })]),
    );
    await expect(
      service.setUserStatus('user_operator', {
        enabled: 'false' as unknown as boolean,
      }),
    ).rejects.toThrow(BadRequestException);
    const batchUser = await service.createUser({
      username: 'batch_operator',
      displayName: 'Batch Operator',
      password: 'change-me',
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
      postCodes: ['engineer'],
    });
    await expect(
      service.setUsersStatus({
        userIds: [user.id, batchUser.id],
        enabled: false,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        affected: 2,
        enabled: false,
        userIds: expect.arrayContaining([user.id, batchUser.id]),
        usernames: expect.arrayContaining(['operator', 'batch_operator']),
      }),
    );
    await expect(service.listUserOptions()).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: user.id }),
        expect.objectContaining({ id: batchUser.id }),
      ]),
    );
    await expect(
      service.setUsersStatus({
        userIds: [user.id, batchUser.id],
        enabled: true,
      }),
    ).resolves.toMatchObject({
      affected: 2,
      enabled: true,
    });
    await expect(
      service.setUsersStatus({
        userIds: [],
        enabled: false,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.setUsersStatus({
        userIds: [user.id, user.id],
        enabled: false,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.setUsersStatus({
        userIds: ['user_admin'],
        enabled: false,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.deleteUsers({ userIds: ['missing_user'] }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.deleteUsers({ userIds: ['user_admin'] }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.deleteUsers({ userIds: [batchUser.id] }),
    ).resolves.toEqual(
      expect.objectContaining({
        affected: 1,
        deleted: true,
        userIds: [batchUser.id],
        usernames: ['batch_operator'],
      }),
    );
    await expect(service.getUser(batchUser.id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.resetUserPassword('user_operator', {
        password: 'reset-password',
      }),
    ).resolves.toMatchObject({
      id: 'user_operator',
      forcePasswordChange: true,
    });
    await expect(
      service.updateUserPassword('user_operator', {
        oldPassword: 'wrong-password',
        newPassword: 'self-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.updateUserPassword('user_operator', {
        oldPassword: 'reset-password',
        newPassword: 'reset-password',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateUserPassword('user_operator', {
        oldPassword: 'reset-password',
        newPassword: 'self-password',
      }),
    ).resolves.toMatchObject({
      id: 'user_operator',
      forcePasswordChange: false,
    });
    const temporaryPasswordReset = await service.resetUserPassword(
      'user_operator',
      {},
    );
    expect(temporaryPasswordReset).toMatchObject({
      id: 'user_operator',
      forcePasswordChange: true,
    });
    expect(temporaryPasswordReset.temporaryPassword).toMatch(
      /^UserTmp-[A-Za-z0-9_-]+-7a$/,
    );
    const exportPreview = await service.createExportPreview();
    expect(exportPreview).toMatchObject({
      filename: 'opencore-system-users.xlsx',
      contentType: SYSTEM_USER_EXPORT_CONTENT_TYPE,
      scope: 'current-page',
      columns: [
        'username',
        'displayName',
        'mobile',
        'email',
        'gender',
        'remark',
        'roleCodes',
        'deptId',
        'postCodes',
        'enabled',
        'system',
        'forcePasswordChange',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
        'lastLoginIp',
        'lastLoginLocation',
      ],
    });
    const exportWorkbook = Buffer.from(exportPreview.contentBase64, 'base64');
    expect(exportWorkbook.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(exportWorkbook.length).toBeGreaterThan(1000);
    const importTemplate = service.createImportTemplate();
    expect(importTemplate).toMatchObject({
      filename: 'opencore-system-users-import-template.xlsx',
      contentType: SYSTEM_USER_EXPORT_CONTENT_TYPE,
      columns: [
        'username',
        'displayName',
        'password',
        'mobile',
        'email',
        'gender',
        'remark',
        'roleCodes',
        'deptId',
        'postCodes',
        'enabled',
      ],
      rowCount: 2,
    });
    const importTemplateWorkbook = Buffer.from(
      importTemplate.contentBase64,
      'base64',
    );
    expect(importTemplateWorkbook.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(importTemplateWorkbook.length).toBeGreaterThan(1000);
    await expect(
      service.importUsers({
        contentBase64: importTemplate.contentBase64,
        updateExisting: 'true' as unknown as boolean,
      }),
    ).rejects.toThrow(BadRequestException);
    const templateImportResult = await service.importUsers({
      contentBase64: importTemplate.contentBase64,
      updateExisting: true,
    });
    expect(templateImportResult).toMatchObject({
      totalRows: 2,
      created: 2,
      updated: 0,
      failed: 0,
      createdUsernames: ['operator_import', 'auditor_import'],
      updatedUsernames: [],
      updatedSessionUsernames: [],
    });
    await expect(
      service.getUser('user_operator_import'),
    ).resolves.toMatchObject({
      username: 'operator_import',
      deptId: 'dept_operations',
      postCodes: ['engineer'],
      enabled: true,
    });
    await expect(service.getUser('user_auditor_import')).resolves.toMatchObject(
      {
        username: 'auditor_import',
        deptId: undefined,
        postCodes: [],
        enabled: false,
      },
    );
    const previewImportResult = await service.previewImportUsers({
      contentBase64: createUserImportCsvBase64([
        [
          'csv_preview',
          'CSV Preview',
          'csv-preview-password',
          '+15550000002',
          'csv.preview@example.com',
          'unknown',
          'preview only',
          'viewer',
          'dept_operations',
          'engineer',
          'true',
        ],
      ]),
    });
    expect(previewImportResult).toMatchObject({
      dryRun: true,
      totalRows: 1,
      created: 1,
      updated: 0,
      failed: 0,
      createdUsernames: ['csv_preview'],
      updatedSessionUsernames: [],
    });
    await expect(service.getUser('user_csv_preview')).rejects.toThrow(
      NotFoundException,
    );
    const importResult = await service.importUsers({
      contentBase64: createUserImportCsvBase64([
        [
          'csv_operator',
          'CSV Operator',
          'csv-password',
          '+15550000001',
          'csv.operator@example.com',
          'unknown',
          'created through csv import',
          'viewer',
          'dept_operations',
          'engineer',
          'true',
        ],
        [
          'csv_operator',
          'Duplicate CSV Operator',
          'csv-password',
          '',
          '',
          '',
          '',
          'viewer',
          '',
          '',
          'true',
        ],
        [
          'operator',
          'Existing Operator',
          'csv-password',
          '',
          '',
          '',
          '',
          'viewer',
          '',
          '',
          'true',
        ],
        [
          'csv_no_password',
          'CSV No Password',
          '',
          '',
          '',
          '',
          '',
          'viewer',
          '',
          '',
          'true',
        ],
      ]),
    });
    expect(importResult).toMatchObject({
      totalRows: 4,
      created: 1,
      updated: 0,
      failed: 3,
      createdUsernames: ['csv_operator'],
      updatedUsernames: [],
      updatedSessionUsernames: [],
    });
    expect(importResult.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          username: 'csv_operator',
          reason: 'Duplicate username in import file: csv_operator',
        }),
        expect.objectContaining({
          username: 'operator',
          reason: 'User already exists: operator',
        }),
        expect.objectContaining({
          username: 'csv_no_password',
          reason: 'Password is required when creating user: csv_no_password',
        }),
      ]),
    );
    await expect(service.getUser('user_csv_operator')).resolves.toMatchObject({
      username: 'csv_operator',
      deptId: 'dept_operations',
      postCodes: ['engineer'],
      enabled: true,
    });
    const updateImportResult = await service.importUsers({
      updateExisting: true,
      contentBase64: createUserImportCsvBase64([
        [
          'operator',
          'Imported Operator Update',
          'import-updated-password',
          '',
          '',
          '',
          'updated through csv import',
          'viewer',
          'dept_engineering',
          '',
          'false',
        ],
      ]),
    });
    expect(updateImportResult).toMatchObject({
      totalRows: 1,
      created: 0,
      updated: 1,
      failed: 0,
      updatedUsernames: ['operator'],
      updatedSessionUsernames: ['operator'],
    });
    await expect(service.getUser('user_operator')).resolves.toMatchObject({
      displayName: 'Imported Operator Update',
      roleCodes: ['viewer'],
      deptId: 'dept_engineering',
      postCodes: [],
      enabled: false,
    });
    await expect(service.deleteUser('user_csv_operator')).resolves.toEqual({
      deleted: true,
    });
    await expect(service.deleteUser('user_operator')).resolves.toEqual({
      deleted: true,
    });
    await expect(service.deleteUser('user_operator_import')).resolves.toEqual({
      deleted: true,
    });
    await expect(service.deleteUser('user_auditor_import')).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects invalid usernames, duplicated role codes, and unknown roles', async () => {
    const service = new SystemUserService(new SeedSystemUserRepository());

    await expectHttpExceptionCode(
      service.createUser({
        username: 'Invalid User',
        displayName: 'Invalid',
        password: 'change-me',
        roleCodes: [],
      }),
      'SYSTEM_USER_USERNAME_INVALID',
    );
    await expectHttpExceptionCode(
      service.createUser({
        username: 'duplicate_roles',
        displayName: 'Duplicate Roles',
        password: 'change-me',
        roleCodes: ['viewer', 'viewer'],
      }),
      'SYSTEM_USER_ROLE_CODE_DUPLICATED',
    );
    await expectHttpExceptionCode(
      service.createUser({
        username: 'unknown_role',
        displayName: 'Unknown Role',
        password: 'change-me',
        roleCodes: ['missing'],
      }),
      'SYSTEM_USER_ROLE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      service.createUser({
        username: 'unknown_dept',
        displayName: 'Unknown Dept',
        password: 'change-me',
        roleCodes: ['viewer'],
        deptId: 'missing_dept',
      }),
      'SYSTEM_USER_DEPT_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      service.createUser({
        username: 'unknown_post',
        displayName: 'Unknown Post',
        password: 'change-me',
        roleCodes: ['viewer'],
        postCodes: ['missing_post'],
      }),
      'SYSTEM_USER_POST_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      service.createUser({
        username: 'duplicate_posts',
        displayName: 'Duplicate Posts',
        password: 'change-me',
        roleCodes: ['viewer'],
        postCodes: ['engineer', 'engineer'],
      }),
      'SYSTEM_USER_POST_CODE_DUPLICATED',
    );
  });

  it('returns stable error codes for system-user guards', async () => {
    const service = new SystemUserService(new SeedSystemUserRepository());

    await expectHttpExceptionCode(
      service.updateUser('user_admin', { displayName: 'Renamed Admin' }),
      'SYSTEM_USER_SYSTEM_IMMUTABLE',
    );
    await expectHttpExceptionCode(
      service.updateUserPassword('user_admin', {
        oldPassword: 'wrong-password',
        newPassword: 'next-password',
      }),
      'SYSTEM_USER_CURRENT_PASSWORD_INVALID',
    );
    await expectHttpExceptionCode(
      service.importUsers({
        contentBase64: createUserImportCsvBase64([
          [
            'stable_codes',
            'Stable Codes',
            'change-me',
            'viewer',
            '',
            '',
            'true',
          ],
        ]),
        updateExisting: 'true' as unknown as boolean,
      }),
      'SYSTEM_USER_IMPORT_UPDATE_EXISTING_INVALID',
    );
    await expectHttpExceptionCode(
      service.assignRoleUsers('viewer', { userIds: ['user_admin'] }),
      'SYSTEM_USER_ROLE_ASSIGN_SYSTEM_FORBIDDEN',
    );
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
    await expect(service.getUserRoleAssignment(operator.id)).resolves.toEqual({
      userId: operator.id,
      username: 'role_assignee',
      displayName: 'Role Assignee',
      roleCodes: ['viewer'],
    });
    await expect(
      service.assignUserRoles(operator.id, { roleCodes: [] }),
    ).resolves.toEqual({
      userId: operator.id,
      username: 'role_assignee',
      displayName: 'Role Assignee',
      roleCodes: [],
    });
    await expect(service.getUser(operator.id)).resolves.toMatchObject({
      roleCodes: [],
    });
    await expect(
      service.assignUserRoles(operator.id, {
        roleCodes: ['viewer', 'viewer'],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.assignUserRoles(operator.id, { roleCodes: ['missing'] }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.assignUserRoles('user_admin', { roleCodes: ['viewer'] }),
    ).rejects.toThrow(BadRequestException);
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
      await expect(
        service.listUsers({ deptId: 'dept_operations' }),
      ).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username, deptId: 'dept_operations' }),
        ]),
      );
      await expect(
        service.listUserPage({
          deptId: 'dept_operations',
          username: testRunId,
          roleCode: 'viewer',
          postCode: 'engineer',
          enabled: true,
          page: 1,
          pageSize: 5,
        }),
      ).resolves.toMatchObject({
        total: 1,
        page: 1,
        pageSize: 5,
        list: [
          expect.objectContaining({
            username,
            deptId: 'dept_operations',
          }),
        ],
      });
      await expect(
        service.listUsers({ deptId: 'dept_headquarters' }),
      ).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username: 'admin' }),
          expect.objectContaining({ username }),
        ]),
      );
      await expect(
        service.listUsers({ deptId: 'dept_engineering' }),
      ).resolves.not.toEqual(
        expect.arrayContaining([expect.objectContaining({ username })]),
      );
      await expect(
        service.listUsers({
          dataScope: {
            type: 'restricted',
            userIds: [user.id],
            deptIds: [],
          },
        }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: user.id,
          username,
        }),
      ]);
      await expect(
        service.listUsers({
          deptId: 'dept_headquarters',
          dataScope: {
            type: 'restricted',
            userIds: [],
            deptIds: ['dept_operations'],
          },
        }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: user.id,
          deptId: 'dept_operations',
        }),
      ]);
      await expect(
        service.listUsers({
          deptId: 'dept_engineering',
          dataScope: {
            type: 'restricted',
            userIds: [],
            deptIds: ['dept_operations'],
          },
        }),
      ).resolves.toEqual([]);
      await expect(
        service.listUsers({ dataScope: { type: 'none' } }),
      ).resolves.toEqual([]);
      await expect(
        service.listUsers({ deptId: 'missing_dept' }),
      ).rejects.toThrow(NotFoundException);
      const userOptions = await service.listUserOptions({
        deptId: 'dept_operations',
      });
      const userOption = userOptions.find((option) => option.id === user.id);

      expect(userOption).toEqual({
        id: user.id,
        username,
        displayName: 'Prisma User',
        deptId: 'dept_operations',
        postCodes: ['engineer'],
      });
      expect(userOption).not.toHaveProperty('roleCodes');
      expect(userOption).not.toHaveProperty('enabled');
      expect(userOption).not.toHaveProperty('system');
      await expect(
        service.listUserOptions({
          dataScope: {
            type: 'restricted',
            userIds: [user.id],
            deptIds: [],
          },
        }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: user.id,
          username,
        }),
      ]);
      await expect(
        service.createExportPreview({
          dataScope: {
            type: 'restricted',
            userIds: [user.id],
            deptIds: [],
          },
        }),
      ).resolves.toMatchObject({
        rowCount: 1,
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
      await expect(service.listUserOptions()).resolves.not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: user.id })]),
      );
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('updated-password'),
      });
      await expect(
        service.updateUserProfile(user.id, {
          displayName: 'Updated Profile User',
        }),
      ).resolves.toMatchObject({
        displayName: 'Updated Profile User',
        roleCodes: ['admin'],
        postCodes: ['admin'],
        enabled: false,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        displayName: 'Updated Profile User',
        passwordHash: hashSystemUserPassword('updated-password'),
      });
      const avatarInput = {
        avatarUrl: `/api/core/users/${user.id}/avatar?v=prisma`,
        avatarStorageKey: `runtime/user-avatars/${user.id}/prisma-avatar.png`,
        avatarMimeType: 'image/png',
        avatarSizeBytes: 68,
        avatarUpdatedAt: '2026-06-13T00:00:00.000Z',
      };

      await expect(
        service.updateUserAvatar(user.id, avatarInput),
      ).resolves.toMatchObject({
        username,
        avatarUrl: avatarInput.avatarUrl,
        avatarMimeType: 'image/png',
        avatarSizeBytes: 68,
        avatarUpdatedAt: '2026-06-13T00:00:00.000Z',
      });
      await expect(service.getUser(user.id)).resolves.not.toHaveProperty(
        'avatarStorageKey',
      );
      await expect(service.getUserAvatar(user.id)).resolves.toMatchObject({
        avatarStorageKey: avatarInput.avatarStorageKey,
        avatarMimeType: 'image/png',
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        avatarUrl: avatarInput.avatarUrl,
        avatarStorageKey: avatarInput.avatarStorageKey,
        avatarMimeType: 'image/png',
        avatarSizeBytes: 68,
      });
      await expect(service.clearUserAvatar(user.id)).resolves.toMatchObject({
        username,
        avatarUrl: undefined,
        avatarMimeType: undefined,
        avatarSizeBytes: undefined,
        avatarUpdatedAt: undefined,
      });
      await expect(service.getUserAvatar(user.id)).resolves.toMatchObject({
        avatarStorageKey: undefined,
        avatarMimeType: undefined,
      });
      await expect(
        service.setUserStatus(user.id, { enabled: true }),
      ).resolves.toMatchObject({
        enabled: true,
      });
      await expect(service.listUserOptions()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: user.id })]),
      );
      const secondUser = await service.createUser({
        username: secondUsername,
        displayName: 'Prisma Batch User',
        password: 'initial-password',
        roleCodes: ['viewer'],
        deptId: 'dept_operations',
        postCodes: ['engineer'],
      });
      await expect(
        service.setUsersStatus({
          userIds: [user.id, secondUser.id],
          enabled: false,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          affected: 2,
          enabled: false,
          userIds: expect.arrayContaining([user.id, secondUser.id]),
          usernames: expect.arrayContaining([username, secondUsername]),
        }),
      );
      await expect(service.listUserOptions()).resolves.not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: user.id }),
          expect.objectContaining({ id: secondUser.id }),
        ]),
      );
      await expect(
        service.setUsersStatus({
          userIds: [user.id, secondUser.id],
          enabled: true,
        }),
      ).resolves.toMatchObject({
        affected: 2,
        enabled: true,
      });
      await expect(
        service.setUsersStatus({
          userIds: [],
          enabled: false,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.setUsersStatus({
          userIds: [user.id, user.id],
          enabled: false,
        }),
      ).rejects.toThrow(BadRequestException);
      const adminForBatch = (await service.listUsers()).find(
        (candidate) => candidate.username === 'admin',
      );

      expect(adminForBatch).toEqual(expect.objectContaining({ system: true }));
      await expect(
        service.setUsersStatus({
          userIds: [adminForBatch?.id ?? 'missing_admin'],
          enabled: false,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteUsers({ userIds: ['missing_user'] }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteUsers({
          userIds: [adminForBatch?.id ?? 'missing_admin'],
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteUsers({ userIds: [secondUser.id] }),
      ).resolves.toEqual(
        expect.objectContaining({
          affected: 1,
          deleted: true,
          userIds: [secondUser.id],
          usernames: [secondUsername],
        }),
      );
      await expect(
        prisma.userRole.count({ where: { userId: secondUser.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.userPost.count({ where: { userId: secondUser.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.user.findUnique({ where: { id: secondUser.id } }),
      ).resolves.toBeNull();
      await expect(
        service.resetUserPassword(user.id, {
          password: 'reset-password',
        }),
      ).resolves.toMatchObject({
        username,
        forcePasswordChange: true,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('reset-password'),
        forcePasswordChange: true,
      });
      await expect(
        service.updateUserPassword(user.id, {
          oldPassword: 'wrong-password',
          newPassword: 'self-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.updateUserPassword(user.id, {
          oldPassword: 'reset-password',
          newPassword: 'reset-password',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateUserPassword(user.id, {
          oldPassword: 'reset-password',
          newPassword: 'self-password',
        }),
      ).resolves.toMatchObject({
        username,
        forcePasswordChange: false,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('self-password'),
        forcePasswordChange: false,
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
        service.getUserRoleAssignment(firstUser.id),
      ).resolves.toEqual({
        userId: firstUser.id,
        username,
        displayName: 'Role Assignment User',
        roleCodes: [roleCode],
      });
      await expect(
        service.assignUserRoles(firstUser.id, { roleCodes: [] }),
      ).resolves.toEqual({
        userId: firstUser.id,
        username,
        displayName: 'Role Assignment User',
        roleCodes: [],
      });
      await expect(service.getUser(firstUser.id)).resolves.toMatchObject({
        roleCodes: [],
      });
      await expect(
        service.assignUserRoles(firstUser.id, {
          roleCodes: [roleCode, roleCode],
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignUserRoles(firstUser.id, { roleCodes: ['missing'] }),
      ).rejects.toThrow(NotFoundException);
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
        service.assignUserRoles(admin?.id ?? 'admin', {
          roleCodes: [roleCode],
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignRoleUsers(roleCode, { userIds: [admin?.id ?? 'admin'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('keeps legacy user org bridges root-only at the database boundary', async () => {
      const tenantId = `tenant_user_legacy_${testRunId}`;
      const foreignDeptId = `dept_user_legacy_${testRunId}`;
      const foreignPostId = `post_user_legacy_${testRunId}`;
      const foreignRoleId = `role_user_legacy_${testRunId}`;
      const user = await service.createUser({
        username,
        displayName: 'Legacy Root Boundary User',
        password: 'initial-password',
        roleCodes: [],
      });

      await prisma.tenant.create({
        data: {
          id: tenantId,
          code: tenantId,
          slug: tenantId,
          name: 'Legacy Root Boundary Tenant',
          status: 'active',
        },
      });
      await prisma.systemDept.create({
        data: {
          id: foreignDeptId,
          code: foreignDeptId,
          name: 'Foreign Legacy Dept',
          tenantId,
        },
      });
      await prisma.systemPost.create({
        data: {
          id: foreignPostId,
          code: foreignPostId,
          name: 'Foreign Legacy Post',
          tenantId,
        },
      });
      await prisma.role.create({
        data: {
          id: foreignRoleId,
          code: foreignRoleId,
          name: 'Foreign Legacy Role',
          tenantId,
        },
      });

      await expect(
        prisma.user.update({
          where: { id: user.id },
          data: { deptId: foreignDeptId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.userRole.create({
          data: { roleId: foreignRoleId, userId: user.id },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.userPost.create({
          data: { postId: foreignPostId, userId: user.id },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.userRole.create({
          data: { roleId: foreignRoleId, tenantId, userId: user.id },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.userPost.create({
          data: { postId: foreignPostId, tenantId, userId: user.id },
        }),
      ).rejects.toThrow();
    });

    it('persists imported users through Prisma and reports row failures', async () => {
      const result = await service.importUsers({
        contentBase64: createUserImportCsvBase64([
          [
            username,
            'Imported Prisma User',
            'import-password',
            'viewer',
            'dept_operations',
            'engineer',
            'true',
          ],
          [
            secondUsername,
            'Missing Role Prisma User',
            'import-password',
            'missing_role',
            '',
            '',
            'true',
          ],
        ]),
      });

      expect(result).toMatchObject({
        totalRows: 2,
        created: 1,
        updated: 0,
        failed: 1,
        createdUsernames: [username],
      });
      expect(result.failures).toEqual([
        expect.objectContaining({
          username: secondUsername,
          reason: 'Role not found: missing_role',
        }),
      ]);
      const importedSummary = (await service.listUsers()).find(
        (user) => user.username === username,
      );

      expect(importedSummary).toBeDefined();
      const imported = await service.getUser(importedSummary?.id ?? 'missing');

      expect(imported).toMatchObject({
        username,
        displayName: 'Imported Prisma User',
        roleCodes: ['viewer'],
        deptId: 'dept_operations',
        postCodes: ['engineer'],
        enabled: true,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: imported.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('import-password'),
      });

      const updateResult = await service.importUsers({
        updateExisting: true,
        contentBase64: createUserImportCsvBase64([
          [
            username,
            'Imported Prisma User Updated',
            'updated-import-password',
            'viewer',
            '',
            '',
            'false',
          ],
        ]),
      });

      expect(updateResult).toMatchObject({
        totalRows: 1,
        created: 0,
        updated: 1,
        failed: 0,
        updatedUsernames: [username],
        updatedSessionUsernames: [username],
      });
      await expect(service.getUser(imported.id)).resolves.toMatchObject({
        displayName: 'Imported Prisma User Updated',
        deptId: undefined,
        postCodes: [],
        enabled: false,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: imported.id } }),
      ).resolves.toMatchObject({
        passwordHash: hashSystemUserPassword('updated-import-password'),
      });
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
      await prisma.tenant.deleteMany({
        where: { id: `tenant_user_legacy_${testRunId}` },
      });
    }
  });
});

function createUserImportCsvBase64(
  rows: readonly (readonly string[])[],
): string {
  const csvRows = [
    [
      'username',
      'displayName',
      'password',
      'mobile',
      'email',
      'gender',
      'remark',
      'roleCodes',
      'deptId',
      'postCodes',
      'enabled',
    ],
    ...rows.map(normalizeUserImportCsvTestRow),
  ];

  return Buffer.from(
    csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n'),
    'utf8',
  ).toString('base64');
}

function normalizeUserImportCsvTestRow(
  row: readonly string[],
): readonly string[] {
  if (row.length !== 7) {
    return row;
  }

  return [
    row[0],
    row[1],
    row[2],
    '',
    '',
    '',
    '',
    row[3],
    row[4],
    row[5],
    row[6],
  ];
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

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
