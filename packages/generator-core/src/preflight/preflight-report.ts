import {
  OPENFORGE_TEMPLATE_VERSION,
  type OpenForgePreflightReport,
} from '@opencore/contracts';
import {
  OPENFORGE_DETERMINISTIC_TIMESTAMP,
  OPENFORGE_SAFETY_POLICY,
} from '../planner/generate-plan';
import { readOpenApiSnapshot } from '../readers/openapi-reader';
import { readModuleRegistrySnapshot } from '../readers/registry-reader';
import { loadManualSchema } from '../readers/schema-loader';
import { validateOpenForgeManualSchema } from '../validators/manual-schema-validator';

export type BuildPreflightReportOptions = {
  schemaPath: string;
  repoRoot?: string;
  sourceRoot?: string;
};

export function buildPreflightReport(
  options: BuildPreflightReportOptions,
): OpenForgePreflightReport {
  const sourceRoot = options.sourceRoot ?? options.repoRoot ?? process.cwd();
  const registry = readModuleRegistrySnapshot();
  const openApi = readOpenApiSnapshot(undefined, sourceRoot);
  const loadedSchema = loadManualSchema(options.schemaPath, sourceRoot);
  const validation = validateOpenForgeManualSchema(
    loadedSchema.schema,
    registry,
    openApi,
  );

  return {
    templateVersion: OPENFORGE_TEMPLATE_VERSION,
    generatedAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
    schemaPath: options.schemaPath,
    moduleCode: loadedSchema.schema.moduleCode,
    valid: registry.validation.valid && validation.valid,
    noWrite: true,
    registry: {
      valid: registry.validation.valid,
      moduleCount: registry.modules.length,
      permissionCount: registry.permissions.length,
      menuCount: registry.menus.length,
      issueCount: registry.validation.issues.length,
    },
    openApi: {
      snapshotPath: openApi.snapshotPath,
      pathCount: openApi.paths.length,
      operationCount: openApi.operations.length,
      tagCount: openApi.tags.length,
      schemaCount: openApi.schemas.length,
    },
    safety: OPENFORGE_SAFETY_POLICY,
    warnings: validation.warnings,
    errors: validation.errors.map((issue) => ({
      ...issue,
      severity: 'error',
    })),
  };
}
