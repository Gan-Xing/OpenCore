import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function loadLocalFileEnv(env: NodeJS.ProcessEnv = process.env): void {
  const envPath = findLocalEnvPath();

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

    if (!env[key]) {
      env[key] = value;
    }
  }
}

function findLocalEnvPath(): string | undefined {
  let directory = process.cwd();

  while (true) {
    const candidate = resolve(directory, '.env.opencore.local');

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
