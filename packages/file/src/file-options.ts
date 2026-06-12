import { resolve } from 'node:path';
import { loadLocalFileEnv } from './env';
import { normalizeObjectPrefix } from './file-key';

export type FileStorageDriver = 'local' | 's3';

export type FileStorageLocalOptions = {
  rootPath: string;
};

export type FileStorageS3Options = {
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type FileStorageOptions = {
  driver: FileStorageDriver;
  objectPrefix: string;
  local: FileStorageLocalOptions;
  s3: FileStorageS3Options;
};

export class FileStorageOptionsError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid file storage configuration: ${issues.join('; ')}`);
    this.name = 'FileStorageOptionsError';
  }
}

export const DEFAULT_FILE_STORAGE_DRIVER: FileStorageDriver = 'local';
export const DEFAULT_FILE_STORAGE_ROOT = '.opencore/storage';
export const DEFAULT_S3_ENDPOINT = 'http://localhost:9002';
export const DEFAULT_S3_REGION = 'us-east-1';
export const DEFAULT_S3_BUCKET = 'opencore';
export const DEFAULT_S3_PREFIX = 'runtime/';
export const DEFAULT_S3_ACCESS_KEY_ID = 'opencore-local-access-key';
export const DEFAULT_S3_SECRET_ACCESS_KEY = 'opencore-local-secret-key';

export const FILE_STORAGE_OPTIONS = Symbol('FILE_STORAGE_OPTIONS');

export function readFileStorageOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): FileStorageOptions {
  if (env === process.env) {
    loadLocalFileEnv(env);
  }

  const issues: string[] = [];
  const driver = parseStorageDriver(env.FILE_STORAGE_DRIVER, issues);
  const prefix = parseStoragePrefix(env.S3_PREFIX, DEFAULT_S3_PREFIX, issues);
  const options = {
    driver,
    objectPrefix: prefix,
    local: {
      rootPath: parseLocalRoot(env.FILE_STORAGE_LOCAL_ROOT),
    },
    s3: {
      endpoint: parseRuntimeUrl(
        env.S3_ENDPOINT,
        DEFAULT_S3_ENDPOINT,
        'S3_ENDPOINT',
        ['http:', 'https:'],
        issues,
      ),
      region: parseRequiredRuntimeValue(env.S3_REGION, DEFAULT_S3_REGION),
      bucket: parseS3Bucket(env.S3_BUCKET, DEFAULT_S3_BUCKET, issues),
      prefix,
      accessKeyId: parseRequiredRuntimeValue(
        env.S3_ACCESS_KEY_ID,
        DEFAULT_S3_ACCESS_KEY_ID,
      ),
      secretAccessKey: parseRequiredRuntimeValue(
        env.S3_SECRET_ACCESS_KEY,
        DEFAULT_S3_SECRET_ACCESS_KEY,
      ),
      forcePathStyle: parseBoolean(env.S3_FORCE_PATH_STYLE, true, issues),
    },
  } satisfies FileStorageOptions;

  if (issues.length > 0) {
    throw new FileStorageOptionsError(issues);
  }

  return options;
}

function parseStorageDriver(
  value: string | undefined,
  issues: string[],
): FileStorageDriver {
  const candidate = (value ?? DEFAULT_FILE_STORAGE_DRIVER).trim();

  if (candidate === 'local' || candidate === 's3') {
    return candidate;
  }

  issues.push('FILE_STORAGE_DRIVER must be one of local, s3');
  return DEFAULT_FILE_STORAGE_DRIVER;
}

function parseLocalRoot(value: string | undefined): string {
  const candidate =
    value && value.trim().length > 0 ? value.trim() : DEFAULT_FILE_STORAGE_ROOT;

  return resolve(candidate);
}

function parseRuntimeUrl(
  value: string | undefined,
  defaultValue: string,
  name: string,
  allowedProtocols: readonly string[],
  issues: string[],
): string {
  const candidate =
    value && value.trim().length > 0 ? value.trim() : defaultValue;

  try {
    const url = new URL(candidate);
    if (!allowedProtocols.includes(url.protocol)) {
      issues.push(
        `${name} protocol must be one of ${allowedProtocols
          .map((protocol) => protocol.replace(':', ''))
          .join(', ')}`,
      );
    }
  } catch {
    issues.push(`${name} must be a valid URL`);
  }

  return candidate;
}

function parseRequiredRuntimeValue(
  value: string | undefined,
  defaultValue: string,
): string {
  const candidate =
    value && value.trim().length > 0 ? value.trim() : defaultValue;

  return candidate;
}

function parseS3Bucket(
  value: string | undefined,
  defaultValue: string,
  issues: string[],
): string {
  const candidate =
    value && value.trim().length > 0 ? value.trim() : defaultValue;

  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(candidate)) {
    issues.push('S3_BUCKET must be a valid S3 bucket name');
    return defaultValue;
  }

  if (candidate.toLowerCase().includes('nestweb')) {
    issues.push('S3_BUCKET must not reuse a NestWeb bucket');
  }

  return candidate;
}

function parseStoragePrefix(
  value: string | undefined,
  defaultValue: string,
  issues: string[],
): string {
  try {
    return normalizeObjectPrefix(
      value && value.trim().length > 0 ? value.trim() : defaultValue,
    );
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : 'S3_PREFIX is invalid',
    );
    return defaultValue;
  }
}

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
  issues: string[],
): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (['true', '1', 'yes'].includes(value.toLowerCase())) {
    return true;
  }

  if (['false', '0', 'no'].includes(value.toLowerCase())) {
    return false;
  }

  issues.push('S3_FORCE_PATH_STYLE must be a boolean');
  return defaultValue;
}
