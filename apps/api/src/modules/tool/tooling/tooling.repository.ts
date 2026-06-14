import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  CURRENT_PAGE_EXPORT_PROTOCOL,
  createCurrentPageExportPlan,
} from '@opencore/contracts';
import {
  applyOpenForge,
  buildDiffPlan,
  buildGeneratePlan,
  buildPreflightReport,
  getOpenForgeGeneratorCoreStatus,
  listOpenForgeManifests,
  rollbackOpenForge,
  runOpenForgeDoctor,
  showOpenForgeManifest,
} from '@opencore/generator-core';
import { getOpenForgeWorkspaceStatus } from '@opencore/openforge';
import { BadRequestException, Injectable } from '@nestjs/common';

const DEFAULT_OPENFORGE_SCHEMA_PATH =
  'tools/generator/examples/core.dict.v1.schema.json';
const DEFAULT_OPENFORGE_CONFIG_PATH =
  'tools/generator/examples/openforge.v1.config.json';
const ALLOWED_OPENFORGE_SCHEMA_PREFIX = 'tools/generator/examples/';
const OPENFORGE_MANIFEST_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;
const OPENFORGE_DRY_RUN_CONFIRMATION_TEXT = 'OPENFORGE DRY RUN';

function findWorkspaceRoot(start = process.cwd()): string {
  let current = resolve(start);

  for (;;) {
    if (
      existsSync(resolve(current, 'package.json')) &&
      existsSync(resolve(current, 'pnpm-workspace.yaml'))
    ) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      return resolve(start);
    }

    current = parent;
  }
}

function rejectUnsafeRepoPath(path: string, label: string): void {
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\0') ||
    path.split('/').includes('..')
  ) {
    throw new BadRequestException(
      `${label} must be a safe repo-relative path.`,
    );
  }
}

function normalizeOpenForgeSchemaPath(schemaPath?: string): string {
  const normalized = schemaPath?.trim() || DEFAULT_OPENFORGE_SCHEMA_PATH;

  rejectUnsafeRepoPath(normalized, 'schemaPath');

  if (
    !normalized.startsWith(ALLOWED_OPENFORGE_SCHEMA_PREFIX) ||
    !normalized.endsWith('.schema.json')
  ) {
    throw new BadRequestException(
      'schemaPath must point to an OpenForge example schema.',
    );
  }

  return normalized;
}

function normalizeOpenForgeConfigPath(configPath?: string): string | undefined {
  const normalized = configPath?.trim();

  if (!normalized) {
    return undefined;
  }

  rejectUnsafeRepoPath(normalized, 'configPath');

  if (normalized !== DEFAULT_OPENFORGE_CONFIG_PATH) {
    throw new BadRequestException(
      'configPath must point to the OpenForge example config.',
    );
  }

  return normalized;
}

function manifestPathFromId(manifestId: string): string {
  const normalized = manifestId.trim();

  if (!OPENFORGE_MANIFEST_ID_PATTERN.test(normalized)) {
    throw new BadRequestException(
      'manifestId may contain only letters, numbers, dot, underscore and dash.',
    );
  }

  return `.openforge/manifests/${normalized.replace(/\.json$/, '')}.json`;
}

function assertOpenForgeDryRunConfirmation(input: {
  confirmationText?: string;
  requestedMode?: string;
}): void {
  if (input.requestedMode && input.requestedMode !== 'dry-run') {
    throw new BadRequestException(
      'OpenForge API only supports dry-run operations; direct code writes require explicit user admission.',
    );
  }

  if (input.confirmationText !== OPENFORGE_DRY_RUN_CONFIRMATION_TEXT) {
    throw new BadRequestException(
      `OpenForge dry-run requires confirmationText "${OPENFORGE_DRY_RUN_CONFIRMATION_TEXT}".`,
    );
  }
}

@Injectable()
export class ToolingRepository {
  private getOpenForgeRepoRoot(): string {
    return findWorkspaceRoot();
  }

  getOpenApiDriftStatus() {
    return {
      status: 'configured' as const,
      snapshotPath: 'packages/contracts/openapi/opencore-api.json',
      exportCommand: 'pnpm openapi:export',
      driftCheckCommand: 'pnpm openapi:check',
      checkedAt: new Date().toISOString(),
    };
  }

  getExportProtocol() {
    return CURRENT_PAGE_EXPORT_PROTOCOL;
  }

  createExportPlan(input: {
    resource: string;
    columns: readonly string[];
    rowCount: number;
  }) {
    return createCurrentPageExportPlan(input);
  }

  getOpenForgeStatus() {
    return {
      status: 'workspace-ready' as const,
      workspace: getOpenForgeWorkspaceStatus(),
      generatorCore: getOpenForgeGeneratorCoreStatus(),
      operationPolicy: {
        dryRunOnly: true,
        confirmationText: OPENFORGE_DRY_RUN_CONFIRMATION_TEXT,
        writeRequiresUserAdmission: true,
      },
      message:
        'OpenForge is available as a guarded planning and dry-run workspace.',
    };
  }

  getOpenForgeDoctor() {
    return runOpenForgeDoctor({ repoRoot: this.getOpenForgeRepoRoot() });
  }

  createOpenForgePlan(input: { schemaPath?: string }) {
    const repoRoot = this.getOpenForgeRepoRoot();

    return buildGeneratePlan({
      schemaPath: normalizeOpenForgeSchemaPath(input.schemaPath),
      sourceRoot: repoRoot,
    });
  }

  createOpenForgeDiff(input: { schemaPath?: string }) {
    const repoRoot = this.getOpenForgeRepoRoot();

    return buildDiffPlan({
      schemaPath: normalizeOpenForgeSchemaPath(input.schemaPath),
      repoRoot,
      sourceRoot: repoRoot,
    });
  }

  createOpenForgePreflight(input: { schemaPath?: string }) {
    const repoRoot = this.getOpenForgeRepoRoot();

    return buildPreflightReport({
      schemaPath: normalizeOpenForgeSchemaPath(input.schemaPath),
      sourceRoot: repoRoot,
    });
  }

  createOpenForgeApplyDryRun(input: {
    confirmationText?: string;
    configPath?: string;
    requestedMode?: string;
    schemaPath?: string;
  }) {
    assertOpenForgeDryRunConfirmation(input);

    const repoRoot = this.getOpenForgeRepoRoot();
    const schemaPath = normalizeOpenForgeSchemaPath(input.schemaPath);
    const configPath = normalizeOpenForgeConfigPath(input.configPath);

    const result = applyOpenForge({
      schemaPath,
      configPath,
      mode: 'dry-run',
      yes: false,
      repoRoot,
      sourceRoot: repoRoot,
      command: [
        'pnpm openforge:apply --',
        '--schema',
        schemaPath,
        ...(configPath ? ['--config', configPath] : []),
        '--dry-run',
      ].join(' '),
    });

    return {
      ...result,
      mode: 'dry-run' as const,
      applied: false,
    };
  }

  createOpenForgeManifestPreview(input: {
    configPath?: string;
    schemaPath?: string;
  }) {
    const repoRoot = this.getOpenForgeRepoRoot();
    const schemaPath = normalizeOpenForgeSchemaPath(input.schemaPath);
    const configPath = normalizeOpenForgeConfigPath(input.configPath);
    const result = applyOpenForge({
      schemaPath,
      configPath,
      mode: 'dry-run',
      yes: false,
      repoRoot,
      sourceRoot: repoRoot,
      command: [
        'pnpm openforge:apply --',
        '--schema',
        schemaPath,
        ...(configPath ? ['--config', configPath] : []),
        '--dry-run',
      ].join(' '),
    });

    return {
      manifestPath: result.manifest ? `dry-run:${result.manifest.id}` : '',
      manifest: result.manifest,
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  listOpenForgeManifests() {
    return listOpenForgeManifests({
      repoRoot: this.getOpenForgeRepoRoot(),
    });
  }

  getOpenForgeManifest(manifestId: string) {
    return showOpenForgeManifest({
      manifestIdOrPath: manifestPathFromId(manifestId),
      repoRoot: this.getOpenForgeRepoRoot(),
    });
  }

  createOpenForgeRollbackDryRun(input: {
    confirmationText?: string;
    manifestId: string;
    requestedMode?: string;
  }) {
    assertOpenForgeDryRunConfirmation(input);

    const manifestPath = manifestPathFromId(input.manifestId);

    const result = rollbackOpenForge({
      manifestPath,
      mode: 'dry-run',
      yes: false,
      repoRoot: this.getOpenForgeRepoRoot(),
      command: [
        'pnpm openforge:rollback --',
        '--manifest',
        manifestPath,
        '--dry-run',
      ].join(' '),
    });

    return {
      ...result,
      mode: 'dry-run' as const,
      rolledBack: false,
    };
  }
}
