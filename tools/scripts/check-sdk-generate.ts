import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
);
const contractSource = readFileSync(
  resolve(root, 'packages/contracts/src/openapi-contract.ts'),
  'utf8',
);
const sdkIndex = readFileSync(
  resolve(root, 'packages/sdk/src/index.ts'),
  'utf8',
);

const issues = [];

if (
  packageJson.scripts?.['sdk:generate'] !==
  'pnpm scripts:ts tools/scripts/check-sdk-generate.ts'
) {
  issues.push('root package.json must expose sdk:generate.');
}

if (
  packageJson.scripts?.['sdk:check'] !==
  'pnpm scripts:ts tools/scripts/check-sdk-generate.ts'
) {
  issues.push('root package.json must expose sdk:check.');
}

if (!contractSource.includes("sdkGenerateCommand: 'pnpm sdk:generate'")) {
  issues.push('OPENAPI_CONTRACT_PROTOCOL.sdkGenerateCommand drifted.');
}

for (const expectedExport of [
  './monitoring-client',
  './monitoring-types',
  './rbac-client',
  './rbac-types',
  './system-management-client',
  './system-management-types',
  './tooling-client',
  './tooling-types',
]) {
  if (!sdkIndex.includes(expectedExport)) {
    issues.push(`SDK public index is missing ${expectedExport}.`);
  }
}

if (issues.length > 0) {
  throw new Error(
    `SDK generation contract drift detected:\n${issues.join('\n')}`,
  );
}

console.log('SDK generation contract is clean.');
