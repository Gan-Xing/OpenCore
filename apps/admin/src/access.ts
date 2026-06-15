import { shellPermissionCodes } from './core/shellRegistry';

type InitialState = {
  permissions?: readonly string[];
};

export default function access(initialState: InitialState = {}) {
  const permissions = new Set(initialState.permissions ?? []);
  const hasPermission = (permissionCode: string) =>
    permissions.has(permissionCode);

  return {
    canAccessDashboard: hasPermission('core:dashboard:read'),
    canReadOpenApiStatus: hasPermission('tool:openapi:read'),
    canReadUsers: hasPermission('core:user:read'),
    canAssignUserRoles: hasPermission('core:user:manage'),
    canExportUsers: hasPermission('core:user:export'),
    canImportUsers: hasPermission('core:user:import'),
    canReadRoles: hasPermission('core:role:read'),
    canReadPermissions: hasPermission('core:permission:read'),
    canReadMenus: hasPermission('core:menu:read'),
    canReadDicts: hasPermission('core:dict:read'),
    canReadSystemConfig: hasPermission('core:config:read'),
    canExportSystemConfig: hasPermission('core:config:export'),
    canReadSystemNotices: hasPermission('core:notice:read'),
    canReadDepartments: hasPermission('core:dept:read'),
    canReadPosts: hasPermission('core:post:read'),
    canReadFiles: hasPermission('core:file:read'),
    canReadAuditLogs: hasPermission('core:audit-log:read'),
    canDeleteAuditLogs: hasPermission('core:audit-log:delete'),
    canReadLoginLogs: hasPermission('core:login-log:read'),
    canDeleteLoginLogs: hasPermission('core:login-log:delete'),
    canManageLoginLogs: hasPermission('core:login-log:manage'),
    canReadSystemStatus: hasPermission('monitor:status:read'),
    canReadVersion: hasPermission('monitor:version:read'),
    canReadQueues: hasPermission('monitor:queue:read'),
    canManageQueues: hasPermission('monitor:queue:manage'),
    canReadExportTools: hasPermission('tool:export:read'),
    canReadOpenForge: hasPermission('tool:openforge:read'),
    canManageOpenForge: hasPermission('tool:openforge:manage'),
    canReadMessages: hasPermission('collaboration:message:read'),
    canReadNotices: hasPermission('collaboration:notice:read'),
    canReadTodos: hasPermission('collaboration:todo:read'),
    canReadApprovalLite: hasPermission('collaboration:approval-lite:read'),
    canReadJobs: hasPermission('monitor:job:read'),
    canUpdateJobs: hasPermission('monitor:job:update'),
    canManageJobs: hasPermission('monitor:job:manage'),
    canReadCache: hasPermission('monitor:cache:read'),
    canManageCache: hasPermission('monitor:cache:manage'),
    canReadOnlineUsers: hasPermission('monitor:online-user:read'),
    canManageOnlineUsers: hasPermission('monitor:online-user:manage'),
    canReadReports: hasPermission('optional:report:read'),
    canReadExportJobs: hasPermission('optional:export-job:read'),
    canReadIntegrationProviders: hasPermission('integration:provider:read'),
    canUpdateIntegrationProviders: hasPermission('integration:provider:update'),
    canManageIntegrationProviders: hasPermission('integration:provider:manage'),
    canReadMailIntegration: hasPermission('integration:mail:read'),
    canReadSmsIntegration: hasPermission('integration:sms:read'),
    canReadOAuthIntegration: hasPermission('integration:oauth:read'),
    canManageOAuthIntegration: hasPermission('integration:oauth:manage'),
    canReadWeChatIntegration: hasPermission('integration:wechat:read'),
    canReadWebSocketIntegration: hasPermission('integration:websocket:read'),
    canReadBillingDesign: hasPermission('integration:billing-design:read'),
    canReadHealth: hasPermission('core:dashboard:read'),
    hasAllShellPermissions: shellPermissionCodes.every((permissionCode) =>
      hasPermission(permissionCode),
    ),
  };
}
