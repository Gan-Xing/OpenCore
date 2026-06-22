import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  AuditOperationLogInterceptor,
  AuditOperationLogModule,
} from '@opencore/audit';
import { DatabaseModule } from '@opencore/database';
import { CollaborationModule } from '../modules/collaboration/collaboration/collaboration.module';
import { IntegrationModule } from '../modules/integration/integration/integration.module';
import { MonitoringModule } from '../modules/monitor/monitoring/monitoring.module';
import { OperationsModule } from '../modules/monitor/operations/operations.module';
import { RbacModule } from '../modules/core/rbac/rbac.module';
import { SystemManagementModule } from '../modules/core/system-management/system-management.module';
import { TenantFoundationModule } from '../modules/core/tenant/tenant.module';
import { ToolingModule } from '../modules/tool/tooling/tooling.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    DatabaseModule,
    AuditOperationLogModule,
    RbacModule,
    TenantFoundationModule,
    SystemManagementModule,
    CollaborationModule,
    IntegrationModule,
    MonitoringModule,
    OperationsModule,
    ToolingModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditOperationLogInterceptor,
    },
  ],
})
export class AppModule {}
