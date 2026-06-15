import { ToolingRepository } from './tooling.repository';

describe('ToolingRepository', () => {
  it('describes the OpenAPI drift check command', () => {
    expect(new ToolingRepository().getOpenApiDriftStatus()).toMatchObject({
      status: 'configured',
      exportCommand: 'pnpm openapi:export',
      driftCheckCommand: 'pnpm openapi:check',
      snapshotExists: true,
      snapshotSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      pathCount: expect.any(Number),
      schemaCount: expect.any(Number),
      operationCount: expect.any(Number),
    });
  });

  it('creates bounded current-page export plans', () => {
    expect(
      new ToolingRepository().createExportPlan({
        resource: 'files',
        columns: ['originalName', 'mimeType'],
        rowCount: 1200,
      }),
    ).toMatchObject({
      filename: 'opencore-files.csv',
      format: 'csv',
      scope: 'current-page',
      rowCount: 1000,
    });
  });

  it('queries versioned area data and maps IP ranges without external lookups', () => {
    const repository = new ToolingRepository();

    expect(repository.getAreaDatasetStatus()).toMatchObject({
      status: 'active',
      version: 'opencore-area-boundary-v1',
      regionCount: expect.any(Number),
      ipRangeCount: 3,
      capabilities: expect.arrayContaining([
        'versioned-area-dataset',
        'ipv4-range-lookup',
      ]),
    });
    expect(repository.listAreaDatasetVersions()).toMatchObject({
      activeVersion: 'opencore-area-boundary-v1',
      versions: [
        expect.objectContaining({
          active: true,
          version: 'opencore-area-boundary-v1',
        }),
      ],
    });
    expect(
      repository.listAreaRegions({ query: 'san', limit: 5 }),
    ).toMatchObject({
      datasetVersion: 'opencore-area-boundary-v1',
      total: 1,
      items: [
        expect.objectContaining({
          code: 'US-CA-SFO',
          path: ['000000', 'US', 'US-CA', 'US-CA-SFO'],
        }),
      ],
    });
    expect(repository.getAreaRegion('RFC-EXAMPLE')).toMatchObject({
      code: 'RFC-EXAMPLE',
      ipRanges: expect.arrayContaining([
        expect.objectContaining({
          cidr: '203.0.113.0/24',
        }),
      ]),
    });
    expect(repository.lookupAreaIp({ ip: '203.0.113.7' })).toMatchObject({
      normalizedIp: '203.0.113.7',
      matched: true,
      range: {
        cidr: '203.0.113.0/24',
        startIp: '203.0.113.0',
        endIp: '203.0.113.255',
      },
      region: {
        code: 'RFC-EXAMPLE',
      },
    });
  });

  it('validates and applies bounded area dataset imports', () => {
    const repository = new ToolingRepository();
    const input = {
      version: 'area-smoke-v1',
      source: 'unit-test',
      entries: [
        {
          code: 'ROOT',
          name: 'Root',
        },
        {
          code: 'ROOT-EDGE',
          name: 'Edge',
          parentCode: 'ROOT',
          aliases: ['edge'],
          ipRanges: ['10.10.0.0/16'],
        },
      ],
    };

    expect(
      repository.importAreaDataset({
        ...input,
        dryRun: true,
      }),
    ).toMatchObject({
      dryRun: true,
      applied: false,
      dataset: {
        version: 'area-smoke-v1',
        regionCount: 2,
        ipRangeCount: 1,
      },
    });
    expect(repository.getAreaDatasetStatus().version).toBe(
      'opencore-area-boundary-v1',
    );

    expect(
      repository.importAreaDataset({
        ...input,
        dryRun: false,
      }),
    ).toMatchObject({
      dryRun: false,
      applied: true,
      dataset: {
        version: 'area-smoke-v1',
      },
    });
    expect(repository.getAreaDatasetStatus().version).toBe('area-smoke-v1');
    expect(repository.lookupAreaIp({ ip: '10.10.5.6' })).toMatchObject({
      matched: true,
      region: {
        code: 'ROOT-EDGE',
      },
    });
  });

  it('rejects unsafe area dataset imports', () => {
    const repository = new ToolingRepository();

    expect(() =>
      repository.importAreaDataset({
        version: 'bad version',
        source: 'unit-test',
        entries: [{ code: 'ROOT', name: 'Root' }],
      }),
    ).toThrow('version must be 3-80 characters');
    expect(() =>
      repository.importAreaDataset({
        version: 'area-bad-parent-v1',
        source: 'unit-test',
        entries: [{ code: 'CHILD', name: 'Child', parentCode: 'ROOT' }],
      }),
    ).toThrow('references missing parentCode ROOT');
    expect(() =>
      repository.importAreaDataset({
        version: 'area-bad-ip-v1',
        source: 'unit-test',
        entries: [
          {
            code: 'ROOT',
            name: 'Root',
            ipRanges: ['not-an-ip'],
          },
        ],
      }),
    ).toThrow('must use IPv4 CIDR or exact IPv4');
    expect(() => repository.lookupAreaIp({ ip: 'not-an-ip' })).toThrow(
      'ip must be a valid IP address',
    );
  });

  it('exposes OpenForge status, doctor, plan, diff, check and dry-run apply', () => {
    const repository = new ToolingRepository();
    const request = {
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
    };

    expect(repository.getOpenForgeStatus()).toMatchObject({
      status: 'workspace-ready',
      workspace: {
        noWrite: true,
      },
      generatorCore: {
        noWrite: true,
      },
    });
    expect(repository.getOpenForgeDoctor()).toMatchObject({
      valid: true,
    });
    expect(repository.createOpenForgePlan(request)).toMatchObject({
      moduleCode: 'core.dict',
      safety: {
        noWrite: true,
        blockPrismaSchemaWrites: true,
      },
    });
    expect(repository.createOpenForgeDiff(request)).toMatchObject({
      moduleCode: 'core.dict',
      safety: {
        noWrite: true,
      },
    });
    expect(repository.createOpenForgePreflight(request)).toMatchObject({
      moduleCode: 'core.dict',
      noWrite: true,
    });
    expect(
      repository.createOpenForgeApplyDryRun({
        ...request,
        confirmationText: 'OPENFORGE DRY RUN',
      }),
    ).toMatchObject({
      mode: 'dry-run',
      applied: false,
      manifest: {
        moduleCode: 'core.dict',
      },
    });
    expect(repository.createOpenForgeManifestPreview(request)).toMatchObject({
      manifestPath: expect.stringContaining('dry-run:'),
      manifest: {
        moduleCode: 'core.dict',
      },
    });
  });

  it('blocks unsafe OpenForge paths from API inputs', () => {
    const repository = new ToolingRepository();

    expect(() =>
      repository.createOpenForgePlan({ schemaPath: '../.env' }),
    ).toThrow('schemaPath must be a safe repo-relative path.');
    expect(() =>
      repository.createOpenForgePlan({ schemaPath: 'prisma/schema.prisma' }),
    ).toThrow('schemaPath must point to an OpenForge example schema.');
    expect(() =>
      repository.createOpenForgeApplyDryRun({
        schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
        configPath: '.env.opencore.local',
        confirmationText: 'OPENFORGE DRY RUN',
      }),
    ).toThrow('configPath must point to the OpenForge example config.');
    expect(() =>
      repository.createOpenForgeApplyDryRun({
        schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
      }),
    ).toThrow('OpenForge dry-run requires confirmationText');
    expect(() =>
      repository.createOpenForgeApplyDryRun({
        confirmationText: 'OPENFORGE DRY RUN',
        requestedMode: 'write',
        schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
      }),
    ).toThrow('OpenForge API only supports dry-run operations');
    expect(() => repository.getOpenForgeManifest('../secret')).toThrow(
      'manifestId may contain only letters, numbers, dot, underscore and dash.',
    );
  });
});
