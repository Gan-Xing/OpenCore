export type NodeEnvironment = 'development' | 'test' | 'production';

export type RuntimeConfig = {
  nodeEnv: NodeEnvironment;
  port: number;
  globalPrefix: string;
  serviceName: 'opencore-api';
  corsOrigins: readonly string[];
  swaggerEnabled: boolean;
  swaggerPath: `${string}/docs`;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  authTokenSecret: string;
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

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const issues: string[] = [];
  const nodeEnv = parseNodeEnv(env.NODE_ENV, issues);
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

  validateProductionSafety(
    {
      corsOrigins,
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
    port,
    globalPrefix,
    serviceName: 'opencore-api',
    corsOrigins,
    swaggerEnabled,
    swaggerPath: `${globalPrefix}/docs`,
    logLevel,
    authTokenSecret,
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
