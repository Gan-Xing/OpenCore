import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { seedSystemDepts } from '../system-dept/system-dept.records';
import { seedSystemPosts } from '../system-post/system-post.records';
import { seedSystemRoles } from '../system-role/system-role.records';
import {
  assertSystemUserMutable,
  cloneSystemUserSummary,
  compareSystemUserRecords,
  createRoleUserAssignment,
  normalizeCreateSystemUserInput,
  normalizeAssignRoleUsersInput,
  normalizeUpdateSystemUserInput,
  SystemUserRepository,
  type SystemUserSummaryRecord,
} from './system-user.repository';
import { hashSystemUserPassword } from './system-user.password';
import { seedSystemUsers, type SystemUserRecord } from './system-user.records';
import type { CreateUserDto, UpdateUserDto } from './system-user.dto';

@Injectable()
export class SeedSystemUserRepository extends SystemUserRepository {
  private users: SystemUserRecord[];
  private readonly roleCodes = new Set(
    seedSystemRoles.map((role) => role.code),
  );
  private readonly deptIds = new Set(seedSystemDepts.map((dept) => dept.id));
  private readonly postCodes = new Set(
    seedSystemPosts.map((post) => post.code),
  );

  constructor(users: readonly SystemUserRecord[] = seedSystemUsers) {
    super();
    this.users = users.map(cloneUser);
  }

  async listUsers(): Promise<SystemUserSummaryRecord[]> {
    return this.users
      .map(cloneSystemUserSummary)
      .sort(compareSystemUserRecords);
  }

  async getUser(id: string): Promise<SystemUserSummaryRecord> {
    return cloneSystemUserSummary(this.findMutableUserById(id));
  }

  async createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord> {
    const input = normalizeCreateSystemUserInput(body);

    if (this.users.some((user) => user.username === input.username)) {
      throw new ConflictException(`User already exists: ${input.username}`);
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

    return cloneSystemUserSummary(user);
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    const user = this.findMutableUserById(id);

    assertSystemUserMutable(user);

    this.users = this.users.filter((candidate) => candidate.id !== user.id);
    return { deleted: true };
  }

  async getRoleUserAssignment(roleCode: string) {
    this.assertRoleCodes([roleCode]);
    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  async assignRoleUsers(
    roleCode: string,
    body: { userIds: readonly string[] },
  ) {
    this.assertRoleCodes([roleCode]);
    const userIds = normalizeAssignRoleUsersInput(body);
    const selectedUserIds = new Set(userIds);

    for (const userId of selectedUserIds) {
      const user = this.findMutableUserById(userId);
      assertSystemUserMutable(cloneSystemUserSummary(user));
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
    }

    return createRoleUserAssignment(roleCode, await this.listUsers());
  }

  private findMutableUserById(id: string): SystemUserRecord {
    const user = this.users.find((candidate) => candidate.id === id);

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  private assertRoleCodes(roleCodes: readonly string[]): void {
    const missingRoleCode = roleCodes.find(
      (roleCode) => !this.roleCodes.has(roleCode),
    );

    if (missingRoleCode) {
      throw new NotFoundException(`Role not found: ${missingRoleCode}`);
    }
  }

  private assertDeptId(deptId: string | null | undefined): void {
    if (!deptId) {
      return;
    }

    if (!this.deptIds.has(deptId)) {
      throw new NotFoundException(`System dept not found: ${deptId}`);
    }
  }

  private assertPostCodes(postCodes: readonly string[]): void {
    const missingPostCode = postCodes.find(
      (postCode) => !this.postCodes.has(postCode),
    );

    if (missingPostCode) {
      throw new NotFoundException(`System post not found: ${missingPostCode}`);
    }
  }
}

function cloneUser(user: SystemUserRecord): SystemUserRecord {
  return {
    ...user,
    roleCodes: [...user.roleCodes],
    postCodes: [...user.postCodes],
  };
}
