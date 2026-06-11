import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import {
  parseOpenForgeGeneratedMarker,
  type OpenForgeApplyMode,
  type OpenForgeManifest,
  type OpenForgeManifestEntry,
  type OpenForgeRollbackAudit,
  type OpenForgeRollbackPlan,
  type OpenForgeRollbackPlanEntry,
  type OpenForgeRollbackResult,
  type OpenForgeValidationIssue,
} from '@opencore/contracts';
import { createStableHash } from '../hash/stable-hash';
import { OPENFORGE_DETERMINISTIC_TIMESTAMP } from '../planner/generate-plan';
import { evaluatePathSafety } from '../safety/path-safety';

export type RollbackOpenForgeOptions = {
  manifestPath: string;
  mode?: OpenForgeApplyMode;
  yes?: boolean;
  repoRoot?: string;
  command?: string;
};

export type OpenForgeManifestListEntry = {
  id: string;
  path: string;
  createdAt: string;
  moduleCode: string;
  templateVersion: string;
  entryCount: number;
};

export type OpenForgeManifestListResult = {
  manifests: readonly OpenForgeManifestListEntry[];
  warnings: readonly OpenForgeValidationIssue[];
  errors: readonly OpenForgeValidationIssue[];
};

export type OpenForgeManifestShowResult = {
  manifestPath: string;
  manifest?: OpenForgeManifest;
  warnings: readonly OpenForgeValidationIssue[];
  errors: readonly OpenForgeValidationIssue[];
};

type FileRollback = {
  absolutePath: string;
  existedBefore: boolean;
  beforeContent?: string;
};

type LoadedManifestResult = {
  manifest?: OpenForgeManifest;
  manifestPath: string;
  errors: readonly OpenForgeValidationIssue[];
};

function createIssue(path: string, message: string): OpenForgeValidationIssue {
  return {
    severity: 'error',
    path,
    message,
  };
}

function repoRootFor(repoRoot?: string): string {
  return resolve(process.cwd(), repoRoot ?? '.');
}

function isInsideRepo(repoRoot: string, absolutePath: string): boolean {
  const relativePath = relative(repoRoot, absolutePath);

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

function getAbsoluteRepoPath(
  repoRoot: string,
  targetPath: string,
): string | null {
  const safety = evaluatePathSafety(targetPath);

  if (safety.blocked) {
    return null;
  }

  const absolutePath = resolve(repoRoot, targetPath);

  return isInsideRepo(repoRoot, absolutePath) ? absolutePath : null;
}

function rollbackAuditId(manifestId: string): string {
  const timestamp = OPENFORGE_DETERMINISTIC_TIMESTAMP.replace(/[^0-9TZ]/g, '');

  return `${timestamp}-${manifestId}-rollback`;
}

function rollbackAuditPathFor(manifest: OpenForgeManifest): string {
  return `.openforge/rollbacks/${rollbackAuditId(manifest.id)}.json`;
}

function isManifest(value: unknown): value is OpenForgeManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<OpenForgeManifest>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.command === 'string' &&
    typeof candidate.schemaPath === 'string' &&
    typeof candidate.moduleCode === 'string' &&
    typeof candidate.templateVersion === 'string' &&
    Array.isArray(candidate.entries)
  );
}

function loadManifest(
  repoRoot: string,
  manifestPath: string,
): LoadedManifestResult {
  if (!manifestPath) {
    return {
      manifestPath,
      errors: [createIssue('manifestPath', 'Manifest path is required.')],
    };
  }

  const absolutePath = getAbsoluteRepoPath(repoRoot, manifestPath);

  if (!absolutePath) {
    return {
      manifestPath,
      errors: [
        createIssue(
          'manifestPath',
          'Manifest path must be a safe repo-relative path.',
        ),
      ],
    };
  }

  if (!existsSync(absolutePath)) {
    return {
      manifestPath,
      errors: [createIssue('manifestPath', 'Manifest file does not exist.')],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
  } catch {
    return {
      manifestPath,
      errors: [createIssue('manifestPath', 'Manifest file is invalid JSON.')],
    };
  }

  if (!isManifest(parsed)) {
    return {
      manifestPath,
      errors: [createIssue('manifestPath', 'Manifest file is invalid.')],
    };
  }

  return {
    manifest: parsed,
    manifestPath,
    errors: [],
  };
}

function skipEntry(
  entry: OpenForgeManifestEntry,
  reason: string,
): OpenForgeRollbackPlanEntry {
  return {
    targetPath: entry.targetPath,
    artifactKind: entry.artifactKind,
    action: 'skip',
    reason,
    beforeHash: entry.afterHash,
    afterHash: entry.afterHash,
  };
}

function blockEntry(
  entry: OpenForgeManifestEntry,
  reason: string,
  beforeHash?: string,
): OpenForgeRollbackPlanEntry {
  return {
    targetPath: entry.targetPath,
    artifactKind: entry.artifactKind,
    action: 'blocked',
    reason,
    beforeHash,
    afterHash: entry.afterHash,
  };
}

function planDeleteEntry(
  entry: OpenForgeManifestEntry,
  repoRoot: string,
): OpenForgeRollbackPlanEntry {
  const absolutePath = getAbsoluteRepoPath(repoRoot, entry.targetPath);

  if (!absolutePath) {
    return blockEntry(entry, 'Target path is blocked or outside the repo.');
  }

  if (!existsSync(absolutePath)) {
    return skipEntry(entry, 'Created file is already missing.');
  }

  const currentContent = readFileSync(absolutePath, 'utf8');
  const currentHash = createStableHash(currentContent);

  if (entry.afterHash && currentHash !== entry.afterHash) {
    return blockEntry(
      entry,
      'File changed after apply; refusing to delete.',
      currentHash,
    );
  }

  if (!parseOpenForgeGeneratedMarker(currentContent)) {
    return blockEntry(
      entry,
      'File no longer has a valid OpenForge marker.',
      currentHash,
    );
  }

  return {
    targetPath: entry.targetPath,
    artifactKind: entry.artifactKind,
    action: 'delete',
    reason: 'File was created by the apply manifest.',
    beforeHash: currentHash,
  };
}

function readBackupContent(
  entry: OpenForgeManifestEntry,
  repoRoot: string,
): { content?: string; error?: OpenForgeRollbackPlanEntry } {
  if (!entry.backupPath || !entry.beforeHash) {
    return {
      error: blockEntry(
        entry,
        'Updated file has no rollback backup recorded in the manifest.',
      ),
    };
  }

  const absoluteBackupPath = getAbsoluteRepoPath(repoRoot, entry.backupPath);

  if (!absoluteBackupPath || !existsSync(absoluteBackupPath)) {
    return {
      error: blockEntry(entry, 'Rollback backup file is missing or unsafe.'),
    };
  }

  const backupContent = readFileSync(absoluteBackupPath, 'utf8');
  const backupHash = createStableHash(backupContent);

  if (backupHash !== entry.beforeHash) {
    return {
      error: blockEntry(entry, 'Rollback backup hash does not match manifest.'),
    };
  }

  return {
    content: backupContent,
  };
}

function planRestoreEntry(
  entry: OpenForgeManifestEntry,
  repoRoot: string,
): OpenForgeRollbackPlanEntry {
  const absolutePath = getAbsoluteRepoPath(repoRoot, entry.targetPath);

  if (!absolutePath) {
    return blockEntry(entry, 'Target path is blocked or outside the repo.');
  }

  if (!existsSync(absolutePath)) {
    return blockEntry(entry, 'Updated file is missing; cannot restore.');
  }

  const currentContent = readFileSync(absolutePath, 'utf8');
  const currentHash = createStableHash(currentContent);

  if (entry.afterHash && currentHash !== entry.afterHash) {
    return blockEntry(
      entry,
      'File changed after apply; refusing to restore.',
      currentHash,
    );
  }

  if (!parseOpenForgeGeneratedMarker(currentContent)) {
    return blockEntry(
      entry,
      'File no longer has a valid OpenForge marker.',
      currentHash,
    );
  }

  const backup = readBackupContent(entry, repoRoot);

  if (backup.error) {
    return backup.error;
  }

  return {
    targetPath: entry.targetPath,
    artifactKind: entry.artifactKind,
    action: 'restore',
    reason: 'File was updated by the apply manifest.',
    beforeHash: currentHash,
    afterHash: entry.beforeHash,
  };
}

function planRollbackEntry(
  entry: OpenForgeManifestEntry,
  repoRoot: string,
): OpenForgeRollbackPlanEntry {
  if (entry.rollbackAction === 'none') {
    return skipEntry(entry, 'Manifest entry has no rollback action.');
  }

  if (entry.rollbackAction === 'delete') {
    return planDeleteEntry(entry, repoRoot);
  }

  return planRestoreEntry(entry, repoRoot);
}

export function buildRollbackPlan(
  options: RollbackOpenForgeOptions,
): OpenForgeRollbackPlan {
  const repoRoot = repoRootFor(options.repoRoot);
  const mode = options.mode ?? 'dry-run';
  const loaded = loadManifest(repoRoot, options.manifestPath);

  if (!loaded.manifest) {
    return {
      manifest: {
        id: 'invalid',
        createdAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
        command: '',
        schemaPath: '',
        moduleCode: 'tool.openforge',
        templateVersion: '',
        inputHashes: {
          schemaHash: '',
          registryHash: '',
          openApiHash: '',
        },
        entries: [],
      },
      mode,
      entries: [],
      warnings: [],
      errors: loaded.errors,
    };
  }

  const entries = loaded.manifest.entries.map((entry) =>
    planRollbackEntry(entry, repoRoot),
  );
  const blockedErrors = entries
    .filter((entry) => entry.action === 'blocked')
    .map((entry) => createIssue(entry.targetPath, entry.reason));
  const yesErrors =
    mode === 'write' && !options.yes
      ? [
          createIssue(
            'yes',
            'OpenForge rollback write mode requires explicit --yes confirmation.',
          ),
        ]
      : [];

  return {
    manifest: loaded.manifest,
    mode,
    entries,
    warnings: [],
    errors: [...loaded.errors, ...blockedErrors, ...yesErrors],
  };
}

function rollbackWrittenFiles(rollbacks: readonly FileRollback[]): void {
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

function writeAudit(
  repoRoot: string,
  manifestPath: string,
  command: string,
  plan: OpenForgeRollbackPlan,
  rollbacks: FileRollback[],
): { audit: OpenForgeRollbackAudit; auditPath: string } {
  const auditPath = rollbackAuditPathFor(plan.manifest);
  const absoluteAuditPath = getAbsoluteRepoPath(repoRoot, auditPath);

  if (!absoluteAuditPath) {
    throw new Error(`Rollback audit escaped repo root: ${auditPath}`);
  }

  const audit: OpenForgeRollbackAudit = {
    id: rollbackAuditId(plan.manifest.id),
    createdAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
    command,
    manifestPath,
    manifestId: plan.manifest.id,
    moduleCode: plan.manifest.moduleCode,
    templateVersion: plan.manifest.templateVersion,
    entries: plan.entries,
  };
  const existedBefore = existsSync(absoluteAuditPath);
  const beforeContent = existedBefore
    ? readFileSync(absoluteAuditPath, 'utf8')
    : undefined;

  rollbacks.push({
    absolutePath: absoluteAuditPath,
    existedBefore,
    beforeContent,
  });
  mkdirSync(dirname(absoluteAuditPath), { recursive: true });
  writeFileSync(absoluteAuditPath, `${JSON.stringify(audit, null, 2)}\n`);

  return {
    audit,
    auditPath,
  };
}

function applyRollbackPlan(
  repoRoot: string,
  manifestPath: string,
  command: string,
  plan: OpenForgeRollbackPlan,
): OpenForgeRollbackResult {
  const rollbacks: FileRollback[] = [];

  try {
    for (const entry of plan.entries) {
      const manifestEntry = plan.manifest.entries.find(
        (candidate) => candidate.targetPath === entry.targetPath,
      );

      if (!manifestEntry || entry.action === 'skip') {
        continue;
      }

      const absolutePath = getAbsoluteRepoPath(repoRoot, entry.targetPath);

      if (!absolutePath) {
        throw new Error(`Target escaped repo root: ${entry.targetPath}`);
      }

      if (entry.action === 'delete') {
        const beforeContent = readFileSync(absolutePath, 'utf8');

        rollbacks.push({
          absolutePath,
          existedBefore: true,
          beforeContent,
        });
        rmSync(absolutePath);
        continue;
      }

      if (entry.action === 'restore') {
        const backup = readBackupContent(manifestEntry, repoRoot);

        if (backup.error || backup.content === undefined) {
          throw new Error(backup.error?.reason ?? 'Rollback backup missing.');
        }

        const beforeContent = readFileSync(absolutePath, 'utf8');

        rollbacks.push({
          absolutePath,
          existedBefore: true,
          beforeContent,
        });
        writeFileSync(absolutePath, backup.content);

        if (
          manifestEntry.beforeHash &&
          createStableHash(readFileSync(absolutePath, 'utf8')) !==
            manifestEntry.beforeHash
        ) {
          throw new Error(
            `Restore verification failed for ${entry.targetPath}`,
          );
        }
      }
    }

    const audit = writeAudit(repoRoot, manifestPath, command, plan, rollbacks);

    return {
      mode: 'write',
      rolledBack: true,
      entries: plan.entries,
      manifest: plan.manifest,
      auditPath: audit.auditPath,
      audit: audit.audit,
      warnings: plan.warnings,
      errors: [],
    };
  } catch (error) {
    rollbackWrittenFiles(rollbacks);

    return {
      mode: 'write',
      rolledBack: false,
      entries: plan.entries,
      manifest: plan.manifest,
      warnings: plan.warnings,
      errors: [
        createIssue(
          'rollback',
          error instanceof Error ? error.message : 'OpenForge rollback failed.',
        ),
      ],
    };
  }
}

export function rollbackOpenForge(
  options: RollbackOpenForgeOptions,
): OpenForgeRollbackResult {
  const mode = options.mode ?? 'dry-run';
  const command = options.command ?? 'pnpm openforge:rollback';
  const plan = buildRollbackPlan({
    ...options,
    mode,
  });

  if (plan.errors.length > 0) {
    return {
      mode,
      rolledBack: false,
      entries: plan.entries,
      manifest: plan.manifest,
      warnings: plan.warnings,
      errors: plan.errors,
    };
  }

  if (mode === 'dry-run') {
    return {
      mode,
      rolledBack: false,
      entries: plan.entries,
      manifest: plan.manifest,
      warnings: plan.warnings,
      errors: [],
    };
  }

  return applyRollbackPlan(
    repoRootFor(options.repoRoot),
    options.manifestPath,
    command,
    plan,
  );
}

export function listOpenForgeManifests(options?: {
  repoRoot?: string;
}): OpenForgeManifestListResult {
  const repoRoot = repoRootFor(options?.repoRoot);
  const manifestDirectory = resolve(repoRoot, '.openforge/manifests');

  if (!existsSync(manifestDirectory)) {
    return {
      manifests: [],
      warnings: [],
      errors: [],
    };
  }

  const manifests = readdirSync(manifestDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
    .flatMap((fileName): OpenForgeManifestListEntry[] => {
      const manifestPath = `.openforge/manifests/${fileName}`;
      const loaded = loadManifest(repoRoot, manifestPath);

      if (!loaded.manifest) {
        return [];
      }

      return [
        {
          id: loaded.manifest.id,
          path: manifestPath,
          createdAt: loaded.manifest.createdAt,
          moduleCode: loaded.manifest.moduleCode,
          templateVersion: loaded.manifest.templateVersion,
          entryCount: loaded.manifest.entries.length,
        },
      ];
    });

  return {
    manifests,
    warnings: [],
    errors: [],
  };
}

export function showOpenForgeManifest(options: {
  manifestIdOrPath: string;
  repoRoot?: string;
}): OpenForgeManifestShowResult {
  const repoRoot = repoRootFor(options.repoRoot);
  const manifestPath = options.manifestIdOrPath.includes('/')
    ? options.manifestIdOrPath
    : `.openforge/manifests/${
        options.manifestIdOrPath.endsWith('.json')
          ? options.manifestIdOrPath
          : `${options.manifestIdOrPath}.json`
      }`;
  const loaded = loadManifest(repoRoot, manifestPath);

  return {
    manifestPath,
    manifest: loaded.manifest,
    warnings: [],
    errors: loaded.errors,
  };
}
