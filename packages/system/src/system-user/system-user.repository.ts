import { BadRequestException } from '@nestjs/common';
import type {
  AssignRoleUsersDto,
  CreateUserDto,
  RoleUserAssignmentDto,
  UpdateUserDto,
} from './system-user.dto';
import type { SystemUserRecord } from './system-user.records';

export type SystemUserSummaryRecord = Omit<SystemUserRecord, 'passwordHash'>;

export type SystemUserExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type NormalizedSystemUserCreateInput = {
  username: string;
  displayName: string;
  password: string;
  roleCodes: readonly string[];
  deptId?: string;
  enabled: boolean;
};

export type NormalizedSystemUserUpdateInput = {
  displayName?: string;
  password?: string;
  roleCodes?: readonly string[];
  deptId?: string | null;
  enabled?: boolean;
};

const USERNAME_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemUserRepository {
  abstract listUsers(): Promise<SystemUserSummaryRecord[]>;

  abstract getUser(id: string): Promise<SystemUserSummaryRecord>;

  abstract createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord>;

  abstract updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<SystemUserSummaryRecord>;

  abstract deleteUser(id: string): Promise<{ deleted: true }>;

  abstract getRoleUserAssignment(
    roleCode: string,
  ): Promise<RoleUserAssignmentDto>;

  abstract assignRoleUsers(
    roleCode: string,
    body: AssignRoleUsersDto,
  ): Promise<RoleUserAssignmentDto>;
}

export function createSystemUserExportPreview(
  rows: readonly unknown[],
): SystemUserExportPreview {
  return {
    filename: 'opencore-system-users.csv',
    scope: 'current-page',
    columns: [
      'username',
      'displayName',
      'roleCodes',
      'deptId',
      'enabled',
      'system',
    ],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeCreateSystemUserInput(
  body: CreateUserDto,
): NormalizedSystemUserCreateInput {
  return {
    username: normalizeUsername(body.username),
    displayName: normalizeRequiredText(body.displayName, 'displayName'),
    password: normalizeRequiredText(body.password, 'password'),
    roleCodes: normalizeRoleCodes(body.roleCodes),
    deptId: normalizeOptionalDeptId(body.deptId),
    enabled: body.enabled ?? true,
  };
}

export function normalizeUpdateSystemUserInput(
  body: UpdateUserDto,
): NormalizedSystemUserUpdateInput {
  return {
    displayName:
      body.displayName === undefined
        ? undefined
        : normalizeRequiredText(body.displayName, 'displayName'),
    password:
      body.password === undefined
        ? undefined
        : normalizeRequiredText(body.password, 'password'),
    roleCodes:
      body.roleCodes === undefined
        ? undefined
        : normalizeRoleCodes(body.roleCodes),
    deptId:
      body.deptId === undefined
        ? undefined
        : normalizeNullableDeptId(body.deptId),
    enabled: body.enabled,
  };
}

export function compareSystemUserRecords(
  left: SystemUserSummaryRecord,
  right: SystemUserSummaryRecord,
): number {
  return left.username.localeCompare(right.username);
}

export function cloneSystemUserSummary(
  user: SystemUserRecord,
): SystemUserSummaryRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roleCodes: [...user.roleCodes],
    deptId: user.deptId,
    enabled: user.enabled,
    system: user.system,
  };
}

export function assertSystemUserMutable(user: SystemUserSummaryRecord): void {
  if (user.system) {
    throw new BadRequestException('System users cannot be updated or deleted.');
  }
}

export function createRoleUserAssignment(
  roleCode: string,
  users: readonly SystemUserSummaryRecord[],
): RoleUserAssignmentDto {
  const mutableUsers = users.filter((user) => !user.system);
  const assignedUsers = mutableUsers
    .filter((user) => user.roleCodes.includes(roleCode))
    .sort(compareSystemUserRecords);
  const availableUsers = mutableUsers
    .filter((user) => !user.roleCodes.includes(roleCode))
    .sort(compareSystemUserRecords);

  return {
    roleCode,
    assignedUserIds: assignedUsers.map((user) => user.id),
    assignedUsers,
    availableUsers,
  };
}

export function normalizeAssignRoleUsersInput(
  body: AssignRoleUsersDto,
): readonly string[] {
  const value = body?.userIds;

  if (!Array.isArray(value)) {
    throw new BadRequestException('System role userIds must be an array.');
  }

  const normalized = value.map((userId) => normalizeUserId(userId));
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System role user id is duplicated: ${duplicate}`,
    );
  }

  return [...normalized].sort();
}

function normalizeUsername(value: string): string {
  const username = normalizeRequiredText(value, 'username');

  if (!USERNAME_PATTERN.test(username)) {
    throw new BadRequestException(
      'System user username must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
    );
  }

  return username;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System user ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeUserId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('System role user id must be a string.');
  }

  return normalizeRequiredText(value, 'user id');
}

function normalizeRoleCodes(
  values: readonly string[] | undefined,
): readonly string[] {
  const normalized = (values ?? []).map((value) =>
    normalizeRequiredText(value, 'role code'),
  );
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System user role code is duplicated: ${duplicate}`,
    );
  }

  return [...normalized].sort();
}

function normalizeOptionalDeptId(
  value: string | null | undefined,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return normalizeRequiredText(value, 'deptId');
}

function normalizeNullableDeptId(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return normalizeRequiredText(value, 'deptId');
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return undefined;
}
