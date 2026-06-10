import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
);
const deps = packageJson.dependencies ?? {};

const requiredVersions = {
  '@umijs/max': /^(\^)?4\./,
  '@ant-design/pro-components': /^3\./,
  antd: /^(\^)?6\./,
  react: /^(\^)?19\./,
  'react-dom': /^(\^)?19\./,
};

for (const [name, pattern] of Object.entries(requiredVersions)) {
  const version = deps[name];
  if (!version || !pattern.test(version)) {
    throw new Error(
      `Expected ${name} to match ${pattern}, received ${version ?? 'missing'}`,
    );
  }
}

const config = readFileSync(resolve(root, '.umirc.ts'), 'utf8');
if (
  config.includes("component: './Access'") ||
  config.includes("component: './Table'")
) {
  throw new Error(
    'Template Access/Table routes must not be mounted in S2 admin routes.',
  );
}

if (existsSync(resolve(root, 'examples'))) {
  throw new Error('Template example code must not be committed in S2.');
}

console.log('admin smoke test passed');
