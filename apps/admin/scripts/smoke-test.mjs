import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
);
const workspaceLockfile = readFileSync(
  resolve(root, '../../pnpm-lock.yaml'),
  'utf8',
);
const deps = {
  ...(packageJson.devDependencies ?? {}),
  ...(packageJson.dependencies ?? {}),
};
const openapiScript = packageJson.scripts?.openapi ?? '';
const templatePlaceholder = (name) => `\${${name}}`;
const pathTemplatePlaceholder = templatePlaceholder('path');
const textTemplatePlaceholder = templatePlaceholder('text');
const resourceTemplatePlaceholder = templatePlaceholder('resource');

if (deps.mockjs || deps['@umijs/max-plugin-openapi']) {
  throw new Error(
    'Admin dependencies must not include mockjs or the Umi OpenAPI plugin.',
  );
}

if (
  /\bmockjs@/.test(workspaceLockfile) ||
  workspaceLockfile.includes('@umijs/openapi@') ||
  workspaceLockfile.includes('@umijs/max-plugin-openapi@')
) {
  throw new Error(
    'Workspace lockfile must not include the vulnerable mockjs OpenAPI generation chain.',
  );
}

if (
  openapiScript.includes('max openapi') ||
  !openapiScript.includes('openapi:export') ||
  !openapiScript.includes('sdk:check')
) {
  throw new Error(
    'Admin openapi script must use the root OpenCore OpenAPI export and SDK check.',
  );
}

const requiredVersions = {
  '@umijs/max': /^(\^)?4\./,
  '@ant-design/pro-components': /^(\^)?3\./,
  '@opencore/sdk': /^workspace:\*$/,
  antd: /^(\^)?6\./,
  react: /^(\^)?19\./,
  'react-dom': /^(\^)?19\./,
  '@opencore/module-registry': /^workspace:\*$/,
};

for (const [name, pattern] of Object.entries(requiredVersions)) {
  const version = deps[name];
  if (!version || !pattern.test(version)) {
    throw new Error(
      `Expected ${name} to match ${pattern}, received ${version ?? 'missing'}`,
    );
  }
}

const config = readFileSync(resolve(root, 'config/routes.ts'), 'utf8');
if (
  config.includes("path: '/welcome'") ||
  config.includes("path: '/admin'") ||
  config.includes("path: '/form'") ||
  config.includes("path: '/list'") ||
  config.includes("path: '/profile'") ||
  config.includes("path: '/result'") ||
  config.includes("path: '/account'") ||
  config.includes("path: '/chatbot'") ||
  config.includes("path: '/user/register'")
) {
  throw new Error(
    'Ant Design Pro demo routes must not be mounted in formal admin routes.',
  );
}

for (const requiredRoute of [
  "path: '/dashboard'",
  "path: '/personal/profile'",
  "path: '/tools/openapi'",
  "path: '/system/users'",
  "path: '/system/roles'",
  "path: '/system/permissions'",
  "path: '/system/menus'",
  "path: '/system/dicts'",
  "path: '/system/config'",
  "path: '/system/notices'",
  "path: '/system/depts'",
  "path: '/system/posts'",
  "path: '/system/files'",
  "path: '/security/login-logs'",
  "path: '/security/operation-logs'",
  "path: '/monitor/status'",
  "path: '/monitor/version'",
  "path: '/monitor/queues'",
  "path: '/tools/export'",
  "path: '/tools/openforge'",
  "path: '/collaboration/messages'",
  "path: '/collaboration/notices'",
  "path: '/collaboration/todos'",
  "path: '/collaboration/approvals'",
  "path: '/monitor/jobs'",
  "path: '/monitor/cache'",
  "path: '/monitor/online-users'",
  "path: '/optional/reports'",
  "path: '/optional/export-jobs'",
  "path: '/integrations/providers'",
  "path: '/integrations/mail'",
  "path: '/integrations/sms'",
  "path: '/integrations/oauth'",
  "path: '/integrations/wechat'",
  "path: '/integrations/websocket'",
  "path: '/integrations/billing-design'",
  "path: '/403'",
  "path: '/404'",
  "path: '/500'",
]) {
  if (!config.includes(requiredRoute)) {
    throw new Error(
      `Missing shell route in config/routes.ts: ${requiredRoute}`,
    );
  }
}

const appRuntime = readFileSync(resolve(root, 'src/app.tsx'), 'utf8');
if (
  !appRuntime.includes('queryCurrentOpenCoreUser') ||
  !appRuntime.includes('shellMenuItems') ||
  !appRuntime.includes('registrySummary') ||
  !appRuntime.includes('permissions: currentUser?.permissionCodes') ||
  !appRuntime.includes('baseURL: process.env.ADMIN_API_BASE_URL')
) {
  throw new Error(
    'Admin app runtime must use OpenCore auth, shell registry metadata and non-demo request base URL.',
  );
}

const proConfig = readFileSync(resolve(root, 'config/config.ts'), 'utf8');
const proxyConfig = readFileSync(resolve(root, 'config/proxy.ts'), 'utf8');
const loginPage = readFileSync(
  resolve(root, 'src/pages/user/login/index.tsx'),
  'utf8',
);
const requestConfig = readFileSync(
  resolve(root, 'src/requestErrorConfig.ts'),
  'utf8',
);
const authService = readFileSync(
  resolve(root, 'src/services/opencore/auth.ts'),
  'utf8',
);
const avatarDropdown = readFileSync(
  resolve(root, 'src/components/RightContent/AvatarDropdown.tsx'),
  'utf8',
);
const opencoreClientService = readFileSync(
  resolve(root, 'src/services/opencore/client.ts'),
  'utf8',
);
const opencorePlatformService = readFileSync(
  resolve(root, 'src/services/opencore/platform.ts'),
  'utf8',
);
const tokenService = readFileSync(
  resolve(root, 'src/services/opencore/token.ts'),
  'utf8',
);
const adminStaticServer = readFileSync(
  resolve(root, '../../tools/scripts/serve-admin-static.mjs'),
  'utf8',
);
const deployScript = readFileSync(
  resolve(root, '../../tools/scripts/deploy-local-opencore.sh'),
  'utf8',
);

if (
  proConfig.includes('oneapi.json') ||
  proConfig.includes('pro-api.ant-design-demo') ||
  proConfig.includes('preview.pro.ant.design') ||
  proConfig.includes('@umijs/max-plugin-openapi') ||
  proConfig.includes('openAPI:') ||
  proConfig.includes('schemaPath') ||
  proConfig.includes('mockjs') ||
  !proConfig.includes(
    "'process.env.ADMIN_API_BASE_URL': process.env.ADMIN_API_BASE_URL",
  )
) {
  throw new Error(
    'Admin config must avoid demo API schema, avoid the vulnerable Umi OpenAPI/mock pipeline and expose ADMIN_API_BASE_URL to the browser bundle.',
  );
}

if (
  proxyConfig.includes('pro-api.ant-design-demo') ||
  proxyConfig.includes('preview.pro.ant.design') ||
  !proxyConfig.includes('http://localhost:3000')
) {
  throw new Error('Admin proxy must target the local OpenCore API.');
}

if (
  !adminStaticServer.includes('retiredServiceWorkerBody') ||
  !adminStaticServer.includes("pathname === '/service-worker.js'") ||
  !adminStaticServer.includes('self.registration.unregister') ||
  !adminStaticServer.includes('no-store, max-age=0, must-revalidate') ||
  !adminStaticServer.includes('normalizeApiProxyPath')
) {
  throw new Error(
    'Admin static server must retire stale service workers, avoid caching runtime manifests and tolerate duplicate /api prefixes from stale bundles.',
  );
}

if (
  !deployScript.includes('verify_public_admin_bundle') ||
  !deployScript.includes('/api/api/auth/login') ||
  !deployScript.includes('admin.public-bundle.no-duplicate-api-prefix') ||
  !deployScript.includes('admin.api-proxy.duplicate-prefix-login')
) {
  throw new Error(
    'OpenCore deploy script must verify the public Admin bundle and keep stale /api/api login requests working through the proxy.',
  );
}

if (
  !loginPage.includes('loginToOpenCore') ||
  loginPage.includes('getFakeCaptcha') ||
  loginPage.includes('@/services/ant-design-pro')
) {
  throw new Error(
    'Admin login must call OpenCore auth and avoid demo login services.',
  );
}

if (
  !authService.includes('createRbacClient') ||
  !authService.includes('loginToOpenCore') ||
  !authService.includes('queryCurrentOpenCoreUser') ||
  !authService.includes('getOpenCoreUserProfile') ||
  !authService.includes('updateOpenCoreUserProfile') ||
  !authService.includes('updateOpenCoreUserAvatar') ||
  !authService.includes('deleteOpenCoreUserAvatar') ||
  !authService.includes('updateOpenCoreUserPassword') ||
  !authService.includes('getRequiredAdminToken') ||
  !authService.includes('avatar: user.avatarUrl')
) {
  throw new Error(
    'Admin auth service must use @opencore/sdk for login, current user and profile.',
  );
}

if (
  !avatarDropdown.includes("key: 'profile'") ||
  !avatarDropdown.includes("history.push('/personal/profile')") ||
  !avatarDropdown.includes('UserOutlined')
) {
  throw new Error('Admin avatar dropdown must expose the self-profile route.');
}

if (
  !opencoreClientService.includes(`/api${pathTemplatePlaceholder}`) ||
  !opencoreClientService.includes('opencoreSdkRequest') ||
  !opencoreClientService.includes('MissingAdminTokenError')
) {
  throw new Error(
    'Admin OpenCore SDK request helper must prefix /api and guard missing bearer tokens.',
  );
}

if (
  !opencorePlatformService.includes('createRbacClient') ||
  !opencorePlatformService.includes('createMonitoringClient') ||
  !opencorePlatformService.includes('createOperationsClient') ||
  !opencorePlatformService.includes('createSystemManagementClient') ||
  !opencorePlatformService.includes('listOpenCoreDicts') ||
  !opencorePlatformService.includes('getOpenCoreDict') ||
  !opencorePlatformService.includes('listOpenCoreDictDataOptions') ||
  !opencorePlatformService.includes('listOpenCoreDictItems') ||
  !opencorePlatformService.includes('createOpenCoreDict') ||
  !opencorePlatformService.includes('createOpenCoreDictItem') ||
  !opencorePlatformService.includes('updateOpenCoreDict') ||
  !opencorePlatformService.includes('updateOpenCoreDictItem') ||
  !opencorePlatformService.includes('deleteOpenCoreDict') ||
  !opencorePlatformService.includes('deleteOpenCoreDictItem') ||
  !opencorePlatformService.includes('listOpenCoreSystemConfig') ||
  !opencorePlatformService.includes('exportOpenCoreSystemConfig') ||
  !opencorePlatformService.includes('getOpenCoreSystemConfig') ||
  !opencorePlatformService.includes('getOpenCoreSystemConfigValue') ||
  !opencorePlatformService.includes('refreshOpenCoreSystemConfigCache') ||
  !opencorePlatformService.includes('createOpenCoreSystemConfig') ||
  !opencorePlatformService.includes('updateOpenCoreSystemConfig') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemConfig') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemConfigs') ||
  !opencorePlatformService.includes('listOpenCoreFiles') ||
  !opencorePlatformService.includes('getOpenCoreFile') ||
  !opencorePlatformService.includes('createOpenCoreFile') ||
  !opencorePlatformService.includes('uploadOpenCoreFile') ||
  !opencorePlatformService.includes('downloadOpenCoreFile') ||
  !opencorePlatformService.includes('updateOpenCoreFile') ||
  !opencorePlatformService.includes('deleteOpenCoreFile') ||
  !opencorePlatformService.includes('listOpenCoreAuditLogs') ||
  !opencorePlatformService.includes('getOpenCoreAuditLog') ||
  !opencorePlatformService.includes('listOpenCoreSystemDeptOptions') ||
  !opencorePlatformService.includes('listOpenCoreLoginLogs') ||
  !opencorePlatformService.includes('getOpenCoreLoginLog') ||
  !opencorePlatformService.includes('listOpenCoreOnlineUsers') ||
  !opencorePlatformService.includes('getOpenCoreOnlineUser') ||
  !opencorePlatformService.includes('kickOutOpenCoreOnlineUser') ||
  !opencorePlatformService.includes('listOpenCoreUsers') ||
  !opencorePlatformService.includes('listOpenCoreUserOptions') ||
  !opencorePlatformService.includes('getOpenCoreUser') ||
  !opencorePlatformService.includes('getOpenCoreUserRoleAssignment') ||
  !opencorePlatformService.includes('assignOpenCoreUserRoles') ||
  !opencorePlatformService.includes('createOpenCoreUser') ||
  !opencorePlatformService.includes('updateOpenCoreUser') ||
  !opencorePlatformService.includes('setOpenCoreUsersStatus') ||
  !opencorePlatformService.includes('deleteOpenCoreUser') ||
  !opencorePlatformService.includes('deleteOpenCoreUsers') ||
  !opencorePlatformService.includes('listOpenCoreRoles') ||
  !opencorePlatformService.includes('getOpenCoreRole') ||
  !opencorePlatformService.includes('getOpenCoreRoleMenuAssignment') ||
  !opencorePlatformService.includes('assignOpenCoreRoleMenus') ||
  !opencorePlatformService.includes('getOpenCoreRoleUserAssignment') ||
  !opencorePlatformService.includes('assignOpenCoreRoleUsers') ||
  !opencorePlatformService.includes('createOpenCoreRole') ||
  !opencorePlatformService.includes('updateOpenCoreRole') ||
  !opencorePlatformService.includes('setOpenCoreRoleStatus') ||
  !opencorePlatformService.includes('deleteOpenCoreRole') ||
  !opencorePlatformService.includes('listOpenCorePermissions') ||
  !opencorePlatformService.includes('getOpenCorePermission') ||
  !opencorePlatformService.includes('createOpenCorePermission') ||
  !opencorePlatformService.includes('updateOpenCorePermission') ||
  !opencorePlatformService.includes('deleteOpenCorePermission') ||
  !opencorePlatformService.includes('getOpenCoreSystemStatus') ||
  !opencorePlatformService.includes('listOpenCoreMenus') ||
  !opencorePlatformService.includes('getOpenCoreMenu') ||
  !opencorePlatformService.includes('createOpenCoreMenu') ||
  !opencorePlatformService.includes('updateOpenCoreMenu') ||
  !opencorePlatformService.includes('deleteOpenCoreMenu') ||
  !opencorePlatformService.includes('listOpenCoreSystemDepts') ||
  !opencorePlatformService.includes('createOpenCoreSystemDept') ||
  !opencorePlatformService.includes('updateOpenCoreSystemDept') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemDept') ||
  !opencorePlatformService.includes('listOpenCoreSystemPosts') ||
  !opencorePlatformService.includes('listOpenCoreSystemPostOptions') ||
  !opencorePlatformService.includes('getOpenCoreSystemPost') ||
  !opencorePlatformService.includes('createOpenCoreSystemPost') ||
  !opencorePlatformService.includes('updateOpenCoreSystemPost') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemPost') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemPosts') ||
  !opencorePlatformService.includes('listOpenCoreSystemNotices') ||
  !opencorePlatformService.includes('publishOpenCoreSystemNotice') ||
  !opencorePlatformService.includes('archiveOpenCoreSystemNotice')
) {
  throw new Error(
    'Admin platform service must expose live System, Notice and Monitor SDK clients.',
  );
}

if (
  !tokenService.includes('opencore.admin.token') ||
  !tokenService.includes('localStorage')
) {
  throw new Error(
    'Admin token storage must be centralized on the OpenCore token key.',
  );
}

if (
  !requestConfig.includes('Authorization') ||
  !requestConfig.includes('Bearer') ||
  !requestConfig.includes('x-request-id') ||
  !requestConfig.includes('x-trace-id') ||
  !requestConfig.includes("history.push('/403')") ||
  !requestConfig.includes('/user/login?redirect=')
) {
  throw new Error(
    'Admin request config must attach bearer/trace headers and handle 401/403.',
  );
}

const accessRuntime = readFileSync(resolve(root, 'src/access.ts'), 'utf8');
if (
  !accessRuntime.includes('core:dashboard:read') ||
  !accessRuntime.includes('tool:openapi:read') ||
  !accessRuntime.includes('core:user:read') ||
  !accessRuntime.includes('core:user:manage') ||
  !accessRuntime.includes('canAssignUserRoles') ||
  !accessRuntime.includes('core:user:import') ||
  !accessRuntime.includes('canImportUsers') ||
  !accessRuntime.includes('core:role:read') ||
  !accessRuntime.includes('core:permission:read') ||
  !accessRuntime.includes('core:menu:read') ||
  !accessRuntime.includes('core:dict:read') ||
  !accessRuntime.includes('core:config:read') ||
  !accessRuntime.includes('core:config:export') ||
  !accessRuntime.includes('canExportSystemConfig') ||
  !accessRuntime.includes('core:notice:read') ||
  !accessRuntime.includes('core:dept:read') ||
  !accessRuntime.includes('core:post:read') ||
  !accessRuntime.includes('core:file:read') ||
  !accessRuntime.includes('core:audit-log:read') ||
  !accessRuntime.includes('core:login-log:read') ||
  !accessRuntime.includes('monitor:status:read') ||
  !accessRuntime.includes('monitor:version:read') ||
  !accessRuntime.includes('monitor:queue:read') ||
  !accessRuntime.includes('tool:export:read') ||
  !accessRuntime.includes('tool:openforge:read') ||
  !accessRuntime.includes('collaboration:message:read') ||
  !accessRuntime.includes('collaboration:notice:read') ||
  !accessRuntime.includes('collaboration:todo:read') ||
  !accessRuntime.includes('collaboration:approval-lite:read') ||
  !accessRuntime.includes('monitor:job:read') ||
  !accessRuntime.includes('monitor:cache:read') ||
  !accessRuntime.includes('monitor:online-user:read') ||
  !accessRuntime.includes('monitor:online-user:manage') ||
  !accessRuntime.includes('optional:report:read') ||
  !accessRuntime.includes('optional:export-job:read') ||
  !accessRuntime.includes('integration:provider:read') ||
  !accessRuntime.includes('integration:mail:read') ||
  !accessRuntime.includes('integration:sms:read') ||
  !accessRuntime.includes('integration:oauth:read') ||
  !accessRuntime.includes('integration:wechat:read') ||
  !accessRuntime.includes('integration:websocket:read') ||
  !accessRuntime.includes('integration:billing-design:read')
) {
  throw new Error(
    'Admin access must guard shell, platform, collaboration, operations, and integration routes by permission code.',
  );
}

const shellRegistry = readFileSync(
  resolve(root, 'src/core/shellRegistry.ts'),
  'utf8',
);
if (
  !shellRegistry.includes('@opencore/module-registry') ||
  !shellRegistry.includes('core.dashboard') ||
  !shellRegistry.includes('tool.openapi') ||
  !shellRegistry.includes('core.user') ||
  !shellRegistry.includes('core.role') ||
  !shellRegistry.includes('core.permission') ||
  !shellRegistry.includes('core.menu') ||
  !shellRegistry.includes('core.dict') ||
  !shellRegistry.includes('core.config') ||
  !shellRegistry.includes('core.notice') ||
  !shellRegistry.includes('core.dept') ||
  !shellRegistry.includes('core.post') ||
  !shellRegistry.includes('core.file') ||
  !shellRegistry.includes('core.audit-log') ||
  !shellRegistry.includes('core.login-log') ||
  !shellRegistry.includes('monitor.status') ||
  !shellRegistry.includes('monitor.version') ||
  !shellRegistry.includes('monitor.queue') ||
  !shellRegistry.includes('tool.export') ||
  !shellRegistry.includes('tool.openforge') ||
  !shellRegistry.includes('collaboration.message') ||
  !shellRegistry.includes('collaboration.notice') ||
  !shellRegistry.includes('collaboration.todo') ||
  !shellRegistry.includes('collaboration.approval-lite') ||
  !shellRegistry.includes('monitor.job') ||
  !shellRegistry.includes('monitor.cache') ||
  !shellRegistry.includes('monitor.online-user') ||
  !shellRegistry.includes('optional.report') ||
  !shellRegistry.includes('optional.export-job') ||
  !shellRegistry.includes('integration.provider') ||
  !shellRegistry.includes('integration.mail') ||
  !shellRegistry.includes('integration.sms') ||
  !shellRegistry.includes('integration.oauth') ||
  !shellRegistry.includes('integration.wechat') ||
  !shellRegistry.includes('integration.websocket') ||
  !shellRegistry.includes('integration.billing-design')
) {
  throw new Error('Admin shell registry must consume module-registry entries.');
}

const usersPage = readFileSync(
  resolve(root, 'src/pages/System/Users.tsx'),
  'utf8',
);
const profilePage = readFileSync(
  resolve(root, 'src/pages/Personal/Profile.tsx'),
  'utf8',
);
const rolesPage = readFileSync(
  resolve(root, 'src/pages/System/Roles.tsx'),
  'utf8',
);
const rbacTable = readFileSync(
  resolve(root, 'src/pages/System/RbacTable.tsx'),
  'utf8',
);
const systemManagementTable = readFileSync(
  resolve(root, 'src/pages/System/SystemManagementTable.tsx'),
  'utf8',
);
const readOnlyDetailDrawer = readFileSync(
  resolve(root, 'src/pages/shared/ReadOnlyDetailDrawer.tsx'),
  'utf8',
);
const currentPageExportButton = readFileSync(
  resolve(root, 'src/pages/shared/CurrentPageExportButton.tsx'),
  'utf8',
);
const currentPageFilters = readFileSync(
  resolve(root, 'src/pages/shared/CurrentPageFilters.tsx'),
  'utf8',
);
const permissionsPage = readFileSync(
  resolve(root, 'src/pages/System/Permissions.tsx'),
  'utf8',
);
const menusPage = readFileSync(
  resolve(root, 'src/pages/System/Menus.tsx'),
  'utf8',
);
const dictsPage = readFileSync(
  resolve(root, 'src/pages/System/Dicts.tsx'),
  'utf8',
);
const configPage = readFileSync(
  resolve(root, 'src/pages/System/Config.tsx'),
  'utf8',
);
const systemNoticesPage = readFileSync(
  resolve(root, 'src/pages/System/Notices.tsx'),
  'utf8',
);
const departmentsPage = readFileSync(
  resolve(root, 'src/pages/System/Departments.tsx'),
  'utf8',
);
const postsPage = readFileSync(
  resolve(root, 'src/pages/System/Posts.tsx'),
  'utf8',
);
const filesPage = readFileSync(
  resolve(root, 'src/pages/System/Files.tsx'),
  'utf8',
);
const auditLogsPage = readFileSync(
  resolve(root, 'src/pages/Security/OperationLogs.tsx'),
  'utf8',
);
const loginLogsPage = readFileSync(
  resolve(root, 'src/pages/Security/LoginLogs.tsx'),
  'utf8',
);
const statusPage = readFileSync(
  resolve(root, 'src/pages/Monitor/Status.tsx'),
  'utf8',
);
const versionPage = readFileSync(
  resolve(root, 'src/pages/Monitor/Version.tsx'),
  'utf8',
);
const queuesPage = readFileSync(
  resolve(root, 'src/pages/Monitor/Queues.tsx'),
  'utf8',
);
const openApiPage = readFileSync(
  resolve(root, 'src/pages/Tools/OpenApi/index.tsx'),
  'utf8',
);
const exportPage = readFileSync(
  resolve(root, 'src/pages/Tools/Export/index.tsx'),
  'utf8',
);
const openForgePage = readFileSync(
  resolve(root, 'src/pages/Tools/OpenForge/index.tsx'),
  'utf8',
);
const messagesPage = readFileSync(
  resolve(root, 'src/pages/Collaboration/Messages.tsx'),
  'utf8',
);
const noticesPage = readFileSync(
  resolve(root, 'src/pages/Collaboration/Notices.tsx'),
  'utf8',
);
const todosPage = readFileSync(
  resolve(root, 'src/pages/Collaboration/Todos.tsx'),
  'utf8',
);
const approvalsPage = readFileSync(
  resolve(root, 'src/pages/Collaboration/Approvals.tsx'),
  'utf8',
);
const jobsPage = readFileSync(
  resolve(root, 'src/pages/Monitor/Jobs.tsx'),
  'utf8',
);
const cachePage = readFileSync(
  resolve(root, 'src/pages/Monitor/Cache.tsx'),
  'utf8',
);
const onlineUsersPage = readFileSync(
  resolve(root, 'src/pages/Monitor/OnlineUsers.tsx'),
  'utf8',
);
const reportsPage = readFileSync(
  resolve(root, 'src/pages/Optional/Reports.tsx'),
  'utf8',
);
const exportJobsPage = readFileSync(
  resolve(root, 'src/pages/Optional/ExportJobs.tsx'),
  'utf8',
);
const providersPage = readFileSync(
  resolve(root, 'src/pages/Integrations/Providers.tsx'),
  'utf8',
);
const mailPage = readFileSync(
  resolve(root, 'src/pages/Integrations/Mail.tsx'),
  'utf8',
);
const smsPage = readFileSync(
  resolve(root, 'src/pages/Integrations/Sms.tsx'),
  'utf8',
);
const oauthPage = readFileSync(
  resolve(root, 'src/pages/Integrations/OAuth.tsx'),
  'utf8',
);
const wechatPage = readFileSync(
  resolve(root, 'src/pages/Integrations/WeChat.tsx'),
  'utf8',
);
const websocketPage = readFileSync(
  resolve(root, 'src/pages/Integrations/WebSocket.tsx'),
  'utf8',
);
const billingDesignPage = readFileSync(
  resolve(root, 'src/pages/Integrations/BillingDesign.tsx'),
  'utf8',
);
if (
  !usersPage.includes('@opencore/sdk') ||
  !usersPage.includes('listOpenCoreUsers') ||
  !profilePage.includes('@opencore/sdk') ||
  !rolesPage.includes('@opencore/sdk') ||
  !permissionsPage.includes('@opencore/sdk') ||
  !menusPage.includes('@opencore/sdk') ||
  !dictsPage.includes('@opencore/sdk') ||
  !configPage.includes('@opencore/sdk') ||
  !systemNoticesPage.includes('@opencore/sdk') ||
  !departmentsPage.includes('@opencore/sdk') ||
  !postsPage.includes('@opencore/sdk') ||
  !filesPage.includes('@opencore/sdk') ||
  !auditLogsPage.includes('@opencore/sdk') ||
  !loginLogsPage.includes('@opencore/sdk') ||
  !statusPage.includes('@opencore/sdk') ||
  !statusPage.includes('getOpenCoreSystemStatus') ||
  !versionPage.includes('@opencore/sdk') ||
  !queuesPage.includes('@opencore/sdk') ||
  !openApiPage.includes('@opencore/sdk') ||
  !exportPage.includes('@opencore/sdk') ||
  !openForgePage.includes('OpenForge') ||
  !messagesPage.includes('@opencore/sdk') ||
  !noticesPage.includes('@opencore/sdk') ||
  !todosPage.includes('@opencore/sdk') ||
  !approvalsPage.includes('@opencore/sdk') ||
  !jobsPage.includes('@opencore/sdk') ||
  !cachePage.includes('@opencore/sdk') ||
  !onlineUsersPage.includes('@opencore/sdk') ||
  !reportsPage.includes('@opencore/sdk') ||
  !exportJobsPage.includes('@opencore/sdk') ||
  !providersPage.includes('@opencore/sdk') ||
  !mailPage.includes('@opencore/sdk') ||
  !smsPage.includes('@opencore/sdk') ||
  !oauthPage.includes('@opencore/sdk') ||
  !wechatPage.includes('@opencore/sdk') ||
  !websocketPage.includes('@opencore/sdk') ||
  !billingDesignPage.includes('@opencore/sdk')
) {
  throw new Error(
    'Admin platform, collaboration, operations, and integration pages must consume SDK types or fixtures.',
  );
}

if (
  !profilePage.includes('getOpenCoreUserProfile') ||
  !profilePage.includes('updateOpenCoreUserProfile') ||
  !profilePage.includes('updateOpenCoreUserAvatar') ||
  !profilePage.includes('deleteOpenCoreUserAvatar') ||
  !profilePage.includes('updateOpenCoreUserPassword') ||
  !profilePage.includes('Upload avatar') ||
  !profilePage.includes('Remove avatar') ||
  !profilePage.includes('Avatar updated.') ||
  !profilePage.includes('Avatar removed.') ||
  !profilePage.includes('avatarUrl') ||
  !profilePage.includes('AVATAR_ACCEPT') ||
  !profilePage.includes('Display name') ||
  !profilePage.includes('Change password') ||
  !profilePage.includes('Current password') ||
  !profilePage.includes('New password') ||
  !profilePage.includes('Confirm password') ||
  !profilePage.includes('removeAdminToken') ||
  !profilePage.includes('/user/login') ||
  !profilePage.includes('setInitialState') ||
  !profilePage.includes('Profile saved.') ||
  !profilePage.includes('Password changed.') ||
  !profilePage.includes('postCodes') ||
  !profilePage.includes('roleCodes')
) {
  throw new Error(
    'Admin personal profile page must load and update the authenticated OpenCore profile.',
  );
}

if (
  !usersPage.includes('listOpenCoreUsers') ||
  !usersPage.includes('getOpenCoreUser') ||
  !usersPage.includes('getOpenCoreUserRoleAssignment') ||
  !usersPage.includes('assignOpenCoreUserRoles') ||
  !usersPage.includes('createOpenCoreUser') ||
  !usersPage.includes('updateOpenCoreUser') ||
  !usersPage.includes('setOpenCoreUserStatus') ||
  !usersPage.includes('setOpenCoreUsersStatus') ||
  !usersPage.includes('resetOpenCoreUserPassword') ||
  !usersPage.includes('deleteOpenCoreUser') ||
  !usersPage.includes('deleteOpenCoreUsers') ||
  !usersPage.includes('listOpenCoreRoles') ||
  !usersPage.includes('listOpenCoreSystemDepts') ||
  !usersPage.includes('listOpenCoreSystemDeptOptions') ||
  !usersPage.includes('listOpenCoreSystemPostOptions') ||
  !usersPage.includes('getOpenCoreUserImportTemplate') ||
  !usersPage.includes('exportOpenCoreUsers') ||
  !usersPage.includes('importOpenCoreUsers') ||
  !usersPage.includes('useAccess') ||
  !usersPage.includes('canExportUsers') ||
  !usersPage.includes('canImportUsers') ||
  !usersPage.includes('canAssignUserRoles') ||
  !usersPage.includes('Missing core:user:export') ||
  !usersPage.includes('Missing core:user:import') ||
  !usersPage.includes('Missing core:user:manage') ||
  !usersPage.includes('Department scope') ||
  !usersPage.includes('All departments') ||
  !usersPage.includes('selectedDeptId') ||
  !usersPage.includes('deptFilterTreeData') ||
  !usersPage.includes('deptOptionTreeData') ||
  !usersPage.includes('postCodes') ||
  !usersPage.includes('Select posts') ||
  !usersPage.includes('Reset Password') ||
  !usersPage.includes('Enable selected') ||
  !usersPage.includes('Disable selected') ||
  !usersPage.includes('Delete selected') ||
  !usersPage.includes('Download Excel') ||
  !usersPage.includes('User Excel export downloaded') ||
  !usersPage.includes('Download import template') ||
  !usersPage.includes('Import users') ||
  !usersPage.includes('Update existing users') ||
  !usersPage.includes('Select CSV/XLSX file') ||
  !usersPage.includes('Assign Roles') ||
  !usersPage.includes('System users cannot be assigned roles') ||
  !usersPage.includes('assigningRoleUser') ||
  !usersPage.includes('formatImportSummary') ||
  !usersPage.includes('selectedUserIds') ||
  !usersPage.includes('rowSelection') ||
  !usersPage.includes('Revoked sessions') ||
  !usersPage.includes('useCurrentPageFilters') ||
  !usersPage.includes('CurrentPageExportButton') ||
  !usersPage.includes('dataSource={filteredRows}') ||
  !usersPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Users page must use live SDK CRUD with role/dept selectors, dedicated role assignment, department tree filtering, bounded filtering, backend Excel export, and current-page export.',
  );
}

if (
  !dictsPage.includes('listOpenCoreDicts') ||
  !dictsPage.includes('getOpenCoreDict') ||
  !dictsPage.includes('listOpenCoreDictDataOptions') ||
  !dictsPage.includes('listOpenCoreDictItems') ||
  !dictsPage.includes('createOpenCoreDict') ||
  !dictsPage.includes('createOpenCoreDictItem') ||
  !dictsPage.includes('updateOpenCoreDict') ||
  !dictsPage.includes('updateOpenCoreDictItem') ||
  !dictsPage.includes('deleteOpenCoreDict') ||
  !dictsPage.includes('deleteOpenCoreDictItem') ||
  !dictsPage.includes('Dictionary Items') ||
  !dictsPage.includes('New Item') ||
  !dictsPage.includes('simple-list consumer endpoint') ||
  !dictsPage.includes('Form.List') ||
  !dictsPage.includes('normalizeDictItems') ||
  !dictsPage.includes('useCurrentPageFilters') ||
  !dictsPage.includes('CurrentPageExportButton') ||
  !dictsPage.includes('dataSource={filteredRows}') ||
  !dictsPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Dictionaries page must use live SDK CRUD with item editing, bounded filtering and current-page export.',
  );
}

if (
  !configPage.includes('listOpenCoreSystemConfig') ||
  !configPage.includes('getOpenCoreSystemConfig') ||
  !configPage.includes('getOpenCoreSystemConfigValue') ||
  !configPage.includes('refreshOpenCoreSystemConfigCache') ||
  !configPage.includes('exportOpenCoreSystemConfig') ||
  !configPage.includes('Read public value by key') ||
  !configPage.includes('Refresh cache') ||
  !configPage.includes('canExportSystemConfig') ||
  !configPage.includes('Download Excel') ||
  !configPage.includes('Config Excel export downloaded') ||
  !configPage.includes('Missing core:config:export') ||
  !configPage.includes('Category') ||
  !configPage.includes('Name') ||
  !configPage.includes('Remark') ||
  !configPage.includes('category') ||
  !configPage.includes('remark') ||
  !configPage.includes('createOpenCoreSystemConfig') ||
  !configPage.includes('updateOpenCoreSystemConfig') ||
  !configPage.includes('deleteOpenCoreSystemConfig') ||
  !configPage.includes('deleteOpenCoreSystemConfigs') ||
  !configPage.includes('Delete selected') ||
  !configPage.includes('rowSelection') ||
  !configPage.includes('selectedRowKeys') ||
  !configPage.includes('selectedDeletableKeys') ||
  !configPage.includes('getCheckboxProps') ||
  !configPage.includes('record.system') ||
  !configPage.includes('System built-in configs cannot be deleted') ||
  !configPage.includes('preserveRedactedSecret') ||
  !configPage.includes('useCurrentPageFilters') ||
  !configPage.includes('CurrentPageExportButton') ||
  !configPage.includes('dataSource={filteredRows}') ||
  !configPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'System Config page must use live SDK CRUD with redacted secret preservation, bounded filtering, system deletion guards and current-page export.',
  );
}

if (
  !filesPage.includes('listOpenCoreFiles') ||
  !filesPage.includes('getOpenCoreFile') ||
  !filesPage.includes('uploadOpenCoreFile') ||
  !filesPage.includes('downloadOpenCoreFile') ||
  !filesPage.includes('updateOpenCoreFile') ||
  !filesPage.includes('deleteOpenCoreFile') ||
  !filesPage.includes('Choose file') ||
  !filesPage.includes('Upload File') ||
  !filesPage.includes('DownloadOutlined') ||
  !filesPage.includes('useCurrentPageFilters') ||
  !filesPage.includes('CurrentPageExportButton') ||
  !filesPage.includes('dataSource={filteredRows}') ||
  !filesPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Files page must use live SDK upload/download with bounded filtering and current-page export.',
  );
}

if (
  !auditLogsPage.includes('listOpenCoreAuditLogs') ||
  !auditLogsPage.includes('getOpenCoreAuditLog') ||
  !auditLogsPage.includes('useCurrentPageFilters') ||
  !auditLogsPage.includes('CurrentPageExportButton') ||
  !auditLogsPage.includes('dataSource={filteredRows}') ||
  !auditLogsPage.includes('rows={filteredRows}') ||
  !auditLogsPage.includes('Read-only audit trail') ||
  !auditLogsPage.includes('jsonSections=')
) {
  throw new Error(
    'Operation Logs page must use live SDK detail/list with bounded filtering, metadata detail and current-page export.',
  );
}

if (
  !loginLogsPage.includes('listOpenCoreLoginLogs') ||
  !loginLogsPage.includes('getOpenCoreLoginLog') ||
  !loginLogsPage.includes('useCurrentPageFilters') ||
  !loginLogsPage.includes('CurrentPageExportButton') ||
  !loginLogsPage.includes('dataSource={filteredRows}') ||
  !loginLogsPage.includes('rows={filteredRows}') ||
  !loginLogsPage.includes('Read-only audit trail') ||
  !loginLogsPage.includes('serverFilterToolbar') ||
  !loginLogsPage.includes('createdFrom') ||
  !loginLogsPage.includes('createdTo') ||
  !loginLogsPage.includes('Browser') ||
  !loginLogsPage.includes('OS')
) {
  throw new Error(
    'Login Logs page must use live SDK detail/list with server-side filters, device fields and current-page export.',
  );
}

if (
  !rolesPage.includes('listOpenCoreRoles') ||
  !rolesPage.includes('getOpenCoreRole') ||
  !rolesPage.includes('getOpenCoreRoleMenuAssignment') ||
  !rolesPage.includes('assignOpenCoreRoleMenus') ||
  !rolesPage.includes('getOpenCoreRoleUserAssignment') ||
  !rolesPage.includes('assignOpenCoreRoleUsers') ||
  !rolesPage.includes('listOpenCoreUserOptions') ||
  !rolesPage.includes('userOptionById') ||
  !rolesPage.includes('listOpenCoreMenus') ||
  !rolesPage.includes('createOpenCoreRole') ||
  !rolesPage.includes('updateOpenCoreRole') ||
  !rolesPage.includes('setOpenCoreRoleStatus') ||
  !rolesPage.includes('deleteOpenCoreRole') ||
  !rolesPage.includes('Revoked sessions') ||
  !rolesPage.includes('StopOutlined') ||
  !rolesPage.includes('CheckCircleOutlined') ||
  !rolesPage.includes('checkedMenuKeys') ||
  !rolesPage.includes('assignedUserIds') ||
  !rolesPage.includes('<Tree') ||
  !rolesPage.includes('<Transfer') ||
  !rolesPage.includes('listOpenCorePermissions') ||
  !rolesPage.includes('listOpenCoreSystemDepts') ||
  !rolesPage.includes('useCurrentPageFilters') ||
  !rolesPage.includes('CurrentPageExportButton') ||
  !rolesPage.includes('dataSource={filteredRows}') ||
  !rolesPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Roles page must use live SDK CRUD with bounded filtering and current-page export.',
  );
}

if (
  !permissionsPage.includes('listOpenCorePermissions') ||
  !permissionsPage.includes('getOpenCorePermission') ||
  !permissionsPage.includes('createOpenCorePermission') ||
  !permissionsPage.includes('updateOpenCorePermission') ||
  !permissionsPage.includes('deleteOpenCorePermission') ||
  !permissionsPage.includes('useCurrentPageFilters') ||
  !permissionsPage.includes('CurrentPageExportButton') ||
  !permissionsPage.includes('dataSource={filteredRows}') ||
  !permissionsPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Permissions page must use live SDK CRUD with bounded filtering and current-page export.',
  );
}

if (
  !departmentsPage.includes('listOpenCoreSystemDepts') ||
  !departmentsPage.includes('getOpenCoreSystemDept') ||
  !departmentsPage.includes('createOpenCoreSystemDept') ||
  !departmentsPage.includes('updateOpenCoreSystemDept') ||
  !departmentsPage.includes('deleteOpenCoreSystemDept') ||
  !departmentsPage.includes('flattenDeptTree') ||
  !departmentsPage.includes('buildDeptTree') ||
  !departmentsPage.includes('TreeSelect') ||
  !departmentsPage.includes('useCurrentPageFilters') ||
  !departmentsPage.includes('CurrentPageExportButton') ||
  !departmentsPage.includes('dataSource={filteredTreeRows}') ||
  !departmentsPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Departments page must use live SDK tree CRUD with bounded filtering and current-page export.',
  );
}

if (
  !postsPage.includes('listOpenCoreSystemPosts') ||
  !postsPage.includes('getOpenCoreSystemPost') ||
  !postsPage.includes('createOpenCoreSystemPost') ||
  !postsPage.includes('updateOpenCoreSystemPost') ||
  !postsPage.includes('deleteOpenCoreSystemPost') ||
  !postsPage.includes('deleteOpenCoreSystemPosts') ||
  !postsPage.includes('selectedPostCodes') ||
  !postsPage.includes('rowSelection') ||
  !postsPage.includes('Delete selected') ||
  !postsPage.includes('useCurrentPageFilters') ||
  !postsPage.includes('CurrentPageExportButton') ||
  !postsPage.includes('dataSource={filteredRows}') ||
  !postsPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Posts page must use live SDK CRUD and batch deletion with bounded filtering and current-page export.',
  );
}

if (
  !menusPage.includes('listOpenCoreMenus') ||
  !menusPage.includes('getOpenCoreMenu') ||
  !menusPage.includes('createOpenCoreMenu') ||
  !menusPage.includes('updateOpenCoreMenu') ||
  !menusPage.includes('deleteOpenCoreMenu') ||
  !menusPage.includes('buildMenuTree') ||
  !menusPage.includes('flattenMenuTree') ||
  !menusPage.includes('TreeSelect') ||
  !menusPage.includes('parentTreeData') ||
  !menusPage.includes('useCurrentPageFilters') ||
  !menusPage.includes('CurrentPageExportButton') ||
  !menusPage.includes('dataSource={filteredTreeRows}') ||
  !menusPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Menus page must use live SDK tree CRUD with bounded filtering and current-page export.',
  );
}

if (
  !systemNoticesPage.includes('listOpenCoreSystemNotices') ||
  !systemNoticesPage.includes('createOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('updateOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('publishOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('archiveOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('deleteOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('useCurrentPageFilters') ||
  !systemNoticesPage.includes('CurrentPageExportButton') ||
  !systemNoticesPage.includes('dataSource={filteredRows}') ||
  !systemNoticesPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'System Notices page must use live SDK lifecycle actions with bounded filtering and current-page export.',
  );
}

for (const wrapper of [
  { name: 'RBAC table', source: rbacTable },
  { name: 'system management table', source: systemManagementTable },
]) {
  if (
    !wrapper.source.includes('useCurrentPageFilters') ||
    !wrapper.source.includes('CurrentPageExportButton') ||
    !wrapper.source.includes('ReadOnlyDetailDrawer') ||
    !wrapper.source.includes('setSelectedDetail') ||
    !wrapper.source.includes('readOnlyReason') ||
    !wrapper.source.includes('read-only-policy') ||
    !wrapper.source.includes('dataSource={filteredRows}') ||
    !wrapper.source.includes('rows={filteredRows}')
  ) {
    throw new Error(
      `Admin core wrapper must use bounded current-page filter/export helpers: ${wrapper.name}`,
    );
  }
}

if (
  !readOnlyDetailDrawer.includes('redactDetailJsonValue') ||
  !readOnlyDetailDrawer.includes('sensitive?: boolean') ||
  !readOnlyDetailDrawer.includes('REDACTED_DETAIL_FIELD_VALUE') ||
  !readOnlyDetailDrawer.includes('field.sensitive') ||
  !readOnlyDetailDrawer.includes('renderDetailFieldValue(field)') ||
  !readOnlyDetailDrawer.includes('password') ||
  !readOnlyDetailDrawer.includes('secret') ||
  !readOnlyDetailDrawer.includes('token') ||
  !readOnlyDetailDrawer.includes('credential') ||
  !readOnlyDetailDrawer.includes('authorization') ||
  !readOnlyDetailDrawer.includes('api[-_]?key') ||
  !readOnlyDetailDrawer.includes('client[-_]?secret') ||
  !readOnlyDetailDrawer.includes(
    'JSON.stringify(redactDetailJsonValue(section.value), null, 2)',
  )
) {
  throw new Error(
    'Read-only detail drawer fields and JSON sections must pass through sensitive redaction before rendering or serialization.',
  );
}

if (
  !currentPageExportButton.includes('sanitizeCsvCellText') ||
  !currentPageExportButton.includes('sanitizeCsvFilename') ||
  !currentPageExportButton.includes('CSV_FORMULA_PREFIX_PATTERN') ||
  !currentPageExportButton.includes('CSV_FILENAME_UNSAFE_PATTERN') ||
  !currentPageExportButton.includes('[=+\\-@]') ||
  !currentPageExportButton.includes('\\\\/:*?"<>|\\\\x00-\\\\x1F') ||
  !currentPageExportButton.includes("basename || 'opencore-export'") ||
  !currentPageExportButton.includes("endsWith('.csv')") ||
  !currentPageExportButton.includes(
    `return \`'${textTemplatePlaceholder}\`;`,
  ) ||
  !currentPageExportButton.includes(
    'sanitizeCsvCellText(normalizeCellValue(value))',
  ) ||
  !currentPageExportButton.includes(
    'sanitizeCsvFilename(filename ?? `opencore-' +
      resourceTemplatePlaceholder +
      '.csv`)',
  ) ||
  !currentPageExportButton.includes('redactCurrentPageExportValue') ||
  !currentPageExportButton.includes('password') ||
  !currentPageExportButton.includes('secret') ||
  !currentPageExportButton.includes('token') ||
  !currentPageExportButton.includes('credential') ||
  !currentPageExportButton.includes('authorization') ||
  !currentPageExportButton.includes('api[-_]?key') ||
  !currentPageExportButton.includes('client[-_]?secret') ||
  !currentPageExportButton.includes(
    'JSON.stringify(redactCurrentPageExportValue(value))',
  )
) {
  throw new Error(
    'Current-page CSV export must sanitize filenames, neutralize spreadsheet formula prefixes and redact object-cell sensitive keys before serialization.',
  );
}

if (
  !currentPageFilters.includes('redactCurrentPageFilterValue') ||
  !currentPageFilters.includes('password') ||
  !currentPageFilters.includes('secret') ||
  !currentPageFilters.includes('token') ||
  !currentPageFilters.includes('credential') ||
  !currentPageFilters.includes('authorization') ||
  !currentPageFilters.includes('api[-_]?key') ||
  !currentPageFilters.includes('client[-_]?secret') ||
  !currentPageFilters.includes(
    'JSON.stringify(redactCurrentPageFilterValue(value))',
  )
) {
  throw new Error(
    'Current-page filter/search text must redact object-valued sensitive keys before serialization.',
  );
}

if (
  !rbacTable.includes('disabled') ||
  !rbacTable.includes('PlusOutlined') ||
  !rbacTable.includes('EditOutlined') ||
  !rbacTable.includes('DeleteOutlined')
) {
  throw new Error(
    'RBAC wrapper mutation-looking controls must be disabled until write workflows are admitted.',
  );
}

const coreFilteredPages = [];

for (const page of coreFilteredPages) {
  if (
    !page.source.includes('detailFields={detailFields}') ||
    !page.source.includes('searchFields={searchFields}') ||
    !page.source.includes('filterOptions={filterOptions}') ||
    !page.source.includes('exportColumns={exportColumns}') ||
    !page.source.includes('readOnlyReason=') ||
    !page.source.includes('resource=')
  ) {
    throw new Error(
      `Admin core page must declare bounded filters and current-page export columns: ${page.name}`,
    );
  }
}

if (
  !configPage.includes('[redacted]') ||
  !configPage.includes('formatConfigValue') ||
  !configPage.includes("record.visibility === 'secret'")
) {
  throw new Error('System config detail/export must redact secret values.');
}

if (
  !providersPage.includes('<Typography.Text type="secondary">[redacted]') ||
  !providersPage.includes("label: 'Secret Ref'") ||
  !providersPage.includes('selected?.secretRef, sensitive: true')
) {
  throw new Error(
    'Integration provider list and detail must redact scalar secret references.',
  );
}

if (
  !onlineUsersPage.includes('listOpenCoreOnlineUsers') ||
  !onlineUsersPage.includes('getOpenCoreOnlineUser') ||
  !onlineUsersPage.includes('kickOutOpenCoreOnlineUser') ||
  !onlineUsersPage.includes('kickOutOpenCoreOnlineUsers') ||
  !onlineUsersPage.includes('canManageOnlineUsers') ||
  !onlineUsersPage.includes('useAccess') ||
  !onlineUsersPage.includes('useCurrentPageFilters') ||
  !onlineUsersPage.includes('CurrentPageExportButton') ||
  !onlineUsersPage.includes('dataSource={filteredRows}') ||
  !onlineUsersPage.includes('rows={filteredRows}') ||
  !onlineUsersPage.includes('Kick-out invalidates active bearer sessions') ||
  !onlineUsersPage.includes('activeSelectedRows') ||
  !onlineUsersPage.includes('Kick selected') ||
  !onlineUsersPage.includes("label: 'Browser'") ||
  !onlineUsersPage.includes("label: 'OS'") ||
  !onlineUsersPage.includes("label: 'Token ID'") ||
  !onlineUsersPage.includes('value: record.tokenId, sensitive: true') ||
  !onlineUsersPage.includes("label: 'Revoked Reason'") ||
  !onlineUsersPage.includes('value: record.revokedReason') ||
  (onlineUsersPage.match(/sensitive: true/g) ?? []).length < 2
) {
  throw new Error(
    'Online user detail must redact scalar token and revoked-reason fields.',
  );
}

const admittedFilteredPages = [
  { exportsRows: true, name: 'messages', source: messagesPage },
  { exportsRows: true, name: 'notices', source: noticesPage },
  { exportsRows: true, name: 'todos', source: todosPage },
  { exportsRows: true, name: 'approvals', source: approvalsPage },
  { exportsRows: true, name: 'jobs', source: jobsPage },
  { exportsRows: false, name: 'cache', source: cachePage },
  { exportsRows: true, name: 'online users', source: onlineUsersPage },
  { exportsRows: true, name: 'reports', source: reportsPage },
  { exportsRows: true, name: 'export jobs', source: exportJobsPage },
  { exportsRows: true, name: 'providers', source: providersPage },
  { exportsRows: true, name: 'mail', source: mailPage },
  { exportsRows: true, name: 'sms', source: smsPage },
  { exportsRows: true, name: 'oauth', source: oauthPage },
  { exportsRows: true, name: 'wechat', source: wechatPage },
  { exportsRows: true, name: 'websocket', source: websocketPage },
  { exportsRows: true, name: 'billing design', source: billingDesignPage },
];

for (const page of admittedFilteredPages) {
  if (
    !page.source.includes('useCurrentPageFilters') ||
    !page.source.includes('dataSource={filteredRows}')
  ) {
    throw new Error(
      `Admin admitted page must use bounded current-page filters: ${page.name}`,
    );
  }

  if (page.exportsRows && !page.source.includes('rows={filteredRows}')) {
    throw new Error(
      `Admin admitted page export must use filtered rows: ${page.name}`,
    );
  }
}

const requestSpec = readFileSync(resolve(root, 'src/utils/request.ts'), 'utf8');
if (
  !requestSpec.includes('x-request-id') ||
  !requestSpec.includes('x-trace-id')
) {
  throw new Error(
    'Admin request helper must preserve request and trace headers.',
  );
}

if (existsSync(resolve(root, 'examples'))) {
  throw new Error('Template example code must not be committed in S5 shell.');
}

console.log('admin smoke test passed');
