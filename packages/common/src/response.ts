export type RequestTrace = {
  path?: string;
  requestId?: string;
  traceId?: string;
  timestamp?: string;
};

export type ApiSuccessResponse<T> = RequestTrace & {
  success: true;
  data: T;
};

export type ApiErrorDetail = RequestTrace & {
  code: string;
  message: string;
  statusCode: number;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorDetail;
};

export function createSuccessResponse<T>(
  data: T,
  trace: RequestTrace = {},
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...trace,
  };
}

export function createErrorResponse(
  error: Omit<ApiErrorDetail, 'timestamp'> & { timestamp?: string },
): ApiErrorResponse {
  return {
    success: false,
    error: {
      ...error,
      timestamp: error.timestamp ?? new Date().toISOString(),
    },
  };
}
