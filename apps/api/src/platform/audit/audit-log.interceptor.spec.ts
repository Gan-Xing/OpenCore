import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { runWithRequestContext } from '../request-context/request-context';
import {
  AuditLogInterceptor,
  redactAuditMetadata,
} from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  it('writes a redacted audit log for successful write requests', async () => {
    const prisma = createPrismaMock();
    const interceptor = new AuditLogInterceptor(prisma);

    await new Promise<void>((resolve) => {
      runWithRequestContext(
        {
          requestId: 'req-audit',
          traceId: 'trace-audit',
        },
        () => {
          interceptor
            .intercept(
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
            )
            .subscribe({
              complete: resolve,
            });
        },
      );
    });
    await Promise.resolve();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUsername: 'admin',
        action: 'POST',
        method: 'POST',
        path: '/core/users',
        resource: '/core/users',
        statusCode: 201,
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
    });
  });

  it('writes a failed audit log for rejected write requests', async () => {
    const prisma = createPrismaMock();
    const interceptor = new AuditLogInterceptor(prisma);

    await new Promise<void>((resolve) => {
      interceptor
        .intercept(
          createContext({
            headers: {},
            method: 'DELETE',
            originalUrl: '/core/users/user_1',
          }),
          {
            handle: () => throwError(() => new HttpException('no', 403)),
          },
        )
        .subscribe({
          error: () => resolve(),
        });
    });
    await Promise.resolve();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUsername: 'anonymous',
        method: 'DELETE',
        path: '/core/users/user_1',
        statusCode: 403,
      }),
    });
  });

  it('skips read requests', async () => {
    const prisma = createPrismaMock();
    const interceptor = new AuditLogInterceptor(prisma);

    await new Promise<void>((resolve) => {
      interceptor
        .intercept(
          createContext({
            headers: {},
            method: 'GET',
            originalUrl: '/core/users',
          }),
          {
            handle: () => of({ ok: true }),
          },
        )
        .subscribe({
          complete: resolve,
        });
    });

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
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

function createPrismaMock() {
  return {
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as never;
}

function createContext(request: unknown) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        statusCode: 201,
      }),
    }),
  } as never;
}
