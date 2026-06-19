import { describe, expect, it } from 'vitest';
import { getSafeRedirectTarget } from './index';

describe('getSafeRedirectTarget', () => {
  it('redirects internal paths and preserves query and hash', () => {
    expect(
      getSafeRedirectTarget('/redirect/dashboard', '?tab=workbench', '#top'),
    ).toBe('/dashboard?tab=workbench#top');
  });

  it('adds the leading slash for route path segments', () => {
    expect(getSafeRedirectTarget('/redirect/system/users')).toBe(
      '/system/users',
    );
  });

  it('falls back to dashboard when no target is present', () => {
    expect(getSafeRedirectTarget('/redirect')).toBe('/dashboard');
  });

  it('rejects protocol-relative targets', () => {
    expect(getSafeRedirectTarget('/redirect//evil.com')).toBe('/404');
    expect(getSafeRedirectTarget('/redirect/%2F%2Fevil.com')).toBe('/404');
  });

  it('rejects protocol targets even when they are nested under redirect', () => {
    expect(getSafeRedirectTarget('/redirect/https://evil.com')).toBe('/404');
    expect(getSafeRedirectTarget('/redirect/http:%2F%2Fevil.com')).toBe('/404');
  });
});
