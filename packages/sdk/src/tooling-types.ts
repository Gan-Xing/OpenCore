export type OpenApiDriftStatus = {
  status: 'configured';
  snapshotPath: string;
  exportCommand: string;
  driftCheckCommand: string;
  checkedAt: string;
};

export type CurrentPageExportProtocolSummary = {
  stage: 'S8';
  status: 'active';
  scope: 'current-page';
  supportedFormats: readonly ['csv'];
  maxRows: number;
  asyncExport: false;
  sensitiveFieldPolicy: string;
  ownerPackage: '@opencore/contracts';
};

export type CreateExportPreviewRequest = {
  resource: string;
  columns: readonly string[];
  rowCount: number;
};

export type ExportPlanSummary = {
  resource: string;
  filename: string;
  format: 'csv';
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type OpenForgeIssueSummary = {
  severity: 'error' | 'warning';
  path: string;
  message: string;
};

export type OpenForgeSafetySummary = {
  noWrite: true;
  dryRunOnly: true;
  protectedPaths: readonly string[];
  forbiddenPathPatterns: readonly string[];
  requireGeneratedMarkerForUpdate: true;
  blockPrismaSchemaWrites: true;
  blockPrismaMigrations: true;
  blockP4P5Modules: true;
};

export type OpenForgeStatusSummary = {
  status: 'workspace-ready';
  message: string;
  workspace: {
    packageName: '@opencore/openforge';
    projectName: 'openforge';
    templateVersion: string;
    protocol: Record<string, unknown>;
    noWrite: true;
  };
  generatorCore: {
    packageName: '@opencore/generator-core';
    projectName: 'generator-core';
    templateVersion: string;
    protocol: Record<string, unknown>;
    noWrite: true;
  };
};

export type OpenForgeDoctorCheckSummary = {
  id: string;
  label: string;
  status: 'fail' | 'pass' | 'warn';
  message: string;
  details?: Record<string, unknown>;
};

export type OpenForgeDoctorSummary = {
  generatedAt: string;
  repoRoot: string;
  valid: boolean;
  checks: readonly OpenForgeDoctorCheckSummary[];
  errors: readonly OpenForgeIssueSummary[];
};

export type OpenForgeSchemaRequest = {
  schemaPath: string;
};

export type OpenForgeApplyDryRunRequest = OpenForgeSchemaRequest & {
  configPath?: string;
};

export type OpenForgeArtifactSummary = {
  kind: string;
  targetPath: string;
  action: string;
  protected: boolean;
  overwritePolicy: string;
  contentHash?: string;
  contentPreview?: string;
  reason: string;
};

export type OpenForgePlanSummary = {
  moduleCode: string;
  templateVersion: string;
  schemaHash: string;
  openApiSnapshotHash: string;
  registrySnapshotHash: string;
  artifacts: readonly OpenForgeArtifactSummary[];
  permissions: readonly string[];
  openapiTags: readonly string[];
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
  safety: OpenForgeSafetySummary;
};

export type OpenForgeDiffEntrySummary = {
  targetPath: string;
  kind: string;
  status:
    | 'blocked'
    | 'protected-conflict'
    | 'unchanged'
    | 'would-create'
    | 'would-update';
  protected: boolean;
  reason: string;
  beforeHash?: string;
  afterHash?: string;
};

export type OpenForgeDiffSummary = {
  moduleCode: string;
  templateVersion: string;
  generatedAt: string;
  entries: readonly OpenForgeDiffEntrySummary[];
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
  safety: OpenForgeSafetySummary;
};

export type OpenForgePreflightSummary = {
  templateVersion: string;
  generatedAt: string;
  schemaPath: string;
  moduleCode: string;
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
  safety: OpenForgeSafetySummary;
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
};

export type OpenForgeManifestEntrySummary = {
  targetPath: string;
  artifactKind: string;
  action: 'blocked' | 'created' | 'skipped' | 'updated';
  rollbackAction: 'delete' | 'none' | 'restore';
  beforeHash?: string;
  afterHash?: string;
  backupPath?: string;
};

export type OpenForgeManifestSummary = {
  id: string;
  createdAt: string;
  command: string;
  schemaPath: string;
  moduleCode: string;
  templateVersion: string;
  inputHashes: {
    schemaHash: string;
    registryHash: string;
    openApiHash: string;
    configHash?: string;
  };
  entries: readonly OpenForgeManifestEntrySummary[];
};

export type OpenForgeManifestListEntrySummary = {
  id: string;
  path: string;
  createdAt: string;
  moduleCode: string;
  templateVersion: string;
  entryCount: number;
};

export type OpenForgeManifestListSummary = {
  manifests: readonly OpenForgeManifestListEntrySummary[];
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
};

export type OpenForgeManifestDetailSummary = {
  manifestPath: string;
  manifest?: OpenForgeManifestSummary;
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
};

export type OpenForgeApplyDryRunSummary = {
  mode: 'dry-run';
  applied: false;
  manifest?: OpenForgeManifestSummary;
  entries: readonly OpenForgeManifestEntrySummary[];
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
};

export type OpenForgeRollbackDryRunRequest = {
  manifestId: string;
};

export type OpenForgeRollbackEntrySummary = {
  targetPath: string;
  artifactKind: string;
  action: 'blocked' | 'delete' | 'restore' | 'skip';
  reason: string;
  beforeHash?: string;
  afterHash?: string;
};

export type OpenForgeRollbackDryRunSummary = {
  mode: 'dry-run';
  rolledBack: false;
  entries: readonly OpenForgeRollbackEntrySummary[];
  manifest?: OpenForgeManifestSummary;
  warnings: readonly OpenForgeIssueSummary[];
  errors: readonly OpenForgeIssueSummary[];
};
