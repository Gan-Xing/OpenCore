import { DynamicModule, Module, type Provider } from '@nestjs/common';
import {
  DefaultSecurityLoginPolicyProvider,
  NoopSecurityLoginAttemptRecorder,
  NoopSecurityLoginLockoutRepository,
  AllowAllSecurityAuthSessionRepository,
  SecurityAuthSessionRepository,
  SecurityAuthUserRepository,
  SecurityLoginLockoutRepository,
  SecurityLoginAttemptRecorder,
  SecurityLoginPolicyProvider,
} from './security-auth.repository';
import { SecurityAuthService } from './security-auth.service';
import { SecurityBearerTokenService } from './security-bearer-token.service';

@Module({})
export class SecurityAuthModule {
  static forRepository(repositoryProvider: Provider): DynamicModule {
    return {
      module: SecurityAuthModule,
      providers: [
        repositoryProvider,
        {
          provide: SecurityLoginAttemptRecorder,
          useClass: NoopSecurityLoginAttemptRecorder,
        },
        {
          provide: SecurityAuthSessionRepository,
          useClass: AllowAllSecurityAuthSessionRepository,
        },
        {
          provide: SecurityLoginPolicyProvider,
          useClass: DefaultSecurityLoginPolicyProvider,
        },
        {
          provide: SecurityLoginLockoutRepository,
          useClass: NoopSecurityLoginLockoutRepository,
        },
        SecurityBearerTokenService,
        SecurityAuthService,
      ],
      exports: [
        SecurityAuthUserRepository,
        SecurityLoginAttemptRecorder,
        SecurityAuthSessionRepository,
        SecurityLoginPolicyProvider,
        SecurityLoginLockoutRepository,
        SecurityBearerTokenService,
        SecurityAuthService,
      ],
    };
  }
}
