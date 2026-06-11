import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listModules } from '@opencore/module-registry';
import { DEFAULT_OPENAPI_OUTPUT } from './export-openapi';

type OpenApiOperation = {
  tags?: readonly string[];
};

type OpenApiDocument = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
  tags?: readonly { name: string }[];
};

const ALLOWED_EXTERNAL_TAGS = new Set([
  'Auth',
  'Collaboration',
  'Health',
  'Integration',
  'Monitoring',
  'Operations',
  'Rbac',
  'SystemManagement',
  'Tooling',
]);

export async function checkRegistryOpenApiTags(
  path = resolve(process.cwd(), DEFAULT_OPENAPI_OUTPUT),
): Promise<void> {
  const document = JSON.parse(await readFile(path, 'utf8')) as OpenApiDocument;
  const registryTagToModules = new Map<string, string[]>();

  for (const moduleDefinition of listModules()) {
    for (const tag of moduleDefinition.apiTags) {
      registryTagToModules.set(tag, [
        ...(registryTagToModules.get(tag) ?? []),
        moduleDefinition.code,
      ]);
    }
  }

  const declaredOpenApiTags = new Set(
    (document.tags ?? []).map((tag) => tag.name),
  );
  const operationTagPaths = collectOperationTagPaths(document);
  const issues: string[] = [];

  for (const [tag, modules] of registryTagToModules.entries()) {
    if (!declaredOpenApiTags.has(tag)) {
      issues.push(
        `missing-openapi-tag tag=${tag} modules=${modules.join(',')}`,
      );
    }
  }

  for (const [tag, paths] of operationTagPaths.entries()) {
    if (!registryTagToModules.has(tag) && !ALLOWED_EXTERNAL_TAGS.has(tag)) {
      issues.push(
        `unregistered-operation-tag tag=${tag} paths=${paths.join(',')}`,
      );
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Registry/OpenAPI tag drift detected:\n${issues.join('\n')}`,
    );
  }
}

function collectOperationTagPaths(
  document: OpenApiDocument,
): Map<string, string[]> {
  const tagPaths = new Map<string, string[]>();

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      for (const tag of operation.tags ?? []) {
        tagPaths.set(tag, [
          ...(tagPaths.get(tag) ?? []),
          `${method.toUpperCase()} ${path}`,
        ]);
      }
    }
  }

  return tagPaths;
}

if (require.main === module) {
  checkRegistryOpenApiTags()
    .then(() => {
      process.stdout.write('Registry/OpenAPI tags are clean.\n');
    })
    .catch((error: unknown) => {
      process.stderr.write(
        error instanceof Error ? error.message : String(error),
      );
      process.stderr.write('\n');
      process.exitCode = 1;
    });
}
