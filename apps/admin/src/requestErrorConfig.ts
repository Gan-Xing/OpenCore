import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { getIntl, history } from '@umijs/max';
import { message, notification } from 'antd';
import { getAdminToken, removeAdminToken } from '@/services/opencore/token';

enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}

type ApiErrorInfo = {
  code?: string;
  details?: unknown;
  issues?: readonly unknown[];
  message?: string;
  statusCode?: number;
  requestId?: string;
  traceId?: string;
};

interface ResponseStructure {
  success?: boolean;
  data?: unknown;
  error?: ApiErrorInfo;
  errorCode?: number | string;
  errorMessage?: string;
  showType?: ErrorShowType;
}

function createBrowserRequestId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function redirectToLogin(): void {
  removeAdminToken();

  const { pathname, search, hash } = history.location;

  if (pathname === '/user/login' || pathname === '/user/social-login') {
    return;
  }

  history.replace(
    `/user/login?redirect=${encodeURIComponent(pathname + search + hash)}`,
  );
}

function getApiErrorInfo(error: any): ApiErrorInfo | undefined {
  return error?.response?.data?.error ?? error?.info?.error;
}

function getErrorStatus(error: any): number | undefined {
  return error?.response?.status ?? getApiErrorInfo(error)?.statusCode;
}

export function formatRequestErrorMessage(error: unknown): string {
  const fallbackMessage = getFallbackErrorMessage(error);
  const errorCode = getErrorCode(error);

  if (!errorCode) {
    return fallbackMessage;
  }

  return getIntl().formatMessage({
    id: `error.${errorCode}`,
    defaultMessage: fallbackMessage,
  });
}

function getFallbackErrorMessage(error: any): string {
  return (
    getApiErrorInfo(error)?.message ??
    error?.info?.errorMessage ??
    error?.message ??
    getIntl().formatMessage({
      id: 'app.request.errorFallback',
      defaultMessage: 'The request failed. Please try again.',
    })
  );
}

function getErrorCode(error: any): string | undefined {
  return getApiErrorInfo(error)?.code ?? error?.info?.errorCode;
}

export const errorConfig: RequestConfig = {
  errorConfig: {
    errorThrower: (res) => {
      const response = res as unknown as ResponseStructure;

      if (response.success === false) {
        const error: any = new Error(
          response.error?.message ?? response.errorMessage,
        );
        error.name = 'BizError';
        error.info = {
          error: response.error,
          errorCode: response.error?.code ?? response.errorCode,
          errorMessage: response.error?.message ?? response.errorMessage,
          showType: response.showType,
          data: response.data,
        };
        throw error;
      }
    },
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;

        if (!errorInfo) {
          message.error(formatRequestErrorMessage(error));
          return;
        }

        const errorMessage = formatRequestErrorMessage(error);
        const errorCode = getErrorCode(error);

        switch (errorInfo.showType) {
          case ErrorShowType.SILENT:
            break;
          case ErrorShowType.WARN_MESSAGE:
            message.warning(errorMessage);
            break;
          case ErrorShowType.ERROR_MESSAGE:
            message.error(errorMessage);
            break;
          case ErrorShowType.NOTIFICATION:
            notification.open({
              message: String(
                errorCode ??
                  getIntl().formatMessage({
                    id: 'app.request.failedTitle',
                    defaultMessage: 'Request failed',
                  }),
              ),
              description: errorMessage,
            });
            break;
          case ErrorShowType.REDIRECT:
            redirectToLogin();
            break;
          default:
            message.error(errorMessage);
        }
      } else if (error.response) {
        const status = getErrorStatus(error);

        if (status === 401) {
          redirectToLogin();
          return;
        }

        if (status === 403) {
          history.push('/403');
          return;
        }

        const apiError = getApiErrorInfo(error);
        notification.error({
          message: apiError?.code ?? `HTTP ${error.response.status}`,
          description: formatRequestErrorMessage(error),
        });
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        message.error(
          getIntl().formatMessage({
            id: 'app.request.offline',
            defaultMessage:
              'Network unavailable. Please check your connection and try again.',
          }),
        );
      } else if (error.request) {
        message.error(
          getIntl().formatMessage({
            id: 'app.request.noResponse',
            defaultMessage: 'No response from server. Please retry.',
          }),
        );
      } else {
        message.error(formatRequestErrorMessage(error));
      }
    },
  },

  requestInterceptors: [
    (config: RequestOptions) => {
      const headers = {
        ...((config.headers ?? {}) as Record<string, string>),
      };
      const token = getAdminToken();
      const requestId = headers['x-request-id'] ?? createBrowserRequestId();

      headers['x-request-id'] = requestId;
      headers['x-trace-id'] = headers['x-trace-id'] ?? requestId;

      if (token && !headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${token}`;
      }

      return {
        ...config,
        headers,
      };
    },
  ],

  responseInterceptors: [],
};
