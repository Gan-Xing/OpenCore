import type { OpenForgePlanFormat } from '@opencore/contracts';
import { buildDiffPlan } from './diff/diff-plan';
import { getOpenForgeWorkspaceStatus } from './index';
import {
  formatDiffPlanAsJson,
  formatPreflightReportAsJson,
} from './output/diff-output';
import { formatPlanAsJson, formatPlanAsMarkdown } from './output/plan-output';
import { buildGeneratePlan } from './planner/generate-plan';
import { buildPreflightReport } from './preflight/preflight-report';

type WritableStream = {
  write(message: string): void;
};

export type OpenForgeCliResult = {
  exitCode: number;
};

function printJson(stdout: WritableStream, value: unknown): void {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp(stdout: WritableStream): void {
  stdout.write(
    [
      'OpenForge S9 read-only planning tool',
      '',
      'Commands:',
      '  plan   Output a read-only generate plan',
      '  diff   Output a read-only diff plan',
      '  check  Run read-only preflight checks',
      '',
      'S9 does not write generated target files.',
      '',
    ].join('\n'),
  );
}

function readOption(
  argv: readonly string[],
  name: string,
  fallback: string,
): string {
  const index = argv.indexOf(name);

  if (index === -1) {
    return fallback;
  }

  return argv[index + 1] ?? fallback;
}

function readFormat(argv: readonly string[]): OpenForgePlanFormat {
  const format = readOption(argv, '--format', 'json');

  if (format === 'markdown') {
    return 'markdown';
  }

  return 'json';
}

export function runCli(
  argv = process.argv.slice(2),
  stdout: WritableStream = process.stdout,
  stderr: WritableStream = process.stderr,
): OpenForgeCliResult {
  const [command] = argv;

  if (!command || command === '--help' || command === '-h') {
    printHelp(stdout);
    return { exitCode: 0 };
  }

  if (command === 'plan') {
    const schemaPath = readOption(
      argv,
      '--schema',
      'tools/generator/examples/core.dict.schema.json',
    );
    const format = readFormat(argv);
    const plan = buildGeneratePlan({ schemaPath });

    stdout.write(
      format === 'markdown'
        ? formatPlanAsMarkdown(plan)
        : formatPlanAsJson(plan),
    );

    return { exitCode: plan.errors.length > 0 ? 1 : 0 };
  }

  if (command === 'diff') {
    const schemaPath = readOption(
      argv,
      '--schema',
      'tools/generator/examples/core.dict.schema.json',
    );
    const diffPlan = buildDiffPlan({ schemaPath });

    stdout.write(formatDiffPlanAsJson(diffPlan));

    return { exitCode: diffPlan.errors.length > 0 ? 1 : 0 };
  }

  if (command === 'check') {
    const schemaPath = readOption(
      argv,
      '--schema',
      'tools/generator/examples/core.dict.schema.json',
    );
    const report = buildPreflightReport({ schemaPath });

    stdout.write(formatPreflightReportAsJson(report));

    return { exitCode: report.valid ? 0 : 1 };
  }

  if (command === 'status') {
    printJson(stdout, {
      command,
      status: 'workspace-ready',
      workspace: getOpenForgeWorkspaceStatus(),
      message: 'OpenForge is registered as a read-only S9 planning workspace.',
    });
    return { exitCode: 0 };
  }

  stderr.write(`Unknown OpenForge command: ${command}\n`);
  return { exitCode: 1 };
}

if (require.main === module) {
  process.exitCode = runCli().exitCode;
}
