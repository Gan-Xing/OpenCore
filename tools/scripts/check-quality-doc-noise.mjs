#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const docsRoot = join(root, 'docs', 'quality-cycle');

const commandLinePattern =
  /(?:^|\s|`)(?:NX_DAEMON=|pnpm\s+(?:build|test|typecheck|lint|format|format:check|openapi|deploy|smoke|nx)|node\s+(?:--check|tools\/quality-cycle)|bash\s+tools\/scripts|curl\s+|git\s+(?:status|commit|push|show|log)|docker\s+|psql\s+)/;

const allowedPolicyFiles = new Set([
  'docs/quality-cycle/cycle-021/handoff.md',
  'docs/quality-cycle/cycle-021/implementation-notes.md',
  'docs/quality-cycle/opencore-quality-recursion-goal-prompt.txt',
]);

const maxCommandLines = 6;
const failures = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(?:md|txt)$/.test(path)) {
      continue;
    }
    checkFile(path);
  }
}

function checkFile(path) {
  const rel = relative(root, path);
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const commandLines = [];

  lines.forEach((line, index) => {
    if (commandLinePattern.test(line)) {
      commandLines.push({ line: index + 1, text: line.trim() });
    }
  });

  const limit = allowedPolicyFiles.has(rel)
    ? maxCommandLines + 4
    : maxCommandLines;
  if (commandLines.length <= limit) {
    return;
  }

  failures.push({ rel, commandLines, limit });
}

walk(docsRoot);

if (failures.length > 0) {
  console.error('Quality-cycle docs contain command-log noise.');
  console.error(
    'Keep durable decisions, scope and guard facts in docs; keep repeated command transcripts in terminal/final responses.',
  );
  for (const failure of failures) {
    console.error(
      `\n${failure.rel}: ${failure.commandLines.length} command-like lines (limit ${failure.limit})`,
    );
    for (const item of failure.commandLines.slice(0, 12)) {
      console.error(`  ${item.line}: ${item.text}`);
    }
    if (failure.commandLines.length > 12) {
      console.error(`  ... ${failure.commandLines.length - 12} more`);
    }
  }
  process.exit(1);
}

console.log('Quality-cycle docs noise check passed.');
