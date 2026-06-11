import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import {
  parseOpenForgeGeneratedMarker,
  validateOpenForgeApplyRequest,
  type OpenForgeApplyMode,
  type OpenForgeApplyResult,
  type OpenForgeManifest,
  type OpenForgeManifestEntry,
  type OpenForgeValidationIssue,
  type OpenForgeVirtualFile,
} from '@opencore/contracts';
import {
  DEFAULT_OPENFORGE_GENERATOR_CONFIG,
  loadOpenForgeGeneratorConfig,
  validateOpenForgeGeneratorConfig,
} from '../config/generator-config';
import { createStableHash } from '../hash/stable-hash';
import { OPENFORGE_DETERMINISTIC_TIMESTAMP } from '../planner/generate-plan';
import { readOpenApiSnapshot } from '../readers/openapi-reader';
import { readModuleRegistrySnapshot } from '../readers/registry-reader';
import { loadManualSchema } from '../readers/schema-loader';
import { renderTemplatePack } from '../render/render-template-pack';
import { evaluatePathSafety } from '../safety/path-safety';
import { validateOpenForgeManualSchema } from '../validators/manual-schema-validator';

export type ApplyOpenForgeOptions = {
  schemaPath: string;
  configPath?: string;
  mode?: OpenForgeApplyMode;
  yes?: boolean;
  repoRoot?: string;
  command?: string;
};

type PreparedApply = {
  repoRoot: string;
  schemaPath: string;
  command: string;
  files: readonly OpenForgeVirtualFile[];
  manifest: OpenForgeManifest;
  entries: readonly OpenForgeManifestEntry[];
  warnings: readonly OpenForgeValidationIssue[];
  errors: readonly OpenForgeValidationIssue[];
};

type WrittenFileRollback = {
  absolutePath: string;
  existedBefore: boolean;
  beforeContent?: string;
};

function createIssue(path: string, message: string): OpenForgeValidationIssue {
  return {
    severity: 'error',
    path,
    message,
  };
}

function fileContentAsString(file: OpenForgeVirtualFile): string {
  return String(file.content.value);
}

function isInsideRepo(repoRoot: string, absolutePath: string): boolean {
  const relativePath = relative(repoRoot, absolutePath);

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

function getAbsoluteTargetPath(
  repoRoot: string,
  targetPath: string,
): string | null {
  const absolutePath = resolve(repoRoot, targetPath);

  return isInsideRepo(repoRoot, absolutePath) ? absolutePath : null;
}

function safeManifestId(moduleCode: string, schemaHash: string): string {
  const timestamp = OPENFORGE_DETERMINISTIC_TIMESTAMP.replace(/[^0-9TZ]/g, '');

  return `${timestamp}-${moduleCode}-${schemaHash.slice(0, 8)}`;
}

function safeBackupFileName(targetPath: string): string {
  const safePath = targetPath.replace(/[^a-zA-Z0-9._-]+/g, '_');

  return `${createStableHash(targetPath).slice(0, 8)}-${safePath}.bak`;
}

function backupPathFor(manifestId: string, targetPath: string): string {
  return `.openforge/backups/${manifestId}/${safeBackupFileName(targetPath)}`;
}

function manifestPathFor(manifest: OpenForgeManifest): string {
  return `.openforge/manifests/${manifest.id}.json`;
}

function createManifest(
  id: string,
  command: string,
  schemaPath: string,
  moduleCode: OpenForgeManifest['moduleCode'],
  templateVersion: string,
  inputHashes: OpenForgeManifest['inputHashes'],
  entries: readonly OpenForgeManifestEntry[],
): OpenForgeManifest {
  return {
    id,
    createdAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
    command,
    schemaPath,
    moduleCode,
    templateVersion,
    inputHashes,
    entries,
  };
}

function evaluateApplyEntry(
  file: OpenForgeVirtualFile,
  repoRoot: string,
  manifestId: string,
): OpenForgeManifestEntry {
  const safety = evaluatePathSafety(file.targetPath);

  if (safety.blocked) {
    return {
      targetPath: file.targetPath,
      artifactKind: file.artifactKind,
      action: 'blocked',
      rollbackAction: 'none',
      afterHash: file.contentHash,
      marker: file.marker,
    };
  }

  const absolutePath = getAbsoluteTargetPath(repoRoot, file.targetPath);

  if (!absolutePath) {
    return {
      targetPath: file.targetPath,
      artifactKind: file.artifactKind,
      action: 'blocked',
      rollbackAction: 'none',
      afterHash: file.contentHash,
      marker: file.marker,
    };
  }

  if (!existsSync(absolutePath)) {
    return {
      targetPath: file.targetPath,
      artifactKind: file.artifactKind,
      action: 'created',
      rollbackAction: 'delete',
      afterHash: file.contentHash,
      marker: file.marker,
    };
  }

  const beforeContent = readFileSync(absolutePath, 'utf8');
  const beforeHash = createStableHash(beforeContent);

  if (beforeHash === file.contentHash) {
    return {
      targetPath: file.targetPath,
      artifactKind: file.artifactKind,
      action: 'skipped',
      rollbackAction: 'none',
      beforeHash,
      afterHash: file.contentHash,
      marker: file.marker,
    };
  }

  const marker = parseOpenForgeGeneratedMarker(beforeContent);

  if (!marker) {
    return {
      targetPath: file.targetPath,
      artifactKind: file.artifactKind,
      action: 'blocked',
      rollbackAction: 'none',
      beforeHash,
      afterHash: file.contentHash,
    };
  }

  return {
    targetPath: file.targetPath,
    artifactKind: file.artifactKind,
    action: 'updated',
    rollbackAction: 'restore',
    beforeHash,
    afterHash: file.contentHash,
    backupPath: backupPathFor(manifestId, file.targetPath),
    marker: file.marker,
  };
}

function prepareApply(options: ApplyOpenForgeOptions): PreparedApply {
  const repoRoot = resolve(process.cwd(), options.repoRoot ?? '.');
  const loadedSchema = loadManualSchema(options.schemaPath);
  const loadedConfig = loadOpenForgeGeneratorConfig(options.configPath);
  const config = {
    ...loadedConfig.config,
    applyMode: options.mode ?? loadedConfig.config.applyMode,
  };
  const registry = readModuleRegistrySnapshot();
  const openApi = readOpenApiSnapshot();
  const schemaValidation = validateOpenForgeManualSchema(
    loadedSchema.schema,
    registry,
    openApi,
    {
      strictOpenApiTags: config.strictOpenApiTags,
      strictPermissionCodes: config.strictPermissionCodes,
    },
  );
  const configErrors = validateOpenForgeGeneratorConfig(config);
  const applyErrors = validateOpenForgeApplyRequest({
    command: options.command ?? 'pnpm openforge:apply',
    schemaPath: options.schemaPath,
    configPath: options.configPath,
    mode: config.applyMode,
    yes: Boolean(options.yes),
    config,
  });
  const inputHashes = {
    schemaHash: createStableHash(loadedSchema.raw),
    registryHash: createStableHash(registry.modules),
    openApiHash: createStableHash(openApi.raw),
    configHash: createStableHash(loadedConfig.raw),
  };
  const manifestId = safeManifestId(
    loadedSchema.schema.moduleCode,
    inputHashes.schemaHash,
  );
  const files =
    schemaValidation.valid && configErrors.length === 0
      ? renderTemplatePack(loadedSchema.schema, config)
      : [];
  const entries = files.map((file) =>
    evaluateApplyEntry(file, repoRoot, manifestId),
  );
  const blockedEntries = entries
    .filter((entry) => entry.action === 'blocked')
    .map((entry) =>
      createIssue(
        entry.targetPath,
        'Target path is blocked or conflicts with a human-authored file.',
      ),
    );
  const manifest = createManifest(
    manifestId,
    options.command ?? 'pnpm openforge:apply',
    options.schemaPath,
    loadedSchema.schema.moduleCode,
    config.templateVersion,
    inputHashes,
    entries,
  );

  return {
    repoRoot,
    schemaPath: options.schemaPath,
    command: options.command ?? 'pnpm openforge:apply',
    files,
    manifest,
    entries,
    warnings: schemaValidation.warnings,
    errors: [
      ...schemaValidation.errors,
      ...configErrors,
      ...applyErrors,
      ...blockedEntries,
    ],
  };
}

function rollbackWrittenFiles(rollbacks: readonly WrittenFileRollback[]): void {
  for (const rollback of [...rollbacks].reverse()) {
    if (rollback.existedBefore && rollback.beforeContent !== undefined) {
      writeFileSync(rollback.absolutePath, rollback.beforeContent);
      continue;
    }

    if (!rollback.existedBefore && existsSync(rollback.absolutePath)) {
      rmSync(rollback.absolutePath);
    }
  }
}

function writeManifest(
  repoRoot: string,
  manifest: OpenForgeManifest,
  rollbacks: WrittenFileRollback[],
): string {
  const manifestPath = manifestPathFor(manifest);
  const absoluteManifestPath = resolve(repoRoot, manifestPath);
  const existedBefore = existsSync(absoluteManifestPath);
  const beforeContent = existedBefore
    ? readFileSync(absoluteManifestPath, 'utf8')
    : undefined;

  mkdirSync(dirname(absoluteManifestPath), { recursive: true });
  rollbacks.push({
    absolutePath: absoluteManifestPath,
    existedBefore,
    beforeContent,
  });
  writeFileSync(absoluteManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return manifestPath;
}

function writePreparedApply(prepared: PreparedApply): OpenForgeApplyResult {
  const rollbacks: WrittenFileRollback[] = [];
  const writableEntries = prepared.entries.filter(
    (entry) => entry.action === 'created' || entry.action === 'updated',
  );

  if (writableEntries.length === 0) {
    return {
      mode: 'write',
      applied: false,
      entries: prepared.entries,
      warnings: prepared.warnings,
      errors: [],
    };
  }

  try {
    for (const file of prepared.files) {
      const entry = prepared.entries.find(
        (candidate) => candidate.targetPath === file.targetPath,
      );

      if (!entry || entry.action === 'blocked' || entry.action === 'skipped') {
        continue;
      }

      const absolutePath = getAbsoluteTargetPath(
        prepared.repoRoot,
        file.targetPath,
      );

      if (!absolutePath) {
        throw new Error(`Target escaped repo root: ${file.targetPath}`);
      }

      const existedBefore = existsSync(absolutePath);
      const beforeContent = existedBefore
        ? readFileSync(absolutePath, 'utf8')
        : undefined;

      if (entry.rollbackAction === 'restore') {
        if (!entry.backupPath || beforeContent === undefined) {
          throw new Error(`Missing rollback backup for ${file.targetPath}`);
        }

        if (
          entry.beforeHash &&
          createStableHash(beforeContent) !== entry.beforeHash
        ) {
          throw new Error(`Target changed before write: ${file.targetPath}`);
        }

        const absoluteBackupPath = getAbsoluteTargetPath(
          prepared.repoRoot,
          entry.backupPath,
        );

        if (!absoluteBackupPath) {
          throw new Error(`Backup escaped repo root: ${entry.backupPath}`);
        }

        const backupExistedBefore = existsSync(absoluteBackupPath);
        const backupBeforeContent = backupExistedBefore
          ? readFileSync(absoluteBackupPath, 'utf8')
          : undefined;

        rollbacks.push({
          absolutePath: absoluteBackupPath,
          existedBefore: backupExistedBefore,
          beforeContent: backupBeforeContent,
        });
        mkdirSync(dirname(absoluteBackupPath), { recursive: true });
        writeFileSync(absoluteBackupPath, beforeContent);

        if (
          entry.beforeHash &&
          createStableHash(readFileSync(absoluteBackupPath, 'utf8')) !==
            entry.beforeHash
        ) {
          throw new Error(`Backup verification failed for ${entry.backupPath}`);
        }
      }

      rollbacks.push({
        absolutePath,
        existedBefore,
        beforeContent,
      });
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, fileContentAsString(file));

      const afterContent = readFileSync(absolutePath, 'utf8');
      const afterHash = createStableHash(afterContent);

      if (afterHash !== file.contentHash) {
        throw new Error(`Hash verification failed for ${file.targetPath}`);
      }
    }

    const manifestPath = writeManifest(
      prepared.repoRoot,
      prepared.manifest,
      rollbacks,
    );

    return {
      mode: 'write',
      applied: true,
      manifestPath,
      manifest: prepared.manifest,
      entries: prepared.entries,
      warnings: prepared.warnings,
      errors: [],
    };
  } catch (error) {
    rollbackWrittenFiles(rollbacks);

    return {
      mode: 'write',
      applied: false,
      entries: prepared.entries,
      warnings: prepared.warnings,
      errors: [
        createIssue(
          'apply',
          error instanceof Error ? error.message : 'OpenForge apply failed.',
        ),
      ],
    };
  }
}

export function applyOpenForge(
  options: ApplyOpenForgeOptions,
): OpenForgeApplyResult {
  const prepared = prepareApply({
    ...options,
    mode: options.mode ?? DEFAULT_OPENFORGE_GENERATOR_CONFIG.applyMode,
  });
  const mode = options.mode ?? DEFAULT_OPENFORGE_GENERATOR_CONFIG.applyMode;

  if (prepared.errors.length > 0) {
    return {
      mode,
      applied: false,
      entries: prepared.entries,
      warnings: prepared.warnings,
      errors: prepared.errors,
    };
  }

  if (mode === 'dry-run') {
    return {
      mode,
      applied: false,
      manifest: prepared.manifest,
      entries: prepared.entries,
      warnings: prepared.warnings,
      errors: [],
    };
  }

  return writePreparedApply(prepared);
}
