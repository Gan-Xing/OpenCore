export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  enabled: boolean;
};

export type CreateUserRequest = {
  username: string;
  displayName: string;
  password: string;
  roleCodes: readonly string[];
  enabled?: boolean;
};

export type UpdateUserRequest = {
  displayName?: string;
  password?: string;
  roleCodes?: readonly string[];
  enabled?: boolean;
};

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system: boolean;
  dataScope: RoleDataScope;
  dataScopeDeptIds: readonly string[];
};

export type RoleDataScope =
  | 'all'
  | 'custom'
  | 'dept_tree'
  | 'own_dept'
  | 'self';

export type CreateRoleRequest = {
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system?: boolean;
  dataScope?: RoleDataScope;
  dataScopeDeptIds?: readonly string[];
};

export type UpdateRoleRequest = {
  name?: string;
  permissionCodes?: readonly string[];
  system?: boolean;
  dataScope?: RoleDataScope;
  dataScopeDeptIds?: readonly string[];
};

export type PermissionSummary = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
};

export type CreatePermissionRequest = {
  code: string;
  title: string;
};

export type UpdatePermissionRequest = {
  title?: string;
};

export type MenuSummary = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  stage: string;
  order: number;
};

export type CreateMenuRequest = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  order: number;
};

export type UpdateMenuRequest = {
  title?: string;
  path?: string;
  permissionCode?: string | null;
  order?: number;
};

export type RbacDeleteResult = {
  deleted: true;
};

export type RbacExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};
