#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const SCHEMA_PATH = 'tools/generator/examples/core.dict.v1.schema.json';
const CONFIG_PATH = 'tools/generator/examples/openforge.v1.config.json';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;
let token;

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/tools/openapi/drift');
    assertOpenApiPath(openApi, '/api/tools/export/protocol');
    assertOpenApiPath(openApi, '/api/tools/export/preview');
    assertOpenApiPath(openApi, '/api/tools/openforge/status');
    assertOpenApiPath(openApi, '/api/tools/openforge/plan');
    assertOpenApiPath(openApi, '/api/tools/openforge/apply/dry-run');
    assertOpenApiPath(openApi, '/api/tools/openforge/manifests/preview');
    assertOpenApiPath(openApi, '/api/tools/openforge/manifests/{manifestId}');
    assertOpenApiPath(openApi, '/api/tools/openforge/rollback/dry-run');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const drift = await apiRequest('/tools/openapi/drift');
  assertEqual(drift.status, 'configured', 'openapi drift status');
  assertEqual(drift.snapshotExists, true, 'openapi snapshot exists');
  assertString(drift.snapshotPath, 'openapi snapshot path');
  assertString(drift.exportCommand, 'openapi export command');
  assertString(drift.driftCheckCommand, 'openapi drift check command');
  assertString(drift.checkedAt, 'openapi drift checkedAt');
  assertString(drift.snapshotUpdatedAt, 'openapi snapshot updatedAt');
  assertString(drift.snapshotSha256, 'openapi snapshot sha256');
  if (!/^[a-f0-9]{64}$/.test(drift.snapshotSha256)) {
    throw new Error('Expected OpenAPI snapshot SHA-256 to be a hex digest.');
  }
  assertNumberAtLeast(drift.pathCount, 1, 'openapi path count');
  assertNumberAtLeast(drift.schemaCount, 1, 'openapi schema count');
  assertNumberAtLeast(drift.operationCount, 1, 'openapi operation count');

  const exportProtocol = await apiRequest('/tools/export/protocol');
  assertEqual(exportProtocol.stage, 'S8', 'export protocol stage');
  assertEqual(exportProtocol.status, 'active', 'export protocol status');
  assertEqual(exportProtocol.scope, 'current-page', 'export protocol scope');
  assertIncludes(
    exportProtocol.supportedFormats,
    'csv',
    'export protocol supported formats',
  );
  assertEqual(exportProtocol.asyncExport, false, 'export protocol async flag');
  assertNumberAtLeast(exportProtocol.maxRows, 1, 'export protocol max rows');

  const exportPreview = await apiRequest('/tools/export/preview', {
    method: 'POST',
    body: {
      resource: 'system-users',
      columns: ['username', 'displayName', 'email', 'status'],
      rowCount: exportProtocol.maxRows + 25,
    },
  });
  assertEqual(
    exportPreview.resource,
    'system-users',
    'export preview resource',
  );
  assertEqual(
    exportPreview.filename,
    'opencore-system-users.csv',
    'export preview filename',
  );
  assertEqual(exportPreview.format, 'csv', 'export preview format');
  assertEqual(exportPreview.scope, 'current-page', 'export preview scope');
  assertEqual(
    exportPreview.rowCount,
    exportProtocol.maxRows,
    'export preview capped rows',
  );
  assertIncludes(exportPreview.columns, 'username', 'export preview columns');
  assertString(exportPreview.generatedAt, 'export preview generatedAt');

  const status = await apiRequest('/tools/openforge/status');
  assertEqual(status.status, 'workspace-ready', 'openforge status');
  assertEqual(status.workspace.noWrite, true, 'openforge workspace noWrite');
  assertEqual(
    status.generatorCore.noWrite,
    true,
    'openforge generator-core noWrite',
  );
  assertEqual(
    status.operationPolicy.dryRunOnly,
    true,
    'openforge operation dry-run policy',
  );
  assertEqual(
    status.operationPolicy.confirmationText,
    'OPENFORGE DRY RUN',
    'openforge operation confirmation text',
  );

  const doctor = await apiRequest('/tools/openforge/doctor');
  assertEqual(doctor.valid, true, 'openforge doctor valid');
  assertArray(doctor.checks, 'openforge doctor checks');
  assertIncludes(
    doctor.checks.map((check) => check.id),
    'template-packs',
    'openforge doctor checks',
  );

  const plan = await apiRequest('/tools/openforge/plan', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH },
  });
  assertEqual(plan.moduleCode, 'core.dict', 'openforge plan module');
  assertEqual(plan.safety.noWrite, true, 'openforge plan noWrite');
  assertIncludes(
    plan.artifacts.map((artifact) => artifact.kind),
    'prisma.hint',
    'openforge plan artifact kinds',
  );

  const diff = await apiRequest('/tools/openforge/diff', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH },
  });
  assertEqual(diff.moduleCode, 'core.dict', 'openforge diff module');
  assertIncludes(
    diff.entries.map((entry) => entry.status),
    'protected-conflict',
    'openforge diff statuses',
  );

  const preflight = await apiRequest('/tools/openforge/check', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH },
  });
  assertEqual(preflight.noWrite, true, 'openforge preflight noWrite');
  assertEqual(
    preflight.safety.blockPrismaSchemaWrites,
    true,
    'openforge preflight prisma guard',
  );

  const applyDryRun = await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: {
      schemaPath: SCHEMA_PATH,
      configPath: CONFIG_PATH,
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'dry-run',
    },
  });
  assertEqual(applyDryRun.mode, 'dry-run', 'openforge apply mode');
  assertEqual(applyDryRun.applied, false, 'openforge apply dry-run applied');
  assertEqual(
    applyDryRun.manifest.moduleCode,
    'core.dict',
    'openforge apply manifest module',
  );
  assertArray(applyDryRun.entries, 'openforge apply dry-run entries');
  assertArray(applyDryRun.errors, 'openforge apply dry-run errors');

  const manifests = await apiRequest('/tools/openforge/manifests');
  assertArray(manifests.manifests, 'openforge manifests');

  const manifestPreview = await apiRequest(
    '/tools/openforge/manifests/preview',
    {
      method: 'POST',
      body: { schemaPath: SCHEMA_PATH, configPath: CONFIG_PATH },
    },
  );
  assertEqual(
    manifestPreview.manifest.moduleCode,
    'core.dict',
    'openforge manifest preview module',
  );
  assertEqual(
    manifestPreview.manifestPath,
    `dry-run:${manifestPreview.manifest.id}`,
    'openforge manifest preview path',
  );

  const rollbackDryRun = await apiRequest('/tools/openforge/rollback/dry-run', {
    method: 'POST',
    body: {
      manifestId: 'missing-openforge-smoke-manifest',
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'dry-run',
    },
  });
  assertEqual(rollbackDryRun.mode, 'dry-run', 'openforge rollback mode');
  assertEqual(
    rollbackDryRun.rolledBack,
    false,
    'openforge rollback dry-run result',
  );
  assertArray(rollbackDryRun.errors, 'openforge rollback dry-run errors');
  if (rollbackDryRun.errors.length < 1) {
    throw new Error('Expected missing rollback manifest to return errors.');
  }

  await apiRequest('/tools/openforge/plan', {
    method: 'POST',
    body: { schemaPath: 'prisma/schema.prisma' },
    expected: [400],
  });
  await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: {
      schemaPath: SCHEMA_PATH,
      configPath: '.env.opencore.local',
      confirmationText: status.operationPolicy.confirmationText,
    },
    expected: [400],
  });
  await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH, configPath: CONFIG_PATH },
    expected: [400],
  });
  await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: {
      schemaPath: SCHEMA_PATH,
      configPath: CONFIG_PATH,
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'write',
    },
    expected: [400],
  });
  await apiRequest('/tools/openforge/rollback/dry-run', {
    method: 'POST',
    body: { manifestId: 'missing-openforge-smoke-manifest' },
    expected: [400],
  });
  await apiRequest('/tools/openforge/manifests/bad%24id', {
    expected: [400],
  });

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.tool-paths'] : []),
        'auth.login',
        'tool.openapi.live-drift-status',
        'tool.openapi.snapshot-metadata',
        'tool.export.protocol',
        'tool.export.preview',
        'tool.export.row-cap',
        'tool.openforge.status',
        'tool.openforge.doctor',
        'tool.openforge.plan',
        'tool.openforge.diff',
        'tool.openforge.check',
        'tool.openforge.apply-dry-run',
        'tool.openforge.manifests',
        'tool.openforge.manifest-preview',
        'tool.openforge.rollback-dry-run',
        'tool.openforge.confirmation-guards',
        'tool.openforge.path-guards',
      ],
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
}
