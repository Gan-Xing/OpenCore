import type { SystemConfigService } from '@opencore/system';
import { SystemSecurityLoginPolicyProvider } from './system-security-login-policy.provider';

describe('SystemSecurityLoginPolicyProvider', () => {
  it('maps runtime config into the security login policy', async () => {
    const getRuntimeConfig = jest.fn().mockResolvedValue({
      adminTitle: 'OpenCore Admin',
      featureFlags: {
        'notice.inbox': true,
      },
      loginLockoutMinutes: 9,
      loginMaxFailedAttempts: 3,
    });
    const provider = new SystemSecurityLoginPolicyProvider({
      getRuntimeConfig,
    } as unknown as SystemConfigService);

    await expect(provider.getLoginPolicy()).resolves.toEqual({
      maxFailedAttempts: 3,
      lockoutMinutes: 9,
    });
    expect(getRuntimeConfig).toHaveBeenCalledTimes(1);
  });
});
