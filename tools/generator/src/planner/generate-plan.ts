import {
  OPENFORGE_TEMPLATE_VERSION,
  type MenuDefinition,
  type OpenForgeArtifactKind,
  type OpenForgeArtifactPlan,
  type OpenForgeManualSchema,
  type OpenForgePlan,
  type OpenForgeSafetyPolicy,
  type OpenForgeValidationIssue,
} from '@opencore/contracts';
import { createStableHash } from '../hash/stable-hash';
import {
  readOpenApiSnapshot,
  type OpenForgeOpenApiSnapshot,
} from '../readers/openapi-reader';
import {
  readModuleRegistrySnapshot,
  type OpenForgeRegistrySnapshot,
} from '../readers/registry-reader';
import { loadManualSchema } from '../readers/schema-loader';
import { validateOpenForgeManualSchema } from '../validators/manual-schema-validator';

export const OPENFORGE_DETERMINISTIC_TIMESTAMP = '2026-06-10T00:00:00.000Z';

export const OPENFORGE_SAFETY_POLICY: OpenForgeSafetyPolicy = {
  noWrite: true,
  dryRunOnly: true,
  protectedPaths: [
    '.env',
    '.env.*',
    '.env.opencore.local',
    'prisma/schema.prisma',
    'prisma/migrations/**',
  ],
  forbiddenPathPatterns: ['/**', '../**'],
  requireGeneratedMarkerForUpdate: true,
  blockPrismaSchemaWrites: true,
  blockPrismaMigrations: true,
  blockP4P5Modules: true,
};

export type BuildGeneratePlanOptions = {
  schemaPath: string;
  openApiPath?: string;
  strictOpenApiTags?: boolean;
};

type ArtifactDefinition = {
  kind: OpenForgeArtifactKind;
  targetPath: string;
  reason: string;
};

function createContentPreview(
  kind: OpenForgeArtifactKind,
  schema: OpenForgeManualSchema,
): string {
  return [
    `OpenForge ${OPENFORGE_TEMPLATE_VERSION}`,
    `kind=${kind}`,
    `module=${schema.moduleCode}`,
    `resource=${schema.resource}`,
    'S9 preview only; no generated target file is written.',
  ].join('\n');
}

function createArtifact(
  definition: ArtifactDefinition,
  schema: OpenForgeManualSchema,
): OpenForgeArtifactPlan {
  const contentPreview = createContentPreview(definition.kind, schema);

  return {
    kind: definition.kind,
    targetPath: definition.targetPath,
    action: definition.kind === 'prisma.hint' ? 'hint' : 'would-create',
    protected: definition.kind === 'prisma.hint',
    overwritePolicy:
      definition.kind === 'prisma.hint' ? 'never' : 'generated-marker-required',
    contentHash: createStableHash(contentPreview),
    contentPreview:
      definition.kind === 'prisma.hint'
        ? 'Prisma model changes must be reviewed and written manually outside S9.'
        : contentPreview,
    reason: definition.reason,
  };
}

function buildArtifactDefinitions(
  schema: OpenForgeManualSchema,
): readonly ArtifactDefinition[] {
  const [layer, moduleResource] = schema.moduleCode.split('.');
  const resourcePascal = schema.resource
    .split('-')
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join('');
  const adminBasePath = schema.admin.basePath.replace(/^\//, '');

  return [
    {
      kind: 'api.module',
      targetPath: `apps/api/src/modules/${layer}/${moduleResource}/${schema.resource}.module.ts`,
      reason:
        'NestJS module registration skeleton for the selected module resource.',
    },
    {
      kind: 'api.controller',
      targetPath: `apps/api/src/modules/${layer}/${moduleResource}/${schema.resource}.controller.ts`,
      reason:
        'Controller skeleton aligned with manual schema actions and OpenAPI paths.',
    },
    {
      kind: 'api.service',
      targetPath: `apps/api/src/modules/${layer}/${moduleResource}/${schema.resource}.service.ts`,
      reason:
        'Service skeleton placeholder for future hand-written business logic.',
    },
    {
      kind: 'api.dto',
      targetPath: `apps/api/src/modules/${layer}/${moduleResource}/${schema.resource}.dto.ts`,
      reason: 'DTO skeleton derived from manual schema field definitions.',
    },
    {
      kind: 'api.repository',
      targetPath: `apps/api/src/modules/${layer}/${moduleResource}/${schema.resource}.repository.ts`,
      reason:
        'Repository contract placeholder without persistence implementation.',
    },
    {
      kind: 'admin.listPage',
      targetPath: `apps/admin/src/pages/${adminBasePath}/${resourcePascal}List.tsx`,
      reason: 'Ant Design ProTable list page plan for the admin route.',
    },
    {
      kind: 'admin.form',
      targetPath: `apps/admin/src/pages/${adminBasePath}/${resourcePascal}Form.tsx`,
      reason: 'ModalForm or DrawerForm plan for create/update flows.',
    },
    {
      kind: 'admin.detail',
      targetPath: `apps/admin/src/pages/${adminBasePath}/${resourcePascal}Detail.tsx`,
      reason: 'ProDescriptions detail drawer plan.',
    },
    {
      kind: 'sdk.client',
      targetPath: `packages/sdk/src/${schema.resource}-client.ts`,
      reason: 'Typed SDK client plan tied to OpenAPI operations.',
    },
    {
      kind: 'test.api',
      targetPath: `apps/api/src/modules/${layer}/${moduleResource}/${schema.resource}.controller.spec.ts`,
      reason: 'API test skeleton plan for permissions and DTO contracts.',
    },
    {
      kind: 'test.admin',
      targetPath: `apps/admin/tests/${schema.resource}.spec.ts`,
      reason: 'Admin smoke test skeleton plan for route and access behavior.',
    },
    {
      kind: 'docs.fragment',
      targetPath: `docs/modules/${schema.moduleCode.replace('.', '-')}.md`,
      reason:
        'Documentation fragment plan for module contract and safety notes.',
    },
    {
      kind: 'prisma.hint',
      targetPath: 'prisma/schema.prisma',
      reason: 'Prisma changes are manual review hints only in S9.',
    },
  ];
}

function sortMenus(
  menus: readonly MenuDefinition[],
): readonly MenuDefinition[] {
  return [...menus].sort((left, right) => left.key.localeCompare(right.key));
}

function buildPlanFromSnapshots(
  schema: OpenForgeManualSchema,
  schemaRaw: unknown,
  registry: OpenForgeRegistrySnapshot,
  openApi: OpenForgeOpenApiSnapshot,
  validationErrors: readonly OpenForgeValidationIssue[],
  validationWarnings: readonly OpenForgeValidationIssue[],
): OpenForgePlan {
  const moduleDefinition = registry.modules.find(
    (candidate) => candidate.code === schema.moduleCode,
  );
  const modulePermissions = registry.permissions.filter((permission) =>
    schema.permissions.includes(permission.code),
  );
  const moduleMenus = sortMenus(
    registry.menus.filter(
      (menu) =>
        menu.permissionCode && schema.permissions.includes(menu.permissionCode),
    ),
  );

  return {
    moduleCode: schema.moduleCode,
    templateVersion: OPENFORGE_TEMPLATE_VERSION,
    inputSnapshot: {
      generatedAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
      registryHash: createStableHash(registry.modules),
      openApiHash: createStableHash(openApi.raw),
      schemaHash: createStableHash(schemaRaw),
      module: {
        code: moduleDefinition?.code ?? schema.moduleCode,
        title: moduleDefinition?.title ?? schema.title,
        layer: moduleDefinition?.layer ?? 'experimental',
        stage: moduleDefinition?.stage ?? 'backlog',
        apiTags: moduleDefinition?.apiTags ?? [],
      },
      permissions: modulePermissions,
      menus: moduleMenus,
    },
    schemaHash: createStableHash(schemaRaw),
    openApiSnapshotHash: createStableHash(openApi.raw),
    registrySnapshotHash: createStableHash(registry.modules),
    artifacts: buildArtifactDefinitions(schema).map((definition) =>
      createArtifact(definition, schema),
    ),
    permissions: [...schema.permissions].sort(),
    menus: moduleMenus,
    openapiTags: [...schema.openapi.tags].sort(),
    warnings: validationWarnings,
    errors: validationErrors,
    nextCommands: [
      'pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json',
      'pnpm openforge:check',
    ],
    safety: OPENFORGE_SAFETY_POLICY,
  };
}

export function buildGeneratePlan(
  options: BuildGeneratePlanOptions,
): OpenForgePlan {
  const loadedSchema = loadManualSchema(options.schemaPath);
  const registry = readModuleRegistrySnapshot();
  const openApi = readOpenApiSnapshot(options.openApiPath);
  const validation = validateOpenForgeManualSchema(
    loadedSchema.schema,
    registry,
    openApi,
    {
      strictOpenApiTags: options.strictOpenApiTags,
    },
  );

  return buildPlanFromSnapshots(
    loadedSchema.schema,
    loadedSchema.raw,
    registry,
    openApi,
    validation.errors,
    validation.warnings,
  );
}
