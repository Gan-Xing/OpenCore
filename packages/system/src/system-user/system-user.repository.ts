import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import { unzipSync } from 'fflate';
import {
  createOpenCoreXlsxWorkbookBase64,
  OPENCORE_XLSX_CONTENT_TYPE,
} from '../export-xlsx';
import { seedSystemDepts } from '../system-dept/system-dept.records';
import { seedSystemPosts } from '../system-post/system-post.records';
import { seedSystemRoles } from '../system-role/system-role.records';
import type {
  AssignRoleUsersDto,
  AssignUserRolesDto,
  BatchDeleteUsersDto,
  BatchSetUserStatusDto,
  CreateUserDto,
  ImportUsersDto,
  ResetUserPasswordDto,
  RoleUserAssignmentDto,
  SetUserStatusDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
  UpdateUserDto,
  UserRoleAssignmentDto,
} from './system-user.dto';
import { verifySystemUserPassword } from './system-user.password';
import type { SystemUserRecord } from './system-user.records';

export type SystemUserSummaryRecord = Omit<
  SystemUserRecord,
  'avatarStorageKey' | 'passwordHash'
> & {
  deptName?: string;
  postNames: readonly string[];
  roleNames: readonly string[];
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginLocation?: string;
};
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
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemUserDataScopeFilter =
  | {
      type: 'all';
    }
  | {
      type: 'none';
    }
  | {
      type: 'restricted';
      userIds?: readonly string[];
      deptIds?: readonly string[];
    };

export type SystemUserListQuery = {
  createdFrom?: string;
  createdTo?: string;
  deptId?: string;
  displayName?: string;
  email?: string;
  enabled?: boolean | string;
  mobile?: string;
  orderBy?: string;
  orderDirection?: string;
  postCode?: string;
  roleCode?: string;
  username?: string;
  dataScope?: SystemUserDataScopeFilter;
};

export type SystemUserPageQuery = SystemUserListQuery & {
  page?: number | string;
  pageSize?: number | string;
};

export type SystemUserListFilters = {
  createdFrom?: Date;
  createdTo?: Date;
  deptId?: string;
  displayName?: string;
  email?: string;
  enabled?: boolean;
  mobile?: string;
  orderBy: SystemUserOrderBy;
  orderDirection: SystemUserOrderDirection;
  postCode?: string;
  roleCode?: string;
  username?: string;
  dataScope: SystemUserDataScopeFilter;
};

export type SystemUserOrderBy =
  | 'createdAt'
  | 'displayName'
  | 'email'
  | 'enabled'
  | 'mobile'
  | 'updatedAt'
  | 'username';
export type SystemUserOrderDirection = 'asc' | 'desc';

export type SystemUserPageFilters = SystemUserListFilters & {
  page: number;
  pageSize: number;
};

export type SystemUserPageRecord = {
  list: readonly SystemUserSummaryRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type NormalizedSystemUserCreateInput = {
  username: string;
  displayName: string;
  password: string;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  remark?: string | null;
  roleCodes: readonly string[];
  deptId?: string;
  postCodes: readonly string[];
  enabled: boolean;
};

export type NormalizedSystemUserUpdateInput = {
  displayName?: string;
  password?: string;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  remark?: string | null;
  roleCodes?: readonly string[];
  deptId?: string | null;
  postCodes?: readonly string[];
  enabled?: boolean;
  forcePasswordChange?: boolean;
};

export type NormalizedSystemUserProfileUpdateInput = {
  displayName?: string;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
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
  password?: string;
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
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  remark?: string | null;
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
  dryRun: boolean;
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
export const SYSTEM_USER_XLSX_CONTENT_TYPE = OPENCORE_XLSX_CONTENT_TYPE;
export const SYSTEM_USER_EXPORT_CONTENT_TYPE = SYSTEM_USER_XLSX_CONTENT_TYPE;
export const SYSTEM_USER_EXPORT_COLUMNS = [
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
] as const;
export const SYSTEM_USER_IMPORT_COLUMNS = [
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
] as const;

export abstract class SystemUserRepository {
  abstract listUsers(
    query?: SystemUserListQuery,
  ): Promise<SystemUserSummaryRecord[]>;

  abstract listUserPage(
    query?: SystemUserPageQuery,
  ): Promise<SystemUserPageRecord>;

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

  abstract getUserRoleAssignment(id: string): Promise<UserRoleAssignmentDto>;

  abstract assignUserRoles(
    id: string,
    body: AssignUserRolesDto,
  ): Promise<UserRoleAssignmentDto>;

  abstract getRoleUserAssignment(
    roleCode: string,
  ): Promise<RoleUserAssignmentDto>;

  abstract assignRoleUsers(
    roleCode: string,
    body: AssignRoleUsersDto,
  ): Promise<RoleUserAssignmentDto>;
}

export function systemUserBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemUserConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(createApiErrorBody({ code, message, details }));
}

export function systemUserNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

export function systemUserUnauthorized(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): UnauthorizedException {
  return new UnauthorizedException(
    createApiErrorBody({ code, message, details }),
  );
}

export function createSystemUserExportPreview(
  rows: readonly SystemUserSummaryRecord[],
): SystemUserExportPreview {
  const generatedAt = new Date().toISOString();

  return {
    filename: 'opencore-system-users.xlsx',
    contentType: SYSTEM_USER_EXPORT_CONTENT_TYPE,
    contentBase64: createOpenCoreXlsxWorkbookBase64({
      worksheetRows: createSystemUserExportWorksheetRows(rows),
      generatedAt,
      sheetName: 'Users',
    }),
    scope: 'current-page',
    columns: SYSTEM_USER_EXPORT_COLUMNS,
    rowCount: rows.length,
    generatedAt,
  };
}

function createSystemUserExportWorksheetRows(
  rows: readonly SystemUserSummaryRecord[],
): readonly (readonly string[])[] {
  return [
    SYSTEM_USER_EXPORT_COLUMNS,
    ...rows.map((row) => [
      row.username,
      row.displayName,
      row.mobile ?? '',
      row.email ?? '',
      row.gender ?? '',
      row.remark ?? '',
      row.roleCodes.join(', '),
      row.deptId ?? '',
      row.postCodes.join(', '),
      row.enabled ? 'true' : 'false',
      row.system ? 'true' : 'false',
      row.forcePasswordChange ? 'true' : 'false',
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt ?? '',
      row.lastLoginIp ?? '',
      row.lastLoginLocation ?? '',
    ]),
  ];
}

export function createSystemUserImportTemplate(): SystemUserImportTemplateRecord {
  const rows: readonly (readonly string[])[] = [
    SYSTEM_USER_IMPORT_COLUMNS,
    [
      'operator_import',
      'Imported Operator',
      'ChangeMe-123456',
      '+15551234567',
      'operator.import@opencore.local',
      'unknown',
      'Imported from the user template',
      'viewer',
      'dept_operations',
      'engineer',
      'true',
    ],
    [
      'auditor_import',
      'Imported Auditor',
      'ChangeMe-123456',
      '',
      'auditor.import@opencore.local',
      'unknown',
      '',
      'viewer',
      '',
      '',
      'false',
    ],
  ];

  return {
    filename: 'opencore-system-users-import-template.xlsx',
    contentType: SYSTEM_USER_XLSX_CONTENT_TYPE,
    contentBase64: createOpenCoreXlsxWorkbookBase64({
      worksheetRows: rows,
      generatedAt: new Date().toISOString(),
      sheetName: 'Users',
    }),
    columns: SYSTEM_USER_IMPORT_COLUMNS,
    rowCount: rows.length - 1,
  };
}

export function parseSystemUserImport(
  body: ImportUsersDto,
): readonly SystemUserImportCsvRecord[] {
  const content = decodeSystemUserImportContent(body);
  const isXlsx = isXlsxContent(content);
  const rows = isXlsx
    ? parseXlsxRows(content)
    : parseCsvRows(stripUtf8Bom(content.toString('utf8')));
  const label = isXlsx ? 'XLSX' : 'CSV';

  if (rows.length < 2) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_ROWS_REQUIRED',
      `System user import ${label} must contain a header and at least one data row.`,
      { format: label },
    );
  }

  const headers = rows[0].map((header) => header.trim());
  const missingHeader = SYSTEM_USER_IMPORT_COLUMNS.find(
    (column) => !headers.includes(column),
  );

  if (missingHeader) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_COLUMN_MISSING',
      `System user import ${label} is missing column: ${missingHeader}`,
      { column: missingHeader, format: label },
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
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_DATA_ROW_REQUIRED',
      `System user import ${label} must contain at least one non-empty data row.`,
      { format: label },
    );
  }

  return records;
}

export function parseSystemUserImportCsv(
  body: ImportUsersDto,
): readonly SystemUserImportCsvRecord[] {
  return parseSystemUserImport(body);
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
    mobile: record.values.mobile
      ? normalizeNullableMobile(record.values.mobile)
      : undefined,
    email: record.values.email
      ? normalizeNullableEmail(record.values.email)
      : undefined,
    gender: record.values.gender
      ? normalizeNullableGender(record.values.gender)
      : undefined,
    remark: record.values.remark
      ? normalizeNullableBoundedText(record.values.remark, 'remark', 500)
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
  query: SystemUserListQuery = {},
): SystemUserListFilters {
  return {
    createdFrom: normalizeOptionalDate(query.createdFrom, 'createdFrom'),
    createdTo: normalizeOptionalDate(query.createdTo, 'createdTo'),
    deptId:
      query.deptId === undefined
        ? undefined
        : normalizeRequiredText(query.deptId, 'deptId'),
    displayName:
      query.displayName === undefined
        ? undefined
        : (normalizeNullableText(query.displayName) ?? undefined),
    email:
      query.email === undefined
        ? undefined
        : (normalizeNullableText(query.email) ?? undefined),
    enabled: normalizeOptionalQueryBoolean(query.enabled, 'enabled'),
    mobile:
      query.mobile === undefined
        ? undefined
        : (normalizeNullableText(query.mobile) ?? undefined),
    orderBy: normalizeOrderBy(query.orderBy),
    orderDirection: normalizeOrderDirection(query.orderDirection),
    postCode:
      query.postCode === undefined
        ? undefined
        : normalizeRequiredText(query.postCode, 'postCode'),
    roleCode:
      query.roleCode === undefined
        ? undefined
        : normalizeRequiredText(query.roleCode, 'roleCode'),
    username:
      query.username === undefined
        ? undefined
        : (normalizeNullableText(query.username) ?? undefined),
    dataScope: normalizeSystemUserDataScopeFilter(query.dataScope),
  };
}

export function normalizeListSystemUsersPageQuery(
  query: SystemUserPageQuery = {},
): SystemUserPageFilters {
  return {
    ...normalizeListSystemUsersQuery(query),
    page: normalizeOptionalPositiveInteger(query.page, 'page', 1, 10_000),
    pageSize: normalizeOptionalPositiveInteger(
      query.pageSize,
      'pageSize',
      10,
      100,
    ),
  };
}

export function createSystemUserPageRecord(
  rows: readonly SystemUserSummaryRecord[],
  query?: SystemUserPageQuery,
): SystemUserPageRecord {
  const filters = normalizeListSystemUsersPageQuery(query);
  const start = (filters.page - 1) * filters.pageSize;

  return {
    list: rows.slice(start, start + filters.pageSize),
    total: rows.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function normalizeCreateSystemUserInput(
  body: CreateUserDto,
): NormalizedSystemUserCreateInput {
  return {
    username: normalizeUsername(body.username),
    displayName: normalizeRequiredText(body.displayName, 'displayName'),
    password: normalizeRequiredText(body.password, 'password'),
    mobile:
      body.mobile === undefined
        ? undefined
        : normalizeNullableMobile(body.mobile),
    email:
      body.email === undefined ? undefined : normalizeNullableEmail(body.email),
    gender:
      body.gender === undefined
        ? undefined
        : normalizeNullableGender(body.gender),
    remark:
      body.remark === undefined
        ? undefined
        : normalizeNullableBoundedText(body.remark, 'remark', 500),
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
    mobile:
      body.mobile === undefined
        ? undefined
        : normalizeNullableMobile(body.mobile),
    email:
      body.email === undefined ? undefined : normalizeNullableEmail(body.email),
    gender:
      body.gender === undefined
        ? undefined
        : normalizeNullableGender(body.gender),
    remark:
      body.remark === undefined
        ? undefined
        : normalizeNullableBoundedText(body.remark, 'remark', 500),
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
    forcePasswordChange: normalizeOptionalBoolean(
      body.forcePasswordChange,
      'forcePasswordChange',
    ),
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
    mobile:
      body.mobile === undefined
        ? undefined
        : normalizeNullableText(body.mobile),
    email:
      body.email === undefined ? undefined : normalizeNullableEmail(body.email),
    gender:
      body.gender === undefined
        ? undefined
        : normalizeNullableGender(body.gender),
  };
}

export function normalizeUpdateSystemUserPasswordInput(
  body: UpdateUserPasswordDto,
): NormalizedSystemUserPasswordUpdateInput {
  const oldPassword = normalizeRequiredText(body?.oldPassword, 'oldPassword');
  const newPassword = normalizeRequiredText(body?.newPassword, 'newPassword');

  if (oldPassword === newPassword) {
    throw systemUserBadRequest(
      'SYSTEM_USER_PASSWORD_UNCHANGED',
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
    password:
      body?.password === undefined ||
      body.password === null ||
      body.password === ''
        ? undefined
        : normalizeRequiredText(body.password, 'password'),
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
    mobile: user.mobile,
    email: user.email,
    gender: user.gender,
    remark: user.remark,
    roleCodes: [...user.roleCodes],
    roleNames: user.roleCodes.map((code) => getSeedRoleName(code)),
    deptId: user.deptId,
    deptName: user.deptId ? getSeedDeptName(user.deptId) : undefined,
    postCodes: [...user.postCodes],
    postNames: user.postCodes.map((code) => getSeedPostName(code)),
    avatarUrl: user.avatarUrl,
    avatarMimeType: user.avatarMimeType,
    avatarSizeBytes: user.avatarSizeBytes,
    avatarUpdatedAt: user.avatarUpdatedAt,
    forcePasswordChange: user.forcePasswordChange,
    enabled: user.enabled,
    system: user.system,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function getSeedRoleName(code: string): string {
  return seedSystemRoles.find((role) => role.code === code)?.name ?? code;
}

function getSeedDeptName(id: string): string {
  return seedSystemDepts.find((dept) => dept.id === id)?.name ?? id;
}

function getSeedPostName(code: string): string {
  return seedSystemPosts.find((post) => post.code === code)?.name ?? code;
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

export function assertSystemUserMutable(
  user: Pick<SystemUserRecord, 'id' | 'system'>,
): void {
  if (user.system) {
    throw systemUserBadRequest(
      'SYSTEM_USER_SYSTEM_IMMUTABLE',
      'System users cannot be updated or deleted.',
      { userId: user.id },
    );
  }
}

export function assertSystemUserPasswordChangeAllowed(
  passwordHash: string,
  input: NormalizedSystemUserPasswordUpdateInput,
): void {
  if (!verifySystemUserPassword(input.oldPassword, passwordHash)) {
    throw systemUserUnauthorized(
      'SYSTEM_USER_CURRENT_PASSWORD_INVALID',
      'Current password is incorrect.',
    );
  }

  if (verifySystemUserPassword(input.newPassword, passwordHash)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_PASSWORD_UNCHANGED',
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

export function createUserRoleAssignment(
  user: SystemUserSummaryRecord,
): UserRoleAssignmentDto {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    roleCodes: [...user.roleCodes],
  };
}

export function normalizeAssignUserRolesInput(
  body: AssignUserRolesDto,
): readonly string[] {
  const value = body?.roleCodes;

  if (!Array.isArray(value)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_ROLE_CODES_INVALID',
      'System user roleCodes must be an array.',
      { field: 'roleCodes' },
    );
  }

  return normalizeRoleCodes(value);
}

export function normalizeAssignRoleUsersInput(
  body: AssignRoleUsersDto,
): readonly string[] {
  const value = body?.userIds;

  if (!Array.isArray(value)) {
    throw systemUserBadRequest(
      'SYSTEM_ROLE_USER_IDS_INVALID',
      'System role userIds must be an array.',
      { field: 'userIds' },
    );
  }

  const normalized = value.map((userId) => normalizeUserId(userId));
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw systemUserBadRequest(
      'SYSTEM_ROLE_USER_ID_DUPLICATED',
      `System role user id is duplicated: ${duplicate}`,
      { userId: duplicate },
    );
  }

  return [...normalized].sort();
}

function normalizeUsername(value: string): string {
  const username = normalizeRequiredText(value, 'username');

  if (!USERNAME_PATTERN.test(username)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_USERNAME_INVALID',
      'System user username must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
      { field: 'username' },
    );
  }

  return username;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw systemUserBadRequest(
      'SYSTEM_USER_FIELD_INVALID_TYPE',
      `System user ${fieldName} must be a string.`,
      { field: fieldName, expected: 'string' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemUserBadRequest(
      'SYSTEM_USER_FIELD_REQUIRED',
      `System user ${fieldName} is required.`,
      { field: fieldName },
    );
  }

  return normalized;
}

function normalizeNullableText(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw systemUserBadRequest(
      'SYSTEM_USER_FIELD_INVALID_TYPE',
      'System user profile field must be a string.',
      { expected: 'string' },
    );
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNullableBoundedText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | null {
  const normalized = normalizeNullableText(value);

  if (normalized && normalized.length > maxLength) {
    throw systemUserBadRequest(
      'SYSTEM_USER_TEXT_TOO_LONG',
      `System user ${fieldName} must be at most ${maxLength} characters.`,
      { field: fieldName, maxLength },
    );
  }

  return normalized;
}

function normalizeNullableEmail(value: unknown): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return normalized;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_EMAIL_INVALID',
      'System user email is invalid.',
      { field: 'email' },
    );
  }

  return normalized;
}

function normalizeNullableMobile(value: unknown): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return normalized;
  }

  if (!/^\+?[0-9][0-9 ().-]{5,24}$/.test(normalized)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_MOBILE_INVALID',
      'System user mobile is invalid.',
      { field: 'mobile' },
    );
  }

  return normalized;
}

function normalizeNullableGender(value: unknown): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return normalized;
  }

  if (!['female', 'male', 'unknown'].includes(normalized)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_GENDER_INVALID',
      'System user gender must be female, male, or unknown.',
      { field: 'gender' },
    );
  }

  return normalized;
}

function normalizeOptionalDate(
  value: unknown,
  fieldName: string,
): Date | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw systemUserBadRequest(
      'SYSTEM_USER_DATE_INVALID_TYPE',
      `System user ${fieldName} must be an ISO date string.`,
      { field: fieldName },
    );
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw systemUserBadRequest(
      'SYSTEM_USER_DATE_INVALID',
      `System user ${fieldName} must be a valid ISO date string.`,
      { field: fieldName },
    );
  }

  return parsed;
}

function normalizeOptionalQueryBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    throw systemUserBadRequest(
      'SYSTEM_USER_BOOLEAN_INVALID',
      `System user ${fieldName} must be a boolean.`,
      { field: fieldName },
    );
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'enabled', 'true', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'disabled', 'false', 'no'].includes(normalized)) {
    return false;
  }

  throw systemUserBadRequest(
    'SYSTEM_USER_BOOLEAN_INVALID',
    `System user ${fieldName} must be a boolean.`,
    { field: fieldName },
  );
}

function normalizeOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  maxValue: number,
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxValue) {
    throw systemUserBadRequest(
      'SYSTEM_USER_PAGINATION_INVALID',
      `System user ${fieldName} must be an integer between 1 and ${maxValue}.`,
      { field: fieldName, maxValue },
    );
  }

  return parsed;
}

function normalizeOrderBy(value: unknown): SystemUserOrderBy {
  if (value === undefined || value === null || value === '') {
    return 'username';
  }

  if (
    [
      'createdAt',
      'displayName',
      'email',
      'enabled',
      'mobile',
      'updatedAt',
      'username',
    ].includes(String(value))
  ) {
    return String(value) as SystemUserOrderBy;
  }

  throw systemUserBadRequest(
    'SYSTEM_USER_ORDER_BY_INVALID',
    'System user orderBy is invalid.',
    { field: 'orderBy' },
  );
}

function normalizeOrderDirection(value: unknown): SystemUserOrderDirection {
  if (value === undefined || value === null || value === '') {
    return 'asc';
  }

  if (value === 'asc' || value === 'desc') {
    return value;
  }

  throw systemUserBadRequest(
    'SYSTEM_USER_ORDER_DIRECTION_INVALID',
    'System user orderDirection must be asc or desc.',
    { field: 'orderDirection' },
  );
}

function normalizeRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw systemUserBadRequest(
      'SYSTEM_USER_BOOLEAN_INVALID',
      `System user ${fieldName} must be a boolean.`,
      { field: fieldName },
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

  throw systemUserBadRequest(
    'SYSTEM_USER_ENABLED_INVALID',
    'System user enabled must be a boolean.',
    { field: 'enabled' },
  );
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
    throw systemUserBadRequest(
      'SYSTEM_USER_ID_INVALID_TYPE',
      'System user id must be a string.',
      { field: 'userId' },
    );
  }

  return normalizeRequiredText(value, 'user id');
}

function normalizeSystemUserDataScopeFilter(
  value: SystemUserDataScopeFilter | undefined,
): SystemUserDataScopeFilter {
  if (!value || value.type === 'all') {
    return { type: 'all' };
  }

  if (value.type === 'none') {
    return { type: 'none' };
  }

  if (value.type !== 'restricted') {
    throw systemUserBadRequest(
      'SYSTEM_USER_DATA_SCOPE_TYPE_INVALID',
      'System user data scope type is invalid.',
      { field: 'dataScope.type' },
    );
  }

  return {
    type: 'restricted',
    userIds: normalizeDataScopeIds(value.userIds ?? [], 'data scope user id'),
    deptIds: normalizeDataScopeIds(value.deptIds ?? [], 'data scope dept id'),
  };
}

function normalizeDataScopeIds(
  values: readonly string[],
  fieldName: string,
): readonly string[] {
  if (!Array.isArray(values)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_DATA_SCOPE_IDS_INVALID',
      `System user ${fieldName}s must be an array.`,
      { field: fieldName },
    );
  }

  const normalized = values.map((value) =>
    normalizeRequiredText(value, fieldName),
  );
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw systemUserBadRequest(
      'SYSTEM_USER_DATA_SCOPE_ID_DUPLICATED',
      `System user ${fieldName} is duplicated: ${duplicate}`,
      { field: fieldName, id: duplicate },
    );
  }

  return [...normalized].sort();
}

function normalizeBatchSystemUserIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IDS_INVALID',
      'System userIds must be an array.',
      { field: 'userIds' },
    );
  }

  if (value.length === 0) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IDS_EMPTY',
      'System userIds must not be empty.',
      { field: 'userIds' },
    );
  }

  const normalized = value.map((userId) => normalizeUserId(userId));
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw systemUserBadRequest(
      'SYSTEM_USER_ID_DUPLICATED',
      `System user id is duplicated: ${duplicate}`,
      { userId: duplicate },
    );
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
    throw systemUserBadRequest(
      'SYSTEM_USER_ROLE_CODE_DUPLICATED',
      `System user role code is duplicated: ${duplicate}`,
      { roleCode: duplicate },
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
    throw systemUserBadRequest(
      'SYSTEM_USER_POST_CODES_INVALID',
      'System user postCodes must be an array.',
      { field: 'postCodes' },
    );
  }

  const normalized = values.map((value) =>
    normalizeRequiredText(value, 'post code'),
  );
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw systemUserBadRequest(
      'SYSTEM_USER_POST_CODE_DUPLICATED',
      `System user post code is duplicated: ${duplicate}`,
      { postCode: duplicate },
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

function decodeSystemUserImportContent(body: ImportUsersDto): Buffer {
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
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_CONTENT_BASE64_INVALID',
      'System user import content must be base64.',
      { field: 'contentBase64' },
    );
  }

  const content = Buffer.from(trimmedBase64, 'base64');
  const canonical = content.toString('base64');

  if (
    content.byteLength === 0 ||
    canonical.replace(/=+$/, '') !== trimmedBase64.replace(/=+$/, '')
  ) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_CONTENT_EMPTY',
      'System user import content must not be empty.',
      { field: 'contentBase64' },
    );
  }

  if (content.byteLength > USER_IMPORT_MAX_BYTES) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_CONTENT_TOO_LARGE',
      `System user import content must not exceed ${USER_IMPORT_MAX_BYTES} bytes.`,
      { maxBytes: USER_IMPORT_MAX_BYTES },
    );
  }

  return content;
}

function isXlsxContent(content: Buffer): boolean {
  return content[0] === 0x50 && content[1] === 0x4b;
}

function parseXlsxRows(content: Buffer): string[][] {
  let files: Record<string, Uint8Array>;

  try {
    files = unzipSync(new Uint8Array(content));
  } catch {
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_XLSX_INVALID',
      'System user import XLSX must be a valid workbook.',
    );
  }

  const worksheet = files['xl/worksheets/sheet1.xml'];

  if (!worksheet) {
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_XLSX_SHEET_MISSING',
      'System user import XLSX must contain xl/worksheets/sheet1.xml.',
    );
  }

  return parseXlsxWorksheetRows(
    Buffer.from(worksheet).toString('utf8'),
    parseXlsxSharedStrings(files['xl/sharedStrings.xml']),
  );
}

function parseXlsxSharedStrings(sharedStrings?: Uint8Array): readonly string[] {
  if (!sharedStrings) {
    return [];
  }

  const xml = Buffer.from(sharedStrings).toString('utf8');
  const values: string[] = [];
  const stringPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let match: RegExpExecArray | null;

  while ((match = stringPattern.exec(xml))) {
    values.push(readXlsxTextNodes(match[1]));
  }

  return values;
}

function parseXlsxWorksheetRows(
  worksheetXml: string,
  sharedStrings: readonly string[],
): string[][] {
  const rows: string[][] = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(worksheetXml))) {
    const cells: string[] = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
    let cellMatch: RegExpExecArray | null;
    let fallbackIndex = 0;

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const columnIndex = getXlsxCellColumnIndex(cellMatch[1], fallbackIndex);
      cells[columnIndex] = parseXlsxCellValue(
        cellMatch[1],
        cellMatch[2],
        sharedStrings,
      );
      fallbackIndex = columnIndex + 1;
    }

    rows.push(cells.map((cell) => cell ?? ''));
  }

  return rows.filter((row) => row.some((cell) => cell.trim()));
}

function getXlsxCellColumnIndex(attrs: string, fallbackIndex: number): number {
  const reference = getXmlAttribute(attrs, 'r');
  const match = reference ? /^([A-Z]+)\d+$/i.exec(reference) : undefined;

  return match ? columnNameToIndex(match[1]) : fallbackIndex;
}

function parseXlsxCellValue(
  attrs: string,
  body: string,
  sharedStrings: readonly string[],
): string {
  const cellType = getXmlAttribute(attrs, 't');

  if (cellType === 'inlineStr') {
    return readXlsxTextNodes(body);
  }

  const rawValue = readXmlElementText(body, 'v');

  if (cellType === 's') {
    const sharedStringIndex =
      rawValue === undefined ? Number.NaN : Number.parseInt(rawValue, 10);
    return Number.isInteger(sharedStringIndex)
      ? (sharedStrings[sharedStringIndex] ?? '')
      : '';
  }

  if (cellType === 'b') {
    if (rawValue === '1') {
      return 'true';
    }

    if (rawValue === '0') {
      return 'false';
    }
  }

  if (rawValue !== undefined) {
    return rawValue;
  }

  return readXlsxTextNodes(body);
}

function readXlsxTextNodes(xml: string): string {
  const values: string[] = [];
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml))) {
    values.push(unescapeXml(match[1]));
  }

  return values.join('');
}

function readXmlElementText(xml: string, name: string): string | undefined {
  const pattern = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const match = pattern.exec(xml);

  return match ? unescapeXml(match[1]) : undefined;
}

function getXmlAttribute(attrs: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}="([^"]*)"`, 'i');
  const match = pattern.exec(attrs);

  return match ? unescapeXml(match[1]) : undefined;
}

function columnNameToIndex(name: string): number {
  let index = 0;

  for (const char of name.toUpperCase()) {
    index = index * 26 + char.charCodeAt(0) - 64;
  }

  return Math.max(index - 1, 0);
}

function unescapeXml(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|quot|apos|lt|gt|amp);/gi,
    (_entity, code: string) => {
      const normalizedCode = code.toLowerCase();

      switch (normalizedCode) {
        case 'quot':
          return '"';
        case 'apos':
          return "'";
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'amp':
          return '&';
        default:
          if (normalizedCode.startsWith('#x')) {
            return String.fromCodePoint(
              Number.parseInt(normalizedCode.slice(2), 16),
            );
          }

          return String.fromCodePoint(
            Number.parseInt(normalizedCode.slice(1), 10),
          );
      }
    },
  );
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
    throw systemUserBadRequest(
      'SYSTEM_USER_IMPORT_CSV_UNCLOSED_QUOTE',
      'System user import CSV has an unclosed quote.',
    );
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((candidate) =>
    candidate.some((candidateCell) => candidateCell.trim()),
  );
}
