import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RbacRepository } from './rbac.repository';

describe('AuthService', () => {
  const service = new AuthService(new RbacRepository());

  it('logs in with the seeded admin and exposes stable role and permission codes', () => {
    const session = service.login('admin', 'admin123');

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
      service.authenticateBearer(`Bearer ${session.accessToken}`).username,
    ).toBe('admin');
  });

  it('rejects invalid credentials and malformed bearer tokens', () => {
    expect(() => service.login('admin', 'wrong')).toThrow(
      UnauthorizedException,
    );
    expect(() => service.authenticateBearer('Bearer invalid')).toThrow(
      UnauthorizedException,
    );
  });
});
