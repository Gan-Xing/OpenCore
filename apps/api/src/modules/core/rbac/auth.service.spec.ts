import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SeedRbacRepository } from './seed-rbac.repository';

describe('AuthService', () => {
  let repository: SeedRbacRepository;
  let service: AuthService;

  beforeEach(() => {
    repository = new SeedRbacRepository();
    service = new AuthService(repository);
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
    expect(repository.listRecordedLoginAttempts()).toEqual([
      {
        username: 'admin',
        success: true,
        failureReason: undefined,
        ip: '127.0.0.1',
        requestId: 'req_login_success',
        userAgent: 'jest',
      },
    ]);
  });

  it('rejects invalid credentials and malformed bearer tokens', async () => {
    await expect(
      service.login('admin', 'wrong', {
        ip: '127.0.0.1',
        requestId: 'req_login_failure',
        userAgent: 'jest',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(repository.listRecordedLoginAttempts()).toEqual([
      {
        username: 'admin',
        success: false,
        failureReason: 'invalid-credentials-or-disabled',
        ip: '127.0.0.1',
        requestId: 'req_login_failure',
        userAgent: 'jest',
      },
    ]);
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
