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
