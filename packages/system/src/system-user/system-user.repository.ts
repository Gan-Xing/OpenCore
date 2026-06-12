import { BadRequestException } from '@nestjs/common';
import type {
  AssignRoleUsersDto,
  CreateUserDto,
  ListUsersQueryDto,
  ResetUserPasswordDto,
  RoleUserAssignmentDto,
  SetUserStatusDto,
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

export type SystemUserListQuery = {
  deptId?: string;
};

export type SystemUserListFilters = {
  deptId?: string;
};

export type NormalizedSystemUserCreateInput = {
  username: string;
  displayName: string;
  password: string;
  roleCodes: readonly string[];
  deptId?: string;
  postCodes: readonly string[];
  enabled: boolean;
};

export type NormalizedSystemUserUpdateInput = {
  displayName?: string;
  password?: string;
  roleCodes?: readonly string[];
  deptId?: string | null;
  postCodes?: readonly string[];
  enabled?: boolean;
};

export type NormalizedSetUserStatusInput = {
  enabled: boolean;
};

export type NormalizedResetUserPasswordInput = {
  password: string;
};

const USERNAME_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemUserRepository {
  abstract listUsers(
    query?: SystemUserListQuery,
  ): Promise<SystemUserSummaryRecord[]>;

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
      'postCodes',
      'enabled',
      'system',
    ],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeListSystemUsersQuery(
  query: ListUsersQueryDto = {},
): SystemUserListFilters {
  return {
    deptId:
      query.deptId === undefined
        ? undefined
        : normalizeRequiredText(query.deptId, 'deptId'),
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
    postCodes: normalizePostCodes(body.postCodes),
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled') ?? true,
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
    postCodes:
      body.postCodes === undefined
        ? undefined
        : normalizePostCodes(body.postCodes),
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled'),
  };
}

export function normalizeSetUserStatusInput(
  body: SetUserStatusDto,
): NormalizedSetUserStatusInput {
  return {
    enabled: normalizeRequiredBoolean(body?.enabled, 'enabled'),
  };
}

export function normalizeResetUserPasswordInput(
  body: ResetUserPasswordDto,
): NormalizedResetUserPasswordInput {
  return {
    password: normalizeRequiredText(body?.password, 'password'),
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
    postCodes: [...user.postCodes],
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

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`System user ${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System user ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(
      `System user ${fieldName} must be a boolean.`,
    );
  }

  return value;
}

function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeRequiredBoolean(value, fieldName);
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

function normalizePostCodes(
  values: readonly string[] | undefined,
): readonly string[] {
  if (values === undefined) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw new BadRequestException('System user postCodes must be an array.');
  }

  const normalized = values.map((value) =>
    normalizeRequiredText(value, 'post code'),
  );
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System user post code is duplicated: ${duplicate}`,
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
