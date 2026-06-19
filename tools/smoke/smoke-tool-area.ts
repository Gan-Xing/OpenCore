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
    assertOpenApiPath(openApi, '/api/system/area/dataset');
    assertOpenApiPath(openApi, '/api/system/area/dataset/versions');
    assertOpenApiPath(
      openApi,
      '/api/system/area/dataset/versions/{version}/activate',
    );
    assertOpenApiPath(openApi, '/api/system/area/tree');
    assertOpenApiPath(openApi, '/api/system/area/children');
    assertOpenApiPath(openApi, '/api/system/area/regions');
    assertOpenApiPath(openApi, '/api/system/area/regions/{code}');
    assertOpenApiPath(openApi, '/api/system/area/format');
    assertOpenApiPath(openApi, '/api/system/area/get-by-ip');
    assertOpenApiPath(openApi, '/api/system/area/ip/lookup');
    assertOpenApiPath(openApi, '/api/system/area/import');
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

  const tree = await clients.tooling.listAreaTree(token);
  assertEqual(tree.datasetVersion, status.version, 'area tree dataset version');
  assertAtLeast(tree.items.length, 1, 'area tree root count');
  assertIncludes(
    tree.items.map((region) => region.code),
    '000000',
    'area tree root codes',
  );

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

  const formatted = await clients.tooling.formatAreaRegion(token, {
    code: 'US-CA-SFO',
  });
  assertEqual(
    formatted.formatted,
    'Global / United States / California / San Francisco',
    'area formatter output',
  );

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

  const getByIp = (await smoke.apiRequest(
    '/system/area/get-by-ip?ip=203.0.113.7',
    {
      expected: [200],
      method: 'GET',
      token,
    },
  )) as { matched?: unknown };
  assertEqual(getByIp.matched, true, 'area get-by-ip matched');

  await smoke.apiRequest('/system/area/import', {
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
  await smoke.apiRequest('/system/area/ip/lookup', {
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
        ...(checkDocs ? ['openapi.system-area'] : []),
        'auth.login',
        'system.area.dataset-status',
        'system.area.dataset-versions',
        'system.area.dataset-activate',
        'system.area.tree',
        'system.area.region-query',
        'system.area.region-detail',
        'system.area.format',
        'system.area.ip-lookup',
        'system.area.get-by-ip',
        'system.area.import-dry-run',
        'system.area.import-apply-restore',
        'system.area.bad-parent-rejected',
        'system.area.bad-ip-rejected',
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
