import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiResponseInterceptor } from './response.interceptor';

describe('ApiResponseInterceptor', () => {
  it('wraps successful handler output with trace metadata', async () => {
    const interceptor = new ApiResponseInterceptor();
    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext('/api/example'), {
        handle: () => of({ ok: true }),
      } as CallHandler),
    );

    expect(result).toMatchObject({
      success: true,
      data: { ok: true },
      path: '/api/example',
    });
  });

  it('does not double-wrap existing response envelopes', async () => {
    const interceptor = new ApiResponseInterceptor();
    const envelope = {
      success: true,
      data: { ok: true },
    };
    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext('/api/example'), {
        handle: () => of(envelope),
      } as CallHandler),
    );

    expect(result).toBe(envelope);
  });

  it('passes through binary response bodies', async () => {
    const interceptor = new ApiResponseInterceptor();
    const payload = Buffer.from('file-body');
    const result = await lastValueFrom(
      interceptor.intercept(
        createExecutionContext('/api/core/files/1/download'),
        {
          handle: () => of(payload),
        } as CallHandler,
      ),
    );

    expect(result).toBe(payload);
  });
});

function createExecutionContext(url: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({
        getHeader: () => undefined,
        headersSent: false,
      }),
    }),
  } as ExecutionContext;
}
