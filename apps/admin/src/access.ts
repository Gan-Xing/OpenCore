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
    canReadUsers: hasPermission('core:user:read'),
    canReadRoles: hasPermission('core:role:read'),
    canReadPermissions: hasPermission('core:permission:read'),
    canReadMenus: hasPermission('core:menu:read'),
    canReadDicts: hasPermission('core:dict:read'),
    canReadSystemConfig: hasPermission('core:config:read'),
    canReadFiles: hasPermission('core:file:read'),
    canReadAuditLogs: hasPermission('core:audit-log:read'),
    canReadLoginLogs: hasPermission('core:login-log:read'),
    canReadSystemStatus: hasPermission('monitor:status:read'),
    canReadVersion: hasPermission('monitor:version:read'),
    canReadQueues: hasPermission('monitor:queue:read'),
    canReadExportTools: hasPermission('tool:export:read'),
    canReadHealth: hasPermission('core:dashboard:read'),
  };
};
