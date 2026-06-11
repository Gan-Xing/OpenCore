#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, '.opencore/quality-cycle/state.json');
const LEDGER_PATH = path.join(ROOT, 'docs/quality-cycle/ledger.md');
const DEFAULT_MAX = 20;
const DEADLINE_LONDON = {
  year: 2026,
  month: 6,
  day: 11,
  hour: 5,
  minute: 30,
  second: 0,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function londonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const result = {};
  for (const part of parts) {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
  }
  return result;
}

function compareDateParts(a, b) {
  for (const key of ['year', 'month', 'day', 'hour', 'minute', 'second']) {
    if ((a[key] ?? 0) > (b[key] ?? 0)) return 1;
    if ((a[key] ?? 0) < (b[key] ?? 0)) return -1;
  }
  return 0;
}

function londonTimestamp() {
  const p = londonParts();
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')} Europe/London`;
}

function isDeadlineReached() {
  return compareDateParts(londonParts(), DEADLINE_LONDON) >= 0;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[item.slice(2)] = true;
      } else {
        args[item.slice(2)] = next;
        i += 1;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function loadState(maxCycles) {
  if (!fs.existsSync(STATE_PATH)) {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      maxCycles,
      completedCycles: 0,
      activeCycle: 1,
      lastCompletedAt: null,
      deadlineLondon: '2026-06-11 05:30:00 Europe/London',
    };
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  state.maxCycles = maxCycles;
  if (!state.activeCycle) state.activeCycle = state.completedCycles + 1;
  return state;
}

function saveState(state) {
  ensureDir(path.dirname(STATE_PATH));
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function cycleName(n) {
  return `cycle-${String(n).padStart(3, '0')}`;
}

function cycleDir(n) {
  return path.join(ROOT, 'docs/quality-cycle', cycleName(n));
}

function backlogPath(n) {
  return path.join(cycleDir(n), 'backlog.md');
}

function reportPath(n) {
  return path.join(cycleDir(n), 'completion-report.md');
}

function auditPath(n) {
  return path.join(cycleDir(n), 'audit.md');
}

function referencePath(n) {
  return path.join(cycleDir(n), 'reference-comparison.md');
}

function notesPath(n) {
  return path.join(cycleDir(n), 'implementation-notes.md');
}

function appendLedger(message) {
  ensureDir(path.dirname(LEDGER_PATH));
  if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, '# OpenCore Quality Cycle Ledger\n\n');
  }
  fs.appendFileSync(LEDGER_PATH, `${message}\n`);
}

function createCycleScaffold(n) {
  ensureDir(cycleDir(n));
  const files = [
    [
      auditPath(n),
      `# ${cycleName(n)} Audit\n\nLondon time: ${londonTimestamp()}\n\n## Findings\n\n`,
    ],
    [
      referencePath(n),
      `# ${cycleName(n)} Reference Comparison\n\n## NestWeb\n\n## Antdpro6\n\n## RuoYi / ruoyi-vue-pro\n\n## Yudao / yudao-ui-admin-vue3\n\n`,
    ],
    [notesPath(n), `# ${cycleName(n)} Implementation Notes\n\n`],
  ];

  for (const [file, content] of files) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, content);
  }

  if (!fs.existsSync(backlogPath(n))) {
    fs.writeFileSync(
      backlogPath(n),
      `# ${cycleName(n)} Backlog\n\n` +
        `AI must replace this scaffold after auditing OpenCore, NestWeb, Antdpro6, RuoYi, and Yudao.\n\n` +
        `- [ ] Replace this placeholder with a complete stage 1-6 backlog.\n`,
    );
  }
}

function readBacklogStatus(n) {
  const file = backlogPath(n);
  if (!fs.existsSync(file)) {
    return { exists: false, checked: 0, unchecked: 0, placeholder: true };
  }
  const content = fs.readFileSync(file, 'utf8');
  const checked = (content.match(/- \[[xX]\]/g) || []).length;
  const unchecked = (content.match(/- \[ \]/g) || []).length;
  const placeholder = content.includes('Replace this placeholder');
  return { exists: true, checked, unchecked, placeholder };
}

function readPackageJson() {
  const file = path.join(ROOT, 'package.json');
  if (!fs.existsSync(file)) return { scripts: {} };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasScript(name) {
  return Boolean(readPackageJson().scripts?.[name]);
}

function run(command) {
  console.log(`\n$ ${command}`);
  const result = spawnSync(command, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NX_DAEMON: 'false' },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

function gateCommands() {
  const commands = [
    'pnpm format:check',
    'pnpm lint',
    'pnpm typecheck',
    'pnpm test',
    'pnpm build',
    'pnpm prisma:validate',
    'pnpm openapi:export',
    'pnpm openapi:registry-tags:check',
    'pnpm openapi:check',
    'pnpm registry:admin-routes:check',
    'pnpm test:api',
    'pnpm test:admin',
    'NX_DAEMON=false pnpm nx test contracts',
    'NX_DAEMON=false pnpm nx test module-registry',
    'NX_DAEMON=false pnpm nx test sdk',
  ];

  if (hasScript('openforge:check')) commands.push('pnpm openforge:check');
  if (hasScript('openforge:doctor')) commands.push('pnpm openforge:doctor');
  if (hasScript('openforge:gate')) commands.push('pnpm openforge:gate');
  if (fs.existsSync(path.join(ROOT, 'tools/generator/project.json'))) {
    commands.push('NX_DAEMON=false pnpm nx test openforge');
    commands.push('NX_DAEMON=false pnpm nx build openforge');
  }

  return commands;
}

function printStatus(state) {
  const backlog = readBacklogStatus(state.activeCycle);
  const status = {
    londonTime: londonTimestamp(),
    deadlineReached: isDeadlineReached(),
    maxCycles: state.maxCycles,
    completedCycles: state.completedCycles,
    activeCycle: state.activeCycle,
    activeCycleName: cycleName(state.activeCycle),
    backlog,
    statePath: path.relative(ROOT, STATE_PATH),
    ledgerPath: path.relative(ROOT, LEDGER_PATH),
  };
  console.log(JSON.stringify(status, null, 2));
}

function assertCanContinue(state, options = {}) {
  if (!options.allowAfterDeadline && isDeadlineReached()) {
    throw new Error('Stop: London deadline reached: 2026-06-11 05:30.');
  }
  if (state.completedCycles >= state.maxCycles) {
    throw new Error(
      `Stop: completedCycles ${state.completedCycles} >= maxCycles ${state.maxCycles}.`,
    );
  }
}

function completeCycle(state, runGate, options = {}) {
  assertCanContinue(state, options);

  const n = state.activeCycle;
  const backlog = readBacklogStatus(n);

  if (!backlog.exists) {
    throw new Error(
      `Cannot complete ${cycleName(n)}: backlog.md does not exist.`,
    );
  }
  if (backlog.placeholder) {
    throw new Error(
      `Cannot complete ${cycleName(n)}: backlog.md still contains placeholder.`,
    );
  }
  if (backlog.unchecked > 0) {
    throw new Error(
      `Cannot complete ${cycleName(n)}: ${backlog.unchecked} unchecked backlog items remain.`,
    );
  }
  if (backlog.checked === 0) {
    throw new Error(
      `Cannot complete ${cycleName(n)}: no checked backlog items found.`,
    );
  }
  if (!fs.existsSync(reportPath(n))) {
    throw new Error(
      `Cannot complete ${cycleName(n)}: completion-report.md is missing.`,
    );
  }

  if (runGate) {
    for (const command of gateCommands()) run(command);
  }

  state.completedCycles += 1;
  state.lastCompletedAt = new Date().toISOString();
  state.activeCycle = state.completedCycles + 1;
  saveState(state);

  appendLedger(
    `- ${londonTimestamp()} completed ${cycleName(n)}; checked=${backlog.checked}; completedCycles=${state.completedCycles}`,
  );

  if (state.completedCycles < state.maxCycles && !isDeadlineReached()) {
    createCycleScaffold(state.activeCycle);
  }

  console.log(
    `\nCompleted ${cycleName(n)}. completedCycles=${state.completedCycles}`,
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'status';
  const maxCycles = Number(args.max || DEFAULT_MAX);
  const state = loadState(maxCycles);

  if (command === 'status') {
    saveState(state);
    printStatus(state);
    return;
  }

  if (command === 'start-cycle') {
    assertCanContinue(state);
    createCycleScaffold(state.activeCycle);
    saveState(state);
    appendLedger(
      `- ${londonTimestamp()} started ${cycleName(state.activeCycle)}`,
    );
    printStatus(state);
    return;
  }

  if (command === 'complete-cycle') {
    completeCycle(state, Boolean(args['run-gate']), {
      allowAfterDeadline: Boolean(args['allow-after-deadline']),
    });
    return;
  }

  if (command === 'gate') {
    for (const c of gateCommands()) run(c);
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`Usage:
  node tools/quality-cycle/opencore-quality-cycle.mjs status --max 20
  node tools/quality-cycle/opencore-quality-cycle.mjs start-cycle --max 20
  node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate
  node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate --allow-after-deadline
  node tools/quality-cycle/opencore-quality-cycle.mjs gate
`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
