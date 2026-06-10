import { isAbsolute, normalize } from 'node:path';
import {
  isPermissionAction,
  isPermissionCode,
  parsePermissionCode,
  type ModuleDefinition,
  type OpenForgeFieldSchema,
  type OpenForgeManualSchema,
  type OpenForgeValidationIssue,
} from '@opencore/contracts';
import type { OpenForgeOpenApiSnapshot } from '../readers/openapi-reader';
import type { OpenForgeRegistrySnapshot } from '../readers/registry-reader';
import {
  getOpenForgeSchemaFieldNames,
  isOpenForgeFieldType,
  isOpenForgeSchemaV1,
  OPENFORGE_SCHEMA_V1_VERSION,
} from '../schema/schema-v1';

export type OpenForgeSchemaValidationOptions = {
  strictOpenApiTags?: boolean;
  strictPermissionCodes?: boolean;
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

function validateFieldSelection(
  pathPrefix: string,
  fields: readonly string[] | undefined,
  knownFieldNames: Set<string>,
): OpenForgeValidationIssue[] {
  const issues: OpenForgeValidationIssue[] = [];

  for (const field of fields ?? []) {
    if (!knownFieldNames.has(field)) {
      issues.push(
        createIssue(
          `${pathPrefix}.${field}`,
          `Field ${field} must be declared in schema.fields.`,
        ),
      );
    }
  }

  return issues;
}

function validateFieldSchema(
  field: OpenForgeFieldSchema,
  index: number,
  registry: OpenForgeRegistrySnapshot,
): OpenForgeValidationIssue[] {
  const issues: OpenForgeValidationIssue[] = [];
  const fieldPath = `fields.${index}`;

  if (!field.name || typeof field.name !== 'string') {
    issues.push(createIssue(`${fieldPath}.name`, 'Field name is required.'));
  }

  if (!field.title || typeof field.title !== 'string') {
    issues.push(createIssue(`${fieldPath}.title`, 'Field title is required.'));
  }

  if (!isOpenForgeFieldType(field.type)) {
    issues.push(
      createIssue(
        `${fieldPath}.type`,
        'Field type must be one of string, text, number, boolean, datetime, enum, json, relation, or file.',
      ),
    );
  }

  if (
    field.type === 'enum' &&
    (!Array.isArray(field.enumValues) || field.enumValues.length === 0)
  ) {
    issues.push(
      createIssue(
        `${fieldPath}.enumValues`,
        'Enum fields must define enumValues.',
      ),
    );
  }

  if (field.type === 'relation') {
    if (!field.relation) {
      issues.push(
        createIssue(
          `${fieldPath}.relation`,
          'Relation fields must define relation metadata.',
        ),
      );
    } else if (
      !registry.modules.some(
        (moduleDefinition) =>
          moduleDefinition.code === field.relation?.targetModule,
      )
    ) {
      issues.push(
        createIssue(
          `${fieldPath}.relation.targetModule`,
          'Relation target module must be registered.',
        ),
      );
    }
  }

  if (field.permissionCode && !isPermissionCode(field.permissionCode)) {
    issues.push(
      createIssue(
        `${fieldPath}.permissionCode`,
        'Field permissionCode must match <module-layer>:<resource>:<action>.',
      ),
    );
  }

  return issues;
}

function collectTargetPaths(schema: OpenForgeManualSchema): readonly string[] {
  return [
    ...(schema.admin?.targetPaths ?? []),
    ...(schema.sdk?.generatedPath ? [schema.sdk.generatedPath] : []),
    ...(schema.sdk?.targetPaths ?? []),
    ...(schema.tests?.api ? [schema.tests.api] : []),
    ...(schema.tests?.admin ? [schema.tests.admin] : []),
    ...(schema.tests?.e2e ? [schema.tests.e2e] : []),
    ...(schema.docs?.moduleDoc ? [schema.docs.moduleDoc] : []),
    ...(schema.docs?.runbook ? [schema.docs.runbook] : []),
    ...(schema.docs?.patchReview ? [schema.docs.patchReview] : []),
    ...(schema.prisma?.draftPath ? [schema.prisma.draftPath] : []),
    ...(schema.prisma?.migrationHintPath
      ? [schema.prisma.migrationHintPath]
      : []),
  ];
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

  for (const [index, field] of (schema.fields ?? []).entries()) {
    errors.push(...validateFieldSchema(field, index, registry));
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

    if (
      options.strictPermissionCodes !== false &&
      !registryPermissions.has(permission)
    ) {
      errors.push(
        createIssue(
          `permissions.${permission}`,
          'Permission must be registered in module registry.',
        ),
      );
    }
  }

  for (const action of schema.actions ?? []) {
    if (!isPermissionAction(action)) {
      errors.push(
        createIssue(
          `actions.${action}`,
          'Action must be a supported permission action.',
        ),
      );
    }
  }

  const knownFieldNames = getOpenForgeSchemaFieldNames(schema);

  errors.push(
    ...validateFieldSelection(
      'list.columns',
      schema.list?.columns,
      knownFieldNames,
    ),
  );
  errors.push(
    ...validateFieldSelection(
      'form.fields',
      schema.form?.fields,
      knownFieldNames,
    ),
  );
  errors.push(
    ...validateFieldSelection(
      'detail.fields',
      schema.detail?.fields,
      knownFieldNames,
    ),
  );
  errors.push(
    ...validateFieldSelection(
      'filter.fields',
      schema.filter?.fields,
      knownFieldNames,
    ),
  );
  errors.push(
    ...validateFieldSelection(
      'sort.fields',
      schema.sort?.fields,
      knownFieldNames,
    ),
  );
  errors.push(
    ...validateFieldSelection(
      'export.columns',
      schema.export?.columns,
      knownFieldNames,
    ),
  );
  errors.push(
    ...validateFieldSelection(
      'storage.fields',
      schema.storage?.fields,
      knownFieldNames,
    ),
  );

  if (schema.sort?.default && !knownFieldNames.has(schema.sort.default.field)) {
    errors.push(
      createIssue(
        `sort.default.${schema.sort.default.field}`,
        'Default sort field must be declared in schema.fields.',
      ),
    );
  }

  for (const indexHint of schema.indexes ?? []) {
    errors.push(
      ...validateFieldSelection(
        `indexes.${indexHint.name}.fields`,
        indexHint.fields,
        knownFieldNames,
      ),
    );
  }

  if (schema.schemaVersion !== undefined && !isOpenForgeSchemaV1(schema)) {
    errors.push(
      createIssue(
        'schemaVersion',
        `Schema version must be ${OPENFORGE_SCHEMA_V1_VERSION}.`,
      ),
    );
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

  for (const targetPath of collectTargetPaths(schema)) {
    errors.push(...validateRepoRelativePath(targetPath));
  }

  return {
    valid: errors.length === 0,
    warnings: [],
    errors,
    moduleDefinition,
  };
}
