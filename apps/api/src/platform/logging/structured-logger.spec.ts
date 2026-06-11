import { createStructuredLogEntry } from './structured-logger';
import { runWithRequestContext } from '../request-context/request-context';
import { StructuredLogger } from './structured-logger';

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

  it('uses the active request context when logging without explicit context', () => {
    const logger = new StructuredLogger('opencore-api');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    runWithRequestContext(
      {
        requestId: 'req-active',
        traceId: 'trace-active',
      },
      () => logger.info('request.complete'),
    );

    expect(JSON.parse(String(consoleSpy.mock.calls[0][0]))).toMatchObject({
      message: 'request.complete',
      requestId: 'req-active',
      traceId: 'trace-active',
    });
    consoleSpy.mockRestore();
  });
});
