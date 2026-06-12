import type { IncomingMessage, ServerResponse } from 'node:http';
import { getRequestContext } from './request-context';
import { createRequestContextMiddleware } from './request-context.middleware';

describe('createRequestContextMiddleware', () => {
  it('uses incoming request and trace ids when present', () => {
    const middleware = createRequestContextMiddleware();
    const response = createResponseMock();
    let capturedContext = getRequestContext();

    middleware(
      {
        headers: {
          'x-request-id': 'req-1',
          'x-trace-id': 'trace-1',
        },
      } as IncomingMessage,
      response,
      () => {
        capturedContext = getRequestContext();
      },
    );

    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'req-1');
    expect(response.setHeader).toHaveBeenCalledWith('x-trace-id', 'trace-1');
    expect(capturedContext).toEqual({
      requestId: 'req-1',
      traceId: 'trace-1',
    });
  });

  it('generates a request id and reuses it as trace id when headers are absent', () => {
    const middleware = createRequestContextMiddleware();
    const response = createResponseMock();
    let capturedContext = getRequestContext();

    middleware({ headers: {} } as IncomingMessage, response, () => {
      capturedContext = getRequestContext();
    });

    expect(capturedContext?.requestId).toEqual(expect.any(String));
    expect(capturedContext?.traceId).toBe(capturedContext?.requestId);
  });
});

function createResponseMock(): ServerResponse & {
  setHeader: jest.Mock;
} {
  return {
    setHeader: jest.fn(),
  } as unknown as ServerResponse & { setHeader: jest.Mock };
}
