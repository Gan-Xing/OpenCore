export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function sanitizeErrorCode(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value
    .trim()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^A-Z_a-z0-9]/g, '')
    .toUpperCase();

  return normalized.length > 0 ? normalized : undefined;
}

export function createHttpErrorCode(statusCode: number): `HTTP_${number}` {
  const normalizedStatusCode =
    Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
      ? statusCode
      : 500;

  return `HTTP_${normalizedStatusCode}`;
}

export function errorCodeFromHttpStatus(
  statusCode: number,
  responseError?: string,
): string {
  const sanitizedResponseError = sanitizeErrorCode(responseError);

  if (sanitizedResponseError !== undefined) {
    return sanitizedResponseError;
  }

  if (statusCode >= 500) {
    return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }

  return createHttpErrorCode(statusCode);
}
