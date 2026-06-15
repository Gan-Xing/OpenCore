#!/usr/bin/env node

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

process.env.TS_NODE_PROJECT ??= resolve(root, 'tools/smoke/tsconfig.json');
process.env.TS_NODE_COMPILER_OPTIONS ??= JSON.stringify({
  customConditions: null,
  module: 'commonjs',
  moduleResolution: 'node10',
});

require('ts-node/register');
require('tsconfig-paths/register');

const runtime = require('../smoke/runtime.ts');

export const HttpStatusError = runtime.HttpStatusError;
export const assertArray = runtime.assertArray;
export const assertAtLeast = runtime.assertAtLeast;
export const assertDefined = runtime.assertDefined;
export const assertEqual = runtime.assertEqual;
export const assertIncludes = runtime.assertIncludes;
export const assertNotIncludes = runtime.assertNotIncludes;
export const assertNumber = runtime.assertNumber;
export const assertNumberAtLeast = runtime.assertNumberAtLeast;
export const assertOpenApiPath = runtime.assertOpenApiPath;
export const assertOpenApiSchema = runtime.assertOpenApiSchema;
export const assertString = runtime.assertString;
export const createSmokeRuntime = runtime.createSmokeRuntime;
export const createTypedSmokeRuntime = runtime.createTypedSmokeRuntime;
export const delay = runtime.delay;
export const formatBody = runtime.formatBody;
export const normalizeApiPrefix = runtime.normalizeApiPrefix;
export const parseBoolean = runtime.parseBoolean;
export const trimTrailingSlash = runtime.trimTrailingSlash;
