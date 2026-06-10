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
  !accessRuntime.includes('tool:export:read')
) {
  throw new Error(
    'Admin access must guard shell, S6 RBAC, S7 system, and S8 monitor/tool routes by permission code.',
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
  !shellRegistry.includes('tool.export')
) {
  throw new Error('Admin shell registry must consume module-registry entries.');
}

const usersPage = readFileSync(
  resolve(root, 'src/pages/System/Users.tsx'),
  'utf8',
);
const permissionsPage = readFileSync(
  resolve(root, 'src/pages/System/Permissions.tsx'),
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
  !exportPage.includes('@opencore/sdk')
) {
  throw new Error(
    'Admin RBAC, system, monitor, and tool pages must consume SDK types or fixtures.',
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
