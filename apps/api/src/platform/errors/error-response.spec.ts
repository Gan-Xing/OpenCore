import { BadRequestException } from '@nestjs/common';
import { toApiErrorResponse } from './error-response';

describe('toApiErrorResponse', () => {
  it('formats Nest HTTP exceptions consistently', () => {
    expect(
      toApiErrorResponse(new BadRequestException('Invalid payload'), {
        path: '/api/example',
        context: {
          requestId: 'req-1',
          traceId: 'trace-1',
        },
        timestamp: '2026-06-10T00:00:00.000Z',
      }),
    ).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid payload',
        statusCode: 400,
        path: '/api/example',
        requestId: 'req-1',
        traceId: 'trace-1',
        timestamp: '2026-06-10T00:00:00.000Z',
      },
    });
  });

  it('hides unknown exception shapes behind a stable server error code', () => {
    expect(
      toApiErrorResponse(
        { unexpected: true },
        {
          timestamp: '2026-06-10T00:00:00.000Z',
        },
      ),
    ).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
        statusCode: 500,
        timestamp: '2026-06-10T00:00:00.000Z',
      },
    });
  });
});
