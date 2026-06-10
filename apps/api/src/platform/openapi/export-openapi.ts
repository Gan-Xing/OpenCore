import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { format } from 'prettier';
import { AppModule } from '../../app/app.module';
import { loadRuntimeConfig } from '../config/runtime-config';
import { applyApiFoundation } from '../setup/apply-api-foundation';
import { createOpenApiDocument } from './openapi';

export const DEFAULT_OPENAPI_OUTPUT =
  'packages/contracts/openapi/opencore-api.json';

export async function writeOpenApiSnapshot(
  outputPath = resolve(
    process.cwd(),
    process.env.OPENAPI_OUTPUT_PATH ?? DEFAULT_OPENAPI_OUTPUT,
  ),
): Promise<string> {
  const config = loadRuntimeConfig({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'test',
  });
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  applyApiFoundation(app, config);
  await app.init();

  const document = createOpenApiDocument(app);
  const formattedDocument = await format(JSON.stringify(document), {
    parser: 'json',
  });

  await mkdir(dirname(outputPath), {
    recursive: true,
  });
  await writeFile(outputPath, formattedDocument);
  await app.close();

  return outputPath;
}

async function exportOpenApi(): Promise<void> {
  const outputPath = await writeOpenApiSnapshot();
  process.stdout.write(`OpenAPI exported to ${outputPath}\n`);
}

if (require.main === module) {
  void exportOpenApi();
}
