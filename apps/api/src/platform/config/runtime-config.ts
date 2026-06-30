import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type NodeEnvironment = 'development' | 'test' | 'production';

export type RuntimeConfig = {
  nodeEnv: NodeEnvironment;
  host: string | undefined;
  port: number;
  globalPrefix: string;
  serviceName: 'opencore-api';
  corsOrigins: readonly string[];
  swaggerEnabled: boolean;
  swaggerPath: `${string}/docs`;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  authTokenSecret: string;
  databaseUrl: string;
  redis: RuntimeRedisConfig;
  bullmq: RuntimeBullmqConfig;
  s3: RuntimeS3Config;
};

export type RuntimeRedisConfig = {
  url: string;
  keyPrefix: string;
};

export type RuntimeBullmqConfig = {
  queuePrefix: string;
};

export type RuntimeS3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export class RuntimeConfigError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid runtime configuration: ${issues.join('; ')}`);
    this.name = 'RuntimeConfigError';
  }
}

const NODE_ENVIRONMENTS: readonly NodeEnvironment[] = [
  'development',
  'test',
  'production',
];

const LOG_LEVELS: readonly RuntimeConfig['logLevel'][] = [
  'debug',
  'info',
  'warn',
  'error',
];

const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:8000',
  'http://localhost:5173',
  'http://localhost:3000',
] as const;

const DEFAULT_DEV_DATABASE_URL =
  'postgresql://opencore_app:opencore_local_password@localhost:5432/opencore?schema=public';
const DEFAULT_DEV_REDIS_URL = 'redis://localhost:6379/1';
const DEFAULT_REDIS_KEY_PREFIX = 'opencore:';
const DEFAULT_BULLMQ_QUEUE_PREFIX = 'opencore';
const DEFAULT_S3_ENDPOINT = 'http://localhost:9002';
const DEFAULT_S3_REGION = 'us-east-1';
const DEFAULT_S3_BUCKET = 'opencore';
const DEFAULT_S3_PREFIX = 'runtime/';
const DEFAULT_S3_ACCESS_KEY_ID = 'opencore-local-access-key';
const DEFAULT_S3_SECRET_ACCESS_KEY = 'opencore-local-secret-key';

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  if (env === process.env) {
    loadLocalRuntimeEnv();
  }

  const issues: string[] = [];
  const nodeEnv = parseNodeEnv(env.NODE_ENV, issues);
  const host = parseHost(env.API_HOST ?? env.OPENCORE_API_HOST, issues);
  const port = parsePort(env.PORT, issues);
  const globalPrefix = parseGlobalPrefix(env.API_GLOBAL_PREFIX, issues);
  const swaggerEnabled = parseBoolean(
    env.API_SWAGGER_ENABLED,
    nodeEnv === 'production' ? false : true,
    'API_SWAGGER_ENABLED',
    issues,
  );
  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS, nodeEnv, issues);
  const logLevel = parseLogLevel(env.LOG_LEVEL, issues);
  const authTokenSecret = parseAuthTokenSecret(
    env.AUTH_TOKEN_SECRET,
    nodeEnv,
    issues,
  );
  const databaseUrl = parseRuntimeUrl(
    env.DATABASE_URL,
    DEFAULT_DEV_DATABASE_URL,
    'DATABASE_URL',
    nodeEnv,
    ['postgresql:', 'postgres:'],
    issues,
  );
  const redis = {
    url: parseRuntimeUrl(
      env.REDIS_URL,
      DEFAULT_DEV_REDIS_URL,
      'REDIS_URL',
      nodeEnv,
      ['redis:', 'rediss:'],
      issues,
    ),
    keyPrefix: parseRuntimePrefix(
      env.REDIS_KEY_PREFIX,
      DEFAULT_REDIS_KEY_PREFIX,
      'REDIS_KEY_PREFIX',
      issues,
    ),
  };
  const bullmq = {
    queuePrefix: parseRuntimePrefix(
      env.BULLMQ_QUEUE_PREFIX,
      DEFAULT_BULLMQ_QUEUE_PREFIX,
      'BULLMQ_QUEUE_PREFIX',
      issues,
    ),
  };
  const s3 = {
    endpoint: parseRuntimeUrl(
      env.S3_ENDPOINT,
      DEFAULT_S3_ENDPOINT,
      'S3_ENDPOINT',
      nodeEnv,
      ['http:', 'https:'],
      issues,
    ),
    region: parseRequiredRuntimeValue(
      env.S3_REGION,
      DEFAULT_S3_REGION,
      'S3_REGION',
      nodeEnv,
      issues,
    ),
    bucket: parseS3Bucket(env.S3_BUCKET, DEFAULT_S3_BUCKET, issues),
    prefix: parseS3Prefix(env.S3_PREFIX, DEFAULT_S3_PREFIX, issues),
    accessKeyId: parseRequiredRuntimeValue(
      env.S3_ACCESS_KEY_ID,
      DEFAULT_S3_ACCESS_KEY_ID,
      'S3_ACCESS_KEY_ID',
      nodeEnv,
      issues,
    ),
    secretAccessKey: parseRequiredRuntimeValue(
      env.S3_SECRET_ACCESS_KEY,
      DEFAULT_S3_SECRET_ACCESS_KEY,
      'S3_SECRET_ACCESS_KEY',
      nodeEnv,
      issues,
    ),
    forcePathStyle: parseBoolean(
      env.S3_FORCE_PATH_STYLE,
      true,
      'S3_FORCE_PATH_STYLE',
      issues,
    ),
  };

  validateProductionSafety(
    {
      corsOrigins,
      databaseUrl,
      redis,
      s3,
      nodeEnv,
      swaggerEnabled,
      swaggerPublicAck: env.API_SWAGGER_PUBLIC_ACK,
    },
    issues,
  );

  if (issues.length > 0) {
    throw new RuntimeConfigError(issues);
  }

  return {
    nodeEnv,
    host,
    port,
    globalPrefix,
    serviceName: 'opencore-api',
    corsOrigins,
    swaggerEnabled,
    swaggerPath: `${globalPrefix}/docs`,
    logLevel,
    authTokenSecret,
    databaseUrl,
    redis,
    bullmq,
    s3,
  };
}

function parseNodeEnv(
  value: string | undefined,
  issues: string[],
): NodeEnvironment {
  const candidate = value ?? 'development';

  if ((NODE_ENVIRONMENTS as readonly string[]).includes(candidate)) {
    return candidate as NodeEnvironment;
  }

  issues.push(`NODE_ENV must be one of ${NODE_ENVIRONMENTS.join(', ')}`);
  return 'development';
}

function parsePort(value: string | undefined, issues: string[]): number {
  const candidate = value ?? '3000';
  const port = Number(candidate);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    issues.push('PORT must be an integer between 1 and 65535');
    return 3000;
  }

  return port;
}

function parseHost(
  value: string | undefined,
  issues: string[],
): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  const candidate = value.trim();
  if (/^[a-zA-Z0-9.:-]+$/.test(candidate)) {
    return candidate;
  }

  issues.push('API_HOST must be a hostname or IP address');
  return undefined;
}

function parseGlobalPrefix(
  value: string | undefined,
  issues: string[],
): string {
  const prefix = value ?? 'api';

  if (!/^[a-z][a-z0-9-]*$/.test(prefix)) {
    issues.push('API_GLOBAL_PREFIX must be a lowercase path segment');
    return 'api';
  }

  return prefix;
}

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
  name: string,
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

  issues.push(`${name} must be a boolean`);
  return defaultValue;
}

function parseCorsOrigins(
  value: string | undefined,
  nodeEnv: NodeEnvironment,
  issues: string[],
): readonly string[] {
  if (!value || value.trim().length === 0) {
    if (nodeEnv === 'production') {
      issues.push('CORS_ORIGINS must be set in production');
      return [];
    }

    return DEFAULT_DEV_CORS_ORIGINS;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    issues.push('CORS_ORIGINS must contain at least one origin');
  }

  return [...new Set(origins)];
}

function parseLogLevel(
  value: string | undefined,
  issues: string[],
): RuntimeConfig['logLevel'] {
  const candidate = value ?? 'info';

  if ((LOG_LEVELS as readonly string[]).includes(candidate)) {
    return candidate as RuntimeConfig['logLevel'];
  }

  issues.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}`);
  return 'info';
}

function validateProductionSafety(
  options: {
    nodeEnv: NodeEnvironment;
    corsOrigins: readonly string[];
    databaseUrl: string;
    redis: RuntimeRedisConfig;
    s3: RuntimeS3Config;
    swaggerEnabled: boolean;
    swaggerPublicAck: string | undefined;
  },
  issues: string[],
): void {
  if (options.nodeEnv !== 'production') {
    return;
  }

  if (options.corsOrigins.includes('*')) {
    issues.push('CORS_ORIGINS must not include * in production');
  }

  if (options.swaggerEnabled && options.swaggerPublicAck !== 'true') {
    issues.push(
      'API_SWAGGER_PUBLIC_ACK=true is required to expose Swagger in production',
    );
  }

  if (isPlaceholderRuntimeValue(options.databaseUrl)) {
    issues.push('DATABASE_URL must not use a placeholder value in production');
  }

  if (isPlaceholderRuntimeValue(options.redis.url)) {
    issues.push('REDIS_URL must not use a placeholder value in production');
  }

  if (isPlaceholderRuntimeValue(options.s3.endpoint)) {
    issues.push('S3_ENDPOINT must not use a placeholder value in production');
  }

  if (isPlaceholderRuntimeValue(options.s3.accessKeyId)) {
    issues.push(
      'S3_ACCESS_KEY_ID must not use a placeholder value in production',
    );
  }

  if (isPlaceholderRuntimeValue(options.s3.secretAccessKey)) {
    issues.push(
      'S3_SECRET_ACCESS_KEY must not use a placeholder value in production',
    );
  }
}

function parseAuthTokenSecret(
  value: string | undefined,
  nodeEnv: NodeEnvironment,
  issues: string[],
): string {
  if (value && value.length >= 32) {
    return value;
  }

  if (nodeEnv === 'production') {
    issues.push(
      'AUTH_TOKEN_SECRET must be at least 32 characters in production',
    );
  }

  return 'opencore-development-auth-token-secret';
}

function parseRuntimeUrl(
  value: string | undefined,
  defaultValue: string,
  name: string,
  nodeEnv: NodeEnvironment,
  allowedProtocols: readonly string[],
  issues: string[],
): string {
  const candidate = value && value.trim().length > 0 ? value.trim() : undefined;

  if (!candidate) {
    if (nodeEnv === 'production') {
      issues.push(`${name} must be set in production`);
    }

    return defaultValue;
  }

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

function parseRuntimePrefix(
  value: string | undefined,
  defaultValue: string,
  name: string,
  issues: string[],
): string {
  const candidate =
    value && value.trim().length > 0 ? value.trim() : defaultValue;

  if (!/^[a-z0-9][a-z0-9:_-]{1,63}$/i.test(candidate)) {
    issues.push(`${name} must be 2-64 characters and contain no spaces`);
    return defaultValue;
  }

  if (candidate.toLowerCase().includes('nestweb')) {
    issues.push(`${name} must not reuse a NestWeb prefix`);
  }

  return candidate;
}

function parseRequiredRuntimeValue(
  value: string | undefined,
  defaultValue: string,
  name: string,
  nodeEnv: NodeEnvironment,
  issues: string[],
): string {
  const candidate = value && value.trim().length > 0 ? value.trim() : undefined;

  if (!candidate) {
    if (nodeEnv === 'production') {
      issues.push(`${name} must be set in production`);
    }

    return defaultValue;
  }

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

function parseS3Prefix(
  value: string | undefined,
  defaultValue: string,
  issues: string[],
): string {
  const candidate =
    value && value.trim().length > 0 ? value.trim() : defaultValue;

  if (candidate.startsWith('/') || candidate.includes('..')) {
    issues.push('S3_PREFIX must be a relative object prefix');
    return defaultValue;
  }

  if (candidate.toLowerCase().includes('nestweb')) {
    issues.push('S3_PREFIX must not reuse a NestWeb prefix');
  }

  return candidate;
}

function isPlaceholderRuntimeValue(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<') ||
    normalized.includes('>') ||
    normalized.includes('change-me') ||
    normalized.includes('local-password') ||
    normalized.includes('opencore_local_password') ||
    normalized.includes('local-opencore') ||
    normalized.includes('opencore-local')
  );
}

function loadLocalRuntimeEnv(): void {
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

    if (!process.env[key]) {
      process.env[key] = value;
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
