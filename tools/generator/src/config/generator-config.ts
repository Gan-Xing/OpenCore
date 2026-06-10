import { readFileSync } from 'node:fs';
import { isAbsolute, normalize, resolve } from 'node:path';
import {
  OPENFORGE_ARTIFACT_KINDS,
  OPENFORGE_V1_TEMPLATE_VERSION,
  type OpenForgeArtifactKind,
  type OpenForgeGeneratorConfig,
  type OpenForgeValidationIssue,
} from '@opencore/contracts';

export const DEFAULT_OPENFORGE_GENERATOR_CONFIG: OpenForgeGeneratorConfig = {
  templatePack: OPENFORGE_V1_TEMPLATE_VERSION,
  templateVersion: OPENFORGE_V1_TEMPLATE_VERSION,
  outputRoot: '.',
  applyMode: 'dry-run',
  overwritePolicy: 'generated-marker-required',
  generatedMarkerRequired: true,
  protectedPaths: [
    '.env',
    '.env.*',
    '.env.opencore.local',
    'prisma/schema.prisma',
    'prisma/migrations/**',
  ],
  manualPatchOnlyPaths: [
    'apps/api/src/app/app.module.ts',
    'apps/admin/.umirc.ts',
    'apps/admin/src/access.ts',
    'packages/module-registry/src/modules.ts',
  ],
  allowedArtifactKinds: OPENFORGE_ARTIFACT_KINDS,
  blockedArtifactKinds: [],
  strictOpenApiTags: false,
  strictPermissionCodes: true,
  outputPolicy: {
    outputRoot: '.',
    allowedArtifactKinds: OPENFORGE_ARTIFACT_KINDS,
    blockedArtifactKinds: [],
  },
  writePolicy: {
    defaultMode: 'dry-run',
    requireExplicitYes: true,
    allowCreate: true,
    allowUpdateGenerated: true,
    blockHumanAuthored: true,
    generatedMarkerRequired: true,
    protectedPaths: [
      '.env',
      '.env.*',
      '.env.opencore.local',
      'prisma/schema.prisma',
      'prisma/migrations/**',
    ],
    manualPatchOnlyPaths: [
      'apps/api/src/app/app.module.ts',
      'apps/admin/.umirc.ts',
      'apps/admin/src/access.ts',
      'packages/module-registry/src/modules.ts',
    ],
    blockedPathPatterns: ['/**', '../**'],
    blockEnvFiles: true,
    blockPrismaSchema: true,
    blockPrismaMigrations: true,
  },
};

export type LoadedOpenForgeGeneratorConfig = {
  configPath?: string;
  config: OpenForgeGeneratorConfig;
  raw: unknown;
};

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

function normalizeRepoPath(pathValue: string): string {
  return normalize(pathValue).replace(/\\/g, '/');
}

function isUnsafeRepoPath(pathValue: string): boolean {
  const normalizedPath = normalizeRepoPath(pathValue);

  return (
    isAbsolute(pathValue) ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    pathValue.split(/[\\/]+/).includes('..')
  );
}

function toStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toArtifactKinds(value: unknown): readonly OpenForgeArtifactKind[] {
  const knownKinds = new Set<string>(OPENFORGE_ARTIFACT_KINDS);

  return toStringArray(value).filter((item): item is OpenForgeArtifactKind =>
    knownKinds.has(item),
  );
}

export function loadOpenForgeGeneratorConfig(
  configPath?: string,
): LoadedOpenForgeGeneratorConfig {
  if (!configPath) {
    return {
      config: DEFAULT_OPENFORGE_GENERATOR_CONFIG,
      raw: DEFAULT_OPENFORGE_GENERATOR_CONFIG,
    };
  }

  const absolutePath = resolve(process.cwd(), configPath);
  const raw = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
  const overrides = isRecord(raw) ? raw : {};
  const outputRoot =
    typeof overrides.outputRoot === 'string'
      ? overrides.outputRoot
      : DEFAULT_OPENFORGE_GENERATOR_CONFIG.outputRoot;
  const allowedArtifactKinds =
    toArtifactKinds(overrides.allowedArtifactKinds).length > 0
      ? toArtifactKinds(overrides.allowedArtifactKinds)
      : DEFAULT_OPENFORGE_GENERATOR_CONFIG.allowedArtifactKinds;
  const blockedArtifactKinds = toArtifactKinds(overrides.blockedArtifactKinds);
  const protectedPaths =
    toStringArray(overrides.protectedPaths).length > 0
      ? toStringArray(overrides.protectedPaths)
      : DEFAULT_OPENFORGE_GENERATOR_CONFIG.protectedPaths;
  const manualPatchOnlyPaths =
    toStringArray(overrides.manualPatchOnlyPaths).length > 0
      ? toStringArray(overrides.manualPatchOnlyPaths)
      : DEFAULT_OPENFORGE_GENERATOR_CONFIG.manualPatchOnlyPaths;
  const applyMode = overrides.applyMode === 'write' ? 'write' : 'dry-run';

  return {
    configPath,
    raw,
    config: {
      ...DEFAULT_OPENFORGE_GENERATOR_CONFIG,
      templatePack:
        typeof overrides.templatePack === 'string'
          ? overrides.templatePack
          : DEFAULT_OPENFORGE_GENERATOR_CONFIG.templatePack,
      templateVersion:
        typeof overrides.templateVersion === 'string'
          ? overrides.templateVersion
          : DEFAULT_OPENFORGE_GENERATOR_CONFIG.templateVersion,
      outputRoot,
      applyMode,
      overwritePolicy:
        overrides.overwritePolicy === 'manual-review' ||
        overrides.overwritePolicy === 'never'
          ? overrides.overwritePolicy
          : DEFAULT_OPENFORGE_GENERATOR_CONFIG.overwritePolicy,
      generatedMarkerRequired:
        typeof overrides.generatedMarkerRequired === 'boolean'
          ? overrides.generatedMarkerRequired
          : DEFAULT_OPENFORGE_GENERATOR_CONFIG.generatedMarkerRequired,
      protectedPaths,
      manualPatchOnlyPaths,
      allowedArtifactKinds,
      blockedArtifactKinds,
      strictOpenApiTags: Boolean(overrides.strictOpenApiTags),
      strictPermissionCodes:
        typeof overrides.strictPermissionCodes === 'boolean'
          ? overrides.strictPermissionCodes
          : DEFAULT_OPENFORGE_GENERATOR_CONFIG.strictPermissionCodes,
      outputPolicy: {
        outputRoot,
        allowedArtifactKinds,
        blockedArtifactKinds,
      },
      writePolicy: {
        ...DEFAULT_OPENFORGE_GENERATOR_CONFIG.writePolicy,
        protectedPaths,
        manualPatchOnlyPaths,
        generatedMarkerRequired: true,
      },
    },
  };
}

export function validateOpenForgeGeneratorConfig(
  config: OpenForgeGeneratorConfig,
): readonly OpenForgeValidationIssue[] {
  const issues: OpenForgeValidationIssue[] = [];

  if (!config.templatePack) {
    issues.push(createIssue('templatePack', 'Template pack is required.'));
  }

  if (!config.templateVersion) {
    issues.push(
      createIssue('templateVersion', 'Template version is required.'),
    );
  }

  if (isUnsafeRepoPath(config.outputRoot)) {
    issues.push(
      createIssue('outputRoot', 'Output root must be repo-relative.'),
    );
  }

  if (!config.generatedMarkerRequired) {
    issues.push(
      createIssue(
        'generatedMarkerRequired',
        'Generated marker must be required for updates.',
      ),
    );
  }

  for (const targetPath of [
    ...config.protectedPaths,
    ...config.manualPatchOnlyPaths,
    ...config.writePolicy.protectedPaths,
    ...config.writePolicy.manualPatchOnlyPaths,
  ]) {
    if (isUnsafeRepoPath(targetPath)) {
      issues.push(
        createIssue(
          targetPath,
          'Config paths must be repo-relative and must not traverse.',
        ),
      );
    }
  }

  return issues;
}
