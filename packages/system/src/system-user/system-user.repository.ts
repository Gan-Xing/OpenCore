import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { strToU8, unzipSync, zipSync } from 'fflate';
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
  contentType: string;
  contentBase64: string;
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
export const SYSTEM_USER_XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const SYSTEM_USER_EXPORT_CONTENT_TYPE = SYSTEM_USER_XLSX_CONTENT_TYPE;
export const SYSTEM_USER_EXPORT_COLUMNS = [
  'username',
  'displayName',
  'roleCodes',
  'deptId',
  'postCodes',
  'enabled',
  'system',
] as const;
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
  rows: readonly SystemUserSummaryRecord[],
): SystemUserExportPreview {
  const generatedAt = new Date().toISOString();

  return {
    filename: 'opencore-system-users.xlsx',
    contentType: SYSTEM_USER_EXPORT_CONTENT_TYPE,
    contentBase64: createSystemUserWorkbook(
      createSystemUserExportWorksheetRows(rows),
      generatedAt,
    ),
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
      row.roleCodes.join(', '),
      row.deptId ?? '',
      row.postCodes.join(', '),
      row.enabled ? 'true' : 'false',
      row.system ? 'true' : 'false',
    ]),
  ];
}

function createSystemUserWorkbook(
  worksheetRows: readonly (readonly string[])[],
  generatedAt: string,
): string {
  const workbook = zipSync(
    {
      '[Content_Types].xml': strToU8(createXlsxContentTypesXml()),
      '_rels/.rels': strToU8(createXlsxRootRelationshipsXml()),
      'docProps/app.xml': strToU8(createXlsxAppPropertiesXml()),
      'docProps/core.xml': strToU8(createXlsxCorePropertiesXml(generatedAt)),
      'xl/workbook.xml': strToU8(createXlsxWorkbookXml()),
      'xl/_rels/workbook.xml.rels': strToU8(
        createXlsxWorkbookRelationshipsXml(),
      ),
      'xl/styles.xml': strToU8(createXlsxStylesXml()),
      'xl/worksheets/sheet1.xml': strToU8(
        createXlsxWorksheetXml(worksheetRows),
      ),
    },
    { level: 6 },
  );

  return Buffer.from(workbook).toString('base64');
}

function createXlsxContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function createXlsxRootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function createXlsxAppPropertiesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>OpenCore</Application>
</Properties>`;
}

function createXlsxCorePropertiesXml(generatedAt: string): string {
  const timestamp = escapeXml(generatedAt);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>OpenCore</dc:creator>
  <cp:lastModifiedBy>OpenCore</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
}

function createXlsxWorkbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Users" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function createXlsxWorkbookRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function createXlsxStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;
}

function createXlsxWorksheetXml(rows: readonly (readonly string[])[]): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 1;
      const cellXml = row
        .map((value, columnIndex) =>
          createXlsxTextCell(columnIndex, excelRow, value, rowIndex === 0),
        )
        .join('');
      return `<row r="${excelRow}">${cellXml}</row>`;
    })
    .join('');
  const columnCount = Math.max(
    1,
    ...rows.map((row) => Math.max(row.length, 1)),
  );
  const lastRow = Math.max(rows.length, 1);
  const range = `A1:${columnIndexToName(columnCount - 1)}${lastRow}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${range}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="24" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
    <col min="3" max="3" width="24" customWidth="1"/>
    <col min="4" max="4" width="24" customWidth="1"/>
    <col min="5" max="5" width="24" customWidth="1"/>
    <col min="6" max="7" width="12" customWidth="1"/>
  </cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="${range}"/>
</worksheet>`;
}

function createXlsxTextCell(
  columnIndex: number,
  rowIndex: number,
  value: string,
  header: boolean,
): string {
  const style = header ? ' s="1"' : '';
  return `<c r="${columnIndexToName(columnIndex)}${rowIndex}" t="inlineStr"${style}><is><t>${escapeXml(value)}</t></is></c>`;
}

function columnIndexToName(index: number): string {
  let remaining = index + 1;
  let name = '';

  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    remaining = Math.floor((remaining - modulo) / 26);
  }

  return name;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createSystemUserImportTemplate(): SystemUserImportTemplateRecord {
  const rows: readonly (readonly string[])[] = [
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

  return {
    filename: 'opencore-system-users-import-template.xlsx',
    contentType: SYSTEM_USER_XLSX_CONTENT_TYPE,
    contentBase64: createSystemUserWorkbook(rows, new Date().toISOString()),
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
    throw new BadRequestException(
      `System user import ${label} must contain a header and at least one data row.`,
    );
  }

  const headers = rows[0].map((header) => header.trim());
  const missingHeader = SYSTEM_USER_IMPORT_COLUMNS.find(
    (column) => !headers.includes(column),
  );

  if (missingHeader) {
    throw new BadRequestException(
      `System user import ${label} is missing column: ${missingHeader}`,
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
      `System user import ${label} must contain at least one non-empty data row.`,
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
    throw new BadRequestException(
      'System user import XLSX must be a valid workbook.',
    );
  }

  const worksheet = files['xl/worksheets/sheet1.xml'];

  if (!worksheet) {
    throw new BadRequestException(
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
