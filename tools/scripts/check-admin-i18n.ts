#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = readRootArg();
const adminRoot = join(root, 'apps', 'admin');
const localesRoot = join(adminRoot, 'src', 'locales');
const supportedLocales = new Set(['zh-CN', 'en-US']);
const commonApiErrorCodes = new Set([
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_SERVER_ERROR',
]);
const backendErrorCodePrefixes = [
  'AUDIT',
  'AUTH',
  'COLLABORATION',
  'FILE',
  'INTEGRATION',
  'MONITOR',
  'ONLINE',
  'RBAC',
  'SCHEDULER',
  'SECURITY',
  'SYSTEM',
  'TOOL',
  'USER',
];
const routeMenuGroupSegments = new Set([
  'collaboration',
  'integrations',
  'monitor',
  'optional',
  'security',
  'system',
  'tools',
]);
const ignoredBackendErrorCodeCandidates = new Set([
  'FILE_STORAGE',
  'FILE_STORAGE_OPTIONS',
  'MONITOR_RUNTIME_DIAGNOSTICS',
]);
const forbiddenLocaleNames = [
  'bn-BD',
  'fa-IR',
  'id-ID',
  'ja-JP',
  'pt-BR',
  'zh-TW',
];
const forbiddenMarkers = [
  'Ant Design Pro',
  'ant-design/ant-design-pro',
  'official Ant Design Pro',
  'Ant Design 是西湖',
  'Ant Design is the most influential',
  'admin/ant.design',
  'Password: ant.design',
  '密码: ant.design',
  'None response! Please retry.',
  'Request error, please retry.',
  'pages.searchTable.',
  "'menu.form'",
  "'menu.list'",
  "'menu.editor'",
];
const coreI18nScanPaths = [
  join(adminRoot, 'src', 'components', 'ErrorBoundary', 'index.tsx'),
  join(adminRoot, 'src', 'components', 'Footer', 'index.tsx'),
  join(adminRoot, 'src', 'components', 'OfflineBanner', 'index.tsx'),
  join(adminRoot, 'src', 'components', 'RightContent', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Exception', '403.tsx'),
  join(adminRoot, 'src', 'pages', 'Exception', '404.tsx'),
  join(adminRoot, 'src', 'pages', 'Exception', '500.tsx'),
  join(adminRoot, 'src', 'pages', 'Exception', 'ExceptionPage.tsx'),
  join(adminRoot, 'src', 'pages', 'Dashboard', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Optional', 'ExportJobs.tsx'),
  join(adminRoot, 'src', 'pages', 'Optional', 'Reports.tsx'),
  join(adminRoot, 'src', 'pages', 'Personal', 'Profile.tsx'),
  join(adminRoot, 'src', 'pages', 'shared', 'CurrentPageExportButton.tsx'),
  join(adminRoot, 'src', 'pages', 'shared', 'CurrentPageFilters.tsx'),
  join(adminRoot, 'src', 'pages', 'shared', 'ReadOnlyDetailDrawer.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'Mail.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'BillingDesign.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'OAuth.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'Providers.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'Sms.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'WeChat.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'WebSocket.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Cache.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Jobs.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'OnlineUsers.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Queues.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Status.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Version.tsx'),
  join(adminRoot, 'src', 'pages', 'Security', 'LoginLogs.tsx'),
  join(adminRoot, 'src', 'pages', 'Security', 'OperationLogs.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Config.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Departments.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Dicts.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Files.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Menus.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Notices.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Permissions.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Posts.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'RbacTable.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Roles.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'SystemManagementTable.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Users.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Approvals.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Messages.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Notices.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Todos.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'Area', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'Export', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'OpenApi', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'OpenForge', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'user', 'login', 'index.tsx'),
  join(adminRoot, 'src', 'requestErrorConfig.ts'),
];
const localizedAdminPageScanPaths = [
  join(adminRoot, 'src', 'pages', 'Dashboard', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Optional', 'ExportJobs.tsx'),
  join(adminRoot, 'src', 'pages', 'Optional', 'Reports.tsx'),
  join(adminRoot, 'src', 'pages', 'Personal', 'Profile.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'Mail.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'BillingDesign.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'OAuth.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'Providers.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'Sms.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'WeChat.tsx'),
  join(adminRoot, 'src', 'pages', 'Integrations', 'WebSocket.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Cache.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Jobs.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'OnlineUsers.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Queues.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Status.tsx'),
  join(adminRoot, 'src', 'pages', 'Monitor', 'Version.tsx'),
  join(adminRoot, 'src', 'pages', 'Security', 'LoginLogs.tsx'),
  join(adminRoot, 'src', 'pages', 'Security', 'OperationLogs.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Config.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Departments.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Dicts.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Files.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Menus.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Notices.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Permissions.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Posts.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'RbacTable.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Roles.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'SystemManagementTable.tsx'),
  join(adminRoot, 'src', 'pages', 'System', 'Users.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Approvals.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Messages.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Notices.tsx'),
  join(adminRoot, 'src', 'pages', 'Collaboration', 'Todos.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'Area', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'Export', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'OpenApi', 'index.tsx'),
  join(adminRoot, 'src', 'pages', 'Tools', 'OpenForge', 'index.tsx'),
];
const forbiddenMarkerScanPaths = [
  localesRoot,
  join(adminRoot, 'package.json'),
  join(adminRoot, 'src', 'manifest.json'),
  ...coreI18nScanPaths,
];

const failures: string[] = [];

for (const locale of forbiddenLocaleNames) {
  const entryPath = join(localesRoot, `${locale}.ts`);
  const dirPath = join(localesRoot, locale);

  if (existsSync(entryPath)) {
    failures.push(
      `Unsupported locale entry exists: ${relative(root, entryPath)}`,
    );
  }

  if (existsSync(dirPath)) {
    failures.push(
      `Unsupported locale directory exists: ${relative(root, dirPath)}`,
    );
  }
}

for (const entry of readdirSync(localesRoot)) {
  const fullPath = join(localesRoot, entry);
  const stat = statSync(fullPath);
  const localeName = stat.isDirectory()
    ? entry
    : entry.endsWith('.ts')
      ? entry.slice(0, -3)
      : undefined;

  if (localeName && !supportedLocales.has(localeName)) {
    failures.push(
      `Unexpected Admin locale artifact: ${relative(root, fullPath)}`,
    );
  }
}

for (const scanPath of forbiddenMarkerScanPaths) {
  checkForbiddenMarkers(scanPath);
}
checkRouteMenuKeys();
checkCoreI18nKeys();
checkLocalizedAdminPageText();
checkErrorLocaleParity();
checkBackendErrorCodeTranslations();

if (failures.length > 0) {
  console.error('Admin i18n guard failed.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Admin i18n guard passed.');

function checkForbiddenMarkers(path: string): void {
  const stat = statSync(path);

  if (!stat.isDirectory()) {
    checkForbiddenMarkersInFile(path);
    return;
  }

  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const entryStat = statSync(fullPath);

    if (entryStat.isDirectory()) {
      checkForbiddenMarkers(fullPath);
      continue;
    }

    checkForbiddenMarkersInFile(fullPath);
  }
}

function checkForbiddenMarkersInFile(path: string): void {
  if (!/\.(json|ts|tsx)$/u.test(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');
  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      failures.push(
        `Forbidden template marker ${JSON.stringify(marker)} in ${relative(
          root,
          path,
        )}`,
      );
    }
  }
}

function checkRouteMenuKeys(): void {
  const routesPath = join(adminRoot, 'config', 'routes.ts');
  const routesSource = readFileSync(routesPath, 'utf8');
  const routes = readRouteNamePathPairs(routesSource);
  const menuKeysByLocale = new Map(
    [...supportedLocales].map((locale) => [
      locale,
      readLocaleKeys(join(localesRoot, locale, 'menu.ts')),
    ]),
  );

  for (const route of routes) {
    const menuKey = toRouteMenuKey(route);
    for (const [locale, keys] of menuKeysByLocale) {
      if (!keys.has(menuKey)) {
        failures.push(`${locale} is missing route menu key: ${menuKey}`);
      }
    }
  }
}

function readRouteNamePathPairs(
  routesSource: string,
): Array<{ name: string; path: string }> {
  const routePairs: Array<{ name: string; path: string }> = [];
  const stack: number[] = [];

  for (let index = 0; index < routesSource.length; index += 1) {
    const char = routesSource[index];

    if (char === '{') {
      stack.push(index);
      continue;
    }

    if (char !== '}') {
      continue;
    }

    const start = stack.pop();

    if (start === undefined) {
      continue;
    }

    const objectSource = routesSource.slice(start, index + 1);
    const name = objectSource.match(/\bname:\s*'([^']+)'/)?.[1];
    const path = objectSource.match(/\bpath:\s*'([^']+)'/)?.[1];

    if (name && path) {
      routePairs.push({ name, path });
    }
  }

  return routePairs;
}

function toRouteMenuKey(route: { name: string; path: string }): string {
  const [, firstSegment] = route.path.match(/^\/([^/]+)/u) ?? [];

  if (
    firstSegment &&
    routeMenuGroupSegments.has(firstSegment) &&
    route.name !== firstSegment
  ) {
    return `menu.${firstSegment}.${route.name}`;
  }

  return `menu.${route.name}`;
}

function checkCoreI18nKeys(): void {
  const localeKeysByLocale = new Map(
    [...supportedLocales].map((locale) => [
      locale,
      readLocaleBundleKeys(locale),
    ]),
  );

  for (const scanPath of coreI18nScanPaths) {
    const ids = readI18nIds(scanPath);

    for (const id of ids) {
      for (const [locale, keys] of localeKeysByLocale) {
        if (!keys.has(id)) {
          failures.push(
            `${locale} is missing core Admin i18n key ${id} used by ${relative(
              root,
              scanPath,
            )}`,
          );
        }
      }
    }
  }
}

function checkLocalizedAdminPageText(): void {
  const hardcodedTextPatterns = [
    /\bmessage\.(?:success|error|warning|info)\(\s*['"`]/g,
    /\b(?:aria-label|label|message|okText|placeholder|subTitle|title)=["'][A-Za-z][^"']*["']/g,
    /\b(?:label|message|okText|placeholder|title):\s*['"][A-Za-z][^'"]*['"]/g,
    /<Button\b[^>]*>\s*[A-Za-z][^<{]*\s*<\/Button>/g,
    /<Typography\.(?:Text|Title)\b[^>]*>\s*[A-Za-z][^<{]*\s*<\/Typography\.(?:Text|Title)>/g,
    /<Tag\b[^>]*>\s*[A-Za-z][^<{]*\s*<\/Tag>/g,
  ];

  for (const scanPath of localizedAdminPageScanPaths) {
    const content = readFileSync(scanPath, 'utf8');

    for (const pattern of hardcodedTextPatterns) {
      for (const match of content.matchAll(pattern)) {
        failures.push(
          `Hardcoded Admin page text in ${relative(root, scanPath)}: ${JSON.stringify(
            match[0],
          )}`,
        );
      }
    }
  }
}

function checkErrorLocaleParity(): void {
  const errorKeysByLocale = new Map(
    [...supportedLocales].map((locale) => [
      locale,
      filterErrorKeys(readLocaleBundleKeys(locale)),
    ]),
  );
  const allErrorKeys = new Set<string>();

  for (const keys of errorKeysByLocale.values()) {
    for (const key of keys) {
      allErrorKeys.add(key);
    }
  }

  for (const key of [...allErrorKeys].sort()) {
    for (const [locale, keys] of errorKeysByLocale) {
      if (!keys.has(key)) {
        failures.push(`${locale} is missing Admin error i18n key: ${key}`);
      }
    }
  }
}

function checkBackendErrorCodeTranslations(): void {
  const localeKeysByLocale = new Map(
    [...supportedLocales].map((locale) => [
      locale,
      readLocaleBundleKeys(locale),
    ]),
  );

  for (const code of readBackendErrorCodes()) {
    const key = `error.${code}`;

    for (const [locale, keys] of localeKeysByLocale) {
      if (!keys.has(key)) {
        failures.push(
          `${locale} is missing backend error-code translation: ${key}`,
        );
      }
    }
  }
}

function readBackendErrorCodes(): string[] {
  const codes = new Set(commonApiErrorCodes);
  const sourceRoots = [join(root, 'apps', 'api', 'src'), join(root, 'packages')];

  for (const sourceRoot of sourceRoots) {
    if (!existsSync(sourceRoot)) {
      continue;
    }

    for (const filePath of collectTsSourceFiles(sourceRoot)) {
      const content = readFileSync(filePath, 'utf8');

      for (const match of content.matchAll(
        /['"]([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)['"]/g,
      )) {
        const code = match[1];

        if (isBackendErrorCodeCandidate(code)) {
          codes.add(code);
        }
      }
    }
  }

  return [...codes].sort();
}

function collectTsSourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        entry === 'node_modules' ||
        entry === 'dist' ||
        entry === 'coverage' ||
        entry === '__fixtures__'
      ) {
        continue;
      }

      files.push(...collectTsSourceFiles(fullPath));
      continue;
    }

    if (
      fullPath.endsWith('.ts') &&
      !fullPath.endsWith('.d.ts') &&
      !fullPath.endsWith('.spec.ts') &&
      !fullPath.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function isBackendErrorCodeCandidate(code: string): boolean {
  if (
    ignoredBackendErrorCodeCandidates.has(code) ||
    code.endsWith('_OPTIONS') ||
    code.endsWith('_SECRET') ||
    code.endsWith('_STORAGE')
  ) {
    return false;
  }

  if (commonApiErrorCodes.has(code) || /^HTTP_[45]\d\d$/u.test(code)) {
    return true;
  }

  if (code.split('_').length < 3) {
    return false;
  }

  return backendErrorCodePrefixes.some((prefix) =>
    code.startsWith(`${prefix}_`),
  );
}

function filterErrorKeys(keys: Set<string>): Set<string> {
  return new Set([...keys].filter((key) => key.startsWith('error.')));
}

function readLocaleBundleKeys(locale: string): Set<string> {
  const keys = new Set<string>();
  const entryPath = join(localesRoot, `${locale}.ts`);
  const localeDir = join(localesRoot, locale);

  for (const key of readLocaleKeys(entryPath)) {
    keys.add(key);
  }

  if (existsSync(localeDir)) {
    for (const entry of readdirSync(localeDir)) {
      const fullPath = join(localeDir, entry);

      if (statSync(fullPath).isDirectory() || !fullPath.endsWith('.ts')) {
        continue;
      }

      for (const key of readLocaleKeys(fullPath)) {
        keys.add(key);
      }
    }
  }

  return keys;
}

function readI18nIds(path: string): Set<string> {
  const content = readFileSync(path, 'utf8');
  const ids = new Set<string>();

  for (const match of content.matchAll(/\bid:\s*['"]([^'"]+)['"]/g)) {
    ids.add(match[1]);
  }

  for (const match of content.matchAll(
    /\bformatMessage\(\s*['"]([^'"]+)['"]/g,
  )) {
    ids.add(match[1]);
  }

  for (const match of content.matchAll(
    /<FormattedMessage\b[^>]*\bid=["']([^"']+)["']/g,
  )) {
    ids.add(match[1]);
  }

  return ids;
}

function readLocaleKeys(path: string): Set<string> {
  const content = readFileSync(path, 'utf8');
  return new Set(
    [...content.matchAll(/'([^']+)'\s*:/g)].map((match) => match[1]),
  );
}

function readRootArg(): string {
  const rootIndex = process.argv.indexOf('--root');

  if (rootIndex >= 0) {
    const value = process.argv[rootIndex + 1];

    if (!value) {
      throw new Error('--root requires a path');
    }

    return value;
  }

  return process.cwd();
}
