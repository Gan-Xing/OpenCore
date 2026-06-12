import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DEFAULT_DATABASE_URL =
  'postgresql://opencore_app:opencore_local_password@localhost:5432/opencore?schema=public';
export const LOCAL_DATABASE_ENV_FILE = '.env.opencore.local';

export const DATABASE_OPTIONS = Symbol('OPENCORE_DATABASE_OPTIONS');

export type DatabaseOptions = {
  databaseUrl: string;
};

export function readDatabaseOptionsFromEnv(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): DatabaseOptions {
  if (env === process.env) {
    loadLocalDatabaseEnv();
  }

  return {
    databaseUrl:
      env.DATABASE_URL && env.DATABASE_URL.trim().length > 0
        ? env.DATABASE_URL.trim()
        : DEFAULT_DATABASE_URL,
  };
}

export function loadLocalDatabaseEnv(startDirectory = process.cwd()): void {
  const envPath = findLocalDatabaseEnvPath(startDirectory);

  if (!envPath) {
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

function findLocalDatabaseEnvPath(startDirectory: string): string | undefined {
  let directory = startDirectory;

  while (true) {
    const candidate = resolve(directory, LOCAL_DATABASE_ENV_FILE);

    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(directory);

    if (parent === directory) {
      return undefined;
    }

    directory = parent;
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
