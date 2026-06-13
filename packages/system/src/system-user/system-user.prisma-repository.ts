import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type {
  AssignRoleUsersDto,
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
  normalizeBatchDeleteUsersInput,
  normalizeBatchSetUserStatusInput,
  normalizeAssignRoleUsersInput,
  normalizeCreateSystemUserInput,
  normalizeListSystemUsersQuery,
  normalizeUpdateSystemUserPasswordInput,
  normalizeUpdateSystemUserInput,
  normalizeUpdateSystemUserProfileInput,
  SystemUserRepository,
  toSystemUserOptionRecord,
  type SystemUserAvatarRecord,
  type SystemUserAvatarUpdateInput,
  type SystemUserBatchMutationRecord,
  type SystemUserListQuery,
  type SystemUserOptionRecord,
  type SystemUserSummaryRecord,
} from './system-user.repository';

type PrismaUserWithRoles = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  deptId?: string | null;
  enabled: boolean;
  avatarUrl?: string | null;
  avatarStorageKey?: string | null;
  avatarMimeType?: string | null;
  avatarSizeBytes?: number | null;
  avatarUpdatedAt?: Date | null;
  roles: Array<{ role: { code: string } }>;
  posts: Array<{ post: { code: string } }>;
};

const SYSTEM_USER_IDS = new Set(['user_admin']);
const SYSTEM_USERNAMES = new Set(['admin']);

@Injectable()
export class PrismaSystemUserRepository extends SystemUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listUsers(
    query?: SystemUserListQuery,
  ): Promise<SystemUserSummaryRecord[]> {
    const filters = normalizeListSystemUsersQuery(query);
    const deptIds = filters.deptId
      ? await this.resolveDeptSubtreeIds(filters.deptId)
      : undefined;
    const users = await this.prisma.user.findMany({
      where: deptIds ? { deptId: { in: [...deptIds] } } : undefined,
      include: {
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
      orderBy: { username: 'asc' },
    });

    return users.map(toSystemUserSummaryRecord);
  }

  async listUserOptions(
    query?: SystemUserListQuery,
  ): Promise<readonly SystemUserOptionRecord[]> {
    return (await this.listUsers(query))
      .filter((user) => user.enabled)
      .map(toSystemUserOptionRecord);
  }

  async getUser(id: string): Promise<SystemUserSummaryRecord> {
    return toSystemUserSummaryRecord(await this.findUserEntityById(id));
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
      throw new ConflictException(`User already exists: ${input.username}`);
    }

    await this.assertRolesExist(input.roleCodes);
    await this.assertDeptExists(input.deptId);
    await this.assertPostsExist(input.postCodes);
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        displayName: input.displayName,
        passwordHash: hashSystemUserPassword(input.password),
        deptId: input.deptId,
        enabled: input.enabled,
        roles: {
          create: input.roleCodes.map((roleCode) => ({
            role: { connect: { code: roleCode } },
          })),
        },
        posts: {
          create: input.postCodes.map((postCode) => ({
            post: { connect: { code: postCode } },
          })),
        },
      },
      include: {
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

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
        passwordHash: input.password
          ? hashSystemUserPassword(input.password)
          : undefined,
        deptId: input.deptId,
        enabled: input.enabled,
        ...(input.roleCodes === undefined
          ? {}
          : {
              roles: {
                deleteMany: {},
                create: input.roleCodes.map((roleCode) => ({
                  role: { connect: { code: roleCode } },
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

  async updateUserProfile(
    id: string,
    body: UpdateUserProfileDto,
  ): Promise<SystemUserSummaryRecord> {
    await this.findUserEntityById(id);
    const input = normalizeUpdateSystemUserProfileInput(body);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
      },
      include: {
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
      },
      include: {
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

  async assignRoleUsers(roleCode: string, body: AssignRoleUsersDto) {
    const roleId = await this.findRoleIdByCode(roleCode);
    const userIds = normalizeAssignRoleUsersInput(body);
    await this.assertUsersAssignable(userIds);

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

    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  private async findUserEntityById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
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
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  private async findRoleIdByCode(code: string): Promise<string> {
    const role = await this.prisma.role.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(`Role not found: ${code}`);
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
      throw new NotFoundException(`User not found: ${missing}`);
    }

    const systemUser = userIds
      .map((userId) => usersById.get(userId))
      .find((user) => user?.system);

    if (systemUser) {
      throw new BadRequestException('System users cannot be role-assigned.');
    }
  }

  private async findMutableBatchUsersByIds(
    userIds: readonly string[],
  ): Promise<SystemUserSummaryRecord[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      include: {
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
      throw new NotFoundException(`User not found: ${missing}`);
    }

    const orderedUsers = userIds.map((userId) => usersById.get(userId)!);
    const systemUser = orderedUsers.find((user) => user.system);

    if (systemUser) {
      throw new BadRequestException(
        'System users cannot be updated or deleted.',
      );
    }

    return orderedUsers;
  }

  private async assertRolesExist(roleCodes: readonly string[]): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: { code: { in: [...roleCodes] } },
      select: { code: true },
    });
    const existing = new Set(roles.map((role) => role.code));
    const missing = roleCodes.find((roleCode) => !existing.has(roleCode));

    if (missing) {
      throw new NotFoundException(`Role not found: ${missing}`);
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
      throw new NotFoundException(`System dept not found: ${deptId}`);
    }
  }

  private async resolveDeptSubtreeIds(deptId: string): Promise<Set<string>> {
    const depts = await this.prisma.systemDept.findMany({
      select: { id: true, parentId: true },
    });
    const target = depts.find((dept) => dept.id === deptId);

    if (!target) {
      throw new NotFoundException(`System dept not found: ${deptId}`);
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
      throw new NotFoundException(`System post not found: ${missing}`);
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
    roleCodes: user.roles.map((userRole) => userRole.role.code).sort(),
    deptId: user.deptId ?? undefined,
    postCodes: user.posts.map((userPost) => userPost.post.code).sort(),
    avatarUrl: user.avatarUrl ?? undefined,
    avatarMimeType: user.avatarMimeType ?? undefined,
    avatarSizeBytes: user.avatarSizeBytes ?? undefined,
    avatarUpdatedAt: user.avatarUpdatedAt?.toISOString(),
    enabled: user.enabled,
    system: isSystemUser(user),
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
