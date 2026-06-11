import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  compareOpenApiDocuments,
  type OpenApiDocumentLike,
} from './openapi-drift';
import { DEFAULT_OPENAPI_OUTPUT, writeOpenApiSnapshot } from './export-openapi';
import { checkRegistryOpenApiTags } from './check-registry-tags';

async function checkOpenApiDrift(): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'opencore-openapi-'));
  const actualPath = join(tempDir, 'opencore-api.json');

  try {
    await writeOpenApiSnapshot(actualPath);
    const expectedPath = resolve(process.cwd(), DEFAULT_OPENAPI_OUTPUT);
    const [expected, actual] = await Promise.all([
      readJson(expectedPath),
      readJson(actualPath),
    ]);
    const result = compareOpenApiDocuments(expected, actual);

    if (result.status === 'drift') {
      process.stderr.write(
        `OpenAPI drift detected:\n${result.diffSummary.join('\n')}\n`,
      );
      process.exitCode = 1;
      return;
    }

    await checkRegistryOpenApiTags(expectedPath);
    process.stdout.write('OpenAPI snapshot is clean.\n');
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

async function readJson(path: string): Promise<OpenApiDocumentLike> {
  return JSON.parse(await readFile(path, 'utf8')) as OpenApiDocumentLike;
}

void checkOpenApiDrift();
