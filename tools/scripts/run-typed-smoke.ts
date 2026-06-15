#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const entry = process.argv[2];
const root = resolve(__dirname, '..', '..');

if (!entry) {
  console.error(
    'Usage: pnpm scripts:ts tools/scripts/run-typed-smoke.ts <entry.ts>',
  );
  process.exit(1);
}

const compilerOptions = {
  customConditions: null,
  module: 'commonjs',
  moduleResolution: 'node10',
};

const result = spawnSync(
  process.execPath,
  ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', entry],
  {
    cwd: root,
    env: {
      ...process.env,
      TS_NODE_COMPILER_OPTIONS: JSON.stringify(compilerOptions),
      TS_NODE_PROJECT: resolve(root, 'tools/smoke/tsconfig.json'),
    },
    stdio: 'inherit',
  },
);

if (result.signal) {
  console.error(`Typed smoke interrupted by ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
