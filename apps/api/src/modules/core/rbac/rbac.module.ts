import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../../../platform/database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { PrismaRbacRepository } from './prisma-rbac.repository';
import { RbacController } from './rbac.controller';
import { RbacRepository } from './rbac.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, RbacController],
  providers: [
    {
      provide: RbacRepository,
      useClass: PrismaRbacRepository,
    },
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
