import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import {
  SecurityLoginLockoutRepository,
  SecurityLoginPolicyProvider,
} from '@opencore/security';
import { SystemConfigModule } from '@opencore/system';
import { PrismaSecurityLoginLockoutRepository } from './prisma-security-login-lockout.repository';
import { SystemSecurityLoginPolicyProvider } from './system-security-login-policy.provider';

@Module({
  imports: [DatabaseModule, SystemConfigModule],
  providers: [
    {
      provide: SecurityLoginLockoutRepository,
      useClass: PrismaSecurityLoginLockoutRepository,
    },
    {
      provide: SecurityLoginPolicyProvider,
      useClass: SystemSecurityLoginPolicyProvider,
    },
  ],
  exports: [SecurityLoginLockoutRepository, SecurityLoginPolicyProvider],
})
export class LoginSecurityModule {}
