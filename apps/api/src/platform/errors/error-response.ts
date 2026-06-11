import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponseContract } from '@opencore/contracts';
import type { RequestContext } from '../request-context/request-context';

export type ApiErrorResponse = ApiErrorResponseContract;

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
    typeof exceptionResponse.error === 'string'
  ) {
    return exceptionResponse.error
      .replaceAll(/\s+/g, '_')
      .replaceAll(/[^A-Z_a-z0-9]/g, '')
      .toUpperCase();
  }

  if (statusCode >= 500) {
    return 'INTERNAL_SERVER_ERROR';
  }

  return `HTTP_${statusCode}`;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
