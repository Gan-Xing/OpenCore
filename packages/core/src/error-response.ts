import { HttpException, HttpStatus } from '@nestjs/common';
import {
  errorCodeFromHttpStatus,
  isRecord,
  sanitizeErrorCode,
  type ApiErrorIssue,
} from '@opencore/common';
import type { RequestContext } from './request-context';

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
    issues?: readonly ApiErrorIssue[];
    path?: string;
    requestId?: string;
    traceId?: string;
    timestamp: string;
  };
};

export function toApiErrorResponse(
  exception: unknown,
  options: {
    path?: string;
    context?: RequestContext;
    timestamp?: string;
  } = {},
): ApiErrorResponse {
  const statusCode =
    exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  const exceptionResponse =
    exception instanceof HttpException ? exception.getResponse() : undefined;

  return {
    success: false,
    error: {
      code: getErrorCode(statusCode, exceptionResponse),
      message: getErrorMessage(exception, exceptionResponse),
      statusCode,
      ...getStructuredErrorFields(exceptionResponse),
      path: options.path,
      requestId: options.context?.requestId,
      traceId: options.context?.traceId,
      timestamp: options.timestamp ?? new Date().toISOString(),
    },
  };
}

function getErrorCode(
  statusCode: number,
  exceptionResponse: string | object | undefined,
): string {
  if (
    isRecord(exceptionResponse) &&
    typeof exceptionResponse.code === 'string'
  ) {
    return (
      sanitizeErrorCode(exceptionResponse.code) ??
      errorCodeFromHttpStatus(statusCode)
    );
  }

  if (
    isRecord(exceptionResponse) &&
    typeof exceptionResponse.error === 'string'
  ) {
    return errorCodeFromHttpStatus(statusCode, exceptionResponse.error);
  }

  return errorCodeFromHttpStatus(statusCode);
}

function getErrorMessage(
  exception: unknown,
  exceptionResponse: string | object | undefined,
): string {
  if (isRecord(exceptionResponse)) {
    const message = exceptionResponse.message;

    if (Array.isArray(message)) {
      return message.join('; ');
    }

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  if (typeof exceptionResponse === 'string' && exceptionResponse.length > 0) {
    return exceptionResponse;
  }

  if (exception instanceof Error && exception.message.length > 0) {
    return exception.message;
  }

  return 'Unexpected server error';
}

function getStructuredErrorFields(
  exceptionResponse: string | object | undefined,
): Pick<ApiErrorResponse['error'], 'details' | 'issues'> {
  if (!isRecord(exceptionResponse)) {
    return {};
  }

  return {
    ...(exceptionResponse.details === undefined
      ? {}
      : { details: exceptionResponse.details }),
    ...(isApiErrorIssues(exceptionResponse.issues)
      ? { issues: exceptionResponse.issues }
      : {}),
  };
}

function isApiErrorIssues(value: unknown): value is readonly ApiErrorIssue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (issue) =>
        isRecord(issue) &&
        typeof issue.message === 'string' &&
        (issue.code === undefined || typeof issue.code === 'string') &&
        (issue.path === undefined || typeof issue.path === 'string'),
    )
  );
}
