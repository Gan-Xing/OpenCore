import { Injectable } from '@nestjs/common';
import { SystemConfigService } from '@opencore/system';
import {
  SecurityLoginPolicyProvider,
  type SecurityLoginPolicy,
} from '@opencore/security';

@Injectable()
export class SystemSecurityLoginPolicyProvider extends SecurityLoginPolicyProvider {
  constructor(private readonly config: SystemConfigService) {
    super();
  }

  async getLoginPolicy(): Promise<SecurityLoginPolicy> {
    const runtimeConfig = await this.config.getRuntimeConfig();

    return {
      maxFailedAttempts: runtimeConfig.loginMaxFailedAttempts,
      lockoutMinutes: runtimeConfig.loginLockoutMinutes,
    };
  }
}
