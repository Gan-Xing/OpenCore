#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = readRootArg();
const adminRoot = join(root, 'apps', 'admin');
const localesRoot = join(adminRoot, 'src', 'locales');
const supportedLocales = new Set(['zh-CN', 'en-US']);
const forbiddenLocaleNames = [
  'bn-BD',
  'fa-IR',
  'id-ID',
  'ja-JP',
  'pt-BR',
  'zh-TW',
];
const forbiddenMarkers = [
  'Ant Design 是西湖',
  'Ant Design is the most influential',
  'admin/ant.design',
  'Password: ant.design',
  '密码: ant.design',
  'pages.searchTable.',
  "'menu.form'",
  "'menu.list'",
  "'menu.editor'",
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

checkForbiddenMarkers(localesRoot);
checkRouteMenuKeys();

if (failures.length > 0) {
  console.error('Admin i18n guard failed.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Admin i18n guard passed.');

function checkForbiddenMarkers(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      checkForbiddenMarkers(fullPath);
      continue;
    }

    if (!fullPath.endsWith('.ts')) {
      continue;
    }

    const content = readFileSync(fullPath, 'utf8');
    for (const marker of forbiddenMarkers) {
      if (content.includes(marker)) {
        failures.push(
          `Forbidden template marker ${JSON.stringify(marker)} in ${relative(
            root,
            fullPath,
          )}`,
        );
      }
    }
  }
}

function checkRouteMenuKeys(): void {
  const routesPath = join(adminRoot, 'config', 'routes.ts');
  const routesSource = readFileSync(routesPath, 'utf8');
  const routeNames = [...routesSource.matchAll(/name:\s*'([^']+)'/g)].map(
    (match) => match[1],
  );
  const menuKeysByLocale = new Map(
    [...supportedLocales].map((locale) => [
      locale,
      readLocaleKeys(join(localesRoot, locale, 'menu.ts')),
    ]),
  );

  for (const routeName of routeNames) {
    const menuKey = `menu.${routeName}`;
    for (const [locale, keys] of menuKeysByLocale) {
      if (!keys.has(menuKey)) {
        failures.push(`${locale} is missing route menu key: ${menuKey}`);
      }
    }
  }
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
