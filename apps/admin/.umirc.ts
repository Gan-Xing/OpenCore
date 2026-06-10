import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'OpenCore Admin',
  },
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      component: './Dashboard',
      access: 'canAccessDashboard',
    },
    {
      name: 'OpenAPI',
      path: '/tools/openapi',
      component: './Tools/OpenApi',
      access: 'canReadOpenApiStatus',
    },
    {
      name: 'Users',
      path: '/system/users',
      component: './System/Users',
      access: 'canReadUsers',
    },
    {
      name: 'Roles',
      path: '/system/roles',
      component: './System/Roles',
      access: 'canReadRoles',
    },
    {
      name: 'Permissions',
      path: '/system/permissions',
      component: './System/Permissions',
      access: 'canReadPermissions',
    },
    {
      name: 'Menus',
      path: '/system/menus',
      component: './System/Menus',
      access: 'canReadMenus',
    },
    {
      name: 'Dictionaries',
      path: '/system/dicts',
      component: './System/Dicts',
      access: 'canReadDicts',
    },
    {
      name: 'System Config',
      path: '/system/config',
      component: './System/Config',
      access: 'canReadSystemConfig',
    },
    {
      name: 'File Center',
      path: '/system/files',
      component: './System/Files',
      access: 'canReadFiles',
    },
    {
      name: 'Login Logs',
      path: '/security/login-logs',
      component: './Security/LoginLogs',
      access: 'canReadLoginLogs',
    },
    {
      name: 'Operation Logs',
      path: '/security/operation-logs',
      component: './Security/OperationLogs',
      access: 'canReadAuditLogs',
    },
    {
      name: 'System Status',
      path: '/monitor/status',
      component: './Monitor/Status',
      access: 'canReadSystemStatus',
    },
    {
      name: 'Version',
      path: '/monitor/version',
      component: './Monitor/Version',
      access: 'canReadVersion',
    },
    {
      name: 'Queues',
      path: '/monitor/queues',
      component: './Monitor/Queues',
      access: 'canReadQueues',
    },
    {
      name: 'Export Tools',
      path: '/tools/export',
      component: './Tools/Export',
      access: 'canReadExportTools',
    },
    {
      path: '/403',
      component: './Exception/403',
    },
    {
      path: '/404',
      component: './Exception/404',
    },
    {
      path: '/500',
      component: './Exception/500',
    },
    {
      path: '*',
      component: './Exception/404',
    },
  ],
  npmClient: 'pnpm',
  utoopack: {},
});
