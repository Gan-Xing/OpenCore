export type ApiErrorIssue = {
  code?: string;
  message: string;
  path?: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  issues?: readonly ApiErrorIssue[];
};

export function createApiErrorBody(input: ApiErrorBody): ApiErrorBody {
  if (!isStableApiErrorCode(input.code)) {
    throw new Error(`Invalid API error code: ${input.code}`);
  }

  return {
    code: input.code,
    message: input.message,
    ...(input.details === undefined ? {} : { details: input.details }),
    ...(input.issues === undefined ? {} : { issues: input.issues }),
  };
}

export function isStableApiErrorCode(value: string): boolean {
  return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/u.test(value);
}
