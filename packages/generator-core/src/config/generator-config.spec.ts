import {
  DEFAULT_OPENFORGE_GENERATOR_CONFIG,
  loadOpenForgeGeneratorConfig,
  validateOpenForgeGeneratorConfig,
} from './generator-config';

describe('OpenForge generator config DSL', () => {
  it('loads the default V1 config with dry-run safety policy', () => {
    const loaded = loadOpenForgeGeneratorConfig();

    expect(loaded.config).toMatchObject({
      templatePack: 'openforge-default-nest-umi-v1',
      templateVersion: 'openforge-default-nest-umi-v1',
      outputRoot: '.',
      applyMode: 'dry-run',
      generatedMarkerRequired: true,
      strictPermissionCodes: true,
      writePolicy: {
        defaultMode: 'dry-run',
        requireExplicitYes: true,
        blockHumanAuthored: true,
        blockEnvFiles: true,
        blockPrismaSchema: true,
        blockPrismaMigrations: true,
      },
    });
    expect(validateOpenForgeGeneratorConfig(loaded.config)).toEqual([]);
  });

  it('loads an explicit V1 config fixture', () => {
    const loaded = loadOpenForgeGeneratorConfig(
      'tools/generator/examples/openforge.v1.config.json',
    );

    expect(loaded.config).toMatchObject({
      templatePack: 'openforge-default-nest-umi-v1',
      outputRoot: '.',
      applyMode: 'dry-run',
      blockedArtifactKinds: ['prisma.hint'],
      strictOpenApiTags: false,
    });
    expect(loaded.config.allowedArtifactKinds).toEqual(
      expect.arrayContaining(['api.controller', 'admin.proTablePage']),
    );
    expect(validateOpenForgeGeneratorConfig(loaded.config)).toEqual([]);
  });

  it('rejects unsafe output roots and disabled marker policy', () => {
    expect(
      validateOpenForgeGeneratorConfig({
        ...DEFAULT_OPENFORGE_GENERATOR_CONFIG,
        outputRoot: '../outside',
        generatedMarkerRequired: false,
        writePolicy: {
          ...DEFAULT_OPENFORGE_GENERATOR_CONFIG.writePolicy,
          manualPatchOnlyPaths: ['../outside.ts'],
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        {
          severity: 'error',
          path: 'outputRoot',
          message: 'Output root must be repo-relative.',
        },
        {
          severity: 'error',
          path: 'generatedMarkerRequired',
          message: 'Generated marker must be required for updates.',
        },
        {
          severity: 'error',
          path: '../outside.ts',
          message: 'Config paths must be repo-relative and must not traverse.',
        },
      ]),
    );
  });
});
