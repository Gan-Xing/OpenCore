export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
  avatarUrl?: string;
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
  deptId?: string;
  postCodes: readonly string[];
  avatarUrl?: string;
  avatarMimeType?: string;
  avatarSizeBytes?: number;
  avatarUpdatedAt?: string;
  enabled: boolean;
  system: boolean;
};

export type UserOptionSummary = Pick<
  UserSummary,
  'deptId' | 'displayName' | 'id' | 'postCodes' | 'username'
>;

export type UserProfileSummary = UserSummary;

export type UpdateUserProfileRequest = {
  displayName?: string;
};

export type UploadUserAvatarRequest = {
  originalName: string;
  mimeType: string;
  contentBase64: string;
};

export type UpdateUserPasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type UserPasswordMutationSummary = {
  changed: true;
  revokedSessionCount: number;
};

export type ListUsersRequest = {
  deptId?: string;
};

export type CreateUserRequest = {
  username: string;
  displayName: string;
  password: string;
  roleCodes: readonly string[];
  deptId?: string | null;
  postCodes?: readonly string[];
  enabled?: boolean;
};

export type UpdateUserRequest = {
  displayName?: string;
  password?: string;
  roleCodes?: readonly string[];
  deptId?: string | null;
  postCodes?: readonly string[];
  enabled?: boolean;
};

export type SetUserStatusRequest = {
  enabled: boolean;
};

export type BatchSetUserStatusRequest = SetUserStatusRequest & {
  userIds: readonly string[];
};

export type BatchDeleteUsersRequest = {
  userIds: readonly string[];
};

export type UserImportTemplateSummary = {
  filename: string;
  contentType: string;
  contentBase64: string;
  columns: readonly string[];
  rowCount: number;
};

export type ImportUsersRequest = {
  contentBase64: string;
  updateExisting?: boolean;
};

export type UserImportFailureSummary = {
  rowNumber: number;
  username?: string;
  reason: string;
};

export type UserImportResultSummary = {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  createdUsernames: readonly string[];
  updatedUsernames: readonly string[];
  failures: readonly UserImportFailureSummary[];
  revokedSessionCount?: number;
};

export type ResetUserPasswordRequest = {
  password: string;
};

export type UserMutationSummary = UserSummary & {
  revokedSessionCount?: number;
};

export type BatchUserMutationSummary = {
  affected: number;
  userIds: readonly string[];
  enabled?: boolean;
  deleted?: true;
  revokedSessionCount?: number;
};

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
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
  enabled?: boolean;
  permissionCodes: readonly string[];
  system?: boolean;
  dataScope?: RoleDataScope;
  dataScopeDeptIds?: readonly string[];
};

export type UpdateRoleRequest = {
  name?: string;
  enabled?: boolean;
  permissionCodes?: readonly string[];
  system?: boolean;
  dataScope?: RoleDataScope;
  dataScopeDeptIds?: readonly string[];
};

export type AssignRoleMenusRequest = {
  menuKeys: readonly string[];
};

export type SetRoleStatusRequest = {
  enabled: boolean;
};

export type RoleMutationSummary = RoleSummary & {
  revokedSessionCount?: number;
};

export type RoleMenuAssignmentSummary = {
  roleCode: string;
  menuKeys: readonly string[];
  permissionCodes: readonly string[];
  preservedPermissionCodes: readonly string[];
  menus: readonly MenuSummary[];
  revokedSessionCount?: number;
};

export type AssignRoleUsersRequest = {
  userIds: readonly string[];
};

export type RoleUserAssignmentSummary = {
  roleCode: string;
  assignedUserIds: readonly string[];
  assignedUsers: readonly UserSummary[];
  availableUsers: readonly UserSummary[];
  revokedSessionCount?: number;
};

export type PermissionSummary = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
  system: boolean;
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
  parentKey?: string;
  title: string;
  type: MenuType;
  path: string;
  icon?: string;
  component?: string;
  permissionCode?: string;
  stage: string;
  order: number;
  status: MenuStatus;
  cache: boolean;
  hidden: boolean;
};

export type MenuType = 'directory' | 'menu';

export type MenuStatus = 'enabled' | 'disabled';

export type CreateMenuRequest = {
  key: string;
  parentKey?: string | null;
  title: string;
  type?: MenuType;
  path: string;
  icon?: string;
  component?: string;
  permissionCode?: string;
  order: number;
  status?: MenuStatus;
  cache?: boolean;
  hidden?: boolean;
};

export type UpdateMenuRequest = {
  parentKey?: string | null;
  title?: string;
  type?: MenuType;
  path?: string;
  icon?: string | null;
  component?: string | null;
  permissionCode?: string | null;
  order?: number;
  status?: MenuStatus;
  cache?: boolean;
  hidden?: boolean;
};

export type RbacDeleteResult = {
  deleted: true;
  revokedSessionCount?: number;
};

export type RbacExportPreview = {
  filename: string;
  contentType?: string;
  contentBase64?: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};
