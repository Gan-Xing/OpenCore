import type { IncomingMessage, ServerResponse } from 'node:http';
import { createSecurityHeadersMiddleware } from './security';

describe('createSecurityHeadersMiddleware', () => {
  it('sets baseline security headers', () => {
    const response = {
      setHeader: jest.fn(),
    } as unknown as ServerResponse & { setHeader: jest.Mock };
    const next = jest.fn();

    createSecurityHeadersMiddleware()({} as IncomingMessage, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(response.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'no-referrer',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
