import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SeedRbacRepository } from './seed-rbac.repository';

describe('AuthService', () => {
  const service = new AuthService(new SeedRbacRepository());

  it('logs in with the seeded admin and exposes stable role and permission codes', async () => {
    const session = await service.login('admin', 'admin123');

    expect(session.tokenType).toBe('Bearer');
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
  });

  it('rejects invalid credentials and malformed bearer tokens', async () => {
    await expect(service.login('admin', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.authenticateBearer('Bearer invalid')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
