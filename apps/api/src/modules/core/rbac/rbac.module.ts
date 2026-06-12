import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditLoginLogModule } from '@opencore/audit';
import { DatabaseModule } from '@opencore/database';
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
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { PrismaRbacRepository } from './prisma-rbac.repository';
import { RbacController } from './rbac.controller';
import { RbacRepository } from './rbac.repository';

@Module({
  imports: [
    DatabaseModule,
    AuditLoginLogModule,
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
