import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { getRequestContext } from '../request-context/request-context';

type RequestWithAuditContext = {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  path?: string;
  user?: {
    username?: string;
  };
};

type ResponseWithStatus = {
  statusCode?: number;
};

const WRITE_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);
const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token)/i;

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithAuditContext>();
    const response = http.getResponse<ResponseWithStatus>();
    const method = normalizeMethod(request.method);

    if (!WRITE_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.writeAuditLog(request, response.statusCode ?? 200);
      }),
      catchError((error: unknown) => {
        void this.writeAuditLog(request, getErrorStatusCode(error));
        return throwError(() => error);
      }),
    );
  }

  private async writeAuditLog(
    request: RequestWithAuditContext,
    statusCode: number,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUsername: request.user?.username ?? 'anonymous',
        action: normalizeMethod(request.method),
        resource: normalizePath(request),
        resourceId: undefined,
        method: normalizeMethod(request.method),
        path: normalizePath(request),
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
        }) as Prisma.InputJsonValue,
      },
    });
  }
}

export function redactAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditMetadata(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? '[REDACTED]'
          : redactAuditMetadata(entryValue),
      ]),
    );
  }

  return value;
}

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
