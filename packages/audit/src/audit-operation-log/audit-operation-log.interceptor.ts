import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRequestContext } from '@opencore/core';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import {
  AUDIT_OPERATION_KEY,
  type AuditOperationOptions,
} from './audit-operation-log.decorators';
import { redactAuditMetadata } from './audit-operation-log.repository';
import { AuditOperationLogService } from './audit-operation-log.service';

type RequestWithAuditContext = {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  params?: Record<string, string | undefined>;
  path?: string;
  user?: {
    username?: string;
  };
};

type ResponseWithStatus = {
  statusCode?: number;
};

const WRITE_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);

@Injectable()
export class AuditOperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly operationLogs: AuditOperationLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithAuditContext>();
    const response = http.getResponse<ResponseWithStatus>();
    const method = normalizeMethod(request.method);
    const options = this.reflector.getAllAndOverride<AuditOperationOptions>(
      AUDIT_OPERATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (options?.disabled || !WRITE_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.writeOperationLog(
          request,
          response.statusCode ?? 200,
          options,
        );
      }),
      catchError((error: unknown) => {
        void this.writeOperationLog(
          request,
          getErrorStatusCode(error),
          options,
        );
        return throwError(() => error);
      }),
    );
  }

  private async writeOperationLog(
    request: RequestWithAuditContext,
    statusCode: number,
    options: AuditOperationOptions | undefined,
  ): Promise<void> {
    const method = normalizeMethod(request.method);
    const path = normalizePath(request);

    await this.operationLogs.recordOperation({
      actorUsername: request.user?.username ?? 'anonymous',
      action: options?.action ?? method,
      resource: options?.resource ?? path,
      resourceId: readResourceId(request, options?.resourceIdField),
      method,
      path,
      statusCode,
      ip: request.ip ?? 'unknown',
      userAgent: getHeaderValue(request.headers, 'user-agent') ?? 'unknown',
      requestId: getRequestContext()?.requestId ?? 'unknown',
      metadata: redactAuditMetadata({
        body: request.body,
        headers: {
          authorization: getHeaderValue(request.headers, 'authorization'),
          'user-agent': getHeaderValue(request.headers, 'user-agent'),
        },
        traceId: getRequestContext()?.traceId,
      }),
    });
  }
}

export { AuditOperationLogInterceptor as AuditLogInterceptor };
export { redactAuditMetadata };

function normalizeMethod(method: string | undefined): string {
  return (method ?? 'UNKNOWN').toUpperCase();
}

function normalizePath(request: RequestWithAuditContext): string {
  return request.originalUrl ?? request.path ?? 'unknown';
}

function getHeaderValue(
  headers: RequestWithAuditContext['headers'],
  name: string,
): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getErrorStatusCode(error: unknown): number {
  if (
    error &&
    typeof error === 'object' &&
    'getStatus' in error &&
    typeof error.getStatus === 'function'
  ) {
    return Number(error.getStatus());
  }

  return 500;
}

function readResourceId(
  request: RequestWithAuditContext,
  fieldName: string | undefined,
): string | undefined {
  if (!fieldName) {
    return undefined;
  }

  const paramValue = request.params?.[fieldName];

  if (paramValue) {
    return paramValue;
  }

  if (
    request.body &&
    typeof request.body === 'object' &&
    fieldName in request.body
  ) {
    const bodyValue = (request.body as Record<string, unknown>)[fieldName];

    return typeof bodyValue === 'string' ? bodyValue : undefined;
  }

  return undefined;
}
