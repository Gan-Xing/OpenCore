import { getTenantHost } from './auth.controller';

describe('AuthController tenant host resolution', () => {
  it('prefers the first forwarded host value', () => {
    expect(
      getTenantHost({
        host: 'root.opencore.test',
        'x-forwarded-host': 'beta.opencore.test, proxy.opencore.test',
      }),
    ).toBe('beta.opencore.test');
  });

  it('falls back to the request host header', () => {
    expect(
      getTenantHost({
        host: ['root.opencore.test'],
      }),
    ).toBe('root.opencore.test');
  });

  it('returns undefined when no host header is present', () => {
    expect(getTenantHost({})).toBeUndefined();
  });
});
