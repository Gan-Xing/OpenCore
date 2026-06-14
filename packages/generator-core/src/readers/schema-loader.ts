import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OpenForgeManualSchema } from '@opencore/contracts';

export type LoadedOpenForgeSchema = {
  schemaPath: string;
  schema: OpenForgeManualSchema;
  raw: unknown;
};

export function loadManualSchema(
  schemaPath: string,
  repoRoot = process.cwd(),
): LoadedOpenForgeSchema {
  const absolutePath = resolve(repoRoot, schemaPath);
  const raw = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;

  return {
    schemaPath,
    schema: raw as OpenForgeManualSchema,
    raw,
  };
}
