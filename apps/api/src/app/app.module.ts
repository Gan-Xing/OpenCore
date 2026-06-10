import { Module } from '@nestjs/common';
import { RbacModule } from '../modules/core/rbac/rbac.module';
import { SystemManagementModule } from '../modules/core/system-management/system-management.module';
import { HealthController } from './health.controller';

@Module({
  imports: [RbacModule, SystemManagementModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
