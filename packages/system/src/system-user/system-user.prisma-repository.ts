import { Injectable } from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type {
  AssignRoleUsersDto,
  AssignUserRolesDto,
  BatchDeleteUsersDto,
  BatchSetUserStatusDto,
  CreateUserDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
  UpdateUserDto,
} from './system-user.dto';
import { hashSystemUserPassword } from './system-user.password';
import {
  assertSystemUserMutable,
  assertSystemUserPasswordChangeAllowed,
  createRoleUserAssignment,
  createUserRoleAssignment,
  normalizeBatchDeleteUsersInput,
  normalizeBatchSetUserStatusInput,
  normalizeAssignRoleUsersInput,
  normalizeAssignUserRolesInput,
  normalizeCreateSystemUserInput,
  normalizeListSystemUsersQuery,
  normalizeListSystemUsersPageQuery,
  normalizeUpdateSystemUserPasswordInput,
  normalizeUpdateSystemUserInput,
  normalizeUpdateSystemUserProfileInput,
  systemUserBadRequest,
  systemUserConflict,
  systemUserNotFound,
  SystemUserRepository,
  toSystemUserOptionRecord,
  type SystemUserAvatarRecord,
  type SystemUserAvatarUpdateInput,
  type SystemUserBatchMutationRecord,
  type SystemUserDataScopeFilter,
  type SystemUserListQuery,
  type SystemUserOptionRecord,
  type SystemUserPageQuery,
  type SystemUserPageRecord,
  type SystemUserSummaryRecord,
} from './system-user.repository';

type PrismaUserWithRoles = {
  id: string;
  username: string;
  displayName: string;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  remark?: string | null;
  passwordHash: string;
  deptId?: string | null;
  dept?: { name: string } | null;
  enabled: boolean;
  forcePasswordChange?: boolean;
  avatarUrl?: string | null;
  avatarStorageKey?: string | null;
  avatarMimeType?: string | null;
  avatarSizeBytes?: number | null;
  avatarUpdatedAt?: Date | null;
  roles: Array<{ role: { code: string; name: string } }>;
  posts: Array<{ post: { code: string; name: string } }>;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaUserFindManyArgs = NonNullable<
  Parameters<PrismaService['user']['findMany']>[0]
>;
type PrismaUserWhereInput = NonNullable<PrismaUserFindManyArgs['where']>;
type PrismaUserOrderBy = NonNullable<PrismaUserFindManyArgs['orderBy']>;
type PrismaLoginLogRecord = {
  username: string;
  ip: string;
  location: string;
  createdAt: Date;
};

const SYSTEM_USER_IDS = new Set(['user_admin']);
const SYSTEM_USERNAMES = new Set(['admin']);
const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class PrismaSystemUserRepository extends SystemUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listUsers(
    query?: SystemUserListQuery,
  ): Promise<SystemUserSummaryRecord[]> {
    const filters = normalizeListSystemUsersQuery(query);
    const where = await this.createListUsersWhere(filters);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: createListUsersOrderBy(filters),
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    return this.attachLastLoginSummaries(users.map(toSystemUserSummaryRecord));
  }

  async listUserPage(
    query?: SystemUserPageQuery,
  ): Promise<SystemUserPageRecord> {
    const filters = normalizeListSystemUsersPageQuery(query);
    const where = await this.createListUsersWhere(filters);
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: createListUsersOrderBy(filters),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: {
          dept: true,
          roles: {
            include: {
              role: true,
            },
          },
          posts: {
            include: {
              post: true,
            },
          },
        },
      }),
    ]);

    return {
      list: await this.attachLastLoginSummaries(
        users.map(toSystemUserSummaryRecord),
      ),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async listUserOptions(
    query?: SystemUserListQuery,
  ): Promise<readonly SystemUserOptionRecord[]> {
    return (await this.listUsers(query))
      .filter((user) => user.enabled)
      .map(toSystemUserOptionRecord);
  }

  async getUser(id: string): Promise<SystemUserSummaryRecord> {
    const [user] = await this.attachLastLoginSummaries([
      toSystemUserSummaryRecord(await this.findUserEntityById(id)),
    ]);

    return user;
  }

  async getUserAvatar(id: string): Promise<SystemUserAvatarRecord> {
    const user = await this.findUserEntityById(id);

    return toSystemUserAvatarRecord(user);
  }

  async createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord> {
    const input = normalizeCreateSystemUserInput(body);

    if (
      await this.prisma.user.findUnique({ where: { username: input.username } })
    ) {
      throw systemUserConflict(
        'SYSTEM_USER_ALREADY_EXISTS',
        `User already exists: ${input.username}`,
        { username: input.username },
      );
    }

    await this.assertRolesExist(input.roleCodes);
    await this.assertDeptExists(input.deptId);
    await this.assertPostsExist(input.postCodes);
    await this.assertUniqueContact(undefined, input.mobile, input.email);
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        displayName: input.displayName,
        mobile: input.mobile,
        email: input.email,
        gender: input.gender,
        remark: input.remark,
        passwordHash: hashSystemUserPassword(input.password),
        deptId: input.deptId,
        enabled: input.enabled,
        roles: {
          create: input.roleCodes.map((roleCode) => ({
            role: {
              connect: {
                tenantId_code: {
                  tenantId: ROOT_TENANT_ID,
                  code: roleCode,
                },
              },
            },
          })),
        },
        posts: {
          create: input.postCodes.map((postCode) => ({
            post: { connect: { code: postCode } },
          })),
        },
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    await this.syncRootTenantMembershipForUser(user.id);

    return toSystemUserSummaryRecord(user);
  }

  async updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<SystemUserSummaryRecord> {
    const existing = toSystemUserSummaryRecord(
      await this.findUserEntityById(id),
    );
    const input = normalizeUpdateSystemUserInput(body);

    assertSystemUserMutable(existing);

    if (input.roleCodes !== undefined) {
      await this.assertRolesExist(input.roleCodes);
    }
    if (input.deptId !== undefined) {
      await this.assertDeptExists(input.deptId);
    }
    if (input.postCodes !== undefined) {
      await this.assertPostsExist(input.postCodes);
    }
    await this.assertUniqueContact(id, input.mobile, input.email);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
        mobile: input.mobile,
        email: input.email,
        gender: input.gender,
        remark: input.remark,
        passwordHash: input.password
          ? hashSystemUserPassword(input.password)
          : undefined,
        deptId: input.deptId,
        enabled: input.enabled,
        forcePasswordChange: input.forcePasswordChange,
        ...(input.roleCodes === undefined
          ? {}
          : {
              roles: {
                deleteMany: {},
                create: input.roleCodes.map((roleCode) => ({
                  role: {
                    connect: {
                      tenantId_code: {
                        tenantId: ROOT_TENANT_ID,
                        code: roleCode,
                      },
                    },
                  },
                })),
              },
            }),
        ...(input.postCodes === undefined
          ? {}
          : {
              posts: {
                deleteMany: {},
                create: input.postCodes.map((postCode) => ({
                  post: { connect: { code: postCode } },
                })),
              },
            }),
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    await this.syncRootTenantMembershipForUser(user.id);

    return toSystemUserSummaryRecord(user);
  }

  async updateUserProfile(
    id: string,
    body: UpdateUserProfileDto,
  ): Promise<SystemUserSummaryRecord> {
    await this.findUserEntityById(id);
    const input = normalizeUpdateSystemUserProfileInput(body);
    await this.assertUniqueContact(id, input.mobile, input.email);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
        mobile: input.mobile,
        email: input.email,
        gender: input.gender,
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    return toSystemUserSummaryRecord(user);
  }

  async updateUserPassword(
    id: string,
    body: UpdateUserPasswordDto,
  ): Promise<SystemUserSummaryRecord> {
    const existing = await this.findUserEntityById(id);
    const input = normalizeUpdateSystemUserPasswordInput(body);

    assertSystemUserPasswordChangeAllowed(existing.passwordHash, input);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashSystemUserPassword(input.newPassword),
        forcePasswordChange: false,
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    return toSystemUserSummaryRecord(user);
  }

  async updateUserAvatar(
    id: string,
    input: SystemUserAvatarUpdateInput,
  ): Promise<SystemUserSummaryRecord> {
    await this.findUserEntityById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        avatarUrl: input.avatarUrl,
        avatarStorageKey: input.avatarStorageKey,
        avatarMimeType: input.avatarMimeType,
        avatarSizeBytes: input.avatarSizeBytes,
        avatarUpdatedAt: new Date(input.avatarUpdatedAt),
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    return toSystemUserSummaryRecord(user);
  }

  async clearUserAvatar(id: string): Promise<SystemUserSummaryRecord> {
    await this.findUserEntityById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        avatarUrl: null,
        avatarStorageKey: null,
        avatarMimeType: null,
        avatarSizeBytes: null,
        avatarUpdatedAt: null,
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    return toSystemUserSummaryRecord(user);
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    const user = toSystemUserSummaryRecord(await this.findUserEntityById(id));

    assertSystemUserMutable(user);

    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.userPost.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async setUsersStatus(
    body: BatchSetUserStatusDto,
  ): Promise<SystemUserBatchMutationRecord> {
    const input = normalizeBatchSetUserStatusInput(body);
    const users = await this.findMutableBatchUsersByIds(input.userIds);

    await this.prisma.user.updateMany({
      where: { id: { in: [...input.userIds] } },
      data: { enabled: input.enabled },
    });
    await this.syncRootTenantMembershipsForUsers(input.userIds);

    return {
      affected: users.length,
      userIds: users.map((user) => user.id),
      usernames: users.map((user) => user.username),
      enabled: input.enabled,
    };
  }

  async deleteUsers(
    body: BatchDeleteUsersDto,
  ): Promise<SystemUserBatchMutationRecord> {
    const input = normalizeBatchDeleteUsersInput(body);
    const users = await this.findMutableBatchUsersByIds(input.userIds);

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: { userId: { in: [...input.userIds] } },
      }),
      this.prisma.userPost.deleteMany({
        where: { userId: { in: [...input.userIds] } },
      }),
      this.prisma.user.deleteMany({
        where: { id: { in: [...input.userIds] } },
      }),
    ]);

    return {
      affected: users.length,
      userIds: users.map((user) => user.id),
      usernames: users.map((user) => user.username),
      deleted: true,
    };
  }

  async getRoleUserAssignment(roleCode: string) {
    await this.findRoleIdByCode(roleCode);
    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  async getUserRoleAssignment(id: string) {
    return createUserRoleAssignment(
      toSystemUserSummaryRecord(await this.findUserEntityById(id)),
    );
  }

  async assignUserRoles(id: string, body: AssignUserRolesDto) {
    const existing = toSystemUserSummaryRecord(
      await this.findUserEntityById(id),
    );
    const roleCodes = normalizeAssignUserRolesInput(body);

    assertSystemUserMutable(existing);
    await this.assertRolesExist(roleCodes);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        roles: {
          deleteMany: {},
          create: roleCodes.map((roleCode) => ({
            role: {
              connect: {
                tenantId_code: {
                  tenantId: ROOT_TENANT_ID,
                  code: roleCode,
                },
              },
            },
          })),
        },
      },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });
    await this.syncRootTenantMembershipForUser(user.id);

    return createUserRoleAssignment(toSystemUserSummaryRecord(user));
  }

  async assignRoleUsers(roleCode: string, body: AssignRoleUsersDto) {
    const roleId = await this.findRoleIdByCode(roleCode);
    const userIds = normalizeAssignRoleUsersInput(body);
    await this.assertUsersAssignable(userIds);
    const existingAssignments = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: {
          roleId,
          user: {
            id: { notIn: [...SYSTEM_USER_IDS] },
            username: { notIn: [...SYSTEM_USERNAMES] },
          },
        },
      }),
      ...(userIds.length === 0
        ? []
        : [
            this.prisma.userRole.createMany({
              data: userIds.map((userId) => ({
                roleId,
                userId,
              })),
              skipDuplicates: true,
            }),
          ]),
    ]);
    await this.syncRootTenantMembershipsForUsers([
      ...existingAssignments.map((assignment) => assignment.userId),
      ...userIds,
    ]);

    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  private async syncRootTenantMembershipsForUsers(
    userIds: readonly string[],
  ): Promise<void> {
    for (const userId of new Set(userIds)) {
      await this.syncRootTenantMembershipForUser(userId);
    }
  }

  private async syncRootTenantMembershipForUser(userId: string): Promise<void> {
    if (
      !(await this.prisma.tenant.findUnique({
        where: { id: ROOT_TENANT_ID },
        select: { id: true },
      }))
    ) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        enabled: true,
        deptId: true,
        createdAt: true,
        roles: { select: { roleId: true } },
        posts: { select: { postId: true } },
      },
    });

    if (!user) {
      return;
    }

    const membershipId = `tenant_membership_root_${user.id}`;
    const roleRows = user.roles.map((role) => ({
      membershipId,
      roleId: role.roleId,
      tenantId: ROOT_TENANT_ID,
    }));
    const postRows = user.posts.map((post) => ({
      membershipId,
      postId: post.postId,
      tenantId: ROOT_TENANT_ID,
    }));

    await this.prisma.$transaction([
      this.prisma.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: ROOT_TENANT_ID,
            userId: user.id,
          },
        },
        update: {
          deptId: user.deptId,
          isOwner: user.username === 'admin',
          status: user.enabled ? 'active' : 'suspended',
        },
        create: {
          id: membershipId,
          tenantId: ROOT_TENANT_ID,
          userId: user.id,
          deptId: user.deptId,
          isOwner: user.username === 'admin',
          joinedAt: user.createdAt,
          status: user.enabled ? 'active' : 'suspended',
        },
      }),
      this.prisma.tenantMembershipRole.deleteMany({
        where: { membershipId, tenantId: ROOT_TENANT_ID },
      }),
      this.prisma.tenantMembershipPost.deleteMany({
        where: { membershipId, tenantId: ROOT_TENANT_ID },
      }),
      ...(roleRows.length === 0
        ? []
        : [
            this.prisma.tenantMembershipRole.createMany({
              data: roleRows,
              skipDuplicates: true,
            }),
          ]),
      ...(postRows.length === 0
        ? []
        : [
            this.prisma.tenantMembershipPost.createMany({
              data: postRows,
              skipDuplicates: true,
            }),
          ]),
    ]);
  }

  private async findUserEntityById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });

    if (!user) {
      throw systemUserNotFound(
        'SYSTEM_USER_NOT_FOUND',
        `User not found: ${id}`,
        {
          userId: id,
        },
      );
    }

    return user;
  }

  private async findRoleIdByCode(code: string): Promise<string> {
    const role = await this.prisma.role.findUnique({
      where: {
        tenantId_code: {
          tenantId: ROOT_TENANT_ID,
          code,
        },
      },
      select: { id: true },
    });

    if (!role) {
      throw systemUserNotFound(
        'SYSTEM_USER_ROLE_NOT_FOUND',
        `Role not found: ${code}`,
        {
          roleCode: code,
        },
      );
    }

    return role.id;
  }

  private async assertUsersAssignable(userIds: readonly string[]) {
    if (userIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });
    const usersById = new Map(
      users.map((user) => [user.id, toSystemUserSummaryRecord(user)]),
    );
    const missing = userIds.find((userId) => !usersById.has(userId));

    if (missing) {
      throw systemUserNotFound(
        'SYSTEM_USER_NOT_FOUND',
        `User not found: ${missing}`,
        { userId: missing },
      );
    }

    const systemUser = userIds
      .map((userId) => usersById.get(userId))
      .find((user) => user?.system);

    if (systemUser) {
      throw systemUserBadRequest(
        'SYSTEM_USER_ROLE_ASSIGN_SYSTEM_FORBIDDEN',
        'System users cannot be role-assigned.',
        { userId: systemUser.id },
      );
    }
  }

  private async findMutableBatchUsersByIds(
    userIds: readonly string[],
  ): Promise<SystemUserSummaryRecord[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      include: {
        dept: true,
        roles: {
          include: {
            role: true,
          },
        },
        posts: {
          include: {
            post: true,
          },
        },
      },
    });
    const usersById = new Map(
      users.map((user) => [user.id, toSystemUserSummaryRecord(user)]),
    );
    const missing = userIds.find((userId) => !usersById.has(userId));

    if (missing) {
      throw systemUserNotFound(
        'SYSTEM_USER_NOT_FOUND',
        `User not found: ${missing}`,
        { userId: missing },
      );
    }

    const orderedUsers = userIds.map((userId) => {
      const user = usersById.get(userId);

      if (!user) {
        throw systemUserNotFound(
          'SYSTEM_USER_NOT_FOUND',
          `User not found: ${userId}`,
          { userId },
        );
      }

      return user;
    });
    const systemUser = orderedUsers.find((user) => user.system);

    if (systemUser) {
      throw systemUserBadRequest(
        'SYSTEM_USER_SYSTEM_IMMUTABLE',
        'System users cannot be updated or deleted.',
        { userId: systemUser.id },
      );
    }

    return orderedUsers;
  }

  private async assertRolesExist(roleCodes: readonly string[]): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: {
        tenantId: ROOT_TENANT_ID,
        code: { in: [...roleCodes] },
      },
      select: { code: true },
    });
    const existing = new Set(roles.map((role) => role.code));
    const missing = roleCodes.find((roleCode) => !existing.has(roleCode));

    if (missing) {
      throw systemUserNotFound(
        'SYSTEM_USER_ROLE_NOT_FOUND',
        `Role not found: ${missing}`,
        { roleCode: missing },
      );
    }
  }

  private async assertDeptExists(
    deptId: string | null | undefined,
  ): Promise<void> {
    if (!deptId) {
      return;
    }

    const dept = await this.prisma.systemDept.findUnique({
      where: { id: deptId },
      select: { id: true },
    });

    if (!dept) {
      throw systemUserNotFound(
        'SYSTEM_USER_DEPT_NOT_FOUND',
        `System dept not found: ${deptId}`,
        { deptId },
      );
    }
  }

  private async resolveDeptSubtreeIds(deptId: string): Promise<Set<string>> {
    const depts = await this.prisma.systemDept.findMany({
      select: { id: true, parentId: true },
    });
    const target = depts.find((dept) => dept.id === deptId);

    if (!target) {
      throw systemUserNotFound(
        'SYSTEM_USER_DEPT_NOT_FOUND',
        `System dept not found: ${deptId}`,
        { deptId },
      );
    }

    const childrenByParent = new Map<string, string[]>();

    for (const dept of depts) {
      if (!dept.parentId) {
        continue;
      }

      childrenByParent.set(dept.parentId, [
        ...(childrenByParent.get(dept.parentId) ?? []),
        dept.id,
      ]);
    }

    const deptIds = new Set<string>([deptId]);
    const visit = (parentId: string) => {
      for (const childId of childrenByParent.get(parentId) ?? []) {
        if (deptIds.has(childId)) {
          continue;
        }

        deptIds.add(childId);
        visit(childId);
      }
    };

    visit(deptId);
    return deptIds;
  }

  private async createListUsersWhere(
    filters: ReturnType<typeof normalizeListSystemUsersQuery>,
  ): Promise<PrismaUserWhereInput | undefined> {
    const deptWhere = filters.deptId
      ? {
          deptId: {
            in: [...(await this.resolveDeptSubtreeIds(filters.deptId))],
          },
        }
      : undefined;
    const dataScopeWhere = createUserDataScopeWhere(filters.dataScope);
    const directFilters: PrismaUserWhereInput[] = [
      filters.username
        ? {
            username: {
              contains: filters.username,
              mode: 'insensitive' as const,
            },
          }
        : {},
      filters.displayName
        ? {
            displayName: {
              contains: filters.displayName,
              mode: 'insensitive' as const,
            },
          }
        : {},
      filters.mobile
        ? {
            mobile: { contains: filters.mobile, mode: 'insensitive' as const },
          }
        : {},
      filters.email
        ? { email: { contains: filters.email, mode: 'insensitive' as const } }
        : {},
      filters.enabled === undefined ? {} : { enabled: filters.enabled },
      filters.roleCode
        ? {
            roles: {
              some: {
                role: {
                  tenantId: ROOT_TENANT_ID,
                  code: filters.roleCode,
                },
              },
            },
          }
        : {},
      filters.postCode
        ? { posts: { some: { post: { code: filters.postCode } } } }
        : {},
      filters.createdFrom || filters.createdTo
        ? {
            createdAt: {
              gte: filters.createdFrom,
              lte: filters.createdTo,
            },
          }
        : {},
    ].filter((filter) => Object.keys(filter).length > 0);
    const filterWhere =
      directFilters.length > 0 ? { AND: directFilters } : undefined;
    const filtersToApply = [deptWhere, dataScopeWhere, filterWhere].filter(
      Boolean,
    ) as PrismaUserWhereInput[];

    if (filtersToApply.length === 0) {
      return undefined;
    }

    return filtersToApply.length === 1
      ? filtersToApply[0]
      : { AND: filtersToApply };
  }

  private async assertUniqueContact(
    userId: string | undefined,
    mobile: string | null | undefined,
    email: string | null | undefined,
  ): Promise<void> {
    if (mobile) {
      const existing = await this.prisma.user.findFirst({
        where: { mobile, id: userId ? { not: userId } : undefined },
        select: { id: true },
      });

      if (existing) {
        throw systemUserConflict(
          'SYSTEM_USER_MOBILE_EXISTS',
          `User mobile already exists: ${mobile}`,
          { mobile },
        );
      }
    }

    if (email) {
      const existing = await this.prisma.user.findFirst({
        where: { email, id: userId ? { not: userId } : undefined },
        select: { id: true },
      });

      if (existing) {
        throw systemUserConflict(
          'SYSTEM_USER_EMAIL_EXISTS',
          `User email already exists: ${email}`,
          { email },
        );
      }
    }
  }

  private async attachLastLoginSummaries(
    users: readonly SystemUserSummaryRecord[],
  ): Promise<SystemUserSummaryRecord[]> {
    if (users.length === 0) {
      return [];
    }

    const usernames = users.map((user) => user.username);
    const loginLogs = (await this.prisma.loginLog.findMany({
      where: {
        username: { in: usernames },
        success: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        username: true,
        ip: true,
        location: true,
        createdAt: true,
      },
    })) as PrismaLoginLogRecord[];
    const latestByUsername = new Map<string, PrismaLoginLogRecord>();

    for (const log of loginLogs) {
      if (!latestByUsername.has(log.username)) {
        latestByUsername.set(log.username, log);
      }
    }

    return users.map((user) => {
      const latest = latestByUsername.get(user.username);

      return latest
        ? {
            ...user,
            lastLoginAt: latest.createdAt.toISOString(),
            lastLoginIp: latest.ip,
            lastLoginLocation: latest.location,
          }
        : user;
    });
  }

  private async assertPostsExist(postCodes: readonly string[]): Promise<void> {
    if (postCodes.length === 0) {
      return;
    }

    const posts = await this.prisma.systemPost.findMany({
      where: { code: { in: [...postCodes] } },
      select: { code: true },
    });
    const existing = new Set(posts.map((post) => post.code));
    const missing = postCodes.find((postCode) => !existing.has(postCode));

    if (missing) {
      throw systemUserNotFound(
        'SYSTEM_USER_POST_NOT_FOUND',
        `System post not found: ${missing}`,
        { postCode: missing },
      );
    }
  }
}

function toSystemUserSummaryRecord(
  user: PrismaUserWithRoles,
): SystemUserSummaryRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    mobile: user.mobile ?? undefined,
    email: user.email ?? undefined,
    gender: user.gender ?? undefined,
    remark: user.remark ?? undefined,
    roleCodes: user.roles.map((userRole) => userRole.role.code).sort(),
    roleNames: user.roles.map((userRole) => userRole.role.name).sort(),
    deptId: user.deptId ?? undefined,
    deptName: user.dept?.name,
    postCodes: user.posts.map((userPost) => userPost.post.code).sort(),
    postNames: user.posts.map((userPost) => userPost.post.name).sort(),
    avatarUrl: user.avatarUrl ?? undefined,
    avatarMimeType: user.avatarMimeType ?? undefined,
    avatarSizeBytes: user.avatarSizeBytes ?? undefined,
    avatarUpdatedAt: user.avatarUpdatedAt?.toISOString(),
    forcePasswordChange: user.forcePasswordChange ?? false,
    enabled: user.enabled,
    system: isSystemUser(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toSystemUserAvatarRecord(
  user: PrismaUserWithRoles,
): SystemUserAvatarRecord {
  return {
    avatarUrl: user.avatarUrl ?? undefined,
    avatarStorageKey: user.avatarStorageKey ?? undefined,
    avatarMimeType: user.avatarMimeType ?? undefined,
    avatarSizeBytes: user.avatarSizeBytes ?? undefined,
    avatarUpdatedAt: user.avatarUpdatedAt?.toISOString(),
  };
}

function isSystemUser(user: Pick<PrismaUserWithRoles, 'id' | 'username'>) {
  return SYSTEM_USER_IDS.has(user.id) || SYSTEM_USERNAMES.has(user.username);
}

function createListUsersOrderBy(
  filters: ReturnType<typeof normalizeListSystemUsersQuery>,
): PrismaUserOrderBy {
  return [
    { [filters.orderBy]: filters.orderDirection },
    ...(filters.orderBy === 'username' ? [] : [{ username: 'asc' as const }]),
  ] as PrismaUserOrderBy;
}

function createUserDataScopeWhere(
  dataScope: SystemUserDataScopeFilter,
): PrismaUserWhereInput | undefined {
  if (dataScope.type === 'all') {
    return undefined;
  }

  if (dataScope.type === 'none') {
    return {
      id: {
        in: [],
      },
    };
  }

  const filters: PrismaUserWhereInput[] = [];

  if (dataScope.userIds && dataScope.userIds.length > 0) {
    filters.push({
      id: {
        in: [...dataScope.userIds],
      },
    });
  }

  if (dataScope.deptIds && dataScope.deptIds.length > 0) {
    filters.push({
      deptId: {
        in: [...dataScope.deptIds],
      },
    });
  }

  if (filters.length === 0) {
    return {
      id: {
        in: [],
      },
    };
  }

  return filters.length === 1
    ? filters[0]
    : {
        OR: filters,
      };
}
