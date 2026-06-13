import type {
  AssignRoleMenusRequest,
  AssignRoleUsersRequest,
  CreateMenuRequest,
  CreatePermissionRequest,
  CreateRoleRequest,
  CreateUserRequest,
  ListUsersRequest,
  LoginRequest,
  LoginResponse,
  MenuSummary,
  PermissionSummary,
  RbacDeleteResult,
  RbacExportPreview,
  ResetUserPasswordRequest,
  RoleMenuAssignmentSummary,
  RoleMutationSummary,
  RoleUserAssignmentSummary,
  RoleSummary,
  SetRoleStatusRequest,
  SetUserStatusRequest,
  UpdateMenuRequest,
  UpdatePermissionRequest,
  UpdateRoleRequest,
  UpdateUserProfileRequest,
  UpdateUserRequest,
  UserMutationSummary,
  UserProfileSummary,
  UserSummary,
} from './rbac-types';

export type SdkRequest = <T>(
  path: `/${string}`,
  options?: {
    method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
    body?: unknown;
    token?: string;
  },
) => Promise<T>;

export type RbacClient = {
  login: (request: LoginRequest) => Promise<LoginResponse>;
  me: (token: string) => Promise<LoginResponse>;
  listUsers: (
    token: string,
    query?: ListUsersRequest,
  ) => Promise<UserSummary[]>;
  exportUsers: (
    token: string,
    query?: ListUsersRequest,
  ) => Promise<RbacExportPreview>;
  getUserProfile: (token: string) => Promise<UserProfileSummary>;
  updateUserProfile: (
    token: string,
    body: UpdateUserProfileRequest,
  ) => Promise<UserProfileSummary>;
  getUser: (token: string, id: string) => Promise<UserSummary>;
  createUser: (token: string, body: CreateUserRequest) => Promise<UserSummary>;
  updateUser: (
    token: string,
    id: string,
    body: UpdateUserRequest,
  ) => Promise<UserMutationSummary>;
  setUserStatus: (
    token: string,
    id: string,
    body: SetUserStatusRequest,
  ) => Promise<UserMutationSummary>;
  resetUserPassword: (
    token: string,
    id: string,
    body: ResetUserPasswordRequest,
  ) => Promise<UserMutationSummary>;
  deleteUser: (token: string, id: string) => Promise<RbacDeleteResult>;
  listRoles: (token: string) => Promise<RoleSummary[]>;
  exportRoles: (token: string) => Promise<RbacExportPreview>;
  getRole: (token: string, code: string) => Promise<RoleSummary>;
  getRoleMenuAssignment: (
    token: string,
    code: string,
  ) => Promise<RoleMenuAssignmentSummary>;
  assignRoleMenus: (
    token: string,
    code: string,
    body: AssignRoleMenusRequest,
  ) => Promise<RoleMenuAssignmentSummary>;
  getRoleUserAssignment: (
    token: string,
    code: string,
  ) => Promise<RoleUserAssignmentSummary>;
  assignRoleUsers: (
    token: string,
    code: string,
    body: AssignRoleUsersRequest,
  ) => Promise<RoleUserAssignmentSummary>;
  createRole: (token: string, body: CreateRoleRequest) => Promise<RoleSummary>;
  updateRole: (
    token: string,
    code: string,
    body: UpdateRoleRequest,
  ) => Promise<RoleMutationSummary>;
  setRoleStatus: (
    token: string,
    code: string,
    body: SetRoleStatusRequest,
  ) => Promise<RoleMutationSummary>;
  deleteRole: (token: string, code: string) => Promise<RbacDeleteResult>;
  listPermissions: (token: string) => Promise<PermissionSummary[]>;
  exportPermissions: (token: string) => Promise<RbacExportPreview>;
  getPermission: (token: string, code: string) => Promise<PermissionSummary>;
  createPermission: (
    token: string,
    body: CreatePermissionRequest,
  ) => Promise<PermissionSummary>;
  updatePermission: (
    token: string,
    code: string,
    body: UpdatePermissionRequest,
  ) => Promise<PermissionSummary>;
  deletePermission: (token: string, code: string) => Promise<RbacDeleteResult>;
  listMenus: (token: string) => Promise<MenuSummary[]>;
  exportMenus: (token: string) => Promise<RbacExportPreview>;
  getMenu: (token: string, key: string) => Promise<MenuSummary>;
  createMenu: (token: string, body: CreateMenuRequest) => Promise<MenuSummary>;
  updateMenu: (
    token: string,
    key: string,
    body: UpdateMenuRequest,
  ) => Promise<MenuSummary>;
  deleteMenu: (token: string, key: string) => Promise<RbacDeleteResult>;
};

export function createRbacClient(request: SdkRequest): RbacClient {
  return {
    login: (body) =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body,
      }),
    me: (token) =>
      request<LoginResponse>('/auth/me', {
        token,
      }),
    listUsers: (token, query) =>
      request<UserSummary[]>(withQuery('/core/users', query), {
        token,
      }),
    exportUsers: (token, query) =>
      request<RbacExportPreview>(withQuery('/core/users/export', query), {
        token,
      }),
    getUserProfile: (token) =>
      request<UserProfileSummary>('/core/users/profile', {
        token,
      }),
    updateUserProfile: (token, body) =>
      request<UserProfileSummary>('/core/users/profile', {
        method: 'PATCH',
        body,
        token,
      }),
    getUser: (token, id) =>
      request<UserSummary>(`/core/users/${encodeURIComponent(id)}`, {
        token,
      }),
    createUser: (token, body) =>
      request<UserSummary>('/core/users', {
        method: 'POST',
        body,
        token,
      }),
    updateUser: (token, id, body) =>
      request<UserMutationSummary>(`/core/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    setUserStatus: (token, id, body) =>
      request<UserMutationSummary>(
        `/core/users/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    resetUserPassword: (token, id, body) =>
      request<UserMutationSummary>(
        `/core/users/${encodeURIComponent(id)}/reset-password`,
        {
          method: 'POST',
          body,
          token,
        },
      ),
    deleteUser: (token, id) =>
      request<RbacDeleteResult>(`/core/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }),
    listRoles: (token) =>
      request<RoleSummary[]>('/core/roles', {
        token,
      }),
    exportRoles: (token) =>
      request<RbacExportPreview>('/core/roles/export', {
        token,
      }),
    getRole: (token, code) =>
      request<RoleSummary>(`/core/roles/${encodeURIComponent(code)}`, {
        token,
      }),
    getRoleMenuAssignment: (token, code) =>
      request<RoleMenuAssignmentSummary>(
        `/core/roles/${encodeURIComponent(code)}/menus`,
        {
          token,
        },
      ),
    assignRoleMenus: (token, code, body) =>
      request<RoleMenuAssignmentSummary>(
        `/core/roles/${encodeURIComponent(code)}/menus`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    getRoleUserAssignment: (token, code) =>
      request<RoleUserAssignmentSummary>(
        `/core/roles/${encodeURIComponent(code)}/users`,
        {
          token,
        },
      ),
    assignRoleUsers: (token, code, body) =>
      request<RoleUserAssignmentSummary>(
        `/core/roles/${encodeURIComponent(code)}/users`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    createRole: (token, body) =>
      request<RoleSummary>('/core/roles', {
        method: 'POST',
        body,
        token,
      }),
    updateRole: (token, code, body) =>
      request<RoleMutationSummary>(`/core/roles/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    setRoleStatus: (token, code, body) =>
      request<RoleMutationSummary>(
        `/core/roles/${encodeURIComponent(code)}/status`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    deleteRole: (token, code) =>
      request<RbacDeleteResult>(`/core/roles/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      }),
    listPermissions: (token) =>
      request<PermissionSummary[]>('/core/permissions', {
        token,
      }),
    exportPermissions: (token) =>
      request<RbacExportPreview>('/core/permissions/export', {
        token,
      }),
    getPermission: (token, code) =>
      request<PermissionSummary>(
        `/core/permissions/${encodeURIComponent(code)}`,
        {
          token,
        },
      ),
    createPermission: (token, body) =>
      request<PermissionSummary>('/core/permissions', {
        method: 'POST',
        body,
        token,
      }),
    updatePermission: (token, code, body) =>
      request<PermissionSummary>(
        `/core/permissions/${encodeURIComponent(code)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    deletePermission: (token, code) =>
      request<RbacDeleteResult>(
        `/core/permissions/${encodeURIComponent(code)}`,
        {
          method: 'DELETE',
          token,
        },
      ),
    listMenus: (token) =>
      request<MenuSummary[]>('/core/menus', {
        token,
      }),
    exportMenus: (token) =>
      request<RbacExportPreview>('/core/menus/export', {
        token,
      }),
    getMenu: (token, key) =>
      request<MenuSummary>(`/core/menus/${encodeURIComponent(key)}`, {
        token,
      }),
    createMenu: (token, body) =>
      request<MenuSummary>('/core/menus', {
        method: 'POST',
        body,
        token,
      }),
    updateMenu: (token, key, body) =>
      request<MenuSummary>(`/core/menus/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body,
        token,
      }),
    deleteMenu: (token, key) =>
      request<RbacDeleteResult>(`/core/menus/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        token,
      }),
  };
}

function withQuery(path: `/${string}`, query: object = {}): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
