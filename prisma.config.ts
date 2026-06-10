import { defineConfig } from 'prisma/config';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadLocalPrismaEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://opencore_app:opencore_local_password@localhost:5432/opencore?schema=public',
  },
});

function loadLocalPrismaEnv(): void {
  const envPath = resolve(process.cwd(), '.env.opencore.local');

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripEnvQuotes(trimmed.slice(separatorIndex + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
