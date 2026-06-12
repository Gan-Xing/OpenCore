import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import {
  createSuccessResponse,
  isRecord,
  type ApiSuccessResponse,
} from '@opencore/common';
import { map, type Observable } from 'rxjs';
import { getRequestContext } from './request-context';

type HttpRequest = {
  url?: string;
};

type HttpResponse = {
  getHeader?: (name: string) => number | string | readonly string[] | undefined;
  headersSent?: boolean;
};

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  T | ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | ApiSuccessResponse<T>> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();

    return next.handle().pipe(
      map((data) => {
        if (shouldPassThroughResponse(data, response)) {
          return data;
        }

        if (isResponseEnvelope(data)) {
          return data;
        }

        const requestContext = getRequestContext();

        return createSuccessResponse(data, {
          path: request.url,
          requestId: requestContext?.requestId,
          traceId: requestContext?.traceId,
        });
      }),
    );
  }
}

function isResponseEnvelope(value: unknown): value is { success: boolean } {
  return isRecord(value) && typeof value.success === 'boolean';
}

function shouldPassThroughResponse(
  value: unknown,
  response: HttpResponse,
): boolean {
  if (Buffer.isBuffer(value) || response.headersSent) {
    return true;
  }

  const contentType = response.getHeader?.('content-type');
  const normalizedContentType = Array.isArray(contentType)
    ? contentType.join(';')
    : String(contentType ?? '');

  return (
    Boolean(normalizedContentType) &&
    !normalizedContentType.includes('application/json') &&
    !normalizedContentType.includes('+json')
  );
}
