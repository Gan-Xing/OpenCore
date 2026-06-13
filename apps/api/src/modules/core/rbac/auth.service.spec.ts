import { UnauthorizedException } from '@nestjs/common';
import { SeedAuditLoginLogRepository } from '@opencore/audit';
import { AuthService } from './auth.service';
import { SeedRbacRepository } from './seed-rbac.repository';

describe('AuthService', () => {
  let repository: SeedRbacRepository;
  let loginLogs: SeedAuditLoginLogRepository;
  let service: AuthService;

  beforeEach(() => {
    repository = new SeedRbacRepository();
    loginLogs = new SeedAuditLoginLogRepository();
    service = new AuthService(repository, loginLogs);
  });

  it('logs in with the seeded admin and exposes stable role and permission codes', async () => {
    const session = await service.login('admin', 'admin123', {
      ip: '127.0.0.1',
      requestId: 'req_login_success',
      userAgent: 'jest',
    });

    expect(session.tokenType).toBe('Bearer');
    expect(session.expiresInSeconds).toBe(3600);
    expect(session.user.roleCodes).toContain('admin');
    expect(session.user.permissionCodes).toEqual(
      expect.arrayContaining([
        'core:user:read',
        'core:role:read',
        'core:permission:read',
        'core:menu:read',
      ]),
    );

    expect(
      (await service.authenticateBearer(`Bearer ${session.accessToken}`))
        .username,
    ).toBe('admin');
    await expect(
      loginLogs.listLoginLogs({ username: 'admin' }),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          username: 'admin',
          logType: 'login.username',
          result: 'success',
          success: true,
          failureReason: undefined,
          ip: '127.0.0.1',
          requestId: 'req_login_success',
          userAgent: 'jest',
        }),
      ]),
    });
  });

  it('rejects invalid credentials and malformed bearer tokens', async () => {
    await expect(
      service.login('admin', 'wrong', {
        ip: '127.0.0.1',
        requestId: 'req_login_failure',
        userAgent: 'jest',
      }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      loginLogs.listLoginLogs({ username: 'admin', success: false }),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          username: 'admin',
          logType: 'login.username',
          result: 'bad_credentials',
          success: false,
          failureReason: 'invalid-credentials',
          ip: '127.0.0.1',
          requestId: 'req_login_failure',
          userAgent: 'jest',
        }),
      ]),
    });
    await expect(service.authenticateBearer('Bearer invalid')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired bearer tokens', async () => {
    const session = await service.login('admin', 'admin123');
    const now = Date.now();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now + 3601 * 1000);

    await expect(service.authenticateBearer('Bearer invalid')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      service.authenticateBearer(`Bearer ${session.accessToken}`),
    ).rejects.toThrow(UnauthorizedException);
    dateSpy.mockRestore();
  });
});
