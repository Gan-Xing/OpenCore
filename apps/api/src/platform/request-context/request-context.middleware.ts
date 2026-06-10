import { randomUUID } from 'node:crypto';
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import { runWithRequestContext } from './request-context';

const REQUEST_ID_HEADER = 'x-request-id';
const TRACE_ID_HEADER = 'x-trace-id';

export type RequestContextMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void;

export function createRequestContextMiddleware(): RequestContextMiddleware {
  return (request, response, next) => {
    const requestId =
      getHeaderValue(request.headers, REQUEST_ID_HEADER) ?? randomUUID();
    const traceId =
      getHeaderValue(request.headers, TRACE_ID_HEADER) ?? requestId;

    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.setHeader(TRACE_ID_HEADER, traceId);

    runWithRequestContext(
      {
        requestId,
        traceId,
      },
      next,
    );
  };
}

function getHeaderValue(
  headers: IncomingHttpHeaders,
  headerName: typeof REQUEST_ID_HEADER | typeof TRACE_ID_HEADER,
): string | undefined {
  const value = headers[headerName];

  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return undefined;
}
