export type RbacUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  enabled: boolean;
};

export type LoginAttemptRecord = {
  username: string;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  requestId: string;
};

export type UserSummaryRecord = Omit<RbacUserRecord, 'passwordHash'>;

export type CreateUserRecord = {
  username: string;
  displayName: string;
  password: string;
  roleCodes: readonly string[];
  enabled?: boolean;
};

export type UpdateUserRecord = {
  displayName?: string;
  password?: string;
  roleCodes?: readonly string[];
  enabled?: boolean;
};

export type RoleSummaryRecord = {
  id: string;
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system: boolean;
};

export type CreateRoleRecord = {
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system?: boolean;
};

export type UpdateRoleRecord = {
  name?: string;
  permissionCodes?: readonly string[];
  system?: boolean;
};

export type PermissionSummaryRecord = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
};

export type CreatePermissionRecord = {
  code: string;
  title: string;
};

export type UpdatePermissionRecord = {
  title?: string;
};

export type MenuSummaryRecord = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  stage: string;
  order: number;
};

export type CreateMenuRecord = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  order: number;
};

export type UpdateMenuRecord = {
  title?: string;
  path?: string;
  permissionCode?: string;
  order?: number;
};

export type RbacExportResource = 'menus' | 'permissions' | 'roles' | 'users';

export type RbacExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export abstract class RbacRepository {
  abstract listUsers(): Promise<UserSummaryRecord[]>;

  abstract createUser(body: CreateUserRecord): Promise<UserSummaryRecord>;

  abstract updateUser(
    id: string,
    body: UpdateUserRecord,
  ): Promise<UserSummaryRecord>;

  abstract deleteUser(id: string): Promise<{ deleted: true }>;

  abstract findUserByUsername(
    username: string,
  ): Promise<RbacUserRecord | undefined>;

  abstract findUserById(id: string): Promise<RbacUserRecord | undefined>;

  abstract listRoles(): Promise<RoleSummaryRecord[]>;

  abstract createRole(body: CreateRoleRecord): Promise<RoleSummaryRecord>;

  abstract updateRole(
    code: string,
    body: UpdateRoleRecord,
  ): Promise<RoleSummaryRecord>;

  abstract deleteRole(code: string): Promise<{ deleted: true }>;

  abstract listPermissions(): Promise<PermissionSummaryRecord[]>;

  abstract createPermission(
    body: CreatePermissionRecord,
  ): Promise<PermissionSummaryRecord>;

  abstract updatePermission(
    code: string,
    body: UpdatePermissionRecord,
  ): Promise<PermissionSummaryRecord>;

  abstract deletePermission(code: string): Promise<{ deleted: true }>;

  abstract listMenus(): Promise<MenuSummaryRecord[]>;

  abstract createMenu(body: CreateMenuRecord): Promise<MenuSummaryRecord>;

  abstract updateMenu(
    key: string,
    body: UpdateMenuRecord,
  ): Promise<MenuSummaryRecord>;

  abstract deleteMenu(key: string): Promise<{ deleted: true }>;

  abstract getPermissionCodesForUser(userId: string): Promise<string[]>;

  abstract createExportPreview(
    resource: RbacExportResource,
  ): Promise<RbacExportPreview>;

  abstract recordLoginAttempt(record: LoginAttemptRecord): Promise<void>;
}

export function createRbacExportPreview(
  resource: RbacExportResource,
  rows: readonly unknown[],
): RbacExportPreview {
  return {
    filename: `opencore-rbac-${resource}.csv`,
    scope: 'current-page',
    columns: [...exportColumnsByResource[resource]],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

const exportColumnsByResource = {
  menus: ['key', 'title', 'path', 'permissionCode', 'order'],
  permissions: ['code', 'title', 'stage', 'dangerous'],
  roles: ['code', 'name', 'permissionCodes', 'system'],
  users: ['username', 'displayName', 'roleCodes', 'enabled'],
} as const;
