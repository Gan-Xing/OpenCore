import { isAbsolute, normalize } from 'node:path';
import {
  isPermissionCode,
  parsePermissionCode,
  type ModuleDefinition,
  type OpenForgeManualSchema,
  type OpenForgeValidationIssue,
} from '@opencore/contracts';
import type { OpenForgeOpenApiSnapshot } from '../readers/openapi-reader';
import type { OpenForgeRegistrySnapshot } from '../readers/registry-reader';

export type OpenForgeSchemaValidationOptions = {
  strictOpenApiTags?: boolean;
};

export type OpenForgeSchemaValidationResult = {
  valid: boolean;
  warnings: OpenForgeValidationIssue[];
  errors: OpenForgeValidationIssue[];
  moduleDefinition?: ModuleDefinition;
};

const FORBIDDEN_MODULE_PREFIXES = [
  'optional.tenant',
  'industry.crm',
  'industry.erp',
  'industry.mes',
  'industry.wms',
  'industry.mall',
  'integration.pay',
  'ai.',
] as const;

function createIssue(path: string, message: string): OpenForgeValidationIssue {
  return {
    severity: 'error',
    path,
    message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasForbiddenModulePrefix(moduleCode: string): boolean {
  return FORBIDDEN_MODULE_PREFIXES.some((prefix) =>
    moduleCode.startsWith(prefix),
  );
}

function getModuleResource(moduleDefinition: ModuleDefinition): string {
  return moduleDefinition.code.split('.')[1] ?? '';
}

function validateRepoRelativePath(
  pathValue: string,
): OpenForgeValidationIssue[] {
  const issues: OpenForgeValidationIssue[] = [];
  const normalizedPath = normalize(pathValue).replace(/\\/g, '/');

  if (isAbsolute(pathValue)) {
    issues.push(createIssue(pathValue, 'Target path must be repo-relative.'));
  }

  if (normalizedPath === '..' || normalizedPath.startsWith('../')) {
    issues.push(
      createIssue(pathValue, 'Target path must not traverse outside the repo.'),
    );
  }

  return issues;
}

export function validateOpenForgeManualSchema(
  schema: OpenForgeManualSchema,
  registry: OpenForgeRegistrySnapshot,
  openApi: OpenForgeOpenApiSnapshot,
  options: OpenForgeSchemaValidationOptions = {},
): OpenForgeSchemaValidationResult {
  const errors: OpenForgeValidationIssue[] = [];

  if (!isRecord(schema)) {
    return {
      valid: false,
      warnings: [],
      errors: [createIssue('schema', 'Manual schema must be a JSON object.')],
    };
  }

  const moduleDefinition = registry.modules.find(
    (candidate) => candidate.code === schema.moduleCode,
  );

  if (!moduleDefinition) {
    errors.push(
      createIssue(
        'moduleCode',
        `Module ${schema.moduleCode} is not registered in module registry.`,
      ),
    );
  }

  if (
    typeof schema.moduleCode === 'string' &&
    hasForbiddenModulePrefix(schema.moduleCode)
  ) {
    errors.push(
      createIssue(
        'moduleCode',
        'P4/P5 modules are forbidden in S9 OpenForge MVP inputs.',
      ),
    );
  }

  if (!schema.resource || typeof schema.resource !== 'string') {
    errors.push(createIssue('resource', 'Schema resource is required.'));
  }

  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    errors.push(createIssue('fields', 'Manual schema must define fields.'));
  }

  if (!Array.isArray(schema.permissions) || schema.permissions.length === 0) {
    errors.push(
      createIssue('permissions', 'Manual schema must define permissions.'),
    );
  }

  const expectedLayer = moduleDefinition?.layer;
  const expectedResource = moduleDefinition
    ? getModuleResource(moduleDefinition)
    : schema.resource;
  const registryPermissions = new Set(
    registry.permissions.map((permission) => permission.code),
  );

  for (const permission of schema.permissions ?? []) {
    const parsedPermission = parsePermissionCode(permission);

    if (!isPermissionCode(permission) || !parsedPermission) {
      errors.push(
        createIssue(
          `permissions.${permission}`,
          'Permission must match <module-layer>:<resource>:<action>.',
        ),
      );
      continue;
    }

    if (expectedLayer && parsedPermission.layer !== expectedLayer) {
      errors.push(
        createIssue(
          `permissions.${permission}`,
          `Permission layer must be ${expectedLayer}.`,
        ),
      );
    }

    if (parsedPermission.resource !== expectedResource) {
      errors.push(
        createIssue(
          `permissions.${permission}`,
          `Permission resource must be ${expectedResource}.`,
        ),
      );
    }

    if (!registryPermissions.has(permission)) {
      errors.push(
        createIssue(
          `permissions.${permission}`,
          'Permission must be registered in module registry.',
        ),
      );
    }
  }

  const schemaTags = schema.openapi?.tags ?? [];
  const registryTags = new Set(moduleDefinition?.apiTags ?? []);
  const openApiTags = new Set(openApi.tags);

  for (const tag of schemaTags) {
    if (!registryTags.has(tag)) {
      errors.push(
        createIssue(
          `openapi.tags.${tag}`,
          'OpenAPI tag must match the module registry apiTags.',
        ),
      );
    }

    if (options.strictOpenApiTags && !openApiTags.has(tag)) {
      errors.push(
        createIssue(
          `openapi.tags.${tag}`,
          'OpenAPI tag is missing from the snapshot in strict mode.',
        ),
      );
    }
  }

  if (schema.prisma?.writeSchema) {
    errors.push(
      createIssue(
        'prisma.writeSchema',
        'S9 OpenForge MVP must not request Prisma schema writes.',
      ),
    );
  }

  for (const targetPath of schema.admin?.targetPaths ?? []) {
    errors.push(...validateRepoRelativePath(targetPath));
  }

  return {
    valid: errors.length === 0,
    warnings: [],
    errors,
    moduleDefinition,
  };
}
