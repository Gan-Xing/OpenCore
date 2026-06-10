import { shellPermissionCodes } from './core/shellRegistry';

type InitialState = {
  permissions?: string[];
};

export default (initialState: InitialState = {}) => {
  const permissions = new Set(initialState.permissions ?? shellPermissionCodes);
  const hasPermission = (permissionCode: string) =>
    permissions.has(permissionCode);

  return {
    canAccessDashboard: hasPermission('core:dashboard:read'),
    canReadOpenApiStatus: hasPermission('tool:openapi:read'),
    canReadHealth: hasPermission('core:dashboard:read'),
  };
};
