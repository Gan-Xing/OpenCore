import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type {
  AssignRoleUsersDto,
  BatchDeleteUsersDto,
  BatchSetUserStatusDto,
  CreateUserDto,
  ImportUsersDto,
  ListUsersQueryDto,
  ResetUserPasswordDto,
  RoleUserAssignmentDto,
  SetUserStatusDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
  UpdateUserDto,
} from './system-user.dto';
import { verifySystemUserPassword } from './system-user.password';
import type { SystemUserRecord } from './system-user.records';

export type SystemUserSummaryRecord = Omit<
  SystemUserRecord,
  'avatarStorageKey' | 'passwordHash'
>;
export type SystemUserAvatarRecord = Pick<
  SystemUserRecord,
  | 'avatarMimeType'
  | 'avatarSizeBytes'
  | 'avatarStorageKey'
  | 'avatarUpdatedAt'
  | 'avatarUrl'
>;
export type SystemUserAvatarUpdateInput = {
  avatarUrl: string;
  avatarStorageKey: string;
  avatarMimeType: string;
  avatarSizeBytes: number;
  avatarUpdatedAt: string;
};
export type SystemUserOptionRecord = Pick<
  SystemUserSummaryRecord,
  'deptId' | 'displayName' | 'id' | 'postCodes' | 'username'
>;

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

export type NormalizedSystemUserProfileUpdateInput = {
  displayName?: string;
};

export type NormalizedSystemUserPasswordUpdateInput = {
  oldPassword: string;
  newPassword: string;
};

export type NormalizedSetUserStatusInput = {
  enabled: boolean;
};

export type NormalizedBatchSetUserStatusInput = {
  userIds: readonly string[];
  enabled: boolean;
};

export type NormalizedBatchDeleteUsersInput = {
  userIds: readonly string[];
};

export type NormalizedResetUserPasswordInput = {
  password: string;
};

export type SystemUserBatchMutationRecord = {
  affected: number;
  userIds: readonly string[];
  usernames: readonly string[];
  enabled?: boolean;
  deleted?: true;
};

export type SystemUserImportTemplateRecord = {
  filename: string;
  contentType: string;
  contentBase64: string;
  columns: readonly string[];
  rowCount: number;
};

export type SystemUserImportCsvRecord = {
  rowNumber: number;
  values: Record<string, string>;
};

export type NormalizedSystemUserImportInput = {
  rowNumber: number;
  username: string;
  displayName: string;
  password?: string;
  roleCodes: readonly string[];
  deptId?: string;
  postCodes: readonly string[];
  enabled: boolean;
};

export type SystemUserImportFailureRecord = {
  rowNumber: number;
  username?: string;
  reason: string;
};

export type SystemUserImportResultRecord = {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  createdUsernames: readonly string[];
  updatedUsernames: readonly string[];
  failures: readonly SystemUserImportFailureRecord[];
  updatedSessionUsernames: readonly string[];
};

const USERNAME_PATTERN = /^[a-z][a-z0-9_.-]*$/;
const USER_IMPORT_MAX_BYTES = 262_144;
export const SYSTEM_USER_IMPORT_COLUMNS = [
  'username',
  'displayName',
  'password',
  'roleCodes',
  'deptId',
  'postCodes',
  'enabled',
] as const;

export abstract class SystemUserRepository {
  abstract listUsers(
    query?: SystemUserListQuery,
  ): Promise<SystemUserSummaryRecord[]>;

  abstract listUserOptions(
    query?: SystemUserListQuery,
  ): Promise<readonly SystemUserOptionRecord[]>;

  abstract getUser(id: string): Promise<SystemUserSummaryRecord>;

  abstract getUserAvatar(id: string): Promise<SystemUserAvatarRecord>;

  abstract createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord>;

  abstract updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<SystemUserSummaryRecord>;

  abstract updateUserProfile(
    id: string,
    body: UpdateUserProfileDto,
  ): Promise<SystemUserSummaryRecord>;

  abstract updateUserPassword(
    id: string,
    body: UpdateUserPasswordDto,
  ): Promise<SystemUserSummaryRecord>;

  abstract updateUserAvatar(
    id: string,
    input: SystemUserAvatarUpdateInput,
  ): Promise<SystemUserSummaryRecord>;

  abstract clearUserAvatar(id: string): Promise<SystemUserSummaryRecord>;

  abstract deleteUser(id: string): Promise<{ deleted: true }>;

  abstract setUsersStatus(
    body: BatchSetUserStatusDto,
  ): Promise<SystemUserBatchMutationRecord>;

  abstract deleteUsers(
    body: BatchDeleteUsersDto,
  ): Promise<SystemUserBatchMutationRecord>;

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

export function createSystemUserImportTemplate(): SystemUserImportTemplateRecord {
  const rows = [
    SYSTEM_USER_IMPORT_COLUMNS,
    [
      'operator_import',
      'Imported Operator',
      'ChangeMe-123456',
      'viewer',
      'dept_operations',
      'engineer',
      'true',
    ],
    [
      'auditor_import',
      'Imported Auditor',
      'ChangeMe-123456',
      'viewer',
      '',
      '',
      'false',
    ],
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');

  return {
    filename: 'opencore-system-users-import-template.csv',
    contentType: 'text/csv;charset=utf-8',
    contentBase64: Buffer.from(csv, 'utf8').toString('base64'),
    columns: SYSTEM_USER_IMPORT_COLUMNS,
    rowCount: rows.length - 1,
  };
}

export function parseSystemUserImportCsv(
  body: ImportUsersDto,
): readonly SystemUserImportCsvRecord[] {
  const contentBase64 = normalizeRequiredText(
    body?.contentBase64,
    'import contentBase64',
  );
  const normalizedBase64 = contentBase64.includes(',')
    ? contentBase64.slice(contentBase64.indexOf(',') + 1)
    : contentBase64;

  const trimmedBase64 = normalizedBase64.trim();

  if (
    trimmedBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmedBase64)
  ) {
    throw new BadRequestException('System user import content must be base64.');
  }

  const content = Buffer.from(trimmedBase64, 'base64');
  const canonical = content.toString('base64');

  if (
    content.byteLength === 0 ||
    canonical.replace(/=+$/, '') !== trimmedBase64.replace(/=+$/, '')
  ) {
    throw new BadRequestException(
      'System user import content must not be empty.',
    );
  }

  if (content.byteLength > USER_IMPORT_MAX_BYTES) {
    throw new BadRequestException(
      `System user import content must not exceed ${USER_IMPORT_MAX_BYTES} bytes.`,
    );
  }

  const csv = stripUtf8Bom(content.toString('utf8'));
  const rows = parseCsvRows(csv);

  if (rows.length < 2) {
    throw new BadRequestException(
      'System user import CSV must contain a header and at least one data row.',
    );
  }

  const headers = rows[0].map((header) => header.trim());
  const missingHeader = SYSTEM_USER_IMPORT_COLUMNS.find(
    (column) => !headers.includes(column),
  );

  if (missingHeader) {
    throw new BadRequestException(
      `System user import CSV is missing column: ${missingHeader}`,
    );
  }

  const records = rows
    .slice(1)
    .map((cells, index) => {
      const values: Record<string, string> = {};

      for (const column of SYSTEM_USER_IMPORT_COLUMNS) {
        const columnIndex = headers.indexOf(column);
        values[column] = cells[columnIndex]?.trim() ?? '';
      }

      return {
        rowNumber: index + 2,
        values,
      };
    })
    .filter((record) =>
      SYSTEM_USER_IMPORT_COLUMNS.some((column) => record.values[column]),
    );

  if (records.length === 0) {
    throw new BadRequestException(
      'System user import CSV must contain at least one non-empty data row.',
    );
  }

  return records;
}

export function normalizeSystemUserImportRecord(
  record: SystemUserImportCsvRecord,
): NormalizedSystemUserImportInput {
  return {
    rowNumber: record.rowNumber,
    username: normalizeUsername(record.values.username),
    displayName: normalizeRequiredText(
      record.values.displayName,
      'displayName',
    ),
    password: record.values.password
      ? normalizeRequiredText(record.values.password, 'password')
      : undefined,
    roleCodes: normalizeRoleCodes(splitImportCodes(record.values.roleCodes)),
    deptId: record.values.deptId
      ? normalizeOptionalDeptId(record.values.deptId)
      : undefined,
    postCodes: normalizePostCodes(splitImportCodes(record.values.postCodes)),
    enabled: normalizeImportBoolean(record.values.enabled),
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

export function normalizeUpdateSystemUserProfileInput(
  body: UpdateUserProfileDto,
): NormalizedSystemUserProfileUpdateInput {
  return {
    displayName:
      body.displayName === undefined
        ? undefined
        : normalizeRequiredText(body.displayName, 'displayName'),
  };
}

export function normalizeUpdateSystemUserPasswordInput(
  body: UpdateUserPasswordDto,
): NormalizedSystemUserPasswordUpdateInput {
  const oldPassword = normalizeRequiredText(body?.oldPassword, 'oldPassword');
  const newPassword = normalizeRequiredText(body?.newPassword, 'newPassword');

  if (oldPassword === newPassword) {
    throw new BadRequestException(
      'New password must be different from old password.',
    );
  }

  return {
    oldPassword,
    newPassword,
  };
}

export function normalizeSetUserStatusInput(
  body: SetUserStatusDto,
): NormalizedSetUserStatusInput {
  return {
    enabled: normalizeRequiredBoolean(body?.enabled, 'enabled'),
  };
}

export function normalizeBatchSetUserStatusInput(
  body: BatchSetUserStatusDto,
): NormalizedBatchSetUserStatusInput {
  return {
    userIds: normalizeBatchSystemUserIds(body?.userIds),
    enabled: normalizeRequiredBoolean(body?.enabled, 'enabled'),
  };
}

export function normalizeBatchDeleteUsersInput(
  body: BatchDeleteUsersDto,
): NormalizedBatchDeleteUsersInput {
  return {
    userIds: normalizeBatchSystemUserIds(body?.userIds),
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
    avatarUrl: user.avatarUrl,
    avatarMimeType: user.avatarMimeType,
    avatarSizeBytes: user.avatarSizeBytes,
    avatarUpdatedAt: user.avatarUpdatedAt,
    enabled: user.enabled,
    system: user.system,
  };
}

export function toSystemUserOptionRecord(
  user: SystemUserSummaryRecord,
): SystemUserOptionRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    deptId: user.deptId,
    postCodes: [...user.postCodes],
  };
}

export function assertSystemUserMutable(user: SystemUserSummaryRecord): void {
  if (user.system) {
    throw new BadRequestException('System users cannot be updated or deleted.');
  }
}

export function assertSystemUserPasswordChangeAllowed(
  passwordHash: string,
  input: NormalizedSystemUserPasswordUpdateInput,
): void {
  if (!verifySystemUserPassword(input.oldPassword, passwordHash)) {
    throw new UnauthorizedException('Current password is incorrect.');
  }

  if (verifySystemUserPassword(input.newPassword, passwordHash)) {
    throw new BadRequestException(
      'New password must be different from old password.',
    );
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

function normalizeImportBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (['1', 'enabled', 'true', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'disabled', 'false', 'no'].includes(normalized)) {
    return false;
  }

  throw new BadRequestException('System user enabled must be a boolean.');
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
    throw new BadRequestException('System user id must be a string.');
  }

  return normalizeRequiredText(value, 'user id');
}

function normalizeBatchSystemUserIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException('System userIds must be an array.');
  }

  if (value.length === 0) {
    throw new BadRequestException('System userIds must not be empty.');
  }

  const normalized = value.map((userId) => normalizeUserId(userId));
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(`System user id is duplicated: ${duplicate}`);
  }

  return [...normalized].sort();
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

function splitImportCodes(value: string): readonly string[] {
  const normalized = value.trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(';')
    .map((code) => code.trim())
    .filter(Boolean);
}

function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';

      if (char === '\r' && next === '\n') {
        index += 1;
      }

      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new BadRequestException(
      'System user import CSV has an unclosed quote.',
    );
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((candidate) =>
    candidate.some((candidateCell) => candidateCell.trim()),
  );
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
