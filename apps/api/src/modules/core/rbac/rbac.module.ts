import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { RbacController } from './rbac.controller';
import { RbacRepository } from './rbac.repository';

@Module({
  controllers: [AuthController, RbacController],
  providers: [
    RbacRepository,
    AuthService,
    PermissionGuard,
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [AuthService, RbacRepository],
})
export class RbacModule {}
