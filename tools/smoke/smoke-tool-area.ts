import {
  assertArray,
  assertAtLeast,
  assertDefined,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

async function main() {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/tools/area/dataset');
    assertOpenApiPath(openApi, '/api/tools/area/dataset/versions');
    assertOpenApiPath(
      openApi,
      '/api/tools/area/dataset/versions/{version}/activate',
    );
    assertOpenApiPath(openApi, '/api/tools/area/regions');
    assertOpenApiPath(openApi, '/api/tools/area/regions/{code}');
    assertOpenApiPath(openApi, '/api/tools/area/ip/lookup');
    assertOpenApiPath(openApi, '/api/tools/area/import');
  }

  const loginResponse = await smoke.login();
  const token = assertString(loginResponse.accessToken, 'login accessToken');

  const status = await clients.tooling.getAreaDatasetStatus(token);
  assertEqual(status.status, 'active', 'area dataset status');
  assertString(status.version, 'area dataset version');
  assertAtLeast(status.regionCount, 5, 'area region count');
  assertAtLeast(status.ipRangeCount, 3, 'area IP range count');
  assertIncludes(
    status.capabilities,
    'versioned-area-dataset',
    'area dataset capabilities',
  );

  const versions = await clients.tooling.listAreaDatasetVersions(token);
  assertEqual(
    versions.activeVersion,
    status.version,
    'area active version parity',
  );
  assertArray(versions.versions, 'area dataset versions');
  assertAtLeast(versions.versions.length, 1, 'area dataset version count');

  const regionList = await clients.tooling.listAreaRegions(token, {
    limit: 10,
    query: 'san',
  });
  assertEqual(
    regionList.datasetVersion,
    status.version,
    'area region dataset version',
  );
  assertAtLeast(regionList.items.length, 1, 'area region search count');
  assertIncludes(
    regionList.items.map((region) => region.code),
    'US-CA-SFO',
    'area region search codes',
  );

  const region = await clients.tooling.getAreaRegion(token, 'RFC-EXAMPLE');
  assertEqual(region.code, 'RFC-EXAMPLE', 'area region detail code');
  assertAtLeast(region.ipRanges.length, 3, 'area region detail ranges');

  const lookup = await clients.tooling.lookupAreaIp(token, {
    ip: '203.0.113.7',
  });
  assertEqual(lookup.normalizedIp, '203.0.113.7', 'area lookup normalized IP');
  assertEqual(lookup.matched, true, 'area lookup matched');
  assertEqual(
    assertDefined(lookup.region, 'area lookup region').code,
    'RFC-EXAMPLE',
    'area lookup region code',
  );
  assertEqual(
    assertDefined(lookup.range, 'area lookup range').cidr,
    '203.0.113.0/24',
    'area lookup range CIDR',
  );

  const dryRun = await clients.tooling.importAreaDataset(token, {
    dryRun: true,
    entries: [
      {
        code: 'ROOT',
        name: 'Root',
      },
      {
        code: 'ROOT-EDGE',
        name: 'Edge Lab',
        parentCode: 'ROOT',
        ipRanges: ['10.88.0.0/16'],
      },
    ],
    source: 'smoke-dry-run',
    version: 'smoke-area-v1',
  });
  assertEqual(dryRun.dryRun, true, 'area import dryRun');
  assertEqual(dryRun.applied, false, 'area import dryRun applied');
  assertEqual(
    dryRun.dataset.version,
    'smoke-area-v1',
    'area import dryRun version',
  );

  const applyVersion = 'smoke-area-apply-v1';
  let restoreRequired = false;
  try {
    const applied = await clients.tooling.importAreaDataset(token, {
      dryRun: false,
      entries: [
        {
          code: 'ROOT',
          name: 'Root',
        },
        {
          code: 'ROOT-EDGE',
          name: 'Edge Lab',
          parentCode: 'ROOT',
          aliases: ['edge'],
          ipRanges: ['10.88.0.0/16'],
        },
      ],
      source: 'smoke-apply',
      version: applyVersion,
    });
    restoreRequired = true;
    assertEqual(applied.dryRun, false, 'area import apply dryRun flag');
    assertEqual(applied.applied, true, 'area import apply applied flag');
    assertEqual(
      applied.dataset.version,
      applyVersion,
      'area import apply version',
    );

    const appliedStatus = await clients.tooling.getAreaDatasetStatus(token);
    assertEqual(
      appliedStatus.version,
      applyVersion,
      'area import active version after apply',
    );

    const appliedLookup = await clients.tooling.lookupAreaIp(token, {
      ip: '10.88.5.6',
    });
    assertEqual(appliedLookup.matched, true, 'area import applied IP match');
    assertEqual(
      assertDefined(appliedLookup.region, 'area applied lookup region').code,
      'ROOT-EDGE',
      'area applied lookup region code',
    );
  } finally {
    if (restoreRequired) {
      const restored = await clients.tooling.activateAreaDatasetVersion(
        token,
        status.version,
      );
      assertEqual(restored.activated, true, 'area restore activation result');
      assertEqual(
        restored.dataset.version,
        status.version,
        'area restore activation version',
      );
    }
  }

  const restoredStatus = await clients.tooling.getAreaDatasetStatus(token);
  assertEqual(
    restoredStatus.version,
    status.version,
    'area active version restored after apply smoke',
  );

  await smoke.apiRequest('/tools/area/import', {
    body: {
      dryRun: true,
      entries: [{ code: 'CHILD', name: 'Child', parentCode: 'MISSING' }],
      source: 'smoke-bad-parent',
      version: 'smoke-area-bad-parent-v1',
    },
    expected: [400],
    method: 'POST',
    token,
  });
  await smoke.apiRequest('/tools/area/ip/lookup', {
    body: { ip: 'not-an-ip' },
    expected: [400],
    method: 'POST',
    token,
  });

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.tool-area'] : []),
        'auth.login',
        'tool.area.dataset-status',
        'tool.area.dataset-versions',
        'tool.area.dataset-activate',
        'tool.area.region-query',
        'tool.area.region-detail',
        'tool.area.ip-lookup',
        'tool.area.import-dry-run',
        'tool.area.import-apply-restore',
        'tool.area.bad-parent-rejected',
        'tool.area.bad-ip-rejected',
      ],
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
