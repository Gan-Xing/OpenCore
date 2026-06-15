#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const DEFAULT_MANIFEST_PATH = 'tools/guards/system-admin-live-only.guard.json';

type AdminLiveOnlyGuardManifest = {
  expectedPageCount?: number;
  name: string;
  pages: AdminLiveOnlyGuardPage[];
};

type AdminLiveOnlyGuardPage = {
  forbiddenDist: string[];
  forbiddenSource: string[];
  name: string;
  requiredDist: string[];
  requiredSource: string[];
  sourcePath: string;
};

type AdminFallbackClosureGuardOptions = {
  checkDist?: boolean;
  distDir?: string;
  json?: boolean;
  manifestPath?: string;
  rootDir?: string;
};

type JsonRecord = Record<string, unknown>;

export function runAdminFallbackClosureGuard(
  options: AdminFallbackClosureGuardOptions = {},
) {
  const rootDir = resolve(options.rootDir ?? defaultRootDir());
  const manifestPath = resolveManifestPath(rootDir, options.manifestPath);
  const manifest = readGuardManifest(manifestPath);
  const distDir = options.distDir ? resolve(options.distDir) : undefined;
  const checkDist = Boolean(options.checkDist);
  const distText = checkDist ? readDistText(distDir) : '';
  const failures: string[] = [];

  for (const page of manifest.pages) {
    const sourceFile = resolve(rootDir, page.sourcePath);
    if (!existsSync(sourceFile)) {
      failures.push(`${page.name}: missing source file ${page.sourcePath}`);
      continue;
    }

    const sourceText = readFileSync(sourceFile, 'utf8');
    for (const marker of page.forbiddenSource) {
      if (sourceText.includes(marker)) {
        failures.push(`${page.name}: forbidden source marker "${marker}"`);
      }
    }
    for (const marker of page.requiredSource) {
      if (!sourceText.includes(marker)) {
        failures.push(`${page.name}: missing source marker "${marker}"`);
      }
    }

    if (checkDist) {
      for (const marker of page.forbiddenDist) {
        if (distText.includes(marker)) {
          failures.push(`${page.name}: forbidden dist marker "${marker}"`);
        }
      }
      for (const marker of page.requiredDist) {
        if (!distText.includes(marker)) {
          failures.push(`${page.name}: missing dist marker "${marker}"`);
        }
      }
    }
  }

  if (
    manifest.expectedPageCount !== undefined &&
    manifest.pages.length !== manifest.expectedPageCount
  ) {
    failures.push(
      `${manifest.name}: expected ${manifest.expectedPageCount} pages, received ${manifest.pages.length}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(
      [
        `${manifest.name} guard failed.`,
        ...failures.map((failure) => `- ${failure}`),
      ].join('\n'),
    );
  }

  return {
    status: 'pass',
    checkDist,
    guard: manifest.name,
    manifestPath: relative(rootDir, manifestPath),
    pages: manifest.pages.map((page) => page.name),
  };
}

function readGuardManifest(manifestPath: string): AdminLiveOnlyGuardManifest {
  if (!existsSync(manifestPath)) {
    throw new Error(`Guard manifest not found: ${manifestPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to parse guard manifest ${manifestPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const issues: string[] = [];
  if (!isRecord(parsed)) {
    throw new Error(`Guard manifest must be a JSON object: ${manifestPath}`);
  }

  const name = readRequiredString(parsed, 'name', 'manifest', issues);
  const expectedPageCount = readOptionalPositiveInteger(
    parsed,
    'expectedPageCount',
    'manifest',
    issues,
  );
  const pages = readPages(parsed, issues);

  if (issues.length > 0) {
    throw new Error(
      [
        `Guard manifest is invalid: ${manifestPath}`,
        ...issues.map((issue) => `- ${issue}`),
      ].join('\n'),
    );
  }

  return {
    expectedPageCount,
    name,
    pages,
  };
}

function readPages(
  manifest: JsonRecord,
  issues: string[],
): AdminLiveOnlyGuardPage[] {
  const pagesValue = manifest.pages;
  if (!Array.isArray(pagesValue)) {
    issues.push('manifest.pages must be an array.');
    return [];
  }

  const pages = pagesValue.map((pageValue, index) =>
    readPage(pageValue, index, issues),
  );
  const names = new Set<string>();
  const sourcePaths = new Set<string>();

  for (const page of pages) {
    if (page.name && names.has(page.name)) {
      issues.push(`duplicate page name "${page.name}".`);
    }
    if (page.sourcePath && sourcePaths.has(page.sourcePath)) {
      issues.push(`duplicate sourcePath "${page.sourcePath}".`);
    }
    names.add(page.name);
    sourcePaths.add(page.sourcePath);
  }

  return pages;
}

function readPage(
  pageValue: unknown,
  index: number,
  issues: string[],
): AdminLiveOnlyGuardPage {
  const label = `pages[${index}]`;
  if (!isRecord(pageValue)) {
    issues.push(`${label} must be an object.`);
    return emptyPage(label);
  }

  return {
    forbiddenDist: readOptionalStringArray(
      pageValue,
      'forbiddenDist',
      label,
      issues,
    ),
    forbiddenSource: readOptionalStringArray(
      pageValue,
      'forbiddenSource',
      label,
      issues,
    ),
    name: readRequiredString(pageValue, 'name', label, issues),
    requiredDist: readOptionalStringArray(
      pageValue,
      'requiredDist',
      label,
      issues,
    ),
    requiredSource: readOptionalStringArray(
      pageValue,
      'requiredSource',
      label,
      issues,
    ),
    sourcePath: readRequiredString(pageValue, 'sourcePath', label, issues),
  };
}

function emptyPage(label: string): AdminLiveOnlyGuardPage {
  return {
    forbiddenDist: [],
    forbiddenSource: [],
    name: label,
    requiredDist: [],
    requiredSource: [],
    sourcePath: '',
  };
}

function readRequiredString(
  record: JsonRecord,
  field: string,
  label: string,
  issues: string[],
): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${label}.${field} must be a non-empty string.`);
    return '';
  }
  return value;
}

function readOptionalStringArray(
  record: JsonRecord,
  field: string,
  label: string,
  issues: string[],
): string[] {
  const value = record[field];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(`${label}.${field} must be an array of strings.`);
    return [];
  }

  const strings: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      issues.push(`${label}.${field}[${index}] must be a non-empty string.`);
      return;
    }
    strings.push(item);
  });
  return strings;
}

function readOptionalPositiveInteger(
  record: JsonRecord,
  field: string,
  label: string,
  issues: string[],
): number | undefined {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    issues.push(`${label}.${field} must be a positive integer.`);
    return undefined;
  }
  return value;
}

function readDistText(distDir: string | undefined): string {
  if (!distDir) {
    throw new Error('Dist guard requires --dist <path>.');
  }
  if (!existsSync(distDir)) {
    throw new Error(`Dist guard path does not exist: ${distDir}`);
  }

  return collectFiles(distDir)
    .filter((file: string) => file.endsWith('.js'))
    .map((file: string) => readFileSync(file, 'utf8'))
    .join('\n');
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = resolve(directory, entry);
    const stat = statSync(entryPath);
    return stat.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

function defaultRootDir() {
  return resolve(__dirname, '../..');
}

function resolveManifestPath(rootDir: string, manifestPath?: string): string {
  const path = manifestPath ?? DEFAULT_MANIFEST_PATH;
  return isAbsolute(path) ? path : resolve(rootDir, path);
}

function parseCliArgs(argv: string[]): AdminFallbackClosureGuardOptions {
  const options: AdminFallbackClosureGuardOptions = { json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      options.rootDir = requireValue(argv, (index += 1), arg);
    } else if (arg === '--manifest') {
      options.manifestPath = requireValue(argv, (index += 1), arg);
    } else if (arg === '--dist') {
      options.distDir = requireValue(argv, (index += 1), arg);
      options.checkDist = true;
    } else if (arg === '--json') {
      options.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(argv: string[], index: number, flag: string) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

if (require.main === module) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const result = runAdminFallbackClosureGuard(options);
    if (options.json) {
      console.log(JSON.stringify(result));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
