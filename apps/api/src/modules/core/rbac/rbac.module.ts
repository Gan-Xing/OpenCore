import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditLoginLogModule, AuditOperationLogModule } from '@opencore/audit';
import { DatabaseModule } from '@opencore/database';
import { FileModule } from '@opencore/file';
import { OnlineUserModule } from '@opencore/online-user';
import {
  SecurityAuthUserRepository,
  SecurityBearerTokenService,
  SecurityDataScopeGuard,
  SecurityDataScopeRepository,
  SecurityDataScopeService,
  SecurityRoleGuard,
} from '@opencore/security';
import {
  SystemMenuModule,
  SystemRoleModule,
  SystemUserModule,
} from '@opencore/system';
import { IntegrationModule } from '../../integration/integration/integration.module';
import { LoginSecurityModule } from '../login-security/login-security.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { PrismaRbacRepository } from './prisma-rbac.repository';
import { RbacController } from './rbac.controller';
import { RbacRepository } from './rbac.repository';
import { SocialAuthService } from './social-auth.service';

@Module({
  imports: [
    DatabaseModule,
    AuditLoginLogModule,
    AuditOperationLogModule,
    FileModule,
    IntegrationModule,
    LoginSecurityModule,
    OnlineUserModule,
    SystemUserModule,
    SystemRoleModule,
    SystemMenuModule,
  ],
  controllers: [AuthController, RbacController],
  providers: [
    {
      provide: RbacRepository,
      useClass: PrismaRbacRepository,
    },
    {
      provide: SecurityAuthUserRepository,
      useExisting: RbacRepository,
    },
    {
      provide: SecurityDataScopeRepository,
      useExisting: RbacRepository,
    },
    SecurityBearerTokenService,
    SecurityDataScopeService,
    AuthService,
    SocialAuthService,
    PermissionGuard,
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SecurityRoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SecurityDataScopeGuard,
    },
  ],
  exports: [AuthService, RbacRepository],
})
export class RbacModule {}
