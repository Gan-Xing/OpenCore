import { Injectable } from '@nestjs/common';
import { seedSystemDepts } from '../system-dept/system-dept.records';
import { seedSystemPosts } from '../system-post/system-post.records';
import { seedSystemRoles } from '../system-role/system-role.records';
import {
  assertSystemUserMutable,
  cloneSystemUserSummary,
  compareSystemUserRecords,
  createRoleUserAssignment,
  createUserRoleAssignment,
  normalizeAssignUserRolesInput,
  normalizeCreateSystemUserInput,
  normalizeAssignRoleUsersInput,
  normalizeBatchDeleteUsersInput,
  normalizeBatchSetUserStatusInput,
  normalizeUpdateSystemUserPasswordInput,
  normalizeListSystemUsersQuery,
  normalizeUpdateSystemUserInput,
  normalizeUpdateSystemUserProfileInput,
  assertSystemUserPasswordChangeAllowed,
  systemUserBadRequest,
  systemUserConflict,
  systemUserNotFound,
  SystemUserRepository,
  toSystemUserOptionRecord,
  type SystemUserListQuery,
  type SystemUserAvatarRecord,
  type SystemUserAvatarUpdateInput,
  type SystemUserBatchMutationRecord,
  type SystemUserOptionRecord,
  type SystemUserSummaryRecord,
} from './system-user.repository';
import { hashSystemUserPassword } from './system-user.password';
import { seedSystemUsers, type SystemUserRecord } from './system-user.records';
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

@Injectable()
export class SeedSystemUserRepository extends SystemUserRepository {
  private users: SystemUserRecord[];
  private readonly roleCodes = new Set(
    seedSystemRoles.map((role) => role.code),
  );
  private readonly deptIds = new Set(seedSystemDepts.map((dept) => dept.id));
  private readonly deptChildrenByParent = createDeptChildrenByParent();
  private readonly postCodes = new Set(
    seedSystemPosts.map((post) => post.code),
  );

  constructor(users: readonly SystemUserRecord[] = seedSystemUsers) {
    super();
    this.users = users.map(cloneUser);
  }

  async listUsers(
    query?: SystemUserListQuery,
  ): Promise<SystemUserSummaryRecord[]> {
    const filters = normalizeListSystemUsersQuery(query);
    const deptIds = filters.deptId
      ? this.resolveDeptSubtreeIds(filters.deptId)
      : undefined;

    return this.users
      .filter((user) => {
        if (deptIds && (!user.deptId || !deptIds.has(user.deptId))) {
          return false;
        }

        return matchesDataScope(user, filters.dataScope);
      })
      .map(cloneSystemUserSummary)
      .sort(compareSystemUserRecords);
  }

  async listUserOptions(
    query?: SystemUserListQuery,
  ): Promise<readonly SystemUserOptionRecord[]> {
    return (await this.listUsers(query))
      .filter((user) => user.enabled)
      .map(toSystemUserOptionRecord);
  }

  async getUser(id: string): Promise<SystemUserSummaryRecord> {
    return cloneSystemUserSummary(this.findMutableUserById(id));
  }

  async getUserAvatar(id: string): Promise<SystemUserAvatarRecord> {
    const user = this.findMutableUserById(id);

    return {
      avatarUrl: user.avatarUrl,
      avatarStorageKey: user.avatarStorageKey,
      avatarMimeType: user.avatarMimeType,
      avatarSizeBytes: user.avatarSizeBytes,
      avatarUpdatedAt: user.avatarUpdatedAt,
    };
  }

  async createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord> {
    const input = normalizeCreateSystemUserInput(body);

    if (this.users.some((user) => user.username === input.username)) {
      throw systemUserConflict(
        'SYSTEM_USER_ALREADY_EXISTS',
        `User already exists: ${input.username}`,
        { username: input.username },
      );
    }

    this.assertRoleCodes(input.roleCodes);
    this.assertDeptId(input.deptId);
    this.assertPostCodes(input.postCodes);
    const user: SystemUserRecord = {
      id: `user_${input.username.replace(/[^a-z0-9]+/g, '_')}`,
      username: input.username,
      displayName: input.displayName,
      passwordHash: hashSystemUserPassword(input.password),
      roleCodes: [...input.roleCodes],
      deptId: input.deptId,
      postCodes: [...input.postCodes],
      enabled: input.enabled,
      system: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users = [...this.users, user];
    return cloneSystemUserSummary(user);
  }

  async updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<SystemUserSummaryRecord> {
    const user = this.findMutableUserById(id);
    const input = normalizeUpdateSystemUserInput(body);

    assertSystemUserMutable(user);

    if (input.roleCodes !== undefined) {
      this.assertRoleCodes(input.roleCodes);
      user.roleCodes = [...input.roleCodes];
    }
    if (input.deptId !== undefined) {
      this.assertDeptId(input.deptId);
      user.deptId = input.deptId ?? undefined;
    }
    if (input.postCodes !== undefined) {
      this.assertPostCodes(input.postCodes);
      user.postCodes = [...input.postCodes];
    }

    user.displayName = input.displayName ?? user.displayName;
    user.passwordHash = input.password
      ? hashSystemUserPassword(input.password)
      : user.passwordHash;
    user.enabled = input.enabled ?? user.enabled;
    user.updatedAt = new Date().toISOString();

    return cloneSystemUserSummary(user);
  }

  async updateUserProfile(
    id: string,
    body: UpdateUserProfileDto,
  ): Promise<SystemUserSummaryRecord> {
    const user = this.findMutableUserById(id);
    const input = normalizeUpdateSystemUserProfileInput(body);

    user.displayName = input.displayName ?? user.displayName;
    user.mobile =
      input.mobile === undefined ? user.mobile : (input.mobile ?? undefined);
    user.email =
      input.email === undefined ? user.email : (input.email ?? undefined);
    user.gender =
      input.gender === undefined ? user.gender : (input.gender ?? undefined);
    user.updatedAt = new Date().toISOString();

    return cloneSystemUserSummary(user);
  }

  async updateUserPassword(
    id: string,
    body: UpdateUserPasswordDto,
  ): Promise<SystemUserSummaryRecord> {
    const user = this.findMutableUserById(id);
    const input = normalizeUpdateSystemUserPasswordInput(body);

    assertSystemUserPasswordChangeAllowed(user.passwordHash, input);
    user.passwordHash = hashSystemUserPassword(input.newPassword);
    user.updatedAt = new Date().toISOString();

    return cloneSystemUserSummary(user);
  }

  async updateUserAvatar(
    id: string,
    input: SystemUserAvatarUpdateInput,
  ): Promise<SystemUserSummaryRecord> {
    const user = this.findMutableUserById(id);

    user.avatarUrl = input.avatarUrl;
    user.avatarStorageKey = input.avatarStorageKey;
    user.avatarMimeType = input.avatarMimeType;
    user.avatarSizeBytes = input.avatarSizeBytes;
    user.avatarUpdatedAt = input.avatarUpdatedAt;
    user.updatedAt = new Date().toISOString();

    return cloneSystemUserSummary(user);
  }

  async clearUserAvatar(id: string): Promise<SystemUserSummaryRecord> {
    const user = this.findMutableUserById(id);

    user.avatarUrl = undefined;
    user.avatarStorageKey = undefined;
    user.avatarMimeType = undefined;
    user.avatarSizeBytes = undefined;
    user.avatarUpdatedAt = undefined;
    user.updatedAt = new Date().toISOString();

    return cloneSystemUserSummary(user);
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    const user = this.findMutableUserById(id);

    assertSystemUserMutable(user);

    this.users = this.users.filter((candidate) => candidate.id !== user.id);
    return { deleted: true };
  }

  async setUsersStatus(
    body: BatchSetUserStatusDto,
  ): Promise<SystemUserBatchMutationRecord> {
    const input = normalizeBatchSetUserStatusInput(body);
    const users = this.findUsersByIds(input.userIds);

    for (const user of users) {
      assertSystemUserMutable(cloneSystemUserSummary(user));
    }

    for (const user of users) {
      user.enabled = input.enabled;
      user.updatedAt = new Date().toISOString();
    }

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
    const users = this.findUsersByIds(input.userIds);

    for (const user of users) {
      assertSystemUserMutable(cloneSystemUserSummary(user));
    }

    const selectedUserIds = new Set(users.map((user) => user.id));
    this.users = this.users.filter((user) => !selectedUserIds.has(user.id));

    return {
      affected: users.length,
      userIds: users.map((user) => user.id),
      usernames: users.map((user) => user.username),
      deleted: true,
    };
  }

  async getUserRoleAssignment(id: string) {
    return createUserRoleAssignment(
      cloneSystemUserSummary(this.findMutableUserById(id)),
    );
  }

  async assignUserRoles(id: string, body: AssignUserRolesDto) {
    const user = this.findMutableUserById(id);
    assertSystemUserMutable(cloneSystemUserSummary(user));
    const roleCodes = normalizeAssignUserRolesInput(body);

    this.assertRoleCodes(roleCodes);
    user.roleCodes = [...roleCodes];

    return createUserRoleAssignment(cloneSystemUserSummary(user));
  }

  async getRoleUserAssignment(roleCode: string) {
    this.assertRoleCodes([roleCode]);
    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  async assignRoleUsers(roleCode: string, body: AssignRoleUsersDto) {
    this.assertRoleCodes([roleCode]);
    const userIds = normalizeAssignRoleUsersInput(body);
    const selectedUserIds = new Set(userIds);

    for (const userId of selectedUserIds) {
      const user = this.findMutableUserById(userId);

      if (user.system) {
        throw systemUserBadRequest(
          'SYSTEM_USER_ROLE_ASSIGN_SYSTEM_FORBIDDEN',
          'System users cannot be role-assigned.',
          { userId: user.id },
        );
      }
    }

    for (const user of this.users) {
      if (user.system) {
        continue;
      }

      if (selectedUserIds.has(user.id)) {
        user.roleCodes = [...new Set([...user.roleCodes, roleCode])].sort();
      } else {
        user.roleCodes = user.roleCodes.filter(
          (candidate) => candidate !== roleCode,
        );
      }
      user.updatedAt = new Date().toISOString();
    }

    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  private findMutableUserById(id: string): SystemUserRecord {
    const user = this.users.find((candidate) => candidate.id === id);

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

  private findUsersByIds(userIds: readonly string[]): SystemUserRecord[] {
    return userIds.map((userId) => this.findMutableUserById(userId));
  }

  private assertRoleCodes(roleCodes: readonly string[]): void {
    const missingRoleCode = roleCodes.find(
      (roleCode) => !this.roleCodes.has(roleCode),
    );

    if (missingRoleCode) {
      throw systemUserNotFound(
        'SYSTEM_USER_ROLE_NOT_FOUND',
        `Role not found: ${missingRoleCode}`,
        { roleCode: missingRoleCode },
      );
    }
  }

  private assertDeptId(deptId: string | null | undefined): void {
    if (!deptId) {
      return;
    }

    if (!this.deptIds.has(deptId)) {
      throw systemUserNotFound(
        'SYSTEM_USER_DEPT_NOT_FOUND',
        `System dept not found: ${deptId}`,
        { deptId },
      );
    }
  }

  private resolveDeptSubtreeIds(deptId: string): Set<string> {
    this.assertDeptId(deptId);

    const deptIds = new Set<string>([deptId]);
    const visit = (parentId: string) => {
      for (const childId of this.deptChildrenByParent.get(parentId) ?? []) {
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

  private assertPostCodes(postCodes: readonly string[]): void {
    const missingPostCode = postCodes.find(
      (postCode) => !this.postCodes.has(postCode),
    );

    if (missingPostCode) {
      throw systemUserNotFound(
        'SYSTEM_USER_POST_NOT_FOUND',
        `System post not found: ${missingPostCode}`,
        { postCode: missingPostCode },
      );
    }
  }
}

function createDeptChildrenByParent(): Map<string, string[]> {
  const childrenByParent = new Map<string, string[]>();

  for (const dept of seedSystemDepts) {
    if (!dept.parentId) {
      continue;
    }

    childrenByParent.set(dept.parentId, [
      ...(childrenByParent.get(dept.parentId) ?? []),
      dept.id,
    ]);
  }

  return childrenByParent;
}

function cloneUser(user: SystemUserRecord): SystemUserRecord {
  return {
    ...user,
    roleCodes: [...user.roleCodes],
    postCodes: [...user.postCodes],
  };
}

function matchesDataScope(
  user: SystemUserRecord,
  dataScope: ReturnType<typeof normalizeListSystemUsersQuery>['dataScope'],
): boolean {
  if (dataScope.type === 'all') {
    return true;
  }

  if (dataScope.type === 'none') {
    return false;
  }

  return (
    Boolean(dataScope.userIds?.includes(user.id)) ||
    Boolean(user.deptId && dataScope.deptIds?.includes(user.deptId))
  );
}
