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

  if (pathname === '/user/login') {
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

function getErrorMessage(error: any): string {
  return (
    getApiErrorInfo(error)?.message ??
    error?.info?.errorMessage ??
    error?.message ??
    'Request error, please retry.'
  );
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

      const status = getErrorStatus(error);

      if (status === 401) {
        redirectToLogin();
        return;
      }

      if (status === 403) {
        history.push('/403');
        return;
      }

      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;

        if (!errorInfo) {
          message.error(getErrorMessage(error));
          return;
        }

        const errorMessage = getErrorMessage(error);
        const errorCode = errorInfo.errorCode;

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
              message: String(errorCode ?? 'Request failed'),
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
        const apiError = getApiErrorInfo(error);
        notification.error({
          message: apiError?.code ?? `HTTP ${error.response.status}`,
          description: apiError?.message ?? `Response status: ${status}`,
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
        message.error('None response! Please retry.');
      } else {
        message.error(getErrorMessage(error));
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
