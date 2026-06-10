import { Module } from '@nestjs/common';
import { MonitoringModule } from '../modules/monitor/monitoring/monitoring.module';
import { RbacModule } from '../modules/core/rbac/rbac.module';
import { SystemManagementModule } from '../modules/core/system-management/system-management.module';
import { ToolingModule } from '../modules/tool/tooling/tooling.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    RbacModule,
    SystemManagementModule,
    MonitoringModule,
    ToolingModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
