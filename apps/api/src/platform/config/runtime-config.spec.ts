import { loadRuntimeConfig, RuntimeConfigError } from './runtime-config';

const VALID_PRODUCTION_ENV = {
  NODE_ENV: 'production',
  CORS_ORIGINS: 'https://admin.opencore.local',
  AUTH_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
  DATABASE_URL:
    'postgresql://opencore_app:strong-password@postgres:5432/opencore?schema=public',
  REDIS_URL: 'redis://redis:6379/2',
  REDIS_KEY_PREFIX: 'opencore:',
  BULLMQ_QUEUE_PREFIX: 'opencore',
  S3_ENDPOINT: 'http://minio:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'opencore',
  S3_PREFIX: 'runtime/',
  S3_ACCESS_KEY_ID: 'opencore-runtime-access',
  S3_SECRET_ACCESS_KEY: 'opencore-runtime-secret',
  S3_FORCE_PATH_STYLE: 'true',
} satisfies NodeJS.ProcessEnv;

describe('loadRuntimeConfig', () => {
  it('loads safe development defaults', () => {
    expect(loadRuntimeConfig({})).toMatchObject({
      nodeEnv: 'development',
      host: undefined,
      port: 3000,
      globalPrefix: 'api',
      serviceName: 'opencore-api',
      swaggerEnabled: true,
      swaggerPath: 'api/docs',
      logLevel: 'info',
      authTokenSecret: 'opencore-development-auth-token-secret',
      databaseUrl:
        'postgresql://opencore_app:opencore_local_password@localhost:5432/opencore?schema=public',
      redis: {
        url: 'redis://localhost:6379/1',
        keyPrefix: 'opencore:',
      },
      bullmq: {
        queuePrefix: 'opencore',
      },
      s3: {
        endpoint: 'http://localhost:9002',
        region: 'us-east-1',
        bucket: 'opencore',
        prefix: 'runtime/',
        accessKeyId: 'opencore-local-access-key',
        secretAccessKey: 'opencore-local-secret-key',
        forcePathStyle: true,
      },
    });
  });

  it('loads an explicit API listen host', () => {
    expect(
      loadRuntimeConfig({
        API_HOST: '127.0.0.1',
      }).host,
    ).toBe('127.0.0.1');

    expect(
      loadRuntimeConfig({
        OPENCORE_API_HOST: '100.125.203.64',
      }).host,
    ).toBe('100.125.203.64');
  });

  it('fails fast on dangerous production CORS', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: '*',
      }),
    ).toThrow(RuntimeConfigError);
  });

  it('requires an explicit acknowledgement before exposing Swagger in production', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://admin.opencore.local',
        API_SWAGGER_ENABLED: 'true',
      }),
    ).toThrow(
      'API_SWAGGER_PUBLIC_ACK=true is required to expose Swagger in production',
    );

    expect(
      loadRuntimeConfig({
        ...VALID_PRODUCTION_ENV,
        API_SWAGGER_ENABLED: 'true',
        API_SWAGGER_PUBLIC_ACK: 'true',
      }).swaggerEnabled,
    ).toBe(true);
  });

  it('requires a strong auth token secret in production', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://admin.opencore.local',
        AUTH_TOKEN_SECRET: 'short',
      }),
    ).toThrow('AUTH_TOKEN_SECRET must be at least 32 characters in production');
  });

  it('requires real runtime infrastructure variables in production', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://admin.opencore.local',
        AUTH_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
      }),
    ).toThrow('DATABASE_URL must be set in production');
  });

  it('rejects placeholder runtime values in production', () => {
    expect(() =>
      loadRuntimeConfig({
        ...VALID_PRODUCTION_ENV,
        DATABASE_URL:
          'postgresql://opencore_app:opencore_local_password@localhost:5432/opencore',
      }),
    ).toThrow('DATABASE_URL must not use a placeholder value in production');
  });

  it('rejects NestWeb runtime prefixes for OpenCore isolation', () => {
    expect(() =>
      loadRuntimeConfig({
        ...VALID_PRODUCTION_ENV,
        REDIS_KEY_PREFIX: 'nestweb:',
      }),
    ).toThrow('REDIS_KEY_PREFIX must not reuse a NestWeb prefix');

    expect(() =>
      loadRuntimeConfig({
        ...VALID_PRODUCTION_ENV,
        S3_BUCKET: 'nestweb',
      }),
    ).toThrow('S3_BUCKET must not reuse a NestWeb bucket');
  });
});
