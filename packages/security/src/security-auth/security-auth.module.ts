import { DynamicModule, Module, type Provider } from '@nestjs/common';
import {
  NoopSecurityLoginAttemptRecorder,
  AllowAllSecurityAuthSessionRepository,
  SecurityAuthSessionRepository,
  SecurityAuthUserRepository,
  SecurityLoginAttemptRecorder,
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
        SecurityBearerTokenService,
        SecurityAuthService,
      ],
      exports: [
        SecurityAuthUserRepository,
        SecurityLoginAttemptRecorder,
        SecurityAuthSessionRepository,
        SecurityBearerTokenService,
        SecurityAuthService,
      ],
    };
  }
}
