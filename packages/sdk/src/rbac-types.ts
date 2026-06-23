export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  postCodes: readonly string[];
  permissionCodes: readonly string[];
  accessMode: 'platform' | 'platform-visit' | 'tenant';
  activeTenant?: AuthenticatedTenant;
  activeMembership?: AuthenticatedMembership;
  enabledModuleCodes: readonly string[];
  tenantOptions: readonly TenantLoginOption[];
  avatarUrl?: string;
};

export type AuthenticatedTenant = {
  id: string;
  code: string;
  slug: string;
  name: string;
  status: string;
};

export type AuthenticatedMembership = {
  id: string;
  status: string;
  isOwner: boolean;
};

export type TenantLoginOption = AuthenticatedTenant & {
  membershipId: string;
  membershipStatus: string;
  isOwner: boolean;
};

export type LoginRequest = {
  username: string;
  password: string;
  tenantCode?: string;
  tenantHost?: string;
};

export type LoginResponse = {
  status: 'authenticated';
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

export type TenantSelectionLoginResponse = {
  status: 'tenant_selection_required';
  loginTicket: string;
  tenantOptions: readonly TenantLoginOption[];
};

export type LoginResult = LoginResponse | TenantSelectionLoginResponse;

export type SelectTenantRequest = {
  loginTicket: string;
  tenantId?: string;
  tenantCode?: string;
  membershipId?: string;
};

export type SwitchTenantRequest = {
  tenantId?: string;
  tenantCode?: string;
  membershipId?: string;
};

export type PlatformVisitTenantRequest = {
  tenantId?: string;
  tenantCode?: string;
  reason?: string;
};

export type LogoutResponse = {
  loggedOut: true;
};

export type SocialAuthProviderStatus = 'ready' | 'requires_configuration';
export type SocialAuthProviderIssue =
  | 'disabled'
  | 'missing_config'
  | 'placeholder_client'
  | 'secret_unverified'
  | 'unsupported_provider';
export type SocialAuthResultStatus =
  | 'authenticated'
  | 'failed'
  | 'requires_binding';

export type SocialAuthProviderSummary = {
  code: string;
  name: string;
  icon: string;
  status: SocialAuthProviderStatus;
  issue?: SocialAuthProviderIssue;
  message: string;
};

export type StartSocialAuthFlowRequest = {
  providerCode: string;
  redirect?: string;
};

export type SocialAuthFlowSummary = {
  providerCode: string;
  state: string;
  authorizationUrl: string;
  expiresAt: string;
};

export type CompleteSocialAuthRequest = {
  providerCode: string;
  state: string;
};

export type BindSocialAuthLoginRequest = CompleteSocialAuthRequest & {
  username: string;
  password: string;
};

export type SocialAuthResultSummary = {
  status: SocialAuthResultStatus;
  providerCode: string;
  providerAccountId?: string;
  message: string;
  session?: LoginResponse;
};

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  mobile?: string;
  email?: string;
  gender?: string;
  remark?: string;
  roleCodes: readonly string[];
  roleNames: readonly string[];
  deptId?: string;
  deptName?: string;
  postCodes: readonly string[];
  postNames: readonly string[];
  avatarUrl?: string;
  avatarMimeType?: string;
  avatarSizeBytes?: number;
  avatarUpdatedAt?: string;
  forcePasswordChange?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginLocation?: string;
  enabled: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserOptionSummary = Pick<
  UserSummary,
  'deptId' | 'displayName' | 'id' | 'postCodes' | 'username'
>;

export type UserProfileSummary = UserSummary;

export type UpdateUserProfileRequest = {
  displayName?: string;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
};

export type UploadUserAvatarRequest = FormData;

export type UpdateUserPasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type UserPasswordMutationSummary = {
  changed: true;
  revokedSessionCount: number;
};

export type UserProfileSessionSummary = {
  id: string;
  username: string;
  tokenId: string;
  tenantId?: string;
  membershipId?: string;
  accessMode?: 'platform' | 'platform-visit' | 'tenant';
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  current?: boolean;
};

export type UserProfileLoginActivitySummary = {
  id: string;
  username: string;
  logType:
    | 'login.mobile'
    | 'login.sms'
    | 'login.social'
    | 'login.username'
    | 'logout.force'
    | 'logout.self';
  result:
    | 'account_locked'
    | 'bad_credentials'
    | 'captcha_code_error'
    | 'captcha_not_found'
    | 'success'
    | 'user_disabled';
  success: boolean;
  failureReason?: string;
  actorUsername?: string;
  reason?: string;
  ip: string;
  location: string;
  userAgent: string;
  browser: string;
  os: string;
  requestId: string;
  createdAt: string;
};

export type UserProfileActivitySummary = {
  sessions: readonly UserProfileSessionSummary[];
  loginLogs: readonly UserProfileLoginActivitySummary[];
  currentTokenId: string;
};

export type UserProfileKickOutOtherSessionsSummary = {
  requested: number;
  kicked: number;
  skipped: number;
  items: readonly UserProfileSessionSummary[];
};

export type ListUsersRequest = {
  createdFrom?: string;
  createdTo?: string;
  deptId?: string;
  displayName?: string;
  email?: string;
  enabled?: boolean | string;
  mobile?: string;
  orderBy?: string;
  orderDirection?: string;
  page?: number;
  pageSize?: number;
  postCode?: string;
  roleCode?: string;
  username?: string;
};

export type UserPageSummary = {
  list: readonly UserSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateUserRequest = {
  username: string;
  displayName: string;
  password: string;
  mobile?: string | null;
  email?: string | null;
  gender?: string | null;
  remark?: string | null;
  roleCodes: readonly string[];
  deptId?: string | null;
  postCodes?: readonly string[];
  enabled?: boolean;
};

export type UpdateUserRequest = {
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
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  createdUsernames: readonly string[];
  updatedUsernames: readonly string[];
  updatedSessionUsernames: readonly string[];
  failures: readonly UserImportFailureSummary[];
  revokedSessionCount?: number;
};

export type ResetUserPasswordRequest = {
  password?: string | null;
};

export type UserMutationSummary = UserSummary & {
  revokedSessionCount?: number;
  temporaryPassword?: string;
};

export type UserRoleAssignmentSummary = Pick<
  UserSummary,
  'displayName' | 'roleCodes' | 'username'
> & {
  userId: string;
  revokedSessionCount?: number;
};

export type AssignUserRolesRequest = {
  roleCodes: readonly string[];
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
