import {
  OPENAPI_CONTRACT_PROTOCOL,
  CURRENT_PAGE_EXPORT_PROTOCOL,
  createCurrentPageExportPlan,
  OPENFORGE_CONTRACT_PROTOCOL,
  OPENFORGE_GENERATED_MARKER_SIGNATURE,
  OPENFORGE_TEMPLATE_VERSION,
  OPENFORGE_V1_CONTRACT_PROTOCOL,
  OPENFORGE_V1_TEMPLATE_VERSION,
  formatOpenForgeGeneratedMarker,
  parseOpenForgeGeneratedMarker,
  parsePermissionCode,
  validateOpenForgeApplyRequest,
  validateMenuDefinition,
  validateModuleDefinition,
  validatePermissionDefinition,
  type OpenForgeApplyRequest,
  type OpenForgeGeneratorConfig,
  type OpenForgeManifest,
  type OpenForgePatchPlan,
  type OpenForgeRollbackAudit,
  type OpenForgeRollbackPlan,
  type ModuleDefinition,
} from './index';

describe('@opencore/contracts', () => {
  it('parses permission codes with stable layer/resource/action parts', () => {
    expect(parsePermissionCode('core:user:read')).toEqual({
      layer: 'core',
      resource: 'user',
      action: 'read',
    });
    expect(parsePermissionCode('core:user:approve')).toBeNull();
    expect(parsePermissionCode('crm:customer:read')).toBeNull();
  });

  it('validates permission and menu schema fields', () => {
    expect(
      validatePermissionDefinition({
        code: 'core:user:read',
        title: 'Read users',
        stage: 'S6',
      }).valid,
    ).toBe(true);

    expect(
      validateMenuDefinition({
        key: 'system.users',
        title: 'Users',
        path: '/system/users',
        permissionCode: 'core:user:read',
        order: 100,
        stage: 'S6',
      }).valid,
    ).toBe(true);
  });

  it('rejects module definitions whose permission codes drift from the module', () => {
    const moduleDefinition: ModuleDefinition = {
      code: 'core.user',
      title: 'Users',
      layer: 'core',
      priority: 'P1',
      status: 'planned',
      stage: 'S6',
      enabledByDefault: true,
      description: 'User management contract.',
      apiTags: ['Core Users'],
      permissions: [
        {
          code: 'core:role:read',
          title: 'Read roles',
          stage: 'S6',
        },
      ],
      menus: [],
    };

    expect(validateModuleDefinition(moduleDefinition)).toEqual({
      valid: false,
      issues: [
        {
          path: 'core.user.permissions.core:role:read.code',
          message: 'Permission code resource must be user.',
        },
      ],
    });
  });

  it('keeps S3 OpenAPI export and SDK generation as an explicit protocol', () => {
    expect(OPENAPI_CONTRACT_PROTOCOL).toMatchObject({
      stage: 'S3',
      status: 'protocol-only',
      sourceApplication: 'apps/api',
      ownerPackage: '@opencore/contracts',
    });
    expect(OPENAPI_CONTRACT_PROTOCOL.documentPath).toContain(
      'packages/contracts',
    );
    expect(OPENAPI_CONTRACT_PROTOCOL.sdkPackage).toBe('@opencore/sdk');
  });

  it('keeps S8 current-page export as a bounded synchronous protocol', () => {
    expect(CURRENT_PAGE_EXPORT_PROTOCOL).toMatchObject({
      stage: 'S8',
      scope: 'current-page',
      asyncExport: false,
    });
    expect(
      createCurrentPageExportPlan({
        resource: 'dicts',
        columns: ['code', 'name'],
        rowCount: 1200,
        generatedAt: '2026-06-10T00:00:00.000Z',
      }),
    ).toMatchObject({
      filename: 'opencore-dicts.csv',
      format: 'csv',
      rowCount: 1000,
    });
  });

  it('keeps S9 OpenForge as a read-only planning protocol', () => {
    expect(OPENFORGE_CONTRACT_PROTOCOL).toMatchObject({
      stage: 'S9',
      status: 'read-only-plan',
      toolPackage: '@opencore/openforge',
      noWrite: true,
    });
    expect(OPENFORGE_TEMPLATE_VERSION).toBe('s9-openforge-mvp-v1');
    expect(OPENFORGE_CONTRACT_PROTOCOL.planCommand).toContain('openforge:plan');
    expect(OPENFORGE_CONTRACT_PROTOCOL.diffCommand).toContain('openforge:diff');
    expect(OPENFORGE_CONTRACT_PROTOCOL.checkCommand).toBe(
      'pnpm openforge:check',
    );
    expect(OPENFORGE_CONTRACT_PROTOCOL.exampleSchemaPath).toBe(
      'tools/generator/examples/core.dict.schema.json',
    );
  });

  it('defines the OpenForge V1 safe generator protocol without replacing S9 commands', () => {
    expect(OPENFORGE_V1_CONTRACT_PROTOCOL).toMatchObject({
      stage: 'OpenForge V1',
      status: 'safe-generator-contract',
      defaultTemplatePack: 'openforge-default-nest-umi-v1',
      defaultApplyMode: 'dry-run',
      requireExplicitYesForWrites: true,
      requireGeneratedMarkerForUpdate: true,
      rollbackFromManifestOnly: true,
    });
    expect(OPENFORGE_V1_TEMPLATE_VERSION).toBe('openforge-default-nest-umi-v1');
    expect(OPENFORGE_CONTRACT_PROTOCOL.noWrite).toBe(true);
  });

  it('formats and parses OpenForge generated markers', () => {
    const marker = {
      signature: OPENFORGE_GENERATED_MARKER_SIGNATURE,
      templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
      schemaHash: 'schema-hash',
      moduleCode: 'core.dict',
      artifactKind: 'api.controller',
      generatedAt: '2026-06-10T00:00:00.000Z',
    } as const;
    const formatted = formatOpenForgeGeneratedMarker(marker);

    expect(formatted).toContain('@generated by OpenForge');
    expect(parseOpenForgeGeneratedMarker(`// ${formatted}`)).toEqual(marker);
    expect(parseOpenForgeGeneratedMarker('manual file')).toBeNull();
    expect(
      parseOpenForgeGeneratedMarker(
        formatted.replace('artifactKind=api.controller', 'artifactKind=bad'),
      ),
    ).toBeNull();
  });

  it('requires explicit confirmation for V1 write-mode apply requests', () => {
    const config: OpenForgeGeneratorConfig = {
      templatePack: 'openforge-default-nest-umi-v1',
      templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
      outputRoot: '.',
      applyMode: 'write',
      overwritePolicy: 'generated-marker-required',
      generatedMarkerRequired: true,
      protectedPaths: ['.env*', 'prisma/schema.prisma', 'prisma/migrations/**'],
      manualPatchOnlyPaths: [
        'apps/api/src/app/app.module.ts',
        'apps/admin/.umirc.ts',
        'apps/admin/src/access.ts',
        'packages/module-registry/src/modules.ts',
      ],
      allowedArtifactKinds: ['api.controller', 'admin.proTablePage'],
      blockedArtifactKinds: ['prisma.hint'],
      strictOpenApiTags: true,
      strictPermissionCodes: true,
      outputPolicy: {
        outputRoot: '.',
        allowedArtifactKinds: ['api.controller', 'admin.proTablePage'],
        blockedArtifactKinds: ['prisma.hint'],
      },
      writePolicy: {
        defaultMode: 'dry-run',
        requireExplicitYes: true,
        allowCreate: true,
        allowUpdateGenerated: true,
        blockHumanAuthored: true,
        generatedMarkerRequired: true,
        protectedPaths: [
          '.env*',
          'prisma/schema.prisma',
          'prisma/migrations/**',
        ],
        manualPatchOnlyPaths: [
          'apps/api/src/app/app.module.ts',
          'apps/admin/.umirc.ts',
          'apps/admin/src/access.ts',
          'packages/module-registry/src/modules.ts',
        ],
        blockedPathPatterns: ['/**', '../**'],
        blockEnvFiles: true,
        blockPrismaSchema: true,
        blockPrismaMigrations: true,
      },
    };
    const request: OpenForgeApplyRequest = {
      command: 'pnpm openforge:apply',
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
      mode: 'write',
      yes: false,
      config,
    };

    expect(validateOpenForgeApplyRequest(request)).toEqual([
      {
        severity: 'error',
        path: 'yes',
        message: 'OpenForge write mode requires explicit --yes confirmation.',
      },
    ]);
    expect(
      validateOpenForgeApplyRequest({
        ...request,
        yes: true,
      }),
    ).toEqual([]);
  });

  it('expresses manifest, rollback, and patch-plan contracts', () => {
    const manifest = {
      id: '20260610-core-dict-schema',
      createdAt: '2026-06-10T00:00:00.000Z',
      command: 'pnpm openforge:apply -- --yes',
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
      moduleCode: 'core.dict',
      templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
      inputHashes: {
        schemaHash: 'schema-hash',
        registryHash: 'registry-hash',
        openApiHash: 'openapi-hash',
        configHash: 'config-hash',
      },
      entries: [
        {
          targetPath:
            'apps/api/src/modules/generated/core/dict/dict.controller.ts',
          artifactKind: 'api.controller',
          action: 'created',
          rollbackAction: 'delete',
          afterHash: 'after-hash',
          backupPath:
            '.openforge/backups/20260610-core-dict-schema/controller.bak',
        },
      ],
    } satisfies OpenForgeManifest;
    const rollbackPlan = {
      manifest,
      mode: 'dry-run',
      entries: [
        {
          targetPath:
            'apps/api/src/modules/generated/core/dict/dict.controller.ts',
          artifactKind: 'api.controller',
          action: 'delete',
          reason: 'File was created by the apply manifest.',
          afterHash: 'after-hash',
        },
      ],
      warnings: [],
      errors: [],
    } satisfies OpenForgeRollbackPlan;
    const rollbackAudit = {
      id: '20260610-core-dict-schema-rollback',
      createdAt: '2026-06-10T00:00:00.000Z',
      command: 'pnpm openforge:rollback -- --yes',
      manifestPath: '.openforge/manifests/20260610-core-dict-schema.json',
      manifestId: manifest.id,
      moduleCode: 'core.dict',
      templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
      entries: rollbackPlan.entries,
    } satisfies OpenForgeRollbackAudit;
    const patchPlan = {
      moduleCode: 'core.dict',
      templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
      generatedAt: '2026-06-10T00:00:00.000Z',
      entries: [
        {
          targetPath: 'apps/api/src/app/app.module.ts',
          patchPath: 'openforge-patches/app-module.patch.md',
          artifactKind: 'patch.app-module',
          manualInsertionPoint: 'imports array',
          reason: 'Generated modules require manual registration.',
          risk: 'Incorrect registration can break API bootstrap.',
          verificationCommands: ['pnpm typecheck', 'pnpm test:api'],
        },
      ],
      warnings: [],
    } satisfies OpenForgePatchPlan;

    expect(manifest.entries[0]).toMatchObject({
      action: 'created',
      rollbackAction: 'delete',
    });
    expect(rollbackPlan.entries[0]).toMatchObject({
      action: 'delete',
    });
    expect(rollbackAudit).toMatchObject({
      manifestId: manifest.id,
      moduleCode: 'core.dict',
    });
    expect(patchPlan.entries[0]).toMatchObject({
      artifactKind: 'patch.app-module',
      verificationCommands: ['pnpm typecheck', 'pnpm test:api'],
    });
  });
});
