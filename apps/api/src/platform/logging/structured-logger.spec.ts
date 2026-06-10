import { createStructuredLogEntry } from './structured-logger';

describe('createStructuredLogEntry', () => {
  it('includes stable service, level, and request context fields', () => {
    expect(
      createStructuredLogEntry({
        service: 'opencore-api',
        level: 'info',
        message: 'api.ready',
        context: {
          port: 3000,
        },
        requestContext: {
          requestId: 'req-1',
          traceId: 'trace-1',
        },
        timestamp: '2026-06-10T00:00:00.000Z',
      }),
    ).toEqual({
      timestamp: '2026-06-10T00:00:00.000Z',
      level: 'info',
      service: 'opencore-api',
      message: 'api.ready',
      requestId: 'req-1',
      traceId: 'trace-1',
      context: {
        port: 3000,
      },
    });
  });
});
