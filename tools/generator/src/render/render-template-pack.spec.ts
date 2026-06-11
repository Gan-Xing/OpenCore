import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseOpenForgeGeneratedMarker } from '@opencore/contracts';
import ts = require('typescript');
import { loadOpenForgeGeneratorConfig } from '../config/generator-config';
import { loadManualSchema } from '../readers/schema-loader';
import { evaluatePathSafety } from '../safety/path-safety';
import { findOpenForgeVirtualFile } from '../vfs/virtual-file-system';
import { renderTemplatePack } from './render-template-pack';

function writeTempFile(root: string, path: string, content: string): void {
  const absolutePath = join(root, path);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

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
    "kind": "docs.patch-review",
    "patchOnly": false,
    "targetPath": "docs/generated/openforge/core.dict-patch-review.md",
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
    "kind": "patch.sdk-index",
    "patchOnly": true,
    "targetPath": "openforge-patches/sdk-index.patch.md",
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
    expect(String(patch?.content.value)).toContain(
      'Target human file: `apps/api/src/app/app.module.ts`',
    );
    expect(String(patch?.content.value)).toContain(
      'OpenForge does not modify `app.module.ts` directly.',
    );
  });

  it('renders API generator pack skeletons with permissions and no Prisma access', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config);
    const apiFiles = files
      .filter((file) => file.artifactKind.startsWith('api.'))
      .sort((left, right) =>
        left.artifactKind.localeCompare(right.artifactKind),
      );

    expect(
      apiFiles.map((file) => {
        const content = String(file.content.value);

        return {
          kind: file.artifactKind,
          targetPath: file.targetPath,
          exports: [
            ...content.matchAll(/export (?:class|const|type) ([A-Za-z0-9_]+)/g),
          ].map((match) => match[1]),
          checks: {
            apiTags: content.includes('@ApiTags('),
            requirePermission: content.includes('@RequirePermission('),
            swaggerDecorators: content.includes('@ApiProperty'),
            repositoryPlaceholder: content.includes(
              'OpenForge generated repository placeholder',
            ),
            noPrisma: !content.includes('Prisma'),
          },
        };
      }),
    ).toMatchInlineSnapshot(`
[
  {
    "checks": {
      "apiTags": true,
      "noPrisma": true,
      "repositoryPlaceholder": false,
      "requirePermission": true,
      "swaggerDecorators": false,
    },
    "exports": [
      "DictController",
    ],
    "kind": "api.controller",
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.controller.ts",
  },
  {
    "checks": {
      "apiTags": false,
      "noPrisma": true,
      "repositoryPlaceholder": false,
      "requirePermission": false,
      "swaggerDecorators": true,
    },
    "exports": [
      "DictDto",
      "CreateDictDto",
      "UpdateDictDto",
      "DictQueryDto",
      "DictListResponseDto",
      "DictDeleteResultDto",
      "DictExportRequestDto",
    ],
    "kind": "api.dto",
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.dto.ts",
  },
  {
    "checks": {
      "apiTags": false,
      "noPrisma": true,
      "repositoryPlaceholder": false,
      "requirePermission": false,
      "swaggerDecorators": false,
    },
    "exports": [
      "DictModule",
    ],
    "kind": "api.module",
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.module.ts",
  },
  {
    "checks": {
      "apiTags": false,
      "noPrisma": true,
      "repositoryPlaceholder": true,
      "requirePermission": false,
      "swaggerDecorators": false,
    },
    "exports": [
      "DICT_REPOSITORY",
      "DictIdentity",
      "DictRepository",
      "GeneratedDictRepository",
    ],
    "kind": "api.repository",
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.repository.ts",
  },
  {
    "checks": {
      "apiTags": false,
      "noPrisma": true,
      "repositoryPlaceholder": false,
      "requirePermission": false,
      "swaggerDecorators": false,
    },
    "exports": [
      "DictService",
    ],
    "kind": "api.service",
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.service.ts",
  },
  {
    "checks": {
      "apiTags": false,
      "noPrisma": true,
      "repositoryPlaceholder": false,
      "requirePermission": false,
      "swaggerDecorators": false,
    },
    "exports": [],
    "kind": "api.spec",
    "targetPath": "apps/api/src/modules/generated/core/dict/dict.spec.ts",
  },
]
`);

    expect(String(apiFiles[0].content.value)).toContain(
      "@RequirePermission('core:dict:read')",
    );
    expect(String(apiFiles[0].content.value)).toContain(
      "@RequirePermission('core:dict:export')",
    );
    expect(
      String(
        findOpenForgeVirtualFile(files, 'openforge-patches/app-module.patch.md')
          ?.content.value,
      ),
    ).toContain('Add `DictModule` to the NestJS `imports` array');
  });

  it('typechecks generated API TypeScript skeletons in a temp project', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config).filter((file) =>
      file.artifactKind.startsWith('api.'),
    );
    const tempRoot = mkdtempSync(join(tmpdir(), 'openforge-api-typecheck-'));

    try {
      for (const file of files) {
        writeTempFile(tempRoot, file.targetPath, String(file.content.value));
      }

      writeTempFile(
        tempRoot,
        'apps/api/src/modules/core/rbac/permissions.decorator.ts',
        [
          'export function RequirePermission(...permissionCodes: string[]): MethodDecorator {',
          '  void permissionCodes;',
          '  return () => undefined;',
          '}',
          '',
        ].join('\n'),
      );
      writeTempFile(
        tempRoot,
        'stubs/nestjs-common.ts',
        [
          'export function Body(): ParameterDecorator { return () => undefined; }',
          'export function Controller(_path?: string): ClassDecorator { void _path; return () => undefined; }',
          'export function Delete(_path?: string): MethodDecorator { void _path; return () => undefined; }',
          'export function Get(_path?: string): MethodDecorator { void _path; return () => undefined; }',
          'export function Inject(_token?: unknown): ParameterDecorator { void _token; return () => undefined; }',
          'export function Injectable(): ClassDecorator { return () => undefined; }',
          'export function Module(_metadata?: unknown): ClassDecorator { void _metadata; return () => undefined; }',
          'export function Param(_name?: string): ParameterDecorator { void _name; return () => undefined; }',
          'export function Patch(_path?: string): MethodDecorator { void _path; return () => undefined; }',
          'export function Post(_path?: string): MethodDecorator { void _path; return () => undefined; }',
          'export function Query(): ParameterDecorator { return () => undefined; }',
          '',
        ].join('\n'),
      );
      writeTempFile(
        tempRoot,
        'stubs/nestjs-swagger.ts',
        [
          'export function ApiBody(_options?: unknown): MethodDecorator { void _options; return () => undefined; }',
          'export function ApiOkResponse(_options?: unknown): MethodDecorator { void _options; return () => undefined; }',
          'export function ApiOperation(_options?: unknown): MethodDecorator { void _options; return () => undefined; }',
          'export function ApiParam(_options?: unknown): MethodDecorator { void _options; return () => undefined; }',
          'export function ApiProperty(_options?: unknown): PropertyDecorator { void _options; return () => undefined; }',
          'export function ApiPropertyOptional(_options?: unknown): PropertyDecorator { void _options; return () => undefined; }',
          'export function ApiTags(...tags: string[]): ClassDecorator { void tags; return () => undefined; }',
          '',
        ].join('\n'),
      );
      writeTempFile(
        tempRoot,
        'stubs/jest-globals.d.ts',
        [
          'declare function describe(name: string, fn: () => void): void;',
          'declare function it(name: string, fn: () => void): void;',
          'declare function expect(value: unknown): {',
          '  toBe(value: unknown): void;',
          '  toBeDefined(): void;',
          '  toBeInstanceOf(value: unknown): void;',
          '  toContain(value: unknown): void;',
          '  rejects: {',
          '    toThrow(value: string): Promise<void>;',
          '  };',
          '};',
          '',
        ].join('\n'),
      );

      const rootNames = [
        ...files.map((file) => join(tempRoot, file.targetPath)),
        join(tempRoot, 'stubs/jest-globals.d.ts'),
      ];
      const program = ts.createProgram({
        rootNames,
        options: {
          baseUrl: tempRoot,
          experimentalDecorators: true,
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          noEmit: true,
          paths: {
            '@nestjs/common': ['stubs/nestjs-common.ts'],
            '@nestjs/swagger': ['stubs/nestjs-swagger.ts'],
          },
          skipLibCheck: true,
          strict: true,
          target: ts.ScriptTarget.ES2022,
        },
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);

      expect(
        diagnostics.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ),
      ).toEqual([]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it('renders Admin generator pack skeletons with permission-aware operations', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config);
    const adminFiles = files
      .filter((file) => file.artifactKind.startsWith('admin.'))
      .sort((left, right) =>
        left.artifactKind.localeCompare(right.artifactKind),
      );

    expect(
      adminFiles.map((file) => {
        const content = String(file.content.value);

        return {
          kind: file.artifactKind,
          targetPath: file.targetPath,
          checks: {
            proTable: content.includes('ProTable'),
            modalForm: content.includes('ModalForm'),
            drawerForm: content.includes('DrawerForm'),
            sharedDetailDrawer: content.includes('ReadOnlyDetailDrawer'),
            sharedExportButton: content.includes('CurrentPageExportButton'),
            currentPageFilters: content.includes('useCurrentPageFilters'),
            filteredDataSource: content.includes('dataSource={filteredRows}'),
            filteredExportRows: content.includes('rows={filteredRows}'),
            permissionMap: content.includes('generatedDictPermissions'),
            permissionAwareButtons: content.includes(
              'canUseGeneratedDictAction',
            ),
            sdkPlaceholder: content.includes('generatedDictClient'),
            loadingErrorEmpty:
              content.includes('Result') && content.includes('Empty'),
          },
        };
      }),
    ).toMatchInlineSnapshot(`
[
  {
    "checks": {
      "currentPageFilters": false,
      "drawerForm": false,
      "filteredDataSource": false,
      "filteredExportRows": false,
      "loadingErrorEmpty": false,
      "modalForm": false,
      "permissionAwareButtons": false,
      "permissionMap": false,
      "proTable": false,
      "sdkPlaceholder": false,
      "sharedDetailDrawer": true,
      "sharedExportButton": false,
    },
    "kind": "admin.descriptions",
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictDetail.tsx",
  },
  {
    "checks": {
      "currentPageFilters": false,
      "drawerForm": true,
      "filteredDataSource": false,
      "filteredExportRows": false,
      "loadingErrorEmpty": false,
      "modalForm": false,
      "permissionAwareButtons": false,
      "permissionMap": false,
      "proTable": false,
      "sdkPlaceholder": false,
      "sharedDetailDrawer": false,
      "sharedExportButton": false,
    },
    "kind": "admin.drawerForm",
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictDrawer.tsx",
  },
  {
    "checks": {
      "currentPageFilters": false,
      "drawerForm": false,
      "filteredDataSource": false,
      "filteredExportRows": false,
      "loadingErrorEmpty": false,
      "modalForm": false,
      "permissionAwareButtons": false,
      "permissionMap": false,
      "proTable": false,
      "sdkPlaceholder": false,
      "sharedDetailDrawer": false,
      "sharedExportButton": true,
    },
    "kind": "admin.exportButton",
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictExportButton.tsx",
  },
  {
    "checks": {
      "currentPageFilters": false,
      "drawerForm": false,
      "filteredDataSource": false,
      "filteredExportRows": false,
      "loadingErrorEmpty": false,
      "modalForm": true,
      "permissionAwareButtons": false,
      "permissionMap": false,
      "proTable": false,
      "sdkPlaceholder": false,
      "sharedDetailDrawer": false,
      "sharedExportButton": false,
    },
    "kind": "admin.modalForm",
    "targetPath": "apps/admin/src/pages/Generated/Dict/components/DictForm.tsx",
  },
  {
    "checks": {
      "currentPageFilters": true,
      "drawerForm": false,
      "filteredDataSource": true,
      "filteredExportRows": true,
      "loadingErrorEmpty": true,
      "modalForm": false,
      "permissionAwareButtons": true,
      "permissionMap": true,
      "proTable": true,
      "sdkPlaceholder": true,
      "sharedDetailDrawer": false,
      "sharedExportButton": true,
    },
    "kind": "admin.proTablePage",
    "targetPath": "apps/admin/src/pages/Generated/Dict/index.tsx",
  },
  {
    "checks": {
      "currentPageFilters": false,
      "drawerForm": false,
      "filteredDataSource": false,
      "filteredExportRows": false,
      "loadingErrorEmpty": false,
      "modalForm": false,
      "permissionAwareButtons": true,
      "permissionMap": true,
      "proTable": false,
      "sdkPlaceholder": false,
      "sharedDetailDrawer": false,
      "sharedExportButton": false,
    },
    "kind": "admin.smokeTest",
    "targetPath": "apps/admin/src/pages/Generated/Dict/Dict.smoke.spec.ts",
  },
]
`);

    const page = findOpenForgeVirtualFile(
      files,
      'apps/admin/src/pages/Generated/Dict/index.tsx',
    );
    const routePatch = findOpenForgeVirtualFile(
      files,
      'openforge-patches/admin-route.patch.md',
    );
    const accessPatch = findOpenForgeVirtualFile(
      files,
      'openforge-patches/admin-access.patch.md',
    );
    const detail = findOpenForgeVirtualFile(
      files,
      'apps/admin/src/pages/Generated/Dict/components/DictDetail.tsx',
    );
    const exportButton = findOpenForgeVirtualFile(
      files,
      'apps/admin/src/pages/Generated/Dict/components/DictExportButton.tsx',
    );
    const pageContent = String(page?.content.value);
    const detailContent = String(detail?.content.value);
    const exportButtonContent = String(exportButton?.content.value);

    expect(pageContent).toContain("create: 'core:dict:create'");
    expect(pageContent).toContain("export: 'core:dict:export'");
    expect(pageContent).toContain('CurrentPageExportButton');
    expect(pageContent).toContain('CurrentPageExportColumn');
    expect(pageContent).toContain('useCurrentPageFilters');
    expect(pageContent).toContain('createCurrentPageFilterOptions');
    expect(pageContent).toContain('dataSource={filteredRows}');
    expect(pageContent).toContain('rows={filteredRows}');
    expect(pageContent).toContain("resource='dict'");
    expect(pageContent).toContain('search={false}');
    expect(pageContent).not.toContain("search={{ labelWidth: 'auto' }}");
    expect(detailContent).toContain('ReadOnlyDetailDrawer');
    expect(detailContent).toContain('DetailField');
    expect(detailContent).toContain('DetailJsonSection');
    expect(detailContent).not.toContain('ProDescriptions');
    expect(detailContent).not.toContain('String(record.');
    expect(exportButtonContent).toContain('CurrentPageExportButton');
    expect(exportButtonContent).toContain('CurrentPageExportColumn');
    expect(exportButtonContent).toContain(
      'generatedDictExportColumns: CurrentPageExportColumn<DictRecord>[]',
    );
    expect(exportButtonContent).not.toContain('onExport?.');
    expect(exportButtonContent).not.toContain("import { Button } from 'antd'");
    expect(String(routePatch?.content.value)).toContain(
      'Target human file: `apps/admin/.umirc.ts`',
    );
    expect(String(accessPatch?.content.value)).toContain(
      'Target human file: `apps/admin/src/access.ts`',
    );
  });

  it('renders generated Admin safety metadata for collaboration workflow and integration fields', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict-admin-safety.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config);
    const page = findOpenForgeVirtualFile(
      files,
      'apps/admin/src/pages/Generated/DictSafety/index.tsx',
    );
    const detail = findOpenForgeVirtualFile(
      files,
      'apps/admin/src/pages/Generated/DictSafety/components/DictSafetyDetail.tsx',
    );
    const exportButton = findOpenForgeVirtualFile(
      files,
      'apps/admin/src/pages/Generated/DictSafety/components/DictSafetyExportButton.tsx',
    );
    const pageContent = String(page?.content.value);
    const detailContent = String(detail?.content.value);
    const exportButtonContent = String(exportButton?.content.value);

    expect(pageContent).toContain('CurrentPageExportButton');
    expect(pageContent).toContain('useCurrentPageFilters');
    expect(pageContent).toContain('dataSource={filteredRows}');
    expect(pageContent).toContain('rows={filteredRows}');
    expect(pageContent).toContain("resource='dictSafety'");
    expect(pageContent).toContain("dataIndex: 'secretRef'");
    expect(pageContent).toContain("dataIndex: 'apiKey'");
    expect(pageContent).toContain("dataIndex: 'clientSecret'");
    expect(pageContent).toContain("dataIndex: 'authorization'");
    expect(pageContent).toContain("dataIndex: 'payload'");
    expect(pageContent).toContain("dataIndex: 'querySchema'");
    expect(pageContent).toContain('render: () => <Tag>[redacted]</Tag>');
    expect(pageContent).toContain(
      "const currentPageSearchFields: CurrentPageSearchField<DictSafetyRecord>[] = ['code', 'name', 'status'];",
    );
    expect(pageContent).not.toContain("'secretRef', 'apiKey', 'payload'");

    for (const fieldName of [
      'secretRef',
      'tokenId',
      'apiKey',
      'clientSecret',
      'authorization',
      'config',
      'payload',
      'querySchema',
      'body',
      'comment',
    ]) {
      expect(pageContent).toContain(
        `dataIndex: '${fieldName}',\n    sensitive: true`,
      );
    }

    expect(detailContent).toContain('ReadOnlyDetailDrawer');
    expect(detailContent).toContain('DetailField');
    expect(detailContent).not.toContain('ProDescriptions');
    expect(detailContent).not.toContain('String(record.secretRef)');
    expect(detailContent).toContain(
      "label: 'Secret Ref',\n    sensitive: true",
    );
    expect(detailContent).toContain(
      "label: 'Audit Payload',\n    sensitive: true",
    );
    expect(detailContent).toContain(
      "label: 'Report Query Schema',\n    sensitive: true",
    );
    expect(detailContent).toContain(
      "label: 'Message Body',\n    sensitive: true",
    );
    expect(detailContent).toContain(
      "label: 'Workflow Comment',\n    sensitive: true",
    );
    expect(exportButtonContent).toContain('CurrentPageExportButton');
    expect(exportButtonContent).toContain(
      'generatedDictSafetyExportColumns: CurrentPageExportColumn<DictSafetyRecord>[]',
    );
    expect(exportButtonContent).not.toContain('onExport?.');
  });

  it('transpiles generated Admin TSX skeletons', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config).filter((file) =>
      file.artifactKind.startsWith('admin.'),
    );
    const diagnostics = files.flatMap((file) => {
      const result = ts.transpileModule(String(file.content.value), {
        fileName: file.targetPath,
        reportDiagnostics: true,
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      });

      return result.diagnostics ?? [];
    });

    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([]);
  });

  it('renders SDK and Docs generator pack skeletons with patch-review metadata', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config);
    const sdkAndDocs = files
      .filter(
        (file) =>
          file.artifactKind.startsWith('sdk.') ||
          file.artifactKind.startsWith('docs.') ||
          file.artifactKind === 'patch.sdk-index',
      )
      .sort((left, right) =>
        left.artifactKind.localeCompare(right.artifactKind),
      );

    expect(
      sdkAndDocs.map((file) => {
        const content = String(file.content.value);

        return {
          kind: file.artifactKind,
          targetPath: file.targetPath,
          checks: {
            schemaHash: content.includes('schemaHash='),
            templateVersion: content.includes(
              'templateVersion=openforge-default-nest-umi-v1',
            ),
            sdkRequestWrapper: content.includes('SdkRequest'),
            sdkExports: content.includes("export * from './dict-client'"),
            runbookCommands: content.includes('pnpm openforge:apply'),
            sdkIndexPatch: content.includes("export * from './generated'"),
          },
        };
      }),
    ).toMatchInlineSnapshot(`
[
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "docs.admin-doc",
    "targetPath": "docs/generated/openforge/core.dict-admin.md",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "docs.api-doc",
    "targetPath": "docs/generated/openforge/core.dict-api.md",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "docs.module-doc",
    "targetPath": "docs/generated/openforge/core.dict.md",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "docs.patch-review",
    "targetPath": "docs/generated/openforge/core.dict-patch-review.md",
  },
  {
    "checks": {
      "runbookCommands": true,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "docs.runbook",
    "targetPath": "docs/generated/openforge/core.dict-runbook.md",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": true,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "patch.sdk-index",
    "targetPath": "openforge-patches/sdk-index.patch.md",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": true,
      "templateVersion": true,
    },
    "kind": "sdk.client",
    "targetPath": "packages/sdk/src/generated/dict-client.ts",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": true,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "sdk.generated-index",
    "targetPath": "packages/sdk/src/generated/index.ts",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": true,
      "templateVersion": true,
    },
    "kind": "sdk.spec",
    "targetPath": "packages/sdk/src/generated/dict-client.spec.ts",
  },
  {
    "checks": {
      "runbookCommands": false,
      "schemaHash": true,
      "sdkExports": false,
      "sdkIndexPatch": false,
      "sdkRequestWrapper": false,
      "templateVersion": true,
    },
    "kind": "sdk.types",
    "targetPath": "packages/sdk/src/generated/dict-types.ts",
  },
]
`);

    expect(
      String(
        findOpenForgeVirtualFile(
          files,
          'packages/sdk/src/generated/dict-client.ts',
        )?.content.value,
      ),
    ).toContain("request<DictListResponse>(withGeneratedQuery('/core/dicts'");
    expect(
      String(
        findOpenForgeVirtualFile(
          files,
          'docs/generated/openforge/core.dict-runbook.md',
        )?.content.value,
      ),
    ).toContain('Review SDK root index patch before re-exporting');
  });

  it('typechecks generated SDK TypeScript skeletons in a temp project', () => {
    const { schema } = loadManualSchema(
      'tools/generator/examples/core.dict.v1.schema.json',
    );
    const { config } = loadOpenForgeGeneratorConfig();
    const files = renderTemplatePack(schema, config).filter((file) =>
      file.artifactKind.startsWith('sdk.'),
    );
    const tempRoot = mkdtempSync(join(tmpdir(), 'openforge-sdk-typecheck-'));

    try {
      for (const file of files) {
        writeTempFile(tempRoot, file.targetPath, String(file.content.value));
      }

      writeTempFile(
        tempRoot,
        'packages/sdk/src/rbac-client.ts',
        [
          'export type SdkRequest = <T>(',
          '  path: `/${string}`,',
          '  options?: { method?: "DELETE" | "GET" | "PATCH" | "POST"; body?: unknown; token?: string },',
          ') => Promise<T>;',
          '',
        ].join('\n'),
      );
      writeTempFile(
        tempRoot,
        'stubs/jest-globals.d.ts',
        [
          'declare function describe(name: string, fn: () => void): void;',
          'declare function it(name: string, fn: () => Promise<void> | void): void;',
          'declare function expect(value: unknown): {',
          '  toEqual(value: unknown): void;',
          '};',
          '',
        ].join('\n'),
      );

      const rootNames = [
        ...files.map((file) => join(tempRoot, file.targetPath)),
        join(tempRoot, 'stubs/jest-globals.d.ts'),
      ];
      const program = ts.createProgram({
        rootNames,
        options: {
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: ts.ScriptTarget.ES2022,
        },
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);

      expect(
        diagnostics.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ),
      ).toEqual([]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});
