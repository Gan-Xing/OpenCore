import type {
  MenuDefinition,
  ModuleDefinition,
  PermissionDefinition,
} from './module-contract';
import type { PermissionCode } from './permission-code';

export const OPENFORGE_TEMPLATE_VERSION = 's9-openforge-mvp-v1' as const;

export const OPENFORGE_CONTRACT_PROTOCOL = {
  stage: 'S9',
  status: 'read-only-plan',
  ownerPackage: '@opencore/contracts',
  toolPackage: '@opencore/openforge',
  sourceRegistryPackage: '@opencore/module-registry',
  openApiSnapshotPath: 'packages/contracts/openapi/opencore-api.json',
  exampleSchemaPath: 'tools/generator/examples/core.dict.schema.json',
  planCommand:
    'pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format json',
  diffCommand:
    'pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json',
  checkCommand: 'pnpm openforge:check',
  noWrite: true,
} as const;

export type OpenForgePlanFormat = 'json' | 'markdown';

export type OpenForgeValidationSeverity = 'error' | 'warning';

export type OpenForgeValidationIssue = {
  severity: OpenForgeValidationSeverity;
  path: string;
  message: string;
};

export type OpenForgeFieldSchema = {
  name: string;
  title: string;
  type: 'boolean' | 'datetime' | 'number' | 'string' | 'text';
  required?: boolean;
  list?: boolean;
  form?: boolean;
  detail?: boolean;
  permissionCode?: PermissionCode;
};

export type OpenForgeManualSchema = {
  moduleCode: ModuleDefinition['code'];
  resource: string;
  title: string;
  description?: string;
  fields: readonly OpenForgeFieldSchema[];
  list: {
    title: string;
    columns: readonly string[];
    defaultPageSize?: number;
  };
  form: {
    title: string;
    fields: readonly string[];
  };
  detail: {
    title: string;
    fields: readonly string[];
  };
  actions: readonly string[];
  permissions: readonly PermissionCode[];
  openapi: {
    tags: readonly string[];
    paths?: readonly string[];
  };
  admin: {
    basePath: `/${string}`;
    menuKey?: string;
    targetPaths?: readonly string[];
  };
  prisma?: {
    writeSchema?: boolean;
    modelName?: string;
  };
};

export type OpenForgeInputSnapshot = {
  generatedAt: string;
  registryHash: string;
  openApiHash: string;
  schemaHash: string;
  module: Pick<
    ModuleDefinition,
    'apiTags' | 'code' | 'layer' | 'stage' | 'title'
  >;
  permissions: readonly PermissionDefinition[];
  menus: readonly MenuDefinition[];
};

export type OpenForgeArtifactKind =
  | 'api.controller'
  | 'api.dto'
  | 'api.module'
  | 'api.repository'
  | 'api.service'
  | 'admin.detail'
  | 'admin.form'
  | 'admin.listPage'
  | 'docs.fragment'
  | 'prisma.hint'
  | 'sdk.client'
  | 'test.admin'
  | 'test.api';

export type OpenForgeArtifactAction =
  | 'hint'
  | 'skip'
  | 'would-create'
  | 'would-update';

export type OpenForgeOverwritePolicy =
  | 'generated-marker-required'
  | 'manual-review'
  | 'never';

export type OpenForgeArtifactPlan = {
  kind: OpenForgeArtifactKind;
  targetPath: string;
  action: OpenForgeArtifactAction;
  protected: boolean;
  overwritePolicy: OpenForgeOverwritePolicy;
  contentHash?: string;
  contentPreview?: string;
  reason: string;
};

export type OpenForgeSafetyPolicy = {
  noWrite: true;
  dryRunOnly: true;
  protectedPaths: readonly string[];
  forbiddenPathPatterns: readonly string[];
  requireGeneratedMarkerForUpdate: true;
  blockPrismaSchemaWrites: true;
  blockPrismaMigrations: true;
  blockP4P5Modules: true;
};

export type OpenForgePlan = {
  moduleCode: ModuleDefinition['code'];
  templateVersion: typeof OPENFORGE_TEMPLATE_VERSION;
  inputSnapshot: OpenForgeInputSnapshot;
  schemaHash: string;
  openApiSnapshotHash: string;
  registrySnapshotHash: string;
  artifacts: readonly OpenForgeArtifactPlan[];
  permissions: readonly PermissionCode[];
  menus: readonly MenuDefinition[];
  openapiTags: readonly string[];
  warnings: readonly OpenForgeValidationIssue[];
  errors: readonly OpenForgeValidationIssue[];
  nextCommands: readonly string[];
  safety: OpenForgeSafetyPolicy;
};

export type OpenForgeDiffStatus =
  | 'blocked'
  | 'protected-conflict'
  | 'unchanged'
  | 'would-create'
  | 'would-update';

export type OpenForgeDiffEntry = {
  targetPath: string;
  kind: OpenForgeArtifactKind;
  status: OpenForgeDiffStatus;
  protected: boolean;
  reason: string;
  beforeHash?: string;
  afterHash?: string;
};

export type OpenForgeDiffPlan = {
  moduleCode: ModuleDefinition['code'];
  templateVersion: typeof OPENFORGE_TEMPLATE_VERSION;
  generatedAt: string;
  entries: readonly OpenForgeDiffEntry[];
  warnings: readonly OpenForgeValidationIssue[];
  errors: readonly OpenForgeValidationIssue[];
  safety: OpenForgeSafetyPolicy;
};

export type OpenForgePreflightReport = {
  templateVersion: typeof OPENFORGE_TEMPLATE_VERSION;
  generatedAt: string;
  schemaPath: string;
  moduleCode: ModuleDefinition['code'];
  valid: boolean;
  noWrite: true;
  registry: {
    valid: boolean;
    moduleCount: number;
    permissionCount: number;
    menuCount: number;
    issueCount: number;
  };
  openApi: {
    snapshotPath: string;
    pathCount: number;
    operationCount: number;
    tagCount: number;
    schemaCount: number;
  };
  safety: OpenForgeSafetyPolicy;
  warnings: readonly OpenForgeValidationIssue[];
  errors: readonly OpenForgeValidationIssue[];
};
