import { parseOpenForgeGeneratedMarker } from '@opencore/contracts';
import { loadOpenForgeGeneratorConfig } from '../config/generator-config';
import { loadManualSchema } from '../readers/schema-loader';
import { evaluatePathSafety } from '../safety/path-safety';
import { findOpenForgeVirtualFile } from '../vfs/virtual-file-system';
import { renderTemplatePack } from './render-template-pack';

describe('OpenForge default template pack renderer', () => {
  it('renders deterministic virtual files for every default template kind', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config);

    expect(
      files
        .map((file) => ({
          kind: file.artifactKind,
          targetPath: file.targetPath,
          patchOnly: file.isPatchOnly,
          format: file.content.format,
        }))
        .sort((left, right) => left.kind.localeCompare(right.kind)),
    ).toMatchInlineSnapshot(`
[
  {
    "format": "typescript",
    "kind": "admin.descriptions",
    "patchOnly": false,
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictDetail.tsx",
  },
  {
    "format": "typescript",
    "kind": "admin.drawerForm",
    "patchOnly": false,
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictDrawer.tsx",
  },
  {
    "format": "typescript",
    "kind": "admin.exportButton",
    "patchOnly": false,
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictExportButton.tsx",
  },
  {
    "format": "typescript",
    "kind": "admin.modalForm",
    "patchOnly": false,
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictForm.tsx",
  },
  {
    "format": "typescript",
    "kind": "admin.proTablePage",
    "patchOnly": false,
    "targetPath": "apps/admin/src/pages/Generated/Dict/index.tsx",
  },
  {
    "format": "typescript",
    "kind": "admin.smokeTest",
    "patchOnly": false,
    "targetPath": "apps/admin/src/pages/Generated/Dict/Dict.smoke.spec.ts",
  },
  {
    "format": "typescript",
    "kind": "api.controller",
    "patchOnly": false,
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.controller.ts",
  },
  {
    "format": "typescript",
    "kind": "api.dto",
    "patchOnly": false,
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.dto.ts",
  },
  {
    "format": "typescript",
    "kind": "api.module",
    "patchOnly": false,
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.module.ts",
  },
  {
    "format": "typescript",
    "kind": "api.repository",
    "patchOnly": false,
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.repository.ts",
  },
  {
    "format": "typescript",
    "kind": "api.service",
    "patchOnly": false,
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.service.ts",
  },
  {
    "format": "typescript",
    "kind": "api.spec",
    "patchOnly": false,
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.spec.ts",
  },
  {
    "format": "markdown",
    "kind": "docs.admin-doc",
    "patchOnly": false,
    "targetPath": "docs/generated/openforge/core.dict-admin.md",
  },
  {
    "format": "markdown",
    "kind": "docs.api-doc",
    "patchOnly": false,
    "targetPath": "docs/generated/openforge/core.dict-api.md",
  },
  {
    "format": "markdown",
    "kind": "docs.module-doc",
    "patchOnly": false,
    "targetPath": "docs/generated/openforge/core.dict.md",
  },
  {
    "format": "markdown",
    "kind": "docs.runbook",
    "patchOnly": false,
    "targetPath": "docs/generated/openforge/core.dict-runbook.md",
  },
  {
    "format": "markdown",
    "kind": "patch.admin-access",
    "patchOnly": true,
    "targetPath": "openforge-patches/admin-access.patch.md",
  },
  {
    "format": "markdown",
    "kind": "patch.admin-route",
    "patchOnly": true,
    "targetPath": "openforge-patches/admin-route.patch.md",
  },
  {
    "format": "markdown",
    "kind": "patch.app-module",
    "patchOnly": true,
    "targetPath": "openforge-patches/app-module.patch.md",
  },
  {
    "format": "markdown",
    "kind": "patch.module-registry",
    "patchOnly": true,
    "targetPath": "openforge-patches/module-registry.patch.md",
  },
  {
    "format": "markdown",
    "kind": "prisma.migration-hint",
    "patchOnly": false,
    "targetPath": "prisma/openforge-drafts/core.dict.migration-hint.md",
  },
  {
    "format": "markdown",
    "kind": "prisma.model-draft",
    "patchOnly": false,
    "targetPath": "prisma/openforge-drafts/core.dict.model.prisma.md",
  },
  {
    "format": "typescript",
    "kind": "sdk.client",
    "patchOnly": false,
    "targetPath": "packages/sdk/src/generated/dict-client.ts",
  },
  {
    "format": "typescript",
    "kind": "sdk.generated-index",
    "patchOnly": false,
    "targetPath": "packages/sdk/src/generated/index.ts",
  },
  {
    "format": "typescript",
    "kind": "sdk.spec",
    "patchOnly": false,
    "targetPath": "packages/sdk/src/generated/dict-client.spec.ts",
  },
  {
    "format": "typescript",
    "kind": "sdk.types",
    "patchOnly": false,
    "targetPath": "packages/sdk/src/generated/dict-types.ts",
  },
]
`);

    for (const file of files) {
      expect(evaluatePathSafety(file.targetPath)).toMatchObject({
        blocked: false,
      });
      expect(
        parseOpenForgeGeneratedMarker(String(file.content.value)),
      ).toMatchObject({
        moduleCode: 'core.dict',
        artifactKind: file.artifactKind,
        templateVersion: 'openforge-default-nest-umi-v1',
      });
    }
  });

  it('keeps patch-only files as markdown patch plans', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config);
    const patch = findOpenForgeVirtualFile(
      files,
      'openforge-patches/app-module.patch.md',
    );

    expect(patch).toMatchObject({
      artifactKind: 'patch.app-module',
      isPatchOnly: true,
      content: {
        format: 'markdown',
      },
    });
    expect(String(patch?.content.value)).toContain('Patch only: true');
  });
});
