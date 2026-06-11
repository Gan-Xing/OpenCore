import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  OPENFORGE_ARTIFACT_KINDS,
  OPENFORGE_CONTRACT_PROTOCOL,
  OPENFORGE_V1_TEMPLATE_VERSION,
  type OpenForgeArtifactKind,
  type OpenForgeValidationIssue,
} from '@opencore/contracts';
import {
  DEFAULT_OPENFORGE_GENERATOR_CONFIG,
  loadOpenForgeGeneratorConfig,
  validateOpenForgeGeneratorConfig,
} from '../config/generator-config';
import { OPENFORGE_DETERMINISTIC_TIMESTAMP } from '../planner/generate-plan';
import { readOpenApiSnapshot } from '../readers/openapi-reader';
import { readModuleRegistrySnapshot } from '../readers/registry-reader';
import { loadManualSchema } from '../readers/schema-loader';
import { renderTemplatePack } from '../render/render-template-pack';
import { evaluatePathSafety } from '../safety/path-safety';
import { OPENFORGE_DEFAULT_TEMPLATE_PACK } from '../templates/default-template-pack';
import { validateOpenForgeManualSchema } from '../validators/manual-schema-validator';

export type OpenForgeDoctorCheckId =
  | 'workspace-root'
  | 'pnpm-workspace'
  | 'nx-project'
  | 'generator-core-project'
  | 'contracts-export'
  | 'module-registry-validation'
  | 'openapi-snapshot'
  | 'openapi-drift-command'
  | 'example-schemas'
  | 'template-packs'
  | 'protected-paths-config'
  | 'manifest-directory-status';

export type OpenForgeDoctorCheckStatus = 'fail' | 'pass' | 'warn';

export type OpenForgeDoctorCheck = {
  id: OpenForgeDoctorCheckId;
  label: string;
  status: OpenForgeDoctorCheckStatus;
  message: string;
  details?: Record<string, unknown>;
};

export type OpenForgeDoctorResult = {
  generatedAt: string;
  repoRoot: string;
  valid: boolean;
  checks: readonly OpenForgeDoctorCheck[];
  errors: readonly OpenForgeValidationIssue[];
};

export type RunOpenForgeDoctorOptions = {
  repoRoot?: string;
};

function createIssue(path: string, message: string): OpenForgeValidationIssue {
  return {
    severity: 'error',
    path,
    message,
  };
}

function check(
  id: OpenForgeDoctorCheckId,
  label: string,
  run: () => Omit<OpenForgeDoctorCheck, 'id' | 'label'>,
): OpenForgeDoctorCheck {
  try {
    return {
      id,
      label,
      ...run(),
    };
  } catch (error) {
    return {
      id,
      label,
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getScripts(packageJson: unknown): Record<string, string> {
  if (!isRecord(packageJson) || !isRecord(packageJson.scripts)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(packageJson.scripts).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function fail(message: string, details?: Record<string, unknown>) {
  return {
    status: 'fail' as const,
    message,
    details,
  };
}

function pass(message: string, details?: Record<string, unknown>) {
  return {
    status: 'pass' as const,
    message,
    details,
  };
}

export function runOpenForgeDoctor(
  options: RunOpenForgeDoctorOptions = {},
): OpenForgeDoctorResult {
  const repoRoot = resolve(process.cwd(), options.repoRoot ?? '.');
  const packageJsonPath = join(repoRoot, 'package.json');
  const pnpmWorkspacePath = join(repoRoot, 'pnpm-workspace.yaml');
  const nxProjectPath = join(repoRoot, 'tools/generator/project.json');
  const generatorCoreProjectPath = join(
    repoRoot,
    'packages/generator-core/project.json',
  );
  const openApiSnapshotPath = join(
    repoRoot,
    'packages/contracts/openapi/opencore-api.json',
  );
  const manifestDirectory = join(repoRoot, '.openforge/manifests');
  const packageJson = existsSync(packageJsonPath)
    ? readJsonFile(packageJsonPath)
    : {};
  const scripts = getScripts(packageJson);
  const registry = readModuleRegistrySnapshot();
  const openApi = readOpenApiSnapshot();
  const loadedConfig = loadOpenForgeGeneratorConfig();
  const exampleSchemaPaths = [
    'tools/generator/examples/core.dict.v1.schema.json',
    'tools/generator/examples/tool.openapi.v1.schema.json',
  ];

  const checks: OpenForgeDoctorCheck[] = [
    check('workspace-root', 'Workspace root', () => {
      if (!existsSync(packageJsonPath)) {
        return fail('package.json was not found at the workspace root.');
      }

      return pass('Workspace root is readable.', {
        packageJson: 'package.json',
        repoRoot,
      });
    }),
    check('pnpm-workspace', 'pnpm workspace', () => {
      if (!existsSync(pnpmWorkspacePath)) {
        return fail('pnpm-workspace.yaml was not found.');
      }

      const content = readFileSync(pnpmWorkspacePath, 'utf8');

      const includesPackages =
        content.includes("'packages/*'") || content.includes('packages/*');
      const includesTools =
        content.includes("'tools/*'") || content.includes('tools/*');

      if (!includesPackages || !includesTools) {
        return fail('pnpm workspace does not include packages/* and tools/*.');
      }

      return pass('pnpm workspace includes packages/* and tools/*.', {
        path: 'pnpm-workspace.yaml',
      });
    }),
    check('nx-project', 'Nx project', () => {
      if (!existsSync(nxProjectPath)) {
        return fail('OpenForge Nx project file was not found.');
      }

      const projectJson = readJsonFile(nxProjectPath);
      const targets =
        isRecord(projectJson) && isRecord(projectJson.targets)
          ? Object.keys(projectJson.targets).sort()
          : [];

      if (!isRecord(projectJson) || projectJson.name !== 'openforge') {
        return fail('OpenForge Nx project name is invalid.');
      }

      for (const target of ['build', 'lint', 'test', 'typecheck']) {
        if (!targets.includes(target)) {
          return fail(`OpenForge Nx project is missing ${target} target.`, {
            targets,
          });
        }
      }

      return pass('OpenForge Nx project is configured.', { targets });
    }),
    check('generator-core-project', 'Generator core Nx project', () => {
      if (!existsSync(generatorCoreProjectPath)) {
        return fail('Generator core Nx project file was not found.');
      }

      const projectJson = readJsonFile(generatorCoreProjectPath);
      const targets =
        isRecord(projectJson) && isRecord(projectJson.targets)
          ? Object.keys(projectJson.targets).sort()
          : [];

      if (!isRecord(projectJson) || projectJson.name !== 'generator-core') {
        return fail('Generator core Nx project name is invalid.');
      }

      for (const target of ['build', 'lint', 'test', 'typecheck']) {
        if (!targets.includes(target)) {
          return fail(
            `Generator core Nx project is missing ${target} target.`,
            {
              targets,
            },
          );
        }
      }

      return pass('Generator core Nx project is configured.', { targets });
    }),
    check('contracts-export', 'Contracts export', () => {
      const requiredKinds = [
        'api.controller',
        'admin.proTablePage',
        'sdk.client',
        'docs.patch-review',
        'patch.sdk-index',
      ];
      const missingKinds = requiredKinds.filter(
        (kind) =>
          !OPENFORGE_ARTIFACT_KINDS.includes(kind as OpenForgeArtifactKind),
      );

      if (missingKinds.length > 0) {
        return fail('OpenForge artifact kinds are missing from contracts.', {
          missingKinds,
        });
      }

      return pass('Contracts export OpenForge V1 protocols.', {
        stage: OPENFORGE_CONTRACT_PROTOCOL.stage,
        noWrite: OPENFORGE_CONTRACT_PROTOCOL.noWrite,
        artifactKinds: OPENFORGE_ARTIFACT_KINDS.length,
      });
    }),
    check('module-registry-validation', 'Module registry validation', () => {
      if (!registry.validation.valid) {
        return fail('Module registry validation failed.', {
          issues: registry.validation.issues,
        });
      }

      return pass('Module registry validates.', {
        modules: registry.modules.length,
        permissions: registry.permissions.length,
        menus: registry.menus.length,
      });
    }),
    check('openapi-snapshot', 'OpenAPI snapshot', () => {
      if (!existsSync(openApiSnapshotPath)) {
        return fail('OpenAPI snapshot file was not found.');
      }

      if (openApi.paths.length === 0) {
        return fail('OpenAPI snapshot has no paths.');
      }

      return pass('OpenAPI snapshot is readable.', {
        snapshotPath: 'packages/contracts/openapi/opencore-api.json',
        paths: openApi.paths.length,
        operations: openApi.operations.length,
        schemas: openApi.schemas.length,
      });
    }),
    check('openapi-drift-command', 'OpenAPI drift command', () => {
      if (!scripts['openapi:check']) {
        return fail('package.json is missing the openapi:check script.');
      }

      return pass('OpenAPI drift command exists.', {
        script: 'openapi:check',
      });
    }),
    check('example-schemas', 'Example schemas', () => {
      const invalidSchemas: Record<
        string,
        readonly OpenForgeValidationIssue[]
      > = {};

      for (const schemaPath of exampleSchemaPaths) {
        const loadedSchema = loadManualSchema(schemaPath);
        const validation = validateOpenForgeManualSchema(
          loadedSchema.schema,
          registry,
          openApi,
          {
            strictOpenApiTags: false,
            strictPermissionCodes: true,
          },
        );

        if (!validation.valid) {
          invalidSchemas[schemaPath] = validation.errors;
        }
      }

      if (Object.keys(invalidSchemas).length > 0) {
        return fail('One or more valid example schemas failed validation.', {
          invalidSchemas,
        });
      }

      return pass('Valid example schemas pass validation.', {
        schemas: exampleSchemaPaths,
      });
    }),
    check('template-packs', 'Template packs', () => {
      const templateKinds = new Set(
        OPENFORGE_DEFAULT_TEMPLATE_PACK.templates.map(
          (template) => template.artifactKind,
        ),
      );
      const requiredKinds: readonly OpenForgeArtifactKind[] = [
        'api.controller',
        'api.dto',
        'api.module',
        'api.repository',
        'api.service',
        'api.spec',
        'admin.proTablePage',
        'admin.modalForm',
        'admin.drawerForm',
        'admin.descriptions',
        'admin.exportButton',
        'admin.smokeTest',
        'sdk.client',
        'sdk.generated-index',
        'sdk.spec',
        'sdk.types',
        'docs.module-doc',
        'docs.api-doc',
        'docs.admin-doc',
        'docs.runbook',
        'docs.patch-review',
        'patch.sdk-index',
      ];
      const missingKinds = requiredKinds.filter(
        (artifactKind) => !templateKinds.has(artifactKind),
      );
      const renderedFiles = renderTemplatePack(
        loadManualSchema(exampleSchemaPaths[0]).schema,
        loadedConfig.config,
      );
      const unsafeRenderedPaths = renderedFiles
        .filter((file) => evaluatePathSafety(file.targetPath).blocked)
        .map((file) => file.targetPath);

      if (missingKinds.length > 0) {
        return fail(
          'Default template pack is missing allowed artifact kinds.',
          {
            missingKinds,
          },
        );
      }

      if (unsafeRenderedPaths.length > 0) {
        return fail('Default template pack renders unsafe target paths.', {
          unsafeRenderedPaths,
        });
      }

      return pass('Default template pack renders safely.', {
        templatePack: OPENFORGE_DEFAULT_TEMPLATE_PACK.id,
        templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
        templates: OPENFORGE_DEFAULT_TEMPLATE_PACK.templates.length,
        renderedFiles: renderedFiles.length,
      });
    }),
    check('protected-paths-config', 'Protected paths config', () => {
      const configErrors = validateOpenForgeGeneratorConfig(
        DEFAULT_OPENFORGE_GENERATOR_CONFIG,
      );
      const protectedPathResults = [
        '.env',
        '.env.opencore.local',
        'prisma/schema.prisma',
        'prisma/migrations/20260610/generated.sql',
      ].map((path) => ({
        path,
        result: evaluatePathSafety(path),
      }));
      const unsafeConfig = protectedPathResults.filter(
        (entry) => !entry.result.blocked || !entry.result.protected,
      );

      if (configErrors.length > 0) {
        return fail('Default OpenForge generator config is invalid.', {
          configErrors,
        });
      }

      if (unsafeConfig.length > 0) {
        return fail('Protected path safety config is invalid.', {
          unsafeConfig,
        });
      }

      return pass('Protected paths are blocked.', {
        protectedPaths: DEFAULT_OPENFORGE_GENERATOR_CONFIG.protectedPaths,
      });
    }),
    check('manifest-directory-status', 'Manifest directory status', () => {
      if (!existsSync(manifestDirectory)) {
        return pass('Manifest directory is absent; no apply manifests found.', {
          path: '.openforge/manifests',
          exists: false,
        });
      }

      const manifests = readdirSync(manifestDirectory).filter((entry) =>
        entry.endsWith('.json'),
      );

      return pass('Manifest directory is readable.', {
        path: '.openforge/manifests',
        exists: true,
        manifests: manifests.length,
      });
    }),
  ];
  const errors = checks
    .filter((doctorCheck) => doctorCheck.status === 'fail')
    .map((doctorCheck) => createIssue(doctorCheck.id, doctorCheck.message));

  return {
    generatedAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
    repoRoot,
    valid: errors.length === 0,
    checks,
    errors,
  };
}
