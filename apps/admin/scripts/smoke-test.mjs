import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
);
const deps = packageJson.dependencies ?? {};

const requiredVersions = {
  '@umijs/max': /^(\^)?4\./,
  '@ant-design/pro-components': /^3\./,
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

const config = readFileSync(resolve(root, '.umirc.ts'), 'utf8');
if (
  config.includes("component: './Access'") ||
  config.includes("component: './Table'") ||
  config.includes("component: './Home'") ||
  config.includes("path: '/home'")
) {
  throw new Error(
    'Template demo routes must not be mounted in S5 admin routes.',
  );
}

for (const requiredRoute of [
  "path: '/dashboard'",
  "path: '/tools/openapi'",
  "path: '/system/users'",
  "path: '/system/roles'",
  "path: '/system/permissions'",
  "path: '/system/menus'",
  "path: '/system/dicts'",
  "path: '/system/config'",
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
    throw new Error(`Missing shell route in .umirc.ts: ${requiredRoute}`);
  }
}

const appRuntime = readFileSync(resolve(root, 'src/app.ts'), 'utf8');
if (
  !appRuntime.includes('createLayoutMenuItems') ||
  !appRuntime.includes('shellMenuItems')
) {
  throw new Error(
    'Admin layout must derive menu data from the shell registry.',
  );
}

const accessRuntime = readFileSync(resolve(root, 'src/access.ts'), 'utf8');
if (
  !accessRuntime.includes('core:dashboard:read') ||
  !accessRuntime.includes('tool:openapi:read') ||
  !accessRuntime.includes('core:user:read') ||
  !accessRuntime.includes('core:role:read') ||
  !accessRuntime.includes('core:permission:read') ||
  !accessRuntime.includes('core:menu:read') ||
  !accessRuntime.includes('core:dict:read') ||
  !accessRuntime.includes('core:config:read') ||
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
  !permissionsPage.includes('@opencore/sdk') ||
  !dictsPage.includes('@opencore/sdk') ||
  !configPage.includes('@opencore/sdk') ||
  !filesPage.includes('@opencore/sdk') ||
  !auditLogsPage.includes('@opencore/sdk') ||
  !loginLogsPage.includes('@opencore/sdk') ||
  !statusPage.includes('@opencore/sdk') ||
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
  !currentPageExportButton.includes('[\\\\/:*?"<>|\\x00-\\x1F]') ||
  !currentPageExportButton.includes("basename || 'opencore-export'") ||
  !currentPageExportButton.includes("endsWith('.csv')") ||
  !currentPageExportButton.includes("return `'${text}`;") ||
  !currentPageExportButton.includes(
    'sanitizeCsvCellText(normalizeCellValue(value))',
  ) ||
  !currentPageExportButton.includes(
    'sanitizeCsvFilename(filename ?? `opencore-${resource}.csv`)',
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

const coreFilteredPages = [
  { name: 'users', source: usersPage },
  { name: 'roles', source: rolesPage },
  { name: 'permissions', source: permissionsPage },
  { name: 'menus', source: menusPage },
  { name: 'dicts', source: dictsPage },
  { name: 'config', source: configPage },
  { name: 'files', source: filesPage },
  { name: 'operation logs', source: auditLogsPage },
  { name: 'login logs', source: loginLogsPage },
];

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
  !onlineUsersPage.includes("label: 'Token ID'") ||
  !onlineUsersPage.includes('selected?.tokenId, sensitive: true') ||
  !onlineUsersPage.includes("label: 'Revoked Reason'") ||
  !onlineUsersPage.includes('selected?.revokedReason') ||
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
