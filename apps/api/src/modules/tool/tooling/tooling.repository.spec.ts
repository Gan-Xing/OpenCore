import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
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

  it('queries versioned area data and maps IP ranges without external lookups', async () => {
    const repository = new ToolingRepository();

    await expect(repository.getAreaDatasetStatus()).resolves.toMatchObject({
      status: 'active',
      version: 'opencore-area-boundary-v1',
      regionCount: expect.any(Number),
      ipRangeCount: 3,
      capabilities: expect.arrayContaining([
        'versioned-area-dataset',
        'ipv4-range-lookup',
      ]),
    });
    await expect(repository.listAreaDatasetVersions()).resolves.toMatchObject({
      activeVersion: 'opencore-area-boundary-v1',
      versions: [
        expect.objectContaining({
          active: true,
          version: 'opencore-area-boundary-v1',
        }),
      ],
    });
    await expect(
      repository.listAreaRegions({ query: 'san', limit: 5 }),
    ).resolves.toMatchObject({
      datasetVersion: 'opencore-area-boundary-v1',
      total: 1,
      items: [
        expect.objectContaining({
          code: 'US-CA-SFO',
          path: ['000000', 'US', 'US-CA', 'US-CA-SFO'],
        }),
      ],
    });
    await expect(
      repository.getAreaRegion('RFC-EXAMPLE'),
    ).resolves.toMatchObject({
      code: 'RFC-EXAMPLE',
      ipRanges: expect.arrayContaining([
        expect.objectContaining({
          cidr: '203.0.113.0/24',
        }),
      ]),
    });
    await expect(
      repository.lookupAreaIp({ ip: '203.0.113.7' }),
    ).resolves.toMatchObject({
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

  it('validates and applies bounded area dataset imports', async () => {
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

    await expect(
      repository.importAreaDataset({
        ...input,
        dryRun: true,
      }),
    ).resolves.toMatchObject({
      dryRun: true,
      applied: false,
      dataset: {
        version: 'area-smoke-v1',
        regionCount: 2,
        ipRangeCount: 1,
      },
    });
    await expect(repository.getAreaDatasetStatus()).resolves.toMatchObject({
      version: 'opencore-area-boundary-v1',
    });

    await expect(
      repository.importAreaDataset({
        ...input,
        dryRun: false,
      }),
    ).resolves.toMatchObject({
      dryRun: false,
      applied: true,
      dataset: {
        version: 'area-smoke-v1',
      },
    });
    await expect(repository.getAreaDatasetStatus()).resolves.toMatchObject({
      version: 'area-smoke-v1',
    });
    await expect(
      repository.lookupAreaIp({ ip: '10.10.5.6' }),
    ).resolves.toMatchObject({
      matched: true,
      region: {
        code: 'ROOT-EDGE',
      },
    });
    await expect(
      repository.activateAreaDatasetVersion('opencore-area-boundary-v1'),
    ).resolves.toMatchObject({
      activated: true,
      dataset: {
        version: 'opencore-area-boundary-v1',
      },
    });
    await expect(repository.getAreaDatasetStatus()).resolves.toMatchObject({
      version: 'opencore-area-boundary-v1',
    });
  });

  it('rejects unsafe area dataset imports', async () => {
    const repository = new ToolingRepository();

    await expect(
      repository.importAreaDataset({
        version: 'bad version',
        source: 'unit-test',
        entries: [{ code: 'ROOT', name: 'Root' }],
      }),
    ).rejects.toThrow('version must be 3-80 characters');
    await expect(
      repository.importAreaDataset({
        version: 'area-bad-parent-v1',
        source: 'unit-test',
        entries: [{ code: 'CHILD', name: 'Child', parentCode: 'ROOT' }],
      }),
    ).rejects.toThrow('references missing parentCode ROOT');
    await expect(
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
    ).rejects.toThrow('must use IPv4 CIDR or exact IPv4');
    await expect(repository.lookupAreaIp({ ip: 'not-an-ip' })).rejects.toThrow(
      'ip must be a valid IP address',
    );
    await expect(
      repository.activateAreaDatasetVersion('missing-area-v1'),
    ).rejects.toThrow('Area dataset version missing-area-v1 was not found.');
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

describe('ToolingRepository Prisma area dataset persistence', () => {
  const prisma = new PrismaService();
  const repository = new ToolingRepository(prisma);
  const version = `area-prisma-${randomUUID().slice(0, 8)}`;

  beforeEach(async () => {
    await repository.getAreaDatasetStatus();
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists applied area dataset imports and reads active data from PostgreSQL', async () => {
    await expect(
      repository.importAreaDataset({
        version,
        source: 'tooling-prisma-test',
        dryRun: false,
        entries: [
          {
            code: 'ROOT',
            name: 'Root',
          },
          {
            code: 'ROOT-RFC',
            name: 'RFC example',
            parentCode: 'ROOT',
            aliases: ['rfc'],
            ipRanges: ['203.0.113.0/24'],
          },
        ],
      }),
    ).resolves.toMatchObject({
      applied: true,
      dataset: {
        version,
        ipRangeCount: 1,
        regionCount: 2,
      },
    });

    await expect(repository.getAreaDatasetStatus()).resolves.toMatchObject({
      version,
    });
    await expect(
      repository.lookupAreaIp({ ip: '203.0.113.7' }),
    ).resolves.toMatchObject({
      matched: true,
      region: {
        code: 'ROOT-RFC',
      },
      range: {
        cidr: '203.0.113.0/24',
      },
    });
    await expect(
      repository.activateAreaDatasetVersion('opencore-area-boundary-v1'),
    ).resolves.toMatchObject({
      activated: true,
      dataset: {
        version: 'opencore-area-boundary-v1',
      },
    });
    await expect(repository.getAreaDatasetStatus()).resolves.toMatchObject({
      version: 'opencore-area-boundary-v1',
    });

    const persisted = await prisma.areaDatasetVersion.findUnique({
      where: { version },
      include: {
        ipRanges: true,
        regions: true,
      },
    });

    expect(persisted).toMatchObject({
      active: false,
      version,
      regions: expect.arrayContaining([
        expect.objectContaining({ code: 'ROOT-RFC' }),
      ]),
    });
    expect(persisted?.ipRanges[0]?.start).toEqual(BigInt(3405803776));
  });

  async function cleanup(): Promise<void> {
    await prisma.areaDatasetVersion.deleteMany({ where: { version } });
    await prisma.areaDatasetVersion.updateMany({ data: { active: false } });
    await prisma.areaDatasetVersion.updateMany({
      where: { version: 'opencore-area-boundary-v1' },
      data: { active: true },
    });
  }
});
