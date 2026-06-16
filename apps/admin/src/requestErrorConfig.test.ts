import { message, notification } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorConfig } from './requestErrorConfig';
import { ADMIN_TOKEN_STORAGE_KEY } from '@/services/opencore/token';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('antd', () => ({
  message: {
    warning: vi.fn(),
    error: vi.fn(),
  },
  notification: {
    open: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@umijs/max', () => ({
  getIntl: vi.fn(() => ({
    formatMessage: vi.fn(({ id, defaultMessage }) => {
      const messages: Record<string, string> = {
        'app.request.errorFallback': '请求失败，请重试。',
        'app.request.noResponse': '服务器无响应，请重试。',
        'error.AUTH_INVALID_CREDENTIALS': '用户名或密码错误。',
      };

      return messages[id] ?? defaultMessage;
    }),
  })),
  history: {
    location: {
      pathname: '/system/users',
      search: '?page=1',
      hash: '#top',
    },
    push: mocks.push,
    replace: mocks.replace,
  },
}));

describe('requestErrorConfig', () => {
  const errorThrower = errorConfig.errorConfig?.errorThrower;
  const errorHandler = errorConfig.errorConfig?.errorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  describe('errorThrower', () => {
    it('throws BizError for OpenCore error envelopes', () => {
      const response = {
        success: false,
        error: {
          code: 'HTTP_400',
          message: 'Bad Request',
          statusCode: 400,
        },
      };

      expect(() => {
        errorThrower?.(response);
      }).toThrow('Bad Request');
    });

    it('does not throw for successful responses', () => {
      expect(() => {
        errorThrower?.({ success: true, data: { id: 1 } });
      }).not.toThrow();
    });
  });

  describe('errorHandler', () => {
    it('rethrows when skipErrorHandler is true', () => {
      const error = new Error('Test error');

      expect(() => {
        errorHandler?.(error, { skipErrorHandler: true });
      }).toThrow('Test error');
    });

    it('redirects 401 responses to login and clears the token', () => {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, 'token');

      errorHandler?.(
        {
          response: {
            status: 401,
            data: {
              error: {
                code: 'HTTP_401',
                message: 'Unauthorized',
                statusCode: 401,
              },
            },
          },
        } as any,
        {},
      );

      expect(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
      expect(mocks.replace).toHaveBeenCalledWith(
        `/user/login?redirect=${encodeURIComponent('/system/users?page=1#top')}`,
      );
    });

    it('redirects 403 responses to the no-permission page', () => {
      errorHandler?.(
        {
          response: {
            status: 403,
            data: {
              error: {
                code: 'HTTP_403',
                message: 'Forbidden',
                statusCode: 403,
              },
            },
          },
        } as any,
        {},
      );

      expect(mocks.push).toHaveBeenCalledWith('/403');
    });

    it('handles BizError notification showType', () => {
      const error: any = new Error('Notification');
      error.name = 'BizError';
      error.info = {
        errorCode: 'HTTP_409',
        errorMessage: 'Conflict',
        showType: 3,
      };

      errorHandler?.(error, {});

      expect(notification.open).toHaveBeenCalledWith({
        message: 'HTTP_409',
        description: 'Conflict',
      });
    });

    it('localizes BizError messages by stable error code', () => {
      const error: any = new Error('Invalid username or password');
      error.name = 'BizError';
      error.info = {
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid username or password',
          statusCode: 401,
        },
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      };

      errorHandler?.(error, {});

      expect(message.error).toHaveBeenCalledWith('用户名或密码错误。');
    });

    it('handles axios response errors with OpenCore error bodies', () => {
      errorHandler?.(
        {
          response: {
            status: 500,
            data: {
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Server failed',
                statusCode: 500,
              },
            },
          },
        } as any,
        {},
      );

      expect(notification.error).toHaveBeenCalledWith({
        message: 'INTERNAL_SERVER_ERROR',
        description: 'Server failed',
      });
    });

    it('handles offline errors', () => {
      const error: any = new Error('Network error');
      error.request = {};

      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      try {
        errorHandler?.(error, {});

        expect(message.error).toHaveBeenCalledWith(
          'Network unavailable. Please check your connection and try again.',
        );
      } finally {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: originalOnLine,
        });
      }
    });

    it('localizes no-response request errors', () => {
      const error: any = new Error();
      error.request = {};
      const originalOnLine = navigator.onLine;

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      try {
        errorHandler?.(error, {});

        expect(message.error).toHaveBeenCalledWith('服务器无响应，请重试。');
      } finally {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: originalOnLine,
        });
      }
    });

    it('localizes generic fallback request errors', () => {
      const error: any = {};

      errorHandler?.(error, {});

      expect(message.error).toHaveBeenCalledWith('请求失败，请重试。');
    });
  });

  describe('requestInterceptors', () => {
    const interceptor = errorConfig.requestInterceptors?.[0] as (config: {
      headers?: Record<string, string>;
      url?: string;
    }) => { headers: Record<string, string>; url?: string };

    it('adds trace headers and bearer token', () => {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, 'token');

      const result = interceptor({
        url: '/api/auth/me',
        headers: {
          'x-request-id': 'request-1',
        },
      });

      expect(result.headers.Authorization).toBe('Bearer token');
      expect(result.headers['x-request-id']).toBe('request-1');
      expect(result.headers['x-trace-id']).toBe('request-1');
    });
  });
});
