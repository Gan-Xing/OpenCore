#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const workspaceRoot = resolve(__dirname, '..', '..');
const pnpmStoreDir = join(workspaceRoot, 'node_modules', '.pnpm');
const workspaceSchemaPath = join(workspaceRoot, 'prisma', 'schema.prisma');

if (!existsSync(pnpmStoreDir)) {
  console.log('Prisma client sync skipped: node_modules/.pnpm not found.');
  process.exit(0);
}

const workspaceSchema = readFileSync(workspaceSchemaPath, 'utf8').trim();
const clientPackageDirs = readdirSync(pnpmStoreDir)
  .filter((entry) => entry.startsWith('@prisma+client@'))
  .map((entry) =>
    join(pnpmStoreDir, entry, 'node_modules', '@prisma', 'client'),
  )
  .filter((clientPackageDir) => existsSync(clientPackageDir));

if (clientPackageDirs.length === 0) {
  console.log('Prisma client sync skipped: @prisma/client is not installed.');
  process.exit(0);
}

const sourceClientDir = findGeneratedClientDir(
  clientPackageDirs,
  workspaceSchema,
);

for (const clientPackageDir of clientPackageDirs) {
  const clientNodeModulesDir = resolve(clientPackageDir, '..', '..');
  const targetPrismaDir = join(clientNodeModulesDir, '.prisma');
  const targetClientDir = join(targetPrismaDir, 'client');

  if (resolve(targetClientDir) === resolve(sourceClientDir)) {
    continue;
  }

  mkdirSync(targetPrismaDir, { recursive: true });
  rmSync(targetClientDir, { force: true, recursive: true });
  cpSync(sourceClientDir, targetClientDir, { recursive: true });
}

console.log(
  `Prisma client sync complete: ${clientPackageDirs.length} instance(s).`,
);

function findGeneratedClientDir(clientPackageDirs, workspaceSchema) {
  const workspaceModelNames = getModelNames(workspaceSchema);

  for (const clientPackageDir of clientPackageDirs) {
    const clientNodeModulesDir = resolve(clientPackageDir, '..', '..');
    const generatedClientDir = join(clientNodeModulesDir, '.prisma', 'client');
    const generatedSchemaPath = join(generatedClientDir, 'schema.prisma');
    const generatedIndexPath = join(generatedClientDir, 'index.d.ts');

    if (
      existsSync(generatedSchemaPath) &&
      existsSync(generatedIndexPath) &&
      readFileSync(generatedSchemaPath, 'utf8').trim() === workspaceSchema
    ) {
      return generatedClientDir;
    }
  }

  for (const clientPackageDir of clientPackageDirs) {
    const clientNodeModulesDir = resolve(clientPackageDir, '..', '..');
    const generatedClientDir = join(clientNodeModulesDir, '.prisma', 'client');
    const generatedSchemaPath = join(generatedClientDir, 'schema.prisma');
    const generatedIndexPath = join(generatedClientDir, 'index.d.ts');

    if (!existsSync(generatedSchemaPath) || !existsSync(generatedIndexPath)) {
      continue;
    }

    const generatedSchema = readFileSync(generatedSchemaPath, 'utf8');
    const generatedIndex = readFileSync(generatedIndexPath, 'utf8');
    const generatedModelNames = new Set(getModelNames(generatedSchema));

    if (
      workspaceModelNames.every((modelName) =>
        generatedModelNames.has(modelName),
      ) &&
      workspaceModelNames.every((modelName) =>
        generatedIndex.includes(`Model ${modelName}`),
      )
    ) {
      return generatedClientDir;
    }
  }

  throw new Error(
    'Unable to find a generated Prisma client matching prisma/schema.prisma. Run `prisma generate --schema prisma/schema.prisma` first.',
  );
}

function getModelNames(schema) {
  return [...schema.matchAll(/^model\s+([A-Za-z][A-Za-z0-9_]*)\s+\{/gm)].map(
    (match) => match[1],
  );
}
