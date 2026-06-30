import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

const forbiddenModulePrefixes = [
  'industry.erp',
  'industry.mes',
  'industry.wms',
  'industry.mall',
  'integration.pay',
  'ai.',
];

const registry = read('packages/module-registry/src/registry.ts');
const registrySpec = read('packages/module-registry/src/index.spec.ts');
const openforgeValidator = read(
  'packages/generator-core/src/validators/manual-schema-validator.ts',
);
const openforgeSpec = read(
  'packages/generator-core/src/validators/manual-schema-validator.spec.ts',
);
const schema = read('prisma/schema.prisma');
const backlog = read('docs/quality-cycle/cycle-022/backlog.md');
const acceptance = read('docs/quality-cycle/cycle-022/acceptance-matrix.md');
const waterline = read(
  'docs/quality-cycle/cycle-022/productization-waterline-audit.md',
);
const handoff = read('docs/quality-cycle/cycle-022/handoff.md');
const notes = read('docs/quality-cycle/cycle-022/implementation-notes.md');
const businessDomainTemplate = read(
  'docs/development/business-domain-admission-template.md',
);
const cycle027Admission = read('docs/quality-cycle/cycle-027/admission.md');
const cycle027Backlog = read('docs/quality-cycle/cycle-027/backlog.md');
const packageJson = read('package.json');

const missing: string[] = [];

function requireMarker(label: string, content: string, marker: string): void {
  if (!content.includes(marker)) {
    missing.push(`${label}: ${marker}`);
  }
}

for (const prefix of forbiddenModulePrefixes) {
  requireMarker('module registry forbidden prefixes', registry, `'${prefix}'`);
  requireMarker(
    'OpenForge forbidden prefixes',
    openforgeValidator,
    `'${prefix}'`,
  );
}

requireMarker(
  'module registry spec',
  registrySpec,
  'keeps P4/P5 modules out of the S3-S8 registry',
);
requireMarker(
  'OpenForge spec',
  openforgeSpec,
  'rejects forbidden P4/P5 module schemas',
);

const forbiddenModelPrefixes = [
  'Erp',
  'Mes',
  'Wms',
  'Mall',
  'Ai',
  'Rag',
  'Agent',
  'Payment',
  'Invoice',
  'Customer',
  'Order',
  'Product',
];
const modelNames = [...schema.matchAll(/^model\s+(\w+)/gm)].map(
  (match) => match[1],
);
const forbiddenModels = modelNames.filter((modelName) =>
  forbiddenModelPrefixes.some((prefix) => modelName.startsWith(prefix)),
);

if (forbiddenModels.length > 0) {
  missing.push(
    `forbidden Prisma business models: ${forbiddenModels.join(', ')}`,
  );
}

for (const [label, content] of [
  ['backlog', backlog],
  ['acceptance matrix', acceptance],
  ['waterline audit', waterline],
  ['handoff', handoff],
  ['implementation notes', notes],
] as const) {
  requireMarker(label, content, 'T7f business-domain admission');
}

for (const marker of [
  'Business-Domain Admission Template',
  'Tenant ownership',
  'Tenant isolation tests',
  'Runtime isolation',
  'Release evidence',
]) {
  requireMarker(
    'business-domain admission template',
    businessDomainTemplate,
    marker,
  );
}

requireMarker(
  'package.json',
  packageJson,
  'guard:tenant-business-domain-admission',
);

for (const marker of [
  '`industry.crm`',
  'tenant-owned',
  'Cross-tenant read/write/update/delete attempts',
  '`pnpm release:gate`',
]) {
  requireMarker('cycle-027 CRM admission', cycle027Admission, marker);
}

for (const marker of [
  'Typed smoke and tenant guard',
  'release gate plus public smoke',
]) {
  requireMarker('cycle-027 CRM backlog', cycle027Backlog, marker);
}

requireMarker('package.json', packageJson, 'guard:tenant-crm-scope');
requireMarker('package.json', packageJson, 'smoke:core-crm');

if (missing.length > 0) {
  throw new Error(
    `Tenant business-domain admission guard failed:\n${missing.join('\n')}`,
  );
}

console.log('Tenant business-domain admission guard passed.');
