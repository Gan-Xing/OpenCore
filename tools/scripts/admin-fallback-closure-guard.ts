#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const fixedPages = [
  {
    name: 'System Roles',
    sourcePath: 'apps/admin/src/pages/System/Roles.tsx',
    forbiddenSource: [
      'createPermissionSummariesFromRegistry',
      'createSystemDeptFixtures',
      'fallbackRows',
      'Using fallback role snapshot',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
    ],
    requiredSource: [
      'Unable to load live roles',
      'Unable to load live role detail.',
      'listOpenCoreRoles',
      'getOpenCoreRole',
      'getOpenCoreRoleMenuAssignment',
      'assignOpenCoreRoleMenus',
      'getOpenCoreRoleUserAssignment',
      'assignOpenCoreRoleUsers',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live roles',
      'Unable to load live role detail.',
      'Role menus updated.',
      'Role users updated.',
      'core-roles',
    ],
    forbiddenDist: ['Using fallback role snapshot'],
  },
  {
    name: 'System Users',
    sourcePath: 'apps/admin/src/pages/System/Users.tsx',
    forbiddenSource: [
      'createSystemDeptOptionFixtures',
      'createSystemDeptFixtures',
      'createSystemPostFixtures',
      'fallbackRows',
      'fallbackRoleRows',
      'Using fallback user snapshot',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
    ],
    requiredSource: [
      'Unable to load live users',
      'Unable to load live user detail.',
      'listOpenCoreUsers',
      'getOpenCoreUser',
      'createOpenCoreUser',
      'updateOpenCoreUser',
      'deleteOpenCoreUser',
      'assignOpenCoreUserRoles',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live users',
      'Unable to load live user detail.',
      'User Excel export downloaded',
      'Assign Roles',
      'core-users',
    ],
    forbiddenDist: ['Using fallback user snapshot'],
  },
  {
    name: 'System Config',
    sourcePath: 'apps/admin/src/pages/System/Config.tsx',
    forbiddenSource: [
      'createSystemConfigFixtures',
      'fallbackRows',
      'Using fallback config snapshot',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
    ],
    requiredSource: [
      'Unable to load live system config',
      'Unable to load live system config detail.',
      'listOpenCoreSystemConfig',
      'getOpenCoreSystemConfig',
      'createOpenCoreSystemConfig',
      'updateOpenCoreSystemConfig',
      'deleteOpenCoreSystemConfig',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live system config',
      'Unable to load live system config detail.',
      'Config Excel export downloaded',
      'Vault Key Rotation',
      'core-config',
    ],
    forbiddenDist: ['Using fallback config snapshot'],
  },
  {
    name: 'System Notices',
    sourcePath: 'apps/admin/src/pages/System/Notices.tsx',
    forbiddenSource: [
      'createSystemNoticeFixtures',
      'fallbackRows',
      'Using fallback system notice snapshot',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
      'setSelectedTemplateDetail(record)',
      'setSelectedInboxDetail(record)',
    ],
    requiredSource: [
      'Unable to load live system notices',
      'Unable to load live system notice detail.',
      'Unable to load live system notice template detail.',
      'Unable to load live system notice inbox detail.',
      'listOpenCoreSystemNotices',
      'getOpenCoreSystemNotice',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live system notices',
      'Unable to load live system notice detail.',
      'Unable to load live system notice templates',
      'Unable to load live system notice delivery records',
      'Run outbox schedule',
      'core-notices',
      'core-notice-templates',
    ],
    forbiddenDist: ['Using fallback system notice snapshot'],
  },
  {
    name: 'System Files',
    sourcePath: 'apps/admin/src/pages/System/Files.tsx',
    forbiddenSource: [
      'createFileAssetFixtures',
      'fallbackRows',
      'Using fallback file fixtures',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
    ],
    requiredSource: [
      'Unable to load live files',
      'Unable to load live file detail.',
      'listOpenCoreFiles',
      'getOpenCoreFile',
      'uploadOpenCoreFile',
      'downloadOpenCoreFile',
      'updateOpenCoreFile',
      'deleteOpenCoreFile',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live files',
      'Unable to load live file detail.',
      'Upload File',
      'Choose file',
      'core-files',
    ],
    forbiddenDist: ['Using fallback file fixtures'],
  },
  {
    name: 'System Permissions',
    sourcePath: 'apps/admin/src/pages/System/Permissions.tsx',
    forbiddenSource: [
      'createPermissionSummariesFromRegistry',
      'fallbackRows',
      'Using fallback permission snapshot',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
    ],
    requiredSource: [
      'Unable to load live permissions',
      'Unable to load live permission detail.',
      'listOpenCorePermissions',
      'getOpenCorePermission',
      'createOpenCorePermission',
      'updateOpenCorePermission',
      'deleteOpenCorePermission',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live permissions',
      'Permission created.',
      'System permissions cannot be edited',
      'core-permissions',
    ],
    forbiddenDist: ['Using fallback permission snapshot'],
  },
  {
    name: 'System Posts',
    sourcePath: 'apps/admin/src/pages/System/Posts.tsx',
    forbiddenSource: [
      'createSystemPostFixtures',
      'fallbackRows',
      'Using fallback post snapshot',
      'setRows(fallbackRows)',
      'setSelectedDetail(record)',
    ],
    requiredSource: [
      'Unable to load live posts',
      'Unable to load live post detail.',
      'listOpenCoreSystemPosts',
      'getOpenCoreSystemPost',
      'createOpenCoreSystemPost',
      'updateOpenCoreSystemPost',
      'updateOpenCoreSystemPostOrder',
      'deleteOpenCoreSystemPost',
      'deleteOpenCoreSystemPosts',
      'CurrentPageExportButton',
      'rows={filteredRows}',
    ],
    requiredDist: [
      'Unable to load live posts',
      'Post order saved.',
      'Delete selected',
      'core-posts',
    ],
    forbiddenDist: ['Using fallback post snapshot'],
  },
];

type AdminFallbackClosureGuardOptions = {
  checkDist?: boolean;
  distDir?: string;
  json?: boolean;
  rootDir?: string;
};

export function runAdminFallbackClosureGuard(
  options: AdminFallbackClosureGuardOptions = {},
) {
  const rootDir = resolve(options.rootDir ?? defaultRootDir());
  const distDir = options.distDir ? resolve(options.distDir) : undefined;
  const checkDist = Boolean(options.checkDist);
  const distText = checkDist ? readDistText(distDir) : '';
  const failures = [];

  for (const page of fixedPages) {
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

  if (fixedPages.length !== 7) {
    failures.push(
      `Unified guard must cover exactly 7 fixed System Admin pages, received ${fixedPages.length}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(
      [
        'Seven-page Admin fallback closure guard failed.',
        ...failures.map((failure) => `- ${failure}`),
      ].join('\n'),
    );
  }

  return {
    status: 'pass',
    checkDist,
    pages: fixedPages.map((page) => page.name),
  };
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

function parseCliArgs(argv: string[]): AdminFallbackClosureGuardOptions {
  const options: AdminFallbackClosureGuardOptions = { json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      options.rootDir = requireValue(argv, (index += 1), arg);
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
