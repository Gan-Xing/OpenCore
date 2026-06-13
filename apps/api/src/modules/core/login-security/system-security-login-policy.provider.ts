import { Injectable } from '@nestjs/common';
import { SystemConfigService } from '@opencore/system';
import {
  SecurityLoginPolicyProvider,
  type SecurityLoginPolicy,
} from '@opencore/security';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;

@Injectable()
export class SystemSecurityLoginPolicyProvider extends SecurityLoginPolicyProvider {
  constructor(private readonly config: SystemConfigService) {
    super();
  }

  async getLoginPolicy(): Promise<SecurityLoginPolicy> {
    const runtimeConfig = await this.config.getRuntimeConfig();

    return {
      maxFailedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
      lockoutMinutes: runtimeConfig.loginLockoutMinutes,
    };
  }
}
