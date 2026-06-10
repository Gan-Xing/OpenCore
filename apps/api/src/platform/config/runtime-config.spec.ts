import { loadRuntimeConfig, RuntimeConfigError } from './runtime-config';

describe('loadRuntimeConfig', () => {
  it('loads safe development defaults', () => {
    expect(loadRuntimeConfig({})).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      globalPrefix: 'api',
      serviceName: 'opencore-api',
      swaggerEnabled: true,
      swaggerPath: 'api/docs',
      logLevel: 'info',
      authTokenSecret: 'opencore-development-auth-token-secret',
    });
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
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://admin.opencore.local',
        API_SWAGGER_ENABLED: 'true',
        API_SWAGGER_PUBLIC_ACK: 'true',
        AUTH_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
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
});
