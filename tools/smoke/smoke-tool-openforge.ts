import {
  assertArray,
  assertDefined,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const CONFIG_PATH = 'tools/generator/examples/openforge.v1.config.json';
const SCHEMA_PATH = 'tools/generator/examples/core.dict.v1.schema.json';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

async function main() {
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

  const loginResponse = await smoke.login();
  const token = assertString(loginResponse.accessToken, 'login accessToken');

  const drift = await clients.tooling.getOpenApiDriftStatus(token);
  assertEqual(drift.status, 'configured', 'openapi drift status');
  assertEqual(drift.snapshotExists, true, 'openapi snapshot exists');
  assertString(drift.snapshotPath, 'openapi snapshot path');
  assertString(drift.exportCommand, 'openapi export command');
  assertString(drift.driftCheckCommand, 'openapi drift check command');
  assertString(drift.checkedAt, 'openapi drift checkedAt');
  assertString(drift.snapshotUpdatedAt, 'openapi snapshot updatedAt');
  assertString(drift.snapshotSha256, 'openapi snapshot sha256');
  if (!/^[a-f0-9]{64}$/.test(drift.snapshotSha256 ?? '')) {
    throw new Error('Expected OpenAPI snapshot SHA-256 to be a hex digest.');
  }
  assertNumberAtLeast(drift.pathCount, 1, 'openapi path count');
  assertNumberAtLeast(drift.schemaCount, 1, 'openapi schema count');
  assertNumberAtLeast(drift.operationCount, 1, 'openapi operation count');

  const exportProtocol = await clients.tooling.getExportProtocol(token);
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

  const exportPreview = await clients.tooling.createExportPreview(token, {
    columns: ['username', 'displayName', 'email', 'status'],
    resource: 'system-users',
    rowCount: exportProtocol.maxRows + 25,
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

  const status = await clients.tooling.getOpenForgeStatus(token);
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

  const doctor = await clients.tooling.getOpenForgeDoctor(token);
  assertEqual(doctor.valid, true, 'openforge doctor valid');
  assertIncludes(
    doctor.checks.map((check) => check.id),
    'template-packs',
    'openforge doctor checks',
  );

  const plan = await clients.tooling.createOpenForgePlan(token, {
    schemaPath: SCHEMA_PATH,
  });
  assertEqual(plan.moduleCode, 'core.dict', 'openforge plan module');
  assertEqual(plan.safety.noWrite, true, 'openforge plan noWrite');
  assertIncludes(
    plan.artifacts.map((artifact) => artifact.kind),
    'prisma.hint',
    'openforge plan artifact kinds',
  );

  const diff = await clients.tooling.createOpenForgeDiff(token, {
    schemaPath: SCHEMA_PATH,
  });
  assertEqual(diff.moduleCode, 'core.dict', 'openforge diff module');
  assertIncludes(
    diff.entries.map((entry) => entry.status),
    'protected-conflict',
    'openforge diff statuses',
  );

  const preflight = await clients.tooling.createOpenForgePreflight(token, {
    schemaPath: SCHEMA_PATH,
  });
  assertEqual(preflight.noWrite, true, 'openforge preflight noWrite');
  assertEqual(
    preflight.safety.blockPrismaSchemaWrites,
    true,
    'openforge preflight prisma guard',
  );

  const applyDryRun = await clients.tooling.createOpenForgeApplyDryRun(token, {
    configPath: CONFIG_PATH,
    confirmationText: status.operationPolicy.confirmationText,
    requestedMode: 'dry-run',
    schemaPath: SCHEMA_PATH,
  });
  assertEqual(applyDryRun.mode, 'dry-run', 'openforge apply mode');
  assertEqual(applyDryRun.applied, false, 'openforge apply dry-run applied');
  const applyManifest = assertDefined(
    applyDryRun.manifest,
    'openforge apply manifest',
  );
  assertEqual(
    applyManifest.moduleCode,
    'core.dict',
    'openforge apply manifest module',
  );
  assertArray(applyDryRun.entries, 'openforge apply dry-run entries');
  assertArray(applyDryRun.errors, 'openforge apply dry-run errors');

  const manifests = await clients.tooling.listOpenForgeManifests(token);
  assertArray(manifests.manifests, 'openforge manifests');

  const manifestPreview = await clients.tooling.createOpenForgeManifestPreview(
    token,
    {
      configPath: CONFIG_PATH,
      schemaPath: SCHEMA_PATH,
    },
  );
  const previewManifest = assertDefined(
    manifestPreview.manifest,
    'openforge manifest preview manifest',
  );
  assertEqual(
    previewManifest.moduleCode,
    'core.dict',
    'openforge manifest preview module',
  );
  assertEqual(
    manifestPreview.manifestPath,
    `dry-run:${previewManifest.id}`,
    'openforge manifest preview path',
  );

  const rollbackDryRun = await clients.tooling.createOpenForgeRollbackDryRun(
    token,
    {
      confirmationText: status.operationPolicy.confirmationText,
      manifestId: 'missing-openforge-smoke-manifest',
      requestedMode: 'dry-run',
    },
  );
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

  await smoke.apiRequest('/tools/openforge/plan', {
    body: { schemaPath: 'prisma/schema.prisma' },
    expected: [400],
    method: 'POST',
    token,
  });
  await smoke.apiRequest('/tools/openforge/apply/dry-run', {
    body: {
      configPath: '.env.opencore.local',
      confirmationText: status.operationPolicy.confirmationText,
      schemaPath: SCHEMA_PATH,
    },
    expected: [400],
    method: 'POST',
    token,
  });
  await smoke.apiRequest('/tools/openforge/apply/dry-run', {
    body: { configPath: CONFIG_PATH, schemaPath: SCHEMA_PATH },
    expected: [400],
    method: 'POST',
    token,
  });
  await smoke.apiRequest('/tools/openforge/apply/dry-run', {
    body: {
      configPath: CONFIG_PATH,
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'write',
      schemaPath: SCHEMA_PATH,
    },
    expected: [400],
    method: 'POST',
    token,
  });
  await smoke.apiRequest('/tools/openforge/rollback/dry-run', {
    body: { manifestId: 'missing-openforge-smoke-manifest' },
    expected: [400],
    method: 'POST',
    token,
  });
  await smoke.apiRequest('/tools/openforge/manifests/bad%24id', {
    expected: [400],
    token,
  });

  console.log(
    JSON.stringify({
      status: 'pass',
      apiPrefix,
      baseUrl,
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
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      apiPrefix,
      baseUrl,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
