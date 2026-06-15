#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import ts from 'typescript';

type NakedException = {
  argument: string;
  count: number;
  exception: string;
  file: string;
};

type Baseline = {
  description: string;
  violations: NakedException[];
};

const exceptionClasses = new Set([
  'BadRequestException',
  'ConflictException',
  'ForbiddenException',
  'GoneException',
  'HttpException',
  'InternalServerErrorException',
  'NotFoundException',
  'PayloadTooLargeException',
  'ServiceUnavailableException',
  'TooManyRequestsException',
  'UnauthorizedException',
  'UnprocessableEntityException',
]);

const root = readRootArg();
const shouldUpdate = process.argv.includes('--update');
const baselinePath = join(
  root,
  'tools',
  'guards',
  'api-error-code.baseline.json',
);
const sourceRoots = [join(root, 'apps', 'api', 'src'), join(root, 'packages')];

const currentViolations = collectViolations();

if (shouldUpdate) {
  writeBaseline(currentViolations);
  console.log(
    `API error-code baseline updated with ${sumCounts(currentViolations)} existing naked exception(s).`,
  );
  process.exit(0);
}

const baseline = readBaseline();
const newViolations = diffAgainstBaseline(currentViolations, baseline);

if (newViolations.length > 0) {
  console.error('API error-code guard failed.');
  console.error(
    'New business exceptions must use createApiErrorBody({ code, message, ... }).',
  );

  for (const violation of newViolations) {
    console.error(
      `- ${violation.file}: ${violation.exception}(${violation.argument}) x${violation.count}`,
    );
  }

  process.exit(1);
}

console.log(
  `API error-code guard passed. Existing baseline debt: ${sumCounts(
    currentViolations,
  )} naked exception(s).`,
);

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

function readBaseline(): Baseline {
  if (!existsSync(baselinePath)) {
    throw new Error(
      `Missing API error-code baseline: ${relative(root, baselinePath)}. Run with --update after reviewing current debt.`,
    );
  }

  return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
}

function writeBaseline(violations: NakedException[]): void {
  mkdirSync(dirname(baselinePath), { recursive: true });
  const baseline: Baseline = {
    description:
      'Existing naked NestJS exception debt. New business exceptions must use createApiErrorBody with a stable code.',
    violations,
  };

  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
}

function collectViolations(): NakedException[] {
  const counts = new Map<string, NakedException>();

  for (const filePath of collectSourceFiles()) {
    const sourceText = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    visitSource(sourceFile, sourceFile, counts);
  }

  return [...counts.values()].sort((left, right) =>
    keyOf(left).localeCompare(keyOf(right)),
  );
}

function collectSourceFiles(): string[] {
  const files: string[] = [];

  for (const sourceRoot of sourceRoots) {
    if (!existsSync(sourceRoot)) continue;
    collectSourceFilesFrom(sourceRoot, files);
  }

  return files.sort();
}

function collectSourceFilesFrom(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        entry === 'node_modules' ||
        entry === 'dist' ||
        entry === 'coverage' ||
        entry === '__fixtures__'
      ) {
        continue;
      }

      collectSourceFilesFrom(fullPath, files);
      continue;
    }

    if (
      fullPath.endsWith('.ts') &&
      !fullPath.endsWith('.d.ts') &&
      !fullPath.endsWith('.spec.ts') &&
      !fullPath.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }
}

function visitSource(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  counts: Map<string, NakedException>,
): void {
  if (ts.isNewExpression(node)) {
    const exceptionName = getExceptionName(node.expression);

    if (
      exceptionName &&
      exceptionClasses.has(exceptionName) &&
      isNakedException(node)
    ) {
      const violation = toViolation(sourceFile, node, exceptionName);
      const key = keyOf(violation);
      const existing = counts.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, violation);
      }
    }
  }

  ts.forEachChild(node, (child) => visitSource(child, sourceFile, counts));
}

function getExceptionName(
  expression: ts.LeftHandSideExpression,
): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function isNakedException(node: ts.NewExpression): boolean {
  const [firstArg] = node.arguments ?? [];

  if (!firstArg) {
    return true;
  }

  if (isCreateApiErrorBodyCall(firstArg)) {
    return false;
  }

  if (ts.isObjectLiteralExpression(firstArg)) {
    return !firstArg.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        getPropertyName(property.name) === 'code',
    );
  }

  return true;
}

function isCreateApiErrorBodyCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'createApiErrorBody'
  );
}

function getPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }

  return null;
}

function toViolation(
  sourceFile: ts.SourceFile,
  node: ts.NewExpression,
  exceptionName: string,
): NakedException {
  const [firstArg] = node.arguments ?? [];
  const argument = firstArg
    ? firstArg.getText(sourceFile).replace(/\s+/g, ' ').trim()
    : '<missing>';

  return {
    argument,
    count: 1,
    exception: exceptionName,
    file: relative(root, sourceFile.fileName),
  };
}

function diffAgainstBaseline(
  current: NakedException[],
  baseline: Baseline,
): NakedException[] {
  const baselineCounts = new Map(
    baseline.violations.map((violation) => [keyOf(violation), violation.count]),
  );

  return current
    .map((violation) => {
      const baselineCount = baselineCounts.get(keyOf(violation)) ?? 0;
      return {
        ...violation,
        count: violation.count - baselineCount,
      };
    })
    .filter((violation) => violation.count > 0);
}

function keyOf(violation: Omit<NakedException, 'count'>): string {
  return `${violation.file}\u0000${violation.exception}\u0000${violation.argument}`;
}

function sumCounts(violations: NakedException[]): number {
  return violations.reduce((sum, violation) => sum + violation.count, 0);
}
