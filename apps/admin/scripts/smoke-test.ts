// @ts-nocheck
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runAdminFallbackClosureGuard } from '../../../tools/scripts/admin-fallback-closure-guard';

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

runAdminFallbackClosureGuard({ rootDir: resolve(root, '../..') });

function extractLocaleValues(source) {
  const values = [];
  const entryPattern = /'(?:[^'\\]|\\.)+'\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  let match;

  while ((match = entryPattern.exec(source))) {
    values.push(match[1]);
  }

  return values;
}

function findForbiddenLocaleValueTerms(source, terms) {
  const values = extractLocaleValues(source);

  return terms.filter((term) => values.some((value) => value.includes(term)));
}

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
  "path: '/tools/area'",
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

for (const repeatedNestedName of [
  'system.users',
  'system.roles',
  'system.permissions',
  'system.menus',
  'system.dicts',
  'system.config',
  'system.notices',
  'system.depts',
  'system.posts',
  'system.files',
  'security.loginLogs',
  'security.operationLogs',
  'monitor.status',
  'monitor.version',
  'monitor.queues',
  'monitor.jobs',
  'monitor.cache',
  'monitor.onlineUsers',
  'tools.openapi',
  'tools.export',
  'tools.area',
  'tools.openforge',
  'collaboration.messages',
  'collaboration.notices',
  'collaboration.todos',
  'collaboration.approvals',
  'optional.reports',
  'optional.exportJobs',
  'integrations.providers',
  'integrations.mail',
  'integrations.sms',
  'integrations.oauth',
  'integrations.wechat',
  'integrations.websocket',
  'integrations.payment',
]) {
  if (config.includes(`name: '${repeatedNestedName}'`)) {
    throw new Error(
      `Nested Admin route name must be a leaf segment, not ${repeatedNestedName}; ProLayout prefixes parent names when resolving menu locale ids.`,
    );
  }
}

const appRuntime = readFileSync(resolve(root, 'src/app.tsx'), 'utf8');
if (
  !appRuntime.includes('queryCurrentOpenCoreUser') ||
  !appRuntime.includes('formatAdminLayoutMessage') ||
  !appRuntime.includes('getIntl().formatMessage') ||
  !appRuntime.includes('shellMenuItems') ||
  !appRuntime.includes('registrySummary') ||
  !appRuntime.includes('permissions: currentUser?.permissionCodes') ||
  !appRuntime.includes('getOpenCoreAdminRuntimeConfig') ||
  !appRuntime.includes('baseURL: process.env.ADMIN_API_BASE_URL')
) {
  throw new Error(
    'Admin app runtime must use OpenCore auth, shell registry metadata, Umi-backed layout menu i18n, runtime config and non-demo request base URL.',
  );
}

if (
  /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+formatAdminLayoutMessage\b/.test(
    appRuntime,
  )
) {
  throw new Error(
    'Admin layout menu i18n helper must stay internal to app.tsx because Umi runtime rejects unsupported app exports.',
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
  resolve(root, '../../tools/scripts/serve-admin-static.ts'),
  'utf8',
);
const deployScript = readFileSync(
  resolve(root, '../../tools/scripts/deploy-local-opencore.sh'),
  'utf8',
);
const adminErrorUiSmoke = readFileSync(
  resolve(root, '../../tools/smoke/smoke-admin-error-ui.ts'),
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
  !deployScript.includes('admin.api-proxy.duplicate-prefix-login') ||
  !deployScript.includes('smoke-admin-error-ui.ts') ||
  !deployScript.includes('OPENCORE_SMOKE_ADMIN_BASE_URL') ||
  !deployScript.includes('loginMaxFailedAttempts') ||
  !deployScript.includes('System Notice Templates') ||
  !deployScript.includes('admin-fallback-closure-guard.ts') ||
  !deployScript.includes('system-admin-live-only.guard.json') ||
  !deployScript.includes('Fail outbox') ||
  !deployScript.includes('Retry outbox') ||
  !deployScript.includes('Process queued outbox') ||
  !deployScript.includes('Run outbox schedule') ||
  !deployScript.includes('HTTP Secret Injection') ||
  !deployScript.includes('SMTP Attachments') ||
  !deployScript.includes('SMTP TLS Policy') ||
  !deployScript.includes('Mark outbox sent') ||
  !deployScript.includes('OPENCORE_GIT_COMMIT') ||
  !deployScript.includes('OPENCORE_BUILD_TIME') ||
  !deployScript.includes('OPENCORE_DEPLOYMENT_ID') ||
  !deployScript.includes('Live runtime version') ||
  !deployScript.includes('Refusing to deploy a stale frontend login page')
) {
  throw new Error(
    'OpenCore deploy script must verify the public Admin bundle, Admin error UI smoke, stale login/version page content, runtime deploy metadata and duplicated /api/api login requests.',
  );
}

if (
  !adminErrorUiSmoke.includes('admin.public-login.error-localized') ||
  !adminErrorUiSmoke.includes('admin.public-login.error-code-message') ||
  !adminErrorUiSmoke.includes('admin.public-login.no-duplicate-api-prefix') ||
  !adminErrorUiSmoke.includes('用户名或密码错误') ||
  !adminErrorUiSmoke.includes('Invalid username or password')
) {
  throw new Error(
    'Admin error UI smoke must verify localized login errors, backend fallback absence and duplicate API prefix absence.',
  );
}

if (
  !loginPage.includes('loginToOpenCore') ||
  loginPage.includes('getFakeCaptcha') ||
  loginPage.includes('@/services/ant-design-pro') ||
  !loginPage.includes('runtimeTitle') ||
  !loginPage.includes('title={runtimeTitle}') ||
  !loginPage.includes('loginLockoutMinutes') ||
  !loginPage.includes('loginMaxFailedAttempts') ||
  !loginPage.includes('Login lockout policy')
) {
  throw new Error(
    'Admin login must call OpenCore auth, use runtime config title/login policy and avoid demo login services.',
  );
}

const runtimeConfigService = readFileSync(
  resolve(root, 'src/services/opencore/runtimeConfig.ts'),
  'utf8',
);

if (
  !runtimeConfigService.includes('getOpenCoreAdminRuntimeConfig') ||
  !runtimeConfigService.includes('getConfigRuntime') ||
  !runtimeConfigService.includes('SystemConfigRuntimeSummary')
) {
  throw new Error(
    'Admin runtime config service must read OpenCore public runtime config through the SDK.',
  );
}

if (
  !authService.includes('createRbacClient') ||
  !authService.includes('loginToOpenCore') ||
  !authService.includes('queryCurrentOpenCoreUser') ||
  !authService.includes('logoutFromOpenCore') ||
  !authService.includes('getOpenCoreUserProfile') ||
  !authService.includes('getOpenCoreUserProfileActivity') ||
  !authService.includes('updateOpenCoreUserProfile') ||
  !authService.includes('updateOpenCoreUserAvatar') ||
  !authService.includes('deleteOpenCoreUserAvatar') ||
  !authService.includes('updateOpenCoreUserPassword') ||
  !authService.includes('kickOutOtherOpenCoreUserProfileSessions') ||
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
  !avatarDropdown.includes('logoutFromOpenCore') ||
  !avatarDropdown.includes('void loginOut()') ||
  !avatarDropdown.includes('UserOutlined')
) {
  throw new Error(
    'Admin avatar dropdown must expose the self-profile route and call the OpenCore logout API.',
  );
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
  !opencorePlatformService.includes('getOpenCoreLoginLogPage') ||
  !opencorePlatformService.includes('getOpenCoreLoginLog') ||
  !opencorePlatformService.includes('deleteOpenCoreLoginLogs') ||
  !opencorePlatformService.includes('cleanOpenCoreLoginLogs') ||
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
  !opencorePlatformService.includes('updateOpenCoreSystemDeptOrder') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemDept') ||
  !opencorePlatformService.includes('listOpenCoreSystemPosts') ||
  !opencorePlatformService.includes('listOpenCoreSystemPostOptions') ||
  !opencorePlatformService.includes('getOpenCoreSystemPost') ||
  !opencorePlatformService.includes('createOpenCoreSystemPost') ||
  !opencorePlatformService.includes('updateOpenCoreSystemPost') ||
  !opencorePlatformService.includes('updateOpenCoreSystemPostOrder') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemPost') ||
  !opencorePlatformService.includes('deleteOpenCoreSystemPosts') ||
  !opencorePlatformService.includes(
    'listOpenCoreSystemConfigEnvironmentOverrides',
  ) ||
  !opencorePlatformService.includes(
    'upsertOpenCoreSystemConfigEnvironmentOverride',
  ) ||
  !opencorePlatformService.includes(
    'deleteOpenCoreSystemConfigEnvironmentOverride',
  ) ||
  !opencorePlatformService.includes('listOpenCoreSystemConfigSecretVersions') ||
  !opencorePlatformService.includes('rotateOpenCoreSystemConfigSecret') ||
  !opencorePlatformService.includes('getOpenCoreSystemConfigVaultStatus') ||
  !opencorePlatformService.includes('rotateOpenCoreSystemConfigVaultKey') ||
  !opencorePlatformService.includes('listOpenCoreSystemNotices') ||
  !opencorePlatformService.includes('listOpenCoreSystemNoticeInbox') ||
  !opencorePlatformService.includes('getOpenCoreSystemNoticeInboxEventsPath') ||
  !opencorePlatformService.includes('listOpenCoreUnreadSystemNotices') ||
  !opencorePlatformService.includes('getOpenCoreSystemNoticeUnreadCount') ||
  !opencorePlatformService.includes('listOpenCoreSystemNoticeReadUsers') ||
  !opencorePlatformService.includes('listOpenCoreSystemNoticeDeliveries') ||
  !opencorePlatformService.includes('dispatchOpenCoreSystemNotice') ||
  !opencorePlatformService.includes('markOpenCoreSystemNoticesRead') ||
  !opencorePlatformService.includes('markAllOpenCoreSystemNoticesRead') ||
  !opencorePlatformService.includes('publishOpenCoreSystemNotice') ||
  !opencorePlatformService.includes('archiveOpenCoreSystemNotice') ||
  !opencorePlatformService.includes('listOpenCoreJobs') ||
  !opencorePlatformService.includes('listOpenCoreJobRegistry') ||
  !opencorePlatformService.includes('enableOpenCoreJob') ||
  !opencorePlatformService.includes('disableOpenCoreJob') ||
  !opencorePlatformService.includes('triggerOpenCoreJob') ||
  !opencorePlatformService.includes('cleanOpenCoreJobRuns') ||
  !opencorePlatformService.includes('listOpenCoreMonitorQueues') ||
  !opencorePlatformService.includes('pauseOpenCoreMonitorQueue') ||
  !opencorePlatformService.includes('resumeOpenCoreMonitorQueue')
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
  !accessRuntime.includes('core:audit-log:delete') ||
  !accessRuntime.includes('canDeleteAuditLogs') ||
  !accessRuntime.includes('core:login-log:read') ||
  !accessRuntime.includes('core:login-log:delete') ||
  !accessRuntime.includes('canDeleteLoginLogs') ||
  !accessRuntime.includes('core:login-log:manage') ||
  !accessRuntime.includes('canManageLoginLogs') ||
  !accessRuntime.includes('monitor:status:read') ||
  !accessRuntime.includes('monitor:version:read') ||
  !accessRuntime.includes('monitor:queue:read') ||
  !accessRuntime.includes('monitor:queue:manage') ||
  !accessRuntime.includes('canManageQueues') ||
  !accessRuntime.includes('tool:export:read') ||
  !accessRuntime.includes('tool:openforge:read') ||
  !accessRuntime.includes('collaboration:message:read') ||
  !accessRuntime.includes('collaboration:notice:read') ||
  !accessRuntime.includes('collaboration:todo:read') ||
  !accessRuntime.includes('collaboration:approval-lite:read') ||
  !accessRuntime.includes('monitor:job:read') ||
  !accessRuntime.includes('monitor:job:update') ||
  !accessRuntime.includes('monitor:job:manage') ||
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
const noticeBell = readFileSync(
  resolve(root, 'src/components/RightContent/NoticeBell.tsx'),
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
const areaPage = readFileSync(
  resolve(root, 'src/pages/Tools/Area/index.tsx'),
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
const dashboardPage = readFileSync(
  resolve(root, 'src/pages/Dashboard/index.tsx'),
  'utf8',
);
const zhCnPagesLocale = readFileSync(
  resolve(root, 'src/locales/zh-CN/pages.ts'),
  'utf8',
);
const zhCnMenuLocale = readFileSync(
  resolve(root, 'src/locales/zh-CN/menu.ts'),
  'utf8',
);

if (
  !dashboardPage.includes('getOpenCoreOperationsSummary') ||
  !dashboardPage.includes('getOpenCoreOnlineUserSummary') ||
  !dashboardPage.includes('getOpenCoreIntegrationProviderHealthAudit') ||
  !dashboardPage.includes('getOpenCoreSystemNoticeUnreadCount') ||
  !dashboardPage.includes('getOpenCoreLoginLogPage') ||
  !dashboardPage.includes('getOpenCoreSystemStatus') ||
  !dashboardPage.includes('getOpenCoreVersionInfo') ||
  !dashboardPage.includes('getOpenCoreOpenApiDriftStatus') ||
  !dashboardPage.includes('isActionableIntegrationChannel') ||
  !dashboardPage.includes('isSandboxOrSmokeChannel') ||
  !dashboardPage.includes("code.endsWith('.smoke')") ||
  !dashboardPage.includes("adapter === 'sandbox'") ||
  dashboardPage.includes('workbench.providerHealth.totals.attention +') ||
  !dashboardPage.includes('process.env.ADMIN_API_BASE_URL') ||
  !dashboardPage.includes(`/health/${pathTemplatePlaceholder}`) ||
  !dashboardPage.includes("useModel('@@initialState')") ||
  !dashboardPage.includes('useAccess()') ||
  dashboardPage.includes('plannedModuleSummaries') ||
  dashboardPage.includes('shellMenuItems') ||
  dashboardPage.includes('@ant-design/plots')
) {
  throw new Error(
    'Admin dashboard must be a live workbench using real platform endpoints, permission-aware shortcuts and no demo shell/chart fallback.',
  );
}

const forbiddenZhCnVisibleTerms = findForbiddenLocaleValueTerms(
  `${zhCnMenuLocale}\n${zhCnPagesLocale}`,
  [
    '供应商',
    '供应商 readiness',
    'attention / blocked',
    '邮件/短信 outbox',
    'Provider',
    'Outbox',
    'outbox',
    'OAuth token',
    ' token',
    'Token',
    'OAuth flow',
    ' flow',
    'Flow',
    'State',
    'Scopes',
    'User Agent',
    'fallback',
    'Dashboard',
    'handler',
    'Worker',
    'API Live',
    'API Ready',
    ' paths',
    ' schemas',
    ' operations',
  ],
);

if (forbiddenZhCnVisibleTerms.length > 0) {
  throw new Error(
    `zh-CN locale values must not expose avoidable English UI terms: ${forbiddenZhCnVisibleTerms.join(
      ', ',
    )}.`,
  );
}

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
  !statusPage.includes('Live runtime status') ||
  !statusPage.includes('Runtime resources') ||
  !statusPage.includes('CPU load 1m') ||
  !statusPage.includes('Memory usage') ||
  !statusPage.includes('Disk usage') ||
  !statusPage.includes('Live runtime resources') ||
  !statusPage.includes('monitor:status:read') ||
  !statusPage.includes('Reload runtime status') ||
  !versionPage.includes('@opencore/sdk') ||
  !versionPage.includes('getOpenCoreVersionInfo') ||
  !queuesPage.includes('@opencore/sdk') ||
  !queuesPage.includes('listOpenCoreMonitorQueues') ||
  !queuesPage.includes('pauseOpenCoreMonitorQueue') ||
  !queuesPage.includes('resumeOpenCoreMonitorQueue') ||
  !queuesPage.includes('canManageQueues') ||
  !queuesPage.includes('Queue control') ||
  !queuesPage.includes('Pause queue') ||
  !queuesPage.includes('Resume queue') ||
  !queuesPage.includes('monitor:queue:manage') ||
  queuesPage.includes('createQueueStatusFixture') ||
  queuesPage.includes('Using fallback queue fixtures') ||
  !openApiPage.includes('@opencore/sdk') ||
  !openApiPage.includes('getOpenCoreOpenApiDriftStatus') ||
  !exportPage.includes('@opencore/sdk') ||
  !exportPage.includes('getOpenCoreExportProtocol') ||
  !exportPage.includes('createOpenCoreExportPreview') ||
  !openForgePage.includes('@opencore/sdk') ||
  !openForgePage.includes('createOpenCoreOpenForgePlan') ||
  !openForgePage.includes('createOpenCoreOpenForgeDiff') ||
  !openForgePage.includes('createOpenCoreOpenForgePreflight') ||
  !openForgePage.includes('createOpenCoreOpenForgeApplyDryRun') ||
  !openForgePage.includes('createOpenCoreOpenForgeRollbackDryRun') ||
  !openForgePage.includes('listOpenCoreOpenForgeManifests') ||
  !openForgePage.includes('Plan artifacts') ||
  !openForgePage.includes('Diff plan') ||
  !openForgePage.includes('Doctor checks') ||
  !openForgePage.includes('OpenForge manifests') ||
  !openForgePage.includes('Dry-run apply') ||
  !openForgePage.includes('tool:openforge:manage') ||
  openForgePage.includes('createOpenForgeStatusFixture') ||
  openForgePage.includes('createOpenForgeDoctorFixture') ||
  openForgePage.includes('createOpenForgePlanFixture') ||
  openForgePage.includes('createOpenForgeDiffFixture') ||
  openForgePage.includes('createOpenForgePreflightFixture') ||
  openForgePage.includes('createOpenForgeApplyDryRunFixture') ||
  openForgePage.includes('createOpenForgeManifestListFixture') ||
  openForgePage.includes('fallbackStatus') ||
  openForgePage.includes('fallbackApplyDryRun') ||
  !messagesPage.includes('@opencore/sdk') ||
  !messagesPage.includes('listOpenCoreMessages') ||
  !messagesPage.includes('getOpenCoreMessage') ||
  !messagesPage.includes('createOpenCoreMessage') ||
  !messagesPage.includes('markOpenCoreMessageRead') ||
  !messagesPage.includes('archiveOpenCoreMessage') ||
  !messagesPage.includes('deleteOpenCoreMessage') ||
  !messagesPage.includes('Live messages') ||
  !messagesPage.includes('Create message') ||
  !messagesPage.includes('Mark read') ||
  !messagesPage.includes('Archive message') ||
  !messagesPage.includes('collaboration:message:create') ||
  !messagesPage.includes('collaboration:message:delete') ||
  !noticesPage.includes('@opencore/sdk') ||
  !noticesPage.includes('listOpenCoreNotices') ||
  !noticesPage.includes('getOpenCoreNotice') ||
  !noticesPage.includes('createOpenCoreNotice') ||
  !noticesPage.includes('publishOpenCoreNotice') ||
  !noticesPage.includes('archiveOpenCoreNotice') ||
  !noticesPage.includes('Live notices') ||
  !noticesPage.includes('Create notice') ||
  !noticesPage.includes('Publish notice') ||
  !noticesPage.includes('Archive notice') ||
  !noticesPage.includes('collaboration:notice:create') ||
  !noticesPage.includes('collaboration:notice:update') ||
  !todosPage.includes('@opencore/sdk') ||
  !todosPage.includes('listOpenCoreTodos') ||
  !todosPage.includes('getOpenCoreTodo') ||
  !todosPage.includes('createOpenCoreTodo') ||
  !todosPage.includes('assignOpenCoreTodo') ||
  !todosPage.includes('completeOpenCoreTodo') ||
  !todosPage.includes('cancelOpenCoreTodo') ||
  !todosPage.includes('Live todos') ||
  !todosPage.includes('Create todo') ||
  !todosPage.includes('Assign todo') ||
  !todosPage.includes('Complete todo') ||
  !todosPage.includes('Cancel todo') ||
  !todosPage.includes('collaboration:todo:create') ||
  !todosPage.includes('collaboration:todo:update') ||
  !approvalsPage.includes('@opencore/sdk') ||
  !approvalsPage.includes('listOpenCoreApprovalLiteRequests') ||
  !approvalsPage.includes('getOpenCoreApprovalLiteRequest') ||
  !approvalsPage.includes('createOpenCoreApprovalLiteRequest') ||
  !approvalsPage.includes('approveOpenCoreApprovalLiteRequest') ||
  !approvalsPage.includes('rejectOpenCoreApprovalLiteRequest') ||
  !approvalsPage.includes('Live approvals') ||
  !approvalsPage.includes('Create approval') ||
  !approvalsPage.includes('Approve request') ||
  !approvalsPage.includes('Reject request') ||
  !approvalsPage.includes('collaboration:approval-lite:create') ||
  !approvalsPage.includes('collaboration:approval-lite:update') ||
  !jobsPage.includes('@opencore/sdk') ||
  !cachePage.includes('@opencore/sdk') ||
  !onlineUsersPage.includes('@opencore/sdk') ||
  !reportsPage.includes('@opencore/sdk') ||
  !exportJobsPage.includes('@opencore/sdk') ||
  !areaPage.includes('@opencore/sdk') ||
  !areaPage.includes('Area data boundary') ||
  !areaPage.includes('Reload area dataset') ||
  !areaPage.includes('Area dataset versions') ||
  !areaPage.includes('Area region query') ||
  !areaPage.includes('IP boundary lookup') ||
  !areaPage.includes('Validate area import') ||
  !areaPage.includes('Activate area import') ||
  !areaPage.includes('Activate stored version') ||
  !areaPage.includes('tool:area:read') ||
  !areaPage.includes('tool:area:import') ||
  !providersPage.includes('@opencore/sdk') ||
  !mailPage.includes('@opencore/sdk') ||
  !mailPage.includes('listOpenCoreMailTemplates') ||
  !mailPage.includes('listOpenCoreMailOutbox') ||
  !mailPage.includes('getOpenCoreMailTemplate') ||
  !mailPage.includes('getOpenCoreMailOutboxMessage') ||
  !mailPage.includes('previewOpenCoreMailTemplate') ||
  !mailPage.includes("processOpenCoreIntegrationOutbox('mail'") ||
  !mailPage.includes("sendOpenCoreIntegrationTestOutbox('mail'") ||
  !mailPage.includes('Live mail templates') ||
  !mailPage.includes('Mail outbox operations') ||
  !mailPage.includes('Process queued mail outbox') ||
  !mailPage.includes('Last mail test-send') ||
  !mailPage.includes('Send test') ||
  !mailPage.includes('Preview template') ||
  !mailPage.includes('integration:mail:manage') ||
  !mailPage.includes('Outbox Subject') ||
  !mailPage.includes('SMTP Attachments') ||
  !mailPage.includes('Attachment Metadata') ||
  !smsPage.includes('@opencore/sdk') ||
  !smsPage.includes('listOpenCoreSmsTemplates') ||
  !smsPage.includes('listOpenCoreSmsOutbox') ||
  !smsPage.includes('getOpenCoreSmsTemplate') ||
  !smsPage.includes('getOpenCoreSmsOutboxMessage') ||
  !smsPage.includes('previewOpenCoreSmsTemplate') ||
  !smsPage.includes("processOpenCoreIntegrationOutbox('sms'") ||
  !smsPage.includes("sendOpenCoreIntegrationTestOutbox('sms'") ||
  !smsPage.includes('Live SMS templates') ||
  !smsPage.includes('SMS outbox operations') ||
  !smsPage.includes('Process queued SMS outbox') ||
  !smsPage.includes('Last SMS test-send') ||
  !smsPage.includes('Send test') ||
  !smsPage.includes('Preview template') ||
  !smsPage.includes('integration:sms:manage') ||
  !smsPage.includes('Outbox Recipient') ||
  !smsPage.includes('Sample Outbox Payload') ||
  !oauthPage.includes('@opencore/sdk') ||
  !oauthPage.includes('listOpenCoreOAuthProviders') ||
  !oauthPage.includes('startOpenCoreOAuthFlow') ||
  !oauthPage.includes('listOpenCoreOAuthFlows') ||
  !oauthPage.includes('listOpenCoreOAuthCallbackAudits') ||
  !oauthPage.includes('listOpenCoreOAuthTokens') ||
  !oauthPage.includes('getOpenCoreOAuthToken') ||
  !oauthPage.includes('revokeOpenCoreOAuthToken') ||
  !oauthPage.includes('Live OAuth token inventory') ||
  !oauthPage.includes('OAuth callback flow admission') ||
  !oauthPage.includes('State validation flow ledger') ||
  !oauthPage.includes('OAuth callback audit trail') ||
  !oauthPage.includes('Start OAuth flow') ||
  !oauthPage.includes('Unable to load live OAuth token inventory') ||
  !oauthPage.includes('canManageOAuthIntegration') ||
  !oauthPage.includes('integration:oauth:manage') ||
  !wechatPage.includes('@opencore/sdk') ||
  !wechatPage.includes('getOpenCoreWeChatDesign') ||
  !wechatPage.includes('Live WeChat design') ||
  !wechatPage.includes('Reload live WeChat design') ||
  !wechatPage.includes('integration:wechat:read') ||
  !websocketPage.includes('@opencore/sdk') ||
  !websocketPage.includes('getOpenCoreWebSocketDesign') ||
  !websocketPage.includes('getOpenCoreWebSocketRuntimeDiagnostics') ||
  !websocketPage.includes('openOpenCoreWebSocketRuntimeStream') ||
  !websocketPage.includes('publishOpenCoreWebSocketRuntimeEvent') ||
  !websocketPage.includes('WebSocket Runtime') ||
  !websocketPage.includes('Reload live WebSocket runtime') ||
  !websocketPage.includes('Open diagnostic stream') ||
  !websocketPage.includes('Runtime connection status') ||
  !websocketPage.includes('Subscription event routing') ||
  !websocketPage.includes('Diagnostic runtime events') ||
  !websocketPage.includes('integration:websocket:read') ||
  !billingDesignPage.includes('@opencore/sdk')
) {
  throw new Error(
    'Admin platform, collaboration, operations, and integration pages must consume SDK types or fixtures.',
  );
}

if (
  messagesPage.includes('createCollaborationFixtures') ||
  messagesPage.includes('findMessageFixture') ||
  !opencorePlatformService.includes('createCollaborationClient') ||
  !opencorePlatformService.includes('collaborationClient.listMessages') ||
  !opencorePlatformService.includes('collaborationClient.getMessage') ||
  !opencorePlatformService.includes('collaborationClient.createMessage') ||
  !opencorePlatformService.includes('collaborationClient.markMessageRead') ||
  !opencorePlatformService.includes('collaborationClient.archiveMessage') ||
  !opencorePlatformService.includes('collaborationClient.deleteMessage')
) {
  throw new Error(
    'Collaboration Messages page must use live message SDK APIs instead of static fixtures.',
  );
}

if (
  noticesPage.includes('createCollaborationFixtures') ||
  noticesPage.includes('findNoticeFixture') ||
  !opencorePlatformService.includes('collaborationClient.listNotices') ||
  !opencorePlatformService.includes('collaborationClient.getNotice') ||
  !opencorePlatformService.includes('collaborationClient.createNotice') ||
  !opencorePlatformService.includes('collaborationClient.publishNotice') ||
  !opencorePlatformService.includes('collaborationClient.archiveNotice')
) {
  throw new Error(
    'Collaboration Notices page must use live notice SDK APIs instead of static fixtures.',
  );
}

if (
  todosPage.includes('createCollaborationFixtures') ||
  todosPage.includes('findTodoFixture') ||
  !opencorePlatformService.includes('collaborationClient.listTodos') ||
  !opencorePlatformService.includes('collaborationClient.getTodo') ||
  !opencorePlatformService.includes('collaborationClient.createTodo') ||
  !opencorePlatformService.includes('collaborationClient.assignTodo') ||
  !opencorePlatformService.includes('collaborationClient.completeTodo') ||
  !opencorePlatformService.includes('collaborationClient.cancelTodo')
) {
  throw new Error(
    'Collaboration Todos page must use live todo SDK APIs instead of static fixtures.',
  );
}

if (
  approvalsPage.includes('createCollaborationFixtures') ||
  approvalsPage.includes('findApprovalLiteFixture') ||
  !opencorePlatformService.includes(
    'collaborationClient.listApprovalLiteRequests',
  ) ||
  !opencorePlatformService.includes(
    'collaborationClient.getApprovalLiteRequest',
  ) ||
  !opencorePlatformService.includes(
    'collaborationClient.createApprovalLiteRequest',
  ) ||
  !opencorePlatformService.includes(
    'collaborationClient.approveApprovalLiteRequest',
  ) ||
  !opencorePlatformService.includes(
    'collaborationClient.rejectApprovalLiteRequest',
  )
) {
  throw new Error(
    'Collaboration Approval Lite page must use live approval SDK APIs instead of static fixtures.',
  );
}

if (
  mailPage.includes('createIntegrationFixtures') ||
  mailPage.includes('findIntegrationTemplateFixture') ||
  mailPage.includes('findIntegrationOutboxFixture') ||
  !opencorePlatformService.includes('listOpenCoreMailTemplates') ||
  !opencorePlatformService.includes('integrationClient.listMailTemplates') ||
  !opencorePlatformService.includes('listOpenCoreMailOutbox') ||
  !opencorePlatformService.includes('integrationClient.listMailOutbox') ||
  !opencorePlatformService.includes('previewOpenCoreMailTemplate') ||
  !opencorePlatformService.includes('integrationClient.previewMailTemplate')
) {
  throw new Error(
    'Integration Mail page must use live mail template/outbox SDK APIs instead of static fixtures.',
  );
}

if (
  smsPage.includes('createIntegrationFixtures') ||
  smsPage.includes('findIntegrationTemplateFixture') ||
  smsPage.includes('findIntegrationOutboxFixture') ||
  !opencorePlatformService.includes('listOpenCoreSmsTemplates') ||
  !opencorePlatformService.includes('integrationClient.listSmsTemplates') ||
  !opencorePlatformService.includes('listOpenCoreSmsOutbox') ||
  !opencorePlatformService.includes('integrationClient.listSmsOutbox') ||
  !opencorePlatformService.includes('previewOpenCoreSmsTemplate') ||
  !opencorePlatformService.includes('integrationClient.previewSmsTemplate')
) {
  throw new Error(
    'Integration SMS page must use live SMS template/outbox SDK APIs instead of static fixtures.',
  );
}

if (
  oauthPage.includes('createIntegrationFixtures') ||
  oauthPage.includes('findOAuthTokenFixture') ||
  oauthPage.includes('Using fallback OAuth token inventory data') ||
  !opencorePlatformService.includes('integrationClient.listOAuthProviders') ||
  !opencorePlatformService.includes('integrationClient.startOAuthFlow') ||
  !opencorePlatformService.includes('integrationClient.listOAuthFlows') ||
  !opencorePlatformService.includes(
    'integrationClient.listOAuthCallbackAudits',
  ) ||
  !opencorePlatformService.includes('integrationClient.listOAuthTokens') ||
  !opencorePlatformService.includes('integrationClient.getOAuthToken') ||
  !opencorePlatformService.includes('integrationClient.revokeOAuthToken')
) {
  throw new Error(
    'Integration OAuth page must use live provider/flow/callback-audit/token SDK APIs without fixture fallback.',
  );
}

if (
  wechatPage.includes('createIntegrationFixtures') ||
  wechatPage.includes('findIntegrationDesignFixture') ||
  websocketPage.includes('createIntegrationFixtures') ||
  websocketPage.includes('findIntegrationDesignFixture') ||
  !opencorePlatformService.includes('integrationClient.getWeChatDesign') ||
  !opencorePlatformService.includes('integrationClient.getWebSocketDesign') ||
  !opencorePlatformService.includes(
    'integrationClient.getWebSocketRuntimeDiagnostics',
  ) ||
  !opencorePlatformService.includes(
    'integrationClient.publishWebSocketRuntimeEvent',
  )
) {
  throw new Error(
    'Integration WeChat/WebSocket pages must use live design/runtime SDK APIs instead of static fixtures.',
  );
}

if (
  currentPageExportButton.includes('createCurrentPageExportProtocolFixture') ||
  !currentPageExportButton.includes('getOpenCoreExportProtocol') ||
  !currentPageExportButton.includes('Live current-page export protocol') ||
  !currentPageExportButton.includes('Server capped current-page export') ||
  !currentPageExportButton.includes('loadCurrentPageExportProtocol') ||
  !currentPageExportButton.includes('currentPageExportProtocolCache') ||
  !opencorePlatformService.includes('getOpenCoreExportProtocol')
) {
  throw new Error(
    'CurrentPageExportButton must use the live Tool Export protocol instead of SDK fixtures.',
  );
}

if (
  exportPage.includes('createCurrentPageExportProtocolFixture') ||
  exportPage.includes('createExportPlanFixture') ||
  !exportPage.includes('Live export protocol') ||
  !exportPage.includes('Create export preview') ||
  !exportPage.includes('Bounded row preview') ||
  !exportPage.includes('Server capped rows') ||
  !opencorePlatformService.includes('getOpenCoreExportProtocol') ||
  !opencorePlatformService.includes('toolingClient.getExportProtocol') ||
  !opencorePlatformService.includes('createOpenCoreExportPreview') ||
  !opencorePlatformService.includes('toolingClient.createExportPreview')
) {
  throw new Error(
    'Export Tools page must use live SDK protocol and preview APIs instead of static fixtures.',
  );
}

if (
  areaPage.includes('createAreaDatasetFixture') ||
  areaPage.includes('setRows(fallbackRows)') ||
  !areaPage.includes('listOpenCoreAreaDatasetVersions') ||
  !areaPage.includes('listOpenCoreAreaRegions') ||
  !areaPage.includes('lookupOpenCoreAreaIp') ||
  !areaPage.includes('importOpenCoreAreaDataset') ||
  !areaPage.includes('activateOpenCoreAreaDatasetVersion') ||
  !opencorePlatformService.includes('getOpenCoreAreaDatasetStatus') ||
  !opencorePlatformService.includes('toolingClient.getAreaDatasetStatus') ||
  !opencorePlatformService.includes('listOpenCoreAreaDatasetVersions') ||
  !opencorePlatformService.includes('toolingClient.listAreaDatasetVersions') ||
  !opencorePlatformService.includes('listOpenCoreAreaRegions') ||
  !opencorePlatformService.includes('toolingClient.listAreaRegions') ||
  !opencorePlatformService.includes('lookupOpenCoreAreaIp') ||
  !opencorePlatformService.includes('toolingClient.lookupAreaIp') ||
  !opencorePlatformService.includes('importOpenCoreAreaDataset') ||
  !opencorePlatformService.includes('toolingClient.importAreaDataset') ||
  !opencorePlatformService.includes('activateOpenCoreAreaDatasetVersion') ||
  !opencorePlatformService.includes('toolingClient.activateAreaDatasetVersion')
) {
  throw new Error(
    'Area Data page must use live SDK dataset, region query, IP lookup, import and version activation APIs instead of static fixtures.',
  );
}

if (
  openApiPage.includes('createOpenApiDriftFixture') ||
  !openApiPage.includes('Live OpenAPI drift') ||
  !openApiPage.includes('Reload OpenAPI drift') ||
  !openApiPage.includes('Snapshot SHA-256') ||
  !openApiPage.includes('Snapshot operations') ||
  !opencorePlatformService.includes('getOpenCoreOpenApiDriftStatus') ||
  !opencorePlatformService.includes('toolingClient.getOpenApiDriftStatus')
) {
  throw new Error(
    'OpenAPI page must load live drift status through the SDK and expose snapshot metadata, not static fixtures.',
  );
}

if (
  statusPage.includes('createSystemStatusFixture') ||
  statusPage.includes('Using fallback monitor snapshot') ||
  !opencorePlatformService.includes('getOpenCoreSystemStatus') ||
  !opencorePlatformService.includes('monitoringClient.getStatus')
) {
  throw new Error(
    'Monitor Status page must use live runtime resource SDK status without fixture fallback.',
  );
}

if (
  versionPage.includes('createVersionInfoFixture') ||
  !versionPage.includes('Live runtime version') ||
  !versionPage.includes('OpenCore runtime') ||
  !versionPage.includes('Deployment ID') ||
  !versionPage.includes('Reload version info') ||
  !opencorePlatformService.includes('getOpenCoreVersionInfo') ||
  !opencorePlatformService.includes('monitoringClient.getVersion')
) {
  throw new Error(
    'Monitor Version page must use the live SDK version API and expose runtime/deployment metadata, not static fixtures.',
  );
}

if (
  cachePage.includes('createOperationsFixtures') ||
  !cachePage.includes('listOpenCoreCacheKeys') ||
  !cachePage.includes('listOpenCoreCacheNames') ||
  !cachePage.includes('getOpenCoreCacheValue') ||
  !cachePage.includes('clearOpenCoreCache') ||
  !cachePage.includes('deleteOpenCoreCacheKey') ||
  !cachePage.includes('canManageCache') ||
  !cachePage.includes('Redis Monitor') ||
  !cachePage.includes(
    'Redis live monitor; dry-run by default; confirmed clear required',
  ) ||
  !cachePage.includes('Safe Value Preview') ||
  !cachePage.includes('CurrentPageExportButton') ||
  !cachePage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Cache page must use live Redis cache APIs with namespace/key operations, safe value preview, permissions and current-page export.',
  );
}

if (
  !profilePage.includes('getOpenCoreUserProfile') ||
  !profilePage.includes('getOpenCoreUserProfileActivity') ||
  !profilePage.includes('updateOpenCoreUserProfile') ||
  !profilePage.includes('updateOpenCoreUserAvatar') ||
  !profilePage.includes('deleteOpenCoreUserAvatar') ||
  !profilePage.includes('updateOpenCoreUserPassword') ||
  !profilePage.includes('kickOutOtherOpenCoreUserProfileSessions') ||
  !profilePage.includes('listOpenCoreProfileOAuthAccounts') ||
  !profilePage.includes('listOpenCoreProfileOAuthProviders') ||
  !profilePage.includes('startOpenCoreProfileOAuthFlow') ||
  !profilePage.includes('unbindOpenCoreProfileOAuthAccount') ||
  profilePage.includes('sessionFallback') ||
  !profilePage.includes('scrollableTabStyle') ||
  !profilePage.includes('maxHeight') ||
  !profilePage.includes("provider.bindingStatus !== 'ready'") ||
  !profilePage.includes('formatOAuthBindingIssue') ||
  !profilePage.includes('Upload avatar') ||
  !profilePage.includes('Remove avatar') ||
  !profilePage.includes('Avatar updated.') ||
  !profilePage.includes('Avatar removed.') ||
  !profilePage.includes('avatarUrl') ||
  !profilePage.includes('AVATAR_ACCEPT') ||
  !profilePage.includes('Basic profile') ||
  !profilePage.includes('Security settings') ||
  !profilePage.includes('Account binding') ||
  !profilePage.includes('Login activity') ||
  !profilePage.includes('Display name') ||
  !profilePage.includes('Mobile') ||
  !profilePage.includes('Email') ||
  !profilePage.includes('Gender') ||
  !profilePage.includes('Change password') ||
  !profilePage.includes('Current password') ||
  !profilePage.includes('New password') ||
  !profilePage.includes('Confirm password') ||
  !profilePage.includes('Sign out other devices') ||
  !profilePage.includes('No account binding yet.') ||
  !profilePage.includes('Needs configuration') ||
  !profilePage.includes('Account binding is not ready.') ||
  !profilePage.includes('Recent login records') ||
  !profilePage.includes('removeAdminToken') ||
  !profilePage.includes('/user/login') ||
  !profilePage.includes('setInitialState') ||
  !profilePage.includes('Profile saved.') ||
  !profilePage.includes('Password changed.') ||
  !profilePage.includes('postNames') ||
  !profilePage.includes('roleNames')
) {
  throw new Error(
    'Admin personal profile page must expose live profile center tabs, OAuth binding, activity and no session fallback.',
  );
}

if (
  !opencorePlatformService.includes(
    'integrationClient.listProfileOAuthAccounts',
  ) ||
  !opencorePlatformService.includes(
    'integrationClient.listProfileOAuthProviders',
  ) ||
  !opencorePlatformService.includes(
    'integrationClient.startProfileOAuthFlow',
  ) ||
  !opencorePlatformService.includes(
    'integrationClient.unbindProfileOAuthAccount',
  )
) {
  throw new Error(
    'Admin profile OAuth service must use profile-scoped OAuth SDK APIs without management-provider fallback.',
  );
}

if (
  usersPage.includes('createSystemDeptOptionFixtures') ||
  usersPage.includes('createSystemDeptFixtures') ||
  usersPage.includes('createSystemPostFixtures') ||
  usersPage.includes('fallbackRows') ||
  usersPage.includes('fallbackRoleRows') ||
  usersPage.includes('Using fallback user snapshot') ||
  usersPage.includes('setRows(fallbackRows)') ||
  usersPage.includes('setSelectedDetail(record)') ||
  !usersPage.includes('Unable to load live users') ||
  !usersPage.includes('Unable to load live user detail.') ||
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
    'Users page must use live-only SDK CRUD with role/dept/post selectors, dedicated role assignment, department tree filtering, bounded filtering, backend Excel export, import and current-page export without fixture fallback.',
  );
}

if (
  dictsPage.includes('createDictFixtures') ||
  dictsPage.includes('Live data unavailable; showing SDK fixtures.') ||
  !dictsPage.includes('Unable to load live dictionaries') ||
  !dictsPage.includes('Unable to load live dictionary detail.') ||
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
    'Dictionaries page must use live-only SDK CRUD with item editing, bounded filtering and current-page export, without fixture fallback.',
  );
}

if (
  configPage.includes('createSystemConfigFixtures') ||
  configPage.includes('fallbackRows') ||
  configPage.includes('Using fallback config snapshot') ||
  configPage.includes('setRows(fallbackRows)') ||
  configPage.includes('setSelectedDetail(record)') ||
  !configPage.includes('Unable to load live system config') ||
  !configPage.includes('Unable to load live system config detail.') ||
  !configPage.includes('Unable to load live config environment overrides.') ||
  !configPage.includes('Unable to load live config secret versions.') ||
  !configPage.includes('Unable to load live config vault status.') ||
  !configPage.includes('listOpenCoreSystemConfig') ||
  !configPage.includes('getOpenCoreSystemConfig') ||
  !configPage.includes('getOpenCoreSystemConfigValue') ||
  !configPage.includes('refreshOpenCoreSystemConfigCache') ||
  !configPage.includes('exportOpenCoreSystemConfig') ||
  !configPage.includes('Read public value by key') ||
  !configPage.includes('Refresh cache') ||
  !configPage.includes('Feature Flag') ||
  !configPage.includes('Vault encrypted') ||
  !configPage.includes('renderVault') ||
  !configPage.includes('featureFlagConfigKeyPattern') ||
  !configPage.includes('featureFlagRolloutConfigKeyPattern') ||
  !configPage.includes('featureFlagAudienceConfigKeyPattern') ||
  !configPage.includes('Toggle feature flag') ||
  !configPage.includes('featureFlagTogglingKey') ||
  !configPage.includes('Feature rollout') ||
  !configPage.includes('Rollout %') ||
  !configPage.includes('Set rollout') ||
  !configPage.includes('featureFlagRolloutSavingKey') ||
  !configPage.includes('Feature audience') ||
  !configPage.includes('Audience Rules') ||
  !configPage.includes('Set audience') ||
  !configPage.includes('featureFlagAudienceSavingKey') ||
  !configPage.includes('Environment Override') ||
  !configPage.includes('Environment overrides') ||
  !configPage.includes('environmentConfigTarget') ||
  !configPage.includes('openEnvironmentOverride') ||
  !configPage.includes('saveEnvironmentOverride') ||
  !configPage.includes('deleteEnvironmentOverride') ||
  !configPage.includes('listOpenCoreSystemConfigEnvironmentOverrides') ||
  !configPage.includes('upsertOpenCoreSystemConfigEnvironmentOverride') ||
  !configPage.includes('deleteOpenCoreSystemConfigEnvironmentOverride') ||
  !configPage.includes('Secret Versions') ||
  !configPage.includes('Rotate secret') ||
  !configPage.includes('secretConfigTarget') ||
  !configPage.includes('openSecretVersions') ||
  !configPage.includes('rotateSecret') ||
  !configPage.includes('listOpenCoreSystemConfigSecretVersions') ||
  !configPage.includes('rotateOpenCoreSystemConfigSecret') ||
  !configPage.includes('Vault Key Rotation') ||
  !configPage.includes('Managed KMS provider') ||
  !configPage.includes('External encryption') ||
  !configPage.includes('Rotate vault key') ||
  !configPage.includes('Active vault key') ||
  !configPage.includes('openVaultStatus') ||
  !configPage.includes('rotateVaultKey') ||
  !configPage.includes('getOpenCoreSystemConfigVaultStatus') ||
  !configPage.includes('rotateOpenCoreSystemConfigVaultKey') ||
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
    'System Config page must use live-only SDK CRUD with redacted secret preservation, bounded filtering, system deletion guards, vault/KMS controls, environment overrides and current-page export without fixture fallback.',
  );
}

if (
  filesPage.includes('createFileAssetFixtures') ||
  filesPage.includes('fallbackRows') ||
  filesPage.includes('Using fallback file fixtures') ||
  filesPage.includes('setRows(fallbackRows)') ||
  filesPage.includes('setSelectedDetail(record)') ||
  !filesPage.includes('listOpenCoreFiles') ||
  !filesPage.includes('getOpenCoreFile') ||
  !filesPage.includes('uploadOpenCoreFile') ||
  !filesPage.includes('downloadOpenCoreFile') ||
  !filesPage.includes('updateOpenCoreFile') ||
  !filesPage.includes('deleteOpenCoreFile') ||
  !filesPage.includes('Unable to load live files') ||
  !filesPage.includes('Unable to load live file detail.') ||
  !filesPage.includes('Choose file') ||
  !filesPage.includes('Upload File') ||
  !filesPage.includes('DownloadOutlined') ||
  !filesPage.includes('useCurrentPageFilters') ||
  !filesPage.includes('CurrentPageExportButton') ||
  !filesPage.includes('dataSource={filteredRows}') ||
  !filesPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Files page must use live-only SDK upload/download/edit/delete with bounded filtering and current-page export without fixture fallback.',
  );
}

if (
  !auditLogsPage.includes('listOpenCoreAuditLogs') ||
  !auditLogsPage.includes('getOpenCoreAuditLog') ||
  !auditLogsPage.includes('useCurrentPageFilters') ||
  !auditLogsPage.includes('serverFilterToolbar') ||
  !auditLogsPage.includes('CurrentPageExportButton') ||
  !auditLogsPage.includes('dataSource={filteredRows}') ||
  !auditLogsPage.includes('rows={filteredRows}') ||
  !auditLogsPage.includes('Operation actor server filter') ||
  !auditLogsPage.includes('Operation action server filter') ||
  !auditLogsPage.includes('Operation resource server filter') ||
  !auditLogsPage.includes('Operation location server filter') ||
  !auditLogsPage.includes('Operation status server filter') ||
  !auditLogsPage.includes('Operation minimum duration server filter') ||
  !auditLogsPage.includes('Operation maximum duration server filter') ||
  !auditLogsPage.includes('Operation created from server filter') ||
  !auditLogsPage.includes('Operation created to server filter') ||
  !auditLogsPage.includes('Apply operation log server filters') ||
  !auditLogsPage.includes('Retention policy') ||
  !auditLogsPage.includes('durationMs') ||
  !auditLogsPage.includes('location') ||
  !auditLogsPage.includes('jsonSections=') ||
  auditLogsPage.includes('createAuditLogFixtures') ||
  auditLogsPage.includes('Using fallback operation log fixtures')
) {
  throw new Error(
    'Operation Logs page must use live SDK detail/list with server-side filters, metadata detail and current-page export without fixture fallback.',
  );
}

if (
  !auditLogsPage.includes('listOpenCoreAuditLogs') ||
  !auditLogsPage.includes('getOpenCoreAuditLog') ||
  !auditLogsPage.includes('deleteOpenCoreAuditLogs') ||
  !auditLogsPage.includes('cleanOpenCoreAuditLogs') ||
  !auditLogsPage.includes('useCurrentPageFilters') ||
  !auditLogsPage.includes('CurrentPageExportButton') ||
  !auditLogsPage.includes('dataSource={filteredRows}') ||
  !auditLogsPage.includes('rows={filteredRows}') ||
  !auditLogsPage.includes('Retention policy') ||
  !auditLogsPage.includes('core:audit-log:delete') ||
  !auditLogsPage.includes('canDeleteAuditLogs') ||
  !auditLogsPage.includes('Delete selected') ||
  !auditLogsPage.includes('Clean expired') ||
  !auditLogsPage.includes('retentionDays') ||
  !auditLogsPage.includes('rowSelection') ||
  !auditLogsPage.includes('selectedRowKeys') ||
  !auditLogsPage.includes('Unable to load live operation logs')
) {
  throw new Error(
    'Operation Logs page must expose permission-gated cleanup controls over live SDK audit logs.',
  );
}

if (
  !loginLogsPage.includes('listOpenCoreLoginLogs') ||
  !loginLogsPage.includes('getOpenCoreLoginLog') ||
  !loginLogsPage.includes('deleteOpenCoreLoginLogs') ||
  !loginLogsPage.includes('cleanOpenCoreLoginLogs') ||
  !loginLogsPage.includes('unlockOpenCoreLoginUser') ||
  !loginLogsPage.includes('useCurrentPageFilters') ||
  !loginLogsPage.includes('CurrentPageExportButton') ||
  !loginLogsPage.includes('dataSource={filteredRows}') ||
  !loginLogsPage.includes('rows={filteredRows}') ||
  !loginLogsPage.includes('Audit trail with unlock and cleanup') ||
  !loginLogsPage.includes('core:login-log:delete') ||
  !loginLogsPage.includes('canDeleteLoginLogs') ||
  !loginLogsPage.includes('canManageLoginLogs') ||
  !loginLogsPage.includes('Delete selected') ||
  !loginLogsPage.includes('Clean all') ||
  !loginLogsPage.includes('rowSelection') ||
  !loginLogsPage.includes('selectedRowKeys') ||
  !loginLogsPage.includes('UnlockOutlined') ||
  !loginLogsPage.includes('account_locked') ||
  !loginLogsPage.includes('serverFilterToolbar') ||
  !loginLogsPage.includes('loginTypeOptions') ||
  !loginLogsPage.includes('logout.force') ||
  !loginLogsPage.includes('Forced logout') ||
  !loginLogsPage.includes('loginResultOptions') ||
  !loginLogsPage.includes('formatLoginType') ||
  !loginLogsPage.includes('formatLoginResult') ||
  !loginLogsPage.includes('logType') ||
  !loginLogsPage.includes('result') ||
  !loginLogsPage.includes('actorUsername') ||
  !loginLogsPage.includes('Login actor server filter') ||
  !loginLogsPage.includes("dataIndex: 'actorUsername'") ||
  !loginLogsPage.includes('pages.security.loginLogs.fields.actor') ||
  !loginLogsPage.includes("dataIndex: 'reason'") ||
  !loginLogsPage.includes('pages.security.loginLogs.fields.reason') ||
  !loginLogsPage.includes("dataIndex: 'location'") ||
  !loginLogsPage.includes('pages.security.loginLogs.fields.location') ||
  !loginLogsPage.includes('Login location server filter') ||
  !loginLogsPage.includes('createdFrom') ||
  !loginLogsPage.includes('createdTo') ||
  !loginLogsPage.includes('Browser') ||
  !loginLogsPage.includes('OS') ||
  !loginLogsPage.includes('Unable to load live login logs') ||
  loginLogsPage.includes('createLoginLogFixtures') ||
  loginLogsPage.includes('Using fallback login log fixtures')
) {
  throw new Error(
    'Login Logs page must use live SDK detail/list/unlock with server-side filters, login type/result fields, device fields and current-page export without fixture fallback.',
  );
}

if (
  rolesPage.includes('createPermissionSummariesFromRegistry') ||
  rolesPage.includes('createSystemDeptFixtures') ||
  rolesPage.includes('fallbackRows') ||
  rolesPage.includes('Using fallback role snapshot') ||
  rolesPage.includes('setRows(fallbackRows)') ||
  rolesPage.includes('setSelectedDetail(record)') ||
  !rolesPage.includes('Unable to load live roles') ||
  !rolesPage.includes('Unable to load live role detail.') ||
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
    'Roles page must use live-only SDK CRUD with bounded filtering, assignments and current-page export without registry fixture fallback.',
  );
}

if (
  permissionsPage.includes('createPermissionSummariesFromRegistry') ||
  permissionsPage.includes('Using fallback permission snapshot') ||
  !permissionsPage.includes('Unable to load live permissions') ||
  !permissionsPage.includes('Unable to load live permission detail.') ||
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
    'Permissions page must use live-only SDK CRUD with bounded filtering and current-page export, without registry fixture fallback.',
  );
}

if (
  departmentsPage.includes('createSystemDeptFixtures') ||
  departmentsPage.includes('Using fallback department snapshot') ||
  !departmentsPage.includes('Unable to load live departments') ||
  !departmentsPage.includes('Unable to load live department detail.') ||
  !departmentsPage.includes('listOpenCoreSystemDepts') ||
  !departmentsPage.includes('getOpenCoreSystemDept') ||
  !departmentsPage.includes('createOpenCoreSystemDept') ||
  !departmentsPage.includes('updateOpenCoreSystemDept') ||
  !departmentsPage.includes('updateOpenCoreSystemDeptOrder') ||
  !departmentsPage.includes('deleteOpenCoreSystemDept') ||
  !departmentsPage.includes('flattenDeptTree') ||
  !departmentsPage.includes('buildDeptTree') ||
  !departmentsPage.includes('ArrowUpOutlined') ||
  !departmentsPage.includes('ArrowDownOutlined') ||
  !departmentsPage.includes('Department order saved.') ||
  !departmentsPage.includes('TreeSelect') ||
  !departmentsPage.includes('assigned users cannot be deleted') ||
  !departmentsPage.includes('useCurrentPageFilters') ||
  !departmentsPage.includes('CurrentPageExportButton') ||
  !departmentsPage.includes('dataSource={filteredTreeRows}') ||
  !departmentsPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Departments page must use live-only SDK tree CRUD, sibling order updates, bounded filtering and current-page export, without fixture fallback.',
  );
}

if (
  postsPage.includes('createSystemPostFixtures') ||
  postsPage.includes('Using fallback post snapshot') ||
  !postsPage.includes('Unable to load live posts') ||
  !postsPage.includes('Unable to load live post detail.') ||
  !postsPage.includes('listOpenCoreSystemPosts') ||
  !postsPage.includes('getOpenCoreSystemPost') ||
  !postsPage.includes('createOpenCoreSystemPost') ||
  !postsPage.includes('updateOpenCoreSystemPost') ||
  !postsPage.includes('updateOpenCoreSystemPostOrder') ||
  !postsPage.includes('deleteOpenCoreSystemPost') ||
  !postsPage.includes('deleteOpenCoreSystemPosts') ||
  !postsPage.includes('ArrowUpOutlined') ||
  !postsPage.includes('ArrowDownOutlined') ||
  !postsPage.includes('Post order saved.') ||
  !postsPage.includes('selectedPostCodes') ||
  !postsPage.includes('rowSelection') ||
  !postsPage.includes('Delete selected') ||
  !postsPage.includes('useCurrentPageFilters') ||
  !postsPage.includes('CurrentPageExportButton') ||
  !postsPage.includes('dataSource={filteredRows}') ||
  !postsPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'Posts page must use live-only SDK CRUD, batch deletion, order updates, bounded filtering and current-page export, without fixture fallback.',
  );
}

if (
  menusPage.includes('createMenuSummariesFromRegistry') ||
  menusPage.includes('createPermissionSummariesFromRegistry') ||
  menusPage.includes('Using fallback menu snapshot') ||
  !menusPage.includes('Unable to load live menus') ||
  !menusPage.includes('Unable to load live menu detail.') ||
  !menusPage.includes('listOpenCoreMenus') ||
  !menusPage.includes('listOpenCorePermissions') ||
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
    'Menus page must use live-only SDK tree CRUD with live permission options, bounded filtering and current-page export, without registry fixture fallback.',
  );
}

if (
  systemNoticesPage.includes('createSystemNoticeFixtures') ||
  systemNoticesPage.includes('fallbackRows') ||
  systemNoticesPage.includes('Using fallback system notice snapshot') ||
  systemNoticesPage.includes('setRows(fallbackRows)') ||
  systemNoticesPage.includes('setSelectedDetail(record)') ||
  systemNoticesPage.includes('setSelectedTemplateDetail(record)') ||
  systemNoticesPage.includes('setSelectedInboxDetail(record)') ||
  !systemNoticesPage.includes('Unable to load live system notices') ||
  !systemNoticesPage.includes('Unable to load live system notice detail.') ||
  !systemNoticesPage.includes(
    'Unable to load live system notice template detail.',
  ) ||
  !systemNoticesPage.includes(
    'Unable to load live system notice inbox detail.',
  ) ||
  !systemNoticesPage.includes('Unable to load live system notice templates') ||
  !systemNoticesPage.includes('Unable to load live system notice read users') ||
  !systemNoticesPage.includes(
    'Unable to load live system notice delivery records',
  ) ||
  !systemNoticesPage.includes('listOpenCoreSystemNotices') ||
  !systemNoticesPage.includes('listOpenCoreSystemNoticeInbox') ||
  !systemNoticesPage.includes('getOpenCoreSystemNoticeInboxEventsPath') ||
  !systemNoticesPage.includes('Realtime stream') ||
  !systemNoticesPage.includes('SSE inbox events') ||
  !systemNoticesPage.includes('getOpenCoreSystemNoticeInboxItem') ||
  !systemNoticesPage.includes('listOpenCoreSystemNoticeReadUsers') ||
  !systemNoticesPage.includes('listOpenCoreSystemNoticeDeliveries') ||
  !systemNoticesPage.includes('dispatchOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('listOpenCoreSystemNoticeTemplates') ||
  !systemNoticesPage.includes('getOpenCoreSystemNoticeTemplate') ||
  !systemNoticesPage.includes('renderOpenCoreSystemNoticeTemplate') ||
  !systemNoticesPage.includes('createOpenCoreSystemNoticeFromTemplate') ||
  !systemNoticesPage.includes('markOpenCoreIntegrationOutboxFailed') ||
  !systemNoticesPage.includes('retryOpenCoreIntegrationOutbox') ||
  !systemNoticesPage.includes('processOpenCoreIntegrationOutbox') ||
  !systemNoticesPage.includes('markOpenCoreIntegrationOutboxSent') ||
  !systemNoticesPage.includes('createOpenCoreSystemNoticeTemplate') ||
  !systemNoticesPage.includes('updateOpenCoreSystemNoticeTemplate') ||
  !systemNoticesPage.includes('deleteOpenCoreSystemNoticeTemplate') ||
  !systemNoticesPage.includes('markOpenCoreSystemNoticesRead') ||
  !systemNoticesPage.includes('markAllOpenCoreSystemNoticesRead') ||
  !systemNoticesPage.includes('createOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('updateOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('publishOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('archiveOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('deleteOpenCoreSystemNotice') ||
  !systemNoticesPage.includes('executeOpenCoreSystemNoticeDeliveries') ||
  !systemNoticesPage.includes("key: 'inbox'") ||
  !systemNoticesPage.includes("key: 'templates'") ||
  !systemNoticesPage.includes('System Notice Templates') ||
  !systemNoticesPage.includes('Notice template render preview') ||
  !systemNoticesPage.includes('Create draft from template') ||
  !systemNoticesPage.includes('Mark all read') ||
  !systemNoticesPage.includes('Read users') ||
  !systemNoticesPage.includes('System Notice Read Users') ||
  !systemNoticesPage.includes('Delivery records') ||
  !systemNoticesPage.includes('Dispatch in-app deliveries') ||
  !systemNoticesPage.includes('Dispatch mail deliveries') ||
  !systemNoticesPage.includes('Dispatch SMS deliveries') ||
  !systemNoticesPage.includes('Execute mail outbox provider') ||
  !systemNoticesPage.includes('Execute SMS outbox provider') ||
  !systemNoticesPage.includes('Execute local provider') ||
  !systemNoticesPage.includes('Provider Message') ||
  !systemNoticesPage.includes('Provider Status') ||
  !systemNoticesPage.includes('Outbox Actions') ||
  !systemNoticesPage.includes('Fail outbox') ||
  !systemNoticesPage.includes('Retry outbox') ||
  !systemNoticesPage.includes('Process queued outbox') ||
  !systemNoticesPage.includes('Run outbox schedule') ||
  !systemNoticesPage.includes('runOpenCoreIntegrationOutboxSchedule') ||
  !systemNoticesPage.includes('result.failedCount') ||
  !systemNoticesPage.includes('Mark outbox sent') ||
  !systemNoticesPage.includes('System Notice Delivery Records') ||
  !systemNoticesPage.includes('System Notice Inbox Detail') ||
  !systemNoticesPage.includes('System Notice Template Detail') ||
  !systemNoticesPage.includes('core-notice-templates') ||
  !systemNoticesPage.includes('useCurrentPageFilters') ||
  !systemNoticesPage.includes('CurrentPageExportButton') ||
  !systemNoticesPage.includes('dataSource={filteredRows}') ||
  !systemNoticesPage.includes('dataSource={filteredTemplates}') ||
  !systemNoticesPage.includes('rows={filteredRows}')
) {
  throw new Error(
    'System Notices page must use live-only SDK lifecycle, inbox, template and outbox delivery actions with bounded filtering and current-page export without fixture fallback.',
  );
}

if (
  !appRuntime.includes('<NoticeBell key="notice" />') ||
  !noticeBell.includes('getOpenCoreSystemNoticeUnreadCount') ||
  !noticeBell.includes('listOpenCoreUnreadSystemNotices') ||
  !noticeBell.includes('markOpenCoreSystemNoticesRead') ||
  !noticeBell.includes('markAllOpenCoreSystemNoticesRead') ||
  !noticeBell.includes('/system/notices?tab=inbox') ||
  !noticeBell.includes('System notice inbox')
) {
  throw new Error(
    'Admin header must expose the live System Notice inbox badge and read actions.',
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
  !currentPageExportButton.includes('CSV_FILENAME_UNSAFE_CHARACTERS') ||
  !currentPageExportButton.includes('[=+\\-@]') ||
  !currentPageExportButton.includes('char.charCodeAt(0) < 32') ||
  !currentPageExportButton.includes(
    'CSV_FILENAME_UNSAFE_CHARACTERS.has(char)',
  ) ||
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
  !configPage.includes('[REDACTED]') ||
  !configPage.includes('formatConfigValue') ||
  !configPage.includes("record.visibility === 'secret'") ||
  !configPage.includes('record.encrypted')
) {
  throw new Error(
    'System config detail/export must redact secret values and surface vault encryption.',
  );
}

if (
  !providersPage.includes('staticValueLabels.redacted') ||
  !providersPage.includes('pages.integrations.providers.fields.secretRef') ||
  !providersPage.includes('value: selected?.secretRef') ||
  !providersPage.includes('sensitive: true') ||
  !providersPage.includes('getOpenCoreIntegrationProviderHealthAudit') ||
  !providersPage.includes('getOpenCoreIntegrationProviderDiagnostics') ||
  !providersPage.includes('Live Integration Health Audit') ||
  !providersPage.includes(
    'Unable to load live Integration Health Audit data',
  ) ||
  !providersPage.includes('Signed callback contract') ||
  !providersPage.includes('Provider Diagnostics') ||
  !providersPage.includes('Config Version') ||
  !providersPage.includes('Secret Ref Validation') ||
  !providersPage.includes('Provider Test') ||
  !providersPage.includes('Provider Audit Logs') ||
  !providersPage.includes('canManageIntegrationProviders') ||
  !providersPage.includes('canUpdateIntegrationProviders') ||
  !providersPage.includes('selectedDiagnostics?.readiness') ||
  !providersPage.includes('SMS HTTP adapter') ||
  !providersPage.includes('HTTP Secret Injection') ||
  !providersPage.includes('Mail SMTP adapter') ||
  !providersPage.includes('SMTP TLS Policy') ||
  !providersPage.includes('selected.config.tlsMode') ||
  !providersPage.includes('allowlisted endpoint + status contract') ||
  !providersPage.includes('secretRef -> header/query/body') ||
  !providersPage.includes('secretRef -> config vault + SMTP send') ||
  !providersPage.includes('/api/integrations/mail/outbox/callback') ||
  !providersPage.includes('/api/integrations/sms/outbox/callback') ||
  !providersPage.includes('HMAC-SHA256') ||
  providersPage.includes('createIntegrationFixtures') ||
  providersPage.includes('createIntegrationProviderHealthAuditFixture') ||
  providersPage.includes('findIntegrationOutboxFixture') ||
  providersPage.includes('Using fallback Integration Health Audit data') ||
  !opencorePlatformService.includes(
    'integrationClient.getProviderHealthAudit',
  ) ||
  !opencorePlatformService.includes(
    'integrationClient.getProviderDiagnostics',
  ) ||
  !opencorePlatformService.includes('integrationClient.testProvider') ||
  !opencorePlatformService.includes('integrationClient.listProviderAuditLogs')
) {
  throw new Error(
    'Integration provider list and detail must use live health audit/diagnostics/provider test/audit data, redact scalar secret references and show signed callback/provider adapter contracts without fixture fallback.',
  );
}

if (
  !jobsPage.includes('listOpenCoreJobs') ||
  !jobsPage.includes('getOpenCoreJob') ||
  !jobsPage.includes('listOpenCoreJobRegistry') ||
  !jobsPage.includes('listOpenCoreJobRuns') ||
  !jobsPage.includes('enableOpenCoreJob') ||
  !jobsPage.includes('disableOpenCoreJob') ||
  !jobsPage.includes('triggerOpenCoreJob') ||
  !jobsPage.includes('cleanOpenCoreJobRuns') ||
  !jobsPage.includes('canUpdateJobs') ||
  !jobsPage.includes('canManageJobs') ||
  !jobsPage.includes('Run now') ||
  !jobsPage.includes('Run log retention') ||
  !jobsPage.includes('Clean run logs') ||
  !jobsPage.includes('activeRunRows') ||
  !jobsPage.includes('Queued/running run logs') ||
  !jobsPage.includes(
    'Visible run logs behind Dashboard pending/running counts',
  ) ||
  !jobsPage.includes('Live scheduler jobs') ||
  !jobsPage.includes('Unable to load live scheduler jobs') ||
  !jobsPage.includes('Registered handlers') ||
  !jobsPage.includes('Handler Key') ||
  !jobsPage.includes('Execution Mode') ||
  !jobsPage.includes(
    'registered handler execution + retry/timeout diagnostics',
  ) ||
  jobsPage.includes('createOperationsFixtures') ||
  jobsPage.includes('Using fallback job fixtures')
) {
  throw new Error(
    'Monitor jobs page must use live job APIs with registry, enable/disable, manual trigger, run-log detail, run-log cleanup, live-only data and permission-gated controls.',
  );
}

if (
  !onlineUsersPage.includes('listOpenCoreOnlineUsers') ||
  !onlineUsersPage.includes('getOpenCoreOnlineUser') ||
  !onlineUsersPage.includes('kickOutOpenCoreOnlineUser') ||
  !onlineUsersPage.includes('kickOutOpenCoreOnlineUsers') ||
  !onlineUsersPage.includes('getOpenCoreOnlineUserSummary') ||
  !onlineUsersPage.includes('cleanExpiredOpenCoreOnlineUsers') ||
  !onlineUsersPage.includes('canManageOnlineUsers') ||
  !onlineUsersPage.includes('useAccess') ||
  !onlineUsersPage.includes('useCurrentPageFilters') ||
  !onlineUsersPage.includes('CurrentPageExportButton') ||
  !onlineUsersPage.includes('dataSource={filteredRows}') ||
  !onlineUsersPage.includes('rows={filteredRows}') ||
  !onlineUsersPage.includes('Live online user sessions') ||
  !onlineUsersPage.includes('Unable to load live online users') ||
  !onlineUsersPage.includes('Kick-out invalidates active bearer sessions') ||
  !onlineUsersPage.includes('Token blacklist maintenance') ||
  !onlineUsersPage.includes('Clean expired sessions') ||
  !onlineUsersPage.includes('Cleanup eligible') ||
  !onlineUsersPage.includes('activeSelectedRows') ||
  !onlineUsersPage.includes('Kick selected') ||
  !onlineUsersPage.includes('pages.monitor.onlineUsers.fields.browser') ||
  !onlineUsersPage.includes('pages.monitor.onlineUsers.fields.os') ||
  !onlineUsersPage.includes('pages.monitor.onlineUsers.fields.tokenId') ||
  !onlineUsersPage.includes('value: record.tokenId') ||
  !onlineUsersPage.includes('pages.monitor.onlineUsers.fields.revokedReason') ||
  !onlineUsersPage.includes('value: record.revokedReason') ||
  (onlineUsersPage.match(/sensitive: true/g) ?? []).length < 2 ||
  onlineUsersPage.includes('createOperationsFixtures') ||
  onlineUsersPage.includes('Using fallback online user fixtures')
) {
  throw new Error(
    'Online user Admin must use live-only list/detail/kick-out data and redact scalar token fields without fixture fallback.',
  );
}

const admittedFilteredPages = [
  { exportsRows: true, name: 'messages', source: messagesPage },
  { exportsRows: true, name: 'notices', source: noticesPage },
  { exportsRows: true, name: 'todos', source: todosPage },
  { exportsRows: true, name: 'approvals', source: approvalsPage },
  { exportsRows: true, name: 'jobs', source: jobsPage },
  { exportsRows: true, name: 'cache', source: cachePage },
  { exportsRows: true, name: 'online users', source: onlineUsersPage },
  { exportsRows: true, name: 'reports', source: reportsPage },
  { exportsRows: true, name: 'export jobs', source: exportJobsPage },
  { exportsRows: true, name: 'providers', source: providersPage },
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

if (
  !mailPage.includes('useCurrentPageFilters') ||
  !mailPage.includes('dataSource={filteredTemplates}') ||
  !mailPage.includes('dataSource={filteredOutboxRows}') ||
  !mailPage.includes('rows={filteredTemplates}') ||
  !mailPage.includes('rows={filteredOutboxRows}')
) {
  throw new Error(
    'Integration Mail page must expose bounded filters and current-page exports for live templates and outbox rows.',
  );
}

if (
  !smsPage.includes('useCurrentPageFilters') ||
  !smsPage.includes('dataSource={filteredTemplates}') ||
  !smsPage.includes('dataSource={filteredOutboxRows}') ||
  !smsPage.includes('rows={filteredTemplates}') ||
  !smsPage.includes('rows={filteredOutboxRows}')
) {
  throw new Error(
    'Integration SMS page must expose bounded filters and current-page exports for live templates and outbox rows.',
  );
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
