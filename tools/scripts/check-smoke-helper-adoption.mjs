#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const scriptsDir = join(root, 'tools', 'scripts');
const typedSmokeDir = join(root, 'tools', 'smoke');
const legacySmokeFiles = readdirSync(scriptsDir)
  .filter((name) => name.startsWith('smoke-') && name.endsWith('.mjs'))
  .sort()
  .map((name) => join(scriptsDir, name));
const typedSmokeFiles = existsSync(typedSmokeDir)
  ? readdirSync(typedSmokeDir)
      .filter((name) => name.startsWith('smoke-') && name.endsWith('.ts'))
      .sort()
      .map((name) => join(typedSmokeDir, name))
  : [];

const forbiddenPatterns = [
  {
    label: 'local HttpStatusError class',
    pattern: /\bclass\s+HttpStatusError\b/,
  },
  {
    label: 'local request function',
    pattern: /\basync\s+function\s+request\s*\(/,
  },
  {
    label: 'local login function',
    pattern: /\basync\s+function\s+login\s*\(/,
  },
  {
    label: 'local apiRequest function',
    pattern: /\basync\s+function\s+apiRequest\s*\(/,
  },
  {
    label: 'local smoke base URL parsing',
    pattern: /\bOPENCORE_SMOKE_BASE_URL\b/,
  },
  {
    label: 'local smoke port parsing',
    pattern: /\bOPENCORE_SMOKE_PORT\b/,
  },
  {
    label: 'local API prefix normalization',
    pattern: /\bfunction\s+normalizeApiPrefix\s*\(/,
  },
  {
    label: 'local boolean env parsing',
    pattern: /\bfunction\s+parseBoolean\s*\(/,
  },
  {
    label: 'local trailing slash trim helper',
    pattern: /\bfunction\s+trimTrailingSlash\s*\(/,
  },
];

const issues = [];

for (const file of legacySmokeFiles) {
  const rel = relative(root, file);
  const source = readFileSync(file, 'utf8');
  issues.push(`${rel}: legacy .mjs smoke scripts are not allowed.`);

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(source)) {
      issues.push(`${rel}: ${label} must live in tools/smoke/runtime.ts.`);
    }
  }
}

for (const file of typedSmokeFiles) {
  const rel = relative(root, file);
  const source = readFileSync(file, 'utf8');

  if (!source.includes("from './runtime'")) {
    issues.push(`${rel}: must import typed smoke runtime.`);
  }
}

if (issues.length > 0) {
  console.error('Smoke helper adoption check failed.');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Smoke helper adoption check passed (${legacySmokeFiles.length} legacy mjs scripts, ${typedSmokeFiles.length} typed scripts).`,
);
