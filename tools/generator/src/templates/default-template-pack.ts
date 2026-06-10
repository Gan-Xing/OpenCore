import {
  OPENFORGE_V1_TEMPLATE_VERSION,
  type OpenForgeArtifactKind,
  type OpenForgeTemplatePack,
} from '@opencore/contracts';

type TemplateSeed = {
  id: string;
  artifactKind: OpenForgeArtifactKind;
  description: string;
  targetPathPattern: string;
  patchOnly?: boolean;
};

const TEMPLATE_SEEDS: readonly TemplateSeed[] = [
  {
    id: 'api.module',
    artifactKind: 'api.module',
    description: 'NestJS generated module skeleton.',
    targetPathPattern:
      'apps/api/src/modules/generated/{layer}/{resource}/{resource}.module.ts',
  },
  {
    id: 'api.controller',
    artifactKind: 'api.controller',
    description: 'NestJS generated controller skeleton with permissions.',
    targetPathPattern:
      'apps/api/src/modules/generated/{layer}/{resource}/{resource}.controller.ts',
  },
  {
    id: 'api.service',
    artifactKind: 'api.service',
    description: 'NestJS generated service skeleton without business logic.',
    targetPathPattern:
      'apps/api/src/modules/generated/{layer}/{resource}/{resource}.service.ts',
  },
  {
    id: 'api.dto',
    artifactKind: 'api.dto',
    description: 'NestJS generated DTO skeleton with Swagger decorators.',
    targetPathPattern:
      'apps/api/src/modules/generated/{layer}/{resource}/{resource}.dto.ts',
  },
  {
    id: 'api.repository',
    artifactKind: 'api.repository',
    description: 'Generated repository contract placeholder.',
    targetPathPattern:
      'apps/api/src/modules/generated/{layer}/{resource}/{resource}.repository.ts',
  },
  {
    id: 'api.spec',
    artifactKind: 'api.spec',
    description: 'Generated API unit test skeleton.',
    targetPathPattern:
      'apps/api/src/modules/generated/{layer}/{resource}/{resource}.spec.ts',
  },
  {
    id: 'admin.pro-table-page',
    artifactKind: 'admin.proTablePage',
    description: 'Generated Admin ProTable page skeleton.',
    targetPathPattern: 'apps/admin/src/pages/Generated/{pascal}/index.tsx',
  },
  {
    id: 'admin.modal-form',
    artifactKind: 'admin.modalForm',
    description: 'Generated Admin ModalForm skeleton.',
    targetPathPattern:
      'apps/admin/src/pages/Generated/{pascal}/components/{pascal}Form.tsx',
  },
  {
    id: 'admin.drawer-form',
    artifactKind: 'admin.drawerForm',
    description: 'Generated Admin DrawerForm skeleton.',
    targetPathPattern:
      'apps/admin/src/pages/Generated/{pascal}/components/{pascal}Drawer.tsx',
  },
  {
    id: 'admin.descriptions',
    artifactKind: 'admin.descriptions',
    description: 'Generated Admin ProDescriptions detail skeleton.',
    targetPathPattern:
      'apps/admin/src/pages/Generated/{pascal}/components/{pascal}Detail.tsx',
  },
  {
    id: 'admin.export-button',
    artifactKind: 'admin.exportButton',
    description: 'Generated Admin TableExportButton operation skeleton.',
    targetPathPattern:
      'apps/admin/src/pages/Generated/{pascal}/components/{pascal}ExportButton.tsx',
  },
  {
    id: 'admin.smoke-test',
    artifactKind: 'admin.smokeTest',
    description: 'Generated Admin smoke test skeleton.',
    targetPathPattern:
      'apps/admin/src/pages/Generated/{pascal}/{pascal}.smoke.spec.ts',
  },
  {
    id: 'sdk.client',
    artifactKind: 'sdk.client',
    description: 'Generated SDK client skeleton.',
    targetPathPattern: 'packages/sdk/src/generated/{resource}-client.ts',
  },
  {
    id: 'sdk.types',
    artifactKind: 'sdk.types',
    description: 'Generated SDK type skeleton.',
    targetPathPattern: 'packages/sdk/src/generated/{resource}-types.ts',
  },
  {
    id: 'sdk.spec',
    artifactKind: 'sdk.spec',
    description: 'Generated SDK test skeleton.',
    targetPathPattern: 'packages/sdk/src/generated/{resource}-client.spec.ts',
  },
  {
    id: 'sdk.generated-index',
    artifactKind: 'sdk.generated-index',
    description: 'Generated SDK barrel file skeleton.',
    targetPathPattern: 'packages/sdk/src/generated/index.ts',
  },
  {
    id: 'docs.module-doc',
    artifactKind: 'docs.module-doc',
    description: 'Generated module documentation fragment.',
    targetPathPattern: 'docs/generated/openforge/{moduleCode}.md',
  },
  {
    id: 'docs.api-doc',
    artifactKind: 'docs.api-doc',
    description: 'Generated API documentation fragment.',
    targetPathPattern: 'docs/generated/openforge/{moduleCode}-api.md',
  },
  {
    id: 'docs.admin-doc',
    artifactKind: 'docs.admin-doc',
    description: 'Generated Admin documentation fragment.',
    targetPathPattern: 'docs/generated/openforge/{moduleCode}-admin.md',
  },
  {
    id: 'docs.runbook',
    artifactKind: 'docs.runbook',
    description: 'Generated module runbook fragment.',
    targetPathPattern: 'docs/generated/openforge/{moduleCode}-runbook.md',
  },
  {
    id: 'docs.patch-review',
    artifactKind: 'docs.patch-review',
    description: 'Generated patch review documentation.',
    targetPathPattern: 'docs/generated/openforge/{moduleCode}-patch-review.md',
  },
  {
    id: 'prisma.model-draft',
    artifactKind: 'prisma.model-draft',
    description: 'Prisma model draft for manual review.',
    targetPathPattern: 'prisma/openforge-drafts/{moduleCode}.model.prisma.md',
  },
  {
    id: 'prisma.migration-hint',
    artifactKind: 'prisma.migration-hint',
    description: 'Prisma migration hint for manual review.',
    targetPathPattern: 'prisma/openforge-drafts/{moduleCode}.migration-hint.md',
  },
  {
    id: 'patch.app-module',
    artifactKind: 'patch.app-module',
    description: 'Patch plan for API app module registration.',
    targetPathPattern: 'openforge-patches/app-module.patch.md',
    patchOnly: true,
  },
  {
    id: 'patch.admin-route',
    artifactKind: 'patch.admin-route',
    description: 'Patch plan for Admin route registration.',
    targetPathPattern: 'openforge-patches/admin-route.patch.md',
    patchOnly: true,
  },
  {
    id: 'patch.admin-access',
    artifactKind: 'patch.admin-access',
    description: 'Patch plan for Admin access registration.',
    targetPathPattern: 'openforge-patches/admin-access.patch.md',
    patchOnly: true,
  },
  {
    id: 'patch.module-registry',
    artifactKind: 'patch.module-registry',
    description: 'Patch plan for module registry review.',
    targetPathPattern: 'openforge-patches/module-registry.patch.md',
    patchOnly: true,
  },
  {
    id: 'patch.sdk-index',
    artifactKind: 'patch.sdk-index',
    description: 'Patch plan for SDK root index review.',
    targetPathPattern: 'openforge-patches/sdk-index.patch.md',
    patchOnly: true,
  },
];

export const OPENFORGE_DEFAULT_TEMPLATE_PACK: OpenForgeTemplatePack = {
  id: OPENFORGE_V1_TEMPLATE_VERSION,
  name: 'OpenForge default NestJS + Umi template pack',
  version: OPENFORGE_V1_TEMPLATE_VERSION,
  supportedArtifactKinds: TEMPLATE_SEEDS.map((seed) => seed.artifactKind),
  templates: TEMPLATE_SEEDS.map((seed) => ({
    id: seed.id,
    artifactKind: seed.artifactKind,
    description: seed.description,
    targetPathPattern: seed.targetPathPattern,
    patchOnly: seed.patchOnly ?? false,
  })),
};
