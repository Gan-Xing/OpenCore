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

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  T | ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<HttpRequest>();

    return next.handle().pipe(
      map((data) => {
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
