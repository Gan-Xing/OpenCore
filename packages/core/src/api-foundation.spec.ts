import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createDuplicateGlobalPrefixMiddleware,
  normalizeDuplicateGlobalPrefixUrl,
} from './api-foundation';

describe('api foundation duplicate global prefix compatibility', () => {
  it('normalizes duplicated API prefixes before Nest route matching', () => {
    expect(
      normalizeDuplicateGlobalPrefixUrl('/api/api/auth/login', 'api'),
    ).toBe('/api/auth/login');
    expect(
      normalizeDuplicateGlobalPrefixUrl(
        '/api/api/api/auth/login?next=%2Fdashboard',
        '/api/',
      ),
    ).toBe('/api/auth/login?next=%2Fdashboard');
  });

  it('leaves unrelated paths untouched', () => {
    expect(normalizeDuplicateGlobalPrefixUrl('/api/auth/login', 'api')).toBe(
      '/api/auth/login',
    );
    expect(normalizeDuplicateGlobalPrefixUrl('/health/live', 'api')).toBe(
      '/health/live',
    );
    expect(normalizeDuplicateGlobalPrefixUrl('/v1/api/api', 'api')).toBe(
      '/v1/api/api',
    );
  });

  it('rewrites the incoming request url and continues middleware execution', () => {
    const middleware = createDuplicateGlobalPrefixMiddleware('api');
    const request = {
      url: '/api/api/auth/login',
    } as IncomingMessage;
    const next = jest.fn();

    middleware(request, {} as ServerResponse, next);

    expect(request.url).toBe('/api/auth/login');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
