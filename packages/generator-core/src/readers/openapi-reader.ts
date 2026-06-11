import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type OpenForgeOpenApiOperation = {
  path: string;
  method: string;
  operationId?: string;
  tags: readonly string[];
};

export type OpenForgeOpenApiSnapshot = {
  snapshotPath: string;
  raw: unknown;
  paths: readonly string[];
  operations: readonly OpenForgeOpenApiOperation[];
  tags: readonly string[];
  schemas: readonly string[];
};

const HTTP_METHODS = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export function readOpenApiSnapshot(
  snapshotPath = 'packages/contracts/openapi/opencore-api.json',
): OpenForgeOpenApiSnapshot {
  const absolutePath = resolve(process.cwd(), snapshotPath);
  const raw = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
  const pathsRecord = isRecord(raw) && isRecord(raw.paths) ? raw.paths : {};
  const operations: OpenForgeOpenApiOperation[] = [];
  const tags = new Set<string>();

  for (const [pathName, pathDefinition] of Object.entries(pathsRecord)) {
    if (!isRecord(pathDefinition)) {
      continue;
    }

    for (const [method, operationDefinition] of Object.entries(
      pathDefinition,
    )) {
      if (!HTTP_METHODS.has(method) || !isRecord(operationDefinition)) {
        continue;
      }

      const operationTags = extractStringArray(operationDefinition.tags);

      for (const tag of operationTags) {
        tags.add(tag);
      }

      operations.push({
        path: pathName,
        method,
        operationId:
          typeof operationDefinition.operationId === 'string'
            ? operationDefinition.operationId
            : undefined,
        tags: operationTags,
      });
    }
  }

  const schemas =
    isRecord(raw) &&
    isRecord(raw.components) &&
    isRecord(raw.components.schemas)
      ? Object.keys(raw.components.schemas).sort()
      : [];

  return {
    snapshotPath,
    raw,
    paths: Object.keys(pathsRecord).sort(),
    operations: operations.sort((left, right) =>
      `${left.path}:${left.method}`.localeCompare(
        `${right.path}:${right.method}`,
      ),
    ),
    tags: [...tags].sort(),
    schemas,
  };
}
