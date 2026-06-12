import { HttpException } from '@nestjs/common';
import {
  AuditOperationLogService,
  SeedAuditOperationLogRepository,
} from '@opencore/audit';
import { lastValueFrom, of, throwError } from 'rxjs';
import { runWithRequestContext } from '../request-context/request-context';
import {
  AuditLogInterceptor,
  redactAuditMetadata,
} from './audit-log.interceptor';

describe('AuditLogInterceptor compatibility export', () => {
  it('writes a redacted audit log for successful write requests', async () => {
    const repository = new SeedAuditOperationLogRepository();
    const service = new AuditOperationLogService(repository);
    const interceptor = new AuditLogInterceptor(service, createReflector());

    await runInRequestContext(() =>
      lastValueFrom(
        interceptor.intercept(
          createContext({
            body: {
              password: 'secret',
              title: 'Visible',
            },
            headers: {
              authorization: 'Bearer token',
              'user-agent': 'jest',
            },
            ip: '127.0.0.1',
            method: 'POST',
            originalUrl: '/core/users',
            user: {
              username: 'admin',
            },
          }),
          {
            handle: () => of({ ok: true }),
          },
        ),
      ),
    );

    await expect(
      service.listOperationLogs({
        actorUsername: 'admin',
        resource: '/core/users',
      }),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          requestId: 'req-audit',
          metadata: expect.objectContaining({
            body: {
              password: '[REDACTED]',
              title: 'Visible',
            },
            headers: {
              authorization: '[REDACTED]',
              'user-agent': 'jest',
            },
            traceId: 'trace-audit',
          }),
        }),
      ]),
    });
  });

  it('writes a failed audit log for rejected write requests', async () => {
    const repository = new SeedAuditOperationLogRepository();
    const service = new AuditOperationLogService(repository);
    const interceptor = new AuditLogInterceptor(service, createReflector());

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createContext({
            headers: {},
            method: 'DELETE',
            originalUrl: '/core/users/user_1',
          }),
          {
            handle: () => throwError(() => new HttpException('no', 403)),
          },
        ),
      ),
    ).rejects.toThrow(HttpException);

    await expect(
      service.listOperationLogs({ resource: '/core/users/user_1' }),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          actorUsername: 'anonymous',
          method: 'DELETE',
          path: '/core/users/user_1',
          statusCode: 403,
        }),
      ]),
    });
  });

  it('skips read requests', async () => {
    const repository = new SeedAuditOperationLogRepository();
    const service = new AuditOperationLogService(repository);
    const interceptor = new AuditLogInterceptor(service, createReflector());

    await lastValueFrom(
      interceptor.intercept(
        createContext({
          headers: {},
          method: 'GET',
          originalUrl: '/core/users',
        }),
        {
          handle: () => of({ ok: true }),
        },
      ),
    );

    await expect(
      service.listOperationLogs({ resource: '/core/users' }),
    ).resolves.toMatchObject({ total: 0 });
  });

  it('redacts sensitive keys recursively', () => {
    expect(
      redactAuditMetadata({
        nested: {
          accessToken: 'secret',
          value: 'visible',
        },
      }),
    ).toEqual({
      nested: {
        accessToken: '[REDACTED]',
        value: 'visible',
      },
    });
  });
});

async function runInRequestContext<T>(callback: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    runWithRequestContext(
      {
        requestId: 'req-audit',
        traceId: 'trace-audit',
      },
      () => {
        void callback().then(resolve, reject);
      },
    );
  });
}

function createReflector() {
  return {
    getAllAndOverride: () => undefined,
  } as never;
}

function createContext(request: unknown) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        statusCode: 201,
      }),
    }),
  } as never;
}
